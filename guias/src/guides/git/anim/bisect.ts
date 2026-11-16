/*
  Animación: git bisect. Una banda de 16 commits: el más nuevo está roto y v2.3 (hace dos semanas)
  funcionaba. Cada prueba descarta la mitad de los sospechosos: en 4 pasos (log2 16) aparece el
  culpable. Luego bisect reset y la versión automática con bisect run.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import "./bisect.css";

const N = 16;
const HASH = ["6e0a7f2", "c41d8e3", "08b7a1f", "5d2c9e0", "e7a03b4", "91f6c2d", "2b8e5a7", "f03d6c9",
  "7a1e4b2", "c9d0e83", "a1b2c3d", "4e7f9a1", "b5c8d20", "38a6f1e", "d72e0b5", "0f9c3a6"];
const CULPA = 10;

type Estado = {
  cmd: string;
  out?: string;
  good: number[];
  bad: number[];
  /** Sospechosos que quedan: [desde, hasta] */
  lo: number;
  hi: number;
  cur?: number; // commit en prueba (HEAD separado)
  found?: boolean;
  bisecting: boolean;
  run?: boolean;
};

const PASOS: Estado[] = [
  { cmd: "git rev-list --count v2.3..main", out: "15", good: [0], bad: [15], lo: 1, hi: 15, bisecting: false },
  { cmd: "git bisect start",
    out: `$ git bisect bad\n$ git bisect good v2.3\nBisecting: 7 revisions left to test after this (roughly 3 steps)\n[${HASH[7]}] ajusta el formulario`,
    good: [0], bad: [15], lo: 1, hi: 15, cur: 7, bisecting: true },
  { cmd: "git bisect good", out: `Bisecting: 3 revisions left to test after this (roughly 2 steps)\n[${HASH[11]}] agrega cupones`,
    good: [0, 7], bad: [15], lo: 8, hi: 15, cur: 11, bisecting: true },
  { cmd: "git bisect bad", out: `Bisecting: 1 revision left to test after this (roughly 1 step)\n[${HASH[9]}] mueve los estilos`,
    good: [0, 7], bad: [15, 11], lo: 8, hi: 11, cur: 9, bisecting: true },
  { cmd: "git bisect good", out: `Bisecting: 0 revisions left to test after this (roughly 0 steps)\n[${HASH[10]}] cambia el redondeo`,
    good: [0, 7, 9], bad: [15, 11], lo: 10, hi: 11, cur: 10, bisecting: true },
  { cmd: "git bisect bad", out: `<span class="bad">${HASH[10]} is the first 'bad' commit</span>\ncommit ${HASH[10]}\n    cambia el redondeo`,
    good: [0, 7, 9], bad: [15, 11, 10], lo: 10, hi: 10, cur: 10, found: true, bisecting: true },
  { cmd: "git bisect reset", out: `Previous HEAD position was ${HASH[10]} cambia el redondeo\nSwitched to branch 'main'`,
    good: [0], bad: [15], lo: 10, hi: 10, found: true, bisecting: false },
  { cmd: "git bisect run npm test", out: `running 'npm' 'test'\n…\n<span class="bad">${HASH[10]} is the first 'bad' commit</span>\nbisect found first 'bad' commit`,
    good: [0, 7, 9], bad: [15, 11, 10], lo: 10, hi: 10, cur: 10, found: true, bisecting: true, run: true },
];
// orden en que bisect run prueba (para animarlo)
const RUN = [7, 11, 9, 10];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;
let cells: HTMLElement[] = [];

