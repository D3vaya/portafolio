/*
  Animación: remotos. `git clone` copia toda la historia, crea origin/main (lo último que viste del
  servidor) y una rama local main que la sigue. Si alguien sube commits, origin/main no se mueve sola:
  Git no consulta el servidor hasta que se lo pides.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo } from "./_kit";
import "./remotos.css";

const A = c("A", 0, 0), B = c("B", 1, 0, "A"), C = c("C", 2, 0, "B");
const D = c("D", 3, 0, "C"), E = c("E", 4, 0, "D");

const URL = "https://github.com/ana/tienda.git";
type Placa = { g: Grafo; note?: string; st?: "ok" | "warn" | "hl" };
type Paso = { cmd: string; out?: string; gh: Placa; yo: Placa; wire?: string };

const GH0: Placa = { g: { nodes: [A, B, C], refs: [{ name: "main", at: "C" }] } };
const GH1: Placa = { g: { nodes: [A, B, C, { ...D, tone: "new" }, { ...E, tone: "new" }], refs: [{ name: "main", at: "E" }] }, note: "Luis subió D y E", st: "hl" };
const GH2: Placa = { g: { nodes: [A, B, C, D, E], refs: [{ name: "main", at: "E" }] } };
const YO: Grafo = { nodes: [A, B, C], refs: [{ name: "main", at: "C" }, { name: "origin/main", at: "C", kind: "remote", side: "down" }], head: "main" };

const PASOS: Paso[] = [
  { cmd: "", gh: GH0, yo: { g: { nodes: [] } } },
  { cmd: `git clone ${URL}`, out: "Cloning into 'tienda'...\nReceiving objects: 100% (9/9), done.",
    wire: "↓ copia A, B y C", gh: GH0,
    yo: { g: { nodes: [{ ...A, tone: "hl" }, { ...B, tone: "hl" }, { ...C, tone: "hl" }], refs: YO.refs, head: "main" }, note: "historia completa", st: "ok" } },
  { cmd: "git status", out: "On branch main\nYour branch is up to date with 'origin/main'.", gh: GH0, yo: { g: YO, note: "main sigue a origin/main" } },
  { cmd: "", gh: GH1, yo: { g: YO } },
  { cmd: "git status", out: "On branch main\nYour branch is up to date with 'origin/main'.", gh: GH1,
    yo: { g: YO, note: "origin/main sigue en C", st: "warn" } },
  { cmd: "git remote -v", out: `origin  ${URL} (fetch)\norigin  ${URL} (push)`, gh: GH2, yo: { g: YO } },
  { cmd: "git branch -vv", out: "* main 3f9c2a1 [origin/main] agrega carrito", gh: GH2, yo: { g: YO, note: "main → origin/main" } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;
type P = { el: HTMLElement; g: ReturnType<typeof grafo>; note: HTMLElement };
let gh: P, yo: P, wire: HTMLElement;

function placa(stage: HTMLElement, nombre: string, rows: number, bottom = 58, vacio = ""): P {
  const el = document.createElement("div");
  el.className = "rt-plate";
  el.innerHTML = `<div class="rt-ph"><b>${nombre}</b><span class="rt-note"></span></div><div class="rt-g"></div>` +
    (vacio ? `<p class="rt-empty">${vacio}</p>` : "");
  stage.appendChild(el);
  return { el, g: grafo(el.querySelector(".rt-g") as HTMLElement, { cols: 5, rows, bottom }), note: el.querySelector(".rt-note") as HTMLElement };
}

function pon(p: P, s: Placa, t: gsap.core.Timeline | null, at: number) {
  p.g.render(s.g, t, at);
  p.note.textContent = s.note || "";
  p.el.dataset.st = s.st || "";
  p.el.classList.toggle("is-empty", !s.g.nodes.length);
}

export const remotos: Escena = {
  title: "Un remoto es otra copia del repositorio",
  steps: [
    { title: "El repositorio vive en GitHub", text: "Tu equipo guarda el proyecto en GitHub. En tu computador todavía no hay nada.", ms: 6000 },
    { title: "clone copia toda la historia", text: "<code>git clone</code> descarga todos los commits, no solo los archivos de hoy. Crea <code>origin/main</code> (gris punteada) y una rama local <code>main</code> en el mismo commit.", ms: 8500 },
    { title: "main sigue a origin/main", text: "<code>origin/main</code> recuerda dónde estaba <code>main</code> en GitHub la última vez que preguntaste. Tu <code>main</code> la sigue (tracking): así Git sabe con qué compararte.", ms: 8500 },
    { title: "Un compañero sube commits", text: "Luis hace <code>git push</code> y GitHub ahora tiene D y E. En tu computador no cambia nada.", ms: 6500 },
    { title: "origin/main no se mueve sola", text: "<code>git status</code> dice que estás al día, pero solo compara con tu recuerdo. Git no consulta el servidor hasta que se lo pides con <code>git fetch</code> o <code>git pull</code>.", ms: 9000 },
    { title: "git remote -v lista los remotos", text: "<code>origin</code> es solo el nombre que <code>clone</code> le puso a la URL de donde copiaste. Puedes tener más remotos, cada uno con su nombre.", ms: 7500 },
    { title: "git branch -vv muestra el seguimiento", text: "Entre corchetes ves qué rama remota sigue cada rama local. Con <code>main</code> siguiendo a <code>origin/main</code>, basta escribir <code>git pull</code> o <code>git push</code>.", ms: 8000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("rt");
    term = consola(stage);
    gh = placa(stage, "GitHub (origin)", 1, 30);
    wire = document.createElement("div");
    wire.className = "rt-wire";
    stage.appendChild(wire);
    yo = placa(stage, "Tu computador", 1, 58, "Todavía no hay repositorio");
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>rama en GitHub</span><span><i class="l-remote"></i>rama remota (origin/…)</span><span><i class="l-new"></i>commit nuevo</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const at = instant ? 0 : d;
    pon(gh, p.gh, t, at);
    pon(yo, p.yo, t, at);
    wire.textContent = p.wire || "";
    wire.classList.toggle("is-on", !!p.wire);
  },
};
