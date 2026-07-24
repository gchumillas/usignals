import "./style.css";
import { signal, effect, domdiff } from "@gchumillas/usignals";
import { openDb, fetchIngredients, type Ingredient } from "./db";
import { ctx } from "./context";
import { Row } from "./row";

function Main() {
  const rows = signal<Ingredient[]>([]);

  openDb()
    .then((db) => fetchIngredients(db))
    .then((items) => rows.set(items))
    .catch((err) => console.error("Failed to load ingredients", err));

  const handleAddRow = (id: number) => {
    const items = [...rows.get()];
    const pos = items.findIndex((x) => x.id == id);
    if (pos > -1) {
      items.splice(pos + 1, 0, {
        id: +new Date(),
        name: "",
        kcal100g: 0,
        total: 0,
      });
      rows.set(items);
    }
  };

  const handleDeleteRow = (id: number) => {
    rows.set(rows.get().filter((row) => row.id != id));
  };

  const tbodyNode = <tbody />;
  effect(() =>
    domdiff(
      tbodyNode,
      rows.get(),
      ctx.with({ handleAddRow, handleDeleteRow }, Row),
    ),
  );

  return (
    <div class="container my-10 mx-auto max-w-2xl">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>kcal / 100g</th>
            <th>grams</th>
            <th>Total (kcal)</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        {tbodyNode}
      </table>
    </div>
  );
}

export { Main };
