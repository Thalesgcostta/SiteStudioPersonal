import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  Users,
  Wallet,
  X,
  Activity,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Avatar, Brand, MonthSelect } from "./components";
import { Context } from "./context";
import type { ModalRequest } from "./context";
import { billStatus, normalize, currentMonth } from "./data";
import { useStudioData } from "./lib/useStudioData";
import { useDisplaySettings } from "./lib/useDisplaySettings";
import { AuthGate } from "./AuthGate";
import { ModalHost } from "./forms";
import {
  Dashboard,
  Schedule,
  StudentProfile,
  Students,
} from "./pages/Overview";
import { Finance, Payments } from "./pages/Payments";
import { Products } from "./pages/Products";
import { Health } from "./pages/Health";
import { Settings } from "./pages/Settings";
const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "alunos", label: "Alunos", icon: Users },
  { id: "agenda", label: "Agenda e horários", icon: CalendarDays },
  { id: "bioimpedancia", label: "Bioimpedância", icon: Activity },
  { id: "mensalidades", label: "Mensalidades", icon: Wallet },
  { id: "produtos", label: "Vendas de produtos", icon: ShoppingBag },
  { id: "financeiro", label: "Financeiro", icon: ChartNoAxesCombined },
  { id: "configuracoes", label: "Configurações", icon: SettingsIcon },
];
const routeNow = () => window.location.hash.slice(1) || "dashboard";
export default function App() {
  const data = useStudioData();
  const display = useDisplaySettings();
  const account = data.session?.user;
  const rawName =
    account?.user_metadata?.full_name ||
    account?.user_metadata?.name ||
    account?.user_metadata?.display_name;
  const name =
    typeof rawName === "string" && rawName.trim()
      ? rawName.trim()
      : account?.email
          ?.split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\p{L}/gu, (c) => c.toUpperCase()) || "Administrador";
  const user =
    data.mode === "demo"
      ? {
          id: "demo",
          name: "Katielle Faleiros",
          firstName: "Katielle",
          email: "demo@studio.exemplo",
        }
      : {
          id: account?.id || "",
          name,
          firstName: name.split(" ")[0],
          email: account?.email || "",
        };
  const {
    store,
    execute,
    saving,
    mode,
    reload,
    logout,
    session,
    loading,
    authLoading,
    error,
    configError,
    recovery,
    setRecovery,
    storageError,
  } = data;
  const [month, setMonth] = useState(currentMonth);
  const [route, setRoute] = useState(routeNow);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalRequest | null>(null);
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);
  const [popover, setPopover] = useState("");
  useEffect(() => {
    if (mode !== "supabase") return;
    setModal(null);
    setToast("");
    setSearch("");
    setPopover("");
    setMobile(false);
    setMonth(currentMonth);
  }, [session?.user.id, mode]);
  const section = route.split("/")[0];
  const page = nav.find((n) => n.id === section) || nav[0];

  const narrow = display.availableWidth <= 760;
  useEffect(() => {
    if (!narrow) setMobile(false);
  }, [narrow]);
  useEffect(() => {
    const fn = () => {
      setRoute(routeNow());
      setSearch("");
      setMobile(false);
      setPopover("");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!popover && !mobile) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPopover("");
        setMobile(false);
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [popover, mobile]);
  const go = useCallback((p: string) => {
    window.location.hash = p;
    setMobile(false);
    setPopover("");
  }, []);
  const close = useCallback(() => {
    if (!saving) setModal(null);
  }, [saving]);
  const open = useCallback((m: ModalRequest) => {
    setModal(m);
    setPopover("");
    setMobile(false);
  }, []);
  const notify = useCallback((m: string) => setToast(m), []);
  const overdue = store.bills.filter(
    (b) => b.month === month && billStatus(b) === "Vencido",
  ).length;
  const lowstock = store.products.filter((p) => p.stock <= 3).length;
  const style = {
    "--brand-orange": store.settings.orange,
    "--brand-blue": store.settings.blue,
    "--ui-scale": display.activeScale,
    "--sidebar-width": `${narrow ? 242 : display.availableWidth >= 1550 ? 258 : display.availableWidth <= 1270 ? 216 : 242}px`,
  } as CSSProperties;
  if (configError) return <AuthGate error={configError} />;
  if (mode === "supabase") {
    if (authLoading) return <AuthGate loading />;
    if (recovery && session)
      return <AuthGate recovery onRecovered={() => setRecovery(false)} />;
    if (!session) return <AuthGate />;
    if (loading) return <AuthGate loading />;
    if (error)
      return (
        <AuthGate
          error={error}
          onRetry={() => void reload()}
          onLogout={() => void logout()}
        />
      );
  }
  return (
    <Context.Provider
      value={{
        store,
        execute,
        saving,
        mode,
        user,
        displayScale: display.scale,
        setDisplayScale: display.setScale,
        displayStorageError: display.storageError,
        reload,
        month,
        setMonth,
        search,
        route,
        go,
        open,
        notify,
      }}
    >
      <div
        className="app"
        style={style}
        data-wide={display.availableWidth >= 1550}
        data-compact={display.availableWidth <= 1270}
        data-tablet={display.availableWidth <= 1000}
        data-mobile={narrow}
        data-small={display.availableWidth <= 380}
      >
        <a
          className="skip-link"
          href="#conteudo"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("conteudo")?.focus();
          }}
        >
          Ir para o conteúdo
        </a>
        {mobile && (
          <button
            className="sidebar-overlay"
            aria-label="Fechar navegação"
            onClick={() => setMobile(false)}
          />
        )}
        <aside
          id="studio-menu"
          inert={narrow && !mobile}
          className={`sidebar ${mobile ? "is-open" : ""}`}
        >
          <div className="sidebar-brand">
            {store.settings.logo === "/logo.svg" ? (
              <Brand />
            ) : (
              <div className="custom-brand">
                <img
                  src={store.settings.logo}
                  alt={`Logo ${store.settings.name}`}
                />
                <strong>{store.settings.name}</strong>
              </div>
            )}
            <button
              className="mobile-close icon-button"
              onClick={() => setMobile(false)}
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>
          <div className="studio-tag">
            <span className="live-dot" />
            GESTÃO DO STUDIO
          </div>
          <div className="nav-caption">PRINCIPAL</div>
          <nav aria-label="Menu principal">
            {nav.map((n, i) => (
              <button
                key={n.id}
                aria-label={n.label}
                className={`nav-item ${page.id === n.id ? "active" : ""} ${i === 7 ? "settings-item" : ""}`}
                onClick={() => go(n.id)}
                aria-current={page.id === n.id ? "page" : undefined}
              >
                <n.icon size={19} />
                <span>{n.label}</span>
                {n.id === "mensalidades" && overdue > 0 && (
                  <b className="nav-count" aria-hidden="true">
                    {overdue}
                  </b>
                )}
                {page.id === n.id && <span className="nav-active-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="care-card">
              <span className="care-icon">
                <Activity size={19} />
              </span>
              <h3>Cuidar é o que nos move.</h3>
              <p>
                Há mais de 15 anos transformando vidas através da musculação.
              </p>
              <div className="care-line" />
            </div>
            <div className="private-label">
              <LockKeyhole size={13} />
              Área administrativa privada
            </div>
            <div className="sidebar-user">
              <Avatar name={user.name} />
              <div>
                <strong>{user.name}</strong>
                <span>Administrador(a)</span>
              </div>
              <button
                className="icon-button"
                aria-label="Configurações do studio"
                onClick={() => go("configuracoes")}
              >
                <SettingsIcon size={17} />
              </button>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="topbar-title">
              <button
                className="icon-button menu-toggle"
                aria-label="Abrir menu"
                aria-controls="studio-menu"
                aria-expanded={mobile}
                onClick={() => setMobile(!mobile)}
              >
                <Menu size={21} />
              </button>
              <span>Studio</span>
              <span className="breadcrumb-slash">/</span>
              <strong>{page.label}</strong>
            </div>
            <div className="topbar-actions">
              <label className="global-search">
                <Search size={16} />
                <input
                  aria-label={`Busca em ${page.label}`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    section === "dashboard"
                      ? "Buscar no studio..."
                      : `Buscar em ${page.label.toLowerCase()}...`
                  }
                  disabled={section === "configuracoes" || route.includes("/")}
                />
                <kbd>⌕</kbd>
              </label>
              <div className="popover-anchor">
                <button
                  className="icon-button notifications"
                  aria-label="Notificações"
                  aria-expanded={popover === "notifications"}
                  onClick={() =>
                    setPopover(
                      popover === "notifications" ? "" : "notifications",
                    )
                  }
                >
                  <Bell size={19} />
                  {overdue + lowstock > 0 && <i />}
                </button>
                {popover === "notifications" && (
                  <div className="popover notification-popover">
                    <h3>Um olhar para o studio</h3>
                    <button onClick={() => go("mensalidades")}>
                      <Wallet size={17} />
                      <span>
                        <strong>{overdue} mensalidades vencidas</strong>
                        <small>Acompanhe os pagamentos em aberto.</small>
                      </span>
                      <ArrowRight size={14} />
                    </button>
                    <button onClick={() => go("produtos")}>
                      <ShoppingBag size={17} />
                      <span>
                        <strong>{lowstock} produtos com estoque baixo</strong>
                        <small>Consulte o catálogo de produtos.</small>
                      </span>
                      <ArrowRight size={14} />
                    </button>
                    <p>
                      {mode === "demo"
                        ? "Notificações demonstrativas"
                        : "Notificações do studio"}
                    </p>
                  </div>
                )}
              </div>
              <span className="topbar-divider" />
              <div className="popover-anchor">
                <button
                  className="user-button"
                  aria-label="Menu do usuário"
                  aria-expanded={popover === "user"}
                  onClick={() => setPopover(popover === "user" ? "" : "user")}
                >
                  <Avatar name={user.name} size="small" />
                  <span>{user.firstName}</span>
                  <ChevronDown size={13} />
                </button>
                {popover === "user" && (
                  <div className="popover user-popover">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <button onClick={() => go("configuracoes")}>
                      <SettingsIcon size={16} />
                      Dados do studio
                    </button>
                    <button
                      onClick={() => {
                        setPopover("");
                        notify(
                          mode === "demo"
                            ? "Protótipo com dados fictícios, armazenados apenas neste navegador."
                            : "Dados armazenados no Supabase. Acesso restrito a administradores autorizados.",
                        );
                      }}
                    >
                      <CircleHelp size={16} />
                      {mode === "demo"
                        ? "Sobre a demonstração"
                        : "Sobre o sistema"}
                    </button>
                    {mode === "supabase" && (
                      <>
                        <button disabled={saving} onClick={() => void reload()}>
                          <RefreshCw size={16} />
                          Atualizar dados
                        </button>
                        <button disabled={saving} onClick={() => void logout()}>
                          <LogOut size={16} />
                          Sair da conta
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>
          {[
            "produtos",
            "bioimpedancia",
            "alunos",
            "agenda",
            "configuracoes",
          ].includes(section) &&
            section === "produtos" && (
              <div className="context-month">
                <span>Competência de consulta</span>
                <MonthSelect />
              </div>
            )}
          <main
            id="conteudo"
            tabIndex={-1}
            className="main-content"
            key={route}
          >
            {mode === "supabase" && store.schemaVersion < 3 && (
              <div className="storage-notice" role="status">
                Atualização do banco pendente: execute
                202610140003_studio_management.sql no SQL Editor do Supabase
                para liberar as novas configurações, cobranças de exames e
                fotos. Os registros e os fluxos existentes continuam
                disponíveis.
              </div>
            )}
            {storageError && (
              <div className="storage-notice">
                O navegador não permitiu salvar os dados. As alterações
                continuarão disponíveis nesta sessão.
              </div>
            )}
            {section === "dashboard" && search && (
              <section className="panel global-results">
                <h2>Resultados da busca</h2>
                {store.students
                  .filter((s) => normalize(s.name).includes(normalize(search)))
                  .map((s) => (
                    <button key={s.id} onClick={() => go(`alunos/${s.id}`)}>
                      <Users size={16} />
                      {s.name}
                      <ArrowRight size={15} />
                    </button>
                  ))}
                {store.products
                  .filter((p) => normalize(p.name).includes(normalize(search)))
                  .map((p) => (
                    <button key={p.id} onClick={() => go("produtos")}>
                      <ShoppingBag size={16} />
                      {p.name}
                      <ArrowRight size={15} />
                    </button>
                  ))}
                {!store.students.some((s) =>
                  normalize(s.name).includes(normalize(search)),
                ) &&
                  !store.products.some((p) =>
                    normalize(p.name).includes(normalize(search)),
                  ) && <p>Nenhum aluno ou produto encontrado.</p>}
              </section>
            )}
            {section === "dashboard" ? (
              <Dashboard />
            ) : section === "alunos" ? (
              route.includes("/") ? (
                <StudentProfile id={route.split("/")[1]} />
              ) : (
                <Students />
              )
            ) : section === "agenda" ? (
              <Schedule />
            ) : section === "bioimpedancia" ? (
              <Health />
            ) : section === "mensalidades" ? (
              <Payments />
            ) : section === "produtos" ? (
              <Products />
            ) : section === "financeiro" ? (
              <Finance />
            ) : section === "configuracoes" ? (
              <Settings />
            ) : (
              <Dashboard />
            )}
          </main>
          <footer className="app-footer">
            <span>
              © {new Date().getFullYear()} {store.settings.name}
            </span>
            <span>
              <span className="demo-dot" />
              {mode === "demo"
                ? "Demonstração · dados fictícios"
                : "Gestão administrativa · dados no Supabase"}
            </span>
          </footer>
        </div>
        {saving && (
          <div className="saving-indicator" role="status">
            Salvando no {mode === "demo" ? "navegador" : "banco"}…
          </div>
        )}
        {modal && <ModalHost request={modal} onClose={close} />}
        <div
          className={`toast ${toast ? "visible" : ""}`}
          role="status"
          aria-live="polite"
        >
          {toast && (
            <>
              <CheckCircle2 size={20} />
              <span>{toast}</span>
              <button
                className="icon-button"
                aria-label="Fechar mensagem"
                onClick={() => setToast("")}
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </Context.Provider>
  );
}
