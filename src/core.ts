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

/**
 * Creates an isolated context that holds its own signals and effects.
 */
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
    /**
     * Declares a reactive value or "signal".
     *
     * Signals can trigger "effects". If a signal has been used within
     * an effect and its value has been read, then the effect re-executes
     * every time the signal changes.
     */
    signal: <T>(val: T) => createSignal(sc, val),
    /**
     * Creates a group of "effects".
     *
     * Effects perform "side tasks", such as updating an interface.
     * They are grouped so they can be cleaned up together.
     */
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
     * const sc = createScope()
     * const total = sc.signal(0)
     * const efs = sc.effects()
     * efs.effect(() => {
     *   if (neverCondition) {
     *     // the effect does not re-execute when the signal changes
     *     total.get()
     *   }
     * })
     * ```
     *
     * In the example above, it would be appropriate to move `total` outside
     * the conditional, so that its value can be read at least once.
     */
    effect: (
      fn: () => void,
      _onDetachFromSignal?: (s: Signal<any>) => void, // for internal-only (mainly testing)
    ) => {
      const prevEffect = { ...sc.currentEffect };
      const prevCleaners = sc.cleaners;
      try {
        const id = genId();
        sc.currentEffect = {
          id,
          fn,
          onDetachFromSignal: _onDetachFromSignal,
          effectsId: effects.id,
        };
        sc.cleaners = effects.signalCleaners;
        fn();
      } finally {
        sc.currentEffect = prevEffect;
        sc.cleaners = prevCleaners;
      }
    },
    /**
     * Creates a nested effects group.
     *
     * This allows cleaning up groups recursively. When the parent group
     * is cleaned, nested effects are also cleaned, which allows
     * efficient memory release.
     */
    effects: () => {
      const child = createEffects(sc);
      effects.children.add(child);
      const origClean = child.clean.bind(child);
      child.clean = () => {
        effects.children.delete(child);
        origClean();
      };
      return child;
    },
    /**
     * Cleans up memory reserved by effects and nested effects.
     *
     * Memory reserved by effects is released and they stop being
     * operational. That is, effects no longer re-execute when their
     * signals change.
     *
     * ```js
     * const sc = createScope()
     * const total = sc.signal(0)
     * const efs = sc.effects()
     * efs.effect(() => {
     *   // the first time it displays the value of `total`
     *   console.log(total.get())
     * })
     * efs.clean()
     * total.set(100) // the previous effect does not re-execute
     * ```
     *
     * It is important to release memory from effects we are not going to use
     * to avoid memory leaks.
     */
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
