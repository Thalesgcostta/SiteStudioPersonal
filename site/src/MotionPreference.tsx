import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

const query = "(prefers-reduced-motion: reduce)";
const storageKey = "kf-allow-motion";
const subscribe = (listener: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
const snapshot = () => window.matchMedia(query).matches;
const MotionPreference = createContext<{
  reduced: boolean;
  enableMotion: () => void;
} | null>(null);

/** Respect the system initially; a deliberate play action enables motion across the site. */
export function MotionPreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const systemReduced = useSyncExternalStore(subscribe, snapshot, () => true);
  const [allowed, setAllowed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });
  const reduced = systemReduced && !allowed;
  useLayoutEffect(() => {
    document.documentElement.dataset.motionPreference = reduced
      ? "reduced"
      : "enabled";
  }, [reduced]);
  const enableMotion = () => {
    setAllowed(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      /* This visit still keeps the choice. */
    }
  };
  return (
    <MotionPreference.Provider value={{ reduced, enableMotion }}>
      {children}
    </MotionPreference.Provider>
  );
}
export function useMotionPreference() {
  const preference = useContext(MotionPreference);
  if (!preference) throw new Error("MotionPreferenceProvider is required.");
  return preference;
}
