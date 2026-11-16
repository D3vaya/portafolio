/*
  Animación: deshacer lo básico según dónde esté el cambio. git restore descarta cambios del
  directorio de trabajo (vuelve la versión del staging); git restore --staged saca del staging y
  conserva el trabajo; git commit --amend reemplaza el último commit por uno nuevo (el viejo queda
  sin referencia). Cierre: tabla mental "¿dónde está lo que quiero deshacer?".
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo } from "./_kit";
import { foto, mover, volar, limpiar } from "./_basico";
import "./deshacer.css";

type St = "" | "mod";
type Vuelo = { de: string; a: string; at: number };
type Paso = { cmd: string; out?: string; w: St; s: St; g: Grafo; vuelos?: Vuelo[]; nota?: string; tabla?: boolean };

const A = c("A", 0.5, 0), B = c("B", 1.5, 0, "A");
const C = c("C", 2.5, 0, "B", { msg: "agrega lgoin" });
const C2 = c("C2", 2.5, 0, "B", { label: "C′", msg: "agrega login", tone: "new" });
const G0: Grafo = { nodes: [A, B], refs: [{ name: "main", at: "B" }], head: "main" };

const PASOS: Paso[] = [
  { cmd: "git status --short", out: '<span class="bad"> M</span> app.js', w: "mod", s: "", g: G0 },
  { cmd: "git restore app.js", w: "", s: "", g: G0, vuelos: [{ de: "s", a: "w", at: 0 }],
    nota: `<p class="bx-note is-warn"><b>Lo que no guardaste se pierde.</b> Esos cambios nunca estuvieron en un commit: ni <span class="mo">git reflog</span> los recupera.</p>` },
  { cmd: "git add app.js", w: "", s: "mod", g: G0, vuelos: [{ de: "w", a: "s", at: 0 }] },
  { cmd: "git restore --staged app.js", w: "mod", s: "", g: G0, vuelos: [{ de: "head", a: "s", at: 0 }],
    nota: `<p class="bx-note is-ok"><b>✓ Tus cambios siguen en el trabajo.</b> Solo salieron del próximo commit: el staging volvió a la versión del último commit.</p>` },
  { cmd: 'git commit -am "agrega lgoin"', out: "[main 5d0c3b7] agrega lgoin\n 1 file changed, 12 insertions(+)", w: "", s: "",
    g: { nodes: [A, B, { ...C, tone: "new" }], refs: [{ name: "main", at: "C" }], head: "main" }, vuelos: [{ de: "w", a: "head", at: 0 }] },
  { cmd: 'git commit --amend -m "agrega login"', out: "[main 8e2f1a7] agrega login\n Date: Mon Mar 9 10:24:31 2026 -0300\n 1 file changed, 12 insertions(+)", w: "", s: "",
    g: { nodes: [A, B, { ...C, y: 1, tone: "ghost" }, C2], refs: [{ name: "main", at: "C2" }], head: "main" },
    nota: `<p class="bx-note is-warn"><b>No lo hagas si ya hiciste push.</b> C′ es un commit distinto: quien ya tenga C tendría dos historias que no coinciden.</p>` },
  { cmd: "git status", out: "On branch main\nnothing to commit, working tree clean", w: "", s: "",
    g: { nodes: [A, B, C2], refs: [{ name: "main", at: "C2" }], head: "main" }, tabla: true },
];

const TABLA = `
  <div class="dz-tabla" data-k="tabla">
    <b class="dz-tt">¿Dónde está lo que quieres deshacer?</b>
    <div class="dz-tr"><span class="dz-a is-w">Trabajo</span><span class="mo">git restore app.js</span><em class="is-warn">se pierde para siempre</em></div>
    <div class="dz-tr"><span class="dz-a is-s">Staging</span><span class="mo">git restore --staged app.js</span><em class="is-ok">tus cambios se conservan</em></div>
    <div class="dz-tr"><span class="dz-a is-r">Último commit</span><span class="mo">git commit --amend</span><em class="is-warn">solo si no hiciste push</em></div>
  </div>`;

let root: HTMLElement;
let board: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;
let g: ReturnType<typeof grafo>;

const chip = (area: string, st: St) => `<span class="gk-file${st ? " f-" + st : ""}" data-k="${area}" data-sig="${st}">app.js</span>`;

export const deshacer: Escena = {
  title: "Deshacer según dónde esté el cambio",
  steps: [
    { title: "Cambiaste app.js y te arrepientes", text: "El cambio está solo en tu directorio de trabajo: no lo preparaste ni lo guardaste en un commit.", ms: 6500 },
    { title: "git restore descarta el cambio", text: "<code>git restore app.js</code> trae de vuelta la versión del staging y la pone sobre tu archivo. Es la única de estas acciones que no tiene vuelta atrás.", ms: 8500 },
    { title: "Preparaste algo de más", text: "Ahora el cambio está en el staging, listo para el próximo commit, pero no quieres que entre todavía.", ms: 6500 },
    { title: "--staged lo saca del staging", text: "<code>git restore --staged app.js</code> devuelve el staging a la versión del último commit. Tu archivo no se toca: el cambio sigue en el trabajo.", ms: 8000 },
    { title: "Un commit con un error", text: "<code>git commit -am</code> prepara y guarda todo en un paso. Pero el mensaje dice «lgoin».", ms: 6500 },
    { title: "--amend reemplaza el último commit", text: "<code>git commit --amend</code> crea un commit nuevo, C′, con el mismo padre, y mueve <code>main</code> a él. C no se edita: queda sin rama (punteado).", ms: 9000 },
    { title: "Primero pregúntate dónde está", text: "En el trabajo, en el staging o en el último commit: cada lugar tiene su comando. Antes de descartar, revisa con <code>git status</code>.", ms: 8000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("dz");
    term = consola(stage);
    board = document.createElement("div");
    board.className = "dz-board";
    board.innerHTML = `
      <div class="dz-areas">
        <section class="dz-col"><header class="dz-h"><b>Trabajo</b><span>tus archivos</span></header><div class="dz-files dz-w"></div></section>
        <section class="dz-col"><header class="dz-h"><b>Staging</b><span>próximo commit</span></header><div class="dz-files dz-s"></div></section>
        <section class="dz-col dz-repo"><header class="dz-h"><b>Repositorio</b><span>commits</span></header><div class="dz-graph"></div></section>
      </div>
      <div class="dz-extra"></div>`;
    stage.appendChild(board);
    g = grafo(board.querySelector(".dz-graph")!, { cols: 4, rows: 2, bottom: 40 });
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-mod"></i>cambio</span><span><i class="l-fneutral"></i>igual al último commit</span><span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-new"></i>commit nuevo</span><span><i class="l-ghost"></i>sin rama que lo apunte</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    limpiar(board);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const antes = foto(board);
    const q = (s: string) => board.querySelector<HTMLElement>(s)!;
    q(".dz-w").innerHTML = chip("w", p.w) + `<span class="gk-file">index.html</span>`;
    q(".dz-s").innerHTML = chip("s", p.s) + `<span class="gk-file">index.html</span>`;
    q(".dz-extra").innerHTML = p.tabla ? TABLA : p.nota ? p.nota.replace("<p ", `<p data-k="nota${i}" `) : "";
    const d = term.show(p.cmd, t, 0, p.out || "");
    // el commit al que apunta HEAD, como origen o destino de un viaje
    const headId = p.g.refs![0].at;
    const headEl = {
      getBoundingClientRect() {
        const r = g.svg.getBoundingClientRect(), k = r.width / g.W, pt = g.at(headId) ?? { x: g.px(2.5), y: g.py(0) };
        return new DOMRect(r.left + (pt.x - 15) * k, r.top + (pt.y - 15) * k, 30 * k, 30 * k);
      },
    } as HTMLElement;
    const el = (k: string) => (k === "head" ? headEl : board.querySelector<HTMLElement>(`[data-k="${k}"]`));
    (p.vuelos || []).forEach((v) => {
      const dur = volar(board, el(v.de), el(v.a), `<span class="gk-file${v.a === "head" || p[v.a as "w" | "s"] ? " f-mod" : ""}">app.js</span>`, t, d + v.at);
      const dest = board.querySelector<HTMLElement>(`[data-k="${v.a}"]`);
      if (dest && t) dest.dataset.d = String(v.at + dur * 0.85);
    });
    g.render(p.g, t, t ? d + (p.vuelos?.some((v) => v.a === "head") ? 0.8 : 0) : 0);
    mover(board, antes, t, d);
  },
};
