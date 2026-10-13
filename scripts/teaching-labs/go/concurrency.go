package teaching

import (
	"context"
	"errors"
	"sync"
	"time"
)

var ErrInvalidWorkers = errors.New("worker count must be positive")

// G001 bounds goroutines and preserves input order; the indexed result slot has one writer.
func WorkerMap[T any, R any](ctx context.Context, in []T, workers int, fn func(context.Context, T) (R, error)) ([]R, error) {
	if workers < 1 {
		return nil, ErrInvalidWorkers
	}
	if len(in) == 0 {
		return []R{}, nil
	}
	if workers > len(in) {
		workers = len(in)
	}
	type job struct{ i int }
	jobs := make(chan job)
	out := make([]R, len(in))
	errs := make([]error, len(in))
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				if err := ctx.Err(); err != nil {
					errs[j.i] = err
					continue
				}
				out[j.i], errs[j.i] = fn(ctx, in[j.i])
			}
		}()
	}
	for i := range in {
		select {
		case jobs <- job{i}:
		case <-ctx.Done():
			close(jobs)
			wg.Wait()
			return nil, ctx.Err()
		}
	}
	close(jobs)
	wg.Wait()
	for _, err := range errs {
		if err != nil {
			return nil, err
		}
	}
	return out, nil
}

// G002 merges owned input channels; the coordinator alone closes output after all senders finish.
func FanIn[T any](ctx context.Context, inputs ...<-chan T) <-chan T {
	out := make(chan T)
	var wg sync.WaitGroup
	for _, input := range inputs {
		wg.Add(1)
		go func(ch <-chan T) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case v, ok := <-ch:
					if !ok {
						return
					}
					select {
					case out <- v:
					case <-ctx.Done():
						return
					}
				}
			}
		}(input)
	}
	go func() { wg.Wait(); close(out) }()
	return out
}

// G003 fans each job to one worker and returns the first failure; cancellation unblocks peers.
func FanOut[T any, R any](ctx context.Context, in []T, workers int, fn func(context.Context, T) (R, error)) ([]R, error) {
	if workers < 1 {
		return nil, ErrInvalidWorkers
	}
	child, cancel := context.WithCancel(ctx)
	defer cancel()
	type result struct {
		i   int
		v   R
		err error
	}
	jobs := make(chan int)
	results := make(chan result, len(in))
	var wg sync.WaitGroup
	if workers > len(in) {
		workers = len(in)
	}
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				v, e := fn(child, in[i])
				select {
				case results <- result{i, v, e}:
				case <-child.Done():
					return
				}
				if e != nil {
					cancel()
					return
				}
			}
		}()
	}
	go func() {
		defer close(jobs)
		for i := range in {
			select {
			case jobs <- i:
			case <-child.Done():
				return
			}
		}
	}()
	go func() { wg.Wait(); close(results) }()
	out := make([]R, len(in))
	seen := make([]bool, len(in))
	var first error
	for r := range results {
		if r.err != nil && first == nil {
			first = r.err
		}
		out[r.i] = r.v
		seen[r.i] = true
	}
	if first != nil {
		return nil, first
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	for _, ok := range seen {
		if !ok {
			return nil, context.Canceled
		}
	}
	return out, nil
}

// G004 performs parallel work while writing each result to its original index.
func OrderedMap[T any, R any](ctx context.Context, in []T, workers int, fn func(context.Context, T) R) ([]R, error) {
	if workers < 1 {
		return nil, ErrInvalidWorkers
	}
	out := make([]R, len(in))
	if len(in) == 0 {
		return out, nil
	}
	if workers > len(in) {
		workers = len(in)
	}
	indices := make(chan int)
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range indices {
				out[i] = fn(ctx, in[i])
			}
		}()
	}
	for i := range in {
		select {
		case indices <- i:
		case <-ctx.Done():
			close(indices)
			wg.Wait()
			return nil, ctx.Err()
		}
	}
	close(indices)
	wg.Wait()
	return out, ctx.Err()
}

