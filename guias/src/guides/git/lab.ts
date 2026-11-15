/*
  Laboratorio de Git: una terminal donde escribes comandos de Git y ves el grafo cambiar en vivo.

  Simula un repositorio en memoria (commits, ramas, tags, HEAD, reflog) con el comportamiento real
  de los comandos más usados. No toca archivos: los commits son solo nodos con mensaje. Cada
  `[data-lab]` de la página monta un laboratorio; su valor elige el escenario inicial y el desafío.
*/
import { gsap } from "gsap";
import { grafo, CW, RH, type Grafo, type Nodo, type Ref } from "./anim/_kit";
import "./lab.css";

type Commit = { id: string; parents: string[]; msg: string; seq: number; copyOf?: string };
type Head = { branch: string } | { detached: string };
type Repo = {
  commits: Map<string, Commit>;
  branches: Map<string, string>;
  tags: Map<string, string>;
  remotes: Map<string, string>; // "origin/main" -> id
  head: Head;
  reflog: { id: string; msg: string }[];
  seq: number;
  letter: number;
  prev?: string; // rama anterior, para "git switch -"
  staged: boolean; // hay cambios en staging (simulado)
};

/* ------------------------------------------------------------------ */
/*  Motor                                                              */
/* ------------------------------------------------------------------ */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
class GitError extends Error {}

function nuevo(): Repo {
  return { commits: new Map(), branches: new Map(), tags: new Map(), remotes: new Map(), head: { branch: "main" }, reflog: [], seq: 0, letter: 0, staged: false };
}
function clone(r: Repo): Repo {
  return {
    ...r,
    commits: new Map([...r.commits].map(([k, v]) => [k, { ...v, parents: [...v.parents] }])),
    branches: new Map(r.branches), tags: new Map(r.tags), remotes: new Map(r.remotes),
    head: { ...r.head } as Head, reflog: [...r.reflog],
  };
}
function nextId(r: Repo, base?: string) {
  if (base) {
    // copia: D → D′ → D″ → D‴
    const root = base.replace(/[′″‴]+$/, "");
    for (const mark of ["′", "″", "‴", "⁗"]) if (!r.commits.has(root + mark)) return root + mark;
  }
  let id: string;
  do {
    const n = r.letter++;
    id = LETTERS[n % 26] + (n >= 26 ? String(Math.floor(n / 26) + 1) : "");
  } while (r.commits.has(id));
  return id;
}
const headId = (r: Repo): string | undefined => ("branch" in r.head ? r.branches.get(r.head.branch) : r.head.detached);
const headLabel = (r: Repo) => ("branch" in r.head ? r.head.branch : "detached HEAD");

function addCommit(r: Repo, parents: string[], msg: string, copyOf?: string): string {
  const id = nextId(r, copyOf);
  r.commits.set(id, { id, parents, msg, seq: r.seq++, copyOf });
  return id;
}
function moveHead(r: Repo, id: string, why: string) {
  if ("branch" in r.head) r.branches.set(r.head.branch, id);
  else r.head = { detached: id };
  r.reflog.unshift({ id, msg: why });
}
function ancestors(r: Repo, id: string): Set<string> {
  const out = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const x = stack.pop()!;
    if (out.has(x)) continue;
    out.add(x);
    r.commits.get(x)?.parents.forEach((p) => stack.push(p));
  }
  return out;
}
function isAncestor(r: Repo, a: string, b: string) { return ancestors(r, b).has(a); }
function mergeBase(r: Repo, a: string, b: string): string | undefined {
  const A = ancestors(r, a);
  // el ancestro común más reciente (mayor seq) que no es ancestro de otro común
  const common = [...ancestors(r, b)].filter((x) => A.has(x));
  common.sort((x, y) => r.commits.get(y)!.seq - r.commits.get(x)!.seq);
  return common[0];
}

/** Resuelve una revisión: hash, rama, tag, origin/x, HEAD, X~n, X^, X^2, @{-1}, HEAD@{n}. */
function resolve(r: Repo, rev: string): string {
  const m = rev.match(/^(.*?)((?:[~^]\d*)*)$/)!;
  let base = m[1] || "HEAD";
  const ops = m[2];
  let id: string | undefined;
  const rl = base.match(/^(?:HEAD)?@\{(\d+)\}$/);
  if (rl) id = r.reflog[+rl[1]]?.id;
  else if (base === "HEAD" || base === "@") id = headId(r);
  else if (base === "@{-1}" || base === "-") id = r.prev ? r.branches.get(r.prev) : undefined;
  else id = r.branches.get(base) ?? r.tags.get(base) ?? r.remotes.get(base) ?? (r.commits.has(base) ? base : undefined)
    ?? [...r.commits.keys()].find((k) => k.toLowerCase() === base.toLowerCase());
  if (!id) throw new GitError(`fatal: '${rev}' no es una revisión conocida (ni rama, ni tag, ni commit).`);
  for (const op of ops.match(/[~^]\d*/g) || []) {
    const n = op.length > 1 ? +op.slice(1) : 1;
    if (op[0] === "~") for (let k = 0; k < n; k++) {
      const c: Commit = r.commits.get(id!)!;
      if (!c.parents[0]) throw new GitError(`fatal: '${rev}' va más atrás del primer commit.`);
      id = c.parents[0];
    }
    else {
      const p: string | undefined = r.commits.get(id!)!.parents[n - 1];
      if (!p) throw new GitError(`fatal: '${rev}': ese commit no tiene padre número ${n}.`);
      id = p;
    }
  }
  return id!;
}

