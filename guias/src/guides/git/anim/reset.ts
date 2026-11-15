/*
  Animación: reset --soft, --mixed y --hard. Arriba el grafo (la rama retrocede de C a B); abajo las
  tres áreas (repositorio, staging, trabajo) con la versión de app.js que tiene cada una. Cada modo
  mueve una, dos o tres de ellas. Al final, un resumen en una fila.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo } from "./_kit";
import "./reset.css";

type V = "v2" | "v3";
type Area = { v: V; moved?: boolean; note?: string; tone?: "mod" | "bad"; lost?: V };
type Paso = { g: Grafo; cmd: string; out?: string; areas: [Area, Area, Area]; sum?: boolean };

const A = c("A", 0, 0, undefined, { msg: "app.js v1" });
const B = c("B", 1, 0, "A", { msg: "app.js v2" });
const C = c("C", 2, 0, "B", { msg: "app.js v3" });
const enC: Grafo = { nodes: [A, B, C], refs: [{ name: "main", at: "C" }], head: "main" };
const enB = (ghostNote = ""): Grafo => ({
  nodes: [A, B, { ...C, tone: "ghost", msg: ghostNote || "app.js v3" }],
  refs: [{ name: "main", at: "B" }],
  head: "main",
});

const PASOS: Paso[] = [
  { cmd: "git status", out: "On branch main\nnothing to commit, working tree clean", g: enC,
    areas: [{ v: "v3", note: "commit C" }, { v: "v3" }, { v: "v3" }] },
  { cmd: "git reset --soft HEAD~1", g: enB(),
    areas: [{ v: "v2", moved: true, note: "commit B" }, { v: "v3", note: "listo para commit", tone: "mod" }, { v: "v3" }] },
  { cmd: "git reset --soft ORIG_HEAD", g: enC,
    areas: [{ v: "v3", moved: true, note: "commit C" }, { v: "v3" }, { v: "v3" }] },
  { cmd: "git reset HEAD~1", out: "Unstaged changes after reset:\nM\tapp.js", g: enB(),
    areas: [{ v: "v2", moved: true, note: "commit B" }, { v: "v2", moved: true }, { v: "v3", note: "sin agregar", tone: "mod" }] },
  { cmd: "git reset ORIG_HEAD", g: enC,
    areas: [{ v: "v3", moved: true, note: "commit C" }, { v: "v3", moved: true }, { v: "v3" }] },
  { cmd: "git reset --hard HEAD~1", out: "HEAD is now at 9b1e4d7 crea app.js v2", g: enB("en el reflog"),
    areas: [{ v: "v2", moved: true, note: "commit B" }, { v: "v2", moved: true, note: "✕ se pierde lo sin commit", tone: "bad", lost: "v3" },
      { v: "v2", moved: true, note: "✕ se pierde lo sin commit", tone: "bad", lost: "v3" }] },
  { cmd: "", g: enB("en el reflog"), sum: true,
    areas: [{ v: "v2", note: "commit B" }, { v: "v2" }, { v: "v2" }] },
];

const NOMBRES: [string, string][] = [["Repositorio", "HEAD → main"], ["Staging", "lo que irá al commit"], ["Trabajo", "tus archivos"]];
const RESUMEN: [string, number, string][] = [
  ["--soft", 1, "solo la rama"],
  ["--mixed", 2, "rama y staging (por defecto)"],
  ["--hard", 3, "rama, staging y trabajo"],
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;

export const reset: Escena = {
  title: "Qué mueve cada modo de git reset",
  steps: [
    { title: "Tres lugares, la misma versión", text: "<code>main</code> apunta a C. El repositorio, el staging y tu carpeta de trabajo tienen <code>app.js</code> en v3: no hay nada pendiente.", ms: 7000 },
    { title: "--soft: solo mueve la rama", text: "Estás en <code>main</code>, así que reset mueve <b>la rama</b>, no solo HEAD: <code>main</code> vuelve a B. Staging y trabajo siguen en v3: los cambios de C quedan listos para commit.", ms: 8500 },
    { title: "Volver es otro reset", text: "Antes de cada reset, Git guarda en <code>ORIG_HEAD</code> dónde estaba la rama. <code>git reset --soft ORIG_HEAD</code> la devuelve a C.", ms: 7000 },
    { title: "--mixed: rama y staging", text: "Sin opción, reset es <code>--mixed</code>: mueve la rama y copia B al staging. Tu archivo sigue en v3, pero como cambio sin agregar.", ms: 8000 },
    { title: "De nuevo en C", text: "<code>git reset ORIG_HEAD</code> (mixed) devuelve la rama y el staging a C. Tu carpeta nunca cambió.", ms: 6500 },
    { title: "--hard: las tres cosas", text: "Rama, staging y trabajo quedan en B. Lo que no estaba en un commit se pierde para siempre. C no: sigue en el reflog y puedes recuperarlo.", ms: 9000 },
    { title: "Una, dos o tres cosas", text: "Los tres modos mueven la rama. <code>--mixed</code> además el staging y <code>--hard</code> también tu carpeta. Antes de un <code>--hard</code>, revisa <code>git status</code>.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("rs");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "rs-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 3, rows: 1, bottom: 44 });
    const wrap = document.createElement("div");
    wrap.className = "rs-wrap";
    wrap.innerHTML = `
      <div class="rs-areas">${NOMBRES.map(([n, s], k) => `
        <div class="rs-box" data-k="${k}">
          <span class="rs-moved">se movió</span>
          <b class="rs-name">${n}</b><span class="rs-sub">${s}</span>
          <div class="rs-file"><span class="gk-file">app.js</span><em class="rs-v"></em><s class="rs-lost"></s></div>
          <span class="rs-note"></span>
        </div>`).join("")}
      </div>
      <div class="rs-sum">
        <div class="rs-row rs-hd"><span></span><span>rama</span><span>staging</span><span>trabajo</span></div>
        ${RESUMEN.map(([m, n, d]) => `
        <div class="rs-row" data-n="${n}"><span class="rs-m"><span class="mo">${m}</span><em>${d}</em></span>${[1, 2, 3].map((k) => `<i class="${k <= n ? "on" : ""}">${k <= n ? "mueve" : "igual"}</i>`).join("")}</div>`).join("")}
      </div>`;
    stage.appendChild(wrap);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-ghost"></i>sin rama que lo apunte</span><span><i class="l-mod"></i>distinto del commit</span><span><i class="l-conflict"></i>se pierde</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    g.render(p.g, t, instant ? 0 : d);
    const at = instant ? 0 : d + 0.35;

    root.classList.toggle("is-sum", !!p.sum);
    root.querySelectorAll<HTMLElement>(".rs-box").forEach((el, k) => {
      const a = p.areas[k];
      const vEl = el.querySelector(".rs-v") as HTMLElement;
      const changed = vEl.textContent !== a.v;
      vEl.textContent = a.v;
      el.querySelector(".rs-note")!.textContent = a.note || "";
      el.querySelector(".rs-lost")!.textContent = a.lost || "";
      el.className = "rs-box" + (a.moved ? " is-moved" : "") + (a.tone ? " t-" + a.tone : "");
      if (t && a.moved) {
        t.fromTo(el, { boxShadow: "0 0 0 0 rgba(255,91,31,0)" }, { boxShadow: "0 0 26px -6px rgba(255,91,31,.9)", duration: 0.4, yoyo: true, repeat: 1, clearProps: "boxShadow" }, at + k * 0.25);
        if (changed) t.fromTo(vEl, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2)" }, at + k * 0.25);
        t.fromTo(el.querySelector(".rs-moved"), { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.3 }, at + k * 0.25);
      }
      if (t && a.lost) t.fromTo(el.querySelector(".rs-lost"), { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.4, ease: "elastic.out(1, 0.5)" }, at + 0.8);
    });
    if (t && p.sum) {
      t.fromTo(root.querySelectorAll(".rs-sum .rs-row"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.25 }, 0.1);
      t.fromTo(root.querySelectorAll(".rs-sum i.on"), { scale: 0.5 }, { scale: 1, duration: 0.35, ease: "back.out(2)", stagger: 0.12 }, 0.4);
    }
  },
};
