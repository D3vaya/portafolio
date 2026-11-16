/* Guía de Git: progreso, quizzes y widgets interactivos.
   Cada vista vive en su propia URL: los widgets de otras vistas no están en la página, por eso cada
   bloque comprueba que su elemento exista antes de montarse. Las animaciones (escenas) y el
   laboratorio se cargan aparte como módulos (anim/index.ts y lab.ts). */
(function () {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const stem = (s) => { s = norm(s.trim()); return s.length > 5 ? s.replace(/(aciones|acion|ciones|cion|mente|ando|iendo|ados|idos|ado|ido|ar|er|ir|es|s)$/, "") : s; };

/* ---------- progreso ---------- */
const KEY = "gitguia-v1";
let state = { done: {}, quiz: {} };
try { const s = localStorage.getItem(KEY); if (s) state = Object.assign(state, JSON.parse(s)); } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
function toast(m) { const t = $("#toast"); if (!t) return; t.textContent = String(m).trim(); t.classList.add("on"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 2200); }

/* ---------- resaltado de código (shell y git) ---------- */
function hl(code) {
  let s = esc(code);
  s = s.replace(/("(?:[^"\\\n]|\\.)*")|((?:^|\s)#[^\n]*)|(^\s*(?:\$ )?git(?= ))|(\s--?[a-zA-Z][\w-]*(?:=[^\s]*)?)|(&lt;&lt;&lt;&lt;&lt;&lt;&lt;[^\n]*|&gt;&gt;&gt;&gt;&gt;&gt;&gt;[^\n]*|^=======$)/gm, (m, str, com, git, flag, mk) => {
    if (str) return '<span class="hs">' + str + "</span>";
    if (com) return '<span class="hc">' + com + "</span>";
    if (git) return '<span class="hf">' + git + "</span>";
    if (flag) return '<span class="hk">' + flag + "</span>";
    if (mk) return '<span class="hm">' + mk + "</span>";
    return m;
  });
  return s;
}
function setCode(el, txt) { el.innerHTML = hl(txt); el.dataset.raw = txt; }
$$("pre[data-hl]").forEach((p) => setCode(p, p.textContent));

/* ---------- copiar ---------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest(".copy"); if (!b) return;
  const pre = b.dataset.copy ? document.getElementById(b.dataset.copy) : b.closest(".code,.out").querySelector("pre");
  const txt = pre.dataset.raw || pre.textContent;
  const ok = () => { b.textContent = "✓ copiado"; setTimeout(() => (b.textContent = "copiar"), 1400); };
  const fail = () => { try { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (err) {} toast("Selecciona y copia con Ctrl+C"); };
  try { navigator.clipboard.writeText(txt).then(ok, fail); } catch (err) { fail(); }
});

/* ---------- rutas ---------- */
const LEVELS = ["basico", "intermedio", "avanzado", "experto"];
const EXTRA = ["problemas", "rescate", "estrategias", "comandos", "laboratorio", "glosario"];
const VIEWS = ["inicio", ...LEVELS, ...EXTRA];
const BASE = "/git/";
const viewUrl = (v) => (v === "inicio" ? BASE : BASE + v + "/");
const CUR = (document.querySelector(".view") || { id: "v-inicio" }).id.slice(2);
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (VIEWS.includes(h) && h !== CUR) { location.replace(viewUrl(h)); return; }
  $$(".view").forEach((v) => v.classList.add("on"));
  $$("#lvnav a,#refnav a").forEach((a) => a.classList.toggle("on", a.dataset.l === CUR));
  setTimeout(observeReveal, 50);
  if (h && !VIEWS.includes(h)) { const t = document.getElementById(h); if (t) setTimeout(() => t.scrollIntoView(), 0); }
}
window.addEventListener("hashchange", route);
document.addEventListener("click", (e) => { const a = e.target.closest('a[href^="#"]'); if (!a) return; const h = a.getAttribute("href").slice(1); if (VIEWS.includes(h) && h !== CUR) { e.preventDefault(); location.href = viewUrl(h); } });

/* ---------- índice de lecciones y progreso ---------- */
const lessonsBy = {};
LEVELS.forEach((l) => {
  const view = document.querySelector("#v-" + l);
  if (!view) { lessonsBy[l] = (window.__GIT && window.__GIT.lessons[l]) || []; return; }
  const arts = $$("article.lesson", view);
  lessonsBy[l] = arts.map((a) => a.id);
  const toc = $("aside.toc", view);
  toc.innerHTML = '<div class="lbl">Lecciones</div>' + arts.map((a, i) => '<button data-go="' + a.id + '"><span class="ck">' + (a.id.endsWith("q") ? "?" : i + 1) + "</span><span>" + esc(a.dataset.t) + "</span></button>").join("") + '<div class="lvprog">Progreso del nivel <span data-lvp="' + l + '">0%</span><div class="track"><b data-lvb="' + l + '"></b></div></div>';
});
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-go]"); if (g) { const t = document.getElementById(g.dataset.go); if (t) t.scrollIntoView({ behavior: "smooth" }); }
  const d = e.target.closest("[data-done]"); if (d) { const id = d.dataset.done; state.done[id] = !state.done[id]; save(); renderProgress(); if (state.done[id]) toast("✓ Lección completada"); }
});
function lvPct(l) { const ids = lessonsBy[l]; if (!ids.length) return 0; let n = 0; ids.forEach((id) => { if (id.endsWith("q") ? state.quiz[l] : state.done[id]) n++; }); return Math.round((n / ids.length) * 100); }
function renderProgress() {
  $$("[data-done]").forEach((b) => { const v = !!state.done[b.dataset.done]; b.classList.toggle("on", v); b.textContent = v ? "✓ Completada" : "○ Marcar como completada"; });
  LEVELS.forEach((l) => {
    const p = lvPct(l);
    $$('[data-pg="' + l + '"]').forEach((b) => (b.style.width = p + "%"));
    $$('[data-pgt="' + l + '"]').forEach((b) => (b.textContent = p + "%"));
    $$('[data-lvp="' + l + '"]').forEach((b) => (b.textContent = p + "%"));
    $$('[data-lvb="' + l + '"]').forEach((b) => (b.style.width = p + "%"));
    const ring = $('#lvnav a[data-l="' + l + '"] .fg'); if (ring) ring.style.strokeDashoffset = 44 - (44 * p) / 100;
    lessonsBy[l].forEach((id) => { const b = $('aside.toc [data-go="' + id + '"]'); if (b) b.classList.toggle("done", id.endsWith("q") ? !!state.quiz[l] : !!state.done[id]); });
  });
  const cert = $("#cert"); if (cert) cert.classList.toggle("on", LEVELS.every((l) => lvPct(l) === 100));
}
const tocObs = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { const id = en.target.id; const v = en.target.closest(".view"); $$("aside.toc button", v).forEach((b) => b.classList.toggle("act", b.dataset.go === id)); } }), { rootMargin: "-30% 0px -60% 0px" });
$$("article.lesson").forEach((a) => tocObs.observe(a));
const revObs = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revObs.unobserve(en.target); } }), { threshold: 0.1 });
function observeReveal() { $$(".reveal:not(.in)").forEach((el) => revObs.observe(el)); }

