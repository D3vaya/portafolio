/*
  Animación: hashes en cadena. Cada commit guarda el hash de su padre, y ese dato entra en su propio
  hash. Cambiar un byte de B cambia su hash, y en cascada el de todos sus descendientes: por eso la
  historia es a prueba de manipulación y por eso reescribir historia crea commits nuevos.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo, type Nodo } from "./_kit";
import "./merkle.css";

const NS = "http://www.w3.org/2000/svg";
type Info = { hash: string; par?: string; hc?: string; pc?: string };
type Paso = { g: Grafo; info: Record<string, Info>; cmd: string; out?: string; row2?: boolean };

// columna 0: rótulos "hash" / "padre"
const A = c("A", 0.7, 0), B = c("B", 1.7, 0, "A"), C = c("C", 2.7, 0, "B"), D = c("D", 3.7, 0, "C");
const B2 = c("B2", 1.7, 0, "A", { label: "B′", tone: "copy" });
const C2 = c("C2", 2.7, 0, "B2", { label: "C′", tone: "copy" });
const D2 = c("D2", 3.7, 0, "C2", { label: "D′", tone: "copy" });
const gh = (n: Nodo): Nodo => ({ ...n, y: 1, tone: "ghost" });
const ok = (n: Nodo): Nodo => ({ ...n, tone: "ok" });

const I0: Record<string, Info> = {
  A: { hash: "1a6d2c4", par: "—" },
  B: { hash: "b5e3f90", par: "1a6d2c4" },
  C: { hash: "4c7b1a8", par: "b5e3f90" },
  D: { hash: "9d02e7f", par: "4c7b1a8" },
};
const ICOPY: Record<string, Info> = {
  ...I0,
  B2: { hash: "2d81f6a", par: "1a6d2c4" },
  C2: { hash: "6f3e0b5", par: "2d81f6a" },
  D2: { hash: "e70c9a3", par: "6f3e0b5" },
};
const green = (r: Record<string, Info>, ids: string[]) => {
  const o = { ...r };
  ids.forEach((k) => (o[k] = { ...o[k], hc: "ok", pc: "ok" }));
  return o;
};
const main = (at: string) => [{ name: "main", at }];

const PASOS: Paso[] = [
  {
    cmd: 'git log --format="%h %p %s"',
    out: "9d02e7f 4c7b1a8 agrega pago\n4c7b1a8 b5e3f90 corrige total\nb5e3f90 1a6d2c4 agrega carrito\n1a6d2c4 crea la tienda",
    g: { nodes: [A, B, C, D], refs: main("D"), head: "main" }, info: I0,
  },
  {
    cmd: "git cat-file -p 9d02e7f",
    out: 'tree 7e1c0a9…\n<span class="hl">parent 4c7b1a8…</span>\nauthor Ana &lt;ana@mail.com&gt; 1763130000 -0300\n\nagrega pago',
    g: { nodes: [A, B, { ...C, tone: "hl" }, D], refs: main("D"), head: "main" },
    info: { ...I0, C: { ...I0.C, hc: "hl" }, D: { ...I0.D, pc: "hl" } },
  },
  {
    cmd: "# alguien cambia un byte de B",
    out: '<span class="bad"># hash de B: b5e3f90 → 2d81f6a</span>',
    g: { nodes: [A, { ...B, tone: "conflict" }, C, D], refs: main("D"), head: "main" },
    info: { ...I0, B: { hash: "2d81f6a", par: "1a6d2c4", hc: "bad" }, C: { ...I0.C, pc: "bad" } },
  },
  {
    cmd: "# para arreglar C hay que cambiar su padre",
    out: '<span class="bad"># C cambia de hash, y entonces D también</span>',
    g: { nodes: [A, { ...B, tone: "conflict" }, { ...C, tone: "conflict" }, { ...D, tone: "conflict" }], refs: main("D"), head: "main" },
    info: {
      ...I0,
      B: { hash: "2d81f6a", par: "1a6d2c4", hc: "bad" },
      C: { hash: "✕ cambia", par: "2d81f6a", hc: "bad", pc: "bad" },
      D: { hash: "✕ cambia", par: "✕ cambia", hc: "bad", pc: "bad" },
    },
  },
  {
    cmd: "git rebase -i 1a6d2c4",
    out: "Successfully rebased and updated refs/heads/main.",
    row2: true,
    g: { nodes: [A, gh(B), gh(C), gh(D), B2, C2, D2], refs: main("D2"), head: "main" }, info: ICOPY,
  },
  {
    cmd: "git rev-parse main",
    out: '<span class="ok">e70c9a3d41b8f26a0c5e7d19b3f2a84c6d0e1b57</span>',
    row2: true,
    g: { nodes: [ok(A), gh(B), gh(C), gh(D), ok(B2), ok(C2), ok(D2)], refs: main("D2"), head: "main" },
    info: green(ICOPY, ["A", "B2", "C2", "D2"]),
  },
  {
    cmd: "git rev-parse --show-object-format",
    out: "sha1",
    row2: true,
    g: { nodes: [ok(A), gh(B), gh(C), gh(D), ok(B2), ok(C2), ok(D2)], refs: main("D2"), head: "main" },
    info: green(ICOPY, ["A", "B2", "C2", "D2"]),
  },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let g: ReturnType<typeof grafo>;
let term: ReturnType<typeof consola>;
let rowLab: SVGGElement;

function txt(cls: string, y: number, s = "") {
  const t = document.createElementNS(NS, "text");
  t.setAttribute("class", cls);
  t.setAttribute("y", String(y));
  t.textContent = s;
  return t;
}

/** Agrega (o actualiza) los textos "hash" y "padre" dentro del grupo de cada commit. */
function infoTexts(p: Paso) {
  const byLabel = new Map<string, SVGGElement>();
  g.svg.querySelectorAll<SVGGElement>(".gk-node").forEach((n) => byLabel.set(n.querySelector(".gk-l")!.textContent || "", n));
  p.g.nodes.forEach((n) => {
    const el = byLabel.get(n.label ?? n.id);
    const inf = p.info[n.id];
    if (!el || !inf) return;
    let h = el.querySelector(".mk-h") as SVGTextElement | null;
    let pa = el.querySelector(".mk-p") as SVGTextElement | null;
    if (!h) { h = txt("mk-h", 37); pa = txt("mk-p", 55); el.append(h, pa); }
    h.textContent = inf.hash;
    pa!.textContent = inf.par ?? "";
    h.setAttribute("class", "mk-h" + (inf.hc ? " c-" + inf.hc : ""));
    pa!.setAttribute("class", "mk-p" + (inf.pc ? " c-" + inf.pc : ""));
  });
}

