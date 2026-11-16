/*
  Animación: push rechazado. GitHub tiene un commit (D) que tú no tienes; aceptar tu push lo borraría,
  así que Git lo rechaza. Solución: pull --rebase y volver a hacer push. --force borraría D.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo } from "./_kit";
import "./push-rechazado.css";

const URL = "https://github.com/ana/tienda.git";
const A = c("A", 0, 0), B = c("B", 1, 0, "A"), C = c("C", 2, 0, "B"), D = c("D", 3, 0, "C"), E = c("E", 3, 0, "C");
const Ep = c("E′", 4, 0, "D");

type Placa = { g: Grafo; note?: string; st?: string; lost?: string[] };
type Paso = { cmd: string; out?: string; gh: Placa; yo: Placa; wire?: string; wst?: "bad" | "ok" };

const GH: Grafo = { nodes: [A, B, C, D], refs: [{ name: "main", at: "D" }] };
const YO: Grafo = { nodes: [A, B, C, E], refs: [{ name: "main", at: "E" }, { name: "origin/main", at: "C", kind: "remote", side: "down" }], head: "main" };
const RECH = `To ${URL}\n<span class="bad"> ! [rejected]        main -> main (fetch first)\nerror: failed to push some refs to '${URL}'</span>\n<span class="warn">hint: Updates were rejected because the remote contains work that you do\nhint: not have locally.</span>`;

const PASOS: Paso[] = [
  { cmd: "", gh: { g: GH, note: "Luis subió D" }, yo: { g: { ...YO, nodes: [A, B, C, { ...E, tone: "new" }] }, note: "tu commit E" } },
  { cmd: "git push", out: RECH, wire: "✕ E no sube", wst: "bad", gh: { g: GH, note: "✕ push rechazado", st: "bad" }, yo: { g: YO } },
  { cmd: "", wire: "main no puede saltar de D a E", wst: "bad",
    gh: { g: { ...GH, nodes: [A, B, C, { ...D, tone: "hl", msg: "no está en tu historia" }] }, note: "D quedaría fuera de main", st: "warn" },
    yo: { g: YO, note: "E viene de C, no de D" } },
  { cmd: "git push --force", out: `To ${URL}\n + 8d0e4b7...b51a9e0 main -> main (forced update)`, wire: "↑ --force reemplaza main", wst: "bad",
    gh: { g: { nodes: [A, B, C, { ...D, y: 1, msg: "se pierde" }, E], refs: [{ name: "main", at: "E" }] }, note: "hipotético: no lo hagas", st: "hypo", lost: ["D"] },
    yo: { g: { ...YO, refs: [{ name: "main", at: "E" }, { name: "origin/main", at: "E", kind: "remote", side: "down" }] } } },
  { cmd: "git pull --rebase", out: "Successfully rebased and updated refs/heads/main.", wire: "↓ trae D",
    gh: { g: GH },
    yo: { g: { nodes: [A, B, C, D, { ...E, y: 1, tone: "ghost" }, { ...Ep, tone: "copy" }],
      refs: [{ name: "main", at: "E′" }, { name: "origin/main", at: "D", kind: "remote", side: "down" }], head: "main" }, note: "E se rehace como E′ sobre D" } },
  { cmd: "git push", out: `To ${URL}\n<span class="ok">   8d0e4b7..c47d2f8  main -> main</span>`, wire: "↑ sube E′", wst: "ok",
    gh: { g: { nodes: [A, B, C, D, { ...Ep, tone: "new" }], refs: [{ name: "main", at: "E′" }] }, note: "✓ D y E′ conviven", st: "ok" },
    yo: { g: { nodes: [A, B, C, D, { ...E, y: 1, tone: "ghost" }, Ep],
      refs: [{ name: "main", at: "E′" }, { name: "origin/main", at: "E′", kind: "remote", side: "down" }], head: "main" } } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;
type P = { el: HTMLElement; g: ReturnType<typeof grafo>; note: HTMLElement };
let gh: P, me: P, wire: HTMLElement;

function placa(stage: HTMLElement, nombre: string, rows: number): P {
  const el = document.createElement("div");
  el.className = "pj-plate";
  el.innerHTML = `<div class="pj-ph"><b>${nombre}</b><span class="pj-note"></span></div><div class="pj-g"></div>`;
  stage.appendChild(el);
  return { el, g: grafo(el.querySelector(".pj-g") as HTMLElement, { cols: 5, rows, bottom: 44 }), note: el.querySelector(".pj-note") as HTMLElement };
}

function pon(p: P, s: Placa, t: gsap.core.Timeline | null, at: number) {
  p.g.render(s.g, t, at);
  p.note.textContent = s.note || "";
  p.el.dataset.st = s.st || "";
  // commits que se perderían: punteado rojo (la clase se rehace en cada render)
  p.g.svg.querySelectorAll(".gk-node").forEach((n) => {
    if (s.lost?.includes(n.querySelector(".gk-l")!.textContent!)) n.classList.add("pj-lost");
  });
}

export const pushRechazado: Escena = {
  title: "Git rechaza el push para no borrar trabajo ajeno",
  steps: [
    { title: "Dos commits sobre el mismo C", text: "Luis subió D a GitHub. Tú, sin saberlo, hiciste E. Los dos nacen de C.", ms: 6000 },
    { title: "git push es rechazado", text: "GitHub tiene trabajo que tú no tienes, así que Git rechaza el push (<code>fetch first</code>). No se sube nada y no se pierde nada.", ms: 8000 },
    { title: "Por qué dice que no", text: "Un push solo puede avanzar <code>main</code>. Pasar de D a E no es avanzar: D no está en la historia de E. Aceptarlo borraría D de GitHub.", ms: 8500 },
    { title: "Lo que haría --force", text: "Ejemplo de lo que no debes hacer: <code>--force</code> obliga a GitHub a apuntar <code>main</code> a E. D queda fuera (rojo) y Luis pierde su trabajo. Nunca en ramas compartidas.", ms: 9000 },
    { title: "La solución: pull --rebase", text: "<code>git pull --rebase</code> trae D y rehace tu commit encima: E′ tiene el mismo cambio que E, pero ahora viene de D.", ms: 7500 },
    { title: "Ahora push funciona", text: "E′ desciende de D, así que <code>main</code> en GitHub solo avanza. El trabajo de los dos queda en la historia.", ms: 7000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("pj");
    term = consola(stage);
    gh = placa(stage, "GitHub (origin)", 2);
    wire = document.createElement("div");
    wire.className = "pj-wire";
    stage.appendChild(wire);
    me = placa(stage, "Tu computador", 2);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-remote"></i>origin/main</span><span><i class="l-copy"></i>copia (rebase)</span><span><i class="l-ghost"></i>sin rama</span><span><i class="pj-l-lost"></i>trabajo perdido</span>`;
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
    wire.className = "pj-wire" + (p.wire ? " is-on" : "") + (p.wst ? " is-" + p.wst : "");
  },
};
