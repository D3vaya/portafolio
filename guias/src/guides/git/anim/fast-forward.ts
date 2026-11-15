/*
  Animación: fusionar con fast-forward. Si main es ancestro directo de feature, `git merge feature`
  solo adelanta la etiqueta main (no crea commit). Contraste con `--no-ff`, que crea un commit de
  merge aunque no haga falta, y con `--ff-only`, que se niega si no se puede avanzar en línea recta.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Ref } from "./_kit";
import "./fast-forward.css";

// columnas a 0.9: deja aire a la derecha para la etiqueta "HEAD → main" sobre M

const B = c("B", 0, 0), C = c("C", 0.9, 0, "B");
const D = c("D", 1.8, 1, "C"), E = c("E", 2.7, 1, "D");
const M = c("M", 3.6, 0, ["C", "E"]);
const F = c("F", 1.8, 0, "C");

const r = (main: string, feature = "E"): Ref[] => [{ name: "main", at: main }, { name: "feature", at: feature }];

type Paso = { g: Grafo; cmd: string; out?: string; note?: string; bad?: boolean; ok?: boolean };
const PASOS: Paso[] = [
  { cmd: "git switch main", out: "Already on 'main'",
    g: { nodes: [B, C, D, E], refs: r("C"), head: "main" } },
  { cmd: "git merge feature", out: '<span class="ok">Updating 3c1f2a9..8e7d4b0\nFast-forward</span>\n buscar.js | 9 +++++++++\n 1 file changed, 9 insertions(+)',
    g: { nodes: [B, C, { ...D, tone: "ok" }, { ...E, tone: "ok" }], refs: r("E"), head: "main" },
    note: "✓ main solo avanzó: ningún commit nuevo", ok: true },
  { cmd: "git log --oneline", out: "8e7d4b0 (HEAD -> main, feature) filtra resultados\n5b20c6e agrega búsqueda\n3c1f2a9 agrega login\n9f0d7e2 crea el formulario",
    g: { nodes: [B, C, D, E], refs: r("E"), head: "main" }, note: "Historia en línea recta" },
  { cmd: "git reset --hard ORIG_HEAD", out: "HEAD is now at 3c1f2a9 agrega login",
    g: { nodes: [B, C, D, E], refs: r("C"), head: "main" }, note: "Rebobinado: main vuelve a C para comparar" },
  { cmd: "git merge --no-ff feature", out: "Merge made by the 'ort' strategy.\n buscar.js | 9 +++++++++\n 1 file changed, 9 insertions(+)",
    g: { nodes: [B, C, D, E, { ...M, tone: "new" }], refs: r("M"), head: "main" }, note: "M: commit de merge con dos padres" },
  { cmd: "git log --oneline --graph",
    out: '<span class="ff-pre">' + "*   a41e9d7 (HEAD -> main) Merge branch 'feature'\n|\\\n| * 8e7d4b0 (feature) filtra resultados\n| * 5b20c6e agrega búsqueda\n|/\n* 3c1f2a9 agrega login" + "</span>",
    g: { nodes: [B, C, D, E, M], refs: r("M"), head: "main" }, note: "La rama queda registrada en la historia" },
  { cmd: "git merge --ff-only feature", out: '<span class="bad">fatal: Not possible to fast-forward, aborting.</span>',
    g: { nodes: [B, C, F, D, E], refs: r("F"), head: "main" },
    note: "✕ main tiene su propio commit F: no hay línea recta", bad: true },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;
let note: HTMLElement;

export const fastForward: Escena = {
  title: "Fast-forward: la rama solo avanza",
  steps: [
    { title: "main se quedó atrás", text: "Estás en <code>main</code>, en C. <code>feature</code> tiene dos commits más, D y E, que salen justo de C. <code>main</code> no tiene nada propio desde entonces.", ms: 7000 },
    { title: "Merge sin commit nuevo", text: "<code>main</code> es ancestro directo de <code>feature</code>, así que Git solo adelanta la etiqueta hasta E. Eso es un <b>fast-forward</b>: no hay nada que combinar.", ms: 8000 },
    { title: "Una historia en línea recta", text: "Las dos ramas apuntan al mismo commit. En <code>git log</code> no queda rastro de que existió una rama aparte.", ms: 7000 },
    { title: "Rebobinemos para comparar", text: "<code>ORIG_HEAD</code> guarda dónde estaba <code>main</code> antes del merge. <code>reset --hard</code> la devuelve a C. Cuidado: descarta cambios sin commit.", ms: 8000 },
    { title: "--no-ff fuerza un commit de merge", text: "<code>git merge --no-ff feature</code> crea el commit M aunque no haga falta. Sirve para dejar registro de que esos commits llegaron juntos desde una rama.", ms: 8000 },
    { title: "Así se ve en el log", text: "El grafo muestra la rama que se abre y se vuelve a unir en M. Muchos equipos prefieren esto para revisar la historia por funcionalidad.", ms: 7500 },
    { title: "--ff-only: avanzar o nada", text: "Si <code>main</code> tiene su propio commit F, no hay línea recta. <code>--ff-only</code> se niega y no toca nada: es la forma segura de actualizar una rama.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("ff");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "ff-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 5, rows: 2, bottom: 80 });
    note = document.createElement("p");
    note.className = "ff-note";
    stage.appendChild(note);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-ok"></i>alcanzado por main</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const at = instant ? 0 : d;
    g.render(p.g, t, at);
    note.textContent = p.note || "";
    note.classList.toggle("is-bad", !!p.bad);
    note.classList.toggle("is-ok", !!p.ok);
    if (t && p.note) t.fromTo(note, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: p.bad ? "elastic.out(1, 0.5)" : "power3.out" }, at + 0.6);
    else gsap.set(note, { opacity: 1, y: 0 });
  },
};
