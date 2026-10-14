import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { seed, upgradeStore } from "../data";
import type { Store } from "../data";
import { applyDemoAction, assertStore, emptyStore } from "./actions";
import type { StudioAction } from "./actions";
import { applyRemoteAction, loadRemoteStore } from "./repository";
import { configError, dataMode, initialRecovery, supabase } from "./supabase";
const storageKey = "katielle-studio-demo-v1";
function loadDemo() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const s: unknown = JSON.parse(raw);
      assertStore(s);
      return upgradeStore(s);
    }
  } catch {
    /* Somente exemplos locais. */
  }
  return seed();
}
export function useStudioData() {
  const [store, setStore] = useState<Store>(() =>
    dataMode === "demo" ? loadDemo() : emptyStore(),
  );
  const ref = useRef(store);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(dataMode === "supabase");
  const [loading, setLoading] = useState(dataMode === "supabase");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [recovery, setRecovery] = useState(initialRecovery);
  const generation = useRef(0);
  const sessionUser = useRef<string | null>(null);
  const userId = session?.user.id;
  const assign = useCallback((s: Store) => {
    ref.current = s;
    setStore(s);
  }, []);
  useEffect(() => {
    if (dataMode !== "demo") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(store));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [store]);
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      setLoading(false);
      return;
    }
    let active = true;
    let observedEvent = false;
    const accept = (next: Session | null) => {
      if (!active) return;
      if (sessionUser.current !== (next?.user.id || null)) {
        generation.current++;
        assign(emptyStore());
        setError("");
        setLoading(!!next);
        sessionUser.current = next?.user.id || null;
      }
      setSession(next);
      setAuthLoading(false);
      if (!next) {
        setLoading(false);
        setRecovery(false);
      }
    };
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      observedEvent = true;
      accept(next);
      if (active && event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || observedEvent) return;
      if (error)
        setError("Não foi possível recuperar a sessão. Entre novamente.");
      accept(data.session);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [assign]);
  const reload = useCallback(async () => {
    if (!supabase || !userId || busy.current) return;
    const g = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const s = await loadRemoteStore();
      if (g === generation.current) assign(s);
    } catch (e) {
      if (g === generation.current)
        setError(
          e instanceof Error ? e.message : "Não foi possível carregar o banco.",
        );
    } finally {
      if (g === generation.current) setLoading(false);
    }
  }, [userId, assign]);
  useEffect(() => {
    if (userId) void reload();
  }, [userId, reload]);
  const execute = useCallback(
    async (action: StudioAction) => {
      if (busy.current)
        throw new Error("Aguarde a conclusão da operação em andamento.");
      if (dataMode !== "demo" && (!session || loading || error || configError))
        throw new Error("Entre e carregue os dados antes de salvar.");
      busy.current = true;
      setSaving(true);
      const g = ++generation.current;
      try {
        const s =
          dataMode === "demo"
            ? applyDemoAction(ref.current, action)
            : await applyRemoteAction(action);
        if (g !== generation.current)
          throw new Error(
            "A sessão mudou durante a gravação. Entre novamente e confira o resultado no banco.",
          );
        assign(s);
        return s;
      } catch (e) {
        throw e instanceof Error ? e : new Error("Não foi possível salvar.");
      } finally {
        busy.current = false;
        setSaving(false);
      }
    },
    [session, loading, error, assign],
  );
  const logout = useCallback(async () => {
    generation.current++;
    assign(emptyStore());
    setSession(null);
    setRecovery(false);
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error)
        setError(
          "Não foi possível concluir a saída. Recarregue e tente novamente.",
        );
    }
  }, [assign]);
  return {
    store,
    execute,
    reload,
    logout,
    session,
    authLoading,
    loading,
    saving,
    error,
    storageError,
    recovery,
    setRecovery,
    mode: dataMode,
    configError,
  };
}
