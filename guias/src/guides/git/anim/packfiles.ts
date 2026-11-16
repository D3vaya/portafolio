/*
  Animación: objetos sueltos y packfiles. Cada objeto es un archivo comprimido con zlib; las
  versiones parecidas ocupan casi lo mismo varias veces. git gc los junta en un .pack + .idx con
  deltas (una versión completa y diferencias), el tamaño baja, y fetch/push viajan en packfiles.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import { consola, cerrar } from "./_kit";
import "./packfiles.css";

const LOOSE: [string, string, boolean?][] = [
  ["3f/9a2c1…", "commit"], ["7e/1c0a9…", "árbol"], ["a4/91c3e…", "app.js v1", true],
  ["8c/41d0e…", "commit"], ["d2/07b3a…", "árbol"], ["5b/e02f7…", "app.js v2", true],
  ["c9/3d8a1…", "index.html"], ["0f/6b2d4…", "app.js v3", true], ["e5/a7c90…", "estilos.css"],
  ["61/f0e3b…", "app.js v4", true], ["b2/8d14f…", "commit"], ["9e/c5a07…", "logo.svg"],
];

type St = {
  loose: boolean; vers?: boolean; pack: boolean; delta?: boolean;
  size: number; sizeTxt: string; net?: boolean; maint?: boolean; cmd: string; out?: string;
};
const PASOS: St[] = [
  { loose: true, pack: false, size: 100, sizeTxt: "4,2 MB", cmd: "git count-objects -vH", out: "count: 1248\nsize: 4.20 MiB\nin-pack: 0\npacks: 0" },
  { loose: true, vers: true, pack: false, size: 100, sizeTxt: "4,2 MB", cmd: "git log --oneline -- app.js", out: "61f0e3b ajusta el carrito\n0f6b2d4 agrega descuentos\n5be02f7 corrige total\na491c3e crea app.js" },
  {
    loose: false, pack: true, size: 100, sizeTxt: "4,2 MB", cmd: "git gc",
    out: "Enumerating objects: 1248, done.\nCompressing objects: 100% (1190/1190), done.\nWriting objects: 100% (1248/1248), done.\nTotal 1248 (delta 512), reused 0 (delta 0), pack-reused 0",
  },
  { loose: false, pack: true, delta: true, size: 100, sizeTxt: "4,2 MB", cmd: "git verify-pack -v .git/objects/pack/pack-4b1e9c0.idx", out: "61f0e3b blob 12288 3104 12\n0f6b2d4 blob 12001 310 3116 1 61f0e3b\n5be02f7 blob 11950 280 3426 2 0f6b2d4" },
  { loose: false, pack: true, delta: true, size: 26, sizeTxt: "1,1 MB", cmd: "git count-objects -vH", out: '<span class="ok">count: 0\nsize: 0 bytes\nin-pack: 1248\npacks: 1\nsize-pack: 1.10 MiB</span>' },
  { loose: false, pack: true, delta: true, size: 26, sizeTxt: "1,1 MB", net: true, cmd: "git push", out: "Compressing objects: 100% (3/3), done.\nWriting objects: 100% (3/3), 412 bytes | 412.00 KiB/s, done.\nTo github.com:ana/tienda.git\n   61f0e3b..c47b9d3  main -> main" },
  { loose: false, pack: true, delta: true, size: 26, sizeTxt: "1,1 MB", maint: true, cmd: "git maintenance start" },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
let term: ReturnType<typeof consola>;

export const packfiles: Escena = {
  title: "De miles de archivos sueltos a un packfile",
  steps: [
    { title: "Cada objeto, un archivo", text: "Al principio cada commit, árbol y contenido es un archivo suelto en <code>objects/</code>, comprimido con zlib. <code>git count-objects -vH</code> te dice cuántos son y cuánto pesan.", ms: 7500 },
    { title: "Versiones casi iguales, guardadas enteras", text: "Cuatro versiones de <code>app.js</code> que cambian unas líneas son cuatro objetos completos. Git guarda fotos, no diferencias, y eso repite mucho.", ms: 7500 },
    { title: "git gc empaqueta", text: "<code>git gc</code> junta los objetos sueltos en un packfile: un <code>.pack</code> con los datos y un <code>.idx</code> para encontrar cada objeto rápido. Git también lo hace solo de vez en cuando.", ms: 8000 },
    { title: "Una completa y diferencias", text: "Dentro del pack, las versiones parecidas se guardan como deltas: una completa y las demás como diferencias. Normalmente la completa es la más reciente, la que más usas.", ms: 8500 },
    { title: "Mucho menos espacio", text: "Mismos 1248 objetos, ahora en un solo pack. Las cifras son ilustrativas, pero en repos reales la reducción suele ser grande.", ms: 7000 },
    { title: "La red también viaja en packs", text: "<code>git push</code> y <code>git fetch</code> no mandan archivos sueltos: arman un packfile con solo los objetos que el otro lado no tiene.", ms: 7500 },
    { title: "Mantenimiento en segundo plano", text: "<code>git maintenance start</code> registra el repo y programa tareas periódicas (cada hora, día y semana) que empaquetan y optimizan sin que lo pienses.", ms: 7500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("pk");
    term = consola(stage);
    const board = document.createElement("div");
    board.className = "pk-board";
    board.innerHTML = `
      <section class="pk-box pk-objs"><b class="pk-t">.git/objects/</b>
        <div class="pk-grid">${LOOSE.map(([h, k, v]) => `<span class="pk-o${v ? " is-v" : ""}"><b>${h}</b><i>${k}</i></span>`).join("")}</div>
        <span class="pk-more">+ 1236 objetos sueltos más</span>
      </section>
      <section class="pk-box pk-packbox"><b class="pk-t">.git/objects/pack/</b>
        <div class="pk-files"><span class="gk-file f-hl">pack-4b1e9c0.pack</span><span class="gk-file">pack-4b1e9c0.idx</span></div>
        <ul class="pk-delta">
          <li class="is-full"><b>app.js v4</b><span>completa</span><em style="--w:100%"></em></li>
          <li><b>app.js v3</b><span>Δ diferencias</span><em style="--w:12%"></em></li>
          <li><b>app.js v2</b><span>Δ diferencias</span><em style="--w:10%"></em></li>
          <li><b>app.js v1</b><span>Δ diferencias</span><em style="--w:14%"></em></li>
        </ul>
        <span class="pk-empty">vacía</span>
      </section>
      <div class="pk-net"><span>tu repo</span><div class="pk-track"><i class="pk-mini">.pack</i></div><span>origin</span></div>
      <div class="pk-maint"><span>cada hora</span><span>cada día</span><span>cada semana</span></div>
      <div class="pk-size"><span class="pk-sl">Tamaño de objects/ <small>(cifras ilustrativas)</small></span><div class="pk-bar"><i></i></div><b class="pk-sv"></b></div>`;
    stage.appendChild(board);
    const leg = document.createElement("div");
    leg.className = "gk-legend";
    leg.innerHTML = `<span><i></i>objeto suelto</span><span><i class="l-mod"></i>versión de app.js</span><span><i class="l-new"></i>packfile</span><span><i class="l-ok"></i>versión completa</span>`;
    stage.appendChild(leg);
  },

  go(i, instant) {
    cerrar(root, tl);
    const s = PASOS[i];
    const t = (tl = instant ? null : gsap.timeline());
    const d = term.show(s.cmd, t, 0, s.out || "");
    const q = (sel: string) => root.querySelector(sel) as HTMLElement;
    const objs = q(".pk-objs"), pack = q(".pk-packbox"), bar = q(".pk-bar i"), net = q(".pk-net"), maint = q(".pk-maint");
    const wasLoose = !root.classList.contains("no-loose");
    const wasDelta = root.classList.contains("has-delta");
    const wasNet = root.classList.contains("has-net");
    const wasMaint = root.classList.contains("has-maint");
    const prevSize = parseFloat(bar.style.width) || 100;

    const apply = () => {
      root.classList.toggle("no-loose", !s.loose);
      root.classList.toggle("has-pack", s.pack);
      root.classList.toggle("has-vers", !!s.vers);
      root.classList.toggle("has-delta", !!s.delta);
      root.classList.toggle("has-net", !!s.net);
      root.classList.toggle("has-maint", !!s.maint);
      q(".pk-sv").textContent = s.sizeTxt;
    };
    q(".pk-sv").classList.toggle("is-small", s.size < 100);
    if (!t) { apply(); bar.style.width = s.size + "%"; return; }

    // gc: los objetos sueltos viajan al pack
    if (wasLoose && !s.loose) {
      const a = pack.getBoundingClientRect();
      const chips = objs.querySelectorAll<HTMLElement>(".pk-o");
      chips.forEach((o, k) => {
        const b = o.getBoundingClientRect();
        t.to(o, { x: a.left + 30 - b.left, y: a.top + 40 - b.top, scale: 0.4, opacity: 0, duration: 0.7, ease: "power3.in" }, d + k * 0.04);
      });
      t.call(() => { apply(); chips.forEach((o) => gsap.set(o, { clearProps: "all" })); }, [], d + 1.3);
      t.fromTo(pack.querySelector(".pk-files"), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(2)", clearProps: "all" }, d + 1.3);
    } else {
      apply();
    }
    if (s.delta && !wasDelta) t.fromTo(pack.querySelectorAll(".pk-delta li"), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.18, ease: "power3.out", clearProps: "all" }, d);
    t.fromTo(bar, { width: prevSize + "%" }, { width: s.size + "%", duration: 1.1, ease: "power3.inOut" }, d);
    if (s.net && !wasNet) {
      const mini = net.querySelector(".pk-mini") as HTMLElement, track = net.querySelector(".pk-track") as HTMLElement;
      t.fromTo(net, { opacity: 0 }, { opacity: 1, duration: 0.3, clearProps: "opacity" }, d);
      t.fromTo(mini, { x: () => mini.offsetWidth - track.clientWidth }, { x: 0, duration: 1.2, ease: "power2.inOut", clearProps: "transform" }, d + 0.3);
    }
    if (s.maint && !wasMaint) t.fromTo(maint.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.2, duration: 0.4, ease: "back.out(2)", clearProps: "all" }, d);
  },
};
