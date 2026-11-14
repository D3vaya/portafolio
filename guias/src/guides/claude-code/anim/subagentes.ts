/*
  Animación: subagentes. Dos ventanas de contexto lado a lado. La sesión principal delega una
  tarea; el subagente arranca con su propio contexto (lo que carga al iniciar), se llena leyendo
  archivos y a la principal solo vuelve un resumen. Al final, un fork: copia la conversación completa.
  Las alturas de los bloques son ilustrativas: muestran proporción, no tokens reales.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./subagentes.css";

type Kind = "sys" | "you" | "task" | "sub" | "read" | "ok" | "copy";
type Blk = { k: string; label: string; h: number; c: Kind; from?: string };
type Estado = {
  main: Blk[];
  sub: Blk[];
  mode: "off" | "sub" | "fork";
  send?: "task" | "sum" | "conv";
  mainSt: string;
  subSt: string;
  files: number; // archivos leídos por el subagente
  notes: "none" | "miss" | "fork";
  compare?: boolean;
};

const M_SYS: Blk = { k: "m-sys", label: "System prompt de Claude Code", h: 12, c: "sys" };
const M_HIST: Blk = { k: "m-hist", label: "Tu historial", h: 24, c: "you" };
const M_FILES: Blk = { k: "m-files", label: "Archivos ya leídos", h: 14, c: "you" };
const M_SUM: Blk = { k: "m-sum", label: "Resumen del subagente", h: 8, c: "ok" };
const MAIN = [M_SYS, M_HIST, M_FILES];
const MAIN2 = [...MAIN, M_SUM];

const S_BASE: Blk[] = [
  { k: "s-sys", label: "Su system prompt + entorno", h: 9, c: "sub" },
  { k: "s-task", label: "Mensaje de tarea", h: 7, c: "task" },
  { k: "s-md", label: "CLAUDE.md + snapshot de git", h: 9, c: "sub" },
  { k: "s-sk", label: "Skills de su campo skills", h: 7, c: "sub" },
];
const S_READ: Blk = { k: "s-read", label: "Archivos que leyó", h: 50, c: "read" };
const FORK: Blk[] = [
  ...MAIN2.map((b) => ({ k: "f" + b.k, label: b.label + " (copia)", h: b.h, c: "copy" as Kind, from: b.k })),
  { k: "f-task", label: "Tarea de /subtask", h: 7, c: "task" },
];

const ESTADOS: Estado[] = [
  { main: MAIN, sub: [], mode: "off", mainSt: "trabajando", subSt: "sin lanzar", files: 0, notes: "none" },
  { main: MAIN, sub: [], mode: "sub", send: "task", mainSt: "delegando", subSt: "iniciando…", files: 0, notes: "none" },
  { main: MAIN, sub: S_BASE, mode: "sub", mainSt: "sigues trabajando", subSt: "listo para empezar", files: 0, notes: "miss" },
  { main: MAIN, sub: [...S_BASE, S_READ], mode: "sub", mainSt: "sigues trabajando", subSt: "leyendo archivos…", files: 34, notes: "miss" },
  { main: MAIN2, sub: [...S_BASE, S_READ], mode: "sub", send: "sum", mainSt: "recibió el resumen", subSt: "terminó", files: 34, notes: "miss" },
  { main: MAIN2, sub: FORK, mode: "fork", send: "conv", mainSt: "sigues trabajando", subSt: "en segundo plano", files: 0, notes: "fork" },
  { main: MAIN2, sub: FORK, mode: "fork", mainSt: "sigues trabajando", subSt: "en segundo plano", files: 0, notes: "fork", compare: true },
];

const FILES_TXT = "auth/refresh.ts session.ts tokens.ts middleware/jwt.ts db/users.ts api/login.ts config/auth.json tests/refresh.test.ts utils/time.ts cookies.ts api/logout.ts db/sessions.ts";

const sum = (bs: Blk[]) => bs.reduce((a, b) => a + b.h, 0);

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;

export const subagentes: Escena = {
  title: "Un subagente lee por ti y te devuelve un resumen",
  steps: [
    { title: "Tu contexto es el recurso escaso", text: "Tu sesión principal ya carga el system prompt de Claude Code, tu historial y los archivos leídos. Todo lo que entra ocupa espacio en esa ventana.", ms: 6500 },
    { title: "Claude delega una tarea", text: "Claude le escribe un <b>mensaje de tarea</b> a un subagente: un trabajador con su propia ventana de contexto, su propio system prompt y su propio set de herramientas.", ms: 7000 },
    { title: "El subagente arranca limpio", text: "Carga su system prompt y el entorno, la tarea, la jerarquía de CLAUDE.md con un snapshot de git y las skills de su campo <code>skills</code>. <b>No ve tu historial</b>.", ms: 8500 },
    { title: "Lee decenas de archivos", text: "Todo lo que lee llena <b>su</b> ventana, no la tuya. Corre en segundo plano mientras sigues trabajando; <code>/tasks</code> lista lo que está corriendo.", ms: 7500 },
    { title: "Solo vuelve un resumen", text: "Al terminar, a tu conversación vuelve un resumen corto. Tu contexto casi no crece, aunque el subagente haya leído decenas de archivos.", ms: 7500 },
    { title: "Un fork copia tu conversación", text: "<code>/subtask &lt;tarea&gt;</code> lanza un <b>fork</b>: en vez de arrancar limpio, copia tu conversación completa. Corre en segundo plano y devuelve el resultado.", ms: 8000 },
    { title: "Subagente, fork y /fork", text: "El subagente empieza limpio y te devuelve un resumen. El fork hereda todo lo que ya sabes. <code>/fork</code> copia toda la sesión a una sesión nueva en segundo plano.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("sa");
    const pane = (cls: string, role: string, name: string) => `
      <section class="sa-pane ${cls}">
        <div class="sa-head"><span class="sa-role">${role}</span><b class="sa-name">${name}</b><span class="sa-st"></span></div>
        <div class="sa-win" aria-label="Ventana de contexto"><span class="sa-win-l">Ventana de contexto</span><div class="sa-stack"></div></div>
        <div class="sa-meter"><span>Ocupado</span><b><i></i></b><em>0%</em></div>
      </section>`;
    stage.innerHTML = `
      <div class="sa-board">
        ${pane("sa-main", "Sesión principal", "Tú + Claude")}
        <div class="sa-wire"><i class="sa-pk"><span></span></i></div>
        ${pane("sa-sub", "Subagente", "general-purpose")}
      </div>
      <div class="sa-notes">
        <div class="sa-miss"><span class="sa-nl">El subagente no recibe</span>
          <span class="sa-x">✕ tu historial</span><span class="sa-x">✕ archivos ya leídos</span><span class="sa-x">✕ estilos de salida</span><span class="sa-x">✕ tu auto memory</span></div>
        <div class="sa-fork"><span class="sa-nl">El fork recibe</span><span class="sa-y">✓ tu conversación completa</span></div>
      </div>
      <div class="sa-compare">
        <div><b>Subagente</b><span>arranca con contexto limpio · vuelve un resumen</span></div>
        <div><code>/subtask &lt;tarea&gt;</code><span>fork: copia tu conversación · devuelve el resultado</span></div>
        <div><code>/fork</code><span>copia toda la sesión a una sesión nueva en segundo plano</span></div>
      </div>
      <p class="sa-legend">Alturas ilustrativas: muestran proporción, no tokens reales.</p>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const d = instant ? 0 : 1;
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    const main = q(".sa-main"), sub = q(".sa-sub");

    // ---------- cabeceras ----------
    sub.classList.toggle("is-off", st.mode === "off");
    sub.classList.toggle("is-fork", st.mode === "fork");
    sub.querySelector(".sa-role")!.textContent = st.mode === "fork" ? "Fork · /subtask" : "Subagente";
    sub.querySelector(".sa-name")!.textContent = st.mode === "fork" ? "Fork" : "general-purpose";
    main.querySelector(".sa-st")!.textContent = st.mainSt;
    sub.querySelector(".sa-st")!.textContent = st.subSt;
    sub.classList.toggle("is-busy", i === 3);

    // ---------- paquete que viaja ----------
    const pk = q(".sa-pk"), pkTxt = pk.querySelector("span")!;
    gsap.set(pk, { opacity: 0, "--p": 0 });
    let at = 0;
    if (st.send) {
      const back = st.send === "sum";
      pk.className = "sa-pk is-" + st.send;
      pkTxt.textContent = st.send === "task" ? "mensaje de tarea" : st.send === "sum" ? "resumen" : "conversación completa";
      if (d) {
        t.set(pk, { opacity: 1, "--p": back ? 1 : 0 }, 0);
        t.to(pk, { "--p": back ? 0 : 1, duration: 1.2, ease: "power2.inOut" }, 0);
        t.set(pk, { opacity: 0 }, 1.25);
        at = 1.2;
      }
    }

    // ---------- bloques de cada ventana ----------
    const sync = (pane: HTMLElement, blocks: Blk[], start: number) => {
      const stack = pane.querySelector(".sa-stack") as HTMLElement;
      const have = new Map<string, HTMLElement>();
      Array.from(stack.children).forEach((el) => have.set((el as HTMLElement).dataset.k!, el as HTMLElement));
      have.forEach((el, k) => { if (!blocks.some((b) => b.k === k)) el.remove(); });
      let n = 0;
      blocks.forEach((b) => {
        let el = have.get(b.k);
        const isNew = !el;
        if (!el) {
          el = document.createElement("div");
          el.dataset.k = b.k;
          el.innerHTML = `<span class="sa-bl"></span>` + (b.c === "read" ? `<em class="sa-ct">0</em><span class="sa-files">${FILES_TXT}</span>` : "");
        }
        stack.appendChild(el);
        el.className = "sa-b c-" + b.c;
        el.querySelector(".sa-bl")!.textContent = b.label;
        const h = b.h + "%";
        if (isNew && d) {
          if (b.from) {
            // copia: viaja desde el bloque equivalente de la sesión principal
            gsap.set(el, { height: h, opacity: 1 });
            const src = main.querySelector(`[data-k="${b.from}"]`) as HTMLElement | null;
            if (src) {
              const a = src.getBoundingClientRect(), z = el.getBoundingClientRect();
              t.from(el, { x: a.left - z.left, y: a.top - z.top, opacity: 0.3, duration: 0.9, ease: "power3.inOut" }, start + n * 0.18);
            }
          } else if (b.c === "read") {
            t.fromTo(el, { height: "0%", opacity: 1 }, { height: h, duration: 2.6, ease: "power1.inOut" }, start);
          } else {
            t.fromTo(el, { height: "0%", opacity: 0 }, { height: h, opacity: 1, duration: 0.45, ease: "back.out(2)" }, start + n * 0.35);
          }
          n++;
        } else {
          gsap.set(el, { height: h, opacity: 1, x: 0, y: 0 });
        }
      });
    };
    sync(main, st.main, at);
    sync(sub, st.sub, at);

    // ---------- contador de archivos ----------
    const ct = root.querySelector(".sa-ct") as HTMLElement | null;
    if (ct) {
      if (d && i === 3) {
        const o = { v: 0 };
        t.to(o, { v: st.files, duration: 2.6, ease: "power1.inOut", onUpdate: () => { ct.textContent = Math.round(o.v) + " archivos"; } }, at);
      } else ct.textContent = st.files + " archivos";
    }

    // ---------- medidores ----------
    const meter = (pane: HTMLElement, v: number) => {
      const bar = pane.querySelector(".sa-meter i") as HTMLElement, em = pane.querySelector(".sa-meter em") as HTMLElement;
      const dur = i === 3 ? 2.6 : 0.8;
      const o = { v: parseFloat(em.textContent || "0") || 0 };
      t.to(bar, { width: v + "%", duration: dur * d, ease: "power1.inOut" }, at);
      t.to(o, { v, duration: dur * d, ease: "power1.inOut", onUpdate: () => { em.textContent = Math.round(o.v) + "%"; } }, at);
      pane.classList.toggle("is-full", v >= 75);
    };
    meter(main, sum(st.main));
    meter(sub, sum(st.sub));

    // ---------- notas y comparación ----------
    root.classList.toggle("show-miss", st.notes === "miss");
    root.classList.toggle("show-fork", st.notes === "fork");
    root.classList.toggle("show-compare", !!st.compare);
    if (st.compare && d) t.fromTo(root.querySelectorAll(".sa-compare > div"), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.25, ease: "power3.out" }, 0.1);
    else gsap.set(root.querySelectorAll(".sa-compare > div"), { y: 0, opacity: 1 });
    if (!d) t.progress(1);
  },
};