/** Commits de `from` que no están en `upto`, del más viejo al más nuevo (solo commits no-merge). */
function rango(r: Repo, upto: string, from: string): string[] {
  const exclude = ancestors(r, upto);
  return [...ancestors(r, from)].filter((x) => !exclude.has(x)).sort((a, b) => r.commits.get(a)!.seq - r.commits.get(b)!.seq);
}

type Out = { text: string; cls?: "ok" | "bad" | "warn" | "dim" };
const ok = (text: string): Out => ({ text, cls: "ok" });
const warn = (text: string): Out => ({ text, cls: "warn" });
const dim = (text: string): Out => ({ text, cls: "dim" });

function tokens(line: string): string[] {
  const out: string[] = [];
  line.replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (_, a, b, c) => { out.push(a ?? b ?? c); return ""; });
  return out;
}

function ejecutar(r: Repo, line: string): Out[] {
  const t = tokens(line.trim());
  if (!t.length) return [];
  if (t[0] !== "git") throw new GitError(`Este laboratorio solo entiende comandos de git. Prueba: git commit`);
  const [cmd, ...args] = t.slice(1);
  const flags = new Set(args.filter((a) => a.startsWith("-")));
  const VAL = ["-m", "-c", "-C", "-b", "-B", "--onto", "--create"]; // flags que llevan un valor
  const pos = args.filter((a, i) => !a.startsWith("-") && !VAL.includes(args[i - 1] ?? ""));
  const valueOf = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  const h = headId(r);

  switch (cmd) {
    case undefined:
    case "help":
      return [dim(AYUDA)];

    case "commit": {
      if (flags.has("--amend")) {
        if (!h) throw new GitError("fatal: no hay un commit que corregir.");
        const old = r.commits.get(h)!;
        const id = addCommit(r, [...old.parents], valueOf("-m") ?? old.msg, h);
        moveHead(r, id, "commit (amend): " + (valueOf("-m") ?? old.msg));
        return [ok(`[${headLabel(r)} ${id}] ${r.commits.get(id)!.msg}`), dim(`${h} quedó sin referencia (sigue en el reflog).`)];
      }
      const msg = valueOf("-m") ?? `cambio ${r.seq + 1}`;
      const id = addCommit(r, h ? [h] : [], msg);
      moveHead(r, id, "commit: " + msg);
      r.staged = false;
      return [ok(`[${headLabel(r)} ${id}] ${msg}`)];
    }

    case "branch": {
      const name = pos[0];
      if (flags.has("-d") || flags.has("-D") || flags.has("--delete")) {
        const n = pos[0];
        if (!n || !r.branches.has(n)) throw new GitError(`error: no existe la rama '${n ?? ""}'.`);
        if ("branch" in r.head && r.head.branch === n) throw new GitError(`error: no puedes borrar la rama '${n}' porque estás en ella. Cámbiate antes con git switch.`);
        const tip = r.branches.get(n)!;
        if (flags.has("-d") && h && !isAncestor(r, tip, h)) throw new GitError(`error: the branch '${n}' is not fully merged.\nhint: If you are sure you want to delete it, run 'git branch -D ${n}'.`);
        r.branches.delete(n);
        return [ok(`Deleted branch ${n} (was ${tip}).`)];
      }
      if (flags.has("-f") || flags.has("--force")) {
        if (!name) throw new GitError("uso: git branch -f <rama> <commit>");
        if ("branch" in r.head && r.head.branch === name) throw new GitError(`fatal: no puedes forzar la rama actual '${name}'. Usa git reset.`);
        r.branches.set(name, resolve(r, pos[1] ?? "HEAD"));
        return [ok(`${name} ahora apunta a ${r.branches.get(name)}.`)];
      }
      if (!name) {
        return [...r.branches.keys()].sort().map((b) => ({ text: ("branch" in r.head && r.head.branch === b ? "* " : "  ") + b, cls: "branch" in r.head && r.head.branch === b ? "ok" as const : undefined }));
      }
      if (r.branches.has(name)) throw new GitError(`fatal: a branch named '${name}' already exists`);
      if (!/^[\w./-]+$/.test(name) || name.endsWith("/") || name.includes("..")) throw new GitError(`fatal: '${name}' no es un nombre de rama válido.`);
      r.branches.set(name, resolve(r, pos[1] ?? "HEAD"));
      return [ok(`Creada la rama ${name} en ${r.branches.get(name)}. Sigues en ${headLabel(r)}: cámbiate con git switch ${name}.`)];
    }

    case "switch":
    case "checkout": {
      const create = cmd === "switch" ? (valueOf("-c") ?? valueOf("-C") ?? valueOf("--create")) : (valueOf("-b") ?? valueOf("-B"));
      if (create) {
        if (r.branches.has(create) && !flags.has("-C") && !flags.has("-B")) throw new GitError(`fatal: a branch named '${create}' already exists`);
        const startArg = args[args.indexOf(create) + 1];
        const start = startArg && !startArg.startsWith("-") ? resolve(r, startArg) : h!;
        r.branches.set(create, start);
        r.prev = "branch" in r.head ? r.head.branch : r.prev;
        r.head = { branch: create };
        r.reflog.unshift({ id: start, msg: `checkout: moving to ${create}` });
        return [ok(`Switched to a new branch '${create}'`)];
      }
      let target = pos[0];
      if (!target) throw new GitError(`uso: git ${cmd} <rama>`);
      if (target === "-") { if (!r.prev) throw new GitError("fatal: no hay una rama anterior."); target = r.prev; }
      if (r.branches.has(target) && !flags.has("--detach")) {
        r.prev = "branch" in r.head ? r.head.branch : r.prev;
        r.head = { branch: target };
        r.reflog.unshift({ id: r.branches.get(target)!, msg: `checkout: moving to ${target}` });
        return [ok(`Switched to branch '${target}'`)];
      }
      // origin/x sin rama local: switch la crea y la conecta (--guess)
      if (cmd === "switch" && r.remotes.has("origin/" + target)) {
        r.branches.set(target, r.remotes.get("origin/" + target)!);
        r.prev = "branch" in r.head ? r.head.branch : r.prev;
        r.head = { branch: target };
        return [ok(`branch '${target}' set up to track 'origin/${target}'.`), ok(`Switched to a new branch '${target}'`)];
      }
      if (cmd === "switch" && !flags.has("--detach")) throw new GitError(`fatal: se esperaba una rama, se recibió '${target}'.\nPara ir a un commit sin rama usa: git switch --detach ${target}`);
      const id = resolve(r, target);
      r.prev = "branch" in r.head ? r.head.branch : r.prev;
      r.head = { detached: id };
      r.reflog.unshift({ id, msg: `checkout: moving to ${target}` });
      return [warn(`HEAD is now at ${id} ${r.commits.get(id)!.msg}`), warn("You are in 'detached HEAD' state."), dim("HEAD separado: puedes mirar y hacer commits de prueba. Para conservarlos, crea una rama con git switch -c <nombre>.")];
    }

    case "merge": {
      if (flags.has("--abort")) return [dim("No hay un merge en curso (en este laboratorio los merges no generan conflictos).")];
      const src = pos[0];
      if (!src) throw new GitError("uso: git merge <rama>");
      const other = resolve(r, src);
      if (!h) throw new GitError("fatal: no hay commits todavía.");
      if (isAncestor(r, other, h)) return [dim("Already up to date.")];
      if (isAncestor(r, h, other) && !flags.has("--no-ff")) {
        moveHead(r, other, `merge ${src}: Fast-forward`);
        return [dim(`Updating ${h}..${other}`), ok("Fast-forward: la rama solo avanzó, sin commit nuevo.")];
      }
      if (flags.has("--ff-only")) throw new GitError("fatal: Not possible to fast-forward, aborting.");
      const msg = valueOf("-m") ?? `Merge branch '${src}'`;
      const id = addCommit(r, [h, other], msg);
      moveHead(r, id, `merge ${src}: Merge made by the 'ort' strategy.`);
      return [ok("Merge made by the 'ort' strategy."), dim(`Commit ${id} con dos padres: ${h} y ${other}.`)];
    }

    case "rebase": {
      const onto = valueOf("--onto");
      const upstream = pos.filter((p) => p !== onto)[0];
      if (!upstream) throw new GitError("uso: git rebase <rama>   (o git rebase --onto <nueva-base> <vieja-base>)");
      if (!h) throw new GitError("fatal: no hay commits todavía.");
      const up = resolve(r, upstream);
      const base = onto ? resolve(r, onto) : up;
      const list = rango(r, up, h).filter((x) => r.commits.get(x)!.parents.length < 2);
      if (!list.length || (isAncestor(r, up, h) && !onto && r.commits.get(list[0])!.parents[0] === up)) {
        if (isAncestor(r, h, up)) { moveHead(r, up, `rebase: fast-forward a ${upstream}`); return [ok(`Rama avanzada hasta ${upstream} (fast-forward).`)]; }
        return [dim(`Current branch ${headLabel(r)} is up to date.`)];
      }
      const already = ancestors(r, base);
      let tip = base;
      const out: Out[] = [];
      for (const x of list) {
        const c = r.commits.get(x)!;
        if (already.has(x)) continue;
        tip = addCommit(r, [tip], c.msg, x);
        out.push(dim(`aplicando ${x} → ${tip}  ${c.msg}`));
      }
      moveHead(r, tip, `rebase (finish): returning to ${headLabel(r)}`);
      out.push(ok(`Successfully rebased and updated ${"branch" in r.head ? "refs/heads/" + r.head.branch : "HEAD"}.`));
      out.push(dim(`Los commits originales quedaron sin referencia (punteados). Siguen en git reflog.`));
      return out;
    }

    case "cherry-pick": {
      if (!pos.length) throw new GitError("uso: git cherry-pick <commit>...");
      if (!h) throw new GitError("fatal: no hay commits todavía.");
      const out: Out[] = [];
      let tip = h;
      for (const p of pos) {
        const src = resolve(r, p);
        const c = r.commits.get(src)!;
        if (c.parents.length > 1) throw new GitError(`error: ${src} es un merge; cherry-pick de merges necesita -m (no simulado aquí).`);
        tip = addCommit(r, [tip], c.msg + (flags.has("-x") ? ` (cherry picked from ${src})` : ""), src);
        out.push(ok(`[${headLabel(r)} ${tip}] ${c.msg}  (copia de ${src})`));
      }
      moveHead(r, tip, "cherry-pick");
      return out;
    }

    case "reset": {
      const target = resolve(r, pos[0] ?? "HEAD");
      const mode = flags.has("--hard") ? "hard" : flags.has("--soft") ? "soft" : "mixed";
      moveHead(r, target, `reset: moving to ${pos[0] ?? "HEAD"}`);
      const msg = mode === "hard" ? "Trabajo y staging quedaron iguales a " + target + ". Lo no commiteado se perdió." : mode === "soft" ? "Los cambios de los commits deshechos quedaron en staging, listos para otro commit." : "Los cambios de los commits deshechos quedaron en tu directorio de trabajo, sin agregar.";
      r.staged = mode === "soft";
      return [mode === "hard" ? warn(`HEAD is now at ${target} ${r.commits.get(target)!.msg}`) : ok(`${"branch" in r.head ? r.head.branch : "HEAD"} → ${target} (--${mode})`), dim(msg)];
    }

    case "revert": {
      const src = resolve(r, pos[0] ?? "HEAD");
      if (!h) throw new GitError("fatal: no hay commits todavía.");
      const c = r.commits.get(src)!;
      if (c.parents.length > 1 && !flags.has("-m")) throw new GitError(`error: el commit ${src} es un merge pero no diste la opción -m (usa git revert -m 1 ${src}).`);
      const id = addCommit(r, [h], `Revert "${c.msg}"`);
      moveHead(r, id, "revert");
      return [ok(`[${headLabel(r)} ${id}] Revert "${c.msg}"`), dim(`Nuevo commit que deshace ${src}. La historia no se reescribe.`)];
    }

    case "tag": {
      const name = pos[0];
      if (flags.has("-d")) { if (!r.tags.delete(name)) throw new GitError(`error: tag '${name}' no encontrado.`); return [ok(`Eliminado el tag '${name}'.`)]; }
      if (!name) return r.tags.size ? [...r.tags.keys()].map((k) => ({ text: k })) : [dim("(sin tags)")];
      if (r.tags.has(name)) throw new GitError(`fatal: el tag '${name}' ya existe.`);
      r.tags.set(name, resolve(r, pos[1] ?? "HEAD"));
      return [ok(`Tag ${name} en ${r.tags.get(name)}.`)];
    }

    case "log": {
      const start = resolve(r, pos[0] ?? "HEAD");
      const list = [...ancestors(r, start)].sort((a, b) => r.commits.get(b)!.seq - r.commits.get(a)!.seq).slice(0, 12);
      return list.map((id) => {
        const names = [...r.branches].filter(([, v]) => v === id).map(([k]) => ("branch" in r.head && r.head.branch === k ? "HEAD -> " : "") + k)
          .concat([...r.remotes].filter(([, v]) => v === id).map(([k]) => k))
          .concat([...r.tags].filter(([, v]) => v === id).map(([k]) => "tag: " + k));
        if ("detached" in r.head && r.head.detached === id) names.unshift("HEAD");
        return { text: `${id} ${names.length ? "(" + names.join(", ") + ") " : ""}${r.commits.get(id)!.msg}` };
      });
    }

    case "reflog":
      return r.reflog.slice(0, 10).map((e, i) => ({ text: `${e.id} HEAD@{${i}}: ${e.msg}` }));

    case "status": {
      const out: Out[] = [{ text: "branch" in r.head ? `On branch ${r.head.branch}` : `HEAD detached at ${r.head.detached}` }];
      if ("branch" in r.head && r.remotes.has("origin/" + r.head.branch)) {
        const loc = h!, rem = r.remotes.get("origin/" + r.head.branch)!;
        const ahead = rango(r, rem, loc).length, behind = rango(r, loc, rem).length;
        out.push(dim(ahead && behind ? `Your branch and 'origin/${r.head.branch}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.` : ahead ? `Your branch is ahead of 'origin/${r.head.branch}' by ${ahead} commit${ahead > 1 ? "s" : ""}.` : behind ? `Your branch is behind 'origin/${r.head.branch}' by ${behind} commit${behind > 1 ? "s" : ""}.` : `Your branch is up to date with 'origin/${r.head.branch}'.`));
      }
      out.push(dim(r.staged ? "Changes to be committed: (los cambios que dejó el reset --soft)" : "nothing to commit, working tree clean"));
      return out;
    }

    case "push":
    case "pull":
    case "fetch":
      return [warn(`Este laboratorio no tiene servidor: ${cmd} se practica en las animaciones de la lección de remotos.`)];

    case "add":
      r.staged = true;
      return [dim("(En el laboratorio no hay archivos: git commit crea el commit directamente.)")];

    case "init":
      return [dim("El repositorio ya está iniciado. Usa el botón Reiniciar para empezar de cero.")];

    default:
      throw new GitError(`git: '${cmd}' no está en este laboratorio. Escribe git help para ver la lista.`);
  }
}

