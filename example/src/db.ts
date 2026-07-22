export type Ingredient = {
  id: number;
  name: string;
  kcal100g: number;
  total: number;
};

export async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open("Calory", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      const os = db.createObjectStore("ingredients", { keyPath: "id" });
      os.transaction.oncomplete = () => {
        const os = db
          .transaction(["ingredients"], "readwrite")
          .objectStore("ingredients");
        os.add({ id: 0, name: "Bread Roll", kcal100g: 265, total: 80 });
        os.add({ id: 1, name: "Cured Ham", kcal100g: 259.1, total: 28 });
        os.add({ id: 2, name: "Butter", kcal100g: 743, total: 25 });
        os.add({ id: 3, name: "Tomato", kcal100g: 18, total: 50 });
        os.add({ id: 4, name: "Coffee with milk", kcal100g: 115, total: 100 });
      };
    };
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = (e) => {
      reject(e);
    };
  });
}

export async function fetchIngredients(db: IDBDatabase): Promise<Ingredient[]> {
  return new Promise((resolve, reject) => {
    const os = db
      .transaction(["ingredients"], "readonly")
      .objectStore("ingredients");
    const req = os.getAll();
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = (e) => {
      reject(e);
    };
  });
}
