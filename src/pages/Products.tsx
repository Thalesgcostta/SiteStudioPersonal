import {
  Check,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Empty, PageIntro, Panel, ProductArt } from "../components";
import { useStudio } from "../context";
import {
  currency,
  dateLabel,
  methods,
  normalize,
  saleTotal,
  today,
  uid,
} from "../data";
export function Products() {
  const { store, execute, saving, mode, open, search, notify, month } =
    useStudio();
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [student, setStudent] = useState("");
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState(store.settings.methods[0] || methods[0]);
  const [tab, setTab] = useState("catalog");
  const [error, setError] = useState("");
  const items = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, quantity]) => ({
      product: store.products.find((p) => p.id === id)!,
      quantity,
    }));
  const subtotal = items.reduce((a, i) => a + i.product.price * i.quantity, 0);
  const total = subtotal - discount;
  const filtered = store.products.filter(
    (p) =>
      (category === "Todos" || p.category === category) &&
      normalize(p.name).includes(normalize(query || search)),
  );
  const change = (id: string, n: number) => {
    const p = store.products.find((p) => p.id === id)!;
    const quantity = (cart[id] || 0) + n;
    if (quantity > p.stock) {
      notify("Quantidade máxima disponível em estoque.");
      return;
    }
    setCart((prev) => ({ ...prev, [id]: Math.max(0, quantity) }));
    setError("");
  };
  const checkout = async () => {
    if (saving) return;
    if (!items.length) return;
    if (discount < 0 || discount > subtotal) {
      setError("O desconto deve estar entre zero e o subtotal.");
      return;
    }
    if (items.some((i) => i.quantity > i.product.stock)) {
      setError("O estoque mudou. Revise as quantidades.");
      return;
    }
    try {
      await execute({
        type: "record_sale",
        sale: {
          id: uid(),
          date: today,
          studentId: student,
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            price: i.product.price,
          })),
          discount,
          method,
        },
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível concluir a venda.",
      );
      return;
    }
    setCart({});
    setDiscount(0);
    setStudent("");
    setError("");
    notify(
      `${mode === "demo" ? "Venda simulada concluída" : "Venda registrada"}! Total: ${currency(total)}.`,
    );
  };
  const sales = store.sales.filter((s) => s.date.startsWith(month));
  const ranked = store.products
    .map((p) => ({
      ...p,
      sold: sales
        .flatMap((s) => s.items)
        .filter((i) => i.productId === p.id)
        .reduce((a, i) => a + i.quantity, 0),
    }))
    .sort((a, b) => b.sold - a.sold);
  return (
    <>
      <PageIntro
        eyebrow="BEM-ESTAR QUE VAI ALÉM DO TREINO"
        title="Vendas de produtos"
        description="Produtos selecionados para acompanhar cada objetivo."
        actions={
          <>
            <button
              className="button primary"
              onClick={() => open({ type: "product" })}
            >
              <Plus size={16} />
              Cadastrar produto
            </button>
            <div className="sale-notice">
              <ShoppingBag size={16} />
              Vendas separadas das mensalidades
            </div>
          </>
        }
      />
      <div className="page-tabs">
        <button
          className={tab === "catalog" ? "active" : ""}
          onClick={() => setTab("catalog")}
        >
          Catálogo e venda
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          Histórico de vendas <span>{sales.length}</span>
        </button>
      </div>
      {tab === "catalog" ? (
        <div className="products-layout">
          <div>
            <div className="product-toolbar">
              <label className="search-field">
                <Search size={17} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Encontre um produto..."
                  aria-label="Buscar produto"
                />
              </label>
            </div>
            <div className="category-tabs">
              {["Todos", "Suplementos", "Alimentos", "Acessórios"].map((c) => (
                <button
                  key={c}
                  className={category === c ? "active" : ""}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="product-grid">
              {filtered.map((p) => (
                <div className="product-card" key={p.id}>
                  <div className="product-image">
                    {p.stock <= 3 && (
                      <span className="low-stock">Estoque baixo</span>
                    )}
                    <ProductArt id={p.id} name={p.name} color={p.color} />
                  </div>
                  <div className="product-info">
                    <span className="product-category">{p.category}</span>
                    <h3>{p.name}</h3>
                    <p>{p.variant}</p>
                    <button
                      className="text-button"
                      onClick={() => open({ type: "product", productId: p.id })}
                    >
                      Editar produto
                    </button>
                    <div className="product-price">
                      <strong>{currency(p.price)}</strong>
                      <span>{p.stock} em estoque</span>
                    </div>
                    <button
                      disabled={p.stock === 0 || (cart[p.id] || 0) >= p.stock}
                      className="button secondary full"
                      onClick={() => change(p.id, 1)}
                    >
                      <Plus size={16} />
                      {p.stock === 0 ? "Sem estoque" : "Adicionar à venda"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!filtered.length && <Empty />}
            <p className="subtle-note product-caption">
              {mode === "demo"
                ? "Ilustrações demonstrativas · Produtos e preços fictícios."
                : "Ilustrações dos produtos · Preços e estoque cadastrados no studio."}
            </p>
          </div>
          <Panel
            className="cart-panel"
            title="Nova venda"
            subtitle="Monte o pedido do seu aluno"
            action={
              <span className="cart-count">
                <ShoppingCart size={17} />
                {items.reduce((a, i) => a + i.quantity, 0)}
              </span>
            }
          >
            <div className="cart-body">
              {items.length ? (
                items.map((i) => (
                  <div className="cart-item" key={i.product.id}>
                    <div className="cart-thumb">
                      <ProductArt
                        id={i.product.id}
                        color={i.product.color}
                        name={i.product.name}
                      />
                    </div>
                    <div>
                      <strong>{i.product.name}</strong>
                      <span>{currency(i.product.price)}</span>
                      <div className="quantity-control">
                        <button
                          aria-label={`Diminuir ${i.product.name}`}
                          onClick={() => change(i.product.id, -1)}
                        >
                          <Minus size={12} />
                        </button>
                        <b>{i.quantity}</b>
                        <button
                          aria-label={`Aumentar ${i.product.name}`}
                          onClick={() => change(i.product.id, 1)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Remover ${i.product.name} da venda`}
                      onClick={() =>
                        setCart((c) => ({ ...c, [i.product.id]: 0 }))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="cart-empty">
                  <ShoppingBag size={35} />
                  <h3>Uma escolha de cada vez</h3>
                  <p>Adicione produtos para começar uma venda.</p>
                </div>
              )}
              <label className="field">
                Aluno <span className="optional">opcional</span>
                <select
                  value={student}
                  onChange={(e) => setStudent(e.target.value)}
                >
                  <option value="">Venda de balcão</option>
                  {store.students
                    .filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                Forma de pagamento
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {store.settings.methods.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Desconto em reais
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </label>
              <div className="cart-total">
                <div>
                  <span>Subtotal</span>
                  <span>{currency(subtotal)}</span>
                </div>
                <div>
                  <span>Desconto</span>
                  <span>− {currency(discount)}</span>
                </div>
                <div className="total">
                  <strong>Total da venda</strong>
                  <strong>{currency(total)}</strong>
                </div>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button primary full"
                disabled={!items.length || saving}
                onClick={checkout}
              >
                <Check size={17} />
                Finalizar venda
              </button>
              <p className="subtle-note centered">
                {mode === "demo"
                  ? "Confirmação simulada · sem cobrança real"
                  : "Venda de um pagamento já recebido · sem cobrança bancária"}
              </p>
            </div>
          </Panel>
        </div>
      ) : (
        <>
          <div className="sales-summary">
            <Panel
              title="Mais vendidos no mês"
              subtitle="Quantidade de unidades vendidas"
            >
              <div className="top-products">
                {ranked.slice(0, 3).map((p, i) => (
                  <div key={p.id}>
                    <span className="rank">0{i + 1}</span>
                    <div>
                      <strong>{p.name}</strong>
                      <span>{p.sold} unidades</span>
                    </div>
                    <strong>{currency(p.price)}</strong>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Atenção ao estoque"
              subtitle="Produtos com até 3 unidades"
            >
              {store.products
                .filter((p) => p.stock <= 3)
                .map((p) => (
                  <div className="stock-alert" key={p.id}>
                    <ShoppingBag size={18} />
                    <div>
                      <strong>{p.name}</strong>
                      <span>{p.stock} unidades disponíveis</span>
                    </div>
                  </div>
                ))}
              {!store.products.some((p) => p.stock <= 3) && (
                <div className="mini-empty">
                  Todos os produtos com estoque disponível.
                </div>
              )}
            </Panel>
          </div>
          <Panel
            title="Histórico de vendas"
            subtitle="Consulte a competência pelo seletor do cabeçalho"
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Aluno / cliente</th>
                    <th>Produtos</th>
                    <th>Desconto</th>
                    <th>Total</th>
                    <th>Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {sales
                    .filter((s) =>
                      normalize(
                        `${store.students.find((a) => a.id === s.studentId)?.name || "Balcão"} ${s.items.map((i) => store.products.find((p) => p.id === i.productId)?.name).join(" ")}`,
                      ).includes(normalize(search)),
                    )
                    .map((s) => (
                      <tr key={s.id}>
                        <td>{dateLabel(s.date)}</td>
                        <td>
                          {store.students.find((a) => a.id === s.studentId)
                            ?.name || "Venda de balcão"}
                        </td>
                        <td>
                          {s.items.map((i) => (
                            <small key={i.productId}>
                              {i.quantity}×{" "}
                              {
                                store.products.find((p) => p.id === i.productId)
                                  ?.name
                              }
                            </small>
                          ))}
                        </td>
                        <td>{currency(s.discount)}</td>
                        <td>
                          <strong>{currency(saleTotal(s))}</strong>
                        </td>
                        <td>{s.method}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!sales.length && <Empty title="Sem vendas nesta competência" />}
          </Panel>
        </>
      )}
    </>
  );
}
