/*
  Animación: git revert. En una rama compartida, C introdujo un bug. revert crea un commit nuevo que
  aplica el cambio inverso: la historia no se reescribe y el push es normal. Contraste con reset,
  que reescribe la historia y obliga a forzar el push. Al final, revert de un merge con -m 1.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Ref } from "./_kit";
import "./revert.css";

const A = c("A", 0, 0), B = c("B", 1, 0, "A"), C = c("C", 2, 0, "B", { msg: "descuento" }), D = c("D", 3, 0, "C", { msg: "README" });
const Cbug = { ...C, tone: "conflict" as const, msg: "✕ bug" };
const R = c("R", 4, 0, "D", { label: "C̄", msg: "Revert" });

const refs = (main: string, origin: string): Ref[] => [
  { name: "main", at: main },
  { name: "origin/main", at: origin, kind: "remote", side: "down" },
];

type Paso = { g: Grafo; cmd: string; out?: string };
const PASOS: Paso[] = [
  { cmd: "git log --oneline",
    out: "8d4e1b0 (HEAD -> main, origin/main) actualiza README\n3f2a9c1 agrega descuento\n5c7d2e9 crea el carrito\n1a0b4f3 primer commit",
    g: { nodes: [A, B, C, D], refs: refs("D", "D"), head: "main" } },
  { cmd: "git show --stat 3f2a9c1", out: "commit 3f2a9c1\n    agrega descuento\n\n src/precios.js | 4 ++--",
    g: { nodes: [A, B, Cbug, D], refs: refs("D", "D"), head: "main" } },
  { cmd: "git revert 3f2a9c1",
    out: '<span class="hl">Revert "agrega descuento"\n\nThis reverts commit 3f2a9c1.</span>\n[main b7c0e22] Revert "agrega descuento"',
    g: { nodes: [A, B, Cbug, D, { ...R, tone: "ok" }], refs: refs("R", "D"), head: "main" } },
  { cmd: "git show b7c0e22",
    out: 'Revert "agrega descuento"\n<span class="bad">-  total = aplicarDescuento(total)</span>\n<span class="ok">+  total = redondear(total)</span>',
    g: { nodes: [A, B, Cbug, D, { ...R, tone: "ok" }], refs: refs("R", "D"), head: "main" } },
  { cmd: "git push", out: "To github.com:equipo/tienda.git\n   8d4e1b0..b7c0e22  main -> main",
    g: { nodes: [A, B, Cbug, D, { ...R, tone: "ok" }], refs: refs("R", "R"), head: "main" } },
  { cmd: "git reset --hard HEAD~2 && git push",
    out: 'To github.com:equipo/tienda.git\n<span class="bad"> ! [rejected]        main -> main (non-fast-forward)</span>\nhint: Updates were rejected because the tip of your current branch is behind',
    g: { nodes: [A, B, Cbug, { ...D, tone: "dim" }], refs: refs("B", "D"), head: "main" } },
  { cmd: "git revert -m 1 a7d3e90",
    out: '[main 2e6f0a1] Revert "Merge branch \'pagos\'"',
    g: { nodes: [A, B, c("P", 1, 1, "A", { msg: "pagos", tone: "dim" }), c("Q", 2, 1, "P", { tone: "dim" }),
      c("M", 3, 0, ["B", "Q"], { msg: "merge" }), c("Mr", 4, 0, "M", { label: "M̄", tone: "ok", msg: "Revert" })],
      refs: [{ name: "main", at: "Mr" }], head: "main" } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;

export const revert: Escena = {
  title: "Deshacer un commit sin reescribir la historia",
  steps: [
    { title: "Una rama compartida", text: "<code>main</code> ya está en GitHub: <code>origin/main</code> apunta al mismo commit y tus compañeros tienen esta historia.", ms: 6500 },
    { title: "C introdujo un bug", text: "El commit C, <code>agrega descuento</code>, rompió los precios. Ya tiene un commit encima (D), así que no basta con corregir el último.", ms: 7000 },
    { title: "revert crea un commit nuevo", text: "<code>git revert</code> no borra C: crea C̄, un commit que aplica el cambio inverso. Git propone este mensaje y abre el editor para que lo confirmes.", ms: 8500 },
    { title: "El cambio inverso", text: "Lo que C agregó, C̄ lo quita; lo que C quitó, C̄ lo devuelve. C sigue en la historia, así que siempre se ve qué pasó y quién lo deshizo.", ms: 8000 },
    { title: "Un push normal", text: "La historia solo creció, como con cualquier commit. <code>git push</code> funciona sin forzar y tus compañeros no tienen que hacer nada raro.", ms: 7000 },
    { title: "Con reset sería otra cosa", text: "<code>reset</code> reescribe: <code>main</code> queda detrás de <code>origin/main</code>, el push se rechaza y tendrías que forzarlo, rompiendo la copia de los demás. Además pierdes D.", ms: 9000 },
    { title: "Revertir un merge", text: "Un merge tiene dos padres y Git no sabe contra cuál deshacer. <code>-m 1</code> indica que el primero, <code>main</code>, se queda: el revert quita lo que trajo <code>pagos</code>.", ms: 7500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("rv");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "rv-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 5, rows: 2, bottom: 40 });
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-remote"></i>rama remota</span><span><i class="l-conflict"></i>commit con el bug</span><span><i class="l-ok"></i>revert: deshace C</span>`;
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
