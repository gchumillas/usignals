// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { signal, effect, domdiff } from "./dom.js";

const logger = () => {
  const msgs: string[] = [];

  return {
    log: (msg: string) => {
      msgs.push(msg);
    },
    dump: () => {
      const text = msgs.join("\n");
      msgs.length = 0;
      return text;
    },
  };
};

describe("domdiff", () => {
  const lg = logger();

  const Row = (id: string) => {
    const [w, h] = [signal(5), signal(7)];
    const areaNode = document.createElement("span");
    areaNode.dataset.id = id;

    // effect_1
    effect(
      () => {
        areaNode.innerText = `${w.get() * h.get()}`;
      },
      (s) => {
        switch (s) {
          case w:
            lg.log("effect_1 detached from w");
            break;
          case h:
            lg.log("effect_1 detached from h");
        }
      },
    );

    // effect_2
    effect(
      () => {
        w.get();
      },
      (s) => {
        if (s === w) {
          lg.log("effect_2 detached from w");
        }
      },
    );

    return areaNode;
  };

  test("clean effects", () => {
    const parentNode = document.createElement("div");
    const rows = [{ id: "1" }, { id: "2" }, { id: "3" }];

    domdiff(parentNode, rows, (row) => Row(row.id));
    expect(parentNode.children.length).toBe(3);

    rows.splice(0, 1);
    lg.dump();
    domdiff(parentNode, rows, (row) => Row(row.id));
    expect(parentNode.children.length).toBe(2);
    expect(lg.dump()).toBe(
      [
        "effect_1 detached from w",
        "effect_2 detached from w",
        "effect_1 detached from h",
      ].join("\n"),
    );
  });
});
