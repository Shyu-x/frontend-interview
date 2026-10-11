/** Stop waiting promptly. This does NOT kill an uncooperative worker or undo its side effects. */
export async function abortable<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  signal?.throwIfAborted();
  let listener: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    listener = () => reject(signal?.reason ?? new Error("Operation aborted"));
    signal?.addEventListener("abort", listener, { once: true });
  });
  try {
    const result = await Promise.race([
      Promise.resolve().then(operation),
      cancelled,
    ]);
    signal?.throwIfAborted();
    return result;
  } finally {
    if (listener) signal?.removeEventListener("abort", listener);
  }
}
