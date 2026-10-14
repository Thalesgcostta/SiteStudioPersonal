import { ProductArt } from "./components";
import { productIllustrations } from "./data";
import type { ProductIllustrationId } from "./data";

const existingArt: Partial<Record<ProductIllustrationId, string>> = {
  whey: "p1",
  creatine: "p2",
  "protein-bar": "p3",
  shaker: "p4",
  "resistance-band": "p5",
  "water-bottle": "p6",
};

export function ProductIllustration({
  illustration,
  color,
  name,
}: {
  illustration: Exclude<ProductIllustrationId, "category">;
  color: string;
  name: string;
}) {
  const existing = existingArt[illustration];
  if (existing) return <ProductArt id={existing} color={color} name={name} />;
  const label = productIllustrations.find(
    (item) => item.id === illustration,
  )?.label;
  return (
    <svg viewBox="0 0 220 180" role="img" aria-label={`Ilustração de ${name}`}>
      <title>{label}</title>
      <ellipse cx="110" cy="157" rx="62" ry="9" fill="#000" opacity=".055" />
      {illustration === "pre-workout" && (
        <g>
          <rect x="60" y="47" width="100" height="104" rx="14" fill="#30383f" />
          <rect x="57" y="33" width="106" height="25" rx="7" fill={color} />
          <path
            d="M67 37v17m9-17v17m9-17v17m9-17v17m9-17v17m9-17v17m9-17v17m9-17v17m9-17v17m9-17v17"
            stroke="#fff"
            opacity=".2"
          />
          <rect x="60" y="72" width="100" height="62" fill={color} />
          <path d="M114 78l-20 28h15l-5 21 24-32h-16z" fill="#fff" />
          <text
            x="110"
            y="146"
            textAnchor="middle"
            fontSize="9"
            fontWeight="800"
            fill="#fff"
          >
            PRÉ-TREINO
          </text>
        </g>
      )}
      {illustration === "dumbbell" && (
        <g transform="rotate(-18 110 92)">
          <rect x="38" y="82" width="144" height="20" rx="6" fill="#8b99a4" />
          <rect x="88" y="84" width="44" height="16" rx="3" fill="#c9d2d9" />
          <path
            d="M94 85v14m7-14v14m7-14v14m7-14v14m7-14v14"
            stroke="#8b99a4"
          />
          <rect x="50" y="55" width="22" height="74" rx="6" fill={color} />
          <rect x="37" y="65" width="17" height="54" rx="5" fill="#30383f" />
          <rect x="148" y="55" width="22" height="74" rx="6" fill={color} />
          <rect x="167" y="65" width="17" height="54" rx="5" fill="#30383f" />
          <path
            d="M56 64v55m98-55v55"
            stroke="#fff"
            strokeWidth="3"
            opacity=".2"
          />
        </g>
      )}
      {illustration === "yoga-mat" && (
        <g>
          <path d="M54 72h98l37 68H72z" fill={color} />
          <path
            d="M66 89h94m-86 12h93m-86 12h93m-86 12h93"
            stroke="#fff"
            opacity=".22"
            strokeWidth="2"
          />
          <ellipse cx="56" cy="87" rx="26" ry="35" fill={color} />
          <ellipse
            cx="56"
            cy="87"
            rx="17"
            ry="26"
            fill="#30383f"
            opacity=".8"
          />
          <ellipse cx="56" cy="87" rx="10" ry="18" fill={color} />
          <ellipse cx="56" cy="87" rx="4" ry="10" fill="#30383f" />
          <path
            d="M108 71l32 69"
            stroke="#30383f"
            strokeWidth="10"
            opacity=".65"
          />
        </g>
      )}
      {illustration === "fitness-shirt" && (
        <g>
          <path
            d="M81 35l-38 20-17 40 35 13 13-23v65h73V85l13 23 35-13-17-40-38-20c-16 15-41 15-59 0z"
            fill={color}
            stroke="#30383f"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M81 35c6 24 48 24 59 0"
            fill="none"
            stroke="#30383f"
            strokeWidth="5"
          />
          <path
            d="M80 139h59m-99-53 21 9m99 0 21-9"
            stroke="#fff"
            opacity=".3"
            strokeWidth="3"
          />
          <path
            d="M94 88h32m-25-9v18m16-18v18"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      )}
      {illustration === "vitamins" && (
        <g>
          <rect x="80" y="39" width="60" height="114" rx="13" fill="#b68038" />
          <rect x="82" y="25" width="56" height="25" rx="6" fill="#30383f" />
          <rect x="80" y="66" width="60" height="57" rx="2" fill={color} />
          <path d="M103 76h14v11h11v14h-11v11h-14v-11H92V87h11z" fill="#fff" />
          <rect
            x="144"
            y="127"
            width="40"
            height="15"
            rx="7"
            fill="#f6f6f1"
            stroke="#d5dbe0"
            transform="rotate(-30 164 134)"
          />
          <path d="M159 125l8 14" stroke={color} strokeWidth="2" />
          <path
            d="M88 53v90"
            stroke="#fff"
            opacity=".15"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      )}
      {illustration === "peanut-butter" && (
        <g>
          <rect
            x="67"
            y="49"
            width="86"
            height="104"
            rx="14"
            fill="#b98751"
            stroke="#9d6c39"
          />
          <rect x="64" y="32" width="92" height="25" rx="7" fill={color} />
          <rect x="67" y="73" width="86" height="62" fill="#faf5e8" />
          <text
            x="110"
            y="87"
            textAnchor="middle"
            fontSize="8"
            fontWeight="800"
            fill="#735028"
          >
            PASTA DE
          </text>
          <text
            x="110"
            y="100"
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fill="#735028"
          >
            AMENDOIM
          </text>
          <ellipse
            cx="104"
            cy="117"
            rx="9"
            ry="6"
            transform="rotate(-28 104 117)"
            fill="#b98751"
          />
          <ellipse
            cx="118"
            cy="114"
            rx="9"
            ry="6"
            transform="rotate(-28 118 114)"
            fill="#b98751"
          />
          <path
            d="M74 59v81"
            stroke="#fff"
            strokeWidth="4"
            opacity=".2"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
