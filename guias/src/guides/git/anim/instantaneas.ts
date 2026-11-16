/*
  Animación: qué problema resuelve Git. Una carpeta llena de copias (informe_final_DEFINITIVO…) se
  reemplaza por un solo archivo y una línea de tiempo de commits con mensaje, autor y fecha. Se
  puede volver a cualquier punto y regresar al presente. Cierre: Git es local; GitHub y GitLab son
  lugares donde compartir el repositorio.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import { foto, mover, limpiar } from "./_basico";
import "./instantaneas.css";

const COPIAS = ["informe.docx", "informe_v2.docx", "informe_final.docx", "informe_final_DEFINITIVO.docx", "informe_final_ahora_si.docx"];
const COMMITS = [
  { id: "A", hash: "a1c3e9f", msg: "crea el informe", who: "Ana · 3 mar" },
  { id: "B", hash: "5e0a8f3", msg: "agrega conclusiones", who: "Luis · 5 mar" },
  { id: "C", hash: "c7d21b4", msg: "corrige cifras de marzo", who: "Ana · 9 mar" },
];
// contenido del archivo en cada commit
const VERSION: Record<string, { ventas: string; concl?: string }> = {
  A: { ventas: "1.420" },
  B: { ventas: "1.420", concl: "crecimos 8 %" },
  C: { ventas: "1.240", concl: "crecimos 8 %" },
};

type Paso = { cmd: string; out?: string; copias?: boolean; n?: number; en?: string; det?: boolean; cierre?: boolean; nuevo?: string };
const PASOS: Paso[] = [
  { cmd: "ls | wc -l", out: "5", copias: true },
  { cmd: 'git commit -m "crea el informe"', out: "[main (root-commit) a1c3e9f] crea el informe\n create mode 100644 informe.docx", n: 1, en: "A", nuevo: "A" },
  { cmd: "git log --oneline", out: '<span class="warn">c7d21b4</span> (<span class="hl">HEAD -> main</span>) corrige cifras de marzo\n<span class="warn">5e0a8f3</span> agrega conclusiones\n<span class="warn">a1c3e9f</span> crea el informe', n: 3, en: "C", nuevo: "BC" },
  { cmd: "git switch --detach 5e0a8f3", out: "HEAD is now at 5e0a8f3 agrega conclusiones", n: 3, en: "B", det: true },
  { cmd: "git switch main", out: "Previous HEAD position was 5e0a8f3 agrega conclusiones\nSwitched to branch 'main'", n: 3, en: "C" },
  { cmd: "", n: 3, en: "C", cierre: true },
];

let root: HTMLElement;
let board: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

function html(p: Paso) {
  if (p.copias) {
    return `
      <section class="in-folder" data-k="folder">
        <header class="in-h"><b>informe/</b><span>5 archivos</span></header>
        <div class="in-copias">${COPIAS.map((f, k) => `<span class="gk-file" data-k="cp${k}">${f}</span>`).join("")}</div>
      </section>
      <p class="bx-note is-warn in-duda" data-k="duda"><b>¿Qué cambió entre estas? ¿Cuál es la buena?</b><br>Nadie lo sabe sin abrirlas una por una.</p>`;
  }
  const v = VERSION[p.en!];
  const vis = COMMITS.slice(0, p.n);
  const items = vis.map((c, k) => {
    let ref = "";
    if (p.det) ref = c.id === "B" ? `<span class="bx-ref is-det" data-k="head">HEAD</span>` : c.id === "C" ? `<span class="bx-ref" data-k="main">main</span>` : "";
    else if (k === vis.length - 1) ref = `<span class="bx-ref is-head" data-k="main">HEAD → main</span>`;
    const nuevo = p.nuevo?.includes(c.id);
    return `
      <div class="in-cm${c.id === p.en ? " is-here" : ""}"${nuevo ? ` data-d="${(k - (p.nuevo!.length === 2 ? 1 : 0)) * 0.45}"` : ""} data-k="cm${c.id}">
        <span class="in-ref">${ref}</span>
        <i class="bx-commit${nuevo ? " t-new" : ""}">${c.id}</i>
        <span class="in-msg">${c.msg}</span>
        <span class="in-who">${c.who}</span>
        <span class="in-hash">${c.hash}</span>
      </div>`;
  }).join("");
  const cierre = p.cierre ? `
    <div class="in-cierre" data-k="cierre">
      <p class="bx-note is-ok"><b>✓ Todo está en tu computador.</b> El historial vive en la carpeta oculta <span class="mo">.git</span>: funciona sin internet y sin servidor, por eso es rápido.</p>
      <p class="in-remote"><b>GitHub / GitLab</b>Son solo lugares donde guardar una copia del repositorio para compartirla (<span class="mo">git push</span>, <span class="mo">git pull</span>). Opcionales.</p>
    </div>` : "";
  return `
    <section class="in-doc" data-k="doc">
      <header class="in-h"><b>informe.docx</b><span>versión del commit ${p.en}</span></header>
      <div class="in-paper">
        <b>Informe trimestral</b>
        <span data-k="l-ventas" data-sig="${v.ventas}">Ventas de marzo: <em>${v.ventas}</em></span>
        ${v.concl ? `<span data-k="l-concl">Conclusiones: ${v.concl}</span>` : ""}
      </div>
    </section>
    <section class="in-hist" data-k="hist">
      <header class="in-h"><b>Historial</b><span>un commit = una foto con mensaje, autor y fecha</span></header>
      <div class="in-line">${items}</div>
    </section>
    ${cierre}`;
}

export const instantaneas: Escena = {
  title: "De mil copias a un historial",
  steps: [
    { title: "La carpeta de las copias", text: "Sin control de versiones, cada cambio importante es una copia nueva. Pronto nadie sabe qué cambió entre una y otra ni cuál es la buena.", ms: 7500 },
    { title: "Un archivo y una foto", text: "Con Git tienes un solo <code>informe.docx</code>. Cuando quieres guardar un punto, haces un <b>commit</b>: una foto del proyecto con un mensaje, tu nombre y la fecha.", ms: 8000 },
    { title: "La historia se escribe sola", text: "Cada commit nuevo se suma a la línea de tiempo. Sabes quién cambió qué, cuándo y por qué, sin abrir ningún archivo.", ms: 7500 },
    { title: "Vuelve a cualquier punto", text: "<code>git switch --detach</code> lleva la marca HEAD (ámbar) al commit B y el archivo vuelve a esa versión: las ventas dicen 1.420 otra vez. Nada se borra.", ms: 8500 },
    { title: "Y regresa al presente", text: "<code>git switch main</code> devuelve HEAD a la rama y el archivo a su última versión, con la cifra corregida.", ms: 7000 },
    { title: "Local, rápido y sin servidor", text: "Git funciona en tu computador, sin conexión. GitHub y GitLab no son Git: son sitios donde compartes una copia del repositorio con tu equipo.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("in");
    term = consola(stage);
    board = document.createElement("div");
    board.className = "in-board";
    stage.appendChild(board);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="l-new"></i>commit nuevo</span><span><i class="l-head"></i>HEAD → rama actual</span><span><i class="l-det"></i>HEAD en un commit (separado)</span><span><i class="l-branch l-sq"></i>otra rama</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    limpiar(board);
    const p = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const antes = foto(board);
    board.innerHTML = html(p);
    board.classList.toggle("is-copias", !!p.copias);
    const d = term.show(p.cmd, t, 0, p.out || "");
    mover(board, antes, t, d);
  },
};
