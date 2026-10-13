package teaching

import (
	"context"
	"errors"
	"net/http"
	"sync"
	"sync/atomic"
)

// G031 uses an atomic integer for independent increments that do not need compound state.
type AtomicCounter struct{ value atomic.Int64 }

func (c *AtomicCounter) Add(delta int64) int64 { return c.value.Add(delta) }
func (c *AtomicCounter) Load() int64           { return c.value.Load() }

// G032 guards the read-check-write reservation as one critical section.
type Inventory struct {
	mu        sync.Mutex
	available int
}

func NewInventory(count int) (*Inventory, error) {
	if count < 0 {
		return nil, errors.New("inventory cannot be negative")
	}
	return &Inventory{available: count}, nil
}
func (i *Inventory) Reserve(count int) bool {
	if count < 1 {
		return false
	}
	i.mu.Lock()
	defer i.mu.Unlock()
	if count > i.available {
		return false
	}
	i.available -= count
	return true
}
func (i *Inventory) Available() int { i.mu.Lock(); defer i.mu.Unlock(); return i.available }

// G033 makes cleanup idempotent and preserves the first close error for every caller.
type OnceCloser struct {
	once    sync.Once
	closeFn func() error
	err     error
}

func NewOnceCloser(closeFn func() error) *OnceCloser { return &OnceCloser{closeFn: closeFn} }
func (c *OnceCloser) Close() error {
	c.once.Do(func() {
		if c.closeFn != nil {
			c.err = c.closeFn()
		}
	})
	return c.err
}

// G034 cancels sibling tasks on the first failure and Wait joins all started goroutines.
type TaskGroup struct {
	parent, ctx context.Context
	cancel      context.CancelFunc
	wg          sync.WaitGroup
	once        sync.Once
	err         error
}

func NewTaskGroup(parent context.Context) *TaskGroup {
	ctx, cancel := context.WithCancel(parent)
	return &TaskGroup{parent: parent, ctx: ctx, cancel: cancel}
}
func (g *TaskGroup) Context() context.Context { return g.ctx }
func (g *TaskGroup) Go(task func(context.Context) error) {
	g.wg.Add(1)
	go func() {
		defer g.wg.Done()
		if err := task(g.ctx); err != nil {
			g.once.Do(func() { g.err = err; g.cancel() })
		}
	}()
}
func (g *TaskGroup) Wait() error {
	g.wg.Wait()
	g.cancel()
	if g.err != nil {
		return g.err
	}
	return g.parent.Err()
}

// G035 atomically swaps immutable configuration snapshots without readers taking a lock.
type Snapshot[T any] struct{ value atomic.Pointer[T] }

func (s *Snapshot[T]) Store(v *T) { s.value.Store(v) }
func (s *Snapshot[T]) Load() *T   { return s.value.Load() }

// G036 gives graceful HTTP shutdown a deadline, then forces socket closure on expiry.
func ShutdownHTTP(ctx context.Context, server *http.Server) error {
	if server == nil {
		return errors.New("server is nil")
	}
	if err := server.Shutdown(ctx); err != nil {
		closeErr := server.Close()
		if closeErr != nil {
			return errors.Join(err, closeErr)
		}
		return err
	}
	return nil
}
