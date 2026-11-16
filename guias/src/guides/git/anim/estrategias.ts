/*
  Animación: estrategias de ramas en equipo. Tres grafos compactos, dos pasos cada uno:
  trunk-based (ramas de horas y feature flags), GitHub flow (rama por cambio + PR, main siempre
  desplegable) y Git flow (develop, release/*, hotfix/*, main con tags). Cierra con cómo elegir.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { grafo, consola, cerrar, c, type Grafo } from "./_kit";
import "./estrategias.css";

type G = ReturnType<typeof grafo>;
type Paso = { w: 0 | 1 | 2 | 3; g?: Grafo; flag?: boolean; cmd: string; out?: string };

// trunk-based
const tA = c("A", 0, 0), tX = c("x", 0.9, 1, "A", { msg: "3 h" }), tM1 = c("M1", 1.8, 0, ["A", "x"], { label: "B" });
const tY = c("y", 2.7, 1, "M1", { msg: "2 h" }), tM2 = c("M2", 3.6, 0, ["M1", "y"], { label: "C", tone: "new" });
// GitHub flow
const hA = c("A", 0, 0), hB = c("B", 0.9, 0, "A"), hP1 = c("p1", 1.8, 1, "B", { label: "D" }), hP2 = c("p2", 2.7, 1, "p1", { label: "E", msg: "PR #42" });
const hM = c("M", 3.6, 0, ["B", "p2"], { tone: "new", msg: "desplegado" });
// Git flow: carril 0 main, 1 release/hotfix, 2 develop
const fA = c("A", 0, 0), fD1 = c("d1", 0.82, 2, "A", { label: "D" }), fR = c("r", 1.64, 1, "d1", { label: "R", msg: "release/1.1" });
const fM2 = c("M2", 2.46, 0, ["A", "r"], { label: "M" }), fD2 = c("d2", 2.46, 2, ["d1", "r"], { label: "E" });
const fH = c("h", 3.28, 1, "M2", { label: "H", msg: "hotfix/1.1.1", tone: "new" });
const fM3 = c("M3", 4.1, 0, ["M2", "h"], { label: "N", tone: "new" }), fD3 = c("d3", 4.1, 2, ["d2", "h"], { label: "F", tone: "new" });

const PASOS: Paso[] = [
  { w: 0, cmd: "git switch -c menu", g: { nodes: [tA, tX, tM1, tY], refs: [{ name: "main", at: "M1" }, { name: "menu", at: "y", side: "down" }], head: "menu" } },
  {
    w: 0, flag: true, cmd: "git switch main && git merge menu", out: "Merge made by the 'ort' strategy.",
    g: { nodes: [tA, tX, tM1, tY, tM2], refs: [{ name: "main", at: "M2" }], head: "main" },
  },
  {
    w: 1, cmd: "git push -u origin feature/pago", out: "remote: Create a pull request for 'feature/pago' on GitHub by visiting: …",
    g: { nodes: [hA, hB, hP1, hP2], refs: [{ name: "main", at: "B" }, { name: "feature/pago", at: "p2", side: "down" }], head: "feature/pago" },
  },
  {
    w: 1, cmd: "gh pr merge 42 --merge --delete-branch", out: '<span class="ok">✓ Merged pull request ana/tienda#42 (agrega pago)\n✓ Deleted local branch feature/pago and switched to branch main\n✓ Deleted remote branch feature/pago</span>',
    g: { nodes: [hA, hB, hP1, hP2, hM], refs: [{ name: "main", at: "M" }], head: "main" },
  },
  {
    w: 2, cmd: "git merge --no-ff release/1.1 && git tag v1.1",
    g: { nodes: [fA, fD1, fR, fM2, fD2], refs: [{ name: "v1.0", at: "A", kind: "tag" }, { name: "main", at: "M2" }, { name: "v1.1", at: "M2", kind: "tag" }, { name: "develop", at: "d2" }] },
  },
  {
    w: 2, cmd: "git switch -c hotfix/1.1.1 main", out: "Switched to a new branch 'hotfix/1.1.1'",
    g: {
      nodes: [fA, fD1, fR, { ...fM2, tone: undefined }, fD2, fH, fM3, fD3],
      refs: [{ name: "v1.0", at: "A", kind: "tag" }, { name: "v1.1", at: "M2", kind: "tag" }, { name: "main", at: "M3" }, { name: "v1.1.1", at: "M3", kind: "tag" }, { name: "develop", at: "d3" }],
    },
  },
  { w: 3, cmd: "" },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;
const gs: G[] = [];

export const estrategias: Escena = {
  title: "Tres formas de organizar ramas",
  steps: [
    { title: "Trunk-based: ramas de horas", text: "Todos integran a <code>main</code> (el tronco) al menos una vez al día. Las ramas, si existen, duran horas y tienen pocos commits.", ms: 7000 },
    { title: "Lo incompleto, detrás de un flag", text: "<code>menu</code> entra a <code>main</code> aunque no esté terminada: un feature flag la mantiene apagada en producción. Pide buenos tests y CI rápida.", ms: 8000 },
    { title: "GitHub flow: una rama por cambio", text: "<code>main</code> siempre se puede desplegar. Cada cambio va en su rama y se sube para abrir un pull request, donde se revisa y pasan los checks.", ms: 7500 },
    { title: "Merge del PR y despliegue", text: "Al aprobar el PR se hace merge a <code>main</code>, se borra la rama y se despliega. Simple y suficiente para la mayoría de los equipos web.", ms: 7500 },
    { title: "Git flow: develop y release", text: "El trabajo diario va a <code>develop</code>. Para publicar, una rama <code>release/*</code> se estabiliza y entra a <code>main</code> con un tag de versión.", ms: 8000 },
    { title: "Git flow: hotfix desde main", text: "Un <code>hotfix/*</code> sale de <code>main</code>, se corrige, recibe su tag y vuelve a <code>main</code> y a <code>develop</code>. Más ceremonia, útil si mantienes varias versiones.", ms: 8500 },
    { title: "Cómo elegir", text: "Mira cada cuánto despliegas y cuántas versiones mantienes. Si despliegas seguido, trunk-based o GitHub flow; Git flow, solo si publicas versiones con soporte largo.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("es");
    term = consola(stage);
    const names = ["Trunk-based", "GitHub flow", "Git flow"];
    const dims = [{ cols: 4.9, rows: 2 }, { cols: 4.9, rows: 2 }, { cols: 5.1, rows: 3 }];
    names.forEach((n, k) => {
      const box = document.createElement("div");
      box.className = "es-g";
      box.dataset.w = String(k);
      box.innerHTML = `<span class="es-name">${n}</span>`;
      stage.appendChild(box);
      gs[k] = grafo(box, dims[k]);
    });
    const flag = document.createElement("div");
    flag.className = "es-flag";
    flag.innerHTML = `<span class="es-sw"><i></i></span><span class="es-ft">flag menu_nuevo: apagado en producción</span>`;
    stage.querySelector('.es-g[data-w="0"]')!.appendChild(flag);
    const cmp = document.createElement("div");
    cmp.className = "es-cmp";
    cmp.dataset.w = "3";
    cmp.innerHTML = [
      ["Trunk-based", "duran horas, si existen", "despliegas varias veces al día", "equipos con CI sólida y feature flags"],
      ["GitHub flow", "una rama + PR por cambio", "despliegas cuando se aprueba", "la mayoría de equipos y proyectos web"],
      ["Git flow", "develop, release y hotfix", "publicas versiones planificadas", "apps instaladas o librerías con varias versiones vivas"],
    ].map(([n, a, b, c2]) => `<section><b>${n}</b><span><i>ramas</i>${a}</span><span><i>despliegue</i>${b}</span><span><i>encaja con</i>${c2}</span></section>`).join("");
    stage.appendChild(cmp);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-branch"></i>otra rama</span><span><i class="es-l-tag"></i>tag de versión</span><span><i class="l-new"></i>commit nuevo</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(p.cmd, t, 0, p.out || "");
    const prevW = root.dataset.w;
    root.dataset.w = String(p.w);
    root.classList.toggle("has-flag", !!p.flag);
    const box = root.querySelector(`[data-w="${p.w}"]`) as HTMLElement;
    if (t && prevW !== String(p.w)) t.fromTo(box, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "all" }, 0);
    if (p.g) {
      const g = gs[p.w];
      // al entrar a un grafo desde otro, arranca vacío para que se vea crecer
      if (t && prevW !== String(p.w)) g.render({ nodes: [] }, null);
      g.render(p.g, t, t ? d : 0);
    }
    if (t && p.flag) t.fromTo(root.querySelector(".es-flag"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.45, clearProps: "all" }, d + 0.9);
    if (t && p.w === 3) t.fromTo(root.querySelectorAll(".es-cmp section"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.18, duration: 0.45, ease: "power3.out", clearProps: "all" }, 0.1);
  },
};
