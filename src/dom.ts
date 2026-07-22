import udomdiff from "udomdiff";
import { createScope, type Signal } from "./core";

const sc = createScope();
let currentEffects = sc.effects();

export const signal = sc.signal;

/**
 * Runs `fn` and re-runs it whenever any signal it has read changes.
 *
 * Note: subscriptions are not automatically pruned between runs; use the owning
 * effects group’s `clean()` to detach from previously read signals.
 *
 * Intended for harmless side effects (e.g. updating the UI), not for
 * setting up resources like database connections or file handles.
 */
export const effect = (
  fn: () => void,
  onDetachFromSignal?: (s: Signal<any>) => void,
) => currentEffects.effect(fn, onDetachFromSignal);

export function Render(fn: () => string) {
  const node = document.createTextNode("");
  effect(() => {
    node.textContent = fn();
  });
  return node;
}

const effectsMap = new WeakMap();
export function domdiff<T extends { id: string | number }>(
  parentNode: ParentNode,
  rows: T[],
  insert: (row: T) => Node,
) {
  if (!effectsMap.has(parentNode)) {
    effectsMap.set(parentNode, Object.create(null));
  }
  const savedEffects = effectsMap.get(parentNode);
  const prevEffects = currentEffects;
  try {
    const ids: { [id: string]: HTMLElement } = {};
    const rowIdSet = new Set(rows.map((r) => `${r.id}`));
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
    let nodes = [];
    for (const row of rows) {
      if (row.id === undefined || row.id === null) {
        throw new Error("All rows must have an id property");
      }
      if (!savedEffects[row.id]) {
        // creates an effects group per row
        savedEffects[row.id] = sc.effects();
      }
      currentEffects = savedEffects[row.id];
      nodes.push(ids[`${row.id}`] || insert(row));
    }
    udomdiff(parentNode, Array.from(parentNode.children), nodes, (n: any) => n);
  } finally {
    currentEffects = prevEffects;
  }
}