const AYUDA = `Comandos disponibles:
  git commit [-m "mensaje"] [--amend]
  git branch [nombre [desde]] | -d/-D nombre | -f nombre commit
  git switch nombre | -c nueva [desde] | --detach commit | -
  git checkout nombre | -b nueva | commit
  git merge rama [--no-ff | --ff-only]
  git rebase rama | --onto nueva-base vieja-base
  git cherry-pick commit...  [-x]
  git reset [--soft | --mixed | --hard] commit
  git revert commit
  git tag nombre [commit]
  git log [rama] · git status · git reflog
Revisiones: A, main, HEAD, HEAD~2, main^, HEAD@{1}
Atajos: ↑ ↓ historial · Tab completa`;

/* ------------------------------------------------------------------ */
/*  Escenarios y desafíos                                              */
/* ------------------------------------------------------------------ */
type Escenario = {
  title: string;
  build: (r: Repo) => void;
  goal?: string;
  hint?: string;
  check?: (r: Repo) => boolean;
  solution?: string;
};
function seed(r: Repo, spec: [string, string | string[] | null, string][], branches: Record<string, string>, head: string) {
  for (const [id, p, msg] of spec) r.commits.set(id, { id, parents: p ? (Array.isArray(p) ? p : [p]) : [], msg, seq: r.seq++ });
  r.letter = Math.max(...spec.map(([id]) => LETTERS.indexOf(id[0]))) + 1;
  for (const k in branches) {
    if (k.startsWith("origin/")) r.remotes.set(k, branches[k]);
    else if (k.startsWith("tag:")) r.tags.set(k.slice(4), branches[k]);
    else r.branches.set(k, branches[k]);
  }
  r.head = r.commits.has(head) ? { detached: head } : { branch: head };
  r.reflog = [{ id: headId(r)!, msg: "inicio del laboratorio" }];
}

