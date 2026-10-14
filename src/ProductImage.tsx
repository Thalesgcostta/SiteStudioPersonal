import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { ProductArt } from "./components";
import { ProductIllustration } from "./ProductIllustration";
import { supabase } from "./lib/supabase";
import { useStudio } from "./context";
import type { Product } from "./data";
const urls = new Map<string, { url: string; expires: number }>();
export function ProductImage({ product }: { product: Product }) {
  const { user, mode } = useStudio();
  const [url, setUrl] = useState("");
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    let active = true;
    setBroken(false);
    setUrl("");
    if (mode === "demo" || !product.photoPath || !supabase) return;
    const path = product.photoPath;
    const key = user.id + ":" + path;
    const cached = urls.get(key);
    if (cached && cached.expires > Date.now()) {
      setUrl(cached.url);
      return;
    }
    void supabase.storage
      .from("product-images")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (data) {
          urls.set(key, {
            url: data.signedUrl,
            expires: Date.now() + 3500_000,
          });
          if (active) setUrl(data.signedUrl);
        }
      });
    return () => {
      active = false;
    };
  }, [user.id, mode, product.photoPath, product.photo]);
  const src = mode === "demo" ? product.photo : url;
  if (src && !broken)
    return (
      <img
        className="product-photo"
        src={src}
        alt={`Foto de ${product.name}`}
        onError={() => {
          setBroken(true);
          setUrl("");
        }}
      />
    );
  if (product.illustration && product.illustration !== "category")
    return (
      <ProductIllustration
        illustration={product.illustration}
        name={product.name}
        color={product.color}
      />
    );
  const defaults =
    product.category === "Alimentos"
      ? "p3"
      : product.category === "Acessórios"
        ? "p4"
        : "p1";
  if (!["Suplementos", "Alimentos", "Acessórios"].includes(product.category))
    return (
      <div
        className="generic-product-art"
        role="img"
        aria-label={`Imagem padrão de ${product.category}`}
      >
        <Package size={72} color={product.color} />
        <span>{product.category}</span>
      </div>
    );
  return <ProductArt id={defaults} name={product.name} color={product.color} />;
}
