/*
  Animación: rebase interactivo. Cuatro commits desordenados se convierten en dos limpios editando la
  lista de tareas (pick, reword, fixup, squash, drop, mover líneas). Los commits nuevos tienen otro hash.
  Cierra con --fixup + --autosquash y el comando experimental git history.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo } from "./_kit";
import "./rebase-i.css";

const A = c("A", 0, 0), B = c("B", 1, 0, "A"), C = c("C", 2, 0, "B"), D = c("D", 3, 0, "C"), E = c("E", 4, 0, "D");
const F = c("F", 1, 0, "A", { tone: "copy" }), V = c("V", 2, 0, "F", { tone: "copy" }), Z = c("Z", 3, 0, "V");
const viejos = [B, C, D, E].map((n) => ({ ...n, y: 1, tone: "ghost" as const }));

type Linea = [cmd: string, hash: string, msg: string, hl?: boolean];
type Paso = { cmd: string; out?: string; g: Grafo; ed?: Linea[]; help?: number[] };

const ORIG: Grafo = { nodes: [A, B, C, D, E], refs: [{ name: "main", at: "A" }, { name: "feature", at: "E" }], head: "feature" };
const LIMPIO: Grafo = { nodes: [A, ...viejos, F, V], refs: [{ name: "main", at: "A" }, { name: "feature", at: "V" }], head: "feature" };
const HELP = [
  "p, pick &lt;commit&gt; = use commit",
  "r, reword &lt;commit&gt; = use commit, but edit the commit message",
  "s, squash &lt;commit&gt; = use commit, but meld into previous commit",
  "f, fixup [-C | -c] &lt;commit&gt; = like \"squash\" but keep only the previous commit's log message…",
  "d, drop &lt;commit&gt; = remove commit",
  "These lines can be re-ordered; they are executed from top to bottom.",
];
const L = (a: string, b: string, c3: string, d: string): Linea[] => [
  [a, "a1b2c3d", "wip", a !== "pick"], [b, "b2c3d4e", "arregla typo", b !== "pick"],
  [c3, "c3d4e5f", "agrega validación", c3 !== "pick"], [d, "d4e5f6a", "ahora sí", d !== "pick"],
];

const PASOS: Paso[] = [
  { cmd: "git log --oneline main..feature", out: "d4e5f6a ahora sí\nc3d4e5f agrega validación\nb2c3d4e arregla typo\na1b2c3d wip", g: ORIG },
  { cmd: "git rebase -i main", g: ORIG, ed: L("pick", "pick", "pick", "pick"), help: [] },
  { cmd: "git rebase -i main", g: ORIG, ed: L("reword", "fixup", "pick", "pick"), help: [1, 3] },
  { cmd: "git rebase -i main", g: ORIG, ed: L("reword", "fixup", "pick", "squash"), help: [2] },
  { cmd: "git rebase -i main", g: ORIG, ed: L("reword", "fixup", "pick", "squash").map((l) => [l[0], l[1], l[2], false] as Linea), help: [4, 5] },
  { cmd: "git log --oneline main..feature", out: "7c8d9e0 valida el email\n3e4f5a6 agrega formulario de contacto", g: LIMPIO },
  { cmd: "git commit --fixup=3e4f5a6 && git rebase -i --autosquash main",
    g: { nodes: [A, ...viejos, F, V, { ...Z, tone: "new" }], refs: [{ name: "main", at: "A" }, { name: "feature", at: "Z" }], head: "feature" },
    ed: [["pick", "3e4f5a6", "agrega formulario de contacto"], ["fixup", "9a8b7c6", "fixup! agrega formulario de contacto", true], ["pick", "7c8d9e0", "valida el email"]] },
  { cmd: "git history reword 3e4f5a6", g: { ...LIMPIO, nodes: [A, ...viejos, { ...F, tone: "hl" }, V] } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;
let ed: HTMLElement;

export const rebaseI: Escena = {
  title: "Rebase interactivo: ordena tus commits antes de compartirlos",
  steps: [
    { title: "Cuatro commits desordenados", text: "Tu rama <code>feature</code> tiene commits como \"wip\" o \"ahora sí\". Funcionan, pero cuentan mal la historia. Antes de abrir el PR, puedes ordenarlos.", ms: 7000 },
    { title: "La lista de tareas", text: "<code>git rebase -i main</code> (o <code>HEAD~4</code>) abre tu editor con una línea por commit. Ojo: el más viejo va arriba, al revés que <code>git log</code>.", ms: 8000 },
    { title: "reword y fixup", text: "Cambias la palabra del inicio. <code>reword</code> conserva \"wip\" pero te deja reescribir su mensaje. <code>fixup</code> (o <code>f</code>) mete \"arregla typo\" en el commit de arriba y descarta su mensaje.", ms: 9000 },
    { title: "squash une y te pregunta", text: "<code>squash</code> (o <code>s</code>) fusiona \"ahora sí\" con \"agrega validación\" y abre el editor con los dos mensajes. Escribes uno solo: \"valida el email\".", ms: 8500 },
    { title: "drop y mover líneas", text: "<code>drop</code> (o borrar la línea) elimina un commit. Mover una línea cambia el orden en que se aplican. Aquí no hace falta: guardas y cierras el editor.", ms: 8000 },
    { title: "Dos commits limpios", text: "Git rehace la rama: F (formulario) y V (validación), copias con hashes nuevos. Los cuatro originales quedan sin rama y siguen en <code>git reflog</code> si te arrepientes.", ms: 8500 },
    { title: "Atajo: --fixup y --autosquash", text: "¿Otro arreglo para F? <code>git commit --fixup=&lt;hash&gt;</code> crea \"fixup! …\" y <code>--autosquash</code> lo coloca solo bajo F en la lista. Solo te queda guardar.", ms: 8500 },
    { title: "Nuevo: git history", text: "Desde Git 2.54, el comando experimental <code>git history</code> hace estas ediciones sin rebase interactivo: <code>reword</code>, <code>split</code> y, desde 2.55, <code>fixup</code>. Si hubiera un conflicto, se detiene sin cambiar nada.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("ri");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "ri-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 5, rows: 2, bottom: 30 });
    ed = document.createElement("div");
    ed.className = "ri-ed";
    stage.appendChild(ed);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-copy"></i>commit reescrito</span><span><i class="l-ghost"></i>sin rama</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    g.render(p.g, t, instant ? 0 : d);

    ed.classList.toggle("is-on", !!p.ed);
    ed.innerHTML = !p.ed ? "" :
      `<div class="ri-eh">git-rebase-todo</div>` +
      p.ed.map(([cmd, h, m, hl]) => `<div class="ri-li${hl ? " is-hl" : ""}"><b class="ri-c c-${cmd}">${cmd}</b> <span class="ri-h">${h}</span> ${m}</div>`).join("") +
      (p.help ? `<div class="ri-help">` + HELP.map((l, k) => `<div class="${p.help!.includes(k) ? "is-hl" : ""}"># ${l}</div>`).join("") + `</div>` : "");
    if (t) {
      const hl = ed.querySelectorAll(".is-hl");
      if (hl.length) t.from(hl, { x: -8, opacity: 0.2, duration: 0.45, stagger: 0.25, ease: "power3.out" }, d);
      if (p.ed && i > 0 && !PASOS[i - 1].ed) t.from(ed, { opacity: 0, y: 8, duration: 0.4 }, 0);
    }
  },
};
