type Effect = {
  id: string;
  fn?: () => void;
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

const createSignal = <T>(sc: Scope, val: T) => {
  type SignalEffect = {
    effectsId: string;
    fn?: () => void;
    cleaners: Map<string, (effectsId: string) => void>;
  };

  const signal = {
    id: genId(),
    val,
    effects: new Map<string, SignalEffect>(),
    onDetaches: new Map<string, (() => void)[]>(),
  };

  function cleaner(effectsId: string) {
    for (const [id, effect] of signal.effects) {
      if (effectsId === effect.effectsId) {
        signal.effects.delete(id);
        if (signal.onDetaches.has(id)) {
          const fns = signal.onDetaches.get(id) ?? [];
          for (const fn of fns) {
            fn();
          }
          signal.onDetaches.delete(id);
        }
      }
    }
  }

  return {
    get: () => {
      const { id, fn, effectsId } = sc.currentEffect;
      if (id) {
        const cleaners = sc.cleaners;
        signal.effects.set(id, { fn, effectsId, cleaners });
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
          const { fn, effectsId, cleaners } = effect;
          sc.currentEffect = { id, fn, effectsId };
          sc.cleaners = cleaners ?? prevCleaners;
          fn?.();
        }
      } finally {
        sc.currentEffect = prevEffect;
        sc.cleaners = prevCleaners;
      }
    },
    /**
     * Registers a callback that runs when the current effect is detached from this signal.
     *
     * Must be called from within an active effect, after the signal has been read at least once
     * in that effect (via `get()`); otherwise it throws.
     *
     * Intended for harmless side effects (e.g. debug logging), not cleanup work
     * such as closing connections or releasing resources.
     */
    onDetach: (fn: () => void) => {
      const { id } = sc.currentEffect;
      if (!id) {
        throw new Error("onDetach must be called from within an effect");
      }
      if (!signal.effects.has(id)) {
        throw new Error(
          "onDetach must be called after reading the signal (get()) within the same effect",
        );
      }
      if (!signal.onDetaches.has(id)) {
        signal.onDetaches.set(id, []);
      }
      signal.onDetaches.get(id)!.push(fn);
    },
  };
};

const createEffects = (sc: Scope) => {
  const effects = {
    id: genId(),
    signalCleaners: new Map<string, (effectsId: string) => void>(),
  };

  return {
    /**
     * Runs `fn` and re-runs it whenever any signal it reads changes.
     *
     * Intended for harmless side effects (e.g. updating the UI), not for
     * setting up resources like database connections or file handles.
     */
    effect: (fn: () => void) => {
      const prevEffect = { ...sc.currentEffect };
      const prevCleaners = sc.cleaners;
      try {
        const id = genId();
        sc.currentEffect = { id, fn, effectsId: effects.id };
        sc.cleaners = effects.signalCleaners;
        fn();
      } finally {
        sc.currentEffect = prevEffect;
        sc.cleaners = prevCleaners;
      }
    },
    clean: () => {
      for (const [, cleanerFn] of effects.signalCleaners) {
        cleanerFn(effects.id);
      }
    },
  };
};

let _id = 0;
const genId = () => (++_id).toString();
