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
  const signal = {
    id: genId(),
    val,
    effects: new Map(),
  };

  function cleaner(effectsId: string) {
    for (const [id, effect] of signal.effects) {
      if (effectsId === effect.effectsId) {
        signal.effects.delete(id);
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
  };
};

const createEffects = (sc: Scope) => {
  const effects = {
    id: genId(),
    signalCleaners: new Map<string, (effectsId: string) => void>(),
  };

  return {
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
