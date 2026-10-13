package teaching

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestG011RetryGET(t *testing.T) {
	if _, err := RetryGET(context.Background(), nil, "http://unused", 1, -time.Second); err == nil {
		t.Fatal("negative delay accepted")
	}
	var n atomic.Int32
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if n.Add(1) == 1 {
			http.Error(w, "retry", 503)
			return
		}
		w.WriteHeader(200)
	}))
	defer s.Close()
	resp, err := RetryGET(context.Background(), s.Client(), s.URL, 3, 0)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 || n.Load() != 2 {
		t.Fatalf("status=%d calls=%d", resp.StatusCode, n.Load())
	}
}
func TestG012RequestID(t *testing.T) {
	var seen string
	h := RequestID(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) { seen = RequestIDFrom(r.Context()) }))
	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("X-Request-ID", "trace-9")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if seen != "trace-9" || w.Header().Get("X-Request-ID") != seen {
		t.Fatalf("id=%q", seen)
	}
	first := httptest.NewRecorder()
	bad := httptest.NewRequest("GET", "/", nil)
	bad.Header.Set("X-Request-ID", "bad id")
	h.ServeHTTP(first, bad)
	second := httptest.NewRecorder()
	h.ServeHTTP(second, httptest.NewRequest("GET", "/", nil))
	if first.Header().Get("X-Request-ID") == "" || first.Header().Get("X-Request-ID") == second.Header().Get("X-Request-ID") {
		t.Fatal("missing or invalid IDs must receive distinct generated IDs")
	}
}
func TestG013DecodeJSONLimit(t *testing.T) {
	var dst map[string]int
	r := httptest.NewRequest("POST", "/", strings.NewReader(`{"n":7}`))
	if err := DecodeJSONLimit(httptest.NewRecorder(), r, 32, &dst); err != nil || dst["n"] != 7 {
		t.Fatalf("%v %v", dst, err)
	}
	r = httptest.NewRequest("POST", "/", strings.NewReader(strings.Repeat("x", 40)))
	if err := DecodeJSONLimit(httptest.NewRecorder(), r, 8, &dst); err == nil {
		t.Fatal("oversized body accepted")
	}
}
func TestG014StrictJSON(t *testing.T) {
	type payload struct {
		Name string `json:"name"`
	}
	var p payload
	if err := DecodeStrictJSON([]byte(`{"name":"Ada"}`), &p); err != nil || p.Name != "Ada" {
		t.Fatalf("%+v %v", p, err)
	}
	for _, raw := range []string{`{"name":"Ada","extra":1}`, `{"name":"Ada"} {}`} {
		if err := DecodeStrictJSON([]byte(raw), &p); err == nil {
			t.Fatalf("accepted %s", raw)
		}
	}
}
func TestG015Page(t *testing.T) {
	got, err := Page([]string{"a", "b", "c"}, 2, 2)
	if err != nil || len(got) != 1 || got[0] != "c" {
		t.Fatalf("%v %v", got, err)
	}
	empty, err := Page([]int{1}, 3, 2)
	if err != nil || len(empty) != 0 {
		t.Fatalf("%v %v", empty, err)
	}
	if _, err = Page([]int{1}, 0, 1); err == nil {
		t.Fatal("invalid page accepted")
	}
	if _, err = Page([]int{1}, int(^uint(0)>>1), 2); err == nil {
		t.Fatal("overflowing page offset accepted")
	}
	largePageSize, err := Page([]int{1, 2, 3}, 1, int(^uint(0)>>1))
	if err != nil || len(largePageSize) != 3 {
		t.Fatalf("large page size: %v %v", largePageSize, err)
	}
}
func TestG016ContentLength(t *testing.T) {
	if n, err := ParseContentLength("123"); err != nil || n != 123 {
		t.Fatalf("%d %v", n, err)
	}
	for _, v := range []string{"-1", " 2", "9223372036854775808"} {
		if _, err := ParseContentLength(v); err == nil {
			t.Fatalf("accepted %q", v)
		}
	}
}
func TestG017ReadHTTPBody(t *testing.T) {
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("hello")) }))
	defer s.Close()
	b, err := ReadHTTPBody(context.Background(), s.Client(), s.URL, 5)
	if err != nil || string(b) != "hello" {
		t.Fatalf("%q %v", b, err)
	}
	if _, err = ReadHTTPBody(context.Background(), s.Client(), s.URL, 4); err == nil {
		t.Fatal("limit not enforced")
	}
	if _, err = ReadHTTPBody(context.Background(), nil, s.URL, 5); err != nil {
		t.Fatalf("nil client should use default client: %v", err)
	}
}
func TestG018HealthHandler(t *testing.T) {
	h := HealthHandler(func(context.Context) error { return errors.New("db offline") })
	live := httptest.NewRecorder()
	h.ServeHTTP(live, httptest.NewRequest("GET", "/live", nil))
	if live.Code != 204 {
		t.Fatalf("live=%d", live.Code)
	}
	ready := httptest.NewRecorder()
	h.ServeHTTP(ready, httptest.NewRequest("GET", "/ready", nil))
	if ready.Code != 503 {
		t.Fatalf("ready=%d", ready.Code)
	}
}
