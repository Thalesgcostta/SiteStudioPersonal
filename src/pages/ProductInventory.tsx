import { useEffect, useState } from "react";
import { Check, Pencil, Search, Trash2 } from "lucide-react";
import { Empty, Panel } from "../components";
import { ProductImage } from "../ProductImage";
import { useStudio } from "../context";
import { currency, normalize } from "../data";
import type { Product } from "../data";

export function ProductInventory() {
  const { store, search } = useStudio();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");
  const products = store.products.filter((p) => !p.deletedAt);
  const filtered = products.filter(
    (p) =>
      (!category || p.category === category) &&
      normalize(`${p.name} ${p.variant} ${p.category}`).includes(
        normalize(query || search),
      ) &&
      (status === "all" ||
        (status === "empty"
          ? p.stock === 0
          : status === "low"
            ? p.stock > 0 && p.stock <= 3
            : p.stock > 3)),
  );
  return (
    <Panel
      title="Controle de estoque"
      subtitle="Edite os produtos, ajuste as quantidades disponíveis e exclua itens do catálogo."
    >
      <div className="inventory-summary">
        <div>
          <span>Produtos cadastrados</span>
          <strong>{products.length}</strong>
        </div>
        <div>
          <span>Unidades em estoque</span>
          <strong>{products.reduce((sum, p) => sum + p.stock, 0)}</strong>
        </div>
        <div>
          <span>Com estoque baixo ou zerado</span>
          <strong>{products.filter((p) => p.stock <= 3).length}</strong>
        </div>
      </div>
      <div className="inventory-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Buscar produto no estoque"
            placeholder="Nome, descrição ou categoria..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="field">
          Categoria do estoque
          <select
            aria-label="Categoria do estoque"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {store.settings.productCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Situação do estoque
          <select
            aria-label="Situação do estoque"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todos os produtos</option>
            <option value="available">Estoque acima de 3</option>
            <option value="low">Estoque baixo (1 a 3)</option>
            <option value="empty">Sem estoque</option>
          </select>
        </label>
      </div>
      <div className="table-wrap inventory-table">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Quantidade disponível</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <InventoryRow key={p.id} product={p} />
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <Empty
          title={
            products.length
              ? "Nenhum produto encontrado"
              : "Nenhum produto cadastrado"
          }
          text={
            products.length
              ? "Ajuste a busca e os filtros para consultar o estoque."
              : "Use Cadastrar produto para adicionar o primeiro item."
          }
        />
      )}
    </Panel>
  );
}

function InventoryRow({ product }: { product: Product }) {
  const { execute, saving, open, notify, store, mode } = useStudio();
  const [quantity, setQuantity] = useState(String(product.stock));
  const [error, setError] = useState("");
  useEffect(() => {
    setQuantity(String(product.stock));
    setError("");
  }, [product.stock, product.version]);
  const amount = Number(quantity);
  const valid =
    quantity.trim() !== "" && Number.isInteger(amount) && amount >= 0;
  const saveStock = async () => {
    if (saving || !valid || amount === product.stock) return;
    try {
      await execute({
        type: "save_product",
        product: { ...product, stock: amount },
      });
      setError("");
      notify(`Estoque de ${product.name} atualizado.`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível atualizar o estoque.",
      );
    }
  };
  return (
    <tr>
      <td>
        <div className="inventory-product">
          <div className="inventory-thumb">
            <ProductImage product={product} />
          </div>
          <div>
            <strong>{product.name}</strong>
            <small>{product.variant || "Sem variação"}</small>
          </div>
        </div>
      </td>
      <td>{product.category}</td>
      <td>{currency(product.price)}</td>
      <td>
        <form
          className="inventory-quantity"
          onSubmit={(e) => {
            e.preventDefault();
            void saveStock();
          }}
        >
          <input
            aria-label={`Quantidade em estoque de ${product.name}`}
            type="number"
            min="0"
            step="1"
            required
            value={quantity}
            disabled={saving}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <button
            className="button secondary"
            type="submit"
            aria-label={`Salvar estoque de ${product.name}`}
            disabled={saving || !valid || amount === product.stock}
          >
            <Check size={16} />
            Salvar
          </button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </td>
      <td>
        <span
          className={`stock-status ${product.stock === 0 ? "empty" : product.stock <= 3 ? "low" : "available"}`}
        >
          {product.stock === 0
            ? "Sem estoque"
            : product.stock <= 3
              ? "Estoque baixo"
              : "Disponível"}
        </span>
      </td>
      <td>
        <div className="inventory-actions">
          <button
            type="button"
            className="button secondary"
            aria-label={`Editar ${product.name}`}
            disabled={saving}
            onClick={() => open({ type: "product", productId: product.id })}
          >
            <Pencil size={16} />
            Editar
          </button>
          <button
            type="button"
            className="button danger-button"
            aria-label={`Excluir ${product.name}`}
            disabled={
              saving || (mode === "supabase" && store.schemaVersion < 4)
            }
            onClick={() =>
              open({
                type: "confirm",
                title: "Excluir produto?",
                message: `Deseja excluir “${product.name}”? Ele sairá do catálogo e do estoque. O histórico de vendas será preservado.`,
                onConfirm: async () => {
                  await execute({
                    type: "delete_product",
                    id: product.id,
                    version: product.version,
                  });
                  notify("Produto excluído. Histórico de vendas preservado.");
                },
              })
            }
          >
            <Trash2 size={16} />
            Excluir
          </button>
        </div>
      </td>
    </tr>
  );
}
