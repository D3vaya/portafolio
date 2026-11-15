/*
  Animación: fetch, pull y push. fetch solo descarga y mueve origin/main; merge (o pull = fetch + merge)
  adelanta tu rama; push sube tus commits. Con historias divergentes, pull crea un merge o, con
  --rebase, rehace tu commit encima del remoto.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Ref } from "./_kit";
import "./sync.css";

const URL = "https://github.com/ana/tienda.git";
// fase 1: A…E
const A = c("A", 0, 0), B = c("B", 1, 0, "A"), C = c("C", 2, 0, "B"), D = c("D", 3, 0, "C"), E = c("E", 4, 0, "D");
// fase 2: se corre dos columnas para que quepa el merge
const C2 = c("C", 0, 0), D2 = c("D", 1, 0, "C"), E2 = c("E", 2, 0, "D");
// tu trabajo (F) va arriba; lo que llega de GitHub (G), abajo: así las etiquetas no chocan
const F = c("F", 3, 0, "E"), G = c("G", 3, 1, "E"), M = c("M", 4, 0, ["F", "G"]), Fp = c("F′", 4, 0, "G");
const GG = { ...G, y: 0 }; // en GitHub, G va en la línea principal

const om = (at: string, side?: "up" | "down"): Ref => ({ name: "origin/main", at, kind: "remote", side });
const yo = (nodes: Grafo["nodes"], main: string, origin: string, side: "up" | "down" = "down"): Grafo =>
  ({ nodes, refs: [{ name: "main", at: main }, om(origin, side)], head: "main" });

type Placa = { g: Grafo; note?: string; st?: "ok" | "hl" | "warn" };
type Paso = { cmd: string; out?: string; gh: Placa; yo: Placa; wire?: string };

const PASOS: Paso[] = [
  { cmd: "",
    gh: { g: { nodes: [A, B, C, { ...D, tone: "new" }], refs: [{ name: "main", at: "D" }] }, note: "Luis subió D", st: "hl" },
    yo: { g: yo([A, B, C], "C", "C") } },
  { cmd: "git fetch", out: `From ${URL}\n   3f9c2a1..8d0e4b7  main  -> origin/main`, wire: "↓ fetch descarga D",
    gh: { g: { nodes: [A, B, C, D], refs: [{ name: "main", at: "D" }] } },
    yo: { g: yo([A, B, C, { ...D, tone: "new" }], "C", "D"), note: "main y tus archivos siguen en C" } },
  { cmd: "git merge origin/main", out: "Updating 3f9c2a1..8d0e4b7\nFast-forward",
    gh: { g: { nodes: [A, B, C, D], refs: [{ name: "main", at: "D" }] } },
    yo: { g: yo([A, B, C, D], "D", "D"), note: "main avanza a D", st: "ok" } },
  { cmd: 'git commit -m "agrega cupones"',
    gh: { g: { nodes: [A, B, C, D], refs: [{ name: "main", at: "D" }] } },
    yo: { g: yo([A, B, C, D, { ...E, tone: "new" }], "E", "D") } },
  { cmd: "git push", out: `To ${URL}\n   8d0e4b7..b51a9e0  main -> main`, wire: "↑ push sube E",
    gh: { g: { nodes: [A, B, C, D, { ...E, tone: "new" }], refs: [{ name: "main", at: "E" }] }, note: "main avanza a E", st: "ok" },
    yo: { g: yo([A, B, C, D, E], "E", "E") } },
  { cmd: "git fetch && git status", out: "On branch main\nYour branch and 'origin/main' have diverged,\nand have 1 and 1 different commits each, respectively.",
    gh: { g: { nodes: [C2, D2, E2, { ...GG, tone: "new" }], refs: [{ name: "main", at: "G" }] }, note: "alguien subió G" },
    yo: { g: yo([C2, D2, E2, G, { ...F, tone: "new" }], "F", "G"), note: "divergen: F y G", st: "warn" } },
  { cmd: "git pull --no-rebase", out: "Merge made by the 'ort' strategy.",
    gh: { g: { nodes: [C2, D2, E2, GG], refs: [{ name: "main", at: "G" }] } },
    yo: { g: yo([C2, D2, E2, G, F, { ...M, tone: "new" }], "M", "G"), note: "commit de merge M" } },
  { cmd: "git pull --rebase", out: "Successfully rebased and updated refs/heads/main.",
    gh: { g: { nodes: [C2, D2, E2, GG], refs: [{ name: "main", at: "G" }] } },
    yo: { g: { nodes: [C2, D2, E2, G, { ...F, tone: "ghost" }, { ...Fp, tone: "copy" }], refs: [{ name: "main", at: "F′" }, om("G", "down")], head: "main" },
      note: "historia en línea", st: "ok" } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;
type P = { el: HTMLElement; g: ReturnType<typeof grafo>; note: HTMLElement };
let gh: P, me: P, wire: HTMLElement;

function placa(stage: HTMLElement, nombre: string, rows: number, bottom = 58): P {
  const el = document.createElement("div");
  el.className = "sy-plate";
  el.innerHTML = `<div class="sy-ph"><b>${nombre}</b><span class="sy-note"></span></div><div class="sy-g"></div>`;
  stage.appendChild(el);
  return { el, g: grafo(el.querySelector(".sy-g") as HTMLElement, { cols: 5, rows, bottom }), note: el.querySelector(".sy-note") as HTMLElement };
}

function pon(p: P, s: Placa, t: gsap.core.Timeline | null, at: number) {
  p.g.render(s.g, t, at);
  p.note.textContent = s.note || "";
  p.el.dataset.st = s.st || "";
}

export const sync: Escena = {
  title: "fetch trae, merge integra, push sube",
  steps: [
    { title: "GitHub tiene un commit nuevo", text: "Luis subió D. Tu computador no lo sabe: tu <code>origin/main</code> sigue en C.", ms: 6000 },
    { title: "fetch solo descarga", text: "<code>git fetch</code> trae D y mueve <code>origin/main</code>. Tu <code>main</code> y tus archivos no cambian: puedes mirar lo nuevo antes de integrarlo.", ms: 7500 },
    { title: "merge adelanta tu rama", text: "<code>git merge origin/main</code> lleva <code>main</code> hasta D (fast-forward). <code>git pull</code> hace las dos cosas de una vez: fetch más merge.", ms: 7500 },
    { title: "Haces tu propio commit", text: "E nace sobre D y mueve tu <code>main</code>. GitHub todavía no lo tiene: <code>origin/main</code> se queda en D.", ms: 6500 },
    { title: "push sube tus commits", text: "<code>git push</code> envía E, mueve <code>main</code> en GitHub y actualiza tu <code>origin/main</code>. Ahora las dos copias coinciden.", ms: 7000 },
    { title: "Cuando las historias divergen", text: "Tú hiciste F y alguien subió G, ambos sobre E. Ninguno contiene al otro, así que no hay fast-forward posible.", ms: 7500 },
    { title: "pull con merge", text: "Sin configuración, Git se detiene y te pide elegir. Con <code>--no-rebase</code> (o <code>pull.rebase false</code>) une todo con un commit de merge M de dos padres.", ms: 8500 },
    { title: "pull con rebase", text: "En vez del merge, <code>--rebase</code> rehace F como F′ encima de G: historia en línea. Para usarlo siempre: <code>git config --global pull.rebase true</code>.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("sy");
    term = consola(stage);
    gh = placa(stage, "GitHub (origin)", 1, 30);
    wire = document.createElement("div");
    wire.className = "sy-wire";
    stage.appendChild(wire);
    me = placa(stage, "Tu computador", 2);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-remote"></i>origin/main</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-copy"></i>copia (rebase)</span><span><i class="l-ghost"></i>sin rama</span>`;
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
    wire.classList.toggle("is-on", !!p.wire);
  },
};
