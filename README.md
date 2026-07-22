# µSignals (`@gchumillas/usignals`)

A tiny, dependency-free reactive signals library for JavaScript/TypeScript.

## Installation

```bash
npm install @gchumillas/usignals
```

## Usage

```ts
import { createContext } from "@gchumillas/usignals";

const ctx = createContext();
const efs = ctx.effects();

const width = ctx.signal(5);
const height = ctx.signal(7);

efs.effect(() => {
  console.log(`area = ${width.get() * height.get()}`);
});

width.set(10); // logs: area = 70
```

## API

### `createContext()`

Creates an isolated context that holds its own signals and effects. Returns:

- `signal(initialValue)`: creates a reactive signal with `get()` and `set(value)` methods.
- `effects()`: creates an effect scope. Returns:
  - `effect(fn)`: runs `fn` immediately and re-runs it whenever any signal read inside it changes.
  - `clean()`: disposes all effects created in this scope, unsubscribing them from their signals.

## Development

```bash
npm install     # install dependencies
npm test        # run tests
npm run build   # build dist/ (ESM + CJS + types)
```

## License

MIT
