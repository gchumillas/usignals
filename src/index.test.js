import { describe, expect, test } from "vitest";
import { createContext } from "./index.js";

describe("edge cases", () => {
  test("call get/set outside an effect", () => {
    const ctx = createContext();
    const msg = ctx.signal("aaa");
    expect(msg.get()).toBe("aaa");
    msg.set("bbb");
    expect(msg.get()).toBe("bbb");
  });
});

describe("multiple signals", () => {
  test("an effect that reads multiple signals", () => {
    const ctx = createContext();
    const efs = ctx.effects();
    const a = ctx.signal("a");
    const b = ctx.signal("b");

    let counter = 0;
    efs.effect(() => {
      a.get() + b.get();
      counter++;
    });
    expect(counter).toBe(1); // call the effect immediately

    a.set("aa");
    b.set("bb");
    expect(counter).toBe(3); // call the effect twice (1 + 2)
  });

  test("a signal that affects multiple effects", () => {
    const ctx = createContext();
    const efs1 = ctx.effects();
    const efs2 = ctx.effects();
    const a = ctx.signal("a");
    const b = ctx.signal("b");
    let counter = 0;

    // effect1
    efs1.effect(() => {
      a.get();
      counter++;
    });
    expect(counter).toBe(1);

    // effect2
    efs2.effect(() => {
      a.get();
      b.get();
      counter++;
    });
    expect(counter).toBe(2);

    a.set("aa");
    expect(counter).toBe(4); // call effect1 and effect2

    b.set("bb");
    expect(counter).toBe(5); // only call effect2
  });

  test("selective effects", () => {
    const ctx = createContext();
    const efs = ctx.effects();
    const a = ctx.signal("a");
    const b = ctx.signal("b");

    // effect1
    let counter1 = 0;
    efs.effect(() => {
      a.get();
      counter1++;
    });
    expect(counter1).toBe(1);

    // effect2
    let counter2 = 0;
    efs.effect(() => {
      b.get();
      counter2++;
    });
    expect(counter2).toBe(1);

    a.set("aa");
    expect(counter1).toBe(2); // call effect1
    expect(counter2).toBe(1); // do not call effect2
  });
});

describe("update cases", () => {
  test("consecutive updates", () => {
    const ctx = createContext();
    const efs = ctx.effects();
    const a = ctx.signal(0);

    let counter = 0;
    let lastVal = 0;
    efs.effect(() => {
      lastVal = a.get();
      counter++;
    });
    expect(counter).toBe(1);

    for (let i = 0; i < 3; i++) {
      a.set(i);
    }
    expect(counter).toBe(4); // call the effect three times
    expect(lastVal).toBe(2);
  });

  test("signals can be updated inside effect and read outside safely", () => {
    const ctx = createContext();
    const efs = ctx.effects();
    const a = ctx.signal(1);
    const b = ctx.signal(0);

    efs.effect(() => {
      b.set(2 * a.get());
    });
    expect(b.get()).toBe(2); // 2 * 1

    a.set(5);
    expect(b.get()).toBe(10); // 2 * 5
  });

  test("get/set outside effect does not affect existing effects", () => {
    const ctx = createContext();
    const efs = ctx.effects();
    const a = ctx.signal("a");
    const b = ctx.signal("b");

    let counter = 0;
    efs.effect(() => {
      a.get();
      counter++;
    });
    expect(counter).toBe(1);

    a.set("a");
    expect(counter).toBe(2);

    b.get();
    b.set("b");
    expect(counter).toBe(2);
  });

  test("update with the same value", () => {
    const ctx = createContext();
    const efs = ctx.effects();
    const a = ctx.signal("a");

    let counter = 0;
    efs.effect(() => {
      a.get();
      counter++;
    });
    expect(counter).toBe(1);

    a.set("a");
    expect(counter).toBe(2); // call the effect even with the same value
  });
});

describe("cleaning cases", () => {
  test("cleanup of effects that never read signals", () => {
    const ctx = createContext();
    const efs = ctx.effects();

    efs.effect(() => {
      // move along, there is nothing to see
    });

    for (let i = 0; i < 2; i++) {
      expect(() => efs.clean()).not.toThrow();
    }
  });

  test("partial cleanup with multiple effects groups", () => {
    const ctx = createContext();
    const efs1 = ctx.effects();
    const efs2 = ctx.effects();
    const efs3 = ctx.effects();
    let a = ctx.signal(0);

    let counter1 = 0;
    efs1.effect(() => {
      a.get();
      counter1++;
    });
    let counter2 = 0;
    efs2.effect(() => {
      a.get();
      counter2++;
    });
    let counter3 = 0;
    efs3.effect(() => {
      a.get();
      counter3++;
    });
    expect(counter1).toBe(1);
    expect(counter2).toBe(1);
    expect(counter3).toBe(1);

    a.set(1);
    expect(counter1).toBe(2);
    expect(counter2).toBe(2);
    expect(counter3).toBe(2);

    efs2.clean();
    a.set(2);
    expect(counter1).toBe(3);
    expect(counter2).toBe(2); // effect2 is not executed
    expect(counter3).toBe(3);
  });
});

describe("memory and optimization cases", () => {
  test("unused signals", () => {
    const ctx = createContext();
    const efs = ctx.effects();
    const unused = ctx.signal("never read");
    const used = ctx.signal("active");

    let counter = 0;
    efs.effect(() => {
      used.get();
      counter++;
    });
    expect(counter).toBe(1);
    used.set("changed");
    expect(counter).toBe(2);
    unused.set("unread value");
    expect(counter).toBe(2); // does not execute existing effects
  });

  test("re-registration of the same effect", () => {
    const ctx = createContext();
    const efs = ctx.effects();
    const a = ctx.signal("a");
    const b = ctx.signal("b");

    let counter = 0;
    efs.effect(() => {
      a.get();
      b.get();
      counter++;
    });
    expect(counter).toBe(1);

    efs.clean();
    counter = 0;
    efs.effect(() => {
      a.get();
      b.get();
      counter++;
    });
    expect(counter).toBe(1);
  });
});

describe("complex cases", () => {
  test("chain of effects", () => {
    const ctx = createContext();
    const efs = ctx.effects();
    const x = ctx.signal(1);
    const y = ctx.signal(0);

    const seq = [];
    efs.effect(() => {
      const val = x.get();
      seq.push("effect1");
      y.set(val);
    });
    efs.effect(() => {
      y.get();
      seq.push("effect2");
    });
    expect(seq).toEqual(["effect1", "effect2"]);
    x.set(2);
    expect(seq).toEqual(["effect1", "effect2", "effect1", "effect2"]);
  });
});
