/*
  Animación: Claude Code en GitHub Actions. Un PR abierto dispara un workflow con
  anthropics/claude-code-action@v1 (modo automatización, con prompt), Claude comenta inline,
  alguien le responde con @claude (modo interactivo), Claude sube un commit y el merge
  queda en manos humanas. Cada paso completado queda marcado con un check.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./actions.css";

type Run = { file: string; event: string; mode: string; lines: string[] } | null;
type Estado = {
  pr: boolean;
  run: Run;
  runDone: boolean;
  review: boolean;
  reply: boolean;
  commit: boolean;
  merge: boolean;
  done: number; // pasos completados en la lista
};

const RUN_REVIEW: Run = {
  file: ".github/workflows/claude-review.yml",
  event: "pull_request: opened",
  mode: "modo automatización (con prompt)",
  lines: [
    "uses: anthropics/claude-code-action@v1",
    "prompt: /code-review:code-review --comment",
    "● Read(diff + archivos tocados)",
    "● Read(CLAUDE.md)",
    "● Bash(pnpm test)  ✓ 128 tests",
  ],
};
const RUN_REPLY: Run = {
  file: ".github/workflows/claude.yml",
  event: "pull_request_review_comment: created",
  mode: "modo interactivo (sin prompt)",
  lines: [
    "if: contains(github.event.comment.body, '@claude')",
    "uses: anthropics/claude-code-action@v1",
    "claude_args: \"--max-turns 10\"",
    "● Edit(src/lib/envio.test.ts)",
    "● git push → rama del PR",
  ],
};

const CHECKS = ["PR abierto", "Workflow corre", "Claude comenta", "Mención a @claude", "Commit nuevo", "Merge humano"];

const ESTADOS: Estado[] = [
  { pr: true, run: null, runDone: false, review: false, reply: false, commit: false, merge: false, done: 1 },
  { pr: true, run: RUN_REVIEW, runDone: true, review: false, reply: false, commit: false, merge: false, done: 2 },
  { pr: true, run: RUN_REVIEW, runDone: true, review: true, reply: false, commit: false, merge: false, done: 3 },
  { pr: true, run: null, runDone: false, review: true, reply: true, commit: false, merge: false, done: 4 },
  { pr: true, run: RUN_REPLY, runDone: true, review: true, reply: true, commit: true, merge: false, done: 5 },
  { pr: true, run: null, runDone: false, review: true, reply: true, commit: true, merge: true, done: 6 },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;

export const actions: Escena = {
  title: "De un PR abierto a un merge humano",
  steps: [
    { title: "Se abre un PR", text: "Abres un pull request. El evento <code>pull_request</code> es lo que dispara el workflow de revisión que guardaste en <code>.github/workflows/</code>.", ms: 6500 },
    { title: "El workflow corre", text: "En el runner, <code>anthropics/claude-code-action@v1</code> recibe un <code>prompt</code>, así que trabaja en <b>modo automatización</b>: aquí, la skill <code>/code-review:code-review --comment</code>. Lee el diff, tu CLAUDE.md y corre los tests.", ms: 8500 },
    { title: "Claude comenta inline", text: "Los hallazgos quedan como comentarios <b>inline</b> sobre las líneas del PR, donde el equipo los discute como cualquier otra revisión.", ms: 7000 },
    { title: "Le respondes con @claude", text: "Respondes en el hilo mencionando a <code>@claude</code>. Ese comentario dispara el otro workflow en <b>modo interactivo</b>. Solo usuarios con permiso de escritura pueden dispararlo.", ms: 8000 },
    { title: "Claude sube un commit", text: "Con <code>contents: write</code>, Claude edita, hace push de un commit a la rama del PR y responde en el hilo. <code>--max-turns</code> en <code>claude_args</code> pone tope a la corrida.", ms: 8000 },
    { title: "La decisión final es tuya", text: "Claude revisa, comenta y propone cambios, pero <b>el merge sigue siendo una decisión humana</b>.", ms: 7000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("ga");
    stage.innerHTML = `
      <div class="ga-main">
        <div class="ga-pr">
          <div class="ga-prh">
            <span class="ga-open">Abierto</span>
            <b>Calcula el costo de envío <span>#42</span></b>
          </div>
          <div class="ga-tl">
            <div class="ga-ev ga-ev-open"><i class="ga-av h">tú</i><span>abriste el PR · 2 archivos</span></div>
            <div class="ga-file">
              <div class="ga-fn">src/lib/envio.ts</div>
              <pre class="ga-diff"><span>47  const base = tarifa(zona);</span><span class="ga-hl">48+ return base / peso;</span><span>49  }</span></pre>
              <div class="ga-th">
                <div class="ga-c ga-c-claude"><i class="ga-av c">C</i><div><b>claude</b><p>Línea 48: división por cero si <code>peso = 0</code>.</p></div></div>
                <div class="ga-c ga-c-you"><i class="ga-av h">tú</i><div><b>tú</b><p><span class="ga-at">@claude</span> agrega el test para <code>peso = 0</code></p></div></div>
                <div class="ga-c ga-c-ans"><i class="ga-av c">C</i><div><b>claude</b><p>Listo: agregué el test y una guarda para <code>peso = 0</code>.</p></div></div>
              </div>
            </div>
            <div class="ga-ev ga-ev-commit"><i class="ga-av c">C</i><span><code>a3f9c1e</code> test: cubre peso = 0 <em>✓ checks</em></span></div>
          </div>
          <div class="ga-mergebar"><button type="button" tabindex="-1" class="ga-merge">Merge pull request</button><span class="ga-who">decisión humana</span></div>
        </div>
        <div class="ga-side">
          <div class="ga-run">
            <div class="ga-rh"><span class="ga-ev-chip"></span></div>
            <div class="ga-rf"></div>
            <div class="ga-mode"></div>
            <ul class="ga-log"></ul>
            <div class="ga-prog"><i></i></div>
          </div>
          <ol class="ga-checks">${CHECKS.map((c, k) => `<li><i class="ga-ck"></i><span>${k + 1}. ${c}</span></li>`).join("")}</ol>
        </div>
      </div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const d = instant ? 0 : 1;
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));

    // ---------- PR: aparece lo que corresponde, una cosa a la vez ----------
    const show = (sel: string, on: boolean, at: number) => {
      const el = q(sel);
      const was = el.classList.contains("on");
      el.classList.toggle("on", on);
      if (on && !was && d) t.fromTo(el, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "y,opacity" }, at);
    };
    show(".ga-pr", st.pr, 0.1);
    let runEnd = 0.3;

    // ---------- runner ----------
    const run = q(".ga-run");
    const log = q(".ga-log");
    const prog = q(".ga-prog i");
    const key = st.run ? st.run.file : "";
    run.classList.toggle("on", !!st.run);
    if (st.run) {
      const fresh = run.dataset.key !== key;
      run.dataset.key = key;
      q(".ga-ev-chip").textContent = st.run.event;
      q(".ga-rf").textContent = st.run.file;
      q(".ga-mode").textContent = st.run.mode;
      if (fresh) {
        log.innerHTML = st.run.lines.map((l) => `<li>${esc(l)}</li>`).join("");
        if (d) {
          t.fromTo(run, { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "x,opacity" }, 0.2);
          t.fromTo(prog, { width: "0%" }, { width: "100%", duration: 2.6, ease: "none" }, 0.7);
          t.fromTo(qa(".ga-log li"), { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.5, ease: "power2.out", clearProps: "x,opacity" }, 0.8);
          runEnd = 3.4;
        } else gsap.set(prog, { width: "100%" });
      } else gsap.set(prog, { width: "100%" });
      run.classList.toggle("is-done", st.runDone && (!fresh || !d));
      if (fresh && d) t.call(() => run.classList.add("is-done"), [], runEnd);
    } else {
      run.dataset.key = "";
      gsap.set(prog, { width: "0%" });
    }

    // ---------- hilo de comentarios y commit ----------
    show(".ga-c-claude", st.review, i === 2 ? 0.4 : runEnd);
    q(".ga-hl").classList.toggle("on", st.review);
    show(".ga-c-you", st.reply, 0.3);
    if (st.reply && i === 3 && d) t.fromTo(q(".ga-at"), { backgroundColor: "rgba(255,91,31,.6)" }, { backgroundColor: "rgba(255,91,31,.14)", duration: 1.2, ease: "power2.out", clearProps: "backgroundColor" }, 0.9);
    show(".ga-c-ans", st.commit, runEnd + 0.1);
    show(".ga-ev-commit", st.commit, runEnd + 0.5);

    // ---------- merge ----------
    const mb = q(".ga-mergebar");
    mb.classList.toggle("on", st.merge);
    if (st.merge && d) t.fromTo(q(".ga-merge"), { scale: 0.9 }, { scale: 1, duration: 0.6, ease: "back.out(3)", clearProps: "scale" }, 0.4);

    // ---------- lista de pasos con check ----------
    const lis = qa(".ga-checks li");
    lis.forEach((li, k) => {
      const was = li.classList.contains("ok");
      const ok = k < st.done;
      li.classList.toggle("ok", ok);
      li.classList.toggle("now", k === st.done - 1);
      if (ok && !was && d) {
        const at = k === st.done - 1 ? Math.max(runEnd, 0.6) + 0.4 : 0;
        li.classList.remove("ok");
        t.call(() => li.classList.add("ok"), [], at);
        t.fromTo(li.querySelector(".ga-ck"), { scale: 0.2 }, { scale: 1, duration: 0.45, ease: "back.out(3)", clearProps: "scale" }, at);
      }
    });
    if (!d) t.progress(1);
  },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
