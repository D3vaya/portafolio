/*
  Animación: cuánto contexto ocupa cada mecanismo. Una barra representa la ventana de contexto;
  al activar cada mecanismo entra (o no) su parte. Hooks y subagentes quedan fuera de la ventana.
  Al final, la ventana demasiado llena: ruido, skills que no se activan, convenciones perdidas.
  Las proporciones son ilustrativas.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./mecanismos.css";

type Seg = "conv" | "claude" | "style" | "skills" | "mcp" | "skillBody" | "mcpSchema" | "lsp";
type Mech = "claude" | "style" | "skills" | "mcp" | "lsp" | "sub" | "hook";

const SEGS: { id: Seg; label: string; cls: string }[] = [
  { id: "conv", label: "Conversación", cls: "c-conv" },
  { id: "claude", label: "CLAUDE.md", cls: "c-req" },
  { id: "style", label: "Output style", cls: "c-req" },
  { id: "skills", label: "Skills: descripciones", cls: "c-low" },
  { id: "mcp", label: "MCP: nombres", cls: "c-low" },
  { id: "lsp", label: "Diagnósticos", cls: "c-low" },
  { id: "skillBody", label: "Skill en uso", cls: "c-use" },
  { id: "mcpSchema", label: "Schema MCP", cls: "c-use" },
];

const MECHS: { id: Mech; name: string; when: string; cost: string }[] = [
  { id: "claude", name: "CLAUDE.md", when: "Contenido completo", cost: "En cada request" },
  { id: "style", name: "Output style", when: "Instrucciones del estilo activo", cost: "En cada request" },
  { id: "skills", name: "Skills", when: "Descripciones; contenido al usarse", cost: "Bajo" },
  { id: "mcp", name: "MCP", when: "Nombres; schemas bajo demanda", cost: "Bajo hasta usarse" },
  { id: "lsp", name: "Code intelligence", when: "Diagnósticos y símbolos", cost: "Bajo; reduce lecturas" },
];

type Estado = {
  size: Partial<Record<Seg, number>>; // % de la ventana (ilustrativo)
  focus: Mech[]; // mecanismos que se activan en este paso
  on: Mech[]; // mecanismos ya cargados
  out: boolean; // muestra la zona "fuera de la ventana"
  sub: number; // % de la ventana propia del subagente
  hookPulse: boolean;
  over: boolean;
};

const BASE = { conv: 14 };
const ESTADOS: Estado[] = [
  { size: { ...BASE }, focus: [], on: [], out: false, sub: 0, hookPulse: false, over: false },
  { size: { ...BASE, claude: 14 }, focus: ["claude"], on: ["claude"], out: false, sub: 0, hookPulse: false, over: false },
  { size: { ...BASE, claude: 14, style: 6 }, focus: ["style"], on: ["claude", "style"], out: false, sub: 0, hookPulse: false, over: false },
  { size: { ...BASE, claude: 14, style: 6, skills: 4, mcp: 3 }, focus: ["skills", "mcp"], on: ["claude", "style", "skills", "mcp"], out: false, sub: 0, hookPulse: false, over: false },
  { size: { ...BASE, claude: 14, style: 6, skills: 4, mcp: 3, lsp: 3, skillBody: 9, mcpSchema: 5 }, focus: ["skills", "mcp", "lsp"], on: ["claude", "style", "skills", "mcp", "lsp"], out: false, sub: 0, hookPulse: false, over: false },
  { size: { ...BASE, claude: 14, style: 6, skills: 4, mcp: 3, lsp: 3, skillBody: 9, mcpSchema: 5 }, focus: ["sub", "hook"], on: ["claude", "style", "skills", "mcp", "lsp", "sub", "hook"], out: true, sub: 46, hookPulse: true, over: false },
  { size: { conv: 22, claude: 30, style: 8, skills: 15, mcp: 10, lsp: 3, skillBody: 7, mcpSchema: 3 }, focus: ["claude", "skills", "mcp"], on: ["claude", "style", "skills", "mcp", "lsp", "sub", "hook"], out: true, sub: 46, hookPulse: false, over: true },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;

/** Muestra la etiqueta de cada segmento solo si cabe entera. */
function fit() {
  root.querySelectorAll<HTMLElement>(".mc-seg").forEach((el) => {
    const sp = el.querySelector("span")!;
    el.classList.toggle("wide", sp.scrollWidth + 6 <= el.clientWidth);
  });
}