/* =================================================================== */
/*  WIDGETS                                                             */
/* =================================================================== */

/* ---------- b2 · generador de configuración ---------- */
(function () {
  const w = $("#cfgW"); if (!w) return;
  const out = $("#cfgOut");
  function render() {
    const v = (id) => $("#" + id, w).value.trim();
    const name = v("cfgName") || "Tu Nombre", mail = v("cfgMail") || "tu@correo.com";
    const ed = v("cfgEd"), pull = v("cfgPull");
    const lines = [
      "# quién eres (aparece en cada commit)",
      `git config --global user.name "${name}"`,
      `git config --global user.email "${mail}"`,
      "",
      "# rama inicial de los repos nuevos",
      "git config --global init.defaultBranch main",
      "",
      "# editor para mensajes de commit y rebase interactivo",
      `git config --global core.editor "${ed}"`,
      "",
      "# qué hace git pull cuando tu rama y la remota divergieron",
      pull === "rebase" ? "git config --global pull.rebase true" : pull === "ff" ? "git config --global pull.ff only" : "git config --global pull.rebase false",
    ];
    if ($("#cfgPlus", w).checked) lines.push("", "# extras recomendados", "git config --global push.autoSetupRemote true   # el primer push crea el upstream solo", "git config --global rerere.enabled true          # recuerda cómo resolviste un conflicto", "git config --global diff.algorithm histogram     # diffs más legibles", "git config --global fetch.prune true             # borra origin/* de ramas eliminadas");
    setCode(out, lines.join("\n"));
  }
  w.addEventListener("input", render);
  render();
})();

/* ---------- b8 · probador de .gitignore ---------- */
function globToRe(pat) {
  let re = "";
  for (let i = 0; i < pat.length; i++) {
    const ch = pat[i];
    if (ch === "*") {
      if (pat[i + 1] === "*") {
        const slash = pat[i + 2] === "/";
        re += slash ? "(?:.*/)?" : ".*";
        i += slash ? 2 : 1;
      } else re += "[^/]*";
    } else if (ch === "?") re += "[^/]";
    else if (ch === "[") { const j = pat.indexOf("]", i); if (j > i) { re += pat.slice(i, j + 1).replace("[!", "[^"); i = j; } else re += "\\["; }
    else re += ch.replace(/[.+^${}()|\\]/g, "\\$&");
  }
  return re;
}
function gitignore(rules, path) {
  // la última regla que coincide gana; una carpeta ignorada no se puede "des-ignorar" por dentro
  let res = null;
  const parts = path.split("/");
  for (let k = 1; k <= parts.length; k++) {
    const sub = parts.slice(0, k).join("/");
    const isDir = k < parts.length || path.endsWith("/");
    let hit = null;
    rules.forEach((raw, n) => {
      let r = raw.trim();
      if (!r || r.startsWith("#")) return;
      const neg = r.startsWith("!"); if (neg) r = r.slice(1);
      const dirOnly = r.endsWith("/"); if (dirOnly) r = r.slice(0, -1);
      if (dirOnly && !isDir) return;
      const anchored = r.includes("/") ;
      if (r.startsWith("/")) r = r.slice(1);
      const re = new RegExp("^" + (anchored ? "" : "(?:.*/)?") + globToRe(r) + "$");
      if (re.test(sub)) hit = { neg, line: n + 1, rule: raw.trim() };
    });
    if (hit && !hit.neg && k < parts.length) return { ignored: true, by: hit, dir: sub };
    if (k === parts.length) res = hit;
  }
  return res ? { ignored: !res.neg, by: res } : { ignored: false, by: null };
}
(function () {
  const w = $("#giW"); if (!w) return;
  const rules = $("#giRules", w), files = $("#giFiles", w), out = $("#giOut", w);
  function render() {
    const R = rules.value.split("\n");
    out.innerHTML = files.value.split("\n").map((f) => f.trim()).filter(Boolean).map((f) => {
      const r = gitignore(R, f.replace(/\/$/, "") + (f.endsWith("/") ? "/" : ""));
      const why = r.by ? (r.dir ? `por la carpeta <code>${esc(r.dir)}/</code> (línea ${r.by.line}: <code>${esc(r.by.rule)}</code>)` : `línea ${r.by.line}: <code>${esc(r.by.rule)}</code>`) : "ninguna regla coincide";
      return `<div class="gi-row ${r.ignored ? "is-ign" : "is-trk"}"><span class="gi-st">${r.ignored ? "✕ ignorado" : "✓ se versiona"}</span><code class="gi-f">${esc(f)}</code><span class="gi-why">${why}</span></div>`;
    }).join("");
  }
  w.addEventListener("input", render);
  render();
})();

/* ---------- b10 · revisor de mensajes de commit ---------- */
(function () {
  const w = $("#msgW"); if (!w) return;
  const ta = $("#msgIn", w), out = $("#msgOut", w);
  const CC = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([\w\-./]+\))?!?: \S/;
  function render() {
    const lines = ta.value.split("\n");
    const subj = lines[0] || "";
    const checks = [];
    const add = (ok, txt, lvl) => checks.push({ ok, txt, lvl: ok ? "ok" : lvl || "bad" });
    add(subj.trim().length > 0, "Tiene un asunto (primera línea)");
    add(subj.length <= 72, `Asunto de ${subj.length} caracteres (ideal ≤ 50, máximo 72: más largo se corta en GitHub y en git log --oneline)`, subj.length <= 72 ? "ok" : "bad");
    if (subj.length > 50 && subj.length <= 72) checks[checks.length - 1].lvl = "warn";
    add(!/[.!]\s*$/.test(subj), "El asunto no termina en punto", "warn");
    add(!/^(wip|fix|cambios|arreglos|update|updates|varios|asdf|\.+)$/i.test(subj.trim()), "Dice qué cambió (no solo «wip», «fix» o «cambios»)");
    add(!/^(agregué|arreglé|cambié|corregí|added|fixed|changed)\b/i.test(subj.trim()), "En presente o imperativo: «agrega», «corrige» (no «agregué»)", "warn");
    if (lines.length > 1) add(lines[1] === "", "Línea en blanco entre asunto y cuerpo");
    const cc = CC.test(subj);
    checks.push({ ok: cc, lvl: cc ? "ok" : "info", txt: cc ? "Sigue Conventional Commits (tipo: descripción)" : "Opcional: formato Conventional Commits, p. ej. «fix(carrito): corrige el total con cupones»" });
    out.innerHTML = checks.map((c) => `<li class="m-${c.lvl}"><span>${c.lvl === "ok" ? "✓" : c.lvl === "bad" ? "✕" : c.lvl === "warn" ? "!" : "·"}</span>${esc(c.txt)}</li>`).join("");
  }
  ta.addEventListener("input", render);
  $$("[data-msg]", w).forEach((b) => b.addEventListener("click", () => { ta.value = b.dataset.msg.replace(/\\n/g, "\n"); render(); ta.focus(); }));
  render();
})();

