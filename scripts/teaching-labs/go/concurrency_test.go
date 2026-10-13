package teaching

import (
	"context"
	"errors"
	"reflect"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestG001WorkerMap(t *testing.T) {
	got, err := WorkerMap(context.Background(), []int{1, 2, 3}, 2, func(_ context.Context, n int) (int, error) { return n * n, nil })
	if err != nil || !reflect.DeepEqual(got, []int{1, 4, 9}) {
		t.Fatalf("got %v, %v", got, err)
	}
	if _, err = WorkerMap(context.Background(), []int{1}, 0, func(context.Context, int) (int, error) { return 0, nil }); !errors.Is(err, ErrInvalidWorkers) {
		t.Fatalf("expected worker validation, got %v", err)
	}
}
func TestG002FanIn(t *testing.T) {
	a := make(chan int, 2)
	b := make(chan int, 1)
	a <- 1
	a <- 2
	b <- 3
	close(a)
	close(b)
	sum := 0
	for n := range FanIn(context.Background(), a, b) {
		sum += n
	}
	if sum != 6 {
		t.Fatalf("sum=%d", sum)
	}
	if count := len(func() []int {
		var values []int
		for value := range FanIn[int](context.Background()) {
			values = append(values, value)
		}
		return values
	}()); count != 0 {
		t.Fatalf("empty fan-in produced %d values", count)
	}
}
func TestG003FanOut(t *testing.T) {
	got, err := FanOut(context.Background(), []int{2, 3}, 2, func(_ context.Context, n int) (int, error) { return n * n, nil })
	if err != nil || !reflect.DeepEqual(got, []int{4, 9}) {
		t.Fatalf("%v %v", got, err)
	}
	want := errors.New("backend down")
	_, err = FanOut(context.Background(), []int{1, 2}, 2, func(_ context.Context, n int) (int, error) {
		if n == 2 {
			return 0, want
		}
		return n, nil
	})
	if !errors.Is(err, want) {
		t.Fatalf("got %v", err)
	}
}
func TestG004OrderedMap(t *testing.T) {
	got, err := OrderedMap(context.Background(), []int{3, 1, 2}, 3, func(_ context.Context, n int) int { return n * 10 })
	if err != nil || !reflect.DeepEqual(got, []int{30, 10, 20}) {
		t.Fatalf("%v %v", got, err)
	}
	if _, err := OrderedMap(context.Background(), []int{1}, 0, func(_ context.Context, n int) int { return n }); !errors.Is(err, ErrInvalidWorkers) {
		t.Fatalf("expected worker validation, got %v", err)
	}
}
func TestG005PipelineSum(t *testing.T) {
	got, err := PipelineSum(context.Background(), []int{1, 2, 3})
	if err != nil || got != 6 {
		t.Fatalf("%d %v", got, err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err = PipelineSum(ctx, []int{1}); !errors.Is(err, context.Canceled) {
		t.Fatalf("got %v", err)
	}
}
func TestG006Deadline(t *testing.T) {
	_, err := WithDeadline(context.Background(), time.Millisecond, func(ctx context.Context) (int, error) { <-ctx.Done(); return 0, ctx.Err() })
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("got %v", err)
	}
}
func TestG007TokenBucket(t *testing.T) {
	b, _ := NewTokenBucket(2, 1)
	clock := time.Now()
	b.now = func() time.Time { return clock }
	if !b.Allow() || !b.Allow() || b.Allow() {
		t.Fatal("capacity should be two")
	}
	clock = clock.Add(time.Second)
	if !b.Allow() {
		t.Fatal("token should refill")
	}
}
func TestG008TTLCache(t *testing.T) {
	c := NewTTLCache[string, int]()
	clock := time.Now()
	c.now = func() time.Time { return clock }
	c.Set("key", 4, time.Second)
	if v, ok := c.Get("key"); !ok || v != 4 {
		t.Fatal("value missing")
	}
	clock = clock.Add(time.Second)
	if _, ok := c.Get("key"); ok {
		t.Fatal("expired value returned")
	}
}
func TestG009CallGroup(t *testing.T) {
	var calls atomic.Int32
	g := &CallGroup[string, int]{}
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			v, err := g.Do("customer-7", func() (int, error) { calls.Add(1); <-start; return 42, nil })
			if err != nil || v != 42 {
				t.Errorf("%d %v", v, err)
			}
		}()
	}
	time.Sleep(10 * time.Millisecond)
	close(start)
	wg.Wait()
	if calls.Load() != 1 {
		t.Fatalf("calls=%d", calls.Load())
	}
	want := errors.New("lookup failed")
	if _, err := g.Do("missing", func() (int, error) { return 0, want }); !errors.Is(err, want) {
		t.Fatalf("error was lost: %v", err)
	}
}
func TestG010Semaphore(t *testing.T) {
	s, _ := NewSemaphore(1)
	if err := s.Acquire(context.Background()); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := s.Acquire(ctx); !errors.Is(err, context.Canceled) {
		t.Fatalf("got %v", err)
	}
	s.Release()
}
