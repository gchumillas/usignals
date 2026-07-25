# µSignals (`@gchumillas/usignals`)

A tiny (~1KB zipped), dependency-free reactive signals library for JavaScript/TypeScript.

## Installation

```bash
npm install @gchumillas/usignals
```

## Usage

```ts
import { signal, effect } from "@gchumillas/usignals";

const width = signal(5);
const height = signal(7);

// The effect runs the first time and
// re-executes every time a signal changes.
effect(() => {
  console.log(`area = ${width.get() * height.get()}`);
});

width.set(10); // logs: area = 70
```

> [!NOTE]
> See this [full example](./example) for more use cases.

## API

### `signal(initVal)`

Declares a reactive value or "signal"

Signals can trigger "effects". If a signal has been used within
an effect and its value has been read, then the effect re-executes
every time the signal changes.

### `effect(fn)`

Declares an "effect".

The effect runs the first time and re-executes every time
a read signal changes. This allows us, primarily, to update
the interface with the new signal values.

### `domdiff(parentNode, rows, insert)`

Efficiently updates a list of elements, freeing memory from
effects whose elements have been detached from the document.

### `createContext()`

Creates a context channel.

> [!NOTE]
> More detailed information in the [source code](./src) itself.

## Development

```bash
npm install     # install dependencies
npm test        # run tests
npm run build   # build dist/ (ESM + CJS + types)
```