/* ---------- i5 · resolutor de conflictos ---------- */
(function () {
  const w = $("#cfW"); if (!w) return;
  const ed = $("#cfEd", w), msg = $("#cfMsg", w);
  const ORIG = `function totalConDescuento(total) {
<<<<<<< HEAD
  const descuento = total * 0.10; // 10% para todos
=======
  const descuento = total > 50000 ? total * 0.15 : 0; // solo compras grandes
>>>>>>> feature/descuentos
  return total - descuento;
}`;
  const OURS = `function totalConDescuento(total) {
  const descuento = total * 0.10; // 10% para todos
  return total - descuento;
}`;
  const THEIRS = `function totalConDescuento(total) {
  const descuento = total > 50000 ? total * 0.15 : 0; // solo compras grandes
  return total - descuento;
}`;
  const BOTH = `function totalConDescuento(total) {
  // 15% en compras grandes, 10% en el resto
  const descuento = total > 50000 ? total * 0.15 : total * 0.10;
  return total - descuento;
}`;
  const reset = () => { ed.value = ORIG; msg.className = "cf-msg"; msg.innerHTML = 'Elige una versión o edita el texto, y luego marca el archivo como resuelto con <code>git add</code>.'; };
  w.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const a = b.dataset.cf;
    if (a === "ours") ed.value = OURS;
    if (a === "theirs") ed.value = THEIRS;
    if (a === "both") ed.value = BOTH;
    if (a === "reset") return reset();
    if (a === "add") {
      if (/^(<{7}|={7}|>{7})/m.test(ed.value)) { msg.className = "cf-msg bad"; msg.innerHTML = "✕ Todavía hay marcadores (<code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code> o <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>). Un <code>git add</code> normal lo agregaría igual y el archivo quedaría roto (<code>git add --resolved</code>, de Git 2.56, sí se detiene): bórralos antes."; return; }
      msg.className = "cf-msg ok";
      msg.innerHTML = '✓ <code>git add precio.js</code>: resuelto. Ahora <code>git commit</code> crea el commit de merge. ' + (ed.value.trim() === OURS.trim() ? "Te quedaste con tu versión: el cambio de la rama se descartó." : ed.value.trim() === THEIRS.trim() ? "Te quedaste con la versión que llegaba." : "Combinaste las dos ideas: a menudo es la respuesta correcta, y por eso Git no decide solo.");
      return;
    }
    if (a) { msg.className = "cf-msg"; msg.innerHTML = "Revisa el resultado y pulsa <b>git add</b> cuando esté listo."; }
  });
  reset();
})();

