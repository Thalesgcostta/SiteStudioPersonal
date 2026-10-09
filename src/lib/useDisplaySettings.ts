import { useEffect, useState } from "react";

export const displaySizes = [
  { value: 1, label: "Padrão · 100%" },
  { value: 1.1, label: "Maior · 110%" },
  { value: 1.25, label: "Grande · 125%" },
  { value: 1.5, label: "Extra grande · 150%" },
] as const;
export type DisplayScale = (typeof displaySizes)[number]["value"];
const storageKey = "katielle-studio-display-scale-v1";
function initialScale(): DisplayScale {
  try {
    const value = Number(localStorage.getItem(storageKey));
    if (displaySizes.some((size) => size.value === value))
      return value as DisplayScale;
  } catch {
    /* A preferência ainda pode ser usada nesta sessão. */
  }
  return 1;
}

export function useDisplaySettings() {
  const [scale, setScale] = useState<DisplayScale>(initialScale);
  const [width, setWidth] = useState(window.innerWidth);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const resize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(scale));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [scale]);
  // Celulares mantêm seu layout. No computador, os pontos de adaptação
  // acompanham o espaço disponível depois de ampliar a interface.
  const activeScale = width <= 760 ? 1 : scale;
  const availableWidth = width / activeScale;
  return { scale, setScale, activeScale, availableWidth, storageError };
}
