/*
  Animación: guardar trabajo a medias con stash. Los cambios sin commit de feature se guardan en una
  pila (stash@{0}), el directorio queda limpio, cambias a main para un arreglo urgente, vuelves y
  `git stash pop` los devuelve y saca la entrada de la pila. Los archivos sin seguimiento solo
  entran con -u.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Ref } from "./_kit";
import "./stash.css";

const O = 0.4;
const A = c("A", O, 0), B = c("B", 1 + O, 0, "A");
const C = c("C", 2 + O, 1, "B"), F = c("F", 2 + O, 0, "B");

type Est = "" | "mod" | "new";
type Entrada = { msg: string; files: string[] };
type Paso = {
  g: Grafo; cmd: string; out?: string;
  files: [string, Est][]; stash: Entrada[];
  fly?: "in" | "out"; flash?: string; hlStash?: boolean;
};

const r = (main: string): Ref[] => [{ name: "main", at: main }, { name: "feature", at: "C" }];
const sucio: [string, Est][] = [["app.js", "mod"], ["buscar.js", "mod"], ["pago.js", ""]];
const limpio: [string, Est][] = [["app.js", ""], ["buscar.js", ""], ["pago.js", ""]];
const S0: Entrada = { msg: "On feature: búsqueda a medias", files: ["app.js", "buscar.js"] };

const PASOS: Paso[] = [
  { cmd: "git status --short", out: '<span class="warn"> M app.js\n M buscar.js</span>',
    g: { nodes: [A, B, C], refs: r("B"), head: "feature" }, files: sucio, stash: [] },
  { cmd: 'git stash push -m "búsqueda a medias"', out: "Saved working directory and index state On feature: búsqueda a medias",
    g: { nodes: [A, B, C], refs: r("B"), head: "feature" }, files: limpio, stash: [S0], fly: "in" },
  { cmd: "git switch main", out: "Switched to branch 'main'",
    g: { nodes: [A, B, C], refs: r("B"), head: "main" }, files: limpio, stash: [S0] },
  { cmd: 'git commit -am "arregla el pago"', out: "[main 4f2a9c1] arregla el pago\n 1 file changed, 2 insertions(+), 1 deletion(-)",
    g: { nodes: [A, B, C, { ...F, tone: "new" }], refs: r("F"), head: "main" }, files: limpio, stash: [S0], flash: "pago.js" },
  { cmd: "git switch feature && git stash list", out: "Switched to branch 'feature'\n<span class=\"hl\">stash@{0}: On feature: búsqueda a medias</span>",
    g: { nodes: [A, B, C, F], refs: r("F"), head: "feature" }, files: limpio, stash: [S0], hlStash: true },
  { cmd: "git stash pop", out: "On branch feature\nChanges not staged for commit:\n\t<span class=\"warn\">modified:   app.js\n\tmodified:   buscar.js</span>\nDropped refs/stash@{0} (7c1e3b2)",
    g: { nodes: [A, B, C, F], refs: r("F"), head: "feature" }, files: sucio, stash: [], fly: "out" },
  { cmd: 'git stash push -u -m "con notas"', out: "Saved working directory and index state On feature: con notas",
    g: { nodes: [A, B, C, F], refs: r("F"), head: "feature" }, files: limpio,
    stash: [{ msg: "On feature: con notas", files: ["app.js", "buscar.js", "notas.txt"] }], fly: "in" },
];
// En el último paso notas.txt existía (sin seguimiento) justo antes de guardarse: se muestra al llegar.
const ANTES_U: [string, Est][] = [...sucio, ["notas.txt", "new"]];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;
let wd: HTMLElement;
let pila: HTMLElement;

const chip = (f: string, s: Est) => `<span class="gk-file st-f${s ? " f-" + s : ""}" data-f="${f}">${f}${s === "new" ? " <em>sin seguimiento</em>" : ""}</span>`;

export const stash: Escena = {
  title: "Stash: guarda lo que llevas y vuelve después",
  steps: [
    { title: "Trabajo a medias", text: "Estás en <code>feature</code> con cambios sin commit en dos archivos. Te piden un arreglo urgente en <code>main</code>, pero no quieres mezclar ni hacer un commit a medias.", ms: 8000 },
    { title: "Guardar en la pila", text: "<code>git stash push -m</code> guarda tus cambios en una pila aparte, con un mensaje para reconocerlos. Tu directorio de trabajo queda limpio, como en el último commit.", ms: 8000 },
    { title: "Cambiar de rama sin problema", text: "Con el directorio limpio, <code>git switch main</code> funciona. Tus cambios siguen a salvo en <code>stash@{0}</code>, fuera de cualquier rama.", ms: 7000 },
    { title: "El arreglo urgente", text: "Corriges <code>pago.js</code> y haces commit en <code>main</code>. El commit F no lleva nada de tu trabajo a medias.", ms: 7000 },
    { title: "Volver y revisar la pila", text: "Regresas a <code>feature</code>. <code>git stash list</code> muestra lo que tienes guardado: la entrada más reciente siempre es <code>stash@{0}</code>.", ms: 7500 },
    { title: "pop: devolver y sacar", text: "<code>git stash pop</code> aplica los cambios y quita la entrada de la pila. <code>git stash apply</code> también los aplica, pero deja la entrada guardada.", ms: 8000 },
    { title: "Ojo con los archivos nuevos", text: "Sin <code>-u</code>, el stash ignora archivos sin seguimiento como <code>notas.txt</code>: se quedarían en tu carpeta. Con <code>-u</code> (<code>--include-untracked</code>) también se guardan.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("st");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "st-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 3.8, rows: 2, bottom: 50 });
    const row = document.createElement("div");
    row.className = "st-row";
    row.innerHTML = `
      <div class="st-wd"><span class="st-l">Directorio de trabajo</span><div class="st-files"></div></div>
      <div class="st-pila"><span class="st-l">Pila de stash</span><div class="st-cajon"></div></div>`;
    stage.appendChild(row);
    wd = row.querySelector(".st-files") as HTMLElement;
    pila = row.querySelector(".st-cajon") as HTMLElement;
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-mod"></i>modificado sin commit</span><span><i class="l-ok"></i>sin seguimiento</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    root.querySelectorAll(".st-fly").forEach((e) => e.remove());
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const at = instant ? 0 : d;
    g.render(p.g, t, at);

    // en el último paso, notas.txt aparece primero en la carpeta y luego viaja a la pila
    if (t && i === PASOS.length - 1) {
      wd.innerHTML = ANTES_U.map(([f, s]) => chip(f, s)).join("");
    }
    // posiciones relativas a la fila (no cambian aunque la consola crezca al escribir)
    const row = wd.closest(".st-row") as HTMLElement;
    const rel = (e: Element) => { const a = e.getBoundingClientRect(), b = row.getBoundingClientRect(); return { x: a.left - b.left, y: a.top - b.top }; };
    const rects = (host: HTMLElement) => new Map([...host.querySelectorAll<HTMLElement>("[data-f]")].map((e) => [e.dataset.f!, { ...rel(e), cls: e.className }]));
    const oldWd = rects(wd), oldPila = rects(pila);

    wd.innerHTML = p.files.map(([f, s]) => chip(f, s)).join("");
    pila.innerHTML = p.stash.length
      ? p.stash.map((e, k) => `<div class="st-e${p.hlStash && !k ? " is-hl" : ""}"><b>stash@{${k}}</b><span>${e.msg}</span><div>${e.files.map((f) => `<span class="gk-file st-f ${f.endsWith(".txt") ? "f-new" : "f-mod"}" data-f="${f}">${f}</span>`).join("")}</div></div>`).join("")
      : `<p class="st-vacia">vacía</p>`;
    if (!t) return;
    if (i === PASOS.length - 1) {
      // notas.txt se ve en la carpeta un instante y luego todo viaja a la pila
      wd.innerHTML = ANTES_U.map(([f, s]) => chip(f, s)).join("");
      t.fromTo(wd.querySelector('[data-f="notas.txt"]'), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 0);
      t.call(() => { wd.innerHTML = p.files.map(([f, s]) => chip(f, s)).join(""); }, [], at + 0.2);
    }

    // viaje de los archivos entre la carpeta y la pila (se mide al despegar)
    const fly = (from: { x: number; y: number; cls: string }, to: HTMLElement, s: number) => {
      gsap.set(to, { opacity: 0 });
      t.call(() => {
        const el = document.createElement("span");
        el.className = to.className.replace("st-f", "") + " st-fly";
        el.textContent = to.dataset.f!;
        row.appendChild(el);
        const dst = rel(to);
        gsap.fromTo(el, { x: from.x, y: from.y }, { x: dst.x, y: dst.y, duration: 0.8, ease: "power3.inOut",
          onComplete: () => { el.remove(); gsap.set(to, { opacity: 1 }); } });
      }, [], s);
    };
    if (p.fly === "in") {
      pila.querySelectorAll<HTMLElement>(".st-e:first-child [data-f]").forEach((to, k) => {
        const from = oldWd.get(to.dataset.f!);
        if (from) fly(from, to, at + 0.2 + k * 0.25);
      });
      t.fromTo(pila.querySelector(".st-e"), { backgroundColor: "rgba(255,179,92,.25)" }, { backgroundColor: "rgba(255,179,92,0)", duration: 1.2, immediateRender: false }, at + 1.2);
    }
    if (p.fly === "out") {
      wd.querySelectorAll<HTMLElement>(".f-mod").forEach((to, k) => {
        const from = oldPila.get(to.dataset.f!);
        if (from) fly(from, to, at + 0.2 + k * 0.25);
      });
      const vacia = pila.querySelector(".st-vacia");
      if (vacia) t.fromTo(vacia, { opacity: 0 }, { opacity: 1, duration: 0.4 }, at + 1.1);
    }
    // archivos que cambian de estado sin viajar
    wd.querySelectorAll<HTMLElement>("[data-f]").forEach((el) => {
      const was = oldWd.get(el.dataset.f!)?.cls;
      if (was !== undefined && was !== el.className && !p.fly) t.fromTo(el, { opacity: 0.3 }, { opacity: 1, duration: 0.5 }, at + 0.3);
    });
    if (p.flash) {
      const el = wd.querySelector(`[data-f="${p.flash}"]`);
      if (el) t.fromTo(el, { borderColor: "#ffb35c", boxShadow: "0 0 18px -6px #ffb35c" }, { borderColor: "#3a3d47", boxShadow: "0 0 0 0 rgba(0,0,0,0)", duration: 1.4, clearProps: "borderColor,boxShadow" }, at + 0.1);
    }
    if (p.hlStash) {
      const el = pila.querySelector(".st-e");
      if (el) t.fromTo(el, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: "back.out(2)" }, at + 0.4);
    }
  },
};
