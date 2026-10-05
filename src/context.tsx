import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Store } from "./data";
export type ModalRequest = {
  type:
    | "student"
    | "payment"
    | "evaluation"
    | "appointment"
    | "movement"
    | "confirm";
  studentId?: string;
  title?: string;
  message?: string;
  onConfirm?: () => void;
};
export type StudioContext = {
  store: Store;
  setStore: Dispatch<SetStateAction<Store>>;
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
