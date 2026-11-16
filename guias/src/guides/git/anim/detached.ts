/*
  Animación: HEAD separado (detached). HEAD apunta directo a un commit, no a una rama. Los commits
  que hagas ahí avanzan solo con HEAD; al volver a una rama quedan sin nombre (Git avisa) y se
  rescatan creándoles una rama. Uso típico: revisar versiones viejas, bisect y tags.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo } from "./_kit";
import "./detached.css";

const A = c("A", 0, 0), B = c("B", 1, 0, "A"), C = c("C", 2, 0, "B", { msg: "3f2a9c1" }), D = c("D", 3, 0, "C");
const X = c("X", 3, 1, "C", { msg: "5a4b3c2" }), Y = c("Y", 4, 1, "X", { msg: "9e8d7c6" });
const main = { name: "main", at: "D" };

type Paso = { g: Grafo; cmd: string; out?: string };
const PASOS: Paso[] = [
  { cmd: "git log --oneline -3", out: "b81c0d4 (HEAD -> main) corrige el total\n3f2a9c1 agrega descuento\n6e0a7f2 crea el carrito",
    g: { nodes: [A, B, C, D], refs: [main], head: "main" } },
  { cmd: "git checkout 3f2a9c1",
    out: "Note: switching to '3f2a9c1'.\n<span class=\"warn\">You are in 'detached HEAD' state.</span> You can look around, make experimental changes and commit them…\nHEAD is now at 3f2a9c1 agrega descuento",
    g: { nodes: [A, B, { ...C, tone: "hl" }, D], refs: [main], head: "C" } },
  { cmd: 'git commit -am "prueba 1"', out: "[detached HEAD 5a4b3c2] prueba 1",
    g: { nodes: [A, B, C, D, { ...X, tone: "new" }], refs: [main], head: "X" } },
  { cmd: 'git commit -am "prueba 2"', out: "[detached HEAD 9e8d7c6] prueba 2",
    g: { nodes: [A, B, C, D, X, { ...Y, tone: "new" }], refs: [main], head: "Y" } },
  { cmd: "git switch main",
    out: "<span class=\"warn\">Warning: you are leaving 2 commits behind, not connected to any of your branches:</span>\n  9e8d7c6 prueba 2\n  5a4b3c2 prueba 1\n…\n <span class=\"hl\">git branch &lt;new-branch-name&gt; 9e8d7c6</span>\nSwitched to branch 'main'",
    g: { nodes: [A, B, C, D, { ...X, tone: "ghost" }, { ...Y, tone: "ghost" }], refs: [main], head: "main" } },
  { cmd: "git switch -c experimento 9e8d7c6", out: "Switched to a new branch 'experimento'",
    g: { nodes: [A, B, C, D, { ...X, tone: "ok" }, { ...Y, tone: "ok" }], refs: [main, { name: "experimento", at: "Y" }], head: "experimento" } },
  { cmd: "git switch --detach v2.3", out: "HEAD is now at 6e0a7f2 crea el carrito",
    g: { nodes: [A, { ...B, tone: "hl" }, C, D, X, Y], refs: [{ name: "v2.3", at: "B", kind: "tag" }, main, { name: "experimento", at: "Y" }], head: "B" } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;

export const detached: Escena = {
  title: "HEAD separado: estar en un commit sin rama",
  steps: [
    { title: "Lo normal: HEAD apunta a una rama", text: "HEAD apunta a <code>main</code> y <code>main</code> apunta a D. Cuando haces un commit, se mueve la rama y HEAD va con ella.", ms: 6500 },
    { title: "HEAD directo a un commit", text: "Al pedir un commit por su hash, HEAD (ámbar) apunta a C sin pasar por una rama. <code>git switch --detach 3f2a9c1</code> hace lo mismo, sin el aviso largo.", ms: 8500 },
    { title: "Puedes hacer commits", text: "X nace de C, como cualquier commit. Pero no hay rama que avanzar: solo HEAD apunta a X.", ms: 7000 },
    { title: "Avanzan solo con HEAD", text: "Y nace de X y HEAD lo sigue. <code>main</code> no se enteró de nada: sigue en D.", ms: 6500 },
    { title: "Al salir, quedan sin nombre", text: "Al volver a <code>main</code>, nada apunta a X ni a Y. Git te avisa y te sugiere crearles una rama. Si no lo haces, el recolector de basura los borrará con el tiempo.", ms: 9000 },
    { title: "Rescate: una rama en Y", text: "<code>git switch -c experimento 9e8d7c6</code> crea la rama en Y y te cambia a ella. Mejor aún: créala antes de salir, con <code>git switch -c experimento</code>.", ms: 8500 },
    { title: "Para qué sirve", text: "Para revisar una versión vieja o un tag sin tocar ninguna rama. <code>git bisect</code> también trabaja así: va saltando de commit en commit con HEAD separado.", ms: 8000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("dh");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "dh-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 5, rows: 2, bottom: 62 });
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="dh-l-det"></i>HEAD separado</span><span><i class="l-branch"></i>otra rama</span><span><i class="dh-l-tag"></i>tag</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-ghost"></i>sin rama que lo apunte</span>`;
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
