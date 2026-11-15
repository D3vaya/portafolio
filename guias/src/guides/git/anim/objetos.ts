/*
  Animación: dentro de un commit. Se construye de abajo hacia arriba: blobs (solo contenido, con su
  hash), un tree (nombres, permisos y el hash de cada blob) y el commit (tree raíz, padre, autor,
  mensaje). Mismo contenido = mismo hash: dos archivos iguales comparten un blob. Cambiar un carácter
  cambia el blob, el tree y el commit, en cadena. Hoy SHA-1 (40 caracteres); Git 3.0, SHA-256.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import { foto, mover, limpiar } from "./_basico";
import "./objetos.css";

const H = {
  hola: "e965047ad7c57865823c7d992b1d046ea66edf78",
  app: "5e1c3094f2a8b7d61e03c95a4f7b2d8e1a6c0937",
  hola2: "2a8f1c6b93e07d4a5f1c82e6d09b7a3e4c5f8d21",
  tree: "9c1e4f2b7a03d85e61c4f9a2b0e73d18c5a6f402",
  tree2: "0b77ae5d1c9f3a8e26b4d07c5e1f9a3b8d2c6e40",
  parent: "4b2d9e1c08f5a7b36e2d91c4a05f8e7b3d6c1a29",
  commit: "a7f3e21c5d08b94f6e1a37c2d8b05e9f4a6c1d73",
  commit2: "c42d8f1e7a39b05c6d2f8e14a7b3c9d05e6f2a18",
};
const s7 = (h: string) => h.slice(0, 7);

type Blob = { h: string; txt: string; badge?: string };
type Ent = { name: string; h: string };
type Paso = {
  cmd: string; out?: string; blobs: Blob[]; tree?: { h: string; e: Ent[] }; commit?: { h: string; tree: string; parent: string; msg: string };
  cadena?: boolean; sha?: boolean;
};

const B_APP: Blob = { h: H.app, txt: "iniciar();" };
const B_HOLA: Blob = { h: H.hola, txt: "Hola" };
const TREE1 = { h: H.tree, e: [{ name: "app.js", h: H.app }, { name: "copia.txt", h: H.hola }, { name: "hola.txt", h: H.hola }] };
const COMMIT1 = { h: H.commit, tree: H.tree, parent: H.parent, msg: "agrega login" };
const TREE2 = { h: H.tree2, e: [{ name: "app.js", h: H.app }, { name: "copia.txt", h: H.hola }, { name: "hola.txt", h: H.hola2 }] };
const COMMIT2 = { h: H.commit2, tree: H.tree2, parent: H.commit, msg: "cambia saludo" };
const BLOBS2 = [B_APP, B_HOLA, { h: H.hola2, txt: "Hola." }];

const PASOS: Paso[] = [
  { cmd: "git hash-object hola.txt", out: `<span class="warn">${H.hola}</span>`, blobs: [B_APP, B_HOLA] },
  { cmd: "git hash-object hola.txt copia.txt", out: `<span class="warn">${H.hola}\n${H.hola}</span>`,
    blobs: [B_APP, { ...B_HOLA, badge: "hola.txt y copia.txt: 1 solo blob" }] },
  { cmd: `git cat-file -p ${s7(H.tree)}`, out: TREE1.e.map((e) => `100644 blob ${e.h}\t${e.name}`).join("\n"), blobs: [B_APP, B_HOLA], tree: TREE1 },
  { cmd: "git cat-file -p HEAD", out: `tree ${H.tree}\nparent ${H.parent}\nauthor Ana &lt;ana@ejemplo.com&gt; 1773062671 -0300\ncommitter Ana &lt;ana@ejemplo.com&gt; 1773062671 -0300\n\nagrega login`,
    blobs: [B_APP, B_HOLA], tree: TREE1, commit: COMMIT1 },
  { cmd: 'git commit -am "cambia saludo"', out: `[main ${s7(H.commit2)}] cambia saludo\n 1 file changed, 1 insertion(+), 1 deletion(-)`,
    blobs: BLOBS2, tree: TREE2, commit: COMMIT2, cadena: true },
  { cmd: "git rev-parse HEAD", out: `<span class="warn">${H.commit2}</span>`, blobs: BLOBS2, tree: TREE2, commit: COMMIT2, sha: true },
];

let root: HTMLElement;
let board: HTMLElement;
let cur = 0;
let prevLines = new Set<string>();
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

function html(p: Paso) {
  const D = p.cadena ? { blob: 0, ent: 0.5, tree: 0.8, commit: 1.2 } : { blob: 0, ent: 0, tree: 0, commit: 0 };
  const c = p.commit;
  const commit = c ? `
    <div class="ob-crow">
      <section class="ob-box ob-commit" data-k="commit" data-sig="${c.h}" data-d="${D.commit}">
        <header><b>commit</b><span class="ob-h">${s7(c.h)}</span></header>
        <dl><dt>tree</dt><dd class="ob-h">${s7(c.tree)}</dd><dt>parent</dt><dd class="ob-h">${s7(c.parent)}</dd><dt>author</dt><dd>Ana &lt;ana@ejemplo.com&gt;</dd><dt>mensaje</dt><dd>${c.msg}</dd></dl>
      </section>
      <div class="ob-parent" data-k="parent-${c.parent}"><span>commit padre</span><b class="ob-h">${s7(c.parent)}</b></div>
    </div>` : `<div class="ob-crow is-off"><span class="ob-ph">commit</span></div>`;
  const t = p.tree;
  const tree = t ? `
    <section class="ob-box ob-tree" data-k="tree" data-sig="${t.h}" data-d="${D.tree}">
      <header><b>tree</b><span class="ob-h">${s7(t.h)}</span><em>la carpeta raíz</em></header>
      <div class="ob-ents">${t.e.map((e) => `
        <div class="ob-ent" data-k="ent-${e.name}" data-sig="${e.h}" data-d="${D.ent}" data-to="${s7(e.h)}">
          <span>100644 blob</span><b class="ob-h">${s7(e.h)}</b><code>${e.name}</code></div>`).join("")}</div>
    </section>` : `<div class="ob-tree is-off"><span class="ob-ph">tree</span></div>`;
  const blobs = p.blobs.map((b) => `
    <section class="ob-box ob-blob${b.h === H.hola2 ? " is-new" : ""}" data-k="blob-${s7(b.h)}" data-sig="${b.badge ? "2" : ""}" data-d="${D.blob}">
      <header><b>blob</b><span class="ob-h">${s7(b.h)}</span></header>
      <code>${b.txt}</code>
      ${b.badge ? `<em class="ob-badge">${b.badge}</em>` : ""}
    </section>`).join("");
  const sha = p.sha ? `
    <div class="ob-sha" data-k="sha">
      <p><b>SHA-1 · 40 caracteres</b><code>${H.commit2}</code><span>Hoy. Los 7 primeros bastan para nombrarlo.</span></p>
      <p><b>SHA-256 · 64 caracteres</b><code>${H.commit2}${H.tree2.slice(0, 24)}</code><span>Git 3.0 lo usará por defecto en repositorios nuevos.</span></p>
    </div>` : "";
  return `<svg class="ob-lines" aria-hidden="true"></svg>${commit}${tree}<div class="ob-blobs">${blobs}</div>${sha}`;
}

const NS = "http://www.w3.org/2000/svg";
/** Líneas: commit → tree y cada entrada del tree → su blob. Devuelve las nuevas para animarlas. */
function lineas(p: Paso) {
  const svg = board.querySelector<SVGSVGElement>(".ob-lines")!;
  const base = board.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${base.width} ${base.height}`);
  svg.innerHTML = "";
  const rect = (sel: string) => board.querySelector(sel)?.getBoundingClientRect();
  const pares: [string, DOMRect | undefined, DOMRect | undefined][] = [];
  if (p.commit) pares.push(["c>t", rect(".ob-commit"), rect(".ob-tree")]);
  board.querySelectorAll<HTMLElement>(".ob-ent").forEach((e) =>
    pares.push([e.dataset.k + ">" + e.dataset.to, e.getBoundingClientRect(), rect(`[data-k="blob-${e.dataset.to}"]`)]));
  const nuevas: SVGPathElement[] = [];
  const now = new Set<string>();
  pares.forEach(([k, a, b]) => {
    if (!a || !b) return;
    now.add(k);
    const x1 = a.left - base.left + a.width / 2, y1 = a.bottom - base.top;
    const x2 = b.left - base.left + b.width / 2, y2 = b.top - base.top;
    const m = (y1 + y2) / 2;
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", `M${x1},${y1} C${x1},${m} ${x2},${m} ${x2},${y2 - 3}`);
    path.setAttribute("pathLength", "1");
    path.setAttribute("class", "ob-line" + (k.startsWith("ent-hola") && p.cadena ? " is-hot" : ""));
    svg.appendChild(path);
    if (!prevLines.has(k)) nuevas.push(path);
  });
  prevLines = now;
  return nuevas;
}

export const objetos: Escena = {
  title: "Dentro de un commit: blobs, trees y hashes",
  steps: [
    { title: "Cada archivo es un blob", text: "Git guarda el contenido de cada archivo como un <b>blob</b>, sin nombre. Su nombre es un hash SHA-1 de 40 caracteres calculado del contenido; casi siempre ves los 7 primeros.", ms: 8500 },
    { title: "Mismo contenido, mismo hash", text: "<code>hola.txt</code> y <code>copia.txt</code> dicen lo mismo, así que su hash es idéntico y Git guarda un solo blob para los dos.", ms: 7500 },
    { title: "El tree guarda los nombres", text: "Un <b>tree</b> es una carpeta: por cada entrada, permisos (<code>100644</code>), tipo, hash y nombre. Dos nombres apuntan al mismo blob. Una subcarpeta sería otro tree.", ms: 8500 },
    { title: "El commit apunta al tree", text: "El <b>commit</b> guarda el tree raíz, el hash de su padre, autor, fecha y mensaje. <code>git cat-file -p</code> te deja leer cualquier objeto.", ms: 8000 },
    { title: "Un carácter lo cambia todo", text: "Cambias <code>hola.txt</code>: nace un blob nuevo, así que cambia el hash en el tree, el tree tiene otro hash, y el commit también. <code>copia.txt</code> sigue en el blob viejo.", ms: 9000 },
    { title: "SHA-1 hoy, SHA-256 mañana", text: "Si alguien altera un objeto, su hash ya no coincide: la historia es verificable. Git 3.0 pasará a SHA-256 (64 caracteres) por defecto en repositorios nuevos.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("ob");
    term = consola(stage);
    board = document.createElement("div");
    board.className = "ob-board";
    stage.appendChild(board);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-sq"></i>objeto guardado en .git</span><span><i class="l-new"></i>objeto nuevo</span><span class="ob-lg-h">a1b2c3d hash (abreviado)</span><span><i class="l-ghost l-sq"></i>commit padre</span>`;
    stage.appendChild(leg);
    new ResizeObserver(() => { if (!tl || tl.progress() === 1) { prevLines = new Set(); lineas(PASOS[cur]); } }).observe(board);
  },

  go(i, instant) {
    cerrar(root, tl);
    limpiar(board);
    cur = i;
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const antes = foto(board);
    board.innerHTML = html(p);
    const d = term.show(p.cmd, t, 0, p.out || "");
    const nuevas = lineas(p);
    if (t) nuevas.forEach((l, k) => t.fromTo(l, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }, d + 0.35 + k * 0.12));
    mover(board, antes, t, d);
  },
};
