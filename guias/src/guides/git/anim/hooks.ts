/*
  Animación: hooks de Git. Una tubería de eventos: git commit pasa por pre-commit,
  prepare-commit-msg y commit-msg antes de crear el commit, y post-commit después; git push pasa
  por pre-push y luego por los hooks del servidor. Un hook que sale con código distinto de 0
  cancela la operación. Cierra con --no-verify, core.hooksPath y los hooks en la configuración.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import "./hooks.css";

type S = "" | "run" | "ok" | "bad" | "skip" | "new";
const NODES: { k: string; name: string; note: string; track: 0 | 1 }[] = [
  { k: "pre", name: "pre-commit", note: "lint, tests rápidos", track: 0 },
  { k: "prep", name: "prepare-commit-msg", note: "prepara el mensaje", track: 0 },
  { k: "msg", name: "commit-msg", note: "valida el mensaje", track: 0 },
  { k: "made", name: "commit creado", note: "", track: 0 },
  { k: "post", name: "post-commit", note: "avisa, no puede cancelar", track: 0 },
  { k: "push", name: "pre-push", note: "tests completos", track: 1 },
  { k: "srv", name: "servidor", note: "pre-receive · update · post-receive", track: 1 },
];

type St = { n: Partial<Record<string, S>>; note?: Partial<Record<string, string>>; panel: string; cmd: string; out?: string };

const SAMPLES = `<b>.git/hooks/</b><span class="hk-f is-dim">pre-commit.sample</span><span class="hk-f is-dim">commit-msg.sample</span><span class="hk-f is-dim">pre-push.sample</span><small>terminan en .sample: no hacen nada</small>`;
const ACTIVE = `<b>.git/hooks/</b><span class="hk-f">pre-commit</span><span class="hk-f">commit-msg</span><span class="hk-f">pre-push</span><small>ejecutables, sin .sample</small>`;
const SHARED = `<b>.githooks/ <em>(versionado)</em></b><span class="hk-f is-ok">pre-commit</span><span class="hk-f is-ok">commit-msg</span><span class="hk-f is-ok">pre-push</span><small>.git/hooks/ no se clona ni se sube</small>`;
const CONFIG = `<b>.git/config</b><pre class="hk-cfg">[hook "lint"]\n  event = pre-commit\n  command = npm run lint</pre><small>también en tu config global</small>`;

const PASOS: St[] = [
  { n: {}, panel: SAMPLES, cmd: "ls .git/hooks", out: "applypatch-msg.sample  pre-commit.sample\ncommit-msg.sample      pre-push.sample\npost-update.sample     pre-receive.sample  …" },
  { n: { pre: "bad", made: "skip" }, panel: ACTIVE, cmd: 'git commit -m "agrega pago"', out: '<span class="bad"># pre-commit ✕ eslint: 2 errores en pago.js</span>' },
  {
    n: { pre: "ok", prep: "ok", msg: "bad", made: "skip" }, panel: ACTIVE, cmd: 'git commit -m "arreglos"',
    out: '<span class="bad"># commit-msg ✕ usa el formato tipo(alcance): resumen</span>',
  },
  {
    n: { pre: "ok", prep: "ok", msg: "ok", made: "new", post: "ok" }, note: { made: "a1f3e9c" }, panel: ACTIVE,
    cmd: 'git commit -m "fix(pago): evita cobro doble"', out: '<span class="ok">[main a1f3e9c] fix(pago): evita cobro doble</span>',
  },
  {
    n: { pre: "ok", prep: "ok", msg: "ok", made: "ok", post: "ok", push: "ok", srv: "ok" }, note: { made: "a1f3e9c" }, panel: ACTIVE,
    cmd: "git push", out: '<span class="ok"># pre-push ✓ 48 tests</span>\nTo github.com:ana/tienda.git\n   7b21e4d..a1f3e9c  main -> main',
  },
  {
    n: { pre: "skip", prep: "ok", msg: "skip", made: "new", post: "ok" }, note: { made: "c3d82b0", push: "git push --no-verify lo salta", srv: "este no se salta" }, panel: ACTIVE,
    cmd: 'git commit --no-verify -m "wip"', out: '<span class="warn">[main c3d82b0] wip</span>',
  },
  { n: {}, panel: SHARED, cmd: "git config core.hooksPath .githooks" },
  { n: { pre: "run" }, note: { pre: "lint (desde la config)" }, panel: CONFIG, cmd: "git config set hook.lint.event pre-commit" },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

export const hooks: Escena = {
  title: "Hooks: scripts que corren en cada evento",
  steps: [
    { title: "Scripts en momentos clave", text: "Un hook es un script que Git ejecuta en cierto evento, si existe con ese nombre en <code>.git/hooks/</code> y es ejecutable. Los <code>.sample</code> son ejemplos inactivos.", ms: 7500 },
    { title: "pre-commit corta a tiempo", text: "Antes de crear el commit corre <code>pre-commit</code>. Si el script sale con un código distinto de 0, Git cancela el commit y tus cambios siguen en el staging.", ms: 8000 },
    { title: "commit-msg revisa el mensaje", text: "<code>prepare-commit-msg</code> puede rellenar el mensaje; <code>commit-msg</code> lo valida. Aquí exige Conventional Commits y rechaza <code>\"arreglos\"</code>.", ms: 8000 },
    { title: "Todo en verde: commit creado", text: "Con los hooks en verde nace el commit. Después corre <code>post-commit</code>, que sirve para avisar o registrar, pero ya no puede cancelar nada.", ms: 7500 },
    { title: "pre-push y el servidor", text: "<code>pre-push</code> corre antes de subir. En el servidor corren <code>pre-receive</code>, <code>update</code> y <code>post-receive</code>; en GitHub eso se hace con reglas de protección y Actions.", ms: 8500 },
    { title: "--no-verify salta los locales", text: "<code>git commit --no-verify</code> salta <code>pre-commit</code> y <code>commit-msg</code>. Úsalo con cuidado: los controles del servidor y de CI siguen corriendo.", ms: 8000 },
    { title: "Compartir hooks con el equipo", text: "<code>.git/hooks/</code> no se versiona. Guarda los scripts en el repo y apunta <code>core.hooksPath</code> a esa carpeta, o usa husky, lefthook o pre-commit.", ms: 8000 },
    { title: "Hooks en la configuración", text: "Desde Git 2.54 también defines hooks con <code>hook.&lt;nombre&gt;.command</code> y <code>hook.&lt;nombre&gt;.event</code>. Puedes tener varios por evento.", ms: 8000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("hk");
    term = consola(stage);
    const node = (n: (typeof NODES)[number]) => `<span class="hk-n" data-k="${n.k}"><b>${n.name}</b><em data-def="${n.note}">${n.note}</em></span>`;
    const track = (tr: 0 | 1, label: string) =>
      `<div class="hk-track"><span class="hk-tl">${label}</span><div class="hk-flow">${NODES.filter((n) => n.track === tr).map(node).join('<i class="hk-ar">→</i>')}</div></div>`;
    const board = document.createElement("div");
    board.className = "hk-board";
    board.innerHTML = `<div class="hk-tracks">${track(0, "git commit")}${track(1, "git push")}</div><div class="hk-panel"></div>`;
    stage.appendChild(board);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-ok"></i>hook pasó (salida 0)</span><span><i class="l-conflict"></i>✕ falló: cancela</span><span><i class="l-new"></i>commit nuevo</span><span><i class="hk-l-skip"></i>saltado</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const s = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(s.cmd, t, 0, s.out || "");
    const panel = root.querySelector(".hk-panel") as HTMLElement;
    if (panel.innerHTML !== s.panel) {
      panel.innerHTML = s.panel;
      if (t) t.fromTo(panel.children, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.07, clearProps: "all" }, 0);
    }
    let k = 0;
    NODES.forEach((n) => {
      const el = root.querySelector(`.hk-n[data-k="${n.k}"]`) as HTMLElement;
      const st = s.n[n.k] || "";
      const em = el.querySelector("em")!;
      const note = s.note?.[n.k] ?? em.dataset.def ?? "";
      const set = () => {
        el.className = "hk-n" + (st ? " s-" + st : "");
        em.textContent = note;
      };
      // los hooks se encienden en orden, como el recorrido real
      if (!t || !st) { set(); return; }
      el.className = "hk-n";
      em.textContent = note;
      const at = d + k++ * 0.32;
      t.call(set, [], at);
      t.fromTo(el, { scale: 0.9 }, { scale: 1, duration: 0.45, ease: st === "bad" ? "elastic.out(1, 0.45)" : "back.out(2)", clearProps: "transform" }, at);
    });
  },
};
