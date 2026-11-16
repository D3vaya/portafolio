/*
  Animación: merge de tres vías. Git busca la base común de las dos ramas, compara base → main y
  base → feature, combina los dos conjuntos de cambios y crea un commit M con dos padres. Si ambos
  lados tocan las mismas líneas, hay conflicto.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Ref } from "./_kit";
import "./merge.css";

// columnas a 0.9: deja aire a la derecha para la etiqueta "HEAD → main" sobre M

const B = c("B", 0, 0), C = c("C", 0.9, 0, "B");
const D = c("D", 1.8, 0, "C"), F = c("F", 2.7, 0, "D");
const E = c("E", 1.8, 1, "C"), G = c("G", 2.7, 1, "E");
const M = c("M", 3.6, 0, ["F", "G"]);

const r = (main: string): Ref[] => [{ name: "main", at: main }, { name: "feature", at: "G" }];

/** Qué filas del panel de comparación se ven: diffs, resultado o conflicto. */
type Panel = { diff?: boolean; res?: boolean; conf?: boolean };
type Paso = { g: Grafo; cmd: string; out?: string; base?: boolean; panel: Panel };

const PASOS: Paso[] = [
  { cmd: "git switch main", out: "Already on 'main'",
    g: { nodes: [B, C, D, F, E, G], refs: r("F"), head: "main" }, panel: {} },
  { cmd: "git merge-base main feature", out: "3c1f2a9",
    g: { nodes: [B, { ...C, tone: "hl" }, D, F, E, G], refs: r("F"), head: "main" }, base: true, panel: {} },
  { cmd: "git merge feature",
    g: { nodes: [B, { ...C, tone: "hl" }, D, { ...F, tone: "hl" }, E, { ...G, tone: "hl" }], refs: r("F"), head: "main" }, base: true, panel: { diff: true } },
  { cmd: "git merge feature", out: "Merge made by the 'ort' strategy.\n app.js    | 5 +++--\n buscar.js | 9 +++++++++\n 2 files changed, 12 insertions(+), 2 deletions(-)",
    g: { nodes: [B, C, D, F, E, G, { ...M, tone: "new" }], refs: r("M"), head: "main" }, panel: { diff: true, res: true } },
  { cmd: "git show -s HEAD", out: "commit a41e9d7 (HEAD -> main)\n<span class=\"hl\">Merge: 6f0b1e2 9a7c3d1</span>\nAuthor: Ana <ana@example.com>\n\n    Merge branch 'feature'",
    g: { nodes: [B, C, D, { ...F, tone: "hl" }, E, { ...G, tone: "hl" }, M], refs: r("M"), head: "main" }, panel: { diff: true, res: true } },
  { cmd: "git log --graph --oneline",
    out: '<span class="mg-pre">' + "*   a41e9d7 (HEAD -> main) Merge branch 'feature'\n|\\\n| * 9a7c3d1 (feature) filtra resultados\n| * 2e8b5f0 agrega búsqueda\n* | 6f0b1e2 ajusta estilos\n* | d4c7a18 corrige el menú\n|/\n* 3c1f2a9 agrega login" + "</span>",
    g: { nodes: [B, C, D, F, E, G, M], refs: r("M"), head: "main" }, panel: {} },
  { cmd: "",
    g: { nodes: [B, { ...C, tone: "hl" }, D, F, E, G, { ...M, tone: "conflict", label: "✕" }], refs: r("F"), head: "main" }, base: true, panel: { diff: true, conf: true } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;
let panel: HTMLElement;
let base: SVGGElement;

export const merge: Escena = {
  title: "Merge de tres vías: base, dos lados y un commit",
  steps: [
    { title: "Dos ramas que divergieron", text: "Desde C, <code>main</code> sumó D y F, y <code>feature</code> sumó E y G. Ninguna contiene a la otra: un fast-forward no es posible.", ms: 7000 },
    { title: "1. Encontrar la base común", text: "Git busca el último commit que comparten las dos ramas: la <b>merge base</b>. Aquí es C. Puedes verla con <code>git merge-base</code>.", ms: 7500 },
    { title: "2. Comparar desde la base", text: "Git calcula qué cambió de C a F (lo de <code>main</code>) y de C a G (lo de <code>feature</code>). Son tres versiones: base y dos lados. Por eso se llama de tres vías.", ms: 8500 },
    { title: "3. Combinar y crear M", text: "Como los cambios tocan zonas distintas, Git los junta solo y crea el commit M. <code>main</code> avanza a M; <code>feature</code> se queda en G.", ms: 8000 },
    { title: "M tiene dos padres", text: "Un commit normal tiene un padre. M tiene dos: F (lo que había en <code>main</code>) y G (lo que llegó). La línea <code>Merge:</code> los muestra.", ms: 7500 },
    { title: "Leer el grafo en la terminal", text: "En <code>git log --graph</code>, cada <code>*</code> es un commit. <code>|\\</code> abre la rama y <code>|/</code> marca dónde salió. Las dos columnas se unen en M.", ms: 8500 },
    { title: "¿Y si tocan las mismas líneas?", text: "Si <code>main</code> y <code>feature</code> cambian la misma línea de forma distinta, Git no puede elegir solo: se detiene con un <b>conflicto</b>. Lo verás en la siguiente lección.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("mg");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "mg-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 5, rows: 2 });
    // rótulo "merge base" sobre C (C no tiene etiquetas de rama)
    base = document.createElementNS("http://www.w3.org/2000/svg", "g");
    base.setAttribute("class", "mg-base");
    base.setAttribute("transform", `translate(${g.px(0.9)},${g.py(0) - 36})`);
    base.innerHTML = `<rect x="-49" y="-10.5" width="98" height="21" rx="5"></rect><text y="4.3">merge base</text>`;
    g.svg.appendChild(base);

    panel = document.createElement("div");
    panel.className = "mg-panel";
    panel.innerHTML = `
      <div class="mg-side" data-r="diff"><b>C → F <span>main</span></b>
        <span class="gk-file f-mod">app.js <em>líneas 3–5</em></span><span class="gk-file f-mod">estilos.css</span></div>
      <div class="mg-side" data-r="diff"><b>C → G <span class="mg-ft">feature</span></b>
        <span class="gk-file f-mod">app.js <em>líneas 20–24</em></span><span class="gk-file f-new">buscar.js <em>nuevo</em></span></div>
      <p class="mg-res" data-r="res">✓ M = base + los dos lados: app.js con ambos cambios, estilos.css y buscar.js</p>
      <p class="mg-conf" data-r="conf">✕ Si los dos lados cambian app.js línea 3, Git se detiene: conflicto</p>`;
    stage.appendChild(panel);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-new"></i>commit de merge</span><span><i class="l-mod"></i>archivo modificado</span><span><i class="l-conflict"></i>conflicto</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const at = instant ? 0 : d;
    g.render(p.g, t, at);

    const wasBase = base.classList.contains("is-on");
    base.classList.toggle("is-on", !!p.base);
    if (t && p.base && !wasBase) t.fromTo(base, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power3.out" }, at + 0.3);
    else gsap.set(base, { opacity: p.base ? 1 : 0 });

    panel.classList.toggle("is-empty", !p.panel.diff && !p.panel.res && !p.panel.conf);
    panel.querySelectorAll<HTMLElement>("[data-r]").forEach((el, k) => {
      const on = !!p.panel[el.dataset.r as keyof Panel];
      const was = !el.hidden;
      el.hidden = !on;
      if (t && on && !was) t.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, at + 0.4 + k * 0.35);
      else gsap.set(el, { opacity: 1, y: 0 });
    });
  },
};
