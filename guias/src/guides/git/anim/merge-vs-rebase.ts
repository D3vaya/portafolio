/*
  Animación: ¿merge o rebase? La misma situación resuelta dos veces: arriba con merge (commit M de dos
  padres, historia real con bifurcación), abajo con rebase (línea recta, copias con hash nuevo).
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Nodo } from "./_kit";
import "./merge-vs-rebase.css";

// la historia anterior a B no se dibuja: así caben las dos versiones en 5 columnas
const B = c("B", 0, 0), C = c("C", 1, 0, "B"), F = c("F", 2, 0, "C");
const D = c("D", 2, 1, "C"), E = c("E", 3, 1, "D");
const M = c("M", 4, 0, ["F", "E"]);
const Dp = c("D′", 3, 0, "F"), Ep = c("E′", 4, 0, "D′");

type Placa = { g: Grafo; note?: string; st?: "ok" | "warn" | "hl" | "dim" };
type Paso = { cmd: string; out?: string; top: Placa; bot: Placa };

const INI: Grafo = { nodes: [B, C, F, D, E], refs: [{ name: "main", at: "F" }, { name: "feature", at: "E" }], head: "feature" };
const conMerge = (d: Partial<Nodo> = {}, e: Partial<Nodo> = {}, m: Partial<Nodo> = {}): Grafo => ({
  nodes: [B, C, F, { ...D, ...d }, { ...E, ...e }, { ...M, ...m }], refs: [{ name: "main", at: "M" }, { name: "feature", at: "E" }], head: "main" });
const conRebase = (d: Partial<Nodo> = {}, e: Partial<Nodo> = {}, dp: Partial<Nodo> = {}, ep: Partial<Nodo> = {}): Grafo => ({
  nodes: [B, C, F, { ...D, tone: "ghost", ...d }, { ...E, tone: "ghost", ...e }, { ...Dp, tone: "copy", ...dp }, { ...Ep, tone: "copy", ...ep }],
  refs: [{ name: "main", at: "E′" }, { name: "feature", at: "E′", side: "down" }], head: "main" });

const LOG0 = "* f6a7b8c (main) corrige estilos\n| * e5f6a7b (HEAD -> feature) filtra resultados\n| * d4e5f6a agrega búsqueda\n|/\n* c3d4e5f agrega login";
const LOGM = "*   a9b8c7d (HEAD -> main) Merge branch 'feature'\n|\\\n| * e5f6a7b (feature) filtra resultados\n| * d4e5f6a agrega búsqueda\n* | f6a7b8c corrige estilos\n|/\n* c3d4e5f agrega login";
const LOGR = "* 7f0e4a5 (HEAD -> main, feature) filtra resultados\n* 9c1b2d3 agrega búsqueda\n* f6a7b8c corrige estilos\n* c3d4e5f agrega login";

const PASOS: Paso[] = [
  { cmd: "git log --oneline --graph --all", out: LOG0, top: { g: INI }, bot: { g: INI } },
  { cmd: "git switch main && git merge feature", out: "Merge made by the 'ort' strategy.",
    top: { g: conMerge({}, {}, { tone: "new" }), note: "commit M de dos padres", st: "hl" }, bot: { g: INI } },
  { cmd: "git rebase main && git switch main && git merge feature", out: "Fast-forward",
    top: { g: conMerge() }, bot: { g: conRebase(), note: "D′ y E′ en línea", st: "hl" } },
  { cmd: "",
    top: { g: conMerge({ tone: "ok", msg: "d4e5f6a" }, { tone: "ok", msg: "e5f6a7b" }), note: "mismos hashes", st: "ok" },
    bot: { g: conRebase({ msg: "d4e5f6a" }, { msg: "e5f6a7b" }, { msg: "9c1b2d3" }, { msg: "7f0e4a5" }), note: "hashes nuevos", st: "warn" } },
  { cmd: "git log --oneline --graph", out: LOGM, top: { g: conMerge(), note: "se ve la bifurcación", st: "hl" }, bot: { g: conRebase(), st: "dim" } },
  { cmd: "git log --oneline --graph", out: LOGR, top: { g: conMerge(), st: "dim" }, bot: { g: conRebase(), note: "una sola línea", st: "hl" } },
  { cmd: "", top: { g: conMerge(), note: "ramas compartidas", st: "ok" }, bot: { g: conRebase(), note: "tu rama, antes del PR", st: "ok" } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;
type P = { el: HTMLElement; g: ReturnType<typeof grafo>; note: HTMLElement };
let top: P, bot: P;

function placa(stage: HTMLElement, nombre: string, cmd: string): P {
  const el = document.createElement("div");
  el.className = "mr-plate";
  el.innerHTML = `<div class="mr-ph"><b>${nombre}</b><span class="mr-cmd">${cmd}</span><span class="mr-note"></span></div><div class="mr-g"></div>`;
  stage.appendChild(el);
  return { el, g: grafo(el.querySelector(".mr-g") as HTMLElement, { cols: 5, rows: 2, bottom: 72 }), note: el.querySelector(".mr-note") as HTMLElement };
}

function pon(p: P, s: Placa, t: gsap.core.Timeline | null, at: number) {
  p.g.render(s.g, t, at);
  p.note.textContent = s.note || "";
  p.el.dataset.st = s.st || "";
}

export const mergeVsRebase: Escena = {
  title: "Merge y rebase: mismo resultado, otra historia",
  steps: [
    { title: "La misma situación, dos veces", text: "Arriba y abajo, el mismo punto de partida: <code>main</code> avanzó a F y <code>feature</code> tiene D y E. Vamos a integrarlas de dos formas.", ms: 7500 },
    { title: "Merge: un commit que une", text: "Arriba, <code>git merge</code> crea M con dos padres: F y E. Nada se reescribe; la bifurcación queda registrada tal como pasó.", ms: 7500 },
    { title: "Rebase: una línea recta", text: "Abajo, <code>git rebase main</code> copia D y E encima de F como D′ y E′. Después, el merge es fast-forward: sin commit M.", ms: 8000 },
    { title: "Qué pasa con los hashes", text: "Merge conserva D y E con sus hashes. Rebase crea commits nuevos: los archivos finales son iguales, pero D y E quedan sin rama.", ms: 8000 },
    { title: "El log con merge", text: "<code>git log --graph</code> muestra las dos líneas y el commit que las une. Es fiel a lo que pasó, pero con muchas ramas se vuelve difícil de leer.", ms: 8500 },
    { title: "El log con rebase", text: "Con rebase, el log es una sola línea, como si todo se hubiera hecho en orden. Más fácil de leer y de recorrer con <code>git bisect</code>.", ms: 8000 },
    { title: "Cuándo usar cada uno", text: "Merge para integrar ramas compartidas. Rebase para poner al día tu rama local antes de abrir el PR. Squash para fusionar un PR como un solo commit.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("mr");
    top = placa(stage, "Con merge", "git merge feature");
    bot = placa(stage, "Con rebase", "git rebase main");
    // la consola va debajo: su salida cambia de alto y así no mueve los grafos
    term = consola(stage);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-copy"></i>copia (rebase)</span><span><i class="l-ghost"></i>sin rama</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const at = instant ? 0 : d;
    pon(top, p.top, t, at);
    pon(bot, p.bot, t, at);
  },
};
