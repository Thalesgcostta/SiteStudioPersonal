import { createContext, useContext } from "react";
import type { Store } from "./data";
import type { StudioAction } from "./lib/actions";
import type { DisplayScale } from "./lib/useDisplaySettings";
export type ModalRequest = {
  type:
    | "student"
    | "payment"
    | "evaluation"
    | "appointment"
    | "movement"
    | "product"
    | "confirm";
  studentId?: string;
  productId?: string;
  title?: string;
  message?: string;
  onConfirm?: () => void | Promise<void>;
};
export type StudioContext = {
  store: Store;
  execute: (action: StudioAction) => Promise<Store>;
  saving: boolean;
  mode: string;
  displayScale: DisplayScale;
  setDisplayScale: (scale: DisplayScale) => void;
  displayStorageError: boolean;
  reload: () => Promise<void>;
  month: string;
  setMonth: (m: string) => void;
  search: string;
  route: string;
  go: (page: string) => void;
  open: (m: ModalRequest) => void;
  notify: (message: string) => void;
};
export const Context = createContext<StudioContext | null>(null);
export const useStudio = () => {
  const value = useContext(Context);
  if (!value) throw new Error("Contexto indisponível");
  return value;
};
