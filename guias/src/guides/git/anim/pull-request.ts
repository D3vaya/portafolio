/*
  Animación: el flujo con pull requests. Rama desde main actualizado, commits, push a GitHub, PR con
  revisión y CI, un commit más por la revisión, merge en GitHub y, de vuelta en local, actualizar
  main y borrar la rama.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Ref } from "./_kit";
import "./pull-request.css";

// columnas corridas y algo más juntas: dejan espacio a "HEAD → login-google" a la izquierda y a origin/main a la derecha
const X = (k: number) => 0.7 + k * 0.67;
const A = c("A", X(0), 0);
const B = c("B", X(1), 1, "A"), C = c("C", X(2), 1, "B"), D = c("D", X(3), 1, "C");
const M = c("M", X(4), 0, ["A", "D"]);

/** Tarjeta de la pull request: null = todavía no existe. */
type PR = { review: "pend" | "changes" | "ok"; commits: number; merged?: boolean; comment?: boolean } | null;
type Paso = { cmd: string; out?: string; local: Grafo; remote: Grafo; pr: PR };

const rem = (main: string): Ref => ({ name: "origin/main", at: main, kind: "remote" });
const remLg = (at: string): Ref => ({ name: "origin/login-google", at, kind: "remote" });

const PASOS: Paso[] = [
  { cmd: "git switch main && git pull", out: "Already up to date.",
    local: { nodes: [A], refs: [{ name: "main", at: "A" }, rem("A")], head: "main" },
    remote: { nodes: [A], refs: [{ name: "main", at: "A" }] }, pr: null },
  { cmd: "git switch -c login-google", out: "Switched to a new branch 'login-google'",
    local: { nodes: [A], refs: [{ name: "main", at: "A" }, rem("A"), { name: "login-google", at: "A", side: "down" }], head: "login-google" },
    remote: { nodes: [A], refs: [{ name: "main", at: "A" }] }, pr: null },
  { cmd: 'git commit -m "conecta OAuth de Google"', out: "[login-google 9c2e4f1] conecta OAuth de Google\n 2 files changed, 48 insertions(+)",
    local: { nodes: [A, { ...B, tone: "new" }, { ...C, tone: "new" }], refs: [{ name: "main", at: "A" }, rem("A"), { name: "login-google", at: "C" }], head: "login-google" },
    remote: { nodes: [A], refs: [{ name: "main", at: "A" }] }, pr: null },
  { cmd: "git push -u origin login-google",
    out: "To github.com:tu-usuario/mi-app.git\n<span class=\"ok\"> * [new branch]      login-google -> login-google</span>\nbranch 'login-google' set up to track 'origin/login-google'.",
    local: { nodes: [A, B, C], refs: [{ name: "main", at: "A" }, rem("A"), { name: "login-google", at: "C" }, remLg("C")], head: "login-google" },
    remote: { nodes: [A, { ...B, tone: "new" }, { ...C, tone: "new" }], refs: [{ name: "main", at: "A" }, { name: "login-google", at: "C" }] }, pr: null },
  { cmd: "gh pr create --fill", out: "https://github.com/tu-usuario/mi-app/pull/42",
    local: { nodes: [A, B, C], refs: [{ name: "main", at: "A" }, rem("A"), { name: "login-google", at: "C" }, remLg("C")], head: "login-google" },
    remote: { nodes: [A, B, C], refs: [{ name: "main", at: "A" }, { name: "login-google", at: "C" }] }, pr: { review: "pend", commits: 2 } },
  { cmd: 'git commit -am "maneja la cancelación" && git push', out: "To github.com:tu-usuario/mi-app.git\n   9c2e4f1..b71d3a8  login-google -> login-google",
    local: { nodes: [A, B, C, { ...D, tone: "new" }], refs: [{ name: "main", at: "A" }, rem("A"), { name: "login-google", at: "D" }, remLg("D")], head: "login-google" },
    remote: { nodes: [A, B, C, { ...D, tone: "new" }], refs: [{ name: "main", at: "A" }, { name: "login-google", at: "D" }] }, pr: { review: "changes", commits: 3, comment: true } },
  { cmd: "gh pr merge 42 --merge", out: '<span class="ok">✓ Merged pull request #42 (Inicio de sesión con Google)</span>',
    local: { nodes: [A, B, C, D], refs: [{ name: "main", at: "A" }, rem("A"), { name: "login-google", at: "D" }, remLg("D")], head: "login-google" },
    remote: { nodes: [A, B, C, D, { ...M, tone: "new" }], refs: [{ name: "main", at: "M" }, { name: "login-google", at: "D" }] }, pr: { review: "ok", commits: 3, merged: true } },
  { cmd: "git switch main && git pull && git branch -d login-google",
    out: "Switched to branch 'main'\nUpdating 3c1f2a9..a41e9d7\nFast-forward\nDeleted branch login-google (was b71d3a8).",
    local: { nodes: [A, B, C, D, { ...M, tone: "new" }], refs: [{ name: "main", at: "M" }, rem("M"), remLg("D")], head: "main" },
    remote: { nodes: [A, B, C, D, M], refs: [{ name: "main", at: "M" }, { name: "login-google", at: "D" }] }, pr: { review: "ok", commits: 3, merged: true } },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let gl: ReturnType<typeof grafo>;
let gr: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;
let card: HTMLElement;

const REV = {
  pend: ["warn", "Revisión pendiente"],
  changes: ["warn", "Cambios solicitados: ya respondidos con un commit"],
  ok: ["ok", "✓ Aprobada por 1 revisora"],
} as const;

function cardHTML(pr: NonNullable<PR>) {
  const [cls, txt] = REV[pr.review];
  return `
    <div class="pr-ct"><b>Inicio de sesión con Google</b><span class="pr-num">#42</span></div>
    <div class="pr-br"><span class="pr-ch">login-google</span> → <span class="pr-ch">main</span> · ${pr.commits} commits</div>
    <ul>
      <li class="ok">✓ CI: pruebas pasaron</li>
      <li class="${cls}">${txt}</li>
      ${pr.comment ? `<li class="pr-com"><b>ana:</b> “Maneja el caso en que el usuario cancela.”</li>` : ""}
    </ul>
    <div class="pr-state${pr.merged ? " is-merged" : ""}">${pr.merged ? "✓ Fusionada en main" : "Abierta"}</div>`;
}

export const pullRequest: Escena = {
  title: "Del commit a main con una pull request",
  steps: [
    { title: "Parte de main actualizado", text: "Antes de empezar, cambia a <code>main</code> y trae lo último de GitHub con <code>git pull</code>. Así tu rama nace del código más reciente.", ms: 7000 },
    { title: "Una rama por tarea", text: "<code>git switch -c login-google</code> crea la rama y te cambia a ella. Todo el trabajo de esta tarea vivirá ahí, sin tocar <code>main</code>.", ms: 7000 },
    { title: "Trabajas con commits", text: "Haces tus commits como siempre. Por ahora solo existen en tu computadora: GitHub todavía no sabe nada de esta rama.", ms: 7000 },
    { title: "Subir la rama", text: "<code>git push -u origin login-google</code> crea la rama en GitHub. <code>-u</code> la vincula con <code>origin/login-google</code> para que después baste <code>git push</code>.", ms: 8500 },
    { title: "Abrir la pull request", text: "En GitHub (o con <code>gh pr create</code>) pides fusionar <code>login-google</code> en <code>main</code>. La CI corre las pruebas y alguien revisa tu código.", ms: 8000 },
    { title: "La revisión pide cambios", text: "Ana comenta algo. Lo arreglas con un commit nuevo y haces <code>git push</code>: la misma PR se actualiza sola y la CI vuelve a correr.", ms: 8000 },
    { title: "Aprobada y fusionada", text: "GitHub ofrece tres botones: <b>merge</b> (commit M con dos padres, como aquí), <b>squash</b> (todo en un solo commit) y <b>rebase</b> (copia los commits en línea).", ms: 9000 },
    { title: "Cerrar el ciclo en local", text: "Vuelve a <code>main</code>, trae el merge con <code>git pull</code> y borra la rama con <code>git branch -d</code>. Los commits siguen en la historia, unidos por M.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("pr");
    term = consola(stage);
    const zones = document.createElement("div");
    zones.className = "pr-zones";
    zones.innerHTML = `
      <section class="pr-z pr-local"><span class="pr-l">Tu repositorio local</span><div class="pr-g"></div></section>
      <section class="pr-z pr-gh"><span class="pr-l">GitHub (origin)</span><div class="pr-g"></div><div class="pr-card"></div></section>`;
    stage.appendChild(zones);
    gl = grafo(zones.querySelector(".pr-local .pr-g") as HTMLElement, { cols: 4.6, rows: 2, bottom: 76 });
    gr = grafo(zones.querySelector(".pr-gh .pr-g") as HTMLElement, { cols: 4.6, rows: 2, bottom: 46 });
    card = zones.querySelector(".pr-card") as HTMLElement;
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="l-remote"></i>copia de la remota (origin/…)</span><span><i class="l-new"></i>commit nuevo</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const prev = i > 0 ? PASOS[i - 1] : null;
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const at = instant ? 0 : d;
    // lo local cambia con tus comandos; GitHub, después (push y merge viajan hacia allá)
    gl.render(p.local, t, at);
    gr.render(p.remote, t, at + (t ? 0.6 : 0));

    const html = p.pr ? cardHTML(p.pr) : "";
    const changed = card.innerHTML.trim() !== html.trim();
    card.innerHTML = html;
    card.hidden = !p.pr;
    if (t && p.pr && changed) {
      if (!prev?.pr) t.fromTo(card, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(2)" }, at + 0.4);
      else t.fromTo(card.querySelectorAll("li, .pr-state"), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.25, ease: "power3.out" }, at + 0.9);
    } else gsap.set(card, { opacity: 1, y: 0 });
  },
};
