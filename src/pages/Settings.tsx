import {
  Check,
  Clock3,
  ImagePlus,
  Palette,
  Monitor,
  UserRound,
  Tags,
  LayoutDashboard,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { PageIntro, Panel } from "../components";
import { useStudio } from "../context";
import { currency, methods } from "../data";
import { displaySizes } from "../lib/useDisplaySettings";
import type { DisplayScale } from "../lib/useDisplaySettings";
import {
  ProductCategories,
  DashboardSettings,
  UserProfile,
} from "./ManagementSettings";
export function Settings() {
  const {
    store,
    execute,
    saving,
    mode,
    notify,
    open,
    displayScale,
    setDisplayScale,
    displayStorageError,
  } = useStudio();
  const [form, setForm] = useState({ ...store.settings });
  const [error, setError] = useState("");
  const [tab, setTab] = useState("studio");
  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (tab === "dashboard") {
      try {
        const result = await execute({
          type: "save_dashboard",
          widgets: form.dashboardWidgets,
        });
        setForm(result.settings);
        setError("");
        notify("Seu Dashboard foi atualizado.");
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível salvar o Dashboard.",
        );
      }
      return;
    }
    if (
      !Number.isInteger(form.maxPerSlot) ||
      form.maxPerSlot < 1 ||
      form.maxPerSlot > 50 ||
      !Number.isFinite(form.evaluationPrice) ||
      form.evaluationPrice < 0
    ) {
      setError(
        "Informe capacidade de 1 a 50 alunos e um preço de exame válido.",
      );
      return;
    }
    if (form.close <= form.open) {
      setError("O horário de fechamento deve ser após a abertura.");
      return;
    }
    if (!form.methods.length) {
      setError("Selecione pelo menos uma forma de pagamento.");
      return;
    }
    if (form.planPrices.some((v) => !Number.isFinite(v) || v <= 0)) {
      setError("Todos os planos precisam de um valor maior que zero.");
      return;
    }
    try {
      await execute({ type: "save_settings", settings: form });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      return;
    }
    setError("");
    notify(
      mode === "demo"
        ? "Configurações salvas neste navegador."
        : "Configurações salvas no banco.",
    );
  };
  return (
    <>
      <PageIntro
        eyebrow="COM A CARA DO SEU STUDIO"
        title="Configurações"
        description="Os detalhes que tornam o atendimento seu."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Seções de configurações">
          {[
            { id: "studio", title: "Dados do studio", icon: ShieldCheck },
            { id: "identity", title: "Identidade visual", icon: Palette },
            { id: "plans", title: "Planos e valores", icon: ImagePlus },
            { id: "hours", title: "Horários e pagamentos", icon: Clock3 },
            { id: "display", title: "Tamanho da exibição", icon: Monitor },
            { id: "profile", title: "Meu perfil", icon: UserRound },
            { id: "categories", title: "Categorias de produtos", icon: Tags },
            { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
          ].map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={17} />
              {t.title}
            </button>
          ))}
        </nav>
        {tab === "profile" ? (
          <UserProfile />
        ) : tab === "display" ? (
          <Panel
            title="Tamanho da exibição"
            subtitle="Deixe textos, botões e formulários mais confortáveis no computador."
          >
            <div className="settings-fields display-settings">
              <label className="field" htmlFor="display-scale">
                Tamanho da interface
              </label>
              <select
                id="display-scale"
                value={displayScale}
                onChange={(e) =>
                  setDisplayScale(Number(e.target.value) as DisplayScale)
                }
                aria-describedby="display-help"
              >
                {displaySizes.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
              <p id="display-help" className="subtle-note">
                O ajuste é aplicado na hora e salvo neste navegador. No celular,
                o sistema mantém o tamanho padrão.
              </p>
              <div className="display-preview">
                <Monitor size={28} />
                <div>
                  <strong>Encontre o tamanho mais confortável</strong>
                  <p>
                    Experimente 125% para uma leitura maior ou 150% para ampliar
                    ainda mais.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDisplayScale(1)}
              >
                <RotateCcw size={16} />
                Voltar ao tamanho padrão
              </button>
              {displayStorageError && (
                <p className="form-error" role="alert">
                  O tamanho foi aplicado, mas o navegador não permitiu salvar a
                  preferência para a próxima visita.
                </p>
              )}
            </div>
          </Panel>
        ) : (
          <form onSubmit={save}>
            <Panel
              title={
                tab === "categories"
                  ? "Categorias de produtos"
                  : tab === "dashboard"
                    ? "Personalizar Dashboard"
                    : tab === "studio"
                      ? "Dados do studio"
                      : tab === "identity"
                        ? "Identidade visual"
                        : tab === "plans"
                          ? "Planos e valores"
                          : "Horários e pagamentos"
              }
              subtitle={
                mode === "demo"
                  ? "As alterações são demonstrativas e ficam apenas neste navegador."
                  : "Dados e preferências do studio armazenados no banco."
              }
            >
              {tab === "categories" ? (
                <ProductCategories value={form} onChange={setForm} />
              ) : tab === "dashboard" ? (
                <DashboardSettings value={form} onChange={setForm} />
              ) : tab === "studio" ? (
                <div className="form-grid settings-fields">
                  <label className="field span-2">
                    Nome do studio
                    <input
                      required
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                  </label>
                  <label className="field span-2">
                    Identificação profissional
                    <input
                      required
                      value={form.professional}
                      onChange={(e) => update("professional", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Telefone / WhatsApp
                    <input
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    E-mail
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </label>
                  <label className="field span-2">
                    Endereço
                    <input
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                    />
                  </label>
                  <div className="note-box span-2">
                    <b>Uma história de cuidado</b>
                    <p>
                      Há mais de 15 anos transformando vidas através da
                      musculação.
                    </p>
                  </div>
                </div>
              ) : tab === "identity" ? (
                <div className="settings-fields">
                  <div className="logo-preview">
                    <img src={form.logo} alt="Logo do studio" />
                  </div>
                  <label className="button secondary upload-logo">
                    <ImagePlus size={16} />
                    Carregar logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1500000) {
                          setError("Use uma imagem de até 1,5 MB.");
                          return;
                        }
                        if (!file.type.startsWith("image/")) {
                          setError("Selecione um arquivo de imagem.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          setForm((f) => ({
                            ...f,
                            logo: String(reader.result),
                          }));
                          setError("");
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <p className="subtle-note">
                    A marca mantém suas proporções. Fundo escuro para maior
                    fidelidade à referência.
                  </p>
                  <div className="identity-colors">
                    <label className="field">
                      Laranja da marca
                      <input
                        type="color"
                        value={form.orange}
                        onChange={(e) => update("orange", e.target.value)}
                      />
                      <span>{form.orange.toUpperCase()}</span>
                    </label>
                    <label className="field">
                      Azul da marca
                      <input
                        type="color"
                        value={form.blue}
                        onChange={(e) => update("blue", e.target.value)}
                      />
                      <span>{form.blue.toUpperCase()}</span>
                    </label>
                  </div>
                </div>
              ) : tab === "plans" ? (
                <div className="settings-fields">
                  <p className="subtle-note">
                    Valores mensais. Alterações serão usadas em novos cadastros;
                    cobranças já emitidas mantêm o valor original.
                  </p>
                  <div className="settings-plans">
                    {form.planPrices.map((v, i) => (
                      <label className="field" key={i}>
                        <strong>
                          {i + 1} {i === 0 ? "dia" : "dias"} por semana
                        </strong>
                        <div className="money-input">
                          <span>R$</span>
                          <input
                            aria-label={`Valor do plano de ${i + 1} dias`}
                            required
                            type="number"
                            step="0.01"
                            min="1"
                            value={v}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                planPrices: f.planPrices.map((p, j) =>
                                  i === j ? Number(e.target.value) : p,
                                ),
                              }))
                            }
                          />
                        </div>
                        <span className="muted">{currency(v)} / mês</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="settings-fields">
                  <div className="form-grid">
                    <label className="field">
                      Abertura
                      <input
                        required
                        type="time"
                        value={form.open}
                        onChange={(e) => update("open", e.target.value)}
                      />
                    </label>
                    <label className="field">
                      Fechamento
                      <input
                        required
                        type="time"
                        value={form.close}
                        onChange={(e) => update("close", e.target.value)}
                      />
                    </label>
                  </div>
                  <h3 className="form-section-title">
                    Formas de pagamento aceitas
                  </h3>
                  <div className="form-grid">
                    <label className="field">
                      Máximo de alunos por horário
                      <input
                        required
                        type="number"
                        min={1}
                        max={50}
                        step={1}
                        value={form.maxPerSlot}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            maxPerSlot: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      Valor da bioimpedância (R$)
                      <input
                        required
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.evaluationPrice}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            evaluationPrice: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                  </div>
                  <p className="subtle-note">
                    O preço vale para novos exames. Horários que já excedem a
                    capacidade permanecem visíveis; novos encaixes respeitam o
                    limite.
                  </p>
                  <div className="payment-methods-settings">
                    {methods.map((m) => (
                      <label key={m}>
                        <input
                          type="checkbox"
                          checked={form.methods.includes(m)}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              methods: e.target.checked
                                ? [...f.methods, m]
                                : f.methods.filter((a) => a !== m),
                            }))
                          }
                        />
                        {m}
                      </label>
                    ))}
                  </div>
                  <p className="subtle-note">Horários de segunda a sábado.</p>
                </div>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="settings-save">
                <button
                  className="button primary"
                  disabled={
                    saving || (mode === "supabase" && store.schemaVersion < 3)
                  }
                  type="submit"
                >
                  <Check size={16} />
                  Salvar alterações
                </button>
              </div>
            </Panel>
            {mode === "demo" && (
              <div className="demo-reset">
                <div>
                  <b>Dados de demonstração</b>
                  <p>
                    Restaurar substitui todos os registros e configurações
                    locais pelos exemplos iniciais.
                  </p>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    open({
                      type: "confirm",
                      title: "Restaurar demonstração?",
                      message:
                        "Cadastros, pagamentos, avaliações e vendas feitos neste navegador serão apagados. Essa ação não pode ser desfeita.",
                      onConfirm: async () => {
                        const initial = await execute({ type: "reset_demo" });
                        setForm(initial.settings);
                        notify("Demonstração restaurada.");
                      },
                    })
                  }
                >
                  <RotateCcw size={15} />
                  Restaurar exemplos
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </>
  );
}
