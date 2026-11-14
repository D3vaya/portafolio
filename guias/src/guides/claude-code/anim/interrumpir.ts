/*
  Animación: interrumpir y redirigir. Una terminal donde Claude ejecuta herramientas en fila y,
  al lado, lo que no se ve en la fila: el historial, la reserva del borrador y las respuestas al
  margen. Cada paso muestra una forma de corregir: Esc, mensajes en cola, deshacer, /btw y Ctrl+S.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./interrumpir.css";

type RS = "run" | "ok" | "cut" | "undone";
type Row = { k: "u" | "t"; tool?: string; arg?: string; txt?: string };
const ROWS: Record<string, Row> = {
  u0: { k: "u", txt: "valida el formulario de registro" },
  r1: { k: "t", tool: "Read", arg: "src/registro/form.tsx" },
  r2: { k: "t", tool: "Edit", arg: "src/registro/form.tsx" },
  r3: { k: "t", tool: "Write", arg: "src/registro/schema.ts" },
  u1: { k: "u", txt: "usa zod para el esquema" },
  r4: { k: "t", tool: "Write", arg: "src/registro/schema.ts" },
  r5: { k: "t", tool: "Bash", arg: "pnpm test registro" },
  u2: { k: "u", txt: "agrega un test para email vacío" },
  r6: { k: "t", tool: "Edit", arg: "src/registro/form.test.tsx" },
};
type RowSt = [id: string, s: RS, note?: string];
type Status = "work" | "wait" | "idle";
type Estado = {
  rows: RowSt[];
  status: Status;
  input: string;
  queue: string | null;
  reserve: string | null;
  btw: boolean;
  histNote?: string;
};

const DRAFT = "y después revisa también el login";
const BTW_Q = "/btw ¿qué versión de Node usa este repo?";

const ESTADOS: Estado[] = [
  { rows: [["u0", "ok"], ["r1", "ok"], ["r2", "run"]], status: "work", input: "", queue: null, reserve: null, btw: false },
  { rows: [["u0", "ok"], ["r1", "ok", "se conserva"], ["r2", "ok", "se conserva"], ["r3", "cut", "cancelada con Esc"]], status: "wait", input: "", queue: null, reserve: null, btw: false },
  { rows: [["u0", "ok"], ["r1", "ok"], ["r2", "ok"], ["r3", "cut"], ["u1", "ok"], ["r4", "run"]], status: "work", input: "", queue: null, reserve: null, btw: false },
  { rows: [["u0", "ok"], ["r1", "ok"], ["r2", "ok"], ["r3", "cut"], ["u1", "ok"], ["r4", "ok"], ["r5", "run"]], status: "work", input: "", queue: ROWS.u2.txt!, reserve: null, btw: false },
  { rows: [["u0", "ok"], ["r1", "ok"], ["r2", "ok"], ["r3", "cut"], ["u1", "ok"], ["r4", "ok"], ["r5", "ok"], ["u2", "ok", "leído en el mismo turno"], ["r6", "ok"]], status: "idle", input: "", queue: null, reserve: null, btw: false },
  { rows: [["u0", "ok"], ["r1", "ok"], ["r2", "ok"], ["r3", "cut"], ["u1", "ok"], ["r4", "ok"], ["r5", "ok"], ["u2", "undone"], ["r6", "undone", "deshecho"]], status: "idle", input: "", queue: null, reserve: null, btw: false },
  { rows: [["u0", "ok"], ["r1", "ok"], ["r2", "ok"], ["r3", "cut"], ["u1", "ok"], ["r4", "ok"], ["r5", "ok"], ["u2", "undone"], ["r6", "undone"]], status: "idle", input: "", queue: null, reserve: DRAFT, btw: false },
  { rows: [["u0", "ok"], ["r1", "ok"], ["r2", "ok"], ["r3", "cut"], ["u1", "ok"], ["r4", "ok"], ["r5", "ok"], ["u2", "undone"], ["r6", "undone"]], status: "idle", input: DRAFT, queue: null, reserve: null, btw: true, histNote: "sin cambios" },
];

const STATUS: Record<Status, string> = { work: "trabajando…", wait: "esperando tu instrucción", idle: "listo" };

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let rowEls: Record<string, HTMLElement> = {};

const q = (s: string) => root.querySelector(s) as HTMLElement;

function rowEl(id: string) {
  let el = rowEls[id];
  if (!el) {
    const r = ROWS[id];
    el = document.createElement("div");
    el.className = "ir-row ir-" + r.k;
    el.innerHTML =
      r.k === "u"
        ? `<span class="ir-ic">›</span><span class="ir-tx"><b>Tú:</b> ${r.txt}</span><em></em>`
        : `<span class="ir-ic"></span><span class="ir-tx"><b>${r.tool}</b>(${r.arg})</span><em></em>`;
    rowEls[id] = el;
  }
  return el;
}
function setRow(id: string, s: RS, note = "") {
  const el = rowEl(id);
  el.classList.remove("s-run", "s-ok", "s-cut", "s-undone");
  el.classList.add("s-" + s);
  if (ROWS[id].k === "t") el.querySelector(".ir-ic")!.textContent = s === "ok" ? "✓" : s === "cut" ? "✕" : s === "undone" ? "↺" : "";
  el.querySelector("em")!.textContent = note;
}
function setStatus(s: Status) {
  const p = q(".ir-status");
  p.className = "ir-status st-" + s;
  p.textContent = STATUS[s];
}
function setInput(text: string) {
  q(".ir-in-tx").textContent = text;
}
function setQueue(text: string | null) {
  const b = q(".ir-queue");
  b.classList.toggle("on", !!text);
  if (text) b.querySelector(".ir-q-tx")!.textContent = text;
}
function setReserve(text: string | null) {
  const b = q(".ir-res");
  b.classList.toggle("on", !!text);
  b.querySelector("p")!.textContent = text ?? "vacía";
}
function setBtw(on: boolean) {
  q(".ir-btw").classList.toggle("on", on);
}
function setHist(rows: RowSt[], note = "") {
  q(".ir-hist b").textContent = String(rows.filter((r) => r[1] !== "undone").length);
  q(".ir-hist em").textContent = note;
}

/** Deja el dibujo exactamente en el estado st, sin animar. */
function render(st: Estado) {
  const feed = q(".ir-feed");
  const want = new Set(st.rows.map((r) => r[0]));
  Object.keys(rowEls).forEach((id) => { if (!want.has(id)) { rowEls[id].remove(); delete rowEls[id]; } });
  st.rows.forEach(([id, s, note]) => {
    const el = rowEl(id);
    setRow(id, s, note);
    gsap.set(el, { clearProps: "opacity,transform" });
    feed.appendChild(el);
  });
  setStatus(st.status);
  setInput(st.input);
  setQueue(st.queue);
  setReserve(st.reserve);
  setBtw(st.btw);
  setHist(st.rows, st.histNote);
  gsap.set(q(".ir-keys"), { opacity: 0 });
}

