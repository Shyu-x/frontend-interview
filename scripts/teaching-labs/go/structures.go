package teaching

import (
	"container/heap"
	"errors"
	"sort"
	"sync"
)

// G025 is an LRU cache: a hit moves the key to the front, eviction removes the back.
type LRU[K comparable, V any] struct {
	mu       sync.Mutex
	capacity int
	order    *list[K, V]
}
type node[K comparable, V any] struct {
	key        K
	value      V
	prev, next *node[K, V]
}
type list[K comparable, V any] struct {
	head, tail *node[K, V]
	items      map[K]*node[K, V]
}

func NewLRU[K comparable, V any](capacity int) (*LRU[K, V], error) {
	if capacity < 1 {
		return nil, errors.New("capacity must be positive")
	}
	return &LRU[K, V]{capacity: capacity, order: &list[K, V]{items: make(map[K]*node[K, V])}}, nil
}
func (c *LRU[K, V]) moveFront(n *node[K, V]) {
	l := c.order
	if n == l.head {
		return
	}
	if n.prev != nil {
		n.prev.next = n.next
	}
	if n.next != nil {
		n.next.prev = n.prev
	}
	if l.tail == n {
		l.tail = n.prev
	}
	n.prev = nil
	n.next = l.head
	if l.head != nil {
		l.head.prev = n
	}
	l.head = n
	if l.tail == nil {
		l.tail = n
	}
}
func (c *LRU[K, V]) Get(k K) (V, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	n := c.order.items[k]
	if n == nil {
		return *new(V), false
	}
	c.moveFront(n)
	return n.value, true
}
func (c *LRU[K, V]) Put(k K, v V) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if n := c.order.items[k]; n != nil {
		n.value = v
		c.moveFront(n)
		return
	}
	n := &node[K, V]{key: k, value: v, next: c.order.head}
	if c.order.head != nil {
		c.order.head.prev = n
	}
	c.order.head = n
	if c.order.tail == nil {
		c.order.tail = n
	}
	c.order.items[k] = n
	if len(c.order.items) > c.capacity {
		old := c.order.tail
		delete(c.order.items, old.key)
		c.order.tail = old.prev
		if c.order.tail != nil {
			c.order.tail.next = nil
		}
	}
}

// G026 is a rune trie; prefix queries therefore work for UTF-8 words, not byte prefixes.
type Trie struct{ root *trieNode }
type trieNode struct {
	children map[rune]*trieNode
	terminal bool
}

func (t *Trie) Insert(word string) {
	if t.root == nil {
		t.root = &trieNode{children: make(map[rune]*trieNode)}
	}
	n := t.root
	for _, r := range word {
		if n.children[r] == nil {
			n.children[r] = &trieNode{children: make(map[rune]*trieNode)}
		}
		n = n.children[r]
	}
	n.terminal = true
}
func (t *Trie) Contains(word string) bool {
	n := t.root
	for _, r := range word {
		if n == nil {
			return false
		}
		n = n.children[r]
	}
	return n != nil && n.terminal
}
func (t *Trie) HasPrefix(prefix string) bool {
	n := t.root
	for _, r := range prefix {
		if n == nil {
			return false
		}
		n = n.children[r]
	}
	return n != nil
}

type intMaxHeap []int

func (h intMaxHeap) Len() int           { return len(h) }
func (h intMaxHeap) Less(i, j int) bool { return h[i] > h[j] }
func (h intMaxHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *intMaxHeap) Push(v any)        { *h = append(*h, v.(int)) }
func (h *intMaxHeap) Pop() any          { old := *h; n := len(old); v := old[n-1]; *h = old[:n-1]; return v }

// G027 returns the k smallest values with O(n log k) time and O(k) extra memory.
func KSmallest(values []int, k int) ([]int, error) {
	if k < 0 || k > len(values) {
		return nil, errors.New("k is outside input bounds")
	}
	if k == 0 {
		return []int{}, nil
	}
	h := intMaxHeap(append([]int(nil), values[:k]...))
	heap.Init(&h)
	for _, v := range values[k:] {
		if v < h[0] {
			h[0] = v
			heap.Fix(&h, 0)
		}
	}
	out := append([]int(nil), h...)
	sort.Ints(out)
	return out, nil
}

type Interval struct{ Start, End int }

// G028 merges touching closed intervals after sorting a copy of input.
func MergeIntervals(input []Interval) ([]Interval, error) {
	items := append([]Interval(nil), input...)
	for _, v := range items {
		if v.Start > v.End {
			return nil, errors.New("interval start exceeds end")
		}
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Start == items[j].Start {
			return items[i].End < items[j].End
		}
		return items[i].Start < items[j].Start
	})
	out := make([]Interval, 0, len(items))
	for _, v := range items {
		n := len(out)
		if n == 0 || v.Start > out[n-1].End {
			out = append(out, v)
		} else if v.End > out[n-1].End {
			out[n-1].End = v.End
		}
	}
	return out, nil
}

// G029 removes duplicate comparable values without changing first-seen order.
func StableUnique[T comparable](values []T) []T {
	seen := make(map[T]struct{}, len(values))
	out := make([]T, 0, len(values))
	for _, v := range values {
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	return out
}

// G030 finds the first value not less than target in a sorted slice.
func LowerBound(values []int, target int) int {
	lo, hi := 0, len(values)
	for lo < hi {
		mid := lo + (hi-lo)/2
		if values[mid] < target {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return lo
}
