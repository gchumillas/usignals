/**
 * Creates a context channel.
 *
 * This allows us to transmit data from parents to children without needing to pass
 * them explicitly through parameters, thus avoiding the "prop-drilling" anti-pattern.
 *
 * ```
 * // context.ts
 * export const ctx = createContext()
 *
 * // parent.ts
 * // transmit context values
 * const ChildWithCtx = ctx.with({ a, b, c }, Child)
 *
 * // child.ts
 * // use context values
 * const { a, b, c } = ctx.use()
 * ```
 */
export const createContext = <T>() => {
  const stack: T[] = [];
  return {
    /**
     * Transmits context values to a given function.
     */
    with:
      <Args extends any[]>(values: T, fn: (...args: Args) => Node) =>
      (...args: Args) => {
        stack.push(values);
        try {
          return fn(...args);
        } finally {
          stack.pop();
        }
      },
    /**
     * Gets the context values.
     *
     * It is important that we have previously transmitted those context values,
     * otherwise we will get an error.
     */
    use: (): T => {
      if (stack.length === 0) {
        throw new Error("ctx.use() was called outside ctx.with(values, fn)");
      }
      return stack[stack.length - 1];
    },
  };
};
