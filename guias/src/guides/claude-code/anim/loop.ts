/*
  Animación: el loop agéntico. Tres fases (reunir contexto, actuar, verificar) forman un circuito
  con el lector en el centro. Un pulso recorre el circuito; a la derecha, el registro de llamadas a
  herramientas de cada fase. Dos vueltas: la primera verifica con un test que falla y vuelve a
  empezar; la segunda pasa y el loop se detiene.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./loop.css";

type Ph = "g" | "a" | "v";
type Entry = { ph: Ph; tool: string; arg: string; res: string; k: "info" | "err" | "ok" };

const LOG: Entry[] = [
  { ph: "g", tool: "Grep", arg: '"login", src/', res: "3 archivos coinciden", k: "info" },
  { ph: "g", tool: "Read", arg: "src/auth/login.ts", res: "84 líneas", k: "info" },
  { ph: "a", tool: "Edit", arg: "src/auth/login.ts", res: "+2 −1 líneas", k: "info" },
  { ph: "v", tool: "Bash", arg: "pnpm test auth", res: "✕ 1 test falla: login.test.ts", k: "err" },
  { ph: "g", tool: "Read", arg: "src/auth/login.test.ts", res: "el test también espera quitar espacios", k: "info" },
  { ph: "a", tool: "Edit", arg: "src/auth/login.ts", res: "+1 −1 líneas", k: "info" },
  { ph: "v", tool: "Bash", arg: "pnpm test auth", res: "✓ 12 tests pasan", k: "ok" },
];
const PH_NAME: Record<Ph, string> = { g: "contexto", a: "actuar", v: "verificar" };

type Estado = {
  ph: Ph | null;
  ang: number; // posición del pulso en el circuito (grados; -90 = arriba)
  lap: number;
  n: number; // entradas visibles en el registro
  vm: "none" | "fail" | "pass"; // marca sobre "verificar"
  goal: "pend" | "fail" | "ok";
  back?: boolean; // tramo verificar → contexto encendido (vuelve a empezar)
  tu?: boolean;
  done?: boolean;
};

const ESTADOS: Estado[] = [
  { ph: null, ang: -90, lap: 0, n: 0, vm: "none", goal: "pend" },
  { ph: "g", ang: -90, lap: 1, n: 2, vm: "none", goal: "pend" },
  { ph: "a", ang: 30, lap: 1, n: 3, vm: "none", goal: "pend" },
  { ph: "v", ang: 150, lap: 1, n: 4, vm: "fail", goal: "fail", back: true },
  { ph: "g", ang: 270, lap: 2, n: 5, vm: "fail", goal: "fail" },
  { ph: "a", ang: 390, lap: 2, n: 6, vm: "fail", goal: "fail", tu: true },
  { ph: "v", ang: 510, lap: 2, n: 7, vm: "pass", goal: "ok" },
  { ph: null, ang: 510, lap: 2, n: 7, vm: "pass", goal: "ok", done: true },
];

// Geometría del circuito (viewBox 300×300)
const C = 150, R = 116;
const pt = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  return [C + R * Math.cos(r), C + R * Math.sin(r)] as const;
};
const arc = (a1: number, a2: number) => {
  const [x1, y1] = pt(a1), [x2, y2] = pt(a2);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};
const arrow = (deg: number) => {
  const [x, y] = pt(deg);
  return `<path class="lp-arr" d="M-5 -5 L4 0 L-5 5" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg + 90})"/>`;
};

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let curAng = -90;

export const loop: Escena = {
  title: "El loop agéntico: reunir contexto, actuar, verificar",
  steps: [
    { title: "Una tarea, tres fases", text: "Le pides arreglar un bug: el login falla con emails en mayúsculas. Claude trabaja en un circuito de tres fases: <b>reunir contexto</b>, <b>actuar</b> y <b>verificar</b>. Tú estás en el centro.", ms: 7500 },
    { title: "Reunir contexto", text: "Primero busca y lee. Cada línea del registro es una llamada a una herramienta: <code>Grep</code> encuentra dónde está el login y <code>Read</code> abre el archivo.", ms: 7500 },
    { title: "Actuar", text: "Con el contexto reunido, actúa: <code>Edit</code> cambia solo las líneas necesarias del archivo.", ms: 6500 },
    { title: "Verificar: el test falla", text: "Corre los tests con <code>Bash</code>. Uno falla: el objetivo no está cumplido, así que el loop vuelve a la primera fase.", ms: 8000 },
    { title: "Segunda vuelta, con lo aprendido", text: "Vuelve a reunir contexto, ahora guiado por el fallo: lee el test para entender qué espera exactamente.", ms: 7000 },
    { title: "Tú también eres parte del loop", text: "Mientras Claude actúa, puedes interrumpir en cualquier momento con <kbd class=\"k\">Esc</kbd> y darle otra dirección. No tienes que esperar a que termine la vuelta.", ms: 8000 },
    { title: "Verificar: ahora pasa", text: "Corre los tests otra vez y pasan todos. La verificación confirma lo que la edición prometía.", ms: 7000 },
    { title: "Objetivo cumplido: el loop se detiene", text: "Con el objetivo cumplido, no hay otra vuelta. Una pregunta simple puede quedarse en la primera fase; este bug recorrió las tres, dos veces.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("lp");
    const node = (ph: Ph, n: number, name: string, tools: string, deg: number) => {
      const [x, y] = pt(deg);
      return `<div class="lp-node" data-ph="${ph}" style="left:${((x / 300) * 100).toFixed(2)}%;top:${((y / 300) * 100).toFixed(2)}%">
        <span class="lp-num">${n}</span><b>${name}</b><span class="lp-tools">${tools}</span><i class="lp-mark"></i></div>`;
    };
    stage.innerHTML = `
      <div class="lp-goal">
        <span class="lp-goal-l">Objetivo</span>
        <span class="lp-goal-t">el login acepta emails en mayúsculas</span>
        <span class="lp-lap"></span>
        <span class="lp-st"></span>
      </div>
      <div class="lp-main">
        <div class="lp-circ">
          <svg viewBox="0 0 300 300" aria-hidden="true">
            <circle class="lp-ring" cx="${C}" cy="${C}" r="${R}"/>
            <path class="lp-seg" data-s="ga" d="${arc(-90, 30)}"/>
            <path class="lp-seg" data-s="av" d="${arc(30, 150)}"/>
            <path class="lp-seg" data-s="vg" d="${arc(150, 270)}"/>
            ${arrow(-30)}${arrow(90)}${arrow(210)}
            <circle class="lp-halo" r="15"/>
            <circle class="lp-pulse" r="7"/>
          </svg>
          ${node("g", 1, "Reunir contexto", "Grep · Read", -90)}
          ${node("a", 2, "Actuar", "Edit", 30)}
          ${node("v", 3, "Verificar", "Bash", 150)}
          <span class="lp-back">vuelve a empezar</span>
          <div class="lp-tu"><b>Tú</b><span><kbd>Esc</kbd> interrumpe</span></div>
        </div>
        <div class="lp-log">
          <div class="lp-log-h"><span>Llamadas a herramientas</span><em></em></div>
          <div class="lp-list"></div>
        </div>
      </div>`;
    setAng(-90);
  },

  go(i, instant) {
    const st = ESTADOS[i];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    const at = (time: number, fn: () => void) => (instant ? fn() : t.call(fn, [], time));

    // ---------- el pulso viaja ----------
    const from = curAng;
    curAng = st.ang;
    const travel = instant || from === st.ang ? 0 : Math.min(1.6, (Math.abs(st.ang - from) / 120) * 1.0);
    if (travel) {
      const o = { a: from };
      t.to(o, { a: st.ang, duration: travel, ease: "power2.inOut", onUpdate: () => setAng(o.a) }, 0.15);
    } else setAng(st.ang);
    const arrive = travel ? travel + 0.25 : 0;

    // ---------- nodos ----------
    root.querySelectorAll<HTMLElement>(".lp-node").forEach((n) => {
      if (n.dataset.ph !== st.ph) n.classList.remove("is-on");
    });
    if (st.ph) at(arrive, () => q(`.lp-node[data-ph="${st.ph}"]`).classList.add("is-on"));
    root.classList.toggle("has-pulse", !st.done && i > 0);
    q(".lp-lap").textContent = st.lap ? `Vuelta ${st.lap}` : "";

    // ---------- registro ----------
    const list = q(".lp-list");
    while (list.children.length > st.n) list.lastElementChild!.remove();
    const have = list.children.length;
    let tEnd = arrive;
    for (let k = have; k < st.n; k++) {
      const e = LOG[k];
      const el = document.createElement("div");
      el.className = `lp-e k-${e.k}`;
      el.innerHTML = `<div class="lp-call"><i></i><code><b>${e.tool}</b>(${e.arg})</code><em>${PH_NAME[e.ph]}</em></div><div class="lp-res">⎿ ${e.res}</div>`;
      list.appendChild(el);
      if (!instant) {
        const s = arrive + 0.15 + (k - have) * 1.1;
        const res = el.querySelector(".lp-res")!;
        t.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, s);
        t.fromTo(res, { opacity: 0 }, { opacity: 1, duration: 0.3 }, s + 0.6);
        if (e.k !== "info") t.fromTo(res, { x: -6 }, { x: 0, duration: 0.5, ease: e.k === "err" ? "elastic.out(1.2, 0.35)" : "back.out(2)" }, s + 0.6);
        tEnd = s + 0.8;
      }
    }
    q(".lp-log-h em").textContent = st.n ? `${st.n} llamada${st.n > 1 ? "s" : ""}` : "";

    // ---------- verificar, objetivo y vuelta atrás ----------
    const v = q('.lp-node[data-ph="v"]');
    const applyVerdict = () => {
      v.classList.toggle("is-fail", st.vm === "fail");
      v.classList.toggle("is-pass", st.vm === "pass");
      v.querySelector(".lp-mark")!.textContent = st.vm === "fail" ? "✕" : st.vm === "pass" ? "✓" : "";
      const s = q(".lp-st");
      s.className = "lp-st g-" + st.goal;
      s.textContent = st.goal === "pend" ? "pendiente" : st.goal === "fail" ? "✕ aún no" : st.done ? "✓ cumplido · el loop se detiene" : "✓ cumplido";
    };
    const verdictChanges = ESTADOS[i - 1]?.vm !== st.vm;
    at(verdictChanges ? tEnd : 0, applyVerdict);
    if (verdictChanges && !instant && st.vm !== "none") {
      t.fromTo(v.querySelector(".lp-mark"), { scale: 0 }, { scale: 1, duration: 0.6, ease: st.vm === "fail" ? "elastic.out(1.1, 0.4)" : "back.out(2.5)" }, tEnd);
    }

    const seg = q('.lp-seg[data-s="vg"]'), back = q(".lp-back");
    seg.classList.toggle("is-back", !!st.back);
    back.classList.toggle("on", !!st.back);
    if (st.back && !instant) {
      const len = (seg as unknown as SVGPathElement).getTotalLength();
      t.fromTo(seg, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut", clearProps: "strokeDasharray,strokeDashoffset" }, tEnd + 0.5);
      t.fromTo(back, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4 }, tEnd + 1.2);
    }

    // ---------- tú, en el centro ----------
    const tu = q(".lp-tu");
    tu.classList.toggle("is-on", !!st.tu);
    if (st.tu && !instant) t.fromTo(tu, { scale: 0.92 }, { scale: 1, duration: 0.7, ease: "back.out(3)" }, arrive + 1.4);

    // ---------- final ----------
    root.classList.toggle("is-done", !!st.done);
    if (st.done && !instant) {
      t.fromTo(q(".lp-st"), { scale: 0.85 }, { scale: 1, duration: 0.6, ease: "back.out(2.5)" }, 0.2);
      t.fromTo(root.querySelectorAll(".lp-seg"), { opacity: 0.3 }, { opacity: 1, duration: 0.5, stagger: 0.25 }, 0.1);
    }
    if (instant) t.progress(1);
  },
};

function setAng(a: number) {
  const [x, y] = pt(a);
  root.querySelectorAll(".lp-pulse, .lp-halo").forEach((c) => {
    c.setAttribute("cx", x.toFixed(2));
    c.setAttribute("cy", y.toFixed(2));
  });
}
