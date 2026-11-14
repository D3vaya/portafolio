/*
  Animación: worktrees y sesiones paralelas. Un repositorio con su checkout principal y dos
  worktrees, cada uno con su rama y su sesión de Claude. Editan el mismo archivo sin pisarse, los
  commits caen en el historial compartido, .worktreeinclude copia el .env, el patrón escritor /
  revisor, la limpieza al salir y /batch.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./worktrees.css";

type F = "" | "M"; // sin cambios / modificado
type Env = "have" | "none" | "miss" | "ok";
type Col = {
  on: boolean;
  sess?: string; // etiqueta de la sesión
  task?: string;
  files: { cfg: F; login: F; users: F; rl?: F };
  env: Env;
  ask?: boolean;
};
type Estado = {
  cols: [Col, Col, Col];
  commits: [number, number, number]; // commits en el historial compartido por rama
  feedback?: boolean;
  batch?: boolean;
  dim?: boolean;
};

const clean = { cfg: "" as F, login: "" as F, users: "" as F };
const MAIN: Col = { on: true, files: clean, env: "have" };
const OFF: Col = { on: false, files: clean, env: "none" };
const A0: Col = { on: true, sess: "Sesión A", files: clean, env: "none" };
const B0: Col = { on: true, sess: "Sesión B", files: clean, env: "none" };
const A1: Col = { ...A0, files: { cfg: "M", login: "M", users: "" } };
const B1: Col = { ...B0, files: { cfg: "M", login: "", users: "M" } };
const A2: Col = { ...A1, env: "ok" };
const B2: Col = { ...B1, env: "ok" };
const A3: Col = { ...A2, sess: "Sesión A · escritor", task: "implementa un rate limiter para la API", files: { ...A1.files, rl: "M" } };
const B3: Col = { ...B2, sess: "Sesión B · revisor", task: "revisa el rate limiter en @src/middleware/rateLimiter.ts" };

const ESTADOS: Estado[] = [
  { cols: [MAIN, OFF, OFF], commits: [3, 0, 0] },
  { cols: [MAIN, A0, OFF], commits: [3, 0, 0] },
  { cols: [MAIN, A0, B0], commits: [3, 0, 0] },
  { cols: [MAIN, A1, B1], commits: [3, 2, 1] },
  { cols: [MAIN, A2, B2], commits: [3, 2, 1] },
  { cols: [MAIN, A3, B3], commits: [3, 3, 1], feedback: true },
  { cols: [MAIN, { ...A3, ask: true }, { ...B3, ask: true }], commits: [3, 3, 1] },
  { cols: [MAIN, { ...A3, ask: true }, { ...B3, ask: true }], commits: [3, 3, 1], batch: true, dim: true },
];

const COLS = [
  { kind: "Checkout principal", path: "mi-app/", branch: "main", cmd: "" },
  { kind: "Worktree", path: ".claude/worktrees/feature-auth", branch: "worktree-feature-auth", cmd: "claude --worktree feature-auth" },
  { kind: "Worktree", path: ".claude/worktrees/bugfix-123", branch: "worktree-bugfix-123", cmd: "claude -w bugfix-123" },
];
const FILES: [keyof Col["files"], string][] = [
  ["cfg", "src/config.ts"],
  ["login", "src/auth/login.ts"],
  ["users", "src/api/users.ts"],
  ["rl", "src/middleware/rateLimiter.ts"],
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;

export const worktrees: Escena = {
  title: "Varias sesiones de Claude, cada una en su propio worktree",
  steps: [
    { title: "Un repositorio, un checkout", text: "Tu checkout principal está en la rama <code>main</code>. El historial y el remoto viven en el repositorio, abajo, y cualquier worktree los comparte.", ms: 6500 },
    { title: "Una sesión en su worktree", text: "<code>claude --worktree feature-auth</code> crea <code>.claude/worktrees/feature-auth</code> en la rama <code>worktree-feature-auth</code> y abre ahí una sesión aislada.", ms: 7500 },
    { title: "Otra terminal, otra sesión", text: "En otra terminal, <code>claude -w bugfix-123</code> crea un segundo worktree con su propia rama. Agrega <code>.claude/worktrees/</code> a tu <code>.gitignore</code>.", ms: 7000 },
    { title: "En paralelo, sin pisarse", text: "Las dos sesiones editan incluso el mismo archivo, cada una en su copia. Tu checkout principal no cambia, y cada commit cae en el historial compartido, en su rama.", ms: 8500 },
    { title: "El .env no viene solo", text: "Un worktree es un checkout limpio, sin tus archivos ignorados. Un <code>.worktreeinclude</code> con sintaxis de .gitignore los copia automáticamente al crearlo.", ms: 8000 },
    { title: "Escritor y revisor", text: "La sesión A implementa; la B, con un contexto nuevo que no está sesgado hacia ese código, lo revisa. Tú le pasas el feedback a A.", ms: 8500 },
    { title: "Al salir: conservar o borrar", text: "Un worktree limpio se borra al salir; si tiene cambios o commits, Claude te pregunta si conservarlo. Sus commits ya están en el historial compartido, listos para integrarse como cualquier rama.", ms: 9000 },
    { title: "/batch: un worktree por unidad", text: "<code>/batch &lt;instrucción&gt;</code> divide un cambio grande en 5 a 30 unidades, te presenta un plan y, al aprobarlo, lanza un subagente por unidad, cada uno en su propio worktree.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("wt");
    const col = (c: (typeof COLS)[number], n: number) => `
      <section class="wt-col wt-c${n}">
        <div class="wt-head"><span class="wt-kind">${c.kind}</span><b class="wt-path">${c.path}</b><span class="wt-br">${c.branch}</span></div>
        ${c.cmd ? `<code class="wt-cmd">$ ${c.cmd}</code>` : `<span class="wt-nocmd">sin sesión de Claude</span>`}
        ${n ? `<div class="wt-sess"><b></b><span class="wt-task"></span></div>` : ""}
        <ul class="wt-files">
          ${FILES.map(([k, f]) => `<li data-f="${k}"><span>${f.replace(/\//g, "/<wbr>")}</span><em></em></li>`).join("")}
          <li data-f="env"><span>.env</span><em></em></li>
        </ul>
        ${n ? `<div class="wt-ask"><b>¿Conservar el worktree?</b><span>tiene commits</span></div>` : ""}
      </section>`;
    stage.innerHTML = `
      <div class="wt-board">
        <div class="wt-cols">${COLS.map(col).join("")}</div>
        <div class="wt-batch"><span class="wt-l"><code>/batch</code> · un subagente por unidad, cada uno en su propio worktree (5 a 30 unidades)</span><div class="wt-minis">${Array.from({ length: 10 }, (_, k) => `<i>unidad ${k + 1}</i>`).join("")}</div></div>
        <div class="wt-git">
          <span class="wt-l">Repositorio compartido · historial y remoto</span>
          ${COLS.map((c, n) => `<div class="wt-track wt-t${n}"><code>${c.branch}</code><span class="wt-dots"></span></div>`).join("")}
        </div>
        <i class="wt-pk"><span></span></i>
      </div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    const prev = i > 0 ? ESTADOS[i - 1] : st;
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const d = instant ? 0 : 1;
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    const board = q(".wt-board"), pk = q(".wt-pk");
    gsap.set(pk, { opacity: 0, x: 0, y: 0 });
    root.classList.toggle("is-dim", !!st.dim);

    let at = 0;
    // ---------- columnas ----------
    st.cols.forEach((c, n) => {
      const el = q(".wt-c" + n), p = prev.cols[n];
      el.classList.toggle("is-on", c.on);
      el.classList.toggle("is-ask", !!c.ask);
      if (c.on && !p.on && d) t.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0);
      else gsap.set(el, { opacity: 1, y: 0 });
      const ss = el.querySelector(".wt-sess");
      if (ss) {
        ss.querySelector("b")!.textContent = c.sess ?? "";
        (ss.querySelector(".wt-task") as HTMLElement).textContent = c.task ? "“" + c.task + "”" : "";
        ss.classList.toggle("has-task", !!c.task);
      }
      // archivos
      FILES.forEach(([k]) => {
        const li = el.querySelector(`[data-f="${k}"]`) as HTMLElement;
        const v = c.files[k];
        li.classList.toggle("is-gone", v === undefined);
        li.classList.toggle("is-m", v === "M");
        li.querySelector("em")!.textContent = v === "M" ? "M" : "";
      });
      const env = el.querySelector('[data-f="env"]') as HTMLElement;
      env.className = "env-" + c.env;
      env.querySelector("em")!.textContent = c.env === "ok" ? "✓ copiado" : c.env === "miss" ? "✕ falta" : c.env === "have" ? "ignorado por git" : "";
      if (c.ask && !p.ask && d) t.fromTo(el.querySelector(".wt-ask"), { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, 0.2);
      else if (el.querySelector(".wt-ask")) gsap.set(el.querySelector(".wt-ask"), { opacity: 1, scale: 1 });
    });

    // ---------- ediciones nuevas, alternando sesiones ----------
    if (d) {
      const fresh: HTMLElement[] = [];
      for (const [k] of FILES) {
        for (const n of [1, 2]) {
          const was = prev.cols[n].files[k], now = st.cols[n].files[k];
          if (now === "M" && was !== "M") fresh.push(q(`.wt-c${n} [data-f="${k}"]`));
        }
      }
      fresh.forEach((li, k) => {
        t.fromTo(li.querySelector("em"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(3)" }, 0.3 + k * 0.45);
        t.fromTo(li, { backgroundColor: "rgba(255,179,92,.35)" }, { backgroundColor: "rgba(255,179,92,0)", duration: 1, immediateRender: false }, 0.3 + k * 0.45);
      });
      if (fresh.length) at = 0.3 + fresh.length * 0.45;
    }

    // ---------- .env por .worktreeinclude ----------
    const envNew = [1, 2].filter((n) => st.cols[n].env === "ok" && prev.cols[n].env !== "ok");
    if (envNew.length && d) {
      const br = board.getBoundingClientRect();
      const ctr = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2 - br.left, y: r.top + r.height / 2 - br.top }; };
      const src = ctr(q('.wt-c0 [data-f="env"]'));
      pk.className = "wt-pk is-ok";
      pk.querySelector("span")!.textContent = ".worktreeinclude";
      envNew.forEach((n, k) => {
        const li = q(`.wt-c${n} [data-f="env"]`), em = li.querySelector("em")!;
        li.className = "env-miss"; em.textContent = "✕ falta";
        const dst = ctr(li);
        const s = 0.9 + k * 1.3;
        t.set(pk, { x: src.x, y: src.y, opacity: 1 }, s);
        t.to(pk, { x: dst.x, y: dst.y, duration: 0.9, ease: "power2.inOut" }, s);
        t.set(pk, { opacity: 0 }, s + 0.95);
        t.call(() => { li.className = "env-ok"; em.textContent = "✓ copiado"; }, [], s + 0.9);
        t.fromTo(li, { backgroundColor: "rgba(95,214,154,.35)" }, { backgroundColor: "rgba(95,214,154,0)", duration: 1, immediateRender: false }, s + 0.9);
      });
    }

    // ---------- commits en el historial compartido ----------
    st.commits.forEach((c, n) => {
      const dots = q(`.wt-t${n} .wt-dots`);
      const track = q(`.wt-t${n}`);
      track.classList.toggle("is-on", st.cols[n].on);
      while (dots.children.length > c) dots.lastElementChild!.remove();
      const have = dots.children.length;
      for (let k = have; k < c; k++) {
        const dot = document.createElement("i");
        dots.appendChild(dot);
        if (d) t.fromTo(dot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(3)" }, at + (k - have) * 0.3 + n * 0.15);
      }
    });

    // ---------- feedback del revisor al escritor ----------
    if (st.feedback && d) {
      const br = board.getBoundingClientRect();
      const ctr = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2 - br.left, y: r.top + r.height / 2 - br.top }; };
      const a = ctr(q(".wt-c1 .wt-sess")), b = ctr(q(".wt-c2 .wt-sess"));
      const s = at + 0.6;
      t.call(() => { pk.className = "wt-pk is-fb"; pk.querySelector("span")!.textContent = "feedback (lo pasas tú)"; }, [], s);
      t.set(pk, { x: b.x, y: b.y, opacity: 1 }, s);
      t.to(pk, { x: a.x, y: a.y, duration: 1.4, ease: "power2.inOut" }, s);
      t.set(pk, { opacity: 0 }, s + 1.5);
      t.fromTo(q(".wt-c1 .wt-sess"), { boxShadow: "0 0 0 0 rgba(95,214,154,0)" }, { boxShadow: "0 0 26px -4px rgba(95,214,154,.9)", duration: 0.4, yoyo: true, repeat: 1 }, s + 1.4);
    }

    // ---------- /batch ----------
    root.classList.toggle("show-batch", !!st.batch);
    const minis = root.querySelectorAll(".wt-minis i");
    if (st.batch && !prev.batch && d) t.fromTo(minis, { opacity: 0, y: -10, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.12, ease: "back.out(2)" }, 0.2);
    else gsap.set(minis, { opacity: 1, y: 0, scale: 1 });

    if (!d) t.progress(1);
  },
};