/* =================================================================== */
/*  REFERENCIA: comandos                                                */
/* =================================================================== */
// [comando, categoría, qué hace, ejemplos ("comando  # comentario" separados por \n), nivel donde se explica, sinónimos]
const CMDS = [
 ["git init", "empezar", "Convierte la carpeta actual en un repositorio (crea .git/).", "git init\ngit init mi-proyecto   # crea la carpeta y el repo\ngit init -b main        # con rama inicial main", "basico", "crear nuevo repo empezar"],
 ["git clone", "empezar", "Copia un repositorio remoto completo: toda la historia, ramas remotas y una rama local que sigue a la principal.", "git clone https://github.com/ana/tienda.git\ngit clone git@github.com:ana/tienda.git mi-carpeta\ngit clone --depth 1 <url>              # solo el último commit\ngit clone --filter=blob:none <url>     # sin contenidos hasta que hagan falta", "intermedio", "descargar copiar bajar"],
 ["git config", "empezar", "Lee y escribe la configuración: global (~/.gitconfig), del repo (.git/config) o del sistema.", "git config --global user.name \"Ana Pérez\"\ngit config --global user.email ana@ejemplo.com\ngit config --list --show-origin   # todo, con el archivo de origen\ngit config --global alias.lg \"log --oneline --graph --all\"", "basico", "configurar nombre email alias"],
 ["git status", "cambios", "Muestra en qué rama estás, qué hay en staging, qué cambió sin agregar y qué archivos no tienen seguimiento.", "git status\ngit status -s    # versión corta: M = modificado, A = agregado, ?? = sin seguimiento", "basico", "estado ver cambios"],
 ["git add", "cambios", "Pasa cambios al staging (lo que irá en el próximo commit).", "git add archivo.js\ngit add .            # todo lo de esta carpeta hacia abajo\ngit add -p           # elige trozo por trozo\ngit add --resolved   # Git 2.56: solo los archivos con conflicto ya resuelto", "basico", "agregar preparar stage staging"],
 ["git commit", "cambios", "Guarda una foto del staging en el historial, con mensaje, autor y fecha.", "git commit -m \"agrega búsqueda\"\ngit commit                 # abre el editor para un mensaje largo\ngit commit -am \"...\"       # agrega lo modificado (no lo nuevo) y commitea\ngit commit --amend         # reemplaza el último commit", "basico", "guardar confirmar"],
 ["git restore", "deshacer", "Restaura archivos: descarta cambios del directorio de trabajo o los saca del staging.", "git restore app.js              # descarta cambios sin guardar (¡se pierden!)\ngit restore --staged app.js     # saca del staging, conserva los cambios\ngit restore --source=HEAD~2 app.js   # versión de hace dos commits", "basico", "descartar deshacer cambios unstage"],
 ["git rm / git mv", "cambios", "Borra o mueve archivos y deja el cambio en staging.", "git rm archivo.js\ngit rm --cached .env    # deja de versionarlo pero no lo borra del disco\ngit mv viejo.js nuevo.js", "basico", "borrar eliminar renombrar mover"],
 ["git diff", "historial", "Muestra diferencias: trabajo vs staging, staging vs último commit, o entre commits y ramas.", "git diff                 # trabajo vs staging\ngit diff --staged        # staging vs último commit\ngit diff main..feature   # entre dos ramas\ngit diff --stat          # resumen por archivo\ngit diff --word-diff     # por palabras", "basico", "diferencias comparar cambios"],
 ["git log", "historial", "Recorre el historial de commits.", "git log --oneline --graph --all\ngit log -p archivo.js            # con los cambios de cada commit\ngit log --author=Ana --since=\"2 weeks ago\"\ngit log -S \"calcularIVA\"         # commits que agregaron o quitaron ese texto\ngit log main..feature            # lo que feature tiene y main no", "basico", "historial ver commits buscar"],
 ["git show", "historial", "Muestra un commit (mensaje y cambios) o un archivo en una versión.", "git show HEAD\ngit show a1b2c3d\ngit show main:src/app.js   # el archivo tal como está en main", "basico", "ver commit"],
 ["git blame", "historial", "Muestra quién cambió por última vez cada línea de un archivo, y en qué commit.", "git blame app.js\ngit blame -L 40,60 app.js\ngit blame -w -C app.js   # ignora espacios y sigue líneas movidas", "avanzado", "autor culpable linea"],
 ["git branch", "ramas", "Lista, crea, renombra y borra ramas.", "git branch                # locales\ngit branch -a             # también las remotas\ngit branch -vv            # con su upstream y si van adelante o atrás\ngit branch feature        # crea (sin cambiarte)\ngit branch -m viejo nuevo # renombra\ngit branch -d feature     # borra si está fusionada (-D fuerza)\ngit branch --delete-merged origin   # Git 2.56: limpia las ya fusionadas", "intermedio", "rama ramas crear borrar listar"],
 ["git switch", "ramas", "Cambia de rama (o la crea y cambia en un paso).", "git switch feature\ngit switch -c arreglo        # crea y cambia\ngit switch -                 # vuelve a la rama anterior\ngit switch --detach v1.2     # HEAD separado en un tag o commit", "intermedio", "cambiar rama checkout"],
 ["git checkout", "ramas", "El comando clásico para cambiar de rama y restaurar archivos. Sigue existiendo; switch y restore separan sus dos trabajos.", "git checkout feature\ngit checkout -b arreglo\ngit checkout -- app.js    # como git restore app.js", "intermedio", "cambiar rama"],
 ["git merge", "ramas", "Integra otra rama en la actual: avanza la rama (fast-forward) o crea un commit de merge.", "git merge feature\ngit merge --no-ff feature    # siempre con commit de merge\ngit merge --ff-only origin/main\ngit merge --abort            # cancela un merge con conflictos\ngit merge --squash feature   # trae los cambios como uno solo, sin commit de merge", "intermedio", "fusionar unir integrar"],
 ["git rebase", "reescribir", "Reaplica tus commits encima de otra base. Con -i, los editas, combinas o reordenas.", "git rebase main\ngit rebase -i HEAD~4\ngit rebase -i --autosquash main\ngit rebase --onto main viejo-base feature\ngit rebase --continue | --skip | --abort\ngit rebase --update-refs main   # mueve también ramas apiladas", "avanzado", "rebasar historia lineal squash"],
 ["git cherry-pick", "reescribir", "Copia uno o más commits a la rama actual (crea commits nuevos con el mismo cambio).", "git cherry-pick a1b2c3d\ngit cherry-pick -x a1b2c3d   # anota el commit original en el mensaje\ngit cherry-pick A..B\ngit cherry-pick --abort", "avanzado", "copiar commit"],
 ["git reset", "deshacer", "Mueve la rama actual a otro commit. --soft deja los cambios en staging, --mixed (por defecto) en el trabajo, --hard los descarta.", "git reset HEAD~1           # deshace el commit, cambios en el trabajo\ngit reset --soft HEAD~1    # deshace el commit, cambios en staging\ngit reset --hard origin/main   # deja todo igual al remoto (¡destructivo!)", "avanzado", "deshacer volver atras"],
 ["git revert", "deshacer", "Crea un commit nuevo que deshace otro. No reescribe la historia: seguro en ramas compartidas.", "git revert a1b2c3d\ngit revert -m 1 <merge>   # revertir un merge\ngit revert --no-edit HEAD", "avanzado", "deshacer revertir"],
 ["git reflog", "deshacer", "Registro local de todo lo que apuntó HEAD (y cada rama). La red de seguridad para recuperar commits.", "git reflog\ngit reflog show feature\ngit reset --hard HEAD@{2}\ngit branch rescate HEAD@{5}", "avanzado", "recuperar perdido historial head"],
 ["git stash", "cambios", "Guarda cambios sin commit en una pila y deja el trabajo limpio.", "git stash push -m \"a medias\"\ngit stash -u          # incluye archivos sin seguimiento\ngit stash list\ngit stash pop         # aplica y quita de la pila\ngit stash apply stash@{1}\ngit stash drop", "intermedio", "guardar temporal esconder"],
 ["git tag", "ramas", "Marca un commit con un nombre fijo (versiones).", "git tag v1.2.0\ngit tag -a v1.2.0 -m \"Versión 1.2\"   # tag anotado (recomendado)\ngit push origin v1.2.0\ngit push --tags\ngit tag -d v1.2.0", "intermedio", "version etiqueta release"],
 ["git remote", "remotos", "Administra los remotos (servidores con copias del repo).", "git remote -v\ngit remote add origin git@github.com:ana/tienda.git\ngit remote set-url origin <url-nueva>\ngit remote prune origin", "intermedio", "origin servidor github"],
 ["git fetch", "remotos", "Descarga commits y ramas del remoto y actualiza origin/*. No toca tus ramas ni tus archivos.", "git fetch\ngit fetch --prune     # borra origin/* de ramas eliminadas\ngit fetch origin main", "intermedio", "descargar actualizar bajar"],
 ["git pull", "remotos", "fetch + integrar la rama remota en la tuya (merge, rebase o solo fast-forward, según configuración).", "git pull\ngit pull --rebase\ngit pull --ff-only", "intermedio", "bajar actualizar traer"],
 ["git push", "remotos", "Sube tus commits al remoto y mueve la rama allá.", "git push\ngit push -u origin feature        # primera vez: crea y conecta el upstream\ngit push --force-with-lease       # forzar sin pisar trabajo ajeno\ngit push origin --delete feature  # borra la rama remota", "intermedio", "subir publicar enviar"],
 ["git bisect", "historial", "Búsqueda binaria del commit que introdujo un error.", "git bisect start\ngit bisect bad\ngit bisect good v2.3\ngit bisect run npm test\ngit bisect reset", "avanzado", "buscar bug error culpable"],
 ["git worktree", "avanzado", "Varias carpetas de trabajo (cada una con su rama) conectadas a un mismo repositorio.", "git worktree add ../hotfix -b hotfix/pago\ngit worktree list\ngit worktree remove ../hotfix", "experto", "carpetas paralelas"],
 ["git history", "reescribir", "Experimental (Git 2.54+): edita la historia sin rebase interactivo. reword, split, fixup (2.55) y drop (2.56).", "git history reword a1b2c3d\ngit history split a1b2c3d\ngit history fixup a1b2c3d   # mete lo que está en staging en ese commit\ngit history drop a1b2c3d", "avanzado", "editar historia reescribir"],
 ["git clean", "deshacer", "Borra archivos sin seguimiento del directorio de trabajo.", "git clean -n     # muestra qué borraría (siempre primero)\ngit clean -fd    # borra archivos y carpetas sin seguimiento\ngit clean -fdx   # también los ignorados", "basico", "limpiar borrar"],
 ["git shortlog", "historial", "Resume commits por autor.", "git shortlog -sn   # cuántos commits por persona", "avanzado", "autores contar"],
 ["git range-diff", "historial", "Compara dos versiones de una serie de commits (antes y después de un rebase).", "git range-diff main feature@{1} feature", "avanzado", "comparar rebase"],
 ["git rerere", "avanzado", "Recuerda cómo resolviste un conflicto y lo aplica sola la próxima vez.", "git config --global rerere.enabled true\ngit rerere status", "experto", "conflictos recordar"],
 ["git submodule", "avanzado", "Incluye otro repositorio dentro del tuyo, fijado a un commit.", "git submodule add https://github.com/org/ui.git vendor/ui\ngit clone --recurse-submodules <url>\ngit submodule update --init --recursive", "experto", "submodulo dependencia"],
 ["git sparse-checkout", "avanzado", "Deja en el directorio de trabajo solo algunas carpetas de un repo grande.", "git sparse-checkout set apps/web services/pagos\ngit sparse-checkout list\ngit sparse-checkout disable", "experto", "monorepo carpetas"],
 ["git maintenance", "avanzado", "Tareas de mantenimiento (gc, commit-graph, prefetch) a mano o programadas.", "git maintenance run\ngit maintenance start   # las programa en segundo plano", "experto", "gc optimizar"],
 ["git gc", "avanzado", "Compacta objetos sueltos en packfiles y limpia lo inalcanzable vencido.", "git gc\ngit count-objects -vH   # cuánto ocupa el repo", "experto", "limpiar comprimir"],
 ["git cat-file", "avanzado", "Muestra objetos internos (commits, trees, blobs) por su hash.", "git cat-file -t HEAD     # tipo\ngit cat-file -p HEAD     # contenido\ngit cat-file -p HEAD^{tree}", "experto", "objetos internos plumbing"],
 ["git grep", "historial", "Busca texto en los archivos versionados (rápido, respeta .gitignore).", "git grep \"TODO\"\ngit grep -n calcularIVA main", "avanzado", "buscar texto"],
 ["git switch --orphan", "ramas", "Crea una rama sin historia (por ejemplo, para gh-pages).", "git switch --orphan gh-pages", "experto", "rama vacia"],
 ["git notes", "avanzado", "Agrega notas a commits sin cambiar su hash.", "git notes add -m \"revisado por QA\" a1b2c3d", "experto", "anotar"],
 ["git archive", "avanzado", "Exporta un árbol a .zip o .tar sin la carpeta .git.", "git archive --format=zip -o v1.2.zip v1.2.0", "experto", "exportar zip"],
];
const CATS = { empezar: "Empezar", cambios: "Cambios", historial: "Historial", ramas: "Ramas", remotos: "Remotos", deshacer: "Deshacer", reescribir: "Reescribir historia", avanzado: "Avanzado" };
const LVN = { basico: "Básico", intermedio: "Intermedio", avanzado: "Avanzado", experto: "Experto" };
(function () {
  const w = $("#cmdW"); if (!w) return;
  const list = $("#cmdList", w), q = $("#cmdQ", w), cats = $("#cmdCats", w);
  let cat = "all";
  cats.innerHTML = ['<button class="chip on" data-k="all">Todos</button>', ...Object.entries(CATS).map(([k, v]) => `<button class="chip" data-k="${k}">${v}</button>`)].join("");
  function render() {
    const terms = q.value.trim().split(/\s+/).filter(Boolean).map(stem);
    const hits = CMDS.filter((c) => (cat === "all" || c[1] === cat) && terms.every((t) => stem(norm(c.join(" "))).includes(t) || norm(c.join(" ")).includes(t)));
    list.innerHTML = hits.length ? hits.map((c, i) => `
      <details class="cmd" ${hits.length === 1 ? "open" : ""}>
        <summary><code class="cmd-n">${esc(c[0])}</code><span class="cmd-d">${esc(c[2])}</span></summary>
        <div class="code"><div class="ch"><span>${CATS[c[1]]} · se explica en <a href="${viewUrl(c[4])}">${LVN[c[4]]}</a></span><button class="copy">copiar</button></div><pre>${hl(c[3])}</pre></div>
      </details>`).join("") : `<p class="cmd-empty">Nada coincide con «${esc(q.value)}». Prueba con lo que quieres lograr: «deshacer», «subir», «rama».</p>`;
    $("#cmdN", w).textContent = hits.length + " de " + CMDS.length;
    list.querySelectorAll("pre").forEach((p, i) => (p.dataset.raw = hits[i][3]));
  }
  q.addEventListener("input", render);
  cats.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; cat = b.dataset.k; $$(".chip", cats).forEach((x) => x.classList.toggle("on", x === b)); render(); });
  render();
})();

