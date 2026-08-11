export function createKeyedLocks() {
  const tails = new Map<string, Promise<void>>();

  return async function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    tails.set(key, tail);
    await previous;
    try {
      return await task();
    } finally {
      release();
      void tail.then(() => {
        if (tails.get(key) === tail) tails.delete(key);
      });
    }
  };
}
