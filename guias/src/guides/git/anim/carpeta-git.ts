/*
  Animación: la carpeta .git por dentro. Un árbol que se va abriendo (HEAD, refs, objects, config,
  index, logs, hooks) mientras la consola muestra el contenido real de cada archivo. La idea: todo
  Git son archivos, y una rama es un archivo con un hash.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import "./carpeta-git.css";

type It = { k: string; d: number; name: string; dir?: boolean; note?: string };
const ITEMS: It[] = [
  { k: "head", d: 0, name: "HEAD", note: "a qué rama apuntas" },
  { k: "config", d: 0, name: "config", note: "ajustes de este repo" },
  { k: "objects", d: 0, name: "objects/", dir: true, note: "commits, árboles y contenidos" },
  { k: "o3f", d: 1, name: "3f/", dir: true, note: "2 primeros caracteres" },
  { k: "o9a", d: 2, name: "9a2c1e8b07d4…", note: "los otros 38, en zlib" },
  { k: "refs", d: 0, name: "refs/", dir: true, note: "ramas y tags" },
  { k: "heads", d: 1, name: "heads/", dir: true },
  { k: "main", d: 2, name: "main", note: "un hash de 40 caracteres" },
  { k: "nueva", d: 2, name: "nueva", note: "otro archivo, mismo hash" },
  { k: "remote", d: 1, name: "remotes/origin/main", note: "lo último visto en origin" },
  { k: "tag", d: 1, name: "tags/v1.0" },
  { k: "index", d: 0, name: "index", note: "binario: el staging" },
  { k: "logs", d: 0, name: "logs/", dir: true, note: "el reflog" },
  { k: "hooks", d: 0, name: "hooks/", dir: true, note: "scripts por evento" },
  { k: "reftable", d: 0, name: "reftable/", dir: true, note: "con reftable, en vez de refs/" },
];

const HASH = "3f9a2c1e8b07d4a65c2f19e0b7a4d3c8e1f60b29";
const TOP = ["head", "config", "objects", "refs", "index", "logs", "hooks"];
const REFS = ["heads", "main", "remote", "tag"];
const OBJ = ["o3f", "o9a"];

type St = { vis: string[]; hl?: string[]; nw?: string[]; ghost?: string[]; cmd: string; out?: string };
const PASOS: St[] = [
  { vis: TOP, cmd: "ls .git", out: "HEAD  config  description  hooks  index  info  logs  objects  refs" },
  { vis: TOP, hl: ["head"], cmd: "cat .git/HEAD", out: '<span class="hl">ref: refs/heads/main</span>' },
  { vis: [...TOP, ...REFS], hl: ["main"], cmd: "cat .git/refs/heads/main", out: `<span class="hl">${HASH}</span>` },
  { vis: [...TOP, ...REFS, ...OBJ], hl: ["o9a"], cmd: "git cat-file -t 3f9a2c1", out: '<span class="hl">commit</span>' },
  {
    vis: [...TOP, ...REFS, ...OBJ], hl: ["config"], cmd: "cat .git/config",
    out: '[core]\n\tbare = false\n[remote "origin"]\n\turl = git@github.com:ana/tienda.git\n[branch "main"]\n\tremote = origin',
  },
  {
    vis: [...TOP, ...REFS, ...OBJ], hl: ["index", "logs", "hooks"], cmd: "git reflog -2",
    out: "3f9a2c1 HEAD@{0}: commit: agrega login\n8c41d0e HEAD@{1}: checkout: moving from feature to main",
  },
  {
    vis: [...TOP, ...REFS, ...OBJ, "nueva", "reftable"], nw: ["nueva"], ghost: ["reftable"],
    cmd: "git branch nueva && cat .git/refs/heads/nueva", out: `<span class="ok">${HASH}</span>`,
  },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

export const carpetaGit: Escena = {
  title: "Todo Git son archivos dentro de .git",
  steps: [
    { title: "Todo vive en .git", text: "Tu repositorio entero está en la carpeta oculta <code>.git</code>: historia, ramas y configuración. Si la borras, tus archivos quedan, pero Git olvida todo.", ms: 7000 },
    { title: "HEAD: dónde estás", text: "<code>HEAD</code> es un archivo de texto con una línea: la rama actual. Cambiar de rama reescribe esta línea.", ms: 6500 },
    { title: "Una rama es un archivo", text: "<code>refs/heads/main</code> guarda solo el hash del último commit de <code>main</code>. Las remotas y los tags son archivos iguales en <code>refs/</code>.", ms: 7500 },
    { title: "Objetos con nombre de hash", text: "El commit <code>3f9a2c1</code> vive en <code>objects/3f/</code>: la carpeta son los 2 primeros caracteres del hash y el archivo, los otros 38, comprimido con zlib.", ms: 8000 },
    { title: "config: ajustes del repo", text: "<code>.git/config</code> guarda los remotos, qué rama sigue a cuál y lo que configures con <code>git config</code> sin <code>--global</code>.", ms: 7000 },
    { title: "index, logs y hooks", text: "<code>index</code> es el staging, en binario. <code>logs/</code> es el reflog: cada movimiento de HEAD y de las ramas. <code>hooks/</code> guarda scripts que corren en ciertos eventos.", ms: 8500 },
    { title: "Crear una rama: un archivo nuevo", text: "<code>git branch nueva</code> escribe un archivo con el mismo hash. Con el backend reftable (opcional hoy, por defecto en Git 3.0) las refs van en <code>.git/reftable/</code>.", ms: 9000 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("cg");
    term = consola(stage);
    const tree = document.createElement("div");
    tree.className = "cg-tree";
    tree.innerHTML = `<div class="cg-root">tienda/.git/</div><ul>${ITEMS.map(
      (it) => `<li data-k="${it.k}" data-d="${it.d}"><span class="gk-file${it.dir ? " cg-dir" : ""}">${it.name}</span>${it.note ? `<em>${it.note}</em>` : ""}</li>`,
    ).join("")}</ul>`;
    stage.appendChild(tree);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i class="cg-l-hl"></i>lo que lee la consola</span><span><i class="l-ok"></i>archivo nuevo</span><span><i class="l-ghost"></i>solo con reftable</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const s = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(s.cmd, t, 0, s.out || "");
    const fresh: HTMLElement[] = [];
    const apply = () => {
      ITEMS.forEach((it) => {
        const li = root.querySelector(`[data-k="${it.k}"]`) as HTMLElement;
        const on = s.vis.includes(it.k);
        if (on && !li.classList.contains("on")) fresh.push(li);
        li.classList.toggle("on", on);
        li.classList.toggle("hl", !!s.hl?.includes(it.k));
        const f = li.querySelector(".gk-file")!;
        f.classList.toggle("f-hl", !!s.hl?.includes(it.k));
        f.classList.toggle("f-new", !!s.nw?.includes(it.k));
        li.classList.toggle("ghost", !!s.ghost?.includes(it.k));
      });
    };
    apply();
    if (!t) return;
    fresh.forEach((li, k) => t.fromTo(li, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out", clearProps: "opacity,transform" }, d * 0.5 + k * 0.08));
    root.querySelectorAll<HTMLElement>("li.hl .gk-file").forEach((f) =>
      t.fromTo(f, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: "back.out(2)", clearProps: "transform" }, d),
    );
  },
};