const ESCENARIOS: Record<string, Escenario> = {
  libre: {
    title: "Repositorio libre",
    build: (r) => seed(r, [["A", null, "primer commit"]], { main: "A" }, "main"),
  },
  ramas: {
    title: "Desafío: dos ramas",
    build: (r) => seed(r, [["A", null, "primer commit"], ["B", "A", "agrega portada"]], { main: "B" }, "main"),
    goal: "Crea una rama <code>feature</code>, haz dos commits en ella y uno en <code>main</code>, de modo que las dos ramas diverjan.",
    hint: "git switch -c feature · git commit · git commit · git switch main · git commit",
    check: (r) => {
      const f = r.branches.get("feature"), m = r.branches.get("main");
      if (!f || !m) return false;
      const b = mergeBase(r, f, m);
      return !!b && rango(r, m, f).length >= 2 && rango(r, f, m).length >= 1;
    },
    solution: "git switch -c feature\ngit commit -m \"busca\"\ngit commit -m \"filtra\"\ngit switch main\ngit commit -m \"arregla portada\"",
  },
  merge: {
    title: "Desafío: integrar con merge",
    build: (r) => seed(r, [["A", null, "primer commit"], ["B", "A", "agrega portada"], ["C", "B", "corrige estilos"], ["D", "B", "agrega búsqueda"], ["E", "D", "filtra resultados"]], { main: "C", feature: "E" }, "main"),
    goal: "Integra <code>feature</code> en <code>main</code> con un commit de merge, y luego borra la rama <code>feature</code> sin perder nada.",
    hint: "Estando en main: git merge feature · después git branch -d feature",
    check: (r) => !r.branches.has("feature") && [...r.commits.values()].some((c) => c.parents.length === 2 && isAncestor(r, c.id, r.branches.get("main")!) && c.parents.includes("E")),
    solution: "git merge feature\ngit branch -d feature",
  },
  rebase: {
    title: "Desafío: historia lineal con rebase",
    build: (r) => seed(r, [["A", null, "primer commit"], ["B", "A", "agrega portada"], ["C", "B", "corrige estilos"], ["F", "C", "actualiza dependencias"], ["D", "B", "agrega búsqueda"], ["E", "D", "filtra resultados"]], { main: "F", feature: "E" }, "feature"),
    goal: "Deja los commits de <code>feature</code> encima de <code>main</code> y luego adelanta <code>main</code> hasta ellos: historia en línea recta, sin commits de merge.",
    hint: "git rebase main · git switch main · git merge feature (será fast-forward)",
    check: (r) => {
      const m = r.branches.get("main"), f = r.branches.get("feature");
      return !!m && m === f && isAncestor(r, "F", m) && [...ancestors(r, m)].every((x) => r.commits.get(x)!.parents.length < 2);
    },
    solution: "git rebase main\ngit switch main\ngit merge feature",
  },
  rescate: {
    title: "Desafío: recupera lo perdido",
    build: (r) => {
      seed(r, [["A", null, "primer commit"], ["B", "A", "agrega carrito"], ["C", "B", "agrega pagos"], ["D", "C", "agrega cupones"]], { main: "D" }, "main");
      r.reflog = [{ id: "B", msg: "reset: moving to HEAD~2" }, { id: "D", msg: "commit: agrega cupones" }, { id: "C", msg: "commit: agrega pagos" }, { id: "B", msg: "commit: agrega carrito" }];
      r.branches.set("main", "B");
    },
    goal: "Alguien hizo <code>git reset --hard HEAD~2</code> y C y D desaparecieron de <code>main</code>. Encuéntralos en el reflog y devuélvelos a <code>main</code>.",
    hint: "git reflog muestra dónde estuvo HEAD. HEAD@{1} es el estado anterior al reset.",
    check: (r) => r.branches.get("main") === "D",
    solution: "git reflog\ngit reset --hard HEAD@{1}",
  },
  "cherry-pick": {
    title: "Desafío: lleva un arreglo a otra rama",
    build: (r) => seed(r, [["A", null, "versión 1.0"], ["B", "A", "nueva interfaz"], ["C", "B", "arregla cálculo del IVA"], ["D", "C", "rediseña el carrito"], ["E", "A", "prepara 1.0.1"]], { main: "D", "release/1.0": "E", "tag:v1.0": "A" }, "release/1.0"),
    goal: "La versión 1.0 tiene el bug del IVA. Lleva <b>solo</b> el arreglo (commit C) a <code>release/1.0</code>, sin traer la nueva interfaz ni el rediseño.",
    hint: "Estás en release/1.0: git cherry-pick C",
    check: (r) => { const t = r.branches.get("release/1.0")!; return [...ancestors(r, t)].some((x) => r.commits.get(x)!.copyOf === "C") && !isAncestor(r, "B", t); },
    solution: "git cherry-pick C",
  },
  deshacer: {
    title: "Desafío: deshacer en una rama compartida",
    build: (r) => seed(r, [["A", null, "primer commit"], ["B", "A", "agrega login"], ["C", "B", "agrega descuento"], ["D", "C", "agrega footer"]], { main: "D", "origin/main": "D" }, "main"),
    goal: "El commit C (\"agrega descuento\") rompió producción, y <code>main</code> ya está publicada en origin. Deshazlo <b>sin reescribir</b> la historia.",
    hint: "En ramas compartidas no se usa reset: git revert C",
    check: (r) => { const m = r.branches.get("main")!; return isAncestor(r, "D", m) && [...ancestors(r, m)].some((x) => r.commits.get(x)!.msg === 'Revert "agrega descuento"'); },
    solution: "git revert C",
  },
};

