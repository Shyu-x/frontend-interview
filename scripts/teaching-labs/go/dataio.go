package teaching

import (
	"bufio"
	"bytes"
	"crypto/sha256"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// G019 scans line-delimited records without loading the whole file into memory.
func CountNonEmptyLines(r io.Reader) (int, error) {
	s := bufio.NewScanner(r)
	s.Buffer(make([]byte, 4096), 1024*1024)
	n := 0
	for s.Scan() {
		if strings.TrimSpace(s.Text()) != "" {
			n++
		}
	}
	return n, s.Err()
}

// G020 parses variable-width CSV records and reports the record number on errors.
func ParseCSV(r io.Reader) ([][]string, error) {
	cr := csv.NewReader(r)
	cr.FieldsPerRecord = -1
	var rows [][]string
	for line := 1; ; line++ {
		row, err := cr.Read()
		if err == io.EOF {
			return rows, nil
		}
		if err != nil {
			return nil, fmt.Errorf("csv record %d: %w", line, err)
		}
		rows = append(rows, row)
	}
}

// G021 atomically replaces one file by syncing and renaming a temp file in the same directory.
func AtomicWriteFile(path string, data []byte, perm os.FileMode) error {
	dir := filepath.Dir(path)
	f, err := os.CreateTemp(dir, ".write-*")
	if err != nil {
		return err
	}
	tmp := f.Name()
	defer os.Remove(tmp)
	if err = f.Chmod(perm); err == nil {
		_, err = f.Write(data)
	}
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// G022 copies a stream with a hard byte cap and returns a checksum of exactly written bytes.
func CopyHash(dst io.Writer, src io.Reader, max int64) (int64, string, error) {
	if max < 0 {
		return 0, "", errors.New("max bytes cannot be negative")
	}
	h := sha256.New()
	n, err := io.Copy(io.MultiWriter(dst, h), io.LimitReader(src, max))
	if err != nil {
		return n, "", err
	}
	if n == max {
		var probe [1]byte
		extra, e := io.ReadFull(src, probe[:])
		if extra > 0 {
			return n, "", errors.New("input exceeds limit")
		}
		if e != nil && e != io.EOF && e != io.ErrUnexpectedEOF {
			return n, "", e
		}
	}
	return n, hex.EncodeToString(h.Sum(nil)), nil
}

// G023 parses JSON Lines one record at a time and annotates malformed record positions.
func ParseJSONLines[T any](r io.Reader) ([]T, error) {
	s := bufio.NewScanner(r)
	s.Buffer(make([]byte, 4096), 1024*1024)
	var out []T
	for line := 1; s.Scan(); line++ {
		raw := bytes.TrimSpace(s.Bytes())
		if len(raw) == 0 {
			continue
		}
		var v T
		if err := json.Unmarshal(raw, &v); err != nil {
			return nil, fmt.Errorf("line %d: %w", line, err)
		}
		out = append(out, v)
	}
	if err := s.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

// G024 safely extracts a basename from an upload name and rejects empty or dot names.
func SafeUploadName(name string) (string, error) {
	name = strings.ReplaceAll(name, "\\", "/")
	base := filepath.Base(name)
	if base == "." || base == "/" || base == "" {
		return "", errors.New("empty filename")
	}
	return base, nil
}
