import udomdiff from "udomdiff";
import { createScope, type Signal } from "./core";

const sc = createScope();
let currentEffects = sc.effects();

/**
 * Declares a reactive value or "signal".
 *
 * Signals can trigger "effects". If a signal has been used within
 * an effect and its value has been read, then the effect re-executes
 * every time the signal changes.
 */
export const signal = sc.signal;

/**
 * Declares an "effect".
 *
 * The effect runs the first time and re-executes every time
 * a read signal changes. This allows us, primarily, to update
 * the interface with the new signal values.
 *
 * Important! The effect must read a signal at least once; otherwise
 * it will not re-execute. For example:
 *
 * ```js
 * const total = signal(0)
 * effect(() => {
 *   if (neverCondition) {
 *     // since the value of `total` is never read,
 *     // the effect does not re-execute when the signal changes
 *     total.get()
 *   }
 * })
 * ```
 *
 * In the example above, it would be appropriate to move `total` outside
 * the conditional, so that its value can be read at least once.
 */
export const effect = (
  fn: () => void,
  _onDetachFromSignal?: (s: Signal<any>) => void, // // for internal-only (mainly testing)
) => currentEffects.effect(fn, _onDetachFromSignal);

export function Render(fn: () => string) {
  const node = document.createTextNode("");
  effect(() => {
    node.textContent = fn();
  });
  return node;
}

const effectsMap = new WeakMap();
/**
 * Efficiently updates a list of elements, freeing memory from
 * effects whose elements have been detached from the document.
 */
export function domdiff<T extends { id: string | number }>(
  parentNode: ParentNode,
  rows: T[],
  insert: (row: T) => Node,
) {
  if (!effectsMap.has(parentNode)) {
    effectsMap.set(parentNode, Object.create(null));
  }
  const savedEffects = effectsMap.get(parentNode);
  const parentEffects = currentEffects;
  try {
    const ids: { [id: string]: HTMLElement } = {};
    const rowIdSet = new Set(rows.map((r) => `${r.id}`));
    // clean the effects of nodes that have been detached from the DOM
    for (const child of Array.from(parentNode.children)) {
      if (!(child instanceof HTMLElement)) {
        continue;
      }
      const id = child.dataset.id;
      if (id === undefined) {
        throw new Error("All children must have dataset.id");
      }
      if (!rowIdSet.has(id) && savedEffects[id]) {
        // cleaning effects group
        savedEffects[id].clean();
        delete savedEffects[id];
      }
      ids[id] = child;
    }
    // nodes to be repositioned or inserted
    let nodes = [];
    for (const row of rows) {
      if (row.id === undefined || row.id === null) {
        throw new Error("All rows must have an id property");
      }
      if (!savedEffects[row.id]) {
        // creates an effects group per row
        savedEffects[row.id] = parentEffects.effects();
      }
      currentEffects = savedEffects[row.id];
      nodes.push(ids[`${row.id}`] || insert(row));
    }
    udomdiff(parentNode, Array.from(parentNode.children), nodes, (n: any) => n);
  } finally {
    currentEffects = parentEffects;
  }
}
