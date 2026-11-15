/*
  Animación: push forzado seguro. Tras un rebase, push normal es rechazado. --force-with-lease solo
  sobrescribe si la rama remota sigue donde la viste (origin/feature); si alguien subió algo, rechaza y
  lo protege. --force lo borraría. --force-if-includes cubre el caso de un fetch en segundo plano.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Nodo } from "./_kit";
import "./force-lease.css";

const URL = "github.com:ana/tienda.git";
const A = c("A", 0, 0), D = c("D", 1, 0, "A");
const B = c("B", 1, 1, "A"), C = c("C", 2, 1, "B"), X = c("X", 3, 1, "C");
const Bp = c("B′", 2, 0, "D"), Cp = c("C′", 3, 0, "B′");

type Placa = { g: Grafo; note?: string; st?: string; lost?: string[]; safe?: string[] };
type Paso = { cmd: string; out?: string; gh: Placa; yo: Placa; wire?: string; wst?: "bad" | "ok" };

const main = { name: "main", at: "D" };
const fea = (at: string) => ({ name: "feature", at });
const ofea = (at: string) => ({ name: "origin/feature", at, kind: "remote" as const, side: "down" as const });
const yo = (nodes: Nodo[], origin: string): Grafo => ({ nodes, refs: [main, fea("C′"), ofea(origin)], head: "feature" });

const GH_VIEJO: Grafo = { nodes: [A, D, B, C], refs: [main, fea("C")] };
const GH_X: Grafo = { nodes: [A, D, B, C, X], refs: [main, fea("X")] };
const YO_REB = yo([A, D, B, C, { ...Bp, tone: "copy" }, { ...Cp, tone: "copy" }], "C");
const FAIL = `To ${URL}\n<span class="bad"> ! [rejected]        feature -> feature`;

const PASOS: Paso[] = [
  { cmd: "git rebase main", out: "Successfully rebased and updated refs/heads/feature.",
    gh: { g: GH_VIEJO, note: "versión vieja: B y C" }, yo: { g: YO_REB, note: "B′ y C′ sobre D" } },
  { cmd: "git push", out: `${FAIL} (non-fast-forward)</span>\n<span class="warn">hint: Updates were rejected because the tip of your current branch is behind\nhint: its remote counterpart.</span>`,
    wire: "✕ no es avance", wst: "bad", gh: { g: GH_VIEJO, note: "✕ rechazado", st: "bad" }, yo: { g: YO_REB } },
  { cmd: "git push --force-with-lease", out: `To ${URL}\n<span class="ok"> + 5e6f7a8...9a0b1c2 feature -> feature (forced update)</span>`,
    wire: "✓ GitHub sigue en C, como esperabas", wst: "ok",
    gh: { g: { nodes: [A, D, { ...B, tone: "ghost" }, { ...C, tone: "ghost" }, { ...Bp, tone: "new" }, { ...Cp, tone: "new" }], refs: [main, fea("C′")] }, note: "✓ caso A: aceptado", st: "ok" },
    yo: { g: yo([A, D, { ...B, tone: "ghost" }, { ...C, tone: "ghost" }, Bp, Cp], "C′") } },
  { cmd: "", gh: { g: { ...GH_X, nodes: [A, D, B, C, { ...X, tone: "new" }] }, note: "caso B: Luis subió X", st: "hl" },
    yo: { g: YO_REB, note: "origin/feature sigue en C" } },
  { cmd: "git push --force-with-lease", out: `${FAIL} (stale info)\nerror: failed to push some refs to '${URL}'</span>`,
    wire: "esperaba C, encontró X: no sobrescribe", wst: "ok",
    gh: { g: { ...GH_X, nodes: [A, D, B, C, X] }, note: "✓ X protegido", st: "ok", safe: ["X"] }, yo: { g: YO_REB } },
  { cmd: "git push --force", out: `To ${URL}\n + 7b8c9d0...9a0b1c2 feature -> feature (forced update)`, wire: "↑ --force no revisa nada", wst: "bad",
    gh: { g: { nodes: [A, D, { ...B, tone: "ghost" }, { ...C, tone: "ghost" }, { ...X, msg: "se pierde" }, Bp, Cp], refs: [main, fea("C′")] },
      note: "hipotético: no lo hagas", st: "hypo", lost: ["X"] },
    yo: { g: YO_REB } },
  { cmd: "git push --force-with-lease --force-if-includes", out: `${FAIL} (remote ref updated since checkout)</span>`,
    wire: "X no está en tu rama: no sobrescribe", wst: "ok",
    gh: { g: { ...GH_X, nodes: [A, D, B, C, X] }, note: "✓ X protegido", st: "ok", safe: ["X"] },
    yo: { g: yo([A, D, B, C, { ...X, tone: "new" }, Bp, Cp], "X"), note: "un fetch automático trajo X", st: "warn" } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;
type P = { el: HTMLElement; g: ReturnType<typeof grafo>; note: HTMLElement };
let gh: P, me: P, wire: HTMLElement;

function placa(stage: HTMLElement, nombre: string): P {
  const el = document.createElement("div");
  el.className = "fl-plate";
  el.innerHTML = `<div class="fl-ph"><b>${nombre}</b><span class="fl-note"></span></div><div class="fl-g"></div>`;
  stage.appendChild(el);
  return { el, g: grafo(el.querySelector(".fl-g") as HTMLElement, { cols: 5, rows: 2 }), note: el.querySelector(".fl-note") as HTMLElement };
}

function pon(p: P, s: Placa, t: gsap.core.Timeline | null, at: number) {
  p.g.render(s.g, t, at);
  p.note.textContent = s.note || "";
  p.el.dataset.st = s.st || "";
  // marcas de la escena (la clase se rehace en cada render)
  p.g.svg.querySelectorAll(".gk-node").forEach((n) => {
    const id = n.querySelector(".gk-l")!.textContent!;
    if (s.lost?.includes(id)) n.classList.add("fl-lost");
    if (s.safe?.includes(id)) n.classList.add("fl-safe");
  });
}

export const forceLease: Escena = {
  title: "Forzar un push sin pisar a nadie",
  steps: [
    { title: "Reescribiste tu rama", text: "Hiciste rebase de <code>feature</code> sobre <code>main</code>: ahora tienes B′ y C′. GitHub todavía tiene la versión vieja, B y C.", ms: 7000 },
    { title: "git push es rechazado", text: "C′ no desciende de C, así que subirlo no es avanzar la rama (<code>non-fast-forward</code>). Para reemplazar la versión vieja tienes que forzar.", ms: 7500 },
    { title: "Caso A: --force-with-lease funciona", text: "Antes de sobrescribir, Git comprueba que <code>feature</code> en GitHub sigue donde dice tu <code>origin/feature</code> (C). Coincide, así que acepta.", ms: 8000 },
    { title: "Caso B: alguien subió X", text: "Volvamos atrás. Mientras hacías el rebase, Luis subió X a <code>feature</code>. Tu <code>origin/feature</code> sigue en C: no lo sabes.", ms: 7000 },
    { title: "--force-with-lease rechaza", text: "Esperaba C y encontró X: rechaza con <code>stale info</code> y X queda a salvo. Haz <code>git fetch</code>, integra X y vuelve a intentarlo.", ms: 8000 },
    { title: "--force lo habría borrado", text: "Ejemplo de lo que no debes hacer: <code>--force</code> no comprueba nada. <code>feature</code> pasa a C′ y X queda fuera (rojo): el trabajo de Luis desaparece.", ms: 8000 },
    { title: "Complemento: --force-if-includes", text: "Si tu editor hace <code>fetch</code> solo, <code>origin/feature</code> ya apunta a X y el lease pasaría. <code>--force-if-includes</code> además exige que X esté integrado en tu rama.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("fl");
    term = consola(stage);
    gh = placa(stage, "GitHub (origin)");
    wire = document.createElement("div");
    wire.className = "fl-wire";
    stage.appendChild(wire);
    me = placa(stage, "Tu computador");
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-remote"></i>origin/feature</span><span><i class="l-copy"></i>copia (rebase)</span><span><i class="l-ghost"></i>sin rama</span><span><i class="fl-l-safe"></i>protegido</span><span><i class="fl-l-lost"></i>trabajo perdido</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const at = instant ? 0 : d;
    pon(gh, p.gh, t, at);
    pon(me, p.yo, t, at);
    wire.textContent = p.wire || "";
    wire.className = "fl-wire" + (p.wire ? " is-on" : "") + (p.wst ? " is-" + p.wst : "");
  },
};
