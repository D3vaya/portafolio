/*
  Animación: qué compara cada git diff. Tres versiones de saludo.js (trabajo, staging y HEAD). Un
  arco une las dos versiones que compara cada comando y abajo sale su diff (líneas quitadas con ✕,
  agregadas con +). Después, diff entre ramas y git log -p.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import { foto, mover, limpiar } from "./_basico";
import "./diff.css";

const V1 = 'let s = "Hola";';
const V2 = 'let s = "Hola, Ana";';
const V3 = 'let s = "¡Hola, Ana!";';

type Caja = { k: string; t: string; sub: string; code: string[]; commit?: string };
type Linea = [" " | "-" | "+", string];
type Paso = { cmd: string; out?: string; cajas: Caja[]; arco?: [string, string]; diff?: Linea[]; nota?: string };

const TRABAJO: Caja = { k: "w", t: "Trabajo", sub: "tu archivo", code: [V3] };
const STAGING: Caja = { k: "s", t: "Staging", sub: "próximo commit", code: [V2] };
const HEAD: Caja = { k: "h", t: "HEAD", sub: "último commit", code: [V1] };
const TRES = [TRABAJO, STAGING, HEAD];

const PASOS: Paso[] = [
  { cmd: "git status --short", out: '<span class="ok">M</span><span class="bad">M</span> saludo.js', cajas: TRES,
    nota: "<b>Tres versiones del mismo archivo.</b> La primera M (verde) dice que hay cambios en el staging; la segunda (roja), que el trabajo cambió otra vez después." },
  { cmd: "git diff", cajas: TRES, arco: ["w", "s"], diff: [["-", V2], ["+", V3]] },
  { cmd: "git diff --staged", cajas: TRES, arco: ["s", "h"], diff: [["-", V1], ["+", V2]] },
  { cmd: "git diff HEAD", cajas: TRES, arco: ["w", "h"], diff: [["-", V1], ["+", V3]] },
  { cmd: "git diff main feature", arco: ["m", "f"],
    cajas: [{ k: "m", t: "main", sub: "último commit de la rama", code: [V1], commit: "C" }, { k: "f", t: "feature", sub: "último commit de la rama", code: [V1, "alert(s);"], commit: "E" }],
    diff: [[" ", V1], ["+", "alert(s);"]] },
  { cmd: "git log -p -1", out: 'commit <span class="warn">3f9a2c1</span> (<span class="hl">HEAD -> main</span>)\nAuthor: Ana &lt;ana@ejemplo.com&gt;\n\n    saluda por nombre', arco: ["b", "c"],
    cajas: [{ k: "b", t: "B", sub: "el padre", code: [V1], commit: "B" }, { k: "c", t: "C", sub: "el commit", code: [V2], commit: "C" }],
    diff: [["-", V1], ["+", V2]] },
];

let root: HTMLElement;
let board: HTMLElement;
let cur = 0;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function html(p: Paso, i: number) {
  const cajas = p.cajas.map((c) => `
    <section class="df-box${p.arco?.includes(c.k) ? " is-on" : ""}" data-k="box-${c.k}">
      <header>${c.commit ? `<i class="bx-commit">${c.commit}</i>` : ""}<b>${c.t}</b><span>${c.sub}</span></header>
      <div class="df-code"><span class="df-fn">saludo.js</span>${c.code.map((l) => `<code>${esc(l)}</code>`).join("")}</div>
    </section>`).join("");
  const diff = p.diff
    ? `<div class="df-diff"><span class="df-fn">saludo.js</span>${p.diff.map(([m, l], n) => `
        <div class="df-l${m === "-" ? " is-del" : m === "+" ? " is-add" : ""}" data-k="l${i}-${n}" data-d="${0.5 + n * 0.3}">
          <i>${m === "-" ? "✕" : m === "+" ? "+" : ""}</i><code>${m}${esc(l)}</code></div>`).join("")}</div>`
    : `<p class="bx-note df-nota" data-k="nota${i}">${p.nota}</p>`;
  return `
    <div class="df-row${p.cajas.length === 2 ? " is-two" : ""}">
      <svg class="df-arc" aria-hidden="true"><path class="df-arc-p" pathLength="1"/><text class="df-arc-t" text-anchor="middle">compara</text></svg>
      ${cajas}
    </div>
    ${diff}`;
}

/** Dibuja el arco entre las dos cajas comparadas. Devuelve el path para animarlo. */
function arco(p: Paso) {
  const row = board.querySelector<HTMLElement>(".df-row")!;
  const svg = row.querySelector("svg")!, path = svg.querySelector("path")!, txt = svg.querySelector("text")!;
  svg.style.display = p.arco ? "" : "none";
  if (!p.arco) return null;
  const base = row.getBoundingClientRect();
  const box = (k: string) => row.querySelector<HTMLElement>(`[data-k="box-${k}"]`)!.getBoundingClientRect();
  const a = box(p.arco[0]), b = box(p.arco[1]);
  const x1 = a.left - base.left + a.width / 2, x2 = b.left - base.left + b.width / 2;
  const y = a.top - base.top - 4, top = Math.max(8, y - 14 - Math.min(40, Math.abs(x2 - x1) * 0.12));
  svg.setAttribute("viewBox", `0 0 ${base.width} ${base.height}`);
  path.setAttribute("d", `M${x1},${y} C${x1},${top} ${x2},${top} ${x2},${y}`);
  txt.setAttribute("x", String((x1 + x2) / 2));
  txt.setAttribute("y", String(top + (y - top) * 0.25 - 4));
  return path;
}

