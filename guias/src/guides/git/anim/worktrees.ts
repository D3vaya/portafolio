/*
  Animación: worktrees en Git puro. Un solo repositorio (.git) con varias carpetas de trabajo
  enganchadas, cada una en su rama. Se trabaja en dos a la vez sin stash, los commits caen en el
  historial compartido, una rama no puede estar en dos worktrees y al final se lista y se borra uno.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import "./worktrees.css";

type Card = "off" | "on" | "err";
type St = {
  cards: [Card, Card, Card, Card]; // tienda, hotfix, review, intento fallido
  appMod: boolean; pagoMod: boolean;
  hotfix: number; hotNew?: boolean; // commits en hotfix/pago
  cmd: string; out?: string;
};
const PASOS: St[] = [
  { cards: ["on", "off", "off", "off"], appMod: true, pagoMod: false, hotfix: 0, cmd: "git worktree list", out: "/home/ana/tienda  3f9a2c1 [main]" },
  {
    cards: ["on", "on", "off", "off"], appMod: true, pagoMod: false, hotfix: 0, cmd: "git worktree add ../tienda-hotfix -b hotfix/pago",
    out: "Preparing worktree (new branch 'hotfix/pago')\nHEAD is now at 3f9a2c1 agrega login",
  },
  { cards: ["on", "on", "off", "off"], appMod: true, pagoMod: true, hotfix: 0, cmd: "cd ../tienda-hotfix && git status --short", out: '<span class="warn"> M pago.js</span>' },
  {
    cards: ["on", "on", "off", "off"], appMod: true, pagoMod: false, hotfix: 1, hotNew: true, cmd: 'git commit -am "corrige cobro doble"',
    out: "[hotfix/pago 7b21e4d] corrige cobro doble\n 1 file changed, 2 insertions(+)",
  },
  {
    cards: ["on", "on", "on", "off"], appMod: true, pagoMod: false, hotfix: 1, cmd: "git worktree add ../tienda-review feature/x",
    out: "Preparing worktree (checking out 'feature/x')\nHEAD is now at c90d4a1 agrega filtros",
  },
  {
    cards: ["on", "on", "on", "err"], appMod: true, pagoMod: false, hotfix: 1, cmd: "git worktree add ../tienda-otra feature/x",
    out: "<span class=\"bad\">fatal: 'feature/x' is already used by worktree at '/home/ana/tienda-review'</span>",
  },
  {
    cards: ["on", "on", "on", "off"], appMod: true, pagoMod: false, hotfix: 1, cmd: "git worktree list",
    out: "/home/ana/tienda         3f9a2c1 [main]\n/home/ana/tienda-hotfix  7b21e4d [hotfix/pago]\n/home/ana/tienda-review  c90d4a1 [feature/x]",
  },
  { cards: ["on", "off", "on", "off"], appMod: true, pagoMod: false, hotfix: 1, cmd: "git worktree remove ../tienda-hotfix" },
];

const CARDS = [
  { path: "tienda/", br: "main", git: ".git/ (el repositorio)" },
  { path: "../tienda-hotfix/", br: "hotfix/pago", git: ".git → archivo que apunta a tienda/.git" },
  { path: "../tienda-review/", br: "feature/x", git: ".git → archivo que apunta a tienda/.git" },
  { path: "../tienda-otra/", br: "feature/x", git: "✕ rama ocupada" },
];
const LANES: [string, number][] = [["main", 3], ["hotfix/pago", 0], ["feature/x", 2]];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

export const worktrees: Escena = {
  title: "Un repositorio, varias carpetas de trabajo",
  steps: [
    { title: "Un repo, una carpeta de trabajo", text: "Estás en <code>main</code> con <code>app.js</code> a medio cambiar. El repositorio vive en <code>tienda/.git</code> y tiene tres ramas.", ms: 6500 },
    { title: "Un hotfix sin stash", text: "Llega una urgencia. <code>git worktree add ../tienda-hotfix -b hotfix/pago</code> crea otra carpeta y una rama nueva. Tu cambio en <code>app.js</code> sigue intacto.", ms: 8000 },
    { title: "Dos carpetas a la vez", text: "Editas <code>pago.js</code> en la carpeta del hotfix. Cada worktree tiene sus propios archivos, su staging y su HEAD; nada se pisa.", ms: 7000 },
    { title: "Un solo historial", text: "El commit en <code>tienda-hotfix</code> entra al repositorio compartido. Desde <code>tienda/</code> ya lo ves con <code>git log hotfix/pago</code>, sin push ni fetch.", ms: 8000 },
    { title: "Una tercera para revisar", text: "Sin <code>-b</code>, <code>git worktree add</code> abre una rama que ya existe. Ahora revisas <code>feature/x</code> en su carpeta mientras las otras siguen como estaban.", ms: 7500 },
    { title: "Una rama, un solo worktree", text: "Git no deja la misma rama en dos worktrees a la vez: un commit en uno movería la rama bajo los pies del otro.", ms: 7500 },
    { title: "Ver todos los worktrees", text: "<code>git worktree list</code> muestra cada carpeta con su commit y su rama. Todas comparten objetos, ramas y remotos.", ms: 6500 },
    { title: "Borrar la carpeta, no la rama", text: "<code>git worktree remove</code> borra la carpeta. La rama <code>hotfix/pago</code> y su commit siguen en el repo. Si hay cambios sin commit, Git se niega salvo con <code>--force</code>.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("wk");
    term = consola(stage);
    const board = document.createElement("div");
    board.className = "wk-board";
    board.innerHTML = `
      <div class="wk-cards">${CARDS.map((c, n) => `
        <section class="wk-card" data-n="${n}">
          <div class="wk-top"><b class="wk-path">${c.path}</b><span class="wk-br">HEAD → ${c.br}</span></div>
          <span class="wk-git">${c.git}</span>
          ${n < 3 ? `<div class="wk-files"><span class="gk-file" data-f="app">app.js</span><span class="gk-file" data-f="pago">pago.js</span></div>` : ""}
        </section>`).join("")}
      </div>
      <div class="wk-repo"><span class="wk-rl">tienda/.git · un solo repositorio para todas las carpetas</span>
        ${LANES.map(([b, n], k) => `<div class="wk-lane" data-l="${k}"><span class="wk-bn">${b}</span><span class="wk-dots">${"<i></i>".repeat(n)}</span></div>`).join("")}
      </div>`;
    stage.appendChild(board);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD de cada carpeta</span><span><i class="l-mod"></i>archivo modificado</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-conflict"></i>error</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const s = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(s.cmd, t, 0, s.out || "");
    const cards = root.querySelectorAll<HTMLElement>(".wk-card");
    cards.forEach((el, n) => {
      const st = s.cards[n];
      const was = el.dataset.st || "off";
      el.dataset.st = st;
      if (t && st !== "off" && was === "off") {
        t.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: st === "err" ? "elastic.out(1, 0.5)" : "power3.out", clearProps: "opacity,transform" }, d);
      }
      if (t && st === "off" && was !== "off") {
        el.dataset.st = was;
        t.to(el, { opacity: 0, scale: 0.94, duration: 0.45, ease: "power2.in" }, d);
        t.call(() => { el.dataset.st = "off"; gsap.set(el, { clearProps: "opacity,transform" }); }, [], d + 0.46);
      }
    });
    const f = (n: number, k: string) => root.querySelector(`.wk-card[data-n="${n}"] [data-f="${k}"]`)!;
    [0, 1, 2].forEach((n) => { f(n, "app").classList.remove("f-mod"); f(n, "pago").classList.remove("f-mod"); });
    if (s.appMod) f(0, "app").classList.add("f-mod");
    if (s.pagoMod) f(1, "pago").classList.add("f-mod");

    const lane = root.querySelector('[data-l="1"] .wk-dots') as HTMLElement;
    const had = lane.children.length;
    lane.innerHTML = "<i></i>".repeat(s.hotfix);
    if (s.hotNew && s.hotfix) {
      const dot = lane.lastElementChild as HTMLElement;
      dot.classList.add("is-new");
      if (t && had < s.hotfix) t.fromTo(dot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)", clearProps: "all" }, d + 0.1);
    }
  },
};