/* ------------------------------------------------------------------ */
/*  Dibujo: del repositorio al grafo del kit                           */
/* ------------------------------------------------------------------ */
function layout(r: Repo): { g: Grafo; cols: number; rows: number } {
  const all = [...r.commits.values()].sort((a, b) => a.seq - b.seq);
  const reach = new Set<string>();
  const tips = [...r.branches.values(), ...r.tags.values(), ...r.remotes.values()];
  const h = headId(r);
  if (h) tips.push(h);
  tips.forEach((t) => ancestors(r, t).forEach((x) => reach.add(x)));

  // columna = 1 + columna máxima de sus padres
  const col = new Map<string, number>();
  all.forEach((c) => col.set(c.id, c.parents.length ? Math.max(...c.parents.map((p) => col.get(p) ?? 0)) + 1 : 0));

  // carril: hereda el del primer padre si ese carril sigue libre; si no, el primer carril libre
  const lane = new Map<string, number>();
  const busy: number[] = []; // última columna ocupada por carril
  const childTaken = new Set<string>(); // padres que ya cedieron su carril a un hijo
  // priorizar que la rama actual y main queden arriba: ordenar por seq basta en la mayoría de los casos
  all.forEach((c) => {
    const x = col.get(c.id)!;
    let l = -1;
    const p = c.parents[0];
    if (p && !childTaken.has(p) && (busy[lane.get(p)!] ?? -1) < x) { l = lane.get(p)!; childTaken.add(p); }
    if (l < 0) { l = 0; while ((busy[l] ?? -1) >= x || (p && l < (lane.get(p) ?? 0))) l++; }
    lane.set(c.id, l);
    busy[l] = x;
  });

  const nodes: Nodo[] = all.map((c) => ({
    id: c.id, x: col.get(c.id)!, y: lane.get(c.id)!, p: c.parents,
    tone: !reach.has(c.id) ? "ghost" : c.copyOf ? "copy" : undefined,
  }));
  const refs: Ref[] = [
    ...[...r.branches].map(([name, at]) => ({ name, at })),
    ...[...r.remotes].map(([name, at]) => ({ name, at, kind: "remote" as const })),
    ...[...r.tags].map(([name, at]) => ({ name, at, kind: "tag" as const })),
  ];
  const head = "branch" in r.head ? r.head.branch : r.head.detached;
  return {
    g: { nodes, refs, head },
    cols: Math.max(...nodes.map((n) => n.x)) + 1,
    rows: Math.max(...nodes.map((n) => n.y)) + 1,
  };
}