/* =================================================================== */
/*  REFERENCIA: rescate                                                 */
/* =================================================================== */
// [situación, grupo, riesgo (bajo|medio|alto), explicación, comandos, lección]
const RESCATE = [
 ["Quiero descartar los cambios de un archivo que no he guardado", "archivos", "alto", "Vuelve el archivo a como está en el staging (o en el último commit si no lo agregaste). Lo que descartas no queda en ningún registro: no hay vuelta atrás.", "git restore app.js\n# todos los archivos:\ngit restore .", "basico"],
 ["Agregué un archivo al staging por error", "archivos", "bajo", "Lo sacas del staging; tus cambios siguen en el archivo.", "git restore --staged app.js", "basico"],
 ["Commiteé un archivo que no debía (por ejemplo .env)", "archivos", "medio", "Lo dejas de versionar sin borrarlo del disco y lo agregas a .gitignore. Si ya hiciste push con un secreto, el secreto está expuesto: rótalo (cámbialo) aunque reescribas la historia.", "git rm --cached .env\necho \".env\" >> .gitignore\ngit commit -m \"deja de versionar .env\"", "basico"],
 ["Me equivoqué en el mensaje del último commit", "commits", "bajo", "Si todavía no hiciste push, reemplaza el commit con otro mensaje. Si ya lo subiste, es más simple dejarlo.", "git commit --amend -m \"mensaje correcto\"", "basico"],
 ["Olvidé agregar un archivo al último commit", "commits", "bajo", "Agrégalo y corrige el último commit sin cambiar el mensaje (solo si no hiciste push).", "git add olvidado.js\ngit commit --amend --no-edit", "basico"],
 ["Quiero deshacer el último commit pero conservar los cambios", "commits", "bajo", "La rama vuelve un commit atrás y los cambios quedan en tu directorio de trabajo para rehacerlos como quieras.", "git reset HEAD~1\n# o con los cambios ya en staging:\ngit reset --soft HEAD~1", "avanzado"],
 ["Hice commit en la rama equivocada (por ejemplo en main)", "ramas", "medio", "Crea la rama correcta donde estás (se lleva el commit), y luego devuelve main a donde estaba. Si main ya se subió, no hagas el reset: usa revert.", "git branch mi-feature        # la rama nueva se queda con el commit\ngit reset --hard HEAD~1      # main vuelve atrás\ngit switch mi-feature", "avanzado"],
 ["Necesito deshacer un commit que ya está en GitHub", "commits", "bajo", "No reescribas una rama compartida: revert crea un commit nuevo que deshace el cambio, y se sube con un push normal.", "git revert a1b2c3d\ngit push", "avanzado"],
 ["Hice reset --hard y perdí commits", "commits", "bajo", "Los commits siguen en el repositorio. El reflog muestra dónde estaba tu rama antes del reset; vuelve ahí.", "git reflog\n# busca la línea anterior al reset, por ejemplo HEAD@{1}\ngit reset --hard HEAD@{1}", "avanzado"],
 ["Borré una rama que tenía trabajo sin fusionar", "ramas", "bajo", "Git te dijo el hash al borrarla («era a1b2c3d»). Si no lo tienes, búscalo en el reflog.", "git branch recuperada a1b2c3d\n# sin el hash:\ngit reflog | grep \"mi-rama\"", "avanzado"],
 ["Un rebase salió mal", "reescribir", "bajo", "Si está en curso, cancélalo. Si ya terminó, el reflog (o ORIG_HEAD) tiene la rama como estaba antes.", "git rebase --abort\n# si ya terminó:\ngit reset --hard ORIG_HEAD\n# o busca el estado previo:\ngit reflog", "avanzado"],
 ["Un merge con conflictos se puso feo", "ramas", "bajo", "Vuelve al estado anterior al merge y empieza de nuevo con calma.", "git merge --abort", "intermedio"],
 ["Hice commits en HEAD separado y me cambié de rama", "ramas", "bajo", "Git avisó que dejabas commits atrás e imprimió su hash. Crea una rama en ese hash.", "git branch experimento a1b2c3d\n# sin el hash:\ngit reflog", "avanzado"],
 ["git push fue rechazado", "remotos", "bajo", "El remoto tiene commits que tú no tienes. Tráelos y vuelve a subir. No uses --force en ramas compartidas.", "git pull --rebase\ngit push", "intermedio"],
 ["Tengo que forzar el push de mi rama tras un rebase", "remotos", "medio", "Usa --force-with-lease: falla si alguien subió algo a esa rama desde tu último fetch, en vez de borrarlo.", "git push --force-with-lease", "avanzado"],
 ["Mi rama local quedó en un estado raro y quiero dejarla igual al remoto", "remotos", "alto", "Descarta todo lo local de esa rama (commits y cambios sin guardar) y la deja idéntica a origin. Revisa antes que no haya nada que quieras.", "git fetch\ngit switch mi-rama\ngit reset --hard origin/mi-rama", "avanzado"],
 ["Apliqué un stash y quiero volver atrás", "archivos", "medio", "Si usaste pop y no hubo conflicto, el stash ya no está en la lista, pero su commit sigue en el repo unos días: git fsck lo encuentra.", "git fsck --no-reflog | awk '/dangling commit/ {print $3}'\ngit stash apply <hash>", "intermedio"],
 ["Subí un secreto (contraseña, token) al repositorio", "archivos", "alto", "Primero rota el secreto: ya está expuesto. Después, si hace falta, bórralo de la historia con git filter-repo (herramienta aparte) y fuerza el push coordinando con el equipo. GitHub también tiene push protection para evitarlo.", "# 1) revoca y cambia el secreto en el servicio\n# 2) bórralo de toda la historia:\ngit filter-repo --invert-paths --path .env\ngit push --force-with-lease --all", "experto"],
];
(function () {
  const w = $("#rsW"); if (!w) return;
  const q = $("#rsQ", w), list = $("#rsList", w);
  const RISK = { bajo: "Seguro", medio: "Con cuidado", alto: "Destructivo" };
  function render() {
    const terms = q.value.trim().split(/\s+/).filter(Boolean).map(stem);
    const hits = RESCATE.filter((r) => terms.every((t) => stem(norm(r.join(" "))).includes(t) || norm(r.join(" ")).includes(t)));
    list.innerHTML = hits.map((r) => `
      <details class="sos">
        <summary><span class="sos-q">${esc(r[0])}</span><span class="sos-r r-${r[2]}">${RISK[r[2]]}</span></summary>
        <p>${esc(r[3])}</p>
        <div class="code"><div class="ch"><span>bash · más en <a href="${viewUrl(r[5])}">${LVN[r[5]]}</a></span><button class="copy">copiar</button></div><pre>${hl(r[4])}</pre></div>
      </details>`).join("") || `<p class="cmd-empty">Nada coincide. Prueba con «perdí», «borré», «push», «commit».</p>`;
    list.querySelectorAll("pre").forEach((p, i) => (p.dataset.raw = hits[i][4]));
  }
  q.addEventListener("input", render);
  render();
})();