export const interrumpir: Escena = {
  title: "Corregir a Claude mientras trabaja",
  steps: [
    { title: "Claude trabaja en fila", text: "Le pediste validar el formulario de registro. Claude ejecuta herramientas una tras otra, y puedes corregirlo en cualquier momento. Lo importante es corregir temprano.", ms: 7000 },
    { title: "Esc lo detiene ya", text: "Va a escribir el esquema a mano y no quieres eso. <kbd class=\"k\">Esc</kbd> cancela la herramienta en curso, <b>conserva lo ya hecho</b> y espera tu instrucción.", ms: 8000 },
    { title: "Redirige con una frase", text: "Escribes la corrección y presionas <kbd class=\"k\">Enter</kbd>. Claude sigue desde donde quedó, con lo hecho intacto y la nueva dirección.", ms: 7000 },
    { title: "Corregir sin detenerlo", text: "No hace falta detenerlo: escribe y presiona <kbd class=\"k\">Enter</kbd>. El mensaje queda <b>en cola</b> mientras corren las herramientas. Si no quieres esperar, <kbd class=\"k\">Ctrl</kbd>+<kbd class=\"k\">Enter</kbd> lo envía ya.", ms: 8500 },
    { title: "Lo lee dentro del mismo turno", text: "Apenas terminan las herramientas en curso, Claude lee tu mensaje encolado sin cerrar el turno, y agrega el test que pediste.", ms: 8000 },
    { title: "Deshacer lo que hizo", text: "¿No era eso? Con el input vacío, <kbd class=\"k\">Esc</kbd> <kbd class=\"k\">Esc</kbd> o <code>/rewind</code> vuelve atrás. También puedes pedirle “deshaz eso”.", ms: 7500 },
    { title: "Guarda un borrador", text: "Escribías otra instrucción y te surge una duda. <kbd class=\"k\">Ctrl</kbd>+<kbd class=\"k\">S</kbd> guarda el input en reserva y te deja el campo libre.", ms: 7000 },
    { title: "Una pregunta al margen", text: "<code>/btw</code> responde sin desviar el trabajo: la respuesta <b>no entra al historial</b>, así el contexto no crece. Después, tu borrador vuelve al input.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    rowEls = {};
    stage.classList.add("ir");
    stage.innerHTML = `
      <div class="ir-term">
        <div class="ir-head"><span class="ir-title">Claude Code</span><span class="ir-status"></span></div>
        <div class="ir-feed"></div>
        <div class="ir-queue"><span class="ir-q-l">en cola</span><span class="ir-q-tx"></span><span class="ir-q-h"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> envía ya</span></div>
        <div class="ir-input"><span class="ir-pr">&gt;</span><span class="ir-in-tx"></span><i class="ir-caret"></i>
          <span class="ir-keys"></span></div>
      </div>
      <div class="ir-side">
        <div class="ir-card ir-hist"><span class="ir-l">Historial</span><div><b>0</b><span>entradas</span></div><em></em></div>
        <div class="ir-card ir-res"><span class="ir-l">Reserva <kbd>Ctrl</kbd>+<kbd>S</kbd></span><p>vacía</p></div>
        <div class="ir-card ir-btw"><span class="ir-l">Al margen · no entra al historial</span>
          <p class="ir-btw-e">ninguna pregunta todavía</p>
          <p class="ir-btw-q">/btw ¿qué versión de Node usa este repo?</p>
          <p class="ir-btw-a">Node 22, según el campo <code>engines</code> de package.json.</p></div>
      </div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const t = (tl = gsap.timeline());
    if (instant) { render(st); return; }

    const feed = q(".ir-feed");
    const add = (id: string, s: RS, at: number, note = "") => {
      t.call(() => { const el = rowEl(id); setRow(id, s, note); feed.appendChild(el); }, [], at);
      t.fromTo(rowEl(id), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out", immediateRender: false }, at);
    };
    const set = (id: string, s: RS, at: number, note = "") => t.call(() => setRow(id, s, note), [], at);
    const type = (text: string, at: number, dur: number) => {
      const o = { n: 0 };
      t.to(o, { n: text.length, duration: dur, ease: "none", onUpdate: () => setInput(text.slice(0, Math.round(o.n))) }, at);
    };
    const keys = (html: string, at: number, bad = false) => {
      const k = q(".ir-keys");
      t.call(() => { k.innerHTML = html; k.classList.toggle("is-bad", bad); }, [], at);
      t.fromTo(k, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(3)", immediateRender: false }, at);
      t.to(k, { opacity: 0, duration: 0.35 }, at + 1.3);
    };
    const kb = (s: string) => s.split("+").map((x) => `<kbd>${x}</kbd>`).join("+");
    let end = 0;

    switch (i) {
      case 0:
        render({ ...st, rows: [] });
        add("u0", "ok", 0.1);
        add("r1", "run", 0.6); set("r1", "ok", 1.4);
        add("r2", "run", 1.7);
        end = 2.2;
        break;
      case 1:
        set("r2", "ok", 0.2);
        add("r3", "run", 0.6);
        keys(kb("Esc"), 1.9, true);
        t.call(() => { setRow("r3", "cut", "cancelada con Esc"); setStatus("wait"); }, [], 2.1);
        t.fromTo(rowEl("r3"), { x: -8 }, { x: 0, duration: 0.7, ease: "elastic.out(1.2, 0.35)", immediateRender: false }, 2.1);
        t.call(() => { setRow("r1", "ok", "se conserva"); setRow("r2", "ok", "se conserva"); }, [], 2.9);
        t.fromTo([rowEl("r1"), rowEl("r2")], { backgroundColor: "rgba(95,214,154,.22)" }, { backgroundColor: "rgba(95,214,154,0)", duration: 1.2, immediateRender: false, clearProps: "backgroundColor" }, 2.9);
        end = 3.2;
        break;
      case 2:
        t.call(() => { setRow("r1", "ok"); setRow("r2", "ok"); setRow("r3", "cut"); }, [], 0);
        type(ROWS.u1.txt!, 0.3, 1.3);
        keys(kb("Enter"), 1.75);
        t.call(() => setInput(""), [], 1.95);
        add("u1", "ok", 1.95);
        t.call(() => setStatus("work"), [], 2.4);
        add("r4", "run", 2.6);
        end = 3;
        break;
      case 3:
        set("r4", "ok", 0.2);
        add("r5", "run", 0.6);
        type(ROWS.u2.txt!, 1.3, 1.5);
        keys(kb("Enter"), 2.95);
        t.call(() => { setInput(""); setQueue(st.queue); }, [], 3.15);
        t.fromTo(q(".ir-queue"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: "back.out(2)", immediateRender: false }, 3.15);
        end = 3.6;
        break;
      case 4:
        set("r5", "ok", 0.5);
        t.to(q(".ir-queue"), { y: -18, opacity: 0, duration: 0.45, ease: "power2.in" }, 1.0);
        t.call(() => { setQueue(null); gsap.set(q(".ir-queue"), { clearProps: "opacity,transform" }); }, [], 1.5);
        add("u2", "ok", 1.45, "leído en el mismo turno");
        add("r6", "run", 2.3); set("r6", "ok", 3.3);
        t.call(() => setStatus("idle"), [], 3.4);
        end = 3.6;
        break;
      case 5:
        t.call(() => setRow("u2", "ok"), [], 0);
        keys(kb("Esc") + " " + kb("Esc"), 0.4);
        set("r6", "undone", 1.3, "deshecho");
        set("u2", "undone", 1.55);
        t.fromTo([rowEl("u2"), rowEl("r6")], { x: 0 }, { x: 6, duration: 0.18, yoyo: true, repeat: 1, immediateRender: false }, 1.3);
        end = 1.8;
        break;
      case 6:
        t.call(() => setRow("r6", "undone"), [], 0);
        type(DRAFT, 0.3, 1.6);
        keys(kb("Ctrl+S"), 2.1);
        t.to(q(".ir-in-tx"), { opacity: 0, x: 30, duration: 0.35, ease: "power2.in" }, 2.3);
        t.call(() => { setInput(""); setReserve(DRAFT); gsap.set(q(".ir-in-tx"), { clearProps: "opacity,transform" }); }, [], 2.7);
        t.fromTo(q(".ir-res p"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", immediateRender: false }, 2.7);
        end = 3.2;
        break;
      case 7:
        type(BTW_Q, 0.3, 1.8);
        keys(kb("Enter"), 2.2);
        t.call(() => { setInput(""); setBtw(true); }, [], 2.4);
        t.fromTo(q(".ir-btw"), { y: 12, opacity: 0.3 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", immediateRender: false }, 2.4);
        t.call(() => setHist(st.rows, "sin cambios"), [], 3.3);
        t.fromTo(q(".ir-hist"), { scale: 1.05 }, { scale: 1, duration: 0.6, ease: "back.out(3)", immediateRender: false }, 3.3);
        t.call(() => setReserve(null), [], 4.3);
        type(DRAFT, 4.4, 0.01);
        t.fromTo(q(".ir-in-tx"), { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out", immediateRender: false, clearProps: "opacity,transform" }, 4.4);
        end = 4.9;
        break;
    }
    t.call(() => render(st), [], end);
  },
};
