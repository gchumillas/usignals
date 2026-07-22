export const createContext = () => {
  const stack: any[] = [];
  return {
    with:
      (values: any, fn: (...args: any) => Node) =>
      (...args: any) => {
        stack.push(values);
        try {
          return fn(...args);
        } finally {
          stack.pop();
        }
      },
    use: () => {
      if (stack.length === 0) {
        throw new Error("ctx.use() was called outside ctx.with(values, fn)");
      }
      return stack[stack.length - 1];
    },
  };
};
