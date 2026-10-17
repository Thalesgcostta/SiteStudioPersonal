import { readFile, stat } from "node:fs/promises";
const source = await readFile(
  new URL("../src/content.ts", import.meta.url),
  "utf8",
);
const assets = [
  ...new Set(
    [...source.matchAll(/(?:src|poster):\s*"(\/media\/[^"\n]+)"/g)].map(
      (match) => match[1],
    ),
  ),
];
if (!assets.length)
  throw new Error(
    "Não foi possível identificar os arquivos de mídia do portfólio.",
  );
const missing = [];
for (const path of assets) {
  try {
    const file = await stat(new URL(`../public${path}`, import.meta.url));
    if (!file.isFile() || !file.size) missing.push(path);
  } catch {
    missing.push(path);
  }
}
if (missing.length) {
  console.error(
    "Arquivos de mídia ausentes ou vazios em site/public/media:",
  );
  for (const path of missing) console.error(`- ${path}`);
  console.error(
    "Consulte docs/PORTFOLIO_PUBLICO.md. O administrativo usa um build separado.",
  );
  process.exitCode = 1;
} else
  console.log(
    `${assets.length} arquivos de mídia encontrados. Portfólio liberado para build.`,
  );
