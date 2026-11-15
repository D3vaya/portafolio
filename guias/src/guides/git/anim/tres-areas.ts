/*
  Animación: las tres áreas de Git. Directorio de trabajo (tus archivos), staging o índice (la foto
  del próximo commit) y repositorio (.git, los commits guardados). git add copia solo lo elegido al
  staging; git commit convierte el staging en un commit y lo deja igual a ese commit.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import { foto, mover, volar, limpiar } from "./_basico";
import "./tres-areas.css";

type St = "" | "mod" | "new";
type F = [string, St];
type Cm = { id: string; msg: string; nuevo?: boolean };
type Vuelo = { de: string; a: string; at: number; html: string };
type Paso = { cmd: string; out?: string; w: F[]; s: F[]; repo: Cm[]; vuelos?: Vuelo[]; hl?: "status" | "log" };

const chip = (n: string, st: St) => `<span class="gk-file${st ? " f-" + st : ""}">${n}</span>`;
const A: Cm = { id: "A", msg: "primer commit" };
const B: Cm = { id: "B", msg: "agrega app.js y portada" };
const C: Cm = { id: "C", msg: "ajusta colores" };
const limpio: F[] = [["index.html", ""], ["estilos.css", ""]];
const limpio3: F[] = [["index.html", ""], ["estilos.css", ""], ["app.js", ""]];

const PASOS: Paso[] = [
  { cmd: "git status", out: "On branch main\nnothing to commit, working tree clean",
    w: limpio, s: limpio, repo: [A] },
  { cmd: "git status --short", out: '<span class="bad"> M</span> estilos.css\n<span class="bad"> M</span> index.html\n<span class="bad">??</span> app.js',
    w: [["index.html", "mod"], ["estilos.css", "mod"], ["app.js", "new"]], s: limpio, repo: [A] },
  { cmd: "git add index.html app.js",
    w: [["index.html", ""], ["estilos.css", "mod"], ["app.js", ""]], s: [["index.html", "mod"], ["estilos.css", ""], ["app.js", "new"]], repo: [A],
    vuelos: [{ de: "w:index.html", a: "s:index.html", at: 0, html: chip("index.html", "mod") }, { de: "w:app.js", a: "s:app.js", at: 0.25, html: chip("app.js", "new") }] },
  { cmd: "git status", hl: "status",
    out: 'On branch main\nChanges to be committed:\n<span class="ok">\tnew file:   app.js\n\tmodified:   index.html</span>\n\nChanges not staged for commit:\n<span class="bad">\tmodified:   estilos.css</span>',
    w: [["index.html", ""], ["estilos.css", "mod"], ["app.js", ""]], s: [["index.html", "mod"], ["estilos.css", ""], ["app.js", "new"]], repo: [A] },
  { cmd: 'git commit -m "agrega app.js y portada"', out: "[main 4b2d9e1] agrega app.js y portada\n 2 files changed, 14 insertions(+), 2 deletions(-)",
    w: [["index.html", ""], ["estilos.css", "mod"], ["app.js", ""]], s: limpio3, repo: [A, { ...B, nuevo: true }],
    vuelos: [{ de: "s:index.html", a: "c:B", at: 0, html: chip("index.html", "mod") }, { de: "s:app.js", a: "c:B", at: 0.2, html: chip("app.js", "new") }] },
  { cmd: 'git add estilos.css && git commit -m "ajusta colores"', out: "[main c81f0a2] ajusta colores\n 1 file changed, 3 insertions(+), 3 deletions(-)",
    w: limpio3, s: limpio3, repo: [A, B, { ...C, nuevo: true }],
    vuelos: [{ de: "w:estilos.css", a: "s:estilos.css", at: 0, html: chip("estilos.css", "mod") }, { de: "s:estilos.css", a: "c:C", at: 1.1, html: chip("estilos.css", "mod") }] },
  { cmd: "git log --oneline", hl: "log",
    out: '<span class="warn">c81f0a2</span> (<span class="hl">HEAD -> main</span>) ajusta colores\n<span class="warn">4b2d9e1</span> agrega app.js y portada\n<span class="warn">9a3c7d0</span> primer commit',
    w: limpio3, s: limpio3, repo: [A, B, C] },
];

const TAG: Record<St, string> = { "": "", mod: "modificado", new: "sin seguimiento" };

let root: HTMLElement;
let board: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

function html(p: Paso) {
  const files = (area: string, fs: F[], tags: boolean) => fs.map(([n, st]) =>
    `<div class="ta-f"><span class="gk-file${st ? " f-" + st : ""}" data-k="${area}:${n}" data-sig="${st}">${n}</span>${tags && st ? `<em class="t-${st}">${TAG[st]}</em>` : ""}</div>`).join("");
  const staged = p.s.some(([, st]) => st);
  const last = p.repo[p.repo.length - 1].id;
  const commits = p.repo.map((c) => `
    <div class="ta-cm${p.hl === "log" && c.id !== "A" ? " is-hl" : ""}">
      <span class="ta-refslot">${c.id === last ? `<span class="bx-ref is-head" data-k="ref">HEAD → main</span>` : ""}</span>
      <i class="bx-commit${c.nuevo ? " t-new" : ""}" data-k="c:${c.id}">${c.id}</i>
      <span class="ta-msg">${c.msg}</span>
    </div>`).join("");
  return `
    <section class="ta-col ta-w${p.hl === "status" ? " is-hl-bad" : ""}">
      <header class="ta-h"><b>Directorio de trabajo</b><span>tus archivos</span></header>
      <div class="ta-files">${files("w", p.w, true)}</div>
      ${p.hl === "status" ? `<p class="ta-lab is-bad">no rastreado para el commit</p>` : ""}
    </section>
    <section class="ta-col ta-s${p.hl === "status" ? " is-hl" : ""}">
      <header class="ta-h"><b>Staging (índice)</b><span>lo que irá en el próximo commit</span></header>
      <div class="ta-files">${files("s", p.s, false)}</div>
      ${p.hl === "status" ? `<p class="ta-lab is-ok">cambios a ser confirmados</p>` : staged ? "" : `<p class="ta-lab">igual al último commit</p>`}
    </section>
    <section class="ta-col ta-r">
      <header class="ta-h"><b>Repositorio (.git)</b><span>commits guardados</span></header>
      <div class="ta-commits">${commits}</div>
      ${p.hl === "log" ? `<p class="ta-lab is-ok">un commit, una idea</p>` : ""}
    </section>`;
}

export const tresAreas: Escena = {
  title: "Trabajo, staging y repositorio: las tres áreas",
  steps: [
    { title: "Tres lugares para tus archivos", text: "El <b>directorio de trabajo</b> es lo que editas. El <b>staging</b> arma el próximo commit. El <b>repositorio</b> guarda los commits. Hoy los tres coinciden.", ms: 8000 },
    { title: "Editas dos archivos y creas uno", text: "Cambias <code>index.html</code> y <code>estilos.css</code> (ámbar) y creas <code>app.js</code> (verde): Git aún no lo sigue. Todo pasa solo en tu directorio de trabajo.", ms: 7500 },
    { title: "Eliges qué preparar", text: "<code>git add index.html app.js</code> copia solo esos dos al staging. <code>estilos.css</code> sigue modificado en tu directorio, fuera del próximo commit.", ms: 7500 },
    { title: "git status resume las áreas", text: "En verde, lo que está en el staging y entrará al commit. En rojo, cambios que hiciste pero no preparaste. Léelo antes de cada commit.", ms: 8500 },
    { title: "El commit guarda el staging", text: "<code>git commit</code> convierte el staging en un commit nuevo (B). Desde ese momento el staging vuelve a ser igual al último commit. <code>estilos.css</code> espera su turno.", ms: 8500 },
    { title: "Otro commit, otra idea", text: "Ahora preparas <code>estilos.css</code> y haces otro commit, solo con ese cambio. Las tres áreas vuelven a coincidir.", ms: 7500 },
    { title: "Commits pequeños y con sentido", text: "Cambiaste muchas cosas a la vez, pero el staging te dejó guardarlas en dos commits, cada uno con una idea. Así el historial se lee y se deshace fácil.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("ta");
    term = consola(stage);
    board = document.createElement("div");
    board.className = "ta-board";
    stage.appendChild(board);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-mod"></i>modificado</span><span><i class="l-fnew"></i>nuevo</span><span><i class="l-fneutral"></i>sin cambios</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-head"></i>HEAD → rama actual</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    limpiar(board);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const antes = foto(board);
    board.innerHTML = html(p);
    const d = term.show(p.cmd, t, 0, p.out || "");
    const q = (k: string) => board.querySelector<HTMLElement>(`[data-k="${k}"]`);
    (p.vuelos || []).forEach((v) => {
      const dur = volar(board, q(v.de), q(v.a), v.html, t, d + v.at);
      const dest = q(v.a);
      if (dest && t) dest.dataset.d = String(Math.max(+(dest.dataset.d || 0), v.at + dur * 0.85));
    });
    mover(board, antes, t, d);
  },
};
