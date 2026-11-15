/*
  Animación: un conflicto de merge. Las dos ramas cambian la misma línea de precio.js; el merge se
  detiene, el archivo queda con marcadores (lo tuyo y lo que llega), `git status` lo muestra como
  "both modified", eliges el resultado, `git add` lo marca resuelto y `git commit` crea el merge.
  Alternativa: `git merge --abort` deja todo como antes.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Ref } from "./_kit";
import "./conflicto.css";

const O = 0.2;
const B = c("B", O, 0), C = c("C", 1 + O, 0, "B");
const D = c("D", 2 + O, 0, "C"), E = c("E", 2 + O, 1, "C");
const M = c("M", 3 + O, 0, ["D", "E"]);
const r = (main: string): Ref[] => [{ name: "main", at: main }, { name: "feature", at: "E" }];

type Linea = { t: string; k?: "mk" | "ours" | "theirs" | "edit"; tag?: string };
type Archivo = { lines: Linea[]; state: string; st?: "bad" | "warn" | "ok" };
type Paso = { g: Grafo; cmd: string; out?: string; file: Archivo; tags?: boolean };

const v120: Archivo = { lines: [{ t: "const precio = 120;" }], state: "como en main (en C valía 100)" };
const marcas: Linea[] = [
  { t: "<<<<<<< HEAD", k: "mk" },
  { t: "const precio = 120;", k: "ours", tag: "lo tuyo (main)" },
  { t: "=======", k: "mk" },
  { t: "const precio = 95;", k: "theirs", tag: "lo que llega (feature)" },
  { t: ">>>>>>> feature", k: "mk" },
];
const enConflicto: Archivo = { lines: marcas, state: "✕ en conflicto", st: "bad" };

const PASOS: Paso[] = [
  { cmd: "git diff main feature", out: '<span class="bad">-const precio = 120;</span>\n<span class="ok">+const precio = 95;</span>',
    g: { nodes: [B, C, D, E], refs: r("D"), head: "main" }, file: v120 },
  { cmd: "git merge feature",
    out: 'Auto-merging precio.js\n<span class="bad">CONFLICT (content): Merge conflict in precio.js\nAutomatic merge failed; fix conflicts and then commit the result.</span>',
    g: { nodes: [B, C, D, E, { ...M, tone: "conflict" }], refs: r("D"), head: "main" }, file: enConflicto },
  { cmd: "git status", out: 'On branch main\nYou have unmerged paths.\n\nUnmerged paths:\n\t<span class="bad">both modified:   precio.js</span>',
    g: { nodes: [B, C, D, E, { ...M, tone: "conflict" }], refs: r("D"), head: "main" }, file: enConflicto, tags: true },
  { cmd: "",
    g: { nodes: [B, C, D, E, { ...M, tone: "conflict" }], refs: r("D"), head: "main" },
    file: { lines: [{ t: "const precio = 95;", k: "edit" }], state: "editado por ti, sin marcadores", st: "warn" } },
  { cmd: "git add precio.js",
    g: { nodes: [B, C, D, E, { ...M, tone: "conflict" }], refs: r("D"), head: "main" },
    file: { lines: [{ t: "const precio = 95;", k: "edit" }], state: "✓ resuelto", st: "ok" } },
  { cmd: "git commit", out: "[main a41e9d7] Merge branch 'feature'",
    g: { nodes: [B, C, D, E, { ...M, tone: "ok" }], refs: r("M"), head: "main" },
    file: { lines: [{ t: "const precio = 95;" }], state: "✓ guardado en el merge M", st: "ok" } },
  { cmd: "git merge --abort",
    g: { nodes: [B, C, D, E], refs: r("D"), head: "main" }, file: { ...v120, state: "como estaba antes del merge" } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;
let code: HTMLElement;
let state: HTMLElement;

export const conflicto: Escena = {
  title: "Un conflicto: dos cambios en la misma línea",
  steps: [
    { title: "La misma línea, dos valores", text: "En C, <code>precio.js</code> decía 100. En <code>main</code> lo cambiaste a 120; en <code>feature</code>, alguien lo dejó en 95. Estás en <code>main</code>.", ms: 7500 },
    { title: "Git se detiene", text: "Git no sabe cuál precio es el correcto, así que no adivina: pausa el merge y te deja el archivo con marcadores. El commit M todavía no existe.", ms: 8000 },
    { title: "Leer los marcadores", text: "Entre <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</code> y <code>=======</code> está lo tuyo; de ahí a <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; feature</code>, lo que llega. <code>git status</code> lo marca como <code>both modified</code>.", ms: 8500 },
    { title: "Tú decides el resultado", text: "Edita el archivo como debe quedar: puede ser un lado, el otro o una mezcla. Aquí eliges 95. Borra los tres marcadores.", ms: 7000 },
    { title: "Marcar como resuelto", text: "<code>git add precio.js</code> le dice a Git que ya está resuelto. Desde Git 2.56, <code>git add --resolved</code> agrega los archivos que tenían conflicto y se detiene si queda algún marcador.", ms: 8500 },
    { title: "El commit cierra el merge", text: "<code>git commit</code> crea M con su mensaje ya escrito. <code>main</code> avanza a M y la historia de las dos ramas queda unida.", ms: 7000 },
    { title: "La salida de emergencia", text: "Alternativa: en pleno conflicto, <code>git merge --abort</code> cancela la fusión y deja <code>main</code> y <code>precio.js</code> exactamente como estaban antes.", ms: 8000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("cf");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "cf-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 4.4, rows: 2, bottom: 50 });
    const ed = document.createElement("div");
    ed.className = "cf-ed";
    ed.innerHTML = `<div class="cf-eh"><b>precio.js</b><span class="cf-st"></span></div><div class="cf-code"></div>`;
    stage.appendChild(ed);
    code = ed.querySelector(".cf-code") as HTMLElement;
    state = ed.querySelector(".cf-st") as HTMLElement;
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-conflict"></i>merge en conflicto</span><span><i class="l-ok"></i>resuelto</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const at = instant ? 0 : d;
    g.render(p.g, t, at);

    const before = code.innerHTML;
    code.innerHTML = p.file.lines
      .map((l) => `<div class="cf-ln${l.k ? " k-" + l.k : ""}"><span>${l.t.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>${p.tags && l.tag ? `<em>${l.tag}</em>` : ""}</div>`)
      .join("");
    state.textContent = p.file.state;
    state.className = "cf-st" + (p.file.st ? " s-" + p.file.st : "");
    if (t) {
      if (code.innerHTML !== before) {
        const rows = code.querySelectorAll(".cf-ln");
        t.fromTo(rows, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.12, ease: "power3.out" }, at + 0.3);
      }
      const tags = code.querySelectorAll("em");
      if (tags.length) t.fromTo(tags, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.45, stagger: 0.5, ease: "back.out(2)" }, at + 0.5);
      t.fromTo(state, { opacity: 0 }, { opacity: 1, duration: 0.4 }, at + 0.6);
    }
  },
};
