/*
  Animación: agent teams. Un líder crea compañeros, todos comparten una lista de tareas y los
  compañeros se escriben directamente entre ellos (no solo hacia el líder). Al final, el contraste
  con los subagentes: sin mensajes entre ellos, todo vuelve al agente principal.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./teams.css";

type N = "L" | "A" | "B" | "C";
type Task = { label: string; owner: string };
type TaskSt = "hide" | "todo" | "doing" | "done";
type Msg = { from: string; to: string; text: string; kind: "lead" | "peer" | "res" };
type Send = { from: N; to: N; kind: "lead" | "peer" | "res"; label: string };

type Estado = {
  mates: boolean;
  sub: boolean;
  tasks: TaskSt[];
  owners: boolean;
  feed: Msg[];
  sends: Send[];
  lead: string;
  mate: string;
  cost: 0 | 1 | 2;
};

// Posiciones (en % del área) de cada nodo.
const POS: Record<N, [number, number]> = { L: [50, 15], A: [16, 62], B: [50, 86], C: [84, 62] };

const TASKS: Task[] = [
  { label: "Hipótesis: el WebSocket se cierra", owner: "A" },
  { label: "Hipótesis: expira la sesión", owner: "B" },
  { label: "Hipótesis: timeout del proxy", owner: "C" },
  { label: "Refutar las teorías de los demás", owner: "A·B·C" },
  { label: "Actualizar el doc de hallazgos", owner: "Líder" },
];

const M1: Msg[] = [{ from: "Líder", to: "A, B, C", text: "prompt de creación con todos los detalles", kind: "lead" }];
const M3: Msg[] = [
  ...M1,
  { from: "B", to: "A", text: "Si fuera el WebSocket, fallaría también sin enviar nada.", kind: "peer" },
  { from: "C", to: "B", text: "La sesión dura horas; el corte llega en segundos.", kind: "peer" },
  { from: "A", to: "C", text: "Lo reproduzco solo detrás del proxy. Apoyo tu teoría.", kind: "peer" },
];
const M4: Msg[] = [...M3.slice(1), { from: "A, B, C", to: "Líder", text: "hallazgos; consenso: timeout del proxy", kind: "res" }];
const MSUB: Msg[] = [
  { from: "1, 2, 3", to: "Principal", text: "cada uno devuelve su resultado y termina", kind: "res" },
];

const ESTADOS: Estado[] = [
  { mates: false, sub: false, tasks: ["hide", "hide", "hide", "hide", "hide"], owners: false, feed: [], sends: [], lead: "solo", mate: "", cost: 0 },
  {
    mates: true, sub: false, tasks: ["todo", "todo", "todo", "todo", "todo"], owners: false, feed: M1,
    sends: (["A", "B", "C"] as N[]).map((n) => ({ from: "L", to: n, kind: "lead", label: "prompt" })),
    lead: "crea el equipo", mate: "listo", cost: 0,
  },
  { mates: true, sub: false, tasks: ["doing", "doing", "doing", "todo", "todo"], owners: true, feed: M1, sends: [], lead: "coordina", mate: "investigando", cost: 0 },
  {
    mates: true, sub: false, tasks: ["doing", "doing", "doing", "doing", "todo"], owners: true, feed: M3,
    sends: [
      { from: "B", to: "A", kind: "peer", label: "mensaje" },
      { from: "C", to: "B", kind: "peer", label: "mensaje" },
      { from: "A", to: "C", kind: "peer", label: "mensaje" },
    ],
    lead: "coordina", mate: "debatiendo", cost: 0,
  },
  {
    mates: true, sub: false, tasks: ["done", "done", "done", "done", "done"], owners: true, feed: M4,
    sends: (["A", "B", "C"] as N[]).map((n) => ({ from: n, to: "L", kind: "res", label: "hallazgos" })),
    lead: "sintetiza", mate: "terminado", cost: 0,
  },
  { mates: true, sub: false, tasks: ["done", "done", "done", "done", "done"], owners: true, feed: M4, sends: [], lead: "sintetiza", mate: "terminado", cost: 1 },
  {
    mates: true, sub: true, tasks: ["done", "done", "done", "done", "done"], owners: true, feed: MSUB,
    sends: (["A", "B", "C"] as N[]).map((n) => ({ from: n, to: "L", kind: "res", label: "resultado" })),
    lead: "gestiona todo", mate: "devuelve y termina", cost: 2,
  },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;

const MATE_NAME: Record<string, string> = { A: "WebSocket", B: "Sesión", C: "Proxy" };

export const teams: Escena = {
  title: "Un equipo que se coordina solo",
  steps: [
    { title: "Un líder, desactivado por defecto", text: "Agent teams es experimental: actívalo con <code>CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS</code> en <code>settings.json</code>. Tu sesión será el <b>líder</b>: coordina, asigna y sintetiza.", ms: 6500 },
    { title: "El líder crea a los compañeros", text: "Cada compañero es una instancia con su propio contexto. Carga CLAUDE.md, MCP y skills, pero <b>no el historial del líder</b>: los detalles van en el prompt de creación.", ms: 8000 },
    { title: "Una lista de tareas compartida", text: "Todos ven la misma lista y se autocoordinan: cada compañero toma una hipótesis distinta. Reparte el trabajo para que nadie edite los mismos archivos: no usan worktrees.", ms: 7500 },
    { title: "Se escriben entre ellos", text: "Los mensajes van <b>directo de compañero a compañero</b>, sin pasar por el líder. Así pueden refutar las teorías de los demás, como en un debate científico.", ms: 8500 },
    { title: "El líder sintetiza", text: "Con las tareas completas, cada compañero entrega sus hallazgos y el líder escribe el consenso en el doc de hallazgos.", ms: 7000 },
    { title: "Cada compañero cuesta completo", text: "Cada compañero es <b>una instancia completa</b> de Claude Code, así que el equipo gasta varias veces más tokens. Empieza con 3 a 5 compañeros: tres enfocados rinden más que cinco dispersos.", ms: 8500 },
    { title: "Con subagentes, todo vuelve al centro", text: "Los subagentes no se escriben entre ellos ni comparten lista: el agente principal gestiona todo y cada uno <b>devuelve su resultado a quien lo llamó</b>. Cuestan menos; úsalos cuando solo importa el resultado.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("tm");
    const node = (n: N) => {
      const [x, y] = POS[n];
      if (n === "L")
        return `<div class="tm-node tm-lead" style="left:${x}%;top:${y}%"><span class="tm-role">Líder</span><b>Tu sesión</b><span class="tm-st"></span></div>`;
      return `<div class="tm-node tm-mate" data-n="${n}" style="left:${x}%;top:${y}%"><span class="tm-role">Compañero <i>${n}</i></span><b>${MATE_NAME[n]}</b><span class="tm-st"></span></div>`;
    };
    const line = (a: N, b: N, cls: string) =>
      `<line class="tm-w ${cls}" data-k="${a}${b}" x1="${POS[a][0]}" y1="${POS[a][1]}" x2="${POS[b][0]}" y2="${POS[b][1]}"/>`;
    const mid = (a: N, b: N) => [(POS[a][0] + POS[b][0]) / 2, (POS[a][1] + POS[b][1]) / 2];
    const cuts = (["AB", "BC", "AC"] as const)
      .map((k) => { const [x, y] = mid(k[0] as N, k[1] as N); return `<span class="tm-cut" style="left:${x}%;top:${y}%">✕</span>`; })
      .join("");
    stage.innerHTML = `
      <div class="tm-main">
        <div class="tm-net">
          <svg class="tm-wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            ${line("L", "A", "tm-wl")}${line("L", "B", "tm-wl")}${line("L", "C", "tm-wl")}
            ${line("A", "B", "tm-wp")}${line("B", "C", "tm-wp")}${line("A", "C", "tm-wp")}
          </svg>
          ${cuts}
          <span class="tm-nocut">sin mensajes entre ellos</span>
          ${node("L")}${node("A")}${node("B")}${node("C")}
          <div class="tm-load">Cada compañero carga <b>CLAUDE.md · MCP · skills</b><span>✕ no el historial del líder</span></div>
          <code class="tm-env">"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"</code>
        </div>
        <div class="tm-side">
          <div class="tm-box tm-tasks">
            <div class="tm-h">Lista de tareas compartida</div>
            <ol>${TASKS.map((t) => `<li><i class="tm-ck"></i><span>${t.label}</span><em>${t.owner}</em></li>`).join("")}</ol>
            <div class="tm-over">✕ Sin lista compartida: el principal reparte y recoge</div>
          </div>
          <div class="tm-box tm-feed">
            <div class="tm-h">Mensajes</div>
            <ul></ul>
          </div>
        </div>
      </div>
      <div class="tm-cost">
        <div class="tm-h">Costo en tokens <small>(proporciones ilustrativas)</small></div>
        <div class="tm-row tm-row-t"><span>Agent teams</span><b><i data-k="L">líder</i><i data-k="A">A</i><i data-k="B">B</i><i data-k="C">C</i></b><em>mayor</em></div>
        <div class="tm-row tm-row-s"><span>Subagentes</span><b><i class="s"></i></b><em>menor</em></div>
      </div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    root.querySelectorAll(".tm-pk").forEach((p) => p.remove());
    const d = instant ? 0 : 1;
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));

    // ---------- modo: equipo o subagentes ----------
    root.classList.toggle("is-sub", st.sub);
    q(".tm-lead .tm-role").textContent = st.sub ? "Agente principal" : "Líder";
    qa(".tm-mate").forEach((m, k) => {
      m.querySelector(".tm-role")!.innerHTML = st.sub ? `Subagente <i>${k + 1}</i>` : `Compañero <i>${m.dataset.n}</i>`;
    });
    q(".tm-env").classList.toggle("on", i === 0);
    q(".tm-load").classList.toggle("on", i === 1);

    // ---------- nodos ----------
    const mates = qa(".tm-mate");
    const wasOn = mates[0].classList.contains("on");
    mates.forEach((m) => m.classList.toggle("on", st.mates));
    root.classList.toggle("has-mates", st.mates);
    if (st.mates && !wasOn && d) {
      t.fromTo(mates, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(2)", stagger: 0.25, clearProps: "scale,opacity" }, 0.9);
      t.fromTo(qa(".tm-wl"), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.25, clearProps: "opacity" }, 0.7);
    }
    q(".tm-lead .tm-st").textContent = st.lead;
    mates.forEach((m) => { m.querySelector(".tm-st")!.textContent = st.mate; });
    mates.forEach((m) => m.classList.toggle("is-done", st.mate === "terminado" || st.sub));
    mates.forEach((m) => m.classList.toggle("is-talk", st.mate === "debatiendo"));

    // ---------- tareas ----------
    const items = qa(".tm-tasks li");
    const prevVisible = items.filter((li) => !li.classList.contains("s-hide")).length;
    items.forEach((li, k) => {
      const s = st.tasks[k];
      const prev = li.dataset.s;
      li.className = "s-" + s;
      li.dataset.s = s;
      li.classList.toggle("own", st.owners && s !== "todo");
      if (!d || prev === s) return;
      if (s === "todo" && prevVisible === 0) t.fromTo(li, { x: 16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "power3.out", clearProps: "x,opacity" }, 1.6 + 0.12 * k);
      else if (s === "doing") t.fromTo(li.querySelector("em"), { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(3)", clearProps: "scale,opacity" }, 0.3 + 0.35 * k);
      else if (s === "done") t.fromTo(li.querySelector(".tm-ck"), { scale: 0.2 }, { scale: 1, duration: 0.4, ease: "back.out(3)", clearProps: "scale" }, 2.2 + 0.15 * k);
    });

    // ---------- paquetes que viajan ----------
    const net = q(".tm-net");
    const sendDur = 1.0;
    const gap = st.sends.length && st.sends[0].kind === "peer" ? 1.5 : 0.25;
    st.sends.forEach((s, k) => {
      if (!d) return;
      const at = 0.4 + k * gap;
      const pk = document.createElement("span");
      pk.className = "tm-pk k-" + s.kind;
      pk.textContent = s.label;
      net.appendChild(pk);
      const [x1, y1] = POS[s.from], [x2, y2] = POS[s.to];
      gsap.set(pk, { left: x1 + "%", top: y1 + "%", opacity: 0 });
      t.to(pk, { opacity: 1, duration: 0.15 }, at);
      t.to(pk, { left: x2 + "%", top: y2 + "%", duration: sendDur, ease: "power2.inOut" }, at);
      t.to(pk, { opacity: 0, duration: 0.2 }, at + sendDur);
      t.call(() => pk.remove(), [], at + sendDur + 0.25);
      if (s.kind === "peer") {
        const w = q(`.tm-w[data-k="${[s.from, s.to].sort().join("")}"]`);
        t.call(() => w.classList.add("hot"), [], at);
        t.call(() => w.classList.remove("hot"), [], at + sendDur + 0.1);
      }
    });

    // ---------- mensajes ----------
    const ul = q(".tm-feed ul");
    const keyOf = (m: Msg) => m.from + "|" + m.text;
    const want = new Set(st.feed.map(keyOf));
    Array.from(ul.children).forEach((li) => { if (!want.has((li as HTMLElement).dataset.k!)) li.remove(); });
    let fresh = 0;
    st.feed.forEach((m) => {
      const k = keyOf(m);
      let li = Array.from(ul.children).find((n) => (n as HTMLElement).dataset.k === k) as HTMLElement | undefined;
      if (li) { ul.appendChild(li); return; }
      li = document.createElement("li");
      li.dataset.k = k;
      li.className = "k-" + m.kind;
      li.innerHTML = `<b>${m.from} → ${m.to}</b><span>${m.text}</span>`;
      ul.appendChild(li);
      if (d) {
        const at = st.sends.length ? 0.4 + fresh * gap + sendDur : 0.3 + 0.2 * fresh;
        gsap.set(li, { opacity: 0 });
        t.fromTo(li, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out", clearProps: "y,opacity" }, at);
      }
      fresh++;
    });

    // ---------- costo ----------
    root.classList.toggle("show-cost", st.cost > 0);
    const segs = qa(".tm-row-t i");
    t.to(segs, { width: st.cost ? "24%" : "0%", duration: 0.7 * d, ease: "power2.out", stagger: 0.22 * d }, 0.3 * d);
    t.to(q(".tm-row-s i"), { width: st.cost === 2 ? "38%" : "0%", duration: 0.8 * d, ease: "power2.out" }, (st.sends.length ? 1.6 : 0.3) * d);

    if (!d) t.progress(1);
  },
};
