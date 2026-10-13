package teaching

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestG019CountLines(t *testing.T) {
	n, err := CountNonEmptyLines(strings.NewReader("a\n \n b\n"))
	if err != nil || n != 2 {
		t.Fatalf("%d %v", n, err)
	}
	if _, err = CountNonEmptyLines(strings.NewReader(strings.Repeat("x", 1024*1024+1))); err == nil {
		t.Fatal("oversized line accepted")
	}
}
func TestG020ParseCSV(t *testing.T) {
	rows, err := ParseCSV(strings.NewReader("name,city\nAda,London\n"))
	if err != nil || len(rows) != 2 || rows[1][0] != "Ada" {
		t.Fatalf("%v %v", rows, err)
	}
	if _, err = ParseCSV(strings.NewReader("\"unfinished\n")); err == nil {
		t.Fatal("malformed CSV accepted")
	}
}
func TestG021AtomicWrite(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	if err := AtomicWriteFile(path, []byte(`{"ready":true}`), 0600); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(path)
	if err != nil || string(got) != `{"ready":true}` {
		t.Fatalf("%s %v", got, err)
	}
	info, _ := os.Stat(path)
	if info.Mode().Perm() != 0600 {
		t.Fatalf("mode=%o", info.Mode().Perm())
	}
	if err := AtomicWriteFile(filepath.Join(t.TempDir(), "missing", "state.json"), []byte("x"), 0600); err == nil {
		t.Fatal("write into a missing directory succeeded")
	}
}
func TestG022CopyHash(t *testing.T) {
	var dst bytes.Buffer
	data := []byte("payload")
	n, sum, err := CopyHash(&dst, bytes.NewReader(data), int64(len(data)))
	want := sha256.Sum256(data)
	if err != nil || n != int64(len(data)) || dst.String() != string(data) || sum != hex.EncodeToString(want[:]) {
		t.Fatalf("%d %q %v", n, sum, err)
	}
	dst.Reset()
	if _, _, err = CopyHash(&dst, strings.NewReader("too long"), 2); err == nil || dst.Len() != 2 {
		t.Fatalf("limit err=%v bytes=%d", err, dst.Len())
	}
	if _, _, err = CopyHash(&dst, strings.NewReader("x"), -1); err == nil {
		t.Fatal("negative limit accepted")
	}
}
func TestG023JSONLines(t *testing.T) {
	type row struct {
		ID int `json:"id"`
	}
	got, err := ParseJSONLines[row](strings.NewReader("{\"id\":1}\n\n{\"id\":2}\n"))
	if err != nil || len(got) != 2 || got[1].ID != 2 {
		t.Fatalf("%v %v", got, err)
	}
	if _, err = ParseJSONLines[row](strings.NewReader("{}\nnope\n")); err == nil {
		t.Fatal("malformed line accepted")
	}
}
func TestG024SafeUploadName(t *testing.T) {
	got, err := SafeUploadName(`../../private\photo.png`)
	if err != nil || got != "photo.png" {
		t.Fatalf("%q %v", got, err)
	}
	if _, err = SafeUploadName("/"); err == nil {
		t.Fatal("empty basename accepted")
	}
}
