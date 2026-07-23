import { createContext } from "@gchumillas/usignals";

export const ctx = createContext<{
  handleAddRow: (id: number) => void;
  handleDeleteRow: (id: number) => void;
}>();