/* =================================================================== */
/*  REFERENCIA: glosario                                                */
/* =================================================================== */
const GLOS = [
 ["Repositorio", "La carpeta .git con toda la historia del proyecto: commits, ramas, tags y configuración. Tu carpeta de trabajo más esa historia.", "basico"],
 ["Commit", "Una foto completa del proyecto en un momento, con autor, fecha, mensaje y un puntero a su commit padre. Se identifica por su hash.", "basico"],
 ["Hash", "Identificador de 40 caracteres (SHA-1) calculado del contenido de un objeto. Basta con los primeros 7 para nombrar un commit. Git 3.0 usará SHA-256 (64 caracteres) en repos nuevos.", "basico"],
 ["Directorio de trabajo", "Tus archivos tal como los ves y editas. Es una de las tres áreas, junto con el staging y el repositorio.", "basico"],
 ["Staging (índice)", "Zona intermedia donde preparas lo que irá en el próximo commit. git add pone cosas ahí. También se llama index o área de preparación.", "basico"],
 ["Blob", "Objeto que guarda el contenido de un archivo, sin su nombre. Dos archivos idénticos comparten el mismo blob.", "basico"],
 ["Tree", "Objeto que representa una carpeta: lista nombres, permisos y el hash de cada blob o subcarpeta.", "basico"],
 ["Rama", "Un nombre que apunta a un commit. Avanza sola cuando haces commit estando en ella. Crear una cuesta casi nada.", "intermedio"],
 ["HEAD", "Indica dónde estás: normalmente apunta a una rama (HEAD → main), que a su vez apunta a un commit.", "intermedio"],
 ["HEAD separado (detached)", "HEAD apunta directo a un commit, no a una rama. Los commits que hagas ahí quedan sin nombre si te vas sin crear una rama.", "avanzado"],
 ["Fast-forward", "Fusión en la que la rama solo avanza hasta la otra, porque no hay commits nuevos de su lado. No crea commit de merge.", "intermedio"],
 ["Commit de merge", "Commit con dos (o más) padres que une dos historias.", "intermedio"],
 ["Merge base", "El ancestro común más reciente de dos ramas. Git lo usa para saber qué cambió cada lado.", "intermedio"],
 ["Conflicto", "Ambas ramas cambiaron las mismas líneas de forma distinta y Git no puede decidir. Tú eliges el resultado y lo marcas como resuelto con git add.", "intermedio"],
 ["Remoto", "Otra copia del repositorio, normalmente en un servidor (GitHub, GitLab). Se nombra; el principal suele llamarse origin.", "intermedio"],
 ["origin", "Nombre por defecto del remoto desde el que clonaste. Es solo un nombre: puedes cambiarlo o tener varios remotos.", "intermedio"],
 ["Rama remota (origin/main)", "Copia local de dónde estaba una rama del remoto la última vez que hiciste fetch. Solo se mueve con fetch, pull o push.", "intermedio"],
 ["Upstream (rama de seguimiento)", "La rama remota que sigue tu rama local. Permite usar git pull y git push sin argumentos y ver si vas adelante o atrás.", "intermedio"],
 ["Fetch", "Descargar commits del remoto y mover origin/*, sin tocar tus ramas ni tus archivos.", "intermedio"],
 ["Pull", "Fetch más integrar la rama remota en la tuya (merge, rebase o solo fast-forward, según configuración).", "intermedio"],
 ["Push", "Subir tus commits al remoto y mover allá la rama. Se rechaza si el remoto tiene commits que tú no tienes.", "intermedio"],
 ["Pull request (merge request)", "Propuesta en GitHub o GitLab para fusionar una rama, con revisión y checks. No es un comando de Git: es una función de la plataforma.", "intermedio"],
 ["Stash", "Pila donde guardas cambios sin commit para dejar el trabajo limpio y recuperarlos después.", "intermedio"],
 ["Tag", "Nombre fijo para un commit, normalmente una versión (v1.2.0). A diferencia de una rama, no avanza.", "intermedio"],
 ["Rebase", "Reaplicar tus commits encima de otra base. Crea commits nuevos (copias) y deja la historia en línea recta.", "avanzado"],
 ["Rebase interactivo", "Rebase en el que eliges qué hacer con cada commit: dejarlo, cambiar su mensaje, combinarlo, reordenarlo o borrarlo.", "avanzado"],
 ["Squash", "Combinar varios commits en uno solo.", "avanzado"],
 ["Cherry-pick", "Copiar un commit concreto a otra rama.", "avanzado"],
 ["Reset", "Mover la rama actual a otro commit, y opcionalmente igualar el staging (--mixed) y el trabajo (--hard).", "avanzado"],
 ["Revert", "Commit nuevo que deshace los cambios de otro. Seguro en ramas compartidas.", "avanzado"],
 ["Reflog", "Registro local de los movimientos de HEAD y de cada rama. Permite recuperar commits «perdidos» durante semanas.", "avanzado"],
 ["ORIG_HEAD", "Referencia que Git deja apuntando a donde estabas antes de una operación peligrosa (reset, rebase, merge).", "avanzado"],
 ["Force push", "Push que reemplaza la rama remota aunque se pierdan commits. Con --force-with-lease solo lo hace si nadie subió nada nuevo.", "avanzado"],
 ["Bisect", "Búsqueda binaria en el historial para encontrar el commit que introdujo un error.", "avanzado"],
 ["Ref", "Cualquier nombre que apunta a un commit: ramas, tags, ramas remotas, HEAD.", "experto"],
 ["Packfile", "Archivo que agrupa muchos objetos comprimidos y guarda versiones parecidas como diferencias (deltas).", "experto"],
 ["Reftable", "Formato nuevo para guardar las refs en una tabla en vez de un archivo por rama. Será el predeterminado en Git 3.0.", "experto"],
 ["Plumbing y porcelain", "Plumbing son los comandos de bajo nivel (cat-file, hash-object); porcelain, los pensados para personas (commit, switch).", "experto"],
 ["Hook", "Script que Git ejecuta en un momento concreto (antes de un commit, antes de un push) para validar o automatizar.", "experto"],
 ["Worktree", "Carpeta de trabajo adicional conectada al mismo repositorio, con su propia rama.", "experto"],
 ["Submódulo", "Otro repositorio dentro del tuyo, fijado a un commit exacto.", "experto"],
 ["Sparse-checkout", "Tener en disco solo algunas carpetas de un repositorio grande.", "experto"],
 ["Partial clone", "Clonar sin descargar los contenidos de los archivos hasta que hagan falta (--filter=blob:none).", "experto"],
 ["Shallow clone", "Clonar solo los últimos commits (--depth). Útil en CI; limita lo que puedes hacer con la historia.", "experto"],
 ["Rerere", "«Reuse recorded resolution»: Git recuerda cómo resolviste un conflicto y lo repite.", "experto"],
 ["Trunk-based development", "Estrategia en la que todos integran a main varias veces al día con ramas de corta vida.", "experto"],
];
(function () {
  const w = $("#glW"); if (!w) return;
  const q = $("#glQ", w), list = $("#glList", w);
  function render() {
    const t = norm(q.value.trim());
    const hits = GLOS.filter((g) => !t || norm(g[0] + " " + g[1]).includes(t)).sort((a, b) => a[0].localeCompare(b[0], "es"));
    list.innerHTML = hits.map((g) => `<div class="gl-i"><dt>${esc(g[0])}</dt><dd>${esc(g[1])} <a href="${viewUrl(g[2])}">${LVN[g[2]]}</a></dd></div>`).join("") || `<p class="cmd-empty">No está en el glosario. Prueba en el buscador de comandos.</p>`;
  }
  q.addEventListener("input", render);
  render();
})();