export const bisect: Escena = {
  title: "Encontrar el commit culpable partiendo en mitades",
  steps: [
    { title: "Algo se rompió en algún punto", text: "Hoy <code>main</code> falla (✕). Hace dos semanas, en el tag <code>v2.3</code>, funcionaba (✓). En medio hay 15 commits sospechosos.", ms: 7000 },
    { title: "Marca un extremo bueno y uno malo", text: "<code>git bisect start</code>, luego <code>bad</code> (el actual está roto) y <code>good v2.3</code>. Git salta al commit del medio con HEAD separado.", ms: 8500 },
    { title: "Funciona: descarta la mitad izquierda", text: "Pruebas tu app y funciona: <code>git bisect good</code>. El culpable está a la derecha, así que la izquierda se descarta y Git salta al medio de lo que queda.", ms: 8500 },
    { title: "Falla: descarta la derecha", text: "Esta versión falla: <code>git bisect bad</code>. El culpable es este o uno anterior. Quedan cuatro sospechosos.", ms: 7500 },
    { title: "Otra mitad menos", text: "Funciona: <code>git bisect good</code>. Ya solo quedan dos commits posibles.", ms: 6500 },
    { title: "Cuatro pruebas, un culpable", text: "Falla: Git anuncia el primer commit malo. Con 16 commits bastaron 4 pruebas, porque log₂ 16 = 4. Con 1000 commits serían unas 10.", ms: 8500 },
    { title: "Volver a donde estabas", text: "<code>git bisect reset</code> termina la búsqueda y te devuelve a <code>main</code>. Ya sabes qué commit revisar.", ms: 6500 },
    { title: "Que lo haga un script", text: "<code>git bisect run npm test</code> prueba cada commit solo. Salida 0 = good; de 1 a 127 = bad, salvo 125 = saltar este commit.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("bs");
    term = consola(stage);
    const wrap = document.createElement("div");
    wrap.className = "bs-wrap";
    wrap.innerHTML = `
      <div class="bs-refs"><span class="bs-ref bs-tag">v2.3</span><span class="bs-ref bs-main"></span><span class="bs-ref bs-head">HEAD</span></div>
      <div class="bs-band">${Array.from({ length: N }, (_, k) => `<i data-k="${k}"><b></b></i>`).join("")}</div>
      <div class="bs-below"><span class="bs-h bs-h0">${HASH[0]}</span><span class="bs-h bs-hc"></span><span class="bs-h bs-h15">${HASH[15]}</span></div>
      <div class="bs-meta"><span class="bs-left"><span>Sospechosos</span> <b></b></span><span class="bs-time">más viejo a la izquierda, más nuevo a la derecha</span></div>
      <div class="bs-rules"><span><b class="ok">exit 0</b> good</span><span><b class="bad">exit 1–127</b> bad</span><span><b class="warn">exit 125</b> saltar</span></div>`;
    stage.appendChild(wrap);
    cells = Array.from(wrap.querySelectorAll<HTMLElement>(".bs-band i"));
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-ok"></i>good: funciona</span><span><i class="l-conflict"></i>bad: falla</span><span><i class="bs-l-cur"></i>en prueba (HEAD separado)</span><span><i class="bs-l-out"></i>descartado</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const prev = PASOS[i - 1];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const at = instant ? 0 : d + 0.1;
    const q = (s: string) => root.querySelector(s) as HTMLElement;

    const paint = (st: Estado) => {
      cells.forEach((el, k) => {
        const good = st.good.includes(k), bad = st.bad.includes(k);
        const out = st.bisecting || st.found ? (k < st.lo || k > st.hi) && !good && !bad : false;
        el.className = [good && "is-good", bad && "is-bad", out && "is-out", st.cur === k && st.bisecting && "is-cur",
          st.found && k === CULPA && "is-culprit"].filter(Boolean).join(" ");
        (el.querySelector("b") as HTMLElement).textContent = good ? "✓" : bad ? "✕" : "";
      });
      q(".bs-left b").textContent = st.found ? "1: el culpable" : String(st.hi - st.lo + 1);
      root.classList.toggle("is-bisecting", st.bisecting);
      root.classList.toggle("is-run", !!st.run);
      const main = q(".bs-main");
      main.textContent = st.bisecting ? "main" : "HEAD → main";
      main.classList.toggle("is-head", !st.bisecting);
      const head = q(".bs-head"), hc = q(".bs-hc");
      const cur = st.cur ?? -1;
      head.style.left = hc.style.left = ((cur + 0.5) / N) * 100 + "%";
      head.classList.toggle("is-on", st.bisecting && cur >= 0);
      const showHash = st.found ? CULPA : st.bisecting ? cur : -1;
      hc.textContent = showHash >= 0 ? HASH[showHash] : "";
      hc.style.left = ((showHash + 0.5) / N) * 100 + "%";
      hc.classList.toggle("is-culprit", !!st.found);
    };

    if (!t) { paint(p); return; }

    if (p.run) {
      // bisect run: parte desde el estado inicial y prueba solo, rápido
      const base: Estado = { ...PASOS[1] };
      paint({ ...base, cur: undefined });
      let st: Estado = { ...base, good: [0], bad: [15], lo: 1, hi: 15 };
      RUN.forEach((k, n) => {
        const s = at + 0.3 + n * 0.75;
        const isBad = k >= CULPA;
        const next: Estado = {
          ...st,
          cur: k,
          good: isBad ? st.good : [...st.good, k],
          bad: isBad ? [...st.bad, k] : st.bad,
          lo: isBad ? st.lo : k + 1,
          hi: isBad ? k : st.hi,
        };
        const show: Estado = { ...st, cur: k };
        t.call(() => paint(show), [], s);
        t.call(() => paint(next), [], s + 0.45);
        st = next;
      });
      t.call(() => paint(p), [], at + 0.3 + RUN.length * 0.75);
      t.fromTo(q(".bs-rules"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4 }, at);
      return;
    }

    // marca los cambios con un orden: primero el resultado de la prueba, luego el descarte, luego el salto
    if (prev && prev.cur !== undefined && p.bisecting && prev.cur !== p.cur || (prev && p.found && !prev.found)) {
      const mid: Estado = { ...prev, good: p.good, bad: p.bad };
      paint(prev);
      t.call(() => paint(mid), [], at);
      const c = cells[prev.cur ?? 0];
      t.fromTo(c, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: "back.out(3)" }, at);
      t.call(() => paint(p), [], at + 0.7);
      t.fromTo(cells.filter((_, k) => (k < p.lo || k > p.hi) && k >= prev.lo && k <= prev.hi && !p.good.includes(k) && !p.bad.includes(k)), { opacity: 1 }, { opacity: 0.25, duration: 0.5, stagger: 0.04, clearProps: "opacity" }, at + 0.7);
      t.fromTo(q(".bs-head"), { top: -6, opacity: 0.4 }, { top: 0, opacity: 1, clearProps: "top,opacity", duration: 0.45, ease: "power3.out" }, at + 1);
      if (p.found) t.fromTo(cells[CULPA], { scale: 0.6 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.45)" }, at + 0.8);
    } else {
      paint(p);
      if (p.bisecting && p.cur !== undefined) t.fromTo(q(".bs-head"), { top: -10, opacity: 0 }, { top: 0, opacity: 1, clearProps: "top,opacity", duration: 0.5, ease: "back.out(2)" }, at);
      t.fromTo(cells, { opacity: 0.4 }, { opacity: 1, duration: 0.3, stagger: 0.03, clearProps: "opacity" }, at);
    }
  },
};
