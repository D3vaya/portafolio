/*
  Animación: sesiones como ramas. Una línea de tiempo con un carril por sesión; cada punto es un
  mensaje de su historial. Se ve cómo se crea con nombre, se renombra, se retoma la última o por
  nombre, se elige en el selector de /resume y se bifurca con el mismo historial. A la derecha,
  qué contexto lleva la sesión activa.
*/
import { gsap } from "gsap";
import type { Escena } from "../../../scripts/escena";
import "./sesiones.css";

type Lane = "oauth" | "fork" | "fix";
const POS: Record<Lane, number[]> = {
  oauth: [4, 9, 14, 19, 58, 63, 68],
  fix: [26, 31, 36, 44, 49],
  fork: [76, 82, 88],
};
const FORK_AT = 68;

type Card =
  | { kind: "count"; name: string; n: number; sub: string; lines: string[]; label?: string }
  | { kind: "restore" }
  | { kind: "compare" };

type Estado = {
  cmds: string[]; // se escriben en orden; queda el último
  alt?: string;
  n: Record<Lane, number>;
  fixName: string;
  active: Lane | null;
  picker?: boolean;
  card: Card;
};

const ESTADOS: Estado[] = [
  {
    cmds: ["$ claude -n oauth-migration"], n: { oauth: 4, fix: 0, fork: 0 }, fixName: "", active: "oauth",
    card: { kind: "count", name: "oauth-migration", n: 4, sub: "mensajes en su historial", lines: ["Guardada como JSONL en <code>~/.claude/projects/</code>", "Se conserva 30 días (<code>cleanupPeriodDays</code>)"] },
  },
  {
    cmds: ["$ claude", "> /rename fix-tests"], n: { oauth: 4, fix: 3, fork: 0 }, fixName: "fix-tests", active: "fix",
    card: { kind: "count", name: "fix-tests", n: 3, sub: "mensajes en su historial", lines: ["Contexto propio: no ve nada de oauth-migration", "Nombre puesto en curso con <code>/rename</code>"] },
  },
  {
    cmds: ["$ claude --continue"], n: { oauth: 4, fix: 5, fork: 0 }, fixName: "fix-tests", active: "fix",
    card: { kind: "count", name: "fix-tests", n: 5, sub: "mensajes en su historial", lines: ["Retoma la última sesión", "Con todo su historial: sigues donde quedaste"] },
  },
  {
    cmds: ["$ claude --resume oauth-migration"], alt: "dentro de una sesión: /resume oauth-migration", n: { oauth: 7, fix: 5, fork: 0 }, fixName: "fix-tests", active: "oauth",
    card: { kind: "count", name: "oauth-migration", n: 7, sub: "mensajes en su historial", lines: ["Retomada por nombre", "fix-tests queda guardada, intacta"] },
  },
  {
    cmds: ["$ claude --resume oauth-migration"], alt: "dentro de una sesión: /resume oauth-migration", n: { oauth: 7, fix: 5, fork: 0 }, fixName: "fix-tests", active: "oauth",
    card: { kind: "restore" },
  },
  {
    cmds: ["> /resume"], n: { oauth: 7, fix: 5, fork: 0 }, fixName: "fix-tests", active: null, picker: true,
    card: { kind: "count", label: "Lista del selector", name: "/resume", n: 2, sub: "sesiones en este proyecto", lines: ["Por defecto, las de este proyecto; <kbd>Ctrl</kbd>+<kbd>A</kbd> muestra todos"] },
  },
  {
    cmds: ["> /branch probar-streaming"], alt: "desde la terminal: claude --continue --fork-session", n: { oauth: 7, fix: 5, fork: 1 }, fixName: "fix-tests", active: "fork",
    card: { kind: "count", name: "probar-streaming", n: 8, sub: "mensajes: 7 heredados + 1 nuevo", lines: ["Empieza con el mismo historial que oauth-migration", "Lo que hagas aquí no toca la original"] },
  },
  {
    cmds: ["> /branch probar-streaming"], alt: "desde la terminal: claude --continue --fork-session", n: { oauth: 7, fix: 5, fork: 3 }, fixName: "fix-tests", active: "fork",
    card: { kind: "compare" },
  },
];

let root: HTMLElement;
let tl: gsap.core.Timeline | null = null;
const q = (s: string) => root.querySelector(s) as HTMLElement;

const LANE_NAME = (l: Lane, st: Estado) => (l === "oauth" ? "oauth-migration" : l === "fork" ? "probar-streaming" : st.fixName || "sin nombre");

