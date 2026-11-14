import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { Monitor, Smartphone } from "lucide-react";

type Preference = "compact" | "full";
type Presentation = {
  compact: boolean;
  smartphone: boolean;
  choose: (preference: Preference) => void;
};
const storageKey = "kf-site-presentation";
const Context = createContext<Presentation | null>(null);
function savedPreference(): Preference {
  try { return localStorage.getItem(storageKey) === "full" ? "full" : "compact"; }
  catch { return "compact"; }
}

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Preference>(savedPreference);
  const [smartphone, setSmartphone] = useState(() => matchMedia("(max-width: 767px)").matches);
  const compact = smartphone && preference === "compact";
  useEffect(() => {
    const media = matchMedia("(max-width: 767px)");
    const resize = () => setSmartphone(media.matches);
    media.addEventListener("change", resize);
    resize();
    const storage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setPreference(savedPreference());
    };
    window.addEventListener("storage", storage);
    return () => { media.removeEventListener("change", resize); window.removeEventListener("storage", storage); };
  }, []);
  useLayoutEffect(() => {
    document.documentElement.dataset.presentation = compact ? "compact" : "full";
    return () => { delete document.documentElement.dataset.presentation; };
  }, [compact]);
  const choose = (value: Preference) => {
    setPreference(value);
    try { localStorage.setItem(storageKey, value); } catch { /* A troca continua funcionando nesta visita. */ }
  };
  return <Context.Provider value={{ compact, smartphone, choose }}>{children}</Context.Provider>;
}

export function usePresentation() {
  const value = useContext(Context);
  if (!value) throw new Error("PresentationProvider ausente");
  return value;
}

export function PresentationSwitch({ placement = "top" }: { placement?: "top" | "footer" }) {
  const { compact, smartphone, choose } = usePresentation();
  if (!smartphone) return null;
  const description = `presentation-description-${placement}`;
  return (
    <aside className={`container presentation-switch presentation-switch-${placement}`}
      aria-label={placement === "top" ? "Visualização do site" : "Visualização do site no rodapé"}>
      <div>
        <span className="presentation-label">{compact ? "ESSENCIAL. DO SEU JEITO." : "CADA DETALHE DO STUDIO."}</span>
        <p id={description}>{compact ? "Uma versão leve para o celular." : "Conteúdo de desktop, ajustado à sua tela."}</p>
      </div>
      <button type="button" onClick={() => choose(compact ? "full" : "compact")}
        aria-describedby={description} aria-controls="conteudo">
        {compact ? <Monitor size={16} aria-hidden="true" /> : <Smartphone size={16} aria-hidden="true" />}
        {compact ? "Ver versão desktop" : "Voltar à versão celular"}
      </button>
    </aside>
  );
}
