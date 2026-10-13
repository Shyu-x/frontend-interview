package teaching

import (
	"reflect"
	"testing"
)

func TestG025LRU(t *testing.T) {
	c, err := NewLRU[string, int](2)
	if err != nil {
		t.Fatal(err)
	}
	c.Put("a", 1)
	c.Put("b", 2)
	if _, ok := c.Get("a"); !ok {
		t.Fatal("a missing")
	}
	c.Put("c", 3)
	if _, ok := c.Get("b"); ok {
		t.Fatal("least recently used key retained")
	}
	c.Put("a", 9)
	v, _ := c.Get("a")
	if v != 9 {
		t.Fatalf("updated value=%d", v)
	}
	if _, err = NewLRU[string, int](0); err == nil {
		t.Fatal("zero capacity accepted")
	}
}
func TestG026Trie(t *testing.T) {
	var tr Trie
	tr.Insert("东京")
	tr.Insert("東京駅")
	if !tr.Contains("东京") || tr.Contains("东") || !tr.HasPrefix("東京") || tr.HasPrefix("大阪") {
		t.Fatal("trie lookup mismatch")
	}
}
func TestG027KSmallest(t *testing.T) {
	got, err := KSmallest([]int{9, 1, 5, 2, 8}, 3)
	if err != nil || !reflect.DeepEqual(got, []int{1, 2, 5}) {
		t.Fatalf("%v %v", got, err)
	}
	if _, err = KSmallest([]int{1}, 2); err == nil {
		t.Fatal("out-of-range k accepted")
	}
	empty, err := KSmallest([]int{1}, 0)
	if err != nil || len(empty) != 0 {
		t.Fatalf("%v %v", empty, err)
	}
}
func TestG028MergeIntervals(t *testing.T) {
	input := []Interval{{5, 7}, {1, 3}, {3, 4}, {10, 10}}
	got, err := MergeIntervals(input)
	if err != nil || !reflect.DeepEqual(got, []Interval{{1, 4}, {5, 7}, {10, 10}}) {
		t.Fatalf("%v %v", got, err)
	}
	if _, err = MergeIntervals([]Interval{{4, 2}}); err == nil {
		t.Fatal("reversed interval accepted")
	}
	if input[0] != (Interval{5, 7}) {
		t.Fatal("input was mutated")
	}
}
func TestG029StableUnique(t *testing.T) {
	got := StableUnique([]string{"a", "b", "a", "c", "b"})
	if !reflect.DeepEqual(got, []string{"a", "b", "c"}) {
		t.Fatalf("%v", got)
	}
	if got := StableUnique([]string(nil)); len(got) != 0 {
		t.Fatalf("empty input produced %v", got)
	}
}
func TestG030LowerBound(t *testing.T) {
	for target, want := range map[int]int{-1: 0, 2: 1, 3: 1, 4: 3, 8: 4} {
		if got := LowerBound([]int{1, 3, 3, 7}, target); got != want {
			t.Fatalf("target %d got %d want %d", target, got, want)
		}
	}
}
