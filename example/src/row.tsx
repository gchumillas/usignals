import { signal, Render } from "@gchumillas/usignals";
import { type Ingredient } from "./db";
import { ctx } from "./context";

export const Row = (row: Ingredient) => {
  const { handleAddRow, handleDeleteRow } = ctx.use();
  const kcal100g = signal(+row.kcal100g);
  const total = signal(+row.total);

  const handleChangeKcal100g = (e: TargetEvent<HTMLInputElement>) => {
    const val = parseFloat(e.currentTarget?.value) || 0;
    kcal100g.set(val);
  };

  const handleChangeTotal = (e: TargetEvent<HTMLInputElement>) => {
    const val = parseFloat(e.currentTarget.value) || 0;
    total.set(val);
  };

  return (
    <tr data-id={row.id}>
      <td>
        <input
          type="text"
          placeholder="Ingredient"
          value={row.name}
          class="input"
        />
      </td>
      <td>
        <input
          type="number"
          placeholder="kcal/100 gr"
          value={row.kcal100g}
          onInput={handleChangeKcal100g}
          class="input"
        />
      </td>
      <td>
        <input
          type="number"
          placeholder="total gr"
          value={row.total}
          onInput={handleChangeTotal}
          class="input"
        />
      </td>
      <td class="text-center">
        <span class="text-sm">
          {Render(() => ((kcal100g.get() * total.get()) / 100).toFixed(2))}
        </span>
      </td>
      <td class="text-right">
        <div class="inline-flex gap-1.5">
          <button
            type="button"
            onClick={() => handleAddRow(row.id)}
            class="btn"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => handleDeleteRow(row.id)}
            class="btn"
          >
            -
          </button>
        </div>
      </td>
    </tr>
  );
};
