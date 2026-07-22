// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { signal, effect, domdiff } from "./dom.js";

const Logger = () => {
  const messages: string[] = [];

  return {
    log: (msg: string) => messages.push(msg),
    dump: () => {
      const txt = messages.join("\n");
      messages.length = 0;
      return txt;
    },
  };
};

describe("domdiff", () => {
  const lg = Logger();

  const Row = (id: string) => {
    const [w, h] = [signal(5), signal(7)];
    const areaNode = document.createElement("span");
    areaNode.dataset.id = id;

    // effect_1
    effect(() => {
      w.onDetach(() => lg.log("effect_1 from w (a)"));
      w.onDetach(() => lg.log("effect_1 from w (b)"));
      h.onDetach(() => lg.log("effect_1 from h"));
      areaNode.innerText = `${w.get() * h.get()}`;
    });

    // effect_2
    effect(() => {
      w.onDetach(() => lg.log("effect_2 from w"));
      w.get();
    });

    return areaNode;
  };

  test("clean effects", () => {
    const parentNode = document.createElement("div");
    const rows = [{ id: "1" }, { id: "2" }, { id: "3" }];

    domdiff(parentNode, rows, (row) => Row(row.id));
    expect(parentNode.children.length).toBe(3);

    lg.dump();
    rows.splice(0, 1);
    domdiff(parentNode, rows, (row) => Row(row.id));
    expect(parentNode.children.length).toBe(2);
    expect(lg.dump()).toBe(
      [
        "effect_1 from w (a)",
        "effect_1 from w (b)",
        "effect_2 from w",
        "effect_1 from h",
      ].join("\n"),
    );
  });
});
