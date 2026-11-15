/*
  Animación: un commit guarda una foto completa del proyecto, no las diferencias. Tres commits en
  columnas; cada archivo apunta a un bloque de contenido. Cuando un archivo no cambia, el commit
  nuevo apunta al mismo bloque (la barra se alarga), no lo copia. Cada commit tiene hash, padre,
  autor, fecha y mensaje. Las diferencias se calculan al vuelo comparando fotos.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import { foto, mover, limpiar } from "./_basico";
import "./instantanea.css";

const FILES = ["README.md", "app.js", "estilo.css"];
const COMMITS = [
  { id: "A", hash: "9a3c7d0", msg: "primer commit" },
  { id: "B", hash: "7e41b08", msg: "agrega login" },
  { id: "C", hash: "3f9a2c1", msg: "nuevos colores" },
];
// bloques de contenido: fila (archivo), primer y último commit que lo usan
type Blob = { h: string; row: number; from: number; to: number };
const blobs = (n: number): Blob[] => {
  const end = (x: number) => Math.min(x, n - 1);
  const l: Blob[] = [{ h: "b6fc4c6", row: 0, from: 0, to: end(2) }];
  l.push({ h: "e1d0a3f", row: 1, from: 0, to: 0 });
  if (n > 1) l.push({ h: "4f1d0a9", row: 1, from: 1, to: end(2) });
  l.push({ h: "7c2e3b8", row: 2, from: 0, to: end(1) });
  if (n > 2) l.push({ h: "d81f5e0", row: 2, from: 2, to: 2 });
  return l;
};
const FULL = "3f9a2c1d84b07e5a6c19f2e03b7d4a8c51e9f062";

type Paso = { cmd: string; out?: string; n: number; ficha?: boolean; diff?: boolean; total?: boolean };
const PASOS: Paso[] = [
  { cmd: 'git commit -m "primer commit"', out: "[main (root-commit) 9a3c7d0] primer commit\n 3 files changed, 42 insertions(+)", n: 1 },
  { cmd: 'git commit -am "agrega login"', out: "[main 7e41b08] agrega login\n 1 file changed, 12 insertions(+)", n: 2 },
  { cmd: 'git commit -am "nuevos colores"', out: "[main 3f9a2c1] nuevos colores\n 1 file changed, 2 insertions(+), 2 deletions(-)", n: 3 },
  { cmd: "git show -s 3f9a2c1", out: `commit <span class="warn">${FULL}</span>\nAuthor: Ana &lt;ana@ejemplo.com&gt;\nDate:   Mon Mar 9 10:24:31 2026 -0300\n\n    nuevos colores`, n: 3, ficha: true },
  { cmd: "git diff 7e41b08 3f9a2c1", out: '--- a/estilo.css\n+++ b/estilo.css\n<span class="bad">-h1 { color: gray; }</span>\n<span class="ok">+h1 { color: orange; }</span>', n: 3, diff: true },
  { cmd: "", n: 3, total: true },
];

let root: HTMLElement;
let board: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

function html(p: Paso, i: number) {
  const nuevos = new Set(blobs(p.n).filter((b) => b.from === p.n - 1 && i <= 2).map((b) => b.h));
  const heads = COMMITS.map((c, k) => k < p.n
    ? `<div class="ft-head${k ? " has-parent" : ""}${p.ficha && k === 2 ? " is-hl" : ""}" style="grid-column:${k + 2}" data-k="h${c.id}">
         <i class="bx-commit${k === p.n - 1 && i <= 2 ? " t-new" : ""}">${c.id}</i><b>${c.hash}</b><span>${c.msg}</span></div>`
    : `<div class="ft-head is-off" style="grid-column:${k + 2}"></div>`).join("");
  const rows = FILES.map((f, r) => `<span class="ft-name" style="grid-row:${r + 2}">${f}</span>`).join("");
  const bars = blobs(p.n).map((b) => {
    const span = b.to - b.from + 1;
    const cmp = p.diff && b.row === 2 && b.to >= 1;
    const cls = (nuevos.has(b.h) ? " is-new" : "") + (span > 1 ? " is-shared" : "") + (p.diff ? (cmp ? " is-cmp" : " is-skip") : "");
    return `<span class="ft-bar${cls}" style="grid-row:${b.row + 2};grid-column:${b.from + 2} / ${b.to + 3}" data-k="b${b.h}" data-sig="${span > 1 ? "s" + span : ""}">
      <b>${b.h}</b>${span > 1 ? `<em>mismo bloque en ${span} commits</em>` : ""}</span>`;
  }).join("");
  const extra = p.ficha
    ? `<dl class="ft-ficha" data-k="ficha"><dt>commit</dt><dd class="mo">3f9a2c1</dd><dt>padre</dt><dd class="mo">7e41b08 (B)</dd><dt>autor</dt><dd>Ana &lt;ana@ejemplo.com&gt;</dd><dt>fecha</dt><dd>9 mar 2026, 10:24</dd><dt>mensaje</dt><dd>nuevos colores</dd></dl>`
    : p.diff
    ? `<p class="bx-note ft-note" data-k="nota-diff"><b>Git compara dos fotos.</b> <span class="mo">README.md</span> y <span class="mo">app.js</span> apuntan al mismo bloque en B y C, así que ni los abre: solo compara <span class="mo">estilo.css</span>.</p>`
    : p.total
    ? `<p class="bx-note is-ok ft-note" data-k="nota-total"><b>9 archivos en 3 fotos, solo 5 bloques guardados.</b> Por eso un commit es instantáneo y el repositorio ocupa poco.</p>`
    : "";
  return `<div class="ft-grid">${heads}${rows}${bars}</div>${extra}`;
}

export const instantanea: Escena = {
  title: "Un commit es una foto, no una lista de cambios",
  steps: [
    { title: "Un commit es una foto completa", text: "El commit A guarda los tres archivos tal como están. Cada contenido queda guardado una vez, como un bloque identificado por su hash.", ms: 7500 },
    { title: "Solo cambió app.js", text: "B también es una foto completa, pero no copia nada que no cambió: <code>README.md</code> y <code>estilo.css</code> apuntan a los mismos bloques que A. Solo <code>app.js</code> tiene bloque nuevo.", ms: 8500 },
    { title: "Ahora cambia estilo.css", text: "C reutiliza los bloques de <code>README.md</code> y <code>app.js</code>. Solo <code>estilo.css</code> genera un bloque nuevo.", ms: 7000 },
    { title: "Cada commit tiene su ficha", text: "Hash, padre, autor, fecha y mensaje. El hash (aquí abreviado a 7 caracteres) identifica el commit; el padre lo une al anterior y forma la historia.", ms: 8500 },
    { title: "Las diferencias se calculan al vuelo", text: "Git no guarda el diff: lo calcula cuando lo pides, comparando dos fotos. Si un archivo apunta al mismo bloque en ambas, no cambió y se salta.", ms: 8500 },
    { title: "Por eso es rápido y liviano", text: "Fotos completas para leer cualquier versión al instante, sin copiar lo repetido. Y el diff, cuando lo necesitas.", ms: 7000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("ft");
    term = consola(stage);
    board = document.createElement("div");
    board.className = "ft-board";
    stage.appendChild(board);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-new"></i>commit o bloque nuevo</span><span><i class="l-fneutral l-sq"></i>bloque reutilizado (no se copia)</span><span><i class="l-ok"></i>comparado en el diff</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    limpiar(board);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const antes = foto(board);
    board.innerHTML = html(p, i);
    const d = term.show(p.cmd, t, 0, p.out || "");
    // las barras que se alargan: el commit nuevo apunta al mismo bloque
    if (t) board.querySelectorAll<HTMLElement>(".ft-bar").forEach((el) => {
      const a = antes.get(el.dataset.k!);
      const w = el.getBoundingClientRect().width;
      if (a && Math.abs(a.r.width - w) > 2) t.fromTo(el, { width: a.r.width }, { width: w, duration: 0.8, ease: "power3.inOut", clearProps: "width" }, d + 0.3);
    });
    mover(board, antes, t, d);
  },
};
