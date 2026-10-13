package teaching

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

// G011 retries only transient GET failures and closes every response before retrying.
func RetryGET(ctx context.Context, client *http.Client, url string, attempts int, delay time.Duration) (*http.Response, error) {
	if attempts < 1 {
		return nil, errors.New("attempts must be positive")
	}
	if delay < 0 {
		return nil, errors.New("retry delay cannot be negative")
	}
	if client == nil {
		client = http.DefaultClient
	}
	var last error
	for i := 0; i < attempts; i++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return nil, err
		}
		resp, err := client.Do(req)
		if err == nil && resp.StatusCode < 500 {
			return resp, nil
		}
		if err != nil {
			last = err
		} else {
			last = fmt.Errorf("transient status %d", resp.StatusCode)
			_ = resp.Body.Close()
		}
		if i+1 < attempts {
			timer := time.NewTimer(delay)
			select {
			case <-ctx.Done():
				timer.Stop()
				return nil, ctx.Err()
			case <-timer.C:
			}
		}
	}
	return nil, last
}

type requestIDKey struct{}

var fallbackRequestID atomic.Uint64

func newRequestID() string {
	var raw [16]byte
	if _, err := rand.Read(raw[:]); err == nil {
		return hex.EncodeToString(raw[:])
	}
	return fmt.Sprintf("generated-%d", fallbackRequestID.Add(1))
}

// G012 binds an incoming request identifier to its request context for downstream handlers.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimSpace(r.Header.Get("X-Request-ID"))
		valid := id != "" && len(id) <= 128
		for _, ch := range id {
			if !(ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch >= '0' && ch <= '9' || strings.ContainsRune("._-", ch)) {
				valid = false
				break
			}
		}
		if !valid {
			id = newRequestID()
		}
		ctx := context.WithValue(r.Context(), requestIDKey{}, id)
		w.Header().Set("X-Request-ID", id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
func RequestIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}

// G013 limits bytes before decoding; MaxBytesReader makes an over-limit body observable.
func DecodeJSONLimit(w http.ResponseWriter, r *http.Request, limit int64, dst any) error {
	if limit < 1 {
		return errors.New("body limit must be positive")
	}
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(dst); err != nil {
		return err
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		if err == nil {
			return errors.New("multiple JSON values")
		}
		return err
	}
	return nil
}

// G014 requires one JSON object and rejects unknown fields and trailing values.
func DecodeStrictJSON(body []byte, dst any) error {
	dec := json.NewDecoder(bytes.NewReader(body))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		if err == nil {
			return errors.New("trailing JSON value")
		}
		return err
	}
	return nil
}

// G015 validates a page window before slicing; page numbers are one-based.
func Page[T any](items []T, page, size int) ([]T, error) {
	if page < 1 || size < 1 {
		return nil, errors.New("page and size must be positive")
	}
	maxInt := int(^uint(0) >> 1)
	if page-1 > maxInt/size {
		return nil, errors.New("page offset overflows int")
	}
	start := (page - 1) * size
	if start < 0 || start >= len(items) {
		if start == len(items) {
			return []T{}, nil
		}
		return []T{}, nil
	}
	end := len(items)
	if size < len(items)-start {
		end = start + size
	}
	return append([]T(nil), items[start:end]...), nil
}

// G016 parses a decimal byte range without accepting signs, whitespace, or overflow.
func ParseContentLength(raw string) (int64, error) {
	if raw == "" || strings.TrimSpace(raw) != raw {
		return 0, errors.New("invalid content length")
	}
	n, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || n < 0 {
		return 0, errors.New("invalid content length")
	}
	return n, nil
}

// G017 binds requests to the caller context and bounds response bodies.
func ReadHTTPBody(ctx context.Context, client *http.Client, url string, max int64) ([]byte, error) {
	if max < 1 {
		return nil, errors.New("max body must be positive")
	}
	if client == nil {
		client = http.DefaultClient
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, max+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > max {
		return nil, errors.New("response body too large")
	}
	return data, nil
}

// G018 serves liveness independently of a slow dependency, preserving readiness semantics.
func HealthHandler(check func(context.Context) error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/live" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.URL.Path != "/ready" {
			http.NotFound(w, r)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := check(ctx); err != nil {
			http.Error(w, "not ready", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