export const merkle: Escena = {
  title: "Cada hash depende de toda la historia anterior",
  steps: [
    { title: "Cada commit tiene una huella", text: "El hash de un commit se calcula con todo lo que guarda: la foto de los archivos, autor, fecha, mensaje y el hash de su padre.", ms: 7500 },
    { title: "El padre va dentro del hash", text: "D guarda el hash de C. Como ese dato entra en su cálculo, el hash de D depende de C, el de C depende de B, y así hasta el primero.", ms: 8000 },
    { title: "Cambia un byte de B", text: "Si alguien altera B, aunque sea un byte, su hash cambia. Pero C sigue diciendo que su padre es <code>b5e3f90</code>: la cadena ya no coincide.", ms: 8000 },
    { title: "La cascada llega hasta el final", text: "Para arreglar C hay que cambiar su padre, y eso cambia su hash. Lo mismo pasa con D. Todo lo que viene después de B cambia.", ms: 7500 },
    { title: "Reescribir crea commits nuevos", text: "Por eso <code>rebase</code> y <code>commit --amend</code> no editan commits: crean copias con hashes nuevos. <code>main</code> salta a las copias y los originales quedan sin rama.", ms: 8500 },
    { title: "Un hash verifica todo", text: "Con el hash del último commit verificas la historia entera: cualquier cambio anterior lo habría alterado. Si dos clones tienen el mismo hash en <code>main</code>, su historia es idéntica.", ms: 8500 },
    { title: "SHA-1 hoy, SHA-256 después", text: "Git usa SHA-1 con detección de colisiones. Ya admite repos SHA-256 (<code>git init --object-format=sha256</code>) y está previsto que sea el formato por defecto en Git 3.0.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("mk");
    term = consola(stage);
    const box = document.createElement("div");
    box.className = "mk-graph";
    stage.appendChild(box);
    g = grafo(box, { cols: 5, rows: 2, bottom: 70 });
    rowLab = document.createElementNS(NS, "g");
    rowLab.setAttribute("class", "mk-rows");
    [0, 1].forEach((y) => {
      const t0 = txt("mk-rl", g.py(y) + 37, "hash"), t1 = txt("mk-rl", g.py(y) + 55, "padre");
      t0.setAttribute("x", String(g.px(0) + 12)); t1.setAttribute("x", String(g.px(0) + 12));
      t0.dataset.row = t1.dataset.row = String(y);
      rowLab.append(t0, t1);
    });
    g.svg.appendChild(rowLab);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-conflict"></i>hash que ya no coincide</span><span><i class="l-copy"></i>copia con hash nuevo</span><span><i class="l-ghost"></i>original sin rama</span><span><i class="l-ok"></i>verificado</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    g.render(p.g, t, instant ? 0 : d);
    infoTexts(p);
    rowLab.querySelectorAll<SVGTextElement>('[data-row="1"]').forEach((el) => (el.style.opacity = p.row2 ? "1" : "0"));
    if (t) {
      const bad = g.svg.querySelectorAll(".mk-h.c-bad, .mk-p.c-bad, .mk-h.c-hl, .mk-p.c-hl");
      if (bad.length) t.fromTo(bad, { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.25, clearProps: "opacity" }, d + 0.2);
    }
  },
};