export const mecanismos: Escena = {
  title: "Cuánto de la ventana ocupa cada mecanismo",
  steps: [
    { title: "La ventana de contexto", text: "Todo lo que Claude lee en un request ocupa espacio en una sola ventana. Arranca con tu conversación. Las proporciones de esta barra son <b>ilustrativas</b>.", ms: 6500 },
    { title: "CLAUDE.md: completo, en cada request", text: "Se carga al iniciar la sesión con su <b>contenido completo</b> y viaja en cada request. Es el mecanismo que más pesa: cada línea de más se paga siempre.", ms: 7500 },
    { title: "Output style: también siempre", text: "Las instrucciones del estilo activo se cargan al inicio y al cambiarlo, y también van <b>en cada request</b>.", ms: 6500 },
    { title: "Skills y MCP: solo lo mínimo", text: "Al inicio, las skills cargan solo sus <b>descripciones</b> y MCP solo los <b>nombres de herramientas</b>. Una skill con <code>disable-model-invocation</code> no carga nada.", ms: 8000 },
    { title: "Al usarse, entra el resto", text: "Cuando una skill se usa entra su contenido; cuando usas una herramienta MCP, su schema. Code intelligence agrega diagnósticos tras editar, y a cambio ahorra lecturas de archivos.", ms: 8500 },
    { title: "Hooks y subagentes, fuera", text: "Un subagente trabaja en <b>su propio contexto limpio</b>, aislado de tu sesión. Los hooks corren fuera: no cargan nada, salvo que devuelvan texto.", ms: 8000 },
    { title: "Demasiado llena: ruido", text: "Un CLAUDE.md enorme, decenas de skills y servidores MCP llenan la ventana y meten ruido: <b>las skills dejan de activarse bien</b> o Claude pierde de vista tus convenciones.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("mc");
    new ResizeObserver(() => fit()).observe(stage);
    stage.innerHTML = `
      <div class="mc-win">
        <div class="mc-wh"><b>Ventana de contexto</b><span class="mc-note">proporciones ilustrativas</span><em class="mc-pct">0%</em></div>
        <div class="mc-bar">${SEGS.map((s) => `<div class="mc-seg ${s.cls}" data-s="${s.id}"><span>${s.label}</span></div>`).join("")}<div class="mc-noise"></div></div>
        <div class="mc-callrow"><div class="mc-call"></div></div>
        <div class="mc-legend">
          <span><i class="c-conv"></i>conversación</span><span><i class="c-req"></i>en cada request</span>
          <span><i class="c-low"></i>bajo / al inicio</span><span><i class="c-use"></i>al usarse</span>
        </div>
      </div>
      <div class="mc-body">
        <div class="mc-list">
          ${MECHS.map((m) => `<div class="mc-m" data-m="${m.id}"><b>${m.name}</b><span>${m.when}</span><em>${m.cost}</em></div>`).join("")}
        </div>
        <div class="mc-out">
          <div class="mc-oh">Fuera de la ventana</div>
          <div class="mc-m mc-sub" data-m="sub"><b>Subagente</b><span>Contexto propio y limpio</span>
            <div class="mc-minibar"><i></i></div><em>Aislado de tu sesión</em></div>
          <div class="mc-m mc-hook" data-m="hook"><b>Hook</b><span>Corre en su evento, fuera</span><em>Cero, salvo que devuelva texto</em></div>
        </div>
      </div>
      <div class="mc-warn"><span>✕ Skills que no se activan</span><span>✕ Convenciones perdidas en el ruido</span></div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const d = instant ? 0 : 1;
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));

    // ---------- mecanismos: primero se ilumina el que entra ----------
    qa(".mc-m").forEach((el) => {
      const m = el.dataset.m as Mech;
      const isOn = st.on.includes(m), isFocus = st.focus.includes(m);
      el.classList.toggle("on", isOn);
      el.classList.toggle("focus", isFocus);
      if (isFocus && d) t.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: "back.out(3)", clearProps: "scale" }, 0.1);
    });
    root.classList.toggle("show-out", st.out);

    // ---------- la barra se llena ----------
    const at = st.focus.length ? 0.55 : 0.2;
    let total = 0;
    const added: { from: number; to: number; label: string }[] = [];
    SEGS.forEach((s, k) => {
      const el = q(`.mc-seg[data-s="${s.id}"]`);
      const w = st.size[s.id] || 0;
      const prev = parseFloat(el.dataset.w || "0");
      if (w > prev && !(i === 6)) added.push({ from: total, to: total + w, label: s.label });
      total += w;
      el.dataset.w = String(w);
      el.title = s.label;
      if (w > prev && d) el.classList.add("is-new");
      t.to(el, { width: w + "%", duration: 0.8 * d, ease: "power3.out" }, (at + 0.08 * k) * d);
      if (w > prev && d) t.call(() => el.classList.remove("is-new"), [], at + 1.4);
    });
    t.call(() => fit(), [], (at + 1.5) * d);

    // ---------- etiqueta que señala lo que acaba de entrar ----------
    const call = q(".mc-call");
    if (added.length) {
      const a = added[0].from;
      call.innerHTML = "↑ " + added.map((x) => x.label).join(" · ");
      call.style.setProperty("--x", Math.max(0, Math.min(100, a + 0.4)) + "%");
      call.classList.add("on");
      if (d) t.fromTo(call, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out", clearProps: "y,opacity" }, at + 0.7);
    } else call.classList.remove("on");

    const pct = q(".mc-pct");
    const shown = { v: parseFloat(pct.dataset.v || "0") };
    t.to(shown, {
      v: total, duration: 0.9 * d, ease: "power2.out",
      onUpdate: () => { pct.textContent = "≈ " + Math.round(shown.v) + "% usado"; pct.dataset.v = String(shown.v); },
    }, at * d);

    // ---------- subagente: llena su propia ventana, no la tuya ----------
    t.to(q(".mc-minibar i"), { width: st.sub + "%", duration: 1.1 * d, ease: "power2.out" }, (st.out ? 0.6 : 0) * d);
    const hook = q(".mc-hook");
    hook.classList.remove("pulse");
    if (st.hookPulse && d) t.call(() => { void hook.offsetWidth; hook.classList.add("pulse"); }, [], 1.8);

    // ---------- de más: ruido ----------
    root.classList.toggle("is-over", st.over);
    if (st.over && d) {
      t.fromTo(q(".mc-bar"), { x: -6 }, { x: 0, duration: 0.6, ease: "elastic.out(1,0.3)" }, 1.4);
      t.fromTo(qa(".mc-warn span"), { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out", stagger: 0.3, clearProps: "y,opacity" }, 1.7);
    }
    if (!d) t.progress(1);
  },
};
