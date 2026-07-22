type Effect = {
  id: string;
  fn?: () => void;
  effectsId: string;
};

type Context = {
  currentEffect: Effect;
  cleaners: Map<string, (effectsId: string) => void>;
};

export const createContext = () => {
  const ctx: Context = {
    currentEffect: {
      id: "",
      fn: undefined,
      effectsId: "",
    },
    cleaners: new Map(),
  };

  return {
    signal: <T>(val: T) => createSignal(ctx, val),
    effects: () => createEffects(ctx),
  };
};

const createSignal = <T>(ctx: Context, val: T) => {
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
      const { id, fn, effectsId } = ctx.currentEffect;
      if (id) {
        const cleaners = ctx.cleaners;
        signal.effects.set(id, { fn, effectsId, cleaners });
        cleaners.set(signal.id, cleaner);
      }
      return signal.val;
    },
    set: (val: T) => {
      signal.val = val;
      const prevEffect = { ...ctx.currentEffect };
      const prevCleaners = ctx.cleaners;
      try {
        for (const [id, effect] of signal.effects) {
          const { fn, effectsId, cleaners } = effect;
          ctx.currentEffect = { id, fn, effectsId };
          ctx.cleaners = cleaners ?? prevCleaners;
          fn?.();
        }
      } finally {
        ctx.currentEffect = prevEffect;
        ctx.cleaners = prevCleaners;
      }
    },
  };
};

const createEffects = (ctx: Context) => {
  const effects = {
    id: genId(),
    signalCleaners: new Map<string, (effectsId: string) => void>(),
  };

  return {
    effect: (fn: () => void) => {
      const prevEffect = { ...ctx.currentEffect };
      const prevCleaners = ctx.cleaners;
      try {
        const id = genId();
        ctx.currentEffect = { id, fn, effectsId: effects.id };
        ctx.cleaners = effects.signalCleaners;
        fn();
      } finally {
        ctx.currentEffect = prevEffect;
        ctx.cleaners = prevCleaners;
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
