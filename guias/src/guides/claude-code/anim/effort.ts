/*
  Animación: modelos, effort y thinking. Un mismo pedido resuelto con distinto effort: crecen los
  tokens de razonamiento (que se cobran como salida) y la espera. Luego, para qué sirve cada alias,
  y por qué cambiar de modelo a mitad de sesión relee todo sin caché mientras cambiar el effort,
  en los modelos 5.5, no. Las barras son proporciones ilustrativas, no cifras reales.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./effort.css";

const LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
// Proporciones relativas (ilustrativas): razonamiento y tiempo crecen con el effort.
const THINK = [8, 24, 48, 74, 100];
const TIME = [14, 30, 52, 76, 100];
const ANSWER = 18;

const MODELS = [
  { a: "haiku", p: "Tareas simples y rápidas; subagentes de exploración" },
  { a: "sonnet", p: "Programación diaria" },
  { a: "opus", p: "Razonamiento complejo, decisiones de arquitectura" },
  { a: "fable", p: "Tus tareas más difíciles y largas" },
];
const TURNS = 8;

type Focus = "effort" | "models" | "cache";
type Estado = {
  focus: Focus;
  path: number[]; // niveles que recorre en este paso (el último queda)
  models: boolean;
  swap: boolean; // fila 1: cambio de modelo
  effort: boolean; // fila 2: cambio de effort
};

const ESTADOS: Estado[] = [
  { focus: "effort", path: [], models: false, swap: false, effort: false },
  { focus: "effort", path: [0], models: false, swap: false, effort: false },
  { focus: "effort", path: [1], models: false, swap: false, effort: false },
  { focus: "effort", path: [2, 3, 4], models: false, swap: false, effort: false },
  { focus: "models", path: [4], models: true, swap: false, effort: false },
  { focus: "cache", path: [4], models: true, swap: true, effort: false },
  { focus: "cache", path: [4], models: true, swap: true, effort: true },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;

export const effort: Escena = {
  title: "Effort, modelos y el costo de cambiar a mitad de camino",
  steps: [
    { title: "Un pedido, cinco niveles de effort", text: "El effort fija cuánto razona el modelo antes de responder: <code>low</code>, <code>medium</code>, <code>high</code>, <code>xhigh</code> o <code>max</code>. Se cambia con <code>/effort</code> o <code>--effort</code>.", ms: 7000 },
    { title: "low: razona poco", text: "Con <code>low</code> el modelo piensa poco: responde rápido y gasta pocos tokens de razonamiento. Las barras muestran proporciones ilustrativas, no cifras reales.", ms: 6500 },
    { title: "medium: el default en los 5.5", text: "<code>medium</code> es el default en los modelos 5.5 y en Fable 5.2. En la mayoría de los demás modelos, el default es <code>high</code>.", ms: 6500 },
    { title: "Más effort, más salida", text: "De <code>high</code> a <code>max</code> crecen el razonamiento y la espera. Los tokens de thinking <b>se facturan como salida</b>, aunque no los veas. <code>ultrathink</code> en un prompt pide más solo para ese turno.", ms: 8500 },
    { title: "Cada alias, su trabajo", text: "<code>haiku</code> para tareas simples y subagentes de exploración, <code>sonnet</code> para programar a diario, <code>opus</code> para arquitectura y razonamiento complejo, <code>fable</code> para lo más difícil y largo.", ms: 8500 },
    { title: "Cambiar de modelo rompe el caché", text: "Cada modelo tiene su propio caché. Si cambias con <code>/model</code> a mitad de una sesión larga, la primera respuesta relee toda la conversación sin caché (lección 2.8).", ms: 8000 },
    { title: "Elige el modelo al empezar", text: "Cambiar el effort no rompe el caché en Opus 5.5, Sonnet 5.5, Haiku 5.5 ni Fable 5.1+. El modelo, en cambio, conviene elegirlo antes de empezar.", ms: 8000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("ef");
    const turns = Array.from({ length: TURNS }, () => `<i></i>`).join("");
    stage.innerHTML = `
      <section class="ef-p ef-p-effort">
        <div class="ef-task"><span class="ef-cap">Mismo pedido</span><span class="ef-prompt">“Encuentra por qué falla este test de vez en cuando”</span></div>
        <div class="ef-levels" role="presentation">
          ${LEVELS.map((l, k) => `<span class="ef-lv" data-l="${k}"><span class="mo">${l}</span>${k === 1 ? `<small>default 5.5</small>` : ""}</span>`).join("")}
        </div>
        <div class="ef-bars">
          <div class="ef-bar ef-think"><span>Razonamiento <small>se cobra como salida</small></span><b><i></i></b></div>
          <div class="ef-bar ef-ans"><span>Respuesta</span><b><i></i></b></div>
          <div class="ef-bar ef-time"><span>Tiempo de espera</span><b><i></i></b></div>
          <p class="ef-foot">Proporciones ilustrativas, no cifras reales.</p>
        </div>
      </section>
      <section class="ef-p ef-p-models">
        <span class="ef-cap">Alias de <span class="mo">/model</span> y para qué sirve cada uno</span>
        <div class="ef-models">
          ${MODELS.map((m) => `<div class="ef-m" data-a="${m.a}"><b>${m.a}</b><span>${m.p}</span></div>`).join("")}
        </div>
      </section>
      <section class="ef-p ef-p-cache">
        <span class="ef-cap">Una sesión larga, turno a turno <span class="ef-key"><i class="g"></i>leído del caché <i class="w"></i>releído sin caché</span></span>
        <div class="ef-row" data-r="swap">
          <span class="ef-rl">Cambias de modelo</span>
          <div class="ef-turns">${turns}<span class="mo ef-cmd">/model opus</span></div>
          <span class="ef-st"></span>
        </div>
        <div class="ef-row" data-r="effort">
          <span class="ef-rl">Cambias el effort</span>
          <div class="ef-turns">${turns}<span class="mo ef-cmd">/effort high</span></div>
          <span class="ef-st"></span>
        </div>
      </section>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const d = instant ? 0 : 1;
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));

    root.dataset.focus = st.focus;

    // ---------- effort ----------
    const think = q(".ef-think i"), ans = q(".ef-ans i"), time = q(".ef-time i");
    const setLevel = (k: number | null) => qa(".ef-lv").forEach((el) => el.classList.toggle("on", k !== null && +el.dataset.l! === k));
    if (!st.path.length) {
      setLevel(null);
      gsap.set([think, ans, time], { width: 0 });
    } else {
      const last = st.path[st.path.length - 1];
      const prevW = parseFloat(think.style.width) || 0;
      const sameEnd = Math.abs(prevW - THINK[last]) < 0.5 && st.path.length === 1;
      if (!d || sameEnd) {
        setLevel(last);
        gsap.set(think, { width: THINK[last] + "%" });
        gsap.set(ans, { width: ANSWER + "%" });
        gsap.set(time, { width: TIME[last] + "%" });
      } else {
        let at = 0;
        st.path.forEach((k) => {
          t.call(() => setLevel(k), [], at);
          t.fromTo(q(`.ef-lv[data-l="${k}"]`), { scale: 0.86 }, { scale: 1, duration: 0.45, ease: "back.out(2.5)" }, at);
          // primero piensa (la barra de razonamiento crece), luego responde, y el reloj corre todo el rato
          t.to(think, { width: THINK[k] + "%", duration: 1.1, ease: "power2.inOut" }, at + 0.2);
          t.to(time, { width: TIME[k] + "%", duration: 1.5, ease: "power1.inOut" }, at + 0.2);
          t.to(ans, { width: ANSWER + "%", duration: 0.5, ease: "power3.out" }, at + 0.9);
          at += 1.7;
        });
      }
    }

    // ---------- modelos ----------
    const cards = qa(".ef-m");
    const wasOn = cards[0].classList.contains("on");
    if (st.models && !wasOn && d) {
      cards.forEach((c, n) => {
        t.call(() => c.classList.add("on", "is-hi"), [], 0.2 + n * 0.9);
        t.fromTo(c, { y: 10, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0.2 + n * 0.9);
        t.call(() => c.classList.remove("is-hi"), [], 0.2 + (n + 1) * 0.9);
      });
    } else {
      cards.forEach((c) => { c.classList.toggle("on", st.models); c.classList.remove("is-hi"); gsap.set(c, { clearProps: "opacity,transform" }); });
    }

    // ---------- caché ----------
    const row = (r: "swap" | "effort", on: boolean) => {
      const el = q(`.ef-row[data-r="${r}"]`);
      const blocks = Array.from(el.querySelectorAll<HTMLElement>(".ef-turns i"));
      const cmd = el.querySelector(".ef-cmd") as HTMLElement;
      const stx = el.querySelector(".ef-st") as HTMLElement;
      const after = blocks.slice(4); // los turnos después del cambio
      const okTxt = r === "swap" ? "✕ caché roto: relee toda la conversación" : "✓ sigue leyendo del caché";
      const was = el.classList.contains("on");
      const final = () => {
        el.classList.toggle("on", on);
        el.classList.toggle("is-bad", on && r === "swap");
        el.classList.toggle("is-ok", on && r === "effort");
        blocks.forEach((b, n) => b.className = on && r === "swap" && n >= 4 ? "w" : "g");
        stx.textContent = on ? okTxt : "";
      };
      if (!on || was || !d) { final(); gsap.set([cmd, stx, ...blocks], { clearProps: "opacity,transform" }); return; }
      // animado: aparece el comando, luego los turnos siguientes se tiñen uno a uno
      blocks.forEach((b) => (b.className = "g"));
      el.classList.add("on");
      t.fromTo(cmd, { opacity: 0, y: -10, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2.2)" }, 0.3);
      after.forEach((b, n) => {
        const at = 1.2 + n * 0.35;
        if (r === "swap") {
          t.call(() => (b.className = "w"), [], at);
          t.fromTo(b, { scaleY: 0.3 }, { scaleY: 1, duration: 0.45, ease: "back.out(2)" }, at);
        } else {
          t.fromTo(b, { scale: 1 }, { scale: 1.18, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }, at);
        }
      });
      const end = 1.2 + after.length * 0.35 + 0.2;
      t.call(() => { final(); }, [], end);
      t.fromTo(stx, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out", immediateRender: false }, end);
      if (r === "swap") t.fromTo(el.querySelector(".ef-turns"), { x: 0 }, { x: 6, duration: 0.08, repeat: 5, yoyo: true, ease: "none" }, end);
    };
    row("swap", st.swap);
    row("effort", st.effort);

    if (!d) t.progress(1);
  },
};
