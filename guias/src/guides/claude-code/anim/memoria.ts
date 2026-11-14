/*
  Animación: jerarquía de memoria. A la izquierda, dónde viven los CLAUDE.md; a la derecha, el
  contexto de Claude. Al lanzar en mi-app/ se apilan (concatenados, de lo más amplio a lo más
  específico); un @import se expande en su lugar; una rule con `paths` entra solo cuando Claude toca
  un archivo que calza, y el CLAUDE.md de una subcarpeta, solo cuando Claude toca archivos ahí.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./memoria.css";

type Id = "org" | "user" | "proj" | "imp" | "local" | "rule" | "sub";
type Estado = {
  launched: boolean;
  loaded: Id[];
  active: Id[]; // lo que entra en este paso, en orden
  touch?: "boton" | "users";
  glob?: number; // índice del glob de paths que calza
  sum?: boolean;
};

const ESTADOS: Estado[] = [
  { launched: false, loaded: [], active: [] },
  { launched: true, loaded: ["org", "user"], active: ["org", "user"] },
  { launched: true, loaded: ["org", "user", "proj", "local"], active: ["proj", "local"] },
  { launched: true, loaded: ["org", "user", "proj", "imp", "local"], active: ["imp"] },
  { launched: true, loaded: ["org", "user", "proj", "imp", "local", "rule"], active: ["rule"], touch: "boton", glob: 1 },
  { launched: true, loaded: ["org", "user", "proj", "imp", "local", "rule", "sub"], active: ["sub"], touch: "users" },
  { launched: true, loaded: ["org", "user", "proj", "imp", "local", "rule", "sub"], active: [], sum: true },
];

// Bloques del contexto: alcance, ruta y cuándo se cargan (según la lección).
const CTX: Record<Id, { scope: string; path: string; when: string }> = {
  org: { scope: "Organización", path: "/Library/Application Support/ClaudeCode/CLAUDE.md", when: "al inicio" },
  user: { scope: "Usuario", path: "~/.claude/CLAUDE.md", when: "al inicio" },
  proj: { scope: "Proyecto", path: "./CLAUDE.md", when: "al inicio" },
  imp: { scope: "Import", path: "docs/git.md", when: "con quien lo importa" },
  local: { scope: "Local", path: "./CLAUDE.local.md", when: "al inicio" },
  rule: { scope: "Rule con paths", path: ".claude/rules/api.md", when: "bajo demanda" },
  sub: { scope: "Subcarpeta", path: "src/app/api/CLAUDE.md", when: "bajo demanda" },
};
const ORDER: Id[] = ["org", "user", "proj", "local", "rule", "sub"]; // imp va dentro de proj

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;

const row = (k: string, lvl: number, name: string, extra = "", dir = false) =>
  `<div class="me-row l${lvl}${dir ? " is-dir" : ""}" data-k="${k}">
     <svg viewBox="0 0 16 16" aria-hidden="true">${dir
       ? `<path d="M1.5 4.5v8h13v-6.5h-6.5l-1.5-1.5z"/>`
       : `<path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M9.5 1.5v3h3"/>`}</svg>
     <span class="me-n">${name}</span>${extra}</div>`;
const tag = (s: string) => `<span class="me-tag">${s}</span>`;

export const memoria: Escena = {
  title: "Cómo se apilan los CLAUDE.md en el contexto",
  steps: [
    { title: "Varios CLAUDE.md, un contexto", text: "CLAUDE.md puede vivir en varios lugares: el de tu organización, el tuyo, el del proyecto y los de subcarpetas. A la derecha, lo que Claude tiene en contexto: por ahora, nada.", ms: 7000 },
    { title: "Lanzas claude en mi-app/", text: "Entra primero lo más amplio: la política gestionada de la organización (en macOS, en <code>/Library/Application Support/ClaudeCode/</code>) y luego tu <code>~/.claude/CLAUDE.md</code>, que aplica a todos tus proyectos.", ms: 8000 },
    { title: "Después, el proyecto", text: "Siguen <code>./CLAUDE.md</code>, compartido con el equipo vía git, y <code>./CLAUDE.local.md</code>, solo tuyo. Nada se sobrescribe: todo se <b>concatena</b>, de lo más amplio a lo más específico.", ms: 8000 },
    { title: "Un @import se expande ahí mismo", text: "El CLAUDE.md del proyecto menciona <code>@docs/git.md</code>, y Claude Code inserta ese archivo en ese lugar. Ordena mejor, pero <b>no reduce</b> el costo de contexto: el texto entra igual.", ms: 8000 },
    { title: "Una rule entra por su ruta", text: "<code>.claude/rules/api.md</code> tiene <code>paths</code>, así que esperaba. Claude edita <code>src/components/Boton.tsx</code>, que calza con <code>src/**/*.{ts,tsx}</code>, y recién ahora la rule entra al contexto.", ms: 8500 },
    { title: "La subcarpeta, bajo demanda", text: "Claude lee <code>src/app/api/users.ts</code>. El <code>CLAUDE.md</code> de <code>src/app/api/</code> no se cargó al lanzar: entra ahora, porque Claude tocó archivos en esa carpeta.", ms: 8000 },
    { title: "Lo que carga tarde, ahorra", text: "Siete archivos, en orden de carga. Lo que espera a que Claude toque una ruta (rules con <code>paths</code>, subcarpetas) ahorra contexto mientras no hace falta; los imports solo ordenan.", ms: 8500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("me");
    const blk = (k: Id, inner = "") => `
      <div class="me-blk" data-k="${k}">
        <div class="me-bh"><b>${CTX[k].scope}</b><span class="me-when">${CTX[k].when}</span></div>
        <span class="mo me-bp">${CTX[k].path}</span>${inner}
      </div>`;
    stage.innerHTML = `
      <div class="me-cols">
        <div class="me-tree">
          <span class="me-cap">Dónde viven</span>
          ${row("d-org", 0, "/Library/Application Support/ClaudeCode/", "", true)}
          ${row("org", 1, "CLAUDE.md", tag("organización"))}
          ${row("d-user", 0, "~/.claude/", "", true)}
          ${row("user", 1, "CLAUDE.md", tag("usuario"))}
          ${row("d-proj", 0, "mi-app/", `<span class="me-launch">$ claude</span>`, true)}
          ${row("proj", 1, "CLAUDE.md", tag("proyecto") + `<span class="me-note">menciona <span class="mo">@docs/git.md</span></span>`)}
          ${row("local", 1, "CLAUDE.local.md", tag("local"))}
          ${row("imp", 1, "docs/git.md")}
          ${row("rule", 1, ".claude/rules/api.md", `<span class="me-note">paths: <span class="mo" data-g="0">src/app/api/**/*.ts</span> <span class="mo" data-g="1">src/**/*.{ts,tsx}</span></span>`)}
          ${row("boton", 1, "src/components/Boton.tsx")}
          ${row("d-api", 1, "src/app/api/", "", true)}
          ${row("sub", 2, "CLAUDE.md", tag("subcarpeta"))}
          ${row("users", 2, "users.ts")}
          <div class="me-touch"><span>Claude toca</span><span class="mo"></span></div>
        </div>
        <div class="me-ctx">
          <div class="me-ch"><span class="me-cap">Contexto de Claude</span><span class="me-count"><b>0</b> archivos</span></div>
          <div class="me-stack">
            <p class="me-empty">vacío</p>
            ${blk("org")}${blk("user")}
            ${blk("proj", `<div class="me-impline"><span class="mo">@docs/git.md</span></div><div class="me-nest">${blk("imp")}</div>`)}
            ${blk("local")}${blk("rule")}${blk("sub")}
          </div>
        </div>
      </div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    root.querySelectorAll(".me-fly").forEach((f) => f.remove());
    const d = instant ? 0 : 1;
    const t = (tl = gsap.timeline());
    const q = (s: string) => root.querySelector(s) as HTMLElement;
    const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
    const trow = (k: string) => q(`.me-row[data-k="${k}"]`);
    const block = (k: Id) => q(`.me-blk[data-k="${k}"]`);

    // ---------- estado base (sin animar) ----------
    root.classList.toggle("is-launched", st.launched);
    root.classList.toggle("is-sum", !!st.sum);
    qa(".me-row").forEach((r) => r.classList.remove("is-active", "is-touch"));
    qa(".me-row").forEach((r) => r.classList.toggle("is-loaded", st.loaded.includes(r.dataset.k as Id)));
    qa(".me-blk").forEach((b) => b.classList.remove("is-new"));
    qa(".me-note .mo[data-g]").forEach((c) => c.classList.toggle("on", st.glob === +c.dataset.g!));
    q(".me-empty").classList.toggle("off", st.loaded.length > 0);

    // bloques ya cargados de pasos anteriores: visibles sin animar; los que no, ocultos
    const all: Id[] = [...ORDER, "imp"];
    all.forEach((k) => {
      const b = block(k);
      const on = st.loaded.includes(k) && !st.active.includes(k);
      b.classList.toggle("on", on);
      gsap.set(b, { clearProps: "opacity,transform,height" });
    });
    const proj = block("proj");
    proj.classList.toggle("is-expanded", st.loaded.includes("imp") && !st.active.includes("imp"));

    // tocar un archivo
    const touch = q(".me-touch");
    touch.classList.toggle("on", !!st.touch);
    touch.querySelector(".mo")!.textContent = st.touch === "boton" ? "src/components/Boton.tsx" : st.touch === "users" ? "src/app/api/users.ts" : "";
    let at = 0;
    if (st.touch) {
      const r = trow(st.touch);
      r.classList.add("is-touch");
      if (d) {
        t.fromTo(touch, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0);
        t.fromTo(r, { backgroundColor: "rgba(255,91,31,0)" }, { backgroundColor: "rgba(255,91,31,0.22)", duration: 0.35, yoyo: true, repeat: 1 }, 0.3);
        at = 1.1;
      }
      if (st.glob !== undefined && d) {
        const g = q(`.me-note .mo[data-g="${st.glob}"]`);
        g.classList.remove("on");
        t.call(() => g.classList.add("on"), [], at);
        t.fromTo(g, { scale: 0.8 }, { scale: 1, duration: 0.5, ease: "back.out(2.4)" }, at);
        at += 0.7;
      }
    }

    // contador
    const count = q(".me-count b");
    const prevN = st.loaded.filter((k) => !st.active.includes(k)).length;
    const setCount = (n: number) => { count.textContent = String(n); };
    setCount(prevN);

    // ---------- lo que entra en este paso ----------
    st.active.forEach((k, n) => {
      const r = trow(k);
      const b = block(k);
      const show = () => { b.classList.add("on", "is-new"); r.classList.add("is-active"); };
      if (!d) { show(); if (k === "imp") proj.classList.add("is-expanded"); setCount(prevN + n + 1); return; }

      t.call(() => r.classList.add("is-active"), [], at);
      if (k === "imp") {
        // el @import se abre en su lugar
        const line = proj.querySelector(".me-impline") as HTMLElement;
        t.to(line, { backgroundColor: "rgba(255,91,31,0.25)", duration: 0.3, yoyo: true, repeat: 1 }, at);
        t.call(() => { proj.classList.add("is-expanded"); b.classList.add("on", "is-new"); }, [], at + 0.6);
        t.fromTo(b, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.7, ease: "power3.out" }, at + 0.6);
        t.call(() => setCount(prevN + n + 1), [], at + 0.9);
        at += 1.4;
        return;
      }
      // un "archivo" viaja del árbol al contexto
      b.classList.add("on", "is-new");
      gsap.set(b, { opacity: 0 });
      const fly = document.createElement("div");
      fly.className = "me-fly";
      fly.textContent = CTX[k].path.split("/").pop()!;
      root.appendChild(fly);
      const rel = (el: HTMLElement) => {
        const a = el.getBoundingClientRect(), s = root.getBoundingClientRect();
        return { x: a.left - s.left, y: a.top - s.top };
      };
      t.fromTo(fly, { opacity: 1, left: () => rel(r).x + 20, top: () => rel(r).y },
        { left: () => rel(b).x + 10, top: () => rel(b).y + 6, duration: 0.75, ease: "power2.inOut", immediateRender: false }, at);
      t.set(fly, { opacity: 0 }, at + 0.75);
      t.fromTo(b, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out", immediateRender: false }, at + 0.7);
      t.call(() => setCount(prevN + n + 1), [], at + 0.75);
      at += 1.1;
    });

    if (!d) t.progress(1);
  },
};
