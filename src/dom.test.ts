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
  test("clean effects", () => {
    const lg = logger();
    const parentNode = document.createElement("div");
    const rows = [{ id: "1" }, { id: "2" }, { id: "3" }];

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

  test("clean nested effects", () => {
    const lg = logger();
    const tableNode = document.createElement("table");
    const tbodyNode = document.createElement("tbody");
    tableNode.appendChild(tbodyNode);
    const rows = [{ id: "1" }, { id: "2" }];

    const Td = (id: string) => {
      const b = signal(0);
      const tdNode = document.createElement("td");
      tdNode.dataset.id = id;
      tdNode.innerText = `Cell ${id}`;

      effect(
        () => {
          b.get();
        },
        (s) => {
          if (s === b) {
            lg.log(`effect_${id} detached from b`);
          }
        },
      );

      return tdNode;
    };

    const Tr = (id: string) => {
      const a = signal(0);
      const trNode = document.createElement("tr");
      trNode.dataset.id = id;

      effect(
        () => {
          a.get();
        },
        (s) => {
          if (s === a) {
            lg.log(`effect_${id} detached from a`);
          }
        },
      );

      const cells = [{ id: `${id}1` }, { id: `${id}2` }];
      domdiff(trNode, cells, (cell) => Td(cell.id));
      return trNode;
    };

    domdiff(tbodyNode, rows, (row) => Tr(row.id));

    rows.splice(0, 1);
    lg.dump();
    domdiff(tbodyNode, rows, (row) => Tr(row.id));
    expect(lg.dump()).toBe(
      [
        "effect_1 detached from a",
        "effect_11 detached from b",
        "effect_12 detached from b",
      ].join("\n"),
    );
  });
});
