// @vitest-environment happy-dom
import { h } from "jsx-dom";
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
    const parentNode = <div />;
    const rows = [{ id: "1" }, { id: "2" }, { id: "3" }];

    const Row = (id: string) => {
      const [width, height] = [signal(5), signal(7)];
      const areaNode = <span />;
      areaNode.dataset.id = id;

      // effect_1
      effect(
        () => {
          areaNode.textContent = `${width.get() * height.get()}`;
        },
        (s) => {
          switch (s) {
            case width:
              lg.log("effect_1 detached from w");
              break;
            case height:
              lg.log("effect_1 detached from h");
          }
        },
      );

      // effect_2
      effect(
        () => {
          width.get();
        },
        (s) => {
          if (s === width) {
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
    const tbodyNode = <tbody />;
    const rows = [{ id: "1" }, { id: "2" }];

    const Td = (id: string) => {
      const b = signal(0);
      const tdNode = <td />;
      tdNode.dataset.id = id;
      tdNode.textContent = `Cell ${id}`;

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
      const trNode = <tr />;
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
