export type Signal<T> = {
  get: () => T;
  set: (value: T) => void;
};

type Effect = {
  id: string;
  fn?: () => void;
  onDetachFromSignal?: <T>(s: Signal<T>) => void;
  effectsId: string;
};

type Scope = {
  currentEffect: Effect;
  cleaners: Map<string, (effectsId: string) => void>;
};

export const createScope = () => {
  const sc: Scope = {
    currentEffect: {
      id: "",
      fn: undefined,
      effectsId: "",
    },
    cleaners: new Map(),
  };

  return {
    signal: <T>(val: T) => createSignal(sc, val),
    effects: () => createEffects(sc),
  };
};

const createSignal = <T>(sc: Scope, initVal: T): Signal<T> => {
  type SignalEffect = {
    effectsId: string;
    fn?: () => void;
    onDetachFromSignal?: (s: Signal<any>) => void;
    cleaners: Map<string, (effectsId: string) => void>;
  };

  const signal = {
    id: genId(),
    val: initVal,
    effects: new Map<string, SignalEffect>(),
    instance: {} as Signal<T>,
  };

  function cleaner(effectsId: string) {
    const prevEffect = { ...sc.currentEffect };
    const prevCleaners = sc.cleaners;
    try {
      sc.currentEffect = { id: "", fn: undefined, effectsId: "" };
      sc.cleaners = new Map();
      for (const [id, effect] of signal.effects) {
        if (effectsId === effect.effectsId) {
          effect.onDetachFromSignal?.(signal.instance);
          signal.effects.delete(id);
        }
      }
    } finally {
      sc.currentEffect = prevEffect;
      sc.cleaners = prevCleaners;
    }
  }

  signal.instance = {
    get: () => {
      const { id, fn, onDetachFromSignal, effectsId } = sc.currentEffect;
      if (id) {
        const cleaners = sc.cleaners;
        signal.effects.set(id, { fn, onDetachFromSignal, effectsId, cleaners });
        cleaners.set(signal.id, cleaner);
      }
      return signal.val;
    },
    set: (val: T) => {
      signal.val = val;
      const prevEffect = { ...sc.currentEffect };
      const prevCleaners = sc.cleaners;
      try {
        for (const [id, effect] of signal.effects) {
          const { fn, onDetachFromSignal, effectsId, cleaners } = effect;
          sc.currentEffect = { id, fn, onDetachFromSignal, effectsId };
          sc.cleaners = cleaners ?? prevCleaners;
          fn?.();
        }
      } finally {
        sc.currentEffect = prevEffect;
        sc.cleaners = prevCleaners;
      }
    },
  };

  return signal.instance;
};

const createEffects = (sc: Scope) => {
  const effects = {
    id: genId(),
    signalCleaners: new Map<string, (effectsId: string) => void>(),
    children: new Set<{ clean: () => void }>(),
  };

  return {
    /**
     * Runs `fn` and re-runs it whenever any signal it has read changes.
     *
     * Note: subscriptions are not automatically pruned between runs; call `clean()`
     * on the owning effects group to detach from previously read signals.
     *
     * Intended for harmless side effects (e.g. updating the UI), not for
     * setting up resources like database connections or file handles.
     */
    effect: (fn: () => void, onDetachFromSignal?: (s: Signal<any>) => void) => {
      const prevEffect = { ...sc.currentEffect };
      const prevCleaners = sc.cleaners;
      try {
        const id = genId();
        sc.currentEffect = {
          id,
          fn,
          onDetachFromSignal,
          effectsId: effects.id,
        };
        sc.cleaners = effects.signalCleaners;
        fn();
      } finally {
        sc.currentEffect = prevEffect;
        sc.cleaners = prevCleaners;
      }
    },
    addChild: (child: { clean: () => void }) => {
      if (effects.children.has(child)) return;
      effects.children.add(child);
      const origClean = child.clean.bind(child);
      child.clean = () => {
        effects.children.delete(child);
        origClean();
      };
    },
    clean: () => {
      for (const [, cleanerFn] of effects.signalCleaners) {
        cleanerFn(effects.id);
      }
      for (const child of effects.children) {
        child.clean();
      }
      effects.children.clear();
    },
  };
};

let _id = 0;
const genId = () => (++_id).toString();