/* ------------------------------------------------------------------ */
/*  Interfaz                                                           */
/* ------------------------------------------------------------------ */
function montarLab(el: HTMLElement) {
  const key = el.dataset.lab || "libre";
  const esc = ESCENARIOS[key] || ESCENARIOS.libre;
  el.classList.add("wd", "lab");
  el.innerHTML = `
    <div class="wh"><span class="dot"></span><span class="tt">Laboratorio · ${esc.title}</span>
      <button type="button" class="btn sm lab-reset">Reiniciar</button></div>
    ${esc.goal ? `<div class="lab-goal"><span class="lab-gl">Objetivo</span><p>${esc.goal}</p><div class="lab-gact"><button type="button" class="btn sm lab-hint">Pista</button><button type="button" class="btn sm lab-sol">Ver solución</button></div><p class="lab-hinttx" hidden></p></div>` : ""}
    <div class="lab-graph" tabindex="0" aria-label="Grafo de commits"></div>
    <div class="lab-term">
      <div class="lab-log" aria-live="polite"></div>
      <form class="lab-in"><span class="lab-ps">$</span><input type="text" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Comando de git" placeholder="git commit -m &quot;mi cambio&quot;"><button type="submit" class="btn sm pri">Ejecutar</button></form>
      <div class="lab-chips"></div>
    </div>`;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => el.querySelector(s) as T;
  const graphBox = q(".lab-graph");
  const log = q(".lab-log");
  const input = q<HTMLInputElement>("input");
  let repo = nuevo();
  esc.build(repo);
  const undo: Repo[] = [];
  const hist: string[] = [];
  let hi = -1;
  let g = grafo(graphBox, { cols: 6, rows: 2 });
  let solved = false;

  function resize(cols: number, rows: number) {
    const W = 26 * 2 + Math.max(5, cols) * CW; // una columna de aire: las etiquetas del último commit no se cortan
    const H = 66 + Math.max(1, rows - 1) * RH + 58;
    g.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    g.svg.style.maxWidth = Math.round(W * 1.3) + "px";
    g.svg.style.minWidth = Math.round(W * 0.78) + "px";
  }
  function draw(animate: boolean) {
    const L = layout(repo);
    resize(L.cols, L.rows);
    const tl = animate && !matchMedia("(prefers-reduced-motion: reduce)").matches ? gsap.timeline() : null;
    g.render(L.g, tl, 0);
    // el commit nuevo, a la vista
    if (graphBox.scrollWidth > graphBox.clientWidth) graphBox.scrollTo({ left: graphBox.scrollWidth, behavior: animate ? "smooth" : "auto" });
  }
  function print(lines: Out[], cmd?: string) {
    if (cmd) { const d = document.createElement("div"); d.className = "lab-cmd"; d.textContent = "$ " + cmd; log.appendChild(d); }
    lines.forEach((o) => { const d = document.createElement("div"); d.className = "lab-o" + (o.cls ? " " + o.cls : ""); d.textContent = o.text; log.appendChild(d); });
    while (log.children.length > 60) log.firstElementChild!.remove();
    log.scrollTop = log.scrollHeight;
  }
  function chips() {
    const names = [...repo.branches.keys()];
    const base = ['git commit -m "cambio"', "git switch -c feature", "git log", "git reflog", "git help"];
    q(".lab-chips").innerHTML = [...base, ...names.filter((n) => !("branch" in repo.head && repo.head.branch === n)).slice(0, 2).map((n) => "git merge " + n)]
      .map((c) => `<button type="button" class="chip" data-c="${c.replace(/"/g, "&quot;")}">${c.replace(/</g, "&lt;")}</button>`).join("");
  }
  function check() {
    if (!esc.check || solved || !esc.check(repo)) return;
    solved = true;
    el.classList.add("is-solved");
    print([ok("✓ Desafío cumplido. Prueba más comandos o reinicia para repetirlo.")]);
  }
  function run(line: string) {
    line = line.trim();
    if (!line) return;
    hist.unshift(line);
    hi = -1;
    if (line === "clear") { log.innerHTML = ""; return; }
    const before = clone(repo);
    try {
      const out = ejecutar(repo, line);
      undo.push(before);
      print(out, line);
      draw(true);
      chips();
      check();
    } catch (e) {
      repo = before;
      print([{ text: e instanceof GitError ? e.message : "Error inesperado: " + (e as Error).message, cls: "bad" }], line);
    }
  }

  q("form").addEventListener("submit", (e) => { e.preventDefault(); run(input.value); input.value = ""; });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); if (hi < hist.length - 1) input.value = hist[++hi]; }
    else if (e.key === "ArrowDown") { e.preventDefault(); hi = Math.max(-1, hi - 1); input.value = hi >= 0 ? hist[hi] : ""; }
    else if (e.key === "Tab") {
      const words = ["git", "commit", "branch", "switch", "checkout", "merge", "rebase", "cherry-pick", "reset", "revert", "tag", "log", "reflog", "status", "help", "--hard", "--soft", "--amend", "--no-ff", "--detach", ...repo.branches.keys(), ...repo.tags.keys()];
      const parts = input.value.split(" ");
      const last = parts.pop()!;
      const m = last && words.filter((w) => w.startsWith(last));
      if (m && m.length === 1) { e.preventDefault(); input.value = [...parts, m[0]].join(" ") + " "; }
    }
  });
  el.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    if (b.dataset.c) { input.value = b.dataset.c; input.focus(); }
    if (b.classList.contains("lab-reset")) {
      repo = nuevo(); esc.build(repo); undo.length = 0; solved = false; el.classList.remove("is-solved");
      log.innerHTML = ""; graphBox.innerHTML = ""; g = grafo(graphBox, { cols: 6, rows: 2 });
      intro(); draw(false); chips();
    }
    if (b.classList.contains("lab-hint")) { const p = q(".lab-hinttx"); p.hidden = false; p.innerHTML = "Pista: <code>" + (esc.hint || "") + "</code>"; }
    if (b.classList.contains("lab-sol")) { const p = q(".lab-hinttx"); p.hidden = false; p.innerHTML = "Solución:<br><code>" + (esc.solution || "").replace(/\n/g, "</code><br><code>") + "</code>"; }
  });
  function intro() {
    print([dim(esc.goal ? "Escribe comandos de git abajo. git help muestra la lista." : "Repositorio con un commit en main. Prueba: git commit, git switch -c feature, git merge… (git help muestra todo)")]);
  }
  intro();
  draw(false);
  chips();
}

document.querySelectorAll<HTMLElement>("[data-lab]").forEach(montarLab);

/* Exportado para el banco de pruebas. */
export { ejecutar, nuevo, layout, ESCENARIOS, GitError };
