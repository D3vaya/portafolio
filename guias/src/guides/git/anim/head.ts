/*
  Animación: HEAD y cambiar de rama. HEAD apunta a la rama actual; `git switch` lo mueve y deja los
  archivos del directorio de trabajo como estaban en el commit de esa rama. `git switch -` vuelve a
  la anterior, Git se niega si perderías cambios sin guardar y `git switch -c` crea y cambia en un
  paso. `git checkout` hace lo mismo y sigue existiendo.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo } from "./_kit";
import "./head.css";

// corrido 0.35 columnas: deja aire a la derecha para la etiqueta "HEAD → arreglo"
const O = 0.35;
const A = c("A", O, 0), B = c("B", 1 + O, 0, "A"), C = c("C", 2 + O, 0, "B");
const D = c("D", 3 + O, 0, "C"), E = c("E", 3 + O, 1, "C");

/** Archivo del directorio de trabajo: nombre, de qué commit viene su contenido y su estado. */
type Arch = { f: string; v: string; s?: "mod" | "new" | "hl" };
type Paso = { g: Grafo; cmd: string; out?: string; files: Arch[]; err?: string };

const refs = (head: string, extra: { name: string; at: string }[] = []) => ({
  refs: [{ name: "main", at: "D" }, { name: "feature", at: "E" }, ...extra], head,
});
const enMain: Arch[] = [{ f: "app.js", v: "D" }, { f: "estilos.css", v: "D" }, { f: "README.md", v: "D" }];

const PASOS: Paso[] = [
  { cmd: "git branch", out: "  feature\n* main",
    g: { nodes: [A, B, C, D, E], ...refs("main") }, files: enMain },
  { cmd: "git switch feature", out: "Switched to branch 'feature'",
    g: { nodes: [A, B, C, D, { ...E, tone: "hl" }], ...refs("feature") },
    files: [{ f: "app.js", v: "E", s: "hl" }, { f: "buscar.js", v: "E", s: "new" }, { f: "estilos.css", v: "E" }, { f: "README.md", v: "E" }] },
  { cmd: "git switch -", out: "Switched to branch 'main'",
    g: { nodes: [A, B, C, { ...D, tone: "hl" }, E], ...refs("main") }, files: enMain },
  { cmd: "git switch feature",
    out: '<span class="bad">error: Your local changes to the following files would be overwritten by checkout:\n\tapp.js\nPlease commit your changes or stash them before you switch branches.\nAborting</span>',
    g: { nodes: [A, B, C, D, E], ...refs("main") },
    files: [{ f: "app.js", v: "D", s: "mod" }, { f: "estilos.css", v: "D" }, { f: "README.md", v: "D" }],
    err: "✕ No cambia de rama: perderías tus cambios en app.js" },
  { cmd: "git switch -c arreglo", out: "Switched to a new branch 'arreglo'",
    g: { nodes: [A, B, C, { ...D, tone: "hl" }, E], ...refs("arreglo", [{ name: "arreglo", at: "D" }]) },
    files: [{ f: "app.js", v: "D", s: "mod" }, { f: "estilos.css", v: "D" }, { f: "README.md", v: "D" }] },
  { cmd: "git checkout main", out: "M\tapp.js\nSwitched to branch 'main'",
    g: { nodes: [A, B, C, D, E], ...refs("main", [{ name: "arreglo", at: "D" }]) },
    files: [{ f: "app.js", v: "D", s: "mod" }, { f: "estilos.css", v: "D" }, { f: "README.md", v: "D" }] },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;
let list: HTMLElement;
let err: HTMLElement;

const fileHTML = (a: Arch) =>
  `<span class="gk-file hd-f${a.s ? " f-" + a.s : ""}" data-f="${a.f}"><b>${a.f}</b><em>${a.s === "mod" ? "sin commit" : "como en " + a.v}</em></span>`;

export const head: Escena = {
  title: "HEAD marca dónde estás y switch lo mueve",
  steps: [
    { title: "HEAD: tu posición actual", text: "Dos ramas divergen desde C. <b>HEAD →</b> dice en qué rama estás: <code>main</code>. Abajo, los archivos que ves en tu editor, tal como están en D.", ms: 7000 },
    { title: "switch mueve HEAD y tus archivos", text: "<code>git switch feature</code> hace que HEAD apunte a <code>feature</code> y deja la carpeta como en E: aparece <code>buscar.js</code> y cambia <code>app.js</code>.", ms: 8000 },
    { title: "Volver a la rama anterior", text: "<code>git switch -</code> (guion) regresa a la rama donde estabas antes, como <code>cd -</code> en la terminal. Los archivos vuelven a ser los de D.", ms: 7000 },
    { title: "Git te protege de perder cambios", text: "Editaste <code>app.js</code> sin hacer commit y en <code>feature</code> ese archivo es distinto. Git se niega a cambiar: confirma tus cambios o guárdalos con <code>stash</code> primero.", ms: 8500 },
    { title: "Crear y cambiar en un paso", text: "<code>git switch -c arreglo</code> crea la rama en el commit actual y te cambia a ella. Tus cambios sin commit te acompañan, porque no chocan con nada.", ms: 7500 },
    { title: "checkout también sirve", text: "<code>git checkout</code> hace lo mismo y no está deprecado. Pero también restaura archivos, así que <code>switch</code> es más claro para cambiar de rama.", ms: 8000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("hd");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "hd-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 4.7, rows: 2, bottom: 50 });
    const wd = document.createElement("div");
    wd.className = "hd-wd";
    wd.innerHTML = `<span class="hd-l">Directorio de trabajo (lo que ves en tu editor)</span><div class="hd-list"></div><p class="hd-err"></p>`;
    stage.appendChild(wd);
    list = wd.querySelector(".hd-list") as HTMLElement;
    err = wd.querySelector(".hd-err") as HTMLElement;
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-mod"></i>modificado sin commit</span><span><i class="l-ok"></i>archivo nuevo</span><span><i class="hd-lhl"></i>cambió de contenido</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const at = instant ? 0 : d;
    g.render(p.g, t, at);

    // archivos: se reconstruyen; lo que cambió se anima
    const prev = new Map([...list.querySelectorAll<HTMLElement>(".hd-f")].map((el) => [el.dataset.f!, el.className + el.textContent]));
    list.innerHTML = p.files.map(fileHTML).join("");
    if (t) {
      list.querySelectorAll<HTMLElement>(".hd-f").forEach((el) => {
        const was = prev.get(el.dataset.f!);
        if (was === undefined) t.fromTo(el, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, at + 0.35);
        else if (was !== el.className + el.textContent) t.fromTo(el, { opacity: 0.2, y: -6 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, at + 0.35);
      });
    }
    err.textContent = p.err || "";
    if (t && p.err) t.fromTo(err, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" }, at + 0.3);
    else gsap.set(err, { opacity: 1, x: 0 });
  },
};