// G005 sums a stream with cancellation-aware sends and closes every stage it owns.
func PipelineSum(ctx context.Context, values []int) (int, error) {
	stage := make(chan int)
	go func() {
		defer close(stage)
		for _, v := range values {
			select {
			case stage <- v:
			case <-ctx.Done():
				return
			}
		}
	}()
	total := 0
	for {
		if err := ctx.Err(); err != nil {
			return 0, err
		}
		select {
		case <-ctx.Done():
			return 0, ctx.Err()
		case v, ok := <-stage:
			if !ok {
				return total, nil
			}
			total += v
		}
	}
}

// G006 enforces a deadline and always releases the timer resource.
func WithDeadline[T any](parent context.Context, timeout time.Duration, work func(context.Context) (T, error)) (T, error) {
	ctx, cancel := context.WithTimeout(parent, timeout)
	defer cancel()
	return work(ctx)
}

// G007 is a concurrency-safe token bucket; elapsed time replenishes bounded capacity.
type TokenBucket struct {
	mu               sync.Mutex
	capacity, tokens float64
	rate             float64
	last             time.Time
	now              func() time.Time
}

func NewTokenBucket(capacity int, perSecond float64) (*TokenBucket, error) {
	if capacity < 1 || perSecond <= 0 {
		return nil, errors.New("capacity and rate must be positive")
	}
	now := time.Now
	return &TokenBucket{capacity: float64(capacity), tokens: float64(capacity), rate: perSecond, last: now(), now: now}, nil
}
func (b *TokenBucket) Allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	now := b.now()
	b.tokens += now.Sub(b.last).Seconds() * b.rate
	if b.tokens > b.capacity {
		b.tokens = b.capacity
	}
	b.last = now
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// G008 stores expiring values under a mutex so map access and expiry checks are one operation.
type TTLCache[K comparable, V any] struct {
	mu    sync.Mutex
	items map[K]cacheEntry[V]
	now   func() time.Time
}
type cacheEntry[V any] struct {
	value   V
	expires time.Time
}

func NewTTLCache[K comparable, V any]() *TTLCache[K, V] {
	return &TTLCache[K, V]{items: make(map[K]cacheEntry[V]), now: time.Now}
}
func (c *TTLCache[K, V]) Set(key K, value V, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = cacheEntry[V]{value, c.now().Add(ttl)}
}
func (c *TTLCache[K, V]) Get(key K) (V, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.items[key]
	if !ok {
		return *new(V), false
	}
	if !c.now().Before(e.expires) {
		delete(c.items, key)
		return *new(V), false
	}
	return e.value, true
}

// G009 coalesces concurrent work per key; completed calls are removed so later callers refresh.
type CallGroup[K comparable, V any] struct {
	mu    sync.Mutex
	calls map[K]*sharedCall[V]
}
type sharedCall[V any] struct {
	done  chan struct{}
	value V
	err   error
}

func (g *CallGroup[K, V]) Do(key K, fn func() (V, error)) (V, error) {
	g.mu.Lock()
	if g.calls == nil {
		g.calls = make(map[K]*sharedCall[V])
	}
	if c := g.calls[key]; c != nil {
		g.mu.Unlock()
		<-c.done
		return c.value, c.err
	}
	c := &sharedCall[V]{done: make(chan struct{})}
	g.calls[key] = c
	g.mu.Unlock()
	c.value, c.err = fn()
	g.mu.Lock()
	delete(g.calls, key)
	close(c.done)
	g.mu.Unlock()
	return c.value, c.err
}

// G010 is a context-aware semaphore; a buffered channel gives a hard upper bound.
type Semaphore struct{ slots chan struct{} }

func NewSemaphore(limit int) (*Semaphore, error) {
	if limit < 1 {
		return nil, ErrInvalidWorkers
	}
	return &Semaphore{slots: make(chan struct{}, limit)}, nil
}
func (s *Semaphore) Acquire(ctx context.Context) error {
	select {
	case s.slots <- struct{}{}:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}
func (s *Semaphore) Release() { <-s.slots }