function cardHTML(c: Card) {
  if (c.kind === "count")
    return `<span class="se-c-l">${c.label ?? "Contexto de"}</span><b class="se-c-name">${c.name}</b>
      <div class="se-c-n"><b>${c.n}</b><span>${c.sub}</span></div>
      <ul>${c.lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
  if (c.kind === "restore")
    return `<span class="se-c-l">Al retomar se restaura</span>
      <ul class="se-ok">${["Historial completo", "Modelo y agente", "Modo de permisos (desde la terminal)", "Un <code>/goal</code> activo", "Tareas programadas vigentes"].map((l) => `<li><i>✓</i>${l}</li>`).join("")}</ul>
      <span class="se-c-l">Hay que volver a pasarlos</span>
      <ul class="se-bad">${["--mcp-config", "--settings", "--add-dir"].map((l) => `<li><i>✕</i><code>${l}</code></li>`).join("")}</ul>`;
  return `<span class="se-c-l">Dos caminos, un mismo origen</span>
      <div class="se-cmp on"><b>10</b><span><code>probar-streaming</code><br>7 heredados + 3 nuevos</span></div>
      <div class="se-cmp"><b>7</b><span><code>oauth-migration</code><br>intacta</span></div>
      <ul><li>Vuelves a la original con <code>/resume oauth-migration</code></li></ul>`;
}

export const sesiones: Escena = {
  title: "Sesiones como ramas de trabajo",
  steps: [
    { title: "Nombra la sesión al iniciar", text: "Cada conversación es una sesión ligada a tu directorio. <code>claude -n</code> le pone nombre desde el principio. Cada punto es un mensaje de su historial.", ms: 7500 },
    { title: "Otra tarea, otra sesión", text: "Abres una sesión nueva para otra cosa y la nombras en curso con <code>/rename</code>. Tiene su propio contexto: no ve nada de la otra.", ms: 7500 },
    { title: "Retomar lo último", text: "Cierras la terminal y vuelves más tarde. <code>claude --continue</code> abre la última sesión con todo su historial, sin buscarla.", ms: 7000 },
    { title: "Retomar por nombre", text: "Para volver a una sesión anterior, <code>claude --resume</code> con su nombre. Sigue justo donde quedó; la otra queda guardada.", ms: 7000 },
    { title: "Qué vuelve y qué no", text: "Se restaura el historial, el modelo, el agente, el modo de permisos, un <code>/goal</code> activo y las tareas programadas. Flags como <code>--mcp-config</code>, <code>--settings</code> o <code>--add-dir</code> hay que volver a pasarlos.", ms: 9000 },
    { title: "El selector de /resume", text: "<code>/resume</code> sin nombre abre un selector. <kbd class=\"k\">Espacio</kbd> previsualiza y <kbd class=\"k\">Ctrl</kbd>+<kbd class=\"k\">R</kbd> renombra; otros atajos amplían o filtran la lista.", ms: 8500 },
    { title: "Bifurcar con el mismo historial", text: "¿Otro enfoque sin perder el actual? <code>/branch probar-streaming</code> crea una sesión nueva que parte con <b>el mismo historial</b>. Desde la terminal: <code>claude --continue --fork-session</code>.", ms: 8500 },
    { title: "Dos caminos, el original intacto", text: "La bifurcación avanza por su cuenta. oauth-migration sigue igual: si el experimento no sirve, la retomas y listo.", ms: 7500 },
  ],

  setup(stage) {
    root = stage;
    stage.classList.add("se");
    const lane = (l: Lane) => `
      <div class="se-lane" data-l="${l}">
        <div class="se-name"><b></b><span class="se-st"></span></div>
        <div class="se-track"><i class="se-base"></i>${l === "fork" ? `<i class="se-ghost"><span>mismo historial · 7 mensajes</span></i>` : ""}${l === "oauth" ? `<i class="se-fk"><span>/branch</span></i>` : ""}</div>
      </div>`;
    stage.innerHTML = `
      <div class="se-cmd"><span class="se-cmd-tx"></span><i class="se-caret"></i></div>
      <div class="se-alt"></div>
      <div class="se-main">
        <div class="se-graph">
          ${lane("oauth")}${lane("fork")}${lane("fix")}
          <div class="se-axis"><span>tiempo</span><i></i></div>
          <div class="se-picker">
            <div class="se-pk-h"><code>/resume</code> · elige una sesión</div>
            <div class="se-pk-row on"><span>›</span><code>oauth-migration</code><em>7 mensajes</em></div>
            <div class="se-pk-row"><span></span><code>fix-tests</code><em>5 mensajes</em></div>
            <div class="se-pk-keys">
              <div><kbd>Espacio</kbd>previsualiza</div><div><kbd>Ctrl</kbd>+<kbd>R</kbd>renombra</div>
              <div><kbd>Ctrl</kbd>+<kbd>W</kbd>todos los worktrees</div><div><kbd>Ctrl</kbd>+<kbd>A</kbd>todos los proyectos</div>
              <div><kbd>Ctrl</kbd>+<kbd>B</kbd>filtra por rama actual</div>
            </div>
          </div>
        </div>
        <div class="se-card"></div>
      </div>`;
  },

  go(i, instant) {
    const st = ESTADOS[i];
    const prev = ESTADOS[i - 1];
    if (tl && tl.progress() < 1) tl.progress(1);
    gsap.getTweensOf(root.querySelectorAll("*")).forEach((tw) => tw.progress(1).kill());
    const t = (tl = gsap.timeline());
    const at = (time: number, fn: () => void) => (instant ? fn() : t.call(fn, [], time));

    // ---------- comando que escribes ----------
    const cmdEl = q(".se-cmd-tx");
    let tc = 0;
    if (instant) cmdEl.textContent = st.cmds[st.cmds.length - 1];
    else {
      const same = prev && prev.cmds.join() === st.cmds.join();
      if (!same) {
        st.cmds.forEach((c, k) => {
          const o = { n: 0 };
          const s = tc;
          t.to(o, { n: c.length, duration: Math.min(1.3, c.length * 0.04), ease: "none", onUpdate: () => (cmdEl.textContent = c.slice(0, Math.round(o.n))) }, s);
          tc = s + Math.min(1.3, c.length * 0.04) + 0.35;
          if (k < st.cmds.length - 1) tc += 1.3; // deja ver el efecto del primer comando
        });
      }
    }
    const altEl = q(".se-alt");
    at(tc, () => {
      const [lbl, cmd] = (st.alt ?? "").split(": ");
      altEl.innerHTML = st.alt ? `<span>${lbl}:</span> <code>${cmd}</code>` : "";
    });

    // ---------- carriles ----------
    const lanes: Lane[] = ["oauth", "fork", "fix"];
    lanes.forEach((l) => {
      const el = q(`.se-lane[data-l="${l}"]`);
      const track = el.querySelector(".se-track")!;
      const want = st.n[l];
      const shown = want > 0 || (l === "fork" && i >= 6);
      const wasShown = el.classList.contains("on");
      el.classList.toggle("on", shown);
      if (shown && !wasShown && !instant) t.fromTo(el, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "opacity,transform" }, l === "fix" ? 0.3 : tc);

      // nombre (fix-tests se nombra en curso con /rename)
      const nameEl = el.querySelector(".se-name b")!;
      const finalName = LANE_NAME(l, st);
      if (l === "fix" && !instant && prev && !prev.n.fix && want) {
        nameEl.textContent = "sin nombre";
        t.call(() => (nameEl.textContent = finalName), [], tc - 0.3);
        t.fromTo(nameEl, { color: "#ff5b1f" }, { color: "#ececee", duration: 1, clearProps: "color" }, tc - 0.3);
      } else nameEl.textContent = finalName;

      // puntos
      const dots = track.querySelectorAll(".se-dot");
      for (let k = dots.length - 1; k >= want; k--) dots[k].remove();
      const have = Math.min(dots.length, want);
      const start = l === "fix" && i === 1 ? 0.6 : tc;
      for (let k = have; k < want; k++) {
        const d = document.createElement("i");
        d.className = "se-dot";
        d.style.left = POS[l][k] + "%";
        track.appendChild(d);
        if (!instant) {
          const s = start + (k - have) * 0.3;
          t.fromTo(d, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(3)" }, s);
        }
      }
      const base = el.querySelector(".se-base") as HTMLElement;
      const from = l === "fork" ? FORK_AT : POS[l][0];
      const to = want ? POS[l][want - 1] : from;
      base.style.left = from + "%";
      if (instant) base.style.width = to - from + "%";
      else t.to(base, { width: to - from + "%", duration: 0.3 * Math.max(1, want - have), ease: "none" }, start);
    });

    // bifurcación
    const fk = q(".se-fk"), ghost = q(".se-ghost");
    const forked = i >= 6;
    fk.classList.toggle("on", forked);
    ghost.classList.toggle("on", forked);
    if (forked && prev && prev.n.fork === 0 && !instant) {
      t.fromTo(fk, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: "power3.out" }, tc);
      t.fromTo(ghost, { width: 0 }, { width: FORK_AT - 4 + "%", duration: 0.9, ease: "power2.inOut" }, tc + 0.2);
    }

    // estado de cada carril
    const applyActive = () => {
      lanes.forEach((l) => {
        const el = q(`.se-lane[data-l="${l}"]`);
        const on = st.active === l;
        el.classList.toggle("is-active", on);
        el.querySelector(".se-st")!.textContent = on ? "activa" : "guardada";
      });
    };
    at(tc, applyActive);

    // ---------- selector ----------
    const pk = q(".se-picker");
    root.classList.toggle("has-picker", !!st.picker);
    if (st.picker && !instant) {
      t.fromTo(pk, { opacity: 0, y: 14, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out", clearProps: "all" }, tc);
      t.fromTo(pk.querySelectorAll(".se-pk-keys div"), { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.35, clearProps: "all" }, tc + 0.6);
    }

    // ---------- tarjeta de contexto ----------
    const card = q(".se-card");
    const fill = () => {
      card.innerHTML = cardHTML(st.card);
      card.className = "se-card k-" + st.card.kind;
    };
    if (instant) fill();
    else {
      t.to(card, { opacity: 0.2, duration: 0.2 }, Math.max(0, tc - 0.2));
      t.call(fill, [], tc + 0.05);
      t.to(card, { opacity: 1, duration: 0.35 }, tc + 0.05);
      if (st.card.kind === "restore") t.call(() => { gsap.fromTo(card.querySelectorAll("li"), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.18 }); }, [], tc + 0.2);
    }
    if (instant) t.progress(1);
  },
};
