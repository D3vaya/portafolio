/*
  Animación: submódulos y subtree. El repo app contiene vendor/ui, que es otro repo. Con un
  submódulo, app guarda solo un puntero a un commit exacto de ui (más .gitmodules); clonar sin
  --recurse-submodules deja la carpeta vacía; mover el puntero requiere un commit en app. Con
  subtree, en cambio, los archivos se copian dentro de app.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import "./submodulos.css";

type V = "ptr" | "empty" | "files";
type St = {
  v: V; ptr: string; ptrNew?: boolean; pending?: string; mods: "" | "new" | "on";
  ui: number; uiNew?: boolean; app: number; appNew?: boolean; mixed?: boolean; cmd: string; out?: string;
};
const UI = ["2b7f1d0", "5e93a4c", "8e1f0a2", "c47b9d3"];
const PASOS: St[] = [
  { v: "ptr", ptr: "8e1f0a2", mods: "new", ui: 3, app: 3, cmd: "git submodule add https://github.com/ana/ui.git vendor/ui", out: "Cloning into '/home/ana/app/vendor/ui'..." },
  { v: "ptr", ptr: "8e1f0a2", mods: "on", ui: 3, app: 3, cmd: "git ls-files -s vendor/ui", out: '<span class="hl">160000 8e1f0a2… 0\tvendor/ui</span>' },
  { v: "empty", ptr: "8e1f0a2", mods: "on", ui: 3, app: 3, cmd: "git clone https://github.com/ana/app.git", out: "Cloning into 'app'..." },
  {
    v: "ptr", ptr: "8e1f0a2", mods: "on", ui: 3, app: 3, cmd: "git submodule update --init --recursive",
    out: "Submodule 'vendor/ui' (https://github.com/ana/ui.git) registered for path 'vendor/ui'\nSubmodule path 'vendor/ui': checked out '8e1f0a2…'",
  },
  {
    v: "ptr", ptr: "8e1f0a2", pending: "c47b9d3", mods: "on", ui: 4, uiNew: true, app: 3, cmd: "git submodule update --remote vendor/ui",
    out: "Submodule path 'vendor/ui': checked out 'c47b9d3…'\n<span class=\"warn\"># git status: modified:   vendor/ui (new commits)</span>",
  },
  {
    v: "ptr", ptr: "c47b9d3", ptrNew: true, mods: "on", ui: 4, app: 4, appNew: true, cmd: 'git add vendor/ui && git commit -m "actualiza ui"',
    out: "[main 5b0e2d7] actualiza ui\n 1 file changed, 1 insertion(+), 1 deletion(-)",
  },
  {
    v: "files", ptr: "", mods: "", ui: 4, app: 4, mixed: true, cmd: "git subtree add --prefix=vendor/ui https://github.com/ana/ui.git main",
    out: "Added dir 'vendor/ui'",
  },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

export const submodulos: Escena = {
  title: "Un repo dentro de otro: submódulo o subtree",
  steps: [
    { title: "Un repo dentro de otro", text: "<code>git submodule add</code> clona <code>ui</code> dentro de <code>vendor/ui</code> y crea <code>.gitmodules</code>, que guarda la ruta y la URL del otro repo.", ms: 7500 },
    { title: "El padre guarda solo un puntero", text: "<code>app</code> no guarda los archivos de <code>ui</code>: guarda una entrada especial (modo 160000) con el hash de un commit exacto, <code>8e1f0a2</code>.", ms: 8000 },
    { title: "Clonaste y la carpeta está vacía", text: "Un <code>git clone</code> normal trae el puntero, pero no el contenido: <code>vendor/ui</code> queda vacía. Es el error más común con submódulos.", ms: 7500 },
    { title: "Inicializa y descarga", text: "<code>git submodule update --init --recursive</code> lo arregla. Para no llegar a esto, clona con <code>git clone --recurse-submodules</code>.", ms: 7500 },
    { title: "ui avanza; el puntero, no", text: "<code>ui</code> tiene un commit nuevo y lo bajas en <code>vendor/ui</code>. Pero <code>app</code> sigue registrando <code>8e1f0a2</code>: <code>git status</code> lo marca como modificado.", ms: 8000 },
    { title: "Mover el puntero es un commit", text: "Para que todo el equipo use <code>c47b9d3</code>, haces commit en <code>app</code>. Ese commit solo cambia el hash al que apunta <code>vendor/ui</code>.", ms: 7500 },
    { title: "Subtree: copia, no puntero", text: "<code>git subtree add</code> copia los archivos de <code>ui</code> dentro de <code>app</code> y mezcla su historia. Clonar no pide pasos extra; actualizar es un merge con <code>git subtree pull</code>.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("sm");
    term = consola(stage);
    const board = document.createElement("div");
    board.className = "sm-board";
    board.innerHTML = `
      <section class="sm-repo sm-app"><b class="sm-name">app <small>repo padre</small></b>
        <ul class="sm-tree">
          <li><span class="gk-file">src/</span></li>
          <li><span class="gk-file">package.json</span></li>
          <li class="sm-mods"><span class="gk-file">.gitmodules</span></li>
          <li class="sm-vendor"><span class="gk-file sm-vf">vendor/ui</span><span class="sm-ptr"><i>→ ui @</i> <b></b></span><span class="sm-pend"></span><span class="sm-empty">✕ carpeta vacía</span>
            <span class="sm-files"><span class="gk-file f-new">button.js</span><span class="gk-file f-new">theme.css</span></span></li>
        </ul>
        <div class="sm-hist"><span class="sm-l">commits de app</span><span class="sm-dots sm-appd"></span></div>
      </section>
      <section class="sm-repo sm-ui"><b class="sm-name">ui <small>otro repo</small></b>
        <div class="sm-chain">${UI.map((h) => `<span class="sm-c" data-h="${h}"><i></i><span class="sm-h">${h}</span></span>`).join("")}</div>
      </section>`;
    stage.appendChild(board);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>commit al que apunta app</span><span><i class="l-mod"></i>cambio sin commit</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-copy"></i>historia de ui mezclada</span><span><i class="l-conflict"></i>error</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const s = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(s.cmd, t, 0, s.out || "");
    const q = (sel: string) => root.querySelector(sel) as HTMLElement;
    const prevV = root.dataset.v;
    root.dataset.v = s.v;
    root.classList.toggle("is-mixed", !!s.mixed);
    root.classList.toggle("is-pending", !!s.pending);
    const mods = q(".sm-mods");
    mods.style.display = s.mods ? "" : "none";
    mods.querySelector(".gk-file")!.classList.toggle("f-new", s.mods === "new");
    const ptr = q(".sm-ptr b");
    ptr.textContent = s.ptr;
    q(".sm-ptr").classList.toggle("is-new", !!s.ptrNew);
    q(".sm-pend").textContent = s.pending ? "en disco: " + s.pending : "";

    // cadena de ui
    root.querySelectorAll<HTMLElement>(".sm-c").forEach((el, k) => {
      const show = k < s.ui;
      const was = el.classList.contains("on");
      el.classList.toggle("on", show);
      el.classList.toggle("is-ptr", s.v !== "files" && el.dataset.h === s.ptr);
      el.classList.toggle("is-new", !!s.uiNew && k === s.ui - 1);
      if (t && show && !was) t.fromTo(el, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: "back.out(2)", clearProps: "all" }, d);
    });
    // historia de app
    const ad = q(".sm-appd");
    const had = ad.children.length;
    const mix = s.mixed ? '<i class="mx"></i><i class="mx"></i><i class="mx"></i>' : "";
    ad.innerHTML = "<i></i>".repeat(s.app - (s.appNew ? 1 : 0)) + (s.appNew ? '<i class="nw"></i>' : "") + mix;
    if (t && (s.appNew && had < s.app)) t.fromTo(ad.querySelector(".nw"), { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(2)", clearProps: "transform" }, d + 0.2);
    if (t && s.mixed) t.fromTo(ad.querySelectorAll(".mx"), { scale: 0 }, { scale: 1, duration: 0.4, stagger: 0.12, ease: "back.out(2)", clearProps: "transform" }, d + 0.2);
    if (t && prevV !== s.v) {
      const target = s.v === "empty" ? ".sm-empty" : s.v === "files" ? ".sm-files" : ".sm-ptr";
      t.fromTo(q(target), { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5, ease: s.v === "empty" ? "elastic.out(1, 0.5)" : "back.out(2)", clearProps: "all" }, d);
    }
    if (t && s.ptrNew) t.fromTo(ptr, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.45, clearProps: "all" }, d + 0.1);
  },
};
