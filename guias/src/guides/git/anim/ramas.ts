/*
  Animación: una rama es un puntero. Se crea una rama (aparece una etiqueta, nada se copia), cada
  commit mueve la rama donde está HEAD, las historias divergen y borrar la rama deja los commits
  sin nombre (no los borra en el momento).
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo } from "./_kit";
import "./ramas.css";

const A = c("A", 0, 0), B = c("B", 1, 0, "A"), C = c("C", 2, 0, "B");
const D = c("D", 3, 0, "C"), E = c("E", 3, 1, "C"), F = c("F", 4, 1, "E");

type Paso = { g: Grafo; cmd: string; out?: string };
const PASOS: Paso[] = [
  { cmd: "git log --oneline", out: "C (HEAD -> main) agrega login\nB crea el formulario\nA primer commit",
    g: { nodes: [A, B, C], refs: [{ name: "main", at: "C" }], head: "main" } },
  { cmd: "git branch feature",
    g: { nodes: [A, B, { ...C, tone: "hl" }], refs: [{ name: "main", at: "C" }, { name: "feature", at: "C", side: "down" }], head: "main" } },
  { cmd: 'git commit -m "corrige estilos"',
    g: { nodes: [A, B, C, { ...D, tone: "new" }], refs: [{ name: "main", at: "D" }, { name: "feature", at: "C", side: "down" }], head: "main" } },
  { cmd: "git switch feature", out: "Switched to branch 'feature'",
    g: { nodes: [A, B, C, D], refs: [{ name: "main", at: "D" }, { name: "feature", at: "C", side: "down" }], head: "feature" } },
  { cmd: 'git commit -m "agrega búsqueda"',
    g: { nodes: [A, B, C, D, { ...E, tone: "new" }], refs: [{ name: "main", at: "D" }, { name: "feature", at: "E" }], head: "feature" } },
  { cmd: 'git commit -m "filtra resultados"',
    g: { nodes: [A, B, C, D, E, { ...F, tone: "new" }], refs: [{ name: "main", at: "D" }, { name: "feature", at: "F" }], head: "feature" } },
  { cmd: "git switch main && git branch -D feature", out: "Deleted branch feature (was f3a91c2).",
    g: { nodes: [A, B, C, D, { ...E, tone: "ghost" }, { ...F, tone: "ghost" }], refs: [{ name: "main", at: "D" }], head: "main" } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;

export const ramas: Escena = {
  title: "Una rama es solo un nombre que apunta a un commit",
  steps: [
    { title: "Una historia de commits", text: "Cada círculo es un commit y apunta a su padre. <code>main</code> es una etiqueta pegada al último. <b>HEAD →</b> marca la rama en la que estás.", ms: 7000 },
    { title: "Crear una rama no copia nada", text: "<code>git branch feature</code> solo pega una etiqueta nueva en el commit actual. Git escribe un archivo diminuto con un hash: por eso crear ramas es instantáneo.", ms: 7500 },
    { title: "El commit mueve la rama actual", text: "Estás en <code>main</code> (HEAD apunta a ella). El commit nuevo D nace de C y la etiqueta <code>main</code> avanza sola. <code>feature</code> no se mueve.", ms: 7500 },
    { title: "Cambiar de rama mueve HEAD", text: "<code>git switch feature</code> cambia a qué rama apunta HEAD y deja tus archivos como estaban en C. Los commits no cambian.", ms: 7000 },
    { title: "Ahora avanza feature", text: "El commit E nace de C, porque ahí estaba <code>feature</code>. La historia se abre en dos caminos que comparten A, B y C.", ms: 7500 },
    { title: "Cada rama, su camino", text: "Otro commit en <code>feature</code>: solo esa etiqueta avanza. Puedes trabajar días en una rama sin tocar <code>main</code>.", ms: 6500 },
    { title: "Borrar la rama no borra los commits", text: "Sin etiqueta, E y F quedan sin nombre (punteados): ya no salen en <code>git log</code>, pero siguen ahí. Durante semanas puedes recuperarlos con <code>git reflog</code>.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("rm");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "rm-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 5, rows: 2 });
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-ghost"></i>sin rama que lo apunte</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    g.render(p.g, t, instant ? 0 : d);
  },
};
