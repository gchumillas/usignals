export const createContext = <T>() => {
  const stack: T[] = [];
  return {
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
    use: (): T => {
      if (stack.length === 0) {
        throw new Error("ctx.use() was called outside ctx.with(values, fn)");
      }
      return stack[stack.length - 1];
    },
  };
};