/* =================================================================== */
/*  QUIZZES                                                             */
/* =================================================================== */
const QZ = {
 basico: [
  ["¿Qué guarda Git en cada commit?", ["Solo las líneas que cambiaron", "Una foto completa del proyecto (reutilizando lo que no cambió)", "Una copia comprimida de la carpeta entera, siempre duplicada", "Solo los archivos que agregaste con git add"], 1, "Cada commit apunta a un árbol completo; los archivos sin cambios reutilizan el mismo blob, por eso no ocupa el doble."],
  ["Editaste app.js y estilos.css, pero solo hiciste git add app.js. ¿Qué entra en el próximo commit?", ["Los dos archivos", "Solo app.js", "Ninguno", "Solo estilos.css"], 1, "El commit guarda el staging. estilos.css sigue modificado en el directorio de trabajo."],
  ["¿Qué compara git diff sin argumentos?", ["El último commit con el anterior", "Tu directorio de trabajo con el staging", "El staging con el último commit", "Tu rama con origin"], 1, "Para staging vs último commit usa git diff --staged."],
  ["Agregaste un archivo al staging por error. ¿Qué haces?", ["git reset --hard", "git restore --staged archivo", "git rm archivo", "Borrar el archivo"], 1, "Lo saca del staging y conserva tus cambios."],
  ["¿Qué pasa con el hash de un commit si cambias una sola letra de un archivo y vuelves a commitear?", ["Nada, el hash es del mensaje", "El commit nuevo tiene otro hash, porque el contenido cambió", "Se reutiliza el hash anterior", "Git rechaza el commit"], 1, "El hash se calcula del contenido: blob distinto, árbol distinto, commit distinto."],
  ["Ya hiciste push del último commit y notas un error en el mensaje. ¿Qué es lo más sensato?", ["git commit --amend y push normal", "Dejarlo, o corregirlo con amend solo si nadie más usa la rama (y forzar con lease)", "Borrar el repositorio", "git restore"], 1, "amend crea un commit nuevo: si ya está publicado, reescribes historia compartida."],
 ],
 intermedio: [
  ["¿Qué es una rama en Git?", ["Una copia de la carpeta del proyecto", "Un nombre que apunta a un commit", "Un servidor remoto", "Un tipo de commit"], 1, "Por eso crear ramas es instantáneo: Git solo escribe un hash."],
  ["main está en C y feature en E, y E desciende de C. Estás en main y haces git merge feature. ¿Qué pasa?", ["Se crea un commit de merge", "Fast-forward: main avanza hasta E", "Conflicto", "feature retrocede"], 1, "Si no hay commits nuevos en main, basta con adelantar la etiqueta."],
  ["¿Qué hace git fetch?", ["Descarga y fusiona en tu rama", "Descarga commits y mueve origin/*, sin tocar tus ramas ni tus archivos", "Sube tus commits", "Borra ramas viejas"], 1, "pull = fetch + integrar."],
  ["Tu push es rechazado porque el remoto tiene commits que no tienes. ¿Qué haces?", ["git push --force", "git pull --rebase (o pull) y luego git push", "Borrar la rama remota", "Clonar de nuevo"], 1, "--force borraría los commits de tus compañeros."],
  ["Durante un conflicto ves <<<<<<< HEAD … ======= … >>>>>>> feature. ¿Qué parte es la tuya?", ["La de abajo", "La de arriba, entre <<<<<<< HEAD y =======", "Ninguna", "Ambas son de feature"], 1, "HEAD es tu rama actual; lo de abajo viene de la rama que fusionas."],
  ["Tienes cambios a medias y debes cambiarte de rama ya. ¿Qué usas para guardarlos sin hacer commit?", ["git tag", "git stash", "git reset", "git revert"], 1, "git stash pop los devuelve después."],
 ],
 avanzado: [
  ["¿Qué hace git rebase main estando en feature?", ["Fusiona main con un commit de merge", "Reaplica los commits de feature encima de main, creando commits nuevos", "Mueve main hasta feature", "Borra feature"], 1, "Las copias tienen hashes nuevos; los originales quedan en el reflog."],
  ["¿Cuál es la regla de oro del rebase?", ["Nunca hacer rebase", "No reescribir commits que otras personas ya tienen", "Hacer rebase solo en main", "Siempre usar --force"], 1, "Si otros basaron trabajo en esos commits, sus historias divergen de la tuya."],
  ["Quieres deshacer el último commit y dejar sus cambios listos en staging. ¿Qué usas?", ["git reset --hard HEAD~1", "git reset --soft HEAD~1", "git revert HEAD", "git restore ."], 1, "soft solo mueve la rama; staging y trabajo quedan como estaban."],
  ["Un commit con un bug ya está en main en GitHub. ¿Cómo lo deshaces sin reescribir la historia?", ["git reset --hard y push --force", "git revert <commit>", "git commit --amend", "git rebase -i"], 1, "revert agrega un commit que deshace el cambio; se sube con push normal."],
  ["Hiciste git reset --hard HEAD~3 por error. ¿Dónde encuentras los commits?", ["Ya no existen", "En git reflog", "En git stash", "En origin"], 1, "El reflog guarda dónde estuvo HEAD; vuelve con git reset --hard HEAD@{1}."],
  ["¿Por qué preferir git push --force-with-lease a --force?", ["Es más rápido", "Falla si alguien subió commits a la rama desde tu último fetch, en vez de borrarlos", "No reescribe la historia", "Funciona sin internet"], 1, "Protege el trabajo ajeno que todavía no viste."],
 ],
 experto: [
  ["¿Qué contiene el archivo .git/refs/heads/main?", ["Todos los commits de main", "El hash del commit al que apunta main", "Los archivos de la rama", "La configuración de la rama"], 1, "Una rama es literalmente un archivo con un hash (o una entrada en reftable)."],
  ["¿Por qué cambiar un commit viejo cambia el hash de todos los que vienen después?", ["Por una regla de GitHub", "Porque cada commit incluye el hash de su padre", "Porque Git recalcula todo cada día", "No los cambia"], 1, "Es una cadena de hashes: por eso la historia es a prueba de manipulación."],
  ["Un hook pre-commit sale con código distinto de 0. ¿Qué pasa?", ["Nada", "El commit se cancela", "El commit se hace igual con una advertencia", "Se borra el hook"], 1, "Puedes saltarlo con --no-verify, pero es justo lo que el hook quiere evitar."],
  ["En un monorepo enorme solo necesitas apps/web. ¿Qué combinación sirve?", ["git clone --depth 1 y nada más", "Partial clone (--filter=blob:none) más sparse-checkout", "git submodule", "git stash"], 1, "Partial clone evita descargar contenidos que no usas; sparse-checkout deja en disco solo tus carpetas."],
  ["¿Qué guarda el repositorio padre de un submódulo?", ["Todos los archivos del submódulo", "Un puntero a un commit exacto del otro repositorio (más .gitmodules)", "Solo la URL", "Nada"], 1, "Por eso actualizar el submódulo requiere un commit en el padre."],
  ["¿Qué cambia Git 3.0 por defecto en repositorios nuevos?", ["Elimina git checkout", "SHA-256 como hash y reftable para las refs", "Obliga a usar GitHub", "Quita las ramas"], 1, "checkout sigue existiendo; también se espera main como rama inicial."],
 ],
};
$$("[data-quiz]").forEach((w) => {
  const l = w.dataset.quiz, qs = QZ[l], box = $(".wb", w); const ans = {};
  if (!qs) return;
  $(".tt", w).textContent = qs.length + " preguntas · necesitas " + qs.length + "/" + qs.length;
  box.innerHTML = qs.map((q, i) => '<div class="q" data-q="' + i + '"><p>' + (i + 1) + ". " + esc(q[0]) + "</p>" + q[1].map((o, j) => '<button class="opt" data-o="' + j + '">' + esc(o) + "</button>").join("") + '<div class="why">' + esc(q[3]) + "</div></div>").join("") + '<div class="qscore"></div>';
  const sc = $(".qscore", box);
  function upd() {
    const n = Object.keys(ans).length, ok = Object.values(ans).filter(Boolean).length;
    if (state.quiz[l]) sc.innerHTML = '<span style="color:var(--ok)">✓ Quiz aprobado</span> <button class="btn sm" style="margin-left:10px" data-retry>reintentar</button>';
    else if (n === qs.length) {
      sc.innerHTML = ok === qs.length ? '<span style="color:var(--ok)">✓ ' + ok + "/" + qs.length + " ¡Aprobado!</span>" : '<span style="color:var(--warn)">' + ok + "/" + qs.length + '</span> Revisa las explicaciones y <button class="btn sm" data-retry>reintenta</button>';
      if (ok === qs.length) { state.quiz[l] = true; save(); renderProgress(); toast("✓ Nivel aprobado"); }
    } else sc.textContent = n + "/" + qs.length + " respondidas";
  }
  box.addEventListener("click", (e) => {
    if (e.target.closest("[data-retry]")) { Object.keys(ans).forEach((k) => delete ans[k]); delete state.quiz[l]; save(); renderProgress(); $$(".q", box).forEach((q) => { q.classList.remove("ans"); $$(".opt", q).forEach((o) => o.classList.remove("ok", "no")); }); upd(); return; }
    const o = e.target.closest(".opt"); if (!o) return; const q = o.closest(".q"), i = +q.dataset.q; if (ans[i] !== undefined) return;
    const j = +o.dataset.o; ans[i] = j === qs[i][2]; q.classList.add("ans"); o.classList.add(ans[i] ? "ok" : "no"); if (!ans[i]) $$(".opt", q)[qs[i][2]].classList.add("ok"); upd();
  });
  upd();
});

/* ---------- contadores ---------- */
const nLessons = window.__GIT ? Object.values(window.__GIT.lessons).flat().filter((id) => !id.endsWith("q")).length : $$("article.lesson").filter((a) => !a.id.endsWith("q")).length;
const nQuiz = Object.values(QZ).reduce((a, b) => a + b.length, 0);
$$('[data-count="lessons"]').forEach((e) => (e.textContent = nLessons));
$$('[data-count="quiz"]').forEach((e) => (e.textContent = nQuiz));
$$('[data-count="cmds"]').forEach((e) => (e.textContent = CMDS.length));
$$('[data-count="rescate"]').forEach((e) => (e.textContent = RESCATE.length));
$$('[data-count="glos"]').forEach((e) => (e.textContent = GLOS.length));
if (window.__GIT) $$('[data-count="escenas"]').forEach((e) => (e.textContent = window.__GIT.escenas));

renderProgress();
route();
})();
