/*
  Animación: el reflog como red de seguridad. Un reset --hard por error deja tres commits sin rama;
  git reflog lista por dónde pasó HEAD, cada entrada señala su commit, y con su nombre HEAD@{n} se
  recuperan (reset de vuelta o una rama nueva). Al final, sus límites.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Nodo } from "./_kit";
import "./reflog.css";

const H: Record<string, string> = { A: "1a0b4f3", B: "4b8d0f1", C: "7c2e9a5", D: "d93f1b6", E: "e5f6a7b" };
const mk = (id: string, x: number, p?: string) => c(id, x, 0, p, { msg: H[id] });
const A = mk("A", 0), B = mk("B", 1, "A"), C = mk("C", 2, "B"), D = mk("D", 3, "C"), E = mk("E", 4, "D");
const tone = (ns: Nodo[], t: Nodo["tone"]) => ns.map((n) => ({ ...n, tone: t }));

// Entradas del reflog: [commit, texto]
type Linea = [string, string];
const BASE: Linea[] = [
  ["E", "commit: agrega pagos"],
  ["D", "commit: valida tarjeta"],
  ["C", "commit: crea checkout"],
  ["B", "commit: agrega carrito"],
];
const TRAS_RESET: Linea[] = [["B", "reset: moving to HEAD~3"], ...BASE];
const TRAS_VOLVER: Linea[] = [["E", "reset: moving to HEAD@{1}"], ...TRAS_RESET];

type Paso = { g: Grafo; cmd: string; out?: string; log?: Linea[]; hl?: number; walk?: boolean; note?: boolean };
const perdido: Grafo = { nodes: [A, B, ...tone([C, D, E], "ghost")], refs: [{ name: "main", at: "B" }], head: "main" };
const PASOS: Paso[] = [
  { cmd: "git log --oneline", out: `${H.E} (HEAD -> main) agrega pagos\n${H.D} valida tarjeta\n${H.C} crea checkout…`,
    g: { nodes: [A, B, C, D, E], refs: [{ name: "main", at: "E" }], head: "main" } },
  { cmd: "git reset --hard HEAD~3", out: `HEAD is now at ${H.B} agrega carrito`, g: perdido },
  { cmd: "git reflog", g: perdido, log: TRAS_RESET, walk: true },
  { cmd: "git show --oneline -s HEAD@{1}", out: `${H.E} agrega pagos`, g: { ...perdido, nodes: [A, B, ...tone([C, D], "ghost"), { ...E, tone: "hl" }] },
    log: TRAS_RESET, hl: 1 },
  { cmd: "git reset --hard HEAD@{1}", out: `HEAD is now at ${H.E} agrega pagos`,
    g: { nodes: [A, B, ...tone([C, D, E], "ok")], refs: [{ name: "main", at: "E" }], head: "main" }, log: TRAS_VOLVER, hl: 0 },
  { cmd: "git branch rescate HEAD@{1}",
    g: { nodes: [A, B, ...tone([C, D, E], "ok")], refs: [{ name: "main", at: "B" }, { name: "rescate", at: "E" }], head: "main" },
    log: TRAS_RESET, hl: 1 },
  { cmd: "", g: { nodes: [A, B, C, D, E], refs: [{ name: "main", at: "B" }, { name: "rescate", at: "E" }], head: "main" },
    log: TRAS_RESET, note: true },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;

export const reflog: Escena = {
  title: "El reflog recuerda por dónde pasó HEAD",
  steps: [
    { title: "Cinco commits en main", text: "Llevas una tarde de trabajo: <code>main</code> apunta a E. Debajo de cada commit va su hash corto.", ms: 6000 },
    { title: "Un reset --hard por error", text: "Querías deshacer un cambio y retrocediste tres commits. C, D y E ya no salen en <code>git log</code>. Parece que los perdiste, pero siguen en el repositorio.", ms: 8000 },
    { title: "git reflog: el diario de HEAD", text: "Git anota cada vez que HEAD se mueve: commits, resets, cambios de rama. Cada línea tiene un nombre, <code>HEAD@{n}</code>, y apunta a un commit.", ms: 9000 },
    { title: "HEAD@{1} es tu último commit", text: "Justo antes del reset, HEAD estaba en E. <code>HEAD@{1}</code> significa “una posición antes”: ese es el commit que quieres recuperar.", ms: 7500 },
    { title: "Rescate: reset de vuelta", text: "<code>git reset --hard HEAD@{1}</code> devuelve <code>main</code> a E y los tres commits vuelven a estar apuntados. El rescate también queda anotado en el reflog.", ms: 8000 },
    { title: "O una rama de rescate", text: "Si prefieres no mover <code>main</code>, <code>git branch rescate HEAD@{1}</code> pega una rama nueva en E. Basta con que algo los apunte.", ms: 7500 },
    { title: "Lo que el reflog no cubre", text: "Es local: no viaja con <code>push</code>. Sus entradas duran 90 días (30 si el commit quedó sin rama). Lo que nunca llegó a un commit ni al staging no está ahí.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("rf");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "rf-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 5, rows: 1, bottom: 46 });
    const log = document.createElement("div");
    log.className = "rf-log";
    log.innerHTML = `<span class="rf-cap">git reflog</span><ol class="rf-list"></ol>
      <ul class="rf-note">
        <li>Solo existe en tu máquina: no viaja con <span class="mo">push</span> ni con <span class="mo">clone</span>.</li>
        <li>Cada entrada dura 90 días; 30 si su commit quedó sin rama que lo alcance.</li>
        <li><b>✕</b> Cambios que nunca entraron en un commit ni en el staging: no hay copia.</li>
      </ul>`;
    stage.appendChild(log);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-ghost"></i>sin rama que lo apunte</span><span><i class="l-ok"></i>recuperado</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    g.render(p.g, t, instant ? 0 : d);

    const box = root.querySelector(".rf-log") as HTMLElement;
    const list = box.querySelector(".rf-list") as HTMLElement;
    const lines = p.log || [];
    box.classList.toggle("is-on", lines.length > 0);
    box.classList.toggle("has-note", !!p.note);
    box.querySelector(".rf-cap")!.textContent = p.note ? "Límites del reflog" : "git reflog";
    list.innerHTML = lines.map(([id, txt], k) =>
      `<li data-k="${k}"><span class="rf-h">${H[id]}</span> <span class="rf-n">HEAD@{${k}}:</span> <span class="rf-t">${txt}</span></li>`).join("");
    const items = list.querySelectorAll<HTMLElement>("li");
    if (p.hl !== undefined) items[p.hl]?.classList.add("is-hl");
    if (!t) return;

    const at = d + 0.2;
    if (lines.length && !PASOS[i - 1]?.log) t.fromTo(box, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, at);
    if (p.walk) {
      // cada línea se ilumina y señala su commit en el grafo
      items.forEach((li, k) => {
        const id = lines[k][0];
        const node = g.svg.querySelectorAll<SVGGElement>(".gk-node")[Object.keys(H).indexOf(id)];
        const s = at + 0.5 + k * 0.8;
        t.call(() => { items.forEach((x) => x.classList.remove("is-walk")); li.classList.add("is-walk"); node?.classList.add("rf-ping"); }, [], s);
        t.call(() => { node?.classList.remove("rf-ping"); }, [], s + 0.75);
      });
      t.call(() => items.forEach((x) => x.classList.remove("is-walk")), [], at + 0.5 + items.length * 0.8);
    }
    if (p.hl === 0 && i === 4) t.fromTo(items[0], { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.45 }, at + 0.4);
    if (p.note) t.fromTo(box.querySelectorAll(".rf-note li"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.35 }, at);
  },
};
