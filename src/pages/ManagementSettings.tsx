import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Check } from "lucide-react";
import { Panel } from "../components";
import { useStudio } from "../context";
import { widgetLabels } from "../data";
import type { Settings } from "../data";
import { supabase, errorMessage } from "../lib/supabase";
export function ProductCategories({
  value,
  onChange,
}: {
  value: Settings;
  onChange: (value: Settings) => void;
}) {
  const { store } = useStudio();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const add = () => {
    const text = name.trim();
    if (text.length < 2 || text.length > 40) {
      setError("Use de 2 a 40 caracteres para a categoria.");
      return;
    }
    if (
      value.productCategories.some(
        (c) => c.toLocaleLowerCase() === text.toLocaleLowerCase(),
      )
    ) {
      setError("Essa categoria já existe.");
      return;
    }
    if (value.productCategories.length >= 30) {
      setError("O limite é 30 categorias.");
      return;
    }
    onChange({
      ...value,
      productCategories: [...value.productCategories, text],
    });
    setName("");
    setError("");
  };
  return (
    <div className="settings-fields">
      <div className="category-editor">
        <label className="field">
          Nome da categoria
          <input
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
        </label>
        <button type="button" className="button secondary" onClick={add}>
          <Plus size={16} />
          Adicionar categoria
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <ul className="configuration-list">
        {value.productCategories.map((c) => {
          const used = store.products.some((p) => p.category === c);
          return (
            <li key={c}>
              <strong>{c}</strong>
              <span>{used ? "Em uso" : ""}</span>
              <button
                type="button"
                className="icon-button danger"
                aria-label={`Remover categoria ${c}`}
                disabled={used || value.productCategories.length === 1}
                onClick={() =>
                  onChange({
                    ...value,
                    productCategories: value.productCategories.filter(
                      (x) => x !== c,
                    ),
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="subtle-note">
        Salve as alterações para disponibilizar as categorias no catálogo.
        Categorias em uso são preservadas.
      </p>
    </div>
  );
}
export function DashboardSettings({
  value,
  onChange,
}: {
  value: Settings;
  onChange: (value: Settings) => void;
}) {
  const move = (index: number, direction: number) => {
    const items = [...value.dashboardWidgets];
    [items[index], items[index + direction]] = [
      items[index + direction],
      items[index],
    ];
    onChange({ ...value, dashboardWidgets: items });
  };
  return (
    <div className="settings-fields">
      <p className="subtle-note">
        Escolha os itens, sua largura e a ordem de exibição. As posições seguem
        da esquerda para a direita e de cima para baixo.
      </p>
      <ol className="configuration-list dashboard-editor">
        {value.dashboardWidgets.map((w, index) => (
          <li key={w.id}>
            <label>
              <input
                type="checkbox"
                checked={w.visible}
                onChange={(e) =>
                  onChange({
                    ...value,
                    dashboardWidgets: value.dashboardWidgets.map((x) =>
                      x.id === w.id ? { ...x, visible: e.target.checked } : x,
                    ),
                  })
                }
              />
              {widgetLabels[w.id]}
            </label>
            <select
              aria-label={`Largura de ${widgetLabels[w.id]}`}
              value={w.size}
              onChange={(e) =>
                onChange({
                  ...value,
                  dashboardWidgets: value.dashboardWidgets.map((x) =>
                    x.id === w.id
                      ? { ...x, size: e.target.value as typeof w.size }
                      : x,
                  ),
                })
              }
            >
              {Object.keys(widgetLabels).indexOf(w.id) < 6 && (
                <option value="small">Compacto</option>
              )}
              <option value="half">Meia largura</option>
              <option value="full">Largura inteira</option>
            </select>
            <button
              type="button"
              className="icon-button"
              disabled={index === 0}
              aria-label={`Subir ${widgetLabels[w.id]}`}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={17} />
            </button>
            <button
              type="button"
              className="icon-button"
              disabled={index === value.dashboardWidgets.length - 1}
              aria-label={`Descer ${widgetLabels[w.id]}`}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={17} />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
export function UserProfile() {
  const { user, mode, notify } = useStudio();
  const [name, setName] = useState(user.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <Panel
      title="Meu perfil"
      subtitle="O nome acompanha sua conta nos menus e no Dashboard."
    >
      <form
        className="settings-fields"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!supabase || pending) return;
          setPending(true);
          setError("");
          try {
            const { error } = await supabase.auth.updateUser({
              data: { full_name: name.trim() },
            });
            if (error) throw error;
            notify("Nome de exibição atualizado.");
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="field">
          Nome de exibição
          <input
            required
            minLength={3}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={mode === "demo"}
          />
        </label>
        <label className="field">
          E-mail da conta
          <input type="email" value={user.email} readOnly />
        </label>
        <p className="subtle-note">Perfil: administrador(a) do studio.</p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button
          className="button primary"
          type="submit"
          disabled={pending || mode === "demo"}
        >
          <Check size={16} />
          {pending ? "Salvando…" : "Salvar perfil"}
        </button>
      </form>
    </Panel>
  );
}