export const diff: Escena = {
  title: "Qué compara cada git diff",
  steps: [
    { title: "Tres versiones de saludo.js", text: "Preparaste un cambio con <code>git add</code> y después volviste a editar. Ahora hay una versión en el último commit, otra en el staging y otra en tu directorio.", ms: 8000 },
    { title: "git diff: lo que no preparaste", text: "Sin argumentos, <code>git diff</code> compara tu directorio de trabajo con el staging: muestra los cambios que aún no agregaste con <code>git add</code>.", ms: 7500 },
    { title: "--staged: lo que irá al commit", text: "<code>git diff --staged</code> (o <code>--cached</code>) compara el staging con el último commit. Revísalo antes de hacer commit.", ms: 7500 },
    { title: "HEAD: todo lo que cambió", text: "<code>git diff HEAD</code> compara tu directorio con el último commit: lo preparado y lo no preparado, junto.", ms: 7000 },
    { title: "También entre commits y ramas", text: "<code>git diff main feature</code> compara las fotos de los últimos commits de dos ramas. Las líneas sin signo son contexto: no cambiaron.", ms: 8000 },
    { title: "El historial con sus cambios", text: "<code>git log -p</code> muestra cada commit con su diff contra el padre. Con <code>-1</code>, solo el último.", ms: 7000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("df");
    term = consola(stage);
    board = document.createElement("div");
    board.className = "df-board";
    stage.appendChild(board);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-new"></i>versiones que compara el comando</span><span class="df-lg-del">✕ línea quitada (−)</span><span class="df-lg-add">+ línea agregada</span>`;
    stage.appendChild(leg);
    new ResizeObserver(() => { if (!tl || tl.progress() === 1) arco(PASOS[cur]); }).observe(board);
  },

  go(i, instant) {
    cerrar(root, tl);
    limpiar(board);
    cur = i;
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const antes = foto(board);
    board.innerHTML = html(p, i);
    const d = term.show(p.cmd, t, 0, p.out || "");
    const path = arco(p);
    if (t && path) {
      t.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, d + 0.1);
      t.from(path.nextElementSibling, { opacity: 0, duration: 0.3 }, d + 0.5);
    }
    mover(board, antes, t, d);
  },
};
