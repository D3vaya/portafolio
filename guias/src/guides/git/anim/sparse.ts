/*
  Animación: repos gigantes. Un monorepo pesado y tres herramientas: clon parcial
  (--filter=blob:none: commits y árboles completos, contenidos bajo demanda), sparse-checkout (solo
  algunas carpetas en el directorio de trabajo, historia completa) y clon superficial (--depth 1,
  solo el último commit). Cierra con scalar. Todas las cifras son ilustrativas.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import "./sparse.css";

const FOLDERS: [string, string][] = [
  ["apps/web/", "380 MB"], ["apps/mobile/", "520 MB"], ["services/pagos/", "90 MB"], ["docs/", "60 MB"], ["assets/", "2,1 GB"],
];
const MAX = 9.6;
type Hist = "full" | "lazy" | "shallow";
type St = { dl: number; wd: number; on: number[]; hist: Hist; warn?: boolean; maint?: boolean; cmd: string; out?: string };
const ALL = [0, 1, 2, 3, 4];
const URL = "https://github.com/ana/mono.git";
const PASOS: St[] = [
  { dl: 9.6, wd: 3.2, on: ALL, hist: "full", cmd: `git clone ${URL}`, out: "Receiving objects: 100% (2381204/2381204), 9.60 GiB | 38.00 MiB/s, done." },
  { dl: 2.1, wd: 3.2, on: ALL, hist: "lazy", cmd: `git clone --filter=blob:none ${URL}`, out: "Receiving objects: 100% (912034/912034), 2.10 GiB | 38.00 MiB/s, done." },
  { dl: 2.1, wd: 0.5, on: [0, 2], hist: "lazy", cmd: "git sparse-checkout set apps/web services/pagos" },
  { dl: 0.6, wd: 0.5, on: [0, 2], hist: "lazy", cmd: `git clone --filter=blob:none --sparse ${URL}`, out: "# luego: git sparse-checkout set apps/web services/pagos" },
  { dl: 1.3, wd: 3.2, on: ALL, hist: "shallow", cmd: `git clone --depth 1 ${URL}`, out: "Receiving objects: 100% (61022/61022), 1.30 GiB | 38.00 MiB/s, done." },
  { dl: 1.3, wd: 3.2, on: ALL, hist: "shallow", warn: true, cmd: "git log --oneline", out: '<span class="warn">e70c9a3 (grafted, HEAD -&gt; main, origin/main) agrega pago</span>' },
  { dl: 0.6, wd: 0.5, on: [0, 2], hist: "lazy", maint: true, cmd: `scalar clone ${URL}` },
];
const gb = (n: number) => (n < 1 ? Math.round(n * 1000) + " MB" : String(n).replace(".", ",") + " GB");

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

export const sparse: Escena = {
  title: "Un monorepo sin bajarlo entero",
  steps: [
    { title: "Un monorepo pesado", text: "Un clon normal baja toda la historia con cada versión de cada archivo. Aquí, 9,6 GB, sobre todo por <code>assets/</code>. Las cifras son ilustrativas.", ms: 7000 },
    { title: "Clon parcial: contenidos bajo demanda", text: "<code>--filter=blob:none</code> baja todos los commits y árboles, pero solo los contenidos de la versión actual. Las versiones viejas de un archivo llegan cuando las pides.", ms: 8500 },
    { title: "Solo las carpetas que usas", text: "<code>git sparse-checkout set</code> deja en tu carpeta de trabajo solo <code>apps/web</code> y <code>services/pagos</code> (más los archivos de la raíz). La historia sigue completa.", ms: 8000 },
    { title: "Las dos juntas", text: "Con <code>--sparse</code> el clon parcial arranca sin carpetas, y Git solo baja los contenidos de las que eliges. Es la combinación más liviana para el día a día.", ms: 8000 },
    { title: "Clon superficial: solo el último commit", text: "<code>--depth 1</code> baja una sola foto del proyecto, sin historia. Es ideal para CI, que solo necesita compilar y probar.", ms: 7000 },
    { title: "Lo que pierdes con --depth", text: "<code>git log</code> y <code>git blame</code> ven un solo commit, y algunos merges o rebases fallan por falta de historia. <code>git fetch --unshallow</code> trae el resto.", ms: 8000 },
    { title: "scalar lo configura por ti", text: "<code>scalar</code> viene con Git: <code>scalar clone</code> crea un clon parcial con sparse-checkout y registra el mantenimiento en segundo plano. Agregas carpetas con <code>git sparse-checkout add</code>.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("sp");
    term = consola(stage);
    const board = document.createElement("div");
    board.className = "sp-board";
    board.innerHTML = `
      <section class="sp-box">
        <div class="sp-hist"><span class="sp-l">historia</span><span class="sp-dots">${"<i></i>".repeat(6)}</span><em class="sp-hn"></em></div>
        <span class="sp-l">carpeta de trabajo</span>
        <ul class="sp-tree">${FOLDERS.map(([f, s], k) => `<li data-k="${k}"><span class="gk-file">${f}</span><em>${s}</em></li>`).join("")}</ul>
        <span class="sp-maint">mantenimiento en segundo plano ✓</span>
      </section>
      <section class="sp-bars">
        <div class="sp-row"><span class="sp-l">Descargado</span><div class="sp-bar"><i class="sp-full"></i><i class="sp-dl"></i></div><b class="sp-dv"></b></div>
        <div class="sp-row"><span class="sp-l">En tu carpeta de trabajo</span><div class="sp-bar"><i class="sp-wd"></i></div><b class="sp-wv"></b></div>
        <small>cifras ilustrativas · clon completo: 9,6 GB</small>
      </section>`;
    stage.appendChild(board);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i></i>commit con sus contenidos</span><span><i class="l-ghost"></i>contenidos bajo demanda</span><span><i class="sp-l-off"></i>carpeta fuera del sparse-checkout</span><span><i class="sp-l-sh"></i>único commit (shallow)</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const s = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(s.cmd, t, 0, s.out || "");
    const q = (sel: string) => root.querySelector(sel) as HTMLElement;
    root.classList.toggle("is-warn", !!s.warn);
    root.classList.toggle("has-maint", !!s.maint);
    const histChanged = root.dataset.hist !== s.hist;
    root.dataset.hist = s.hist;
    q(".sp-hn").textContent = s.hist === "full" ? "completa" : s.hist === "lazy" ? "completa · contenidos viejos bajo demanda" : "1 commit (grafted)";
    const changed: HTMLElement[] = [];
    root.querySelectorAll<HTMLElement>(".sp-tree li").forEach((li, k) => {
      const off = !s.on.includes(k);
      if (off !== li.classList.contains("off")) changed.push(li);
      li.classList.toggle("off", off);
    });
    q(".sp-dv").textContent = gb(s.dl);
    q(".sp-wv").textContent = gb(s.wd);
    const dl = q(".sp-dl"), wd = q(".sp-wd");
    const w1 = (s.dl / MAX) * 100 + "%", w2 = (s.wd / MAX) * 100 + "%";
    if (!t) { dl.style.width = w1; wd.style.width = w2; return; }
    t.to(dl, { width: w1, duration: 1.1, ease: "power3.inOut" }, d);
    t.to(wd, { width: w2, duration: 1.1, ease: "power3.inOut" }, d + 0.15);
    if (changed.length) t.fromTo(changed, { x: -8 }, { x: 0, duration: 0.5, stagger: 0.08, ease: "back.out(2)", clearProps: "transform" }, d);
    if (histChanged) t.fromTo(root.querySelectorAll(".sp-dots i"), { scale: 0.5 }, { scale: 1, duration: 0.45, stagger: 0.05, ease: "back.out(2)", clearProps: "transform" }, d);
  },
};
