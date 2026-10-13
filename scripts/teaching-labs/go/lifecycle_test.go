package teaching

import (
	"context"
	"errors"
	"net"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestG031AtomicCounter(t *testing.T) {
	var c AtomicCounter
	if c.Load() != 0 {
		t.Fatalf("initial count=%d", c.Load())
	}
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); c.Add(1) }()
	}
	wg.Wait()
	if c.Load() != 100 {
		t.Fatalf("count=%d", c.Load())
	}
}
func TestG032Inventory(t *testing.T) {
	i, _ := NewInventory(10)
	var won atomic.Int32
	var wg sync.WaitGroup
	for n := 0; n < 40; n++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if i.Reserve(1) {
				won.Add(1)
			}
		}()
	}
	wg.Wait()
	if won.Load() != 10 || i.Available() != 0 {
		t.Fatalf("won=%d available=%d", won.Load(), i.Available())
	}
	if i.Reserve(1) {
		t.Fatal("oversold")
	}
}
func TestG033OnceCloser(t *testing.T) {
	var calls atomic.Int32
	want := errors.New("close failed")
	c := NewOnceCloser(func() error { calls.Add(1); return want })
	var wg sync.WaitGroup
	for n := 0; n < 20; n++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := c.Close(); !errors.Is(err, want) {
				t.Errorf("got %v", err)
			}
		}()
	}
	wg.Wait()
	if calls.Load() != 1 {
		t.Fatalf("close calls=%d", calls.Load())
	}
}
func TestG034TaskGroup(t *testing.T) {
	g := NewTaskGroup(context.Background())
	boom := errors.New("worker failed")
	g.Go(func(context.Context) error { return boom })
	g.Go(func(ctx context.Context) error { <-ctx.Done(); return nil })
	if err := g.Wait(); !errors.Is(err, boom) {
		t.Fatalf("got %v", err)
	}
	parent, cancel := context.WithCancel(context.Background())
	g = NewTaskGroup(parent)
	cancel()
	g.Go(func(ctx context.Context) error { return ctx.Err() })
	if err := g.Wait(); !errors.Is(err, context.Canceled) {
		t.Fatalf("parent cancel: %v", err)
	}
}
func TestG035Snapshot(t *testing.T) {
	var s Snapshot[map[string]int]
	if s.Load() != nil {
		t.Fatal("new snapshot must be empty")
	}
	original := map[string]int{"version": 1}
	s.Store(&original)
	copy1 := s.Load()
	updated := map[string]int{"version": 2}
	s.Store(&updated)
	if (*copy1)["version"] != 1 || (*s.Load())["version"] != 2 {
		t.Fatal("snapshot swap was not atomic")
	}
}
func TestG036ShutdownHTTP(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	srv := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(204) })}
	done := make(chan error, 1)
	go func() { done <- srv.Serve(ln) }()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := ShutdownHTTP(ctx, srv); err != nil {
		t.Fatal(err)
	}
	if err := <-done; !errors.Is(err, http.ErrServerClosed) {
		t.Fatalf("serve returned %v", err)
	}
	if err := ShutdownHTTP(context.Background(), nil); err == nil {
		t.Fatal("nil server accepted")
	}
}
