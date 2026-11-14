/*
  Animación: reglas allow / ask / deny. Un comando compuesto se parte en subcomandos y cada uno
  pasa por tres compuertas en el orden fijo de evaluación (deny, luego ask, luego allow). Gana la
  primera coincidencia; para correr sin preguntar, cada subcomando debe calzar con un allow.
  Cierra con deny bloqueando incluso en bypassPermissions.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./permisos.css";

type Cell = "" | "no" | "hit" | "skip";
type Out = "" | "allow" | "ask" | "deny";
type Lane = { sub: string; cells: [Cell, Cell, Cell]; rule?: string; out: Out; dim?: boolean };
type Estado = {
  cmd: "A" | "B";
  split: boolean;
  active: number; // compuerta que se evalúa ahora (-1: ninguna)
  lanes: (Lane | null)[];
  verdict: Out;
  mode?: string;
};

// Reglas tal cual el ejemplo de .claude/settings.json de la lección.
const RULES: Record<"deny" | "ask" | "allow", string[]> = {
  deny: ["Read(./.env)", "Read(./.env.*)", "Read(./secrets/**)"],
  ask: ["Bash(git push *)"],
  allow: ["Bash(pnpm run *)", "Bash(git diff *)", "Bash(git log *)"],
};
const GATES = ["deny", "ask", "allow"] as const;

const SUBS = ["pnpm run test", "git diff --stat", "git push origin main"];
const lane = (k: number, cells: Cell[], out: Out = "", rule?: string, dim = false): Lane =>
  ({ sub: SUBS[k], cells: cells as Lane["cells"], out, rule, dim });

const L0 = (a: Cell[], out: Out = "", dim = false) => lane(0, a, out, a[2] === "hit" ? "Bash(pnpm run *)" : undefined, dim);
const L1 = (a: Cell[], out: Out = "", dim = false) => lane(1, a, out, a[2] === "hit" ? "Bash(git diff *)" : undefined, dim);
const L2 = (a: Cell[], out: Out = "", dim = false) => lane(2, a, out, a[1] === "hit" ? "Bash(git push *)" : undefined, dim);

const ENV: Lane = { sub: "Read ./.env", cells: ["hit", "skip", "skip"], rule: "Read(./.env)", out: "deny" };

const ESTADOS: Estado[] = [
  { cmd: "A", split: false, active: -1, lanes: [null, null, null, null], verdict: "" },
  { cmd: "A", split: true, active: -1, lanes: [L0(["", "", ""]), L1(["", "", ""]), L2(["", "", ""]), null], verdict: "" },
  { cmd: "A", split: true, active: 0, lanes: [L0(["no", "", ""]), L1(["no", "", ""]), L2(["no", "", ""]), null], verdict: "" },
  { cmd: "A", split: true, active: 1, lanes: [L0(["no", "no", ""]), L1(["no", "no", ""]), L2(["no", "hit", "skip"], "ask"), null], verdict: "" },
  { cmd: "A", split: true, active: 2, lanes: [L0(["no", "no", "hit"], "allow"), L1(["no", "no", "hit"], "allow"), L2(["no", "hit", "skip"], "ask"), null], verdict: "" },
  { cmd: "A", split: true, active: -1, lanes: [L0(["no", "no", "hit"], "allow"), L1(["no", "no", "hit"], "allow"), L2(["no", "hit", "skip"], "ask"), null], verdict: "ask" },
  {
    cmd: "B", split: true, active: 0, mode: "bypassPermissions",
    lanes: [L0(["no", "no", "hit"], "allow", true), L1(["no", "no", "hit"], "allow", true), L2(["no", "hit", "skip"], "ask", true), ENV],
    verdict: "deny",
  },
];

const OUT_TXT: Record<Exclude<Out, "">, string> = { allow: "✓ permitido", ask: "? pregunta", deny: "✕ bloqueado" };
const VERDICT: Record<Exclude<Out, "">, [string, string]> = {
  allow: ["✓ Corre sin preguntar", ""],
  ask: ["? Te pregunta antes de correr", "2 subcomandos calzan con allow, pero 1 calza con ask: basta uno."],
  deny: ["✕ Bloqueado", "deny aplica en todos los modos, incluido bypassPermissions."],
};

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export const permisos: Escena = {
  title: "Tres compuertas en orden: deny, ask, allow",
  steps: [
    { title: "Tres listas de reglas", text: "En <code>.claude/settings.json</code> cada regla tiene la forma <code>Herramienta(especificador)</code>. Claude quiere correr un comando compuesto: tres comandos unidos con <code>&amp;&amp;</code>.", ms: 7000 },
    { title: "El comando se parte", text: "Las reglas no miran el comando entero. Claude Code lo separa en cada <code>&amp;&amp;</code>, <code>||</code>, <code>;</code> o <code>|</code>, y evalúa cada subcomando por separado.", ms: 6500 },
    { title: "Primero se revisa deny", text: "El orden es fijo: <b>deny, luego ask, luego allow</b>. Ningún subcomando calza con las reglas deny (todas son de <code>Read</code>), así que los tres pasan a la siguiente compuerta.", ms: 7500 },
    { title: "Luego ask atrapa el push", text: "<code>git push origin main</code> calza con <code>Bash(git push *)</code>. Gana la primera coincidencia en ese orden, así que ese subcomando ya no llega a allow.", ms: 7500 },
    { title: "Al final, allow", text: "<code>pnpm run test</code> calza con <code>Bash(pnpm run *)</code> y <code>git diff --stat</code> con <code>Bash(git diff *)</code>. Solos, esos dos correrían sin preguntar.", ms: 7500 },
    { title: "Un ask pesa más que dos allow", text: "Para correr solo, <b>cada</b> subcomando debe calzar con un allow. Un deny o un ask aplica si calza con cualquiera: Claude te pregunta antes de correr el comando completo.", ms: 8500 },
    { title: "deny gana incluso en bypass", text: "Ahora Claude quiere leer <code>.env</code> en modo <code>bypassPermissions</code>. <code>Read(./.env)</code> calza en la primera compuerta y bloquea: deny aplica en todos los modos.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("pm");
    const ruleRow = (g: (typeof GATES)[number], n: number) => `
      <div class="pm-rl pm-g-${g}"><b><span>${n}</span>${g}</b><div>${RULES[g].map((r) => `<span class="mo" data-r="${esc(r)}">${esc(r)}</span>`).join("")}</div></div>`;
    const laneRow = (k: number) => `
      <div class="pm-lane" data-l="${k}"><span class="mo pm-sub"></span>
        ${GATES.map((g, c) => `<span class="pm-cell pm-g-${g}" data-c="${c}"></span>`).join("")}
        <span class="pm-out"></span></div>`;
    stage.innerHTML = `
      <div class="pm-cmd">
        <span class="pm-lbl">Claude quiere correr</span>
        <span class="mo pm-code"></span>
        <span class="pm-mode"></span>
      </div>
      <div class="pm-rules"><span class="pm-cap">.claude/settings.json · permissions</span>${GATES.map((g, i) => ruleRow(g, i + 1)).join("")}</div>
      <div class="pm-grid">
        <div class="pm-head"><span class="pm-h0">Subcomando</span>
          ${GATES.map((g, c) => `<span class="pm-h pm-g-${g}" data-c="${c}"><i>${c + 1}</i>${g}</span>`).join("")}
          <span class="pm-h pm-hr">Resultado</span></div>
        ${[0, 1, 2, 3].map(laneRow).join("")}
        <p class="pm-wait">Cada subcomando pasará por las tres compuertas, en este orden.</p>
      </div>
      <div class="pm-verdict"><span class="pm-vl">Comando completo</span><b></b><small></small></div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const d = instant ? 0 : 1;
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));

    // ---------- comando ----------
    const code = q(".pm-code");
    const cmdKey = st.cmd + (st.split ? "s" : "");
    if (code.dataset.k !== cmdKey) {
      code.dataset.k = cmdKey;
      code.innerHTML = st.cmd === "A"
        ? SUBS.map((s) => `<span>${s}</span>`).join(`<i class="pm-op">&amp;&amp;</i>`)
        : `<span>Read</span> <span>./.env</span>`;
      if (d && st.cmd === "B") t.fromTo(code, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, 0);
    }
    q(".pm-lbl").textContent = st.cmd === "A" ? "Claude quiere correr" : "Claude quiere usar";
    root.classList.toggle("is-split", st.split && st.cmd === "A");
    root.classList.toggle("is-run", st.split);
    const mode = q(".pm-mode");
    mode.textContent = st.mode ? "modo: " + st.mode : "";
    mode.classList.toggle("on", !!st.mode);

    // ---------- compuerta activa ----------
    qa(".pm-h[data-c]").forEach((h) => h.classList.toggle("on", +h.dataset.c! === st.active));

    // ---------- carriles ----------
    let delay = 0;
    const lanes = qa(".pm-lane");
    const newLanes: HTMLElement[] = [];
    lanes.forEach((el, k) => {
      const ln = st.lanes[k];
      const wasOn = el.classList.contains("on");
      el.classList.toggle("on", !!ln);
      el.classList.toggle("dim", !!ln?.dim);
      if (ln && !wasOn) newLanes.push(el);
      if (!ln) gsap.set(el, { clearProps: "opacity,transform" });
      el.querySelector(".pm-sub")!.textContent = ln ? ln.sub : "";
    });
    if (d && newLanes.length) {
      if (st.cmd === "A") t.call(() => root.classList.add("cut-flash"), [], 0).call(() => root.classList.remove("cut-flash"), [], 0.9);
      t.fromTo(newLanes, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.22 }, st.cmd === "A" ? 0.5 : 0.35);
      delay = (st.cmd === "A" ? 0.5 : 0.35) + 0.22 * newLanes.length + 0.3;
    }

    // celdas: compuerta por compuerta, carril por carril
    const step = 0.42;
    for (let c = 0; c < 3; c++) {
      lanes.forEach((el, k) => {
        const ln = st.lanes[k];
        const cell = el.querySelector(`.pm-cell[data-c="${c}"]`) as HTMLElement;
        const v: Cell = ln ? ln.cells[c] : "";
        const key = v + (v === "hit" ? ln!.rule : "");
        if (cell.dataset.s === key) return;
        const apply = () => {
          cell.dataset.s = key;
          cell.className = `pm-cell pm-g-${GATES[c]}` + (v ? " is-" + v : "");
          cell.innerHTML =
            v === "no" ? `<em>—<span class="pm-nt"> no calza</span></em>` :
            v === "skip" ? `<em>no se evalúa</em>` :
            v === "hit" ? `<em>${c === 0 ? "✕" : c === 1 ? "?" : "✓"} calza</em><span class="mo">${esc(ln!.rule!)}</span>` : "";
        };
        if (d && v) {
          t.call(apply, [], delay);
          t.fromTo(cell, { scale: v === "hit" ? 0.6 : 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: v === "hit" ? 0.5 : 0.3, ease: v === "hit" ? "back.out(2.4)" : "power2.out" }, delay);
          delay += v === "hit" ? step + 0.25 : v === "skip" ? 0.15 : step;
        } else {
          apply();
          gsap.set(cell, { opacity: 1, scale: 1 });
        }
      });
    }

    // reglas encendidas
    const lit = new Map<string, number>();
    st.lanes.forEach((ln) => ln?.rule && !ln.dim && lit.set(ln.rule, 1));
    qa(".pm-rules .mo").forEach((c) => {
      const on = lit.has(c.dataset.r!);
      if (on && !c.classList.contains("on") && d) t.call(() => c.classList.add("on"), [], Math.max(0, delay - 0.3));
      else c.classList.toggle("on", on);
    });

    // resultado por carril
    lanes.forEach((el, k) => {
      const ln = st.lanes[k];
      const o = el.querySelector(".pm-out") as HTMLElement;
      const v = ln?.out ?? "";
      if (o.dataset.s === v) return;
      const apply = () => { o.dataset.s = v; o.className = "pm-out" + (v ? " is-" + v : ""); o.textContent = v ? OUT_TXT[v] : ""; };
      if (d && v) {
        t.call(apply, [], delay);
        t.fromTo(o, { x: -10, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, delay);
        delay += 0.2;
      } else { apply(); gsap.set(o, { opacity: 1, x: 0 }); }
    });

    // ---------- veredicto del comando completo ----------
    const vb = q(".pm-verdict");
    if (vb.dataset.s !== st.verdict) {
      const apply = () => {
        vb.dataset.s = st.verdict;
        vb.className = "pm-verdict" + (st.verdict ? " is-" + st.verdict : "");
        vb.querySelector(".pm-vl")!.textContent = st.cmd === "A" ? "Comando completo" : "Read ./.env";
        vb.querySelector("b")!.textContent = st.verdict ? VERDICT[st.verdict][0] : "";
        vb.querySelector("small")!.textContent = st.verdict ? VERDICT[st.verdict][1] : "";
      };
      if (d && st.verdict) {
        const at = delay + 0.2;
        t.call(apply, [], at);
        t.fromTo(vb, { y: 12, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.55, ease: "power3.out" }, at);
      } else { apply(); gsap.set(vb, st.verdict ? { opacity: 1, y: 0 } : { clearProps: "opacity,transform" }); }
    }

    if (!d) t.progress(1);
  },
};
