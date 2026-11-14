(function(){
"use strict";
/* Cada vista vive en su propia URL: los widgets de otras vistas no están en la página.
   GHOST es un objeto vacío que acepta cualquier lectura, escritura o llamada sin efecto,
   así el código de esos widgets corre sin romper nada. */
const GHOST=new Proxy(function(){},{get(t,p){if(p===Symbol.toPrimitive)return()=>"";if(p===Symbol.iterator)return function*(){};if(typeof p==="symbol"||p==="then")return undefined;if(p==="length")return 0;return GHOST;},set(){return true;},apply(){return GHOST;},has(){return false;}});
const $=s=>document.querySelector(s)||GHOST, $$=s=>Array.from(document.querySelectorAll(s));
const byId=id=>document.getElementById(id)||GHOST;
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const on=(el,ev,fn)=>{if(el)el.addEventListener(ev,fn);};

/* ---------- storage ---------- */
const KEY="ccacad-v2";
let state={done:{},quiz:{},gov:{}};
try{const s=localStorage.getItem(KEY);if(s)state=Object.assign(state,JSON.parse(s));}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("on"),2200);}

/* ---------- highlight ---------- */
function hl(code){
  let s=esc(code);
  s=s.replace(/("(?:[^"\\\n]|\\.)*")|((?:^|\s)#(?!!)[^\n]*)|(\$\{\{[^}]+\}\}|\$\{[^}]+\})|(\b\d+\b)|(^---$)|(^\s*[a-zA-Z_-]+:)(?=\s|$)/gm,(m,str,com,v,num,fm,key)=>{
    if(str)return '<span class="hs">'+str+'</span>';
    if(com)return '<span class="hc">'+com+'</span>';
    if(v)return '<span class="hm">'+v+'</span>';
    if(num)return '<span class="hn">'+num+'</span>';
    if(fm)return '<span class="hc">'+fm+'</span>';
    if(key)return '<span class="hk">'+key+'</span>';
    return m;});
  return s;
}
function setCode(el,txt){el.innerHTML=hl(txt);el.dataset.raw=txt;}
$$("pre[data-hl]").forEach(p=>setCode(p,p.textContent));

/* ---------- copy ---------- */
document.addEventListener("click",e=>{
  const b=e.target.closest(".copy");if(!b)return;
  const pre=b.dataset.copy?byId(b.dataset.copy):b.closest(".code,.out").querySelector("pre");
  const txt=pre.dataset.raw||pre.textContent;
  const ok=()=>{b.textContent="✓ copiado";setTimeout(()=>b.textContent="copiar",1400);};
  const fail=()=>{selectText(pre);toast("Selecciona y copia con Ctrl+C");};
  try{navigator.clipboard.writeText(txt).then(ok,fail);}catch(err){fail();}
});
function selectText(el){try{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}}

/* ---------- routing ---------- */
const LEVELS=["basico","intermedio","avanzado","arquitecto"];
const EXTRA=["comandos","hooks","skills","settings","glosario","novedades"];
const VIEWS=["inicio",...LEVELS,...EXTRA];
const BASE="/claude-code/";
const viewUrl=v=>v==="inicio"?BASE:BASE+v+"/";
const CUR=(document.querySelector(".view")||{id:"v-inicio"}).id.slice(2);
function route(){
  const h=decodeURIComponent(location.hash.slice(1));
  // Enlaces antiguos (/claude-code/#hooks) llevan a la URL propia de cada vista.
  if(VIEWS.includes(h)&&h!==CUR){location.replace(viewUrl(h));return;}
  $$(".view").forEach(v=>v.classList.add("on"));
  $$("#lvnav a,#refnav a").forEach(a=>a.classList.toggle("on",a.dataset.l===CUR));
  if(CUR==="inicio")startHero();
  setTimeout(observeReveal,50);
  if(h&&!VIEWS.includes(h)){const t=document.getElementById(h);if(t)setTimeout(()=>t.scrollIntoView(),0);}
}
window.addEventListener("hashchange",route);
// Enlaces "#basico" generados por los widgets: van a la URL de la vista.
document.addEventListener("click",e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const h=a.getAttribute("href").slice(1);if(VIEWS.includes(h)&&h!==CUR){e.preventDefault();location.href=viewUrl(h);}});

/* ---------- TOC + progress ---------- */
const lessonsBy={};
LEVELS.forEach(l=>{
  const view=document.querySelector("#v-"+l);
  // Niveles que no están en esta página: sus lecciones vienen de la lista generada al compilar.
  if(!view){lessonsBy[l]=(window.__CC&&window.__CC.lessons[l])||[];return;}
  const arts=Array.from(view.querySelectorAll("article.lesson"));
  lessonsBy[l]=arts.map(a=>a.id);
  const toc=view.querySelector("aside.toc");
  toc.innerHTML='<div class="lbl">Lecciones</div>'+arts.map((a,i)=>'<button data-go="'+a.id+'"><span class="ck">'+(a.id.endsWith("q")?"?":(i+1))+'</span><span>'+esc(a.dataset.t)+'</span></button>').join("")+'<div class="lvprog">Progreso del nivel <span data-lvp="'+l+'" style="float:right"></span><div class="track"><b data-lvb="'+l+'"></b></div></div>';
});
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-go]");if(g){byId(g.dataset.go).scrollIntoView({behavior:"smooth"});}
  const d=e.target.closest("[data-done]");if(d){const id=d.dataset.done;state.done[id]=!state.done[id];save();renderProgress();if(state.done[id])toast("✓ Lección completada");}
});
function lvPct(l){const ids=lessonsBy[l];if(!ids.length)return 0;let n=0;ids.forEach(id=>{if(id.endsWith("q")?state.quiz[l]:state.done[id])n++;});return Math.round(n/ids.length*100);}
function renderProgress(){
  $$("[data-done]").forEach(b=>{const v=!!state.done[b.dataset.done];b.classList.toggle("on",v);b.textContent=v?"✓ Completada":"○ Marcar como completada";});
  LEVELS.forEach(l=>{
    const p=lvPct(l);
    $$('[data-pg="'+l+'"]').forEach(b=>b.style.width=p+"%");
    $$('[data-pgt="'+l+'"]').forEach(b=>b.textContent=p+"%");
    $$('[data-lvp="'+l+'"]').forEach(b=>b.textContent=p+"%");
    $$('[data-lvb="'+l+'"]').forEach(b=>b.style.width=p+"%");
    const ring=$('#lvnav a[data-l="'+l+'"] .fg');if(ring)ring.style.strokeDashoffset=44-44*p/100;
    lessonsBy[l].forEach(id=>{const b=$('aside.toc [data-go="'+id+'"]');if(b)b.classList.toggle("done",id.endsWith("q")?!!state.quiz[l]:!!state.done[id]);});
  });
  $("#cert").classList.toggle("on",LEVELS.every(l=>lvPct(l)===100));
}
const tocObs=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){const id=en.target.id;const v=en.target.closest(".view");v.querySelectorAll("aside.toc button").forEach(b=>b.classList.toggle("act",b.dataset.go===id));}});},{rootMargin:"-30% 0px -60% 0px"});
$$("article.lesson").forEach(a=>tocObs.observe(a));
const revObs=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add("in");revObs.unobserve(en.target);}}),{threshold:.1});
function observeReveal(){$$(".reveal:not(.in)").forEach(el=>revObs.observe(el));}

/* ---------- HERO ---------- */
const heroScript=[
 ["u","> agrega validación al formulario de registro y asegúrate de que pasen los tests"],["d",""],
 ["t","● Grep(\"RegisterForm\")"],["o","  ⎿ 3 coincidencias en 2 archivos"],
 ["t","● Read(src/app/registro/form.tsx)"],["o","  ⎿ 142 líneas"],
 ["t","● Read(src/lib/schemas.ts)"],
 ["v","  Hay un schema zod para login; creo uno para registro y lo conecto."],
 ["t","● Edit(src/lib/schemas.ts)"],["k","  ⎿ +14 líneas"],
 ["t","● Edit(src/app/registro/form.tsx)"],["k","  ⎿ +22 −6 líneas"],
 ["t","● Bash(pnpm test registro)"],["b","  ⎿ ✗ 1 falla: email vacío no muestra error"],
 ["t","● Edit(src/app/registro/form.tsx)"],["k","  ⎿ +3 −1 líneas"],
 ["t","● Bash(pnpm test registro)"],["k","  ⎿ ✓ 8 tests pasan"],["d",""],
 ["v","Listo. Validación con zod en email, contraseña y RUT; tests en verde."]
];
let heroRun=0;
async function startHero(){
  const my=++heroRun, el=$("#heroTerm");
  while(my===heroRun){
    el.innerHTML="";
    for(const [t,txt] of heroScript){
      if(my!==heroRun)return;
      const cls={u:"t-u",t:"t-tool",o:"t-dim",v:"t-v",k:"t-ok",b:"t-bad",d:""}[t];
      const line=document.createElement("div");line.className=cls;el.appendChild(line);
      if(t==="u"){for(let i=0;i<=txt.length;i++){if(my!==heroRun)return;line.innerHTML=esc(txt.slice(0,i))+'<span class="cursor"></span>';await sleep(20);}line.innerHTML=esc(txt);await sleep(400);}
      else{line.textContent=txt;await sleep(t==="t"?500:250);}
    }
    await sleep(3500);
  }
}

/* ---------- INSTALL ---------- */
const OS=[
 {k:"macOS / Linux / WSL",l:"bash",c:"curl -fsSL https://claude.ai/install.sh | bash",n:"Instalación nativa (recomendada). Se actualiza sola en segundo plano. El instalador no muestra progreso; al terminar, abre una terminal nueva y corre <code>claude --version</code>."},
 {k:"Windows PowerShell",l:"powershell",c:"irm https://claude.ai/install.ps1 | iex",n:"Si tu prompt muestra <code>PS C:\\</code> estás en PowerShell. Se recomienda Git for Windows para que Claude use Bash; sin él usa PowerShell como shell. En WSL no hace falta."},
 {k:"Windows CMD",l:"cmd",c:"curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd",n:"Si ves <code>'irm' is not recognized</code>, estás en CMD: usa este comando."},
 {k:"Homebrew",l:"bash",c:"brew install --cask claude-code",n:"<code>claude-code</code> sigue el canal estable; <code>claude-code@latest</code> recibe cada versión al salir. No se autoactualiza: <code>brew upgrade claude-code</code>."},
 {k:"WinGet",l:"powershell",c:"winget install Anthropic.ClaudeCode",n:"No se autoactualiza: corre <code>winget upgrade Anthropic.ClaudeCode</code> periódicamente. También hay paquetes apt, dnf y apk."}
];
function renderOS(i){$$("#osTabs button").forEach((b,j)=>b.classList.toggle("on",i===j));const o=OS[i];$("#osLbl").textContent=o.l;setCode($("#osCmd"),o.c);$("#osNote").innerHTML=o.n;}
$("#osTabs").innerHTML=OS.map((o,i)=>'<button data-os="'+i+'">'+o.k+'</button>').join("");
on($("#osTabs"),"click",e=>{const b=e.target.closest("button");if(b)renderOS(+b.dataset.os);});
renderOS(0);

/* ---------- AGENT LOOP ---------- */
const PH=[
 {t:"Reunir contexto",d:"Busca y lee lo necesario para entender el problema.",log:['<span class="t-tool">● Bash(pnpm test)</span>','<span class="t-bad">  ⎿ ✗ envio.test.ts: costo incorrecto</span>','<span class="t-tool">● Grep("calcularEnvio")</span>','<span class="t-tool">● Read(src/lib/envio.ts)</span>']},
 {t:"Actuar",d:"Edita archivos y corre comandos para avanzar hacia el objetivo.",log:['<span class="t-tool">● Edit(src/lib/envio.ts)</span>','<span class="t-ok">  ⎿ +8 −3 líneas</span>','<span class="t-tool">● Write(src/lib/envio.test.ts)</span>','<span class="t-ok">  ⎿ caso borde: peso 0</span>']},
 {t:"Verificar",d:"Corre tests, lint o build. Si algo falla, vuelve al inicio del loop con la información nueva.",log:['<span class="t-tool">● Bash(pnpm test envio)</span>','<span class="t-ok">  ⎿ ✓ 5 tests pasan</span>','<span class="t-tool">● Bash(pnpm lint)</span>','<span class="t-ok">  ⎿ sin errores → objetivo cumplido</span>']}
];
let loopA=-Math.PI/2, loopOn=true, lastPh=-1;
function loopTick(){
  if(loopOn && document.querySelector("#v-basico.on")){
    loopA+=0.012;
    const dot=$("#loopDot");dot.setAttribute("cx",170+110*Math.cos(loopA));dot.setAttribute("cy",165+110*Math.sin(loopA));
    const a=((loopA+Math.PI/2)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
    const ph=a<2*Math.PI/3?0:a<4*Math.PI/3?1:2;
    if(ph!==lastPh){lastPh=ph;$$("#loopSvg .node").forEach(n=>n.classList.toggle("hot",+n.dataset.i===ph));
      $("#phT").textContent=PH[ph].t;$("#phD").textContent=PH[ph].d;const lg=$("#phLog");lg.innerHTML="";
      PH[ph].log.forEach((l,i)=>setTimeout(()=>{if(lastPh===ph)lg.insertAdjacentHTML("beforeend","<div>"+l+"</div>");},i*380));}
  }
  requestAnimationFrame(loopTick);
}
requestAnimationFrame(loopTick);
on($("#loopToggle"),"click",function(){loopOn=!loopOn;this.textContent=loopOn?" pausar":" reanudar";});

/* ---------- SIM TERMINAL ---------- */
const simOut=$("#simOut");
const SIMMODES=[["⏵⏵ auto mode on","auto"],[" manual mode on","manual"],["⏵⏵ accept edits on","edits"],[" plan mode on","plan"]];let simM=0;
function setSimMode(){$("#simMode").textContent=SIMMODES[simM][0]+" (shift+tab para cambiar)";}
function sp(html){simOut.insertAdjacentHTML("beforeend","<div>"+html+"</div>");simOut.scrollTop=simOut.scrollHeight;}
const SIMC={
 "/help":()=>sp('<span class="t-v">Comandos (extracto):</span>\n  /init       crea CLAUDE.md analizando el proyecto\n  /clear      conversación nueva con contexto vacío\n  /compact    resume para liberar contexto\n  /context    uso de contexto como grilla\n  /model      cambia de modelo   /effort  nivel de esfuerzo\n  /resume     retoma una sesión  /rename  nombra la sesión\n  /rewind     vuelve a un checkpoint\n  /plan       entra a plan mode\n  /btw        pregunta al margen\n  /permissions /memory /mcp /hooks /usage /doctor\n<span class="t-dim">Escribe / para ver comandos y skills; Tab autocompleta.</span>'),
 "/init":async()=>{sp('<span class="t-tool">● Glob("**/*")</span>');await sleep(300);sp('<span class="t-tool">● Read(package.json)</span>');await sleep(300);sp('<span class="t-tool">● Read(README.md)</span>');await sleep(300);sp('<span class="t-tool">● Write(CLAUDE.md)</span>\n<span class="t-ok">  ⎿ creado: comandos de build y test, convenciones detectadas, estructura</span>');},
 "/clear":()=>{simOut.innerHTML="";sp('<span class="t-dim">Conversación nueva. La anterior queda disponible en /resume.</span>');},
 "/compact":()=>sp('<span class="t-dim">Compactando conversación…</span>\n<span class="t-ok">✓ Resumen creado. Contexto: 68% → 14%</span>'),
 "/context":()=>sp('<span class="t-v">Uso de contexto</span>\n  system + tools   ███░░░░░░░░░  3%\n  memoria          █░░░░░░░░░░░  1%\n  MCP (diferido)   ░░░░░░░░░░░░  <1%\n  mensajes         ███████░░░░░ 41%\n  <span class="t-dim">libre            55%</span>'),
 "/model":()=>sp('<span class="t-v">Modelo:</span> default · sonnet · opus · haiku · fable · opusplan\n<span class="t-dim">←/→ ajusta effort · s = solo esta sesión</span>'),
 "/effort":()=>sp('<span class="t-v">Effort:</span> low · medium · <b>high</b> · xhigh · max'),
 "/resume":()=>sp('<span class="t-v">Sesiones recientes:</span>\n  1. registro-zod        · hace 2 h  · feature/registro\n  2. refactor-carrito    · ayer      · main\n  3. migración-pedidos   · lunes     · feat/pedidos\n<span class="t-dim">Espacio previsualiza · Ctrl+R renombra · Ctrl+A todos los proyectos</span>'),
 "/rewind":()=>sp('<span class="t-v">Rewind:</span>\n  ◉ "agrega tests de envío"\n  ○ "refactoriza calcularEnvio"\n  Restore code and conversation · Restore conversation · Restore code\n  Summarize from here · Summarize up to here'),
 "/plan":()=>{simM=3;setSimMode();sp('<span class="t-v">Plan mode activado.</span> Claude explora y propone sin editar.');},
 "/btw":()=>sp('<span class="t-dim">(respuesta al margen, no entra al historial)</span>\nEste repo usa Node 22 según .nvmrc.'),
 "/usage":()=>sp('<span class="t-v">Uso</span>\n  sesión: 182k entrada · 14k salida\n  plan: ███████░░░ 68% de la ventana de 5 h'),
 "/memory":()=>sp('<span class="t-v">Memoria:</span>\n  ./CLAUDE.md (proyecto)\n  ~/.claude/CLAUDE.md (usuario)\n  auto memory: activada · 4 notas'),
 "/agents":()=>sp('<span class="t-dim">Pídele a Claude que cree o administre subagentes, o edita .claude/agents/ o ~/.claude/agents/ directamente.</span>'),
 "/mcp":()=>sp('<span class="t-v">Servidores MCP:</span>\n  <span class="t-ok">●</span> github   conectado · 26 tools\n  <span class="t-warn">●</span> sentry   requiere autenticación'),
 "/hooks":()=>sp('<span class="t-v">Hooks:</span>\n  PostToolUse  Edit|Write → prettier\n  PreToolUse   Bash       → block-rm.sh'),
 "/permissions":()=>sp('<span class="t-v">Reglas:</span>\n  allow  Bash(pnpm test *)\n  ask    Bash(git push *)\n  deny   Read(./.env)'),
 "/doctor":()=>sp('<span class="t-ok">✓ instalación · ✓ auto-update · ✓ PATH · ✓ settings válidos</span>\n<span class="t-warn">! CLAUDE.md: 3 líneas deducibles del código (propuesta de recorte)</span>'),
};
async function simRun(raw){
  const c=raw.trim();if(!c)return;
  sp('<span class="t-p">&gt;</span> <span class="t-u">'+esc(c)+'</span>');
  const k=c.split(" ")[0].toLowerCase();
  if(SIMC[k]){await SIMC[k]();return;}
  if(c.startsWith("/")){sp('<span class="t-bad">Comando desconocido. Prueba /help</span>');return;}
  if(c.startsWith("!")){const cmd=c.slice(1).trim();sp('<span class="t-dim">modo shell · la salida entra a la conversación</span>');
    if(/git status/.test(cmd))sp('On branch feature/checkout\nChanges not staged:\n  <span class="t-warn">modified: src/lib/envio.ts</span>');
    else if(/test/.test(cmd))sp('<span class="t-ok">✓ 42 tests pasan</span>');
    else if(/ls/.test(cmd))sp('package.json  src/  supabase/  CLAUDE.md  README.md');
    else sp('<span class="t-dim">(salida simulada de '+esc(cmd)+')</span>');return;}
  if(c.startsWith("@")){sp('<span class="t-tool">● Read('+esc(c.slice(1).split(" ")[0])+')</span>\n<span class="t-dim">  ⎿ agregado al contexto</span>');return;}
  const steps=[['t-tool','● Grep("envio")'],['t-dim','  ⎿ 4 coincidencias'],['t-tool','● Read(src/lib/envio.ts)']];
  for(const [cl,t] of steps){await sleep(330);sp('<span class="'+cl+'">'+t+'</span>');}
  await sleep(380);
  const m=SIMMODES[simM][1];
  if(m==="plan"){sp('<span class="t-v">Plan propuesto:</span>\n  1. Corregir el redondeo en calcularEnvio\n  2. Agregar test para peso 0\n  3. Correr pnpm test\n<span class="t-warn">Yes, and use auto mode · Yes, manually approve edits · No, keep planning</span>');return;}
  if(m==="manual"){sp('<span class="t-warn">¿Permitir Edit(src/lib/envio.ts)?  [1] Sí  [2] Sí, y no preguntar más en la sesión  [3] No</span>');return;}
  sp('<span class="t-tool">● Edit(src/lib/envio.ts)</span>\n<span class="t-ok">  ⎿ +6 −2 líneas</span>');await sleep(330);
  if(m==="auto"){sp('<span class="t-tool">● Bash(pnpm test envio)</span>\n<span class="t-dim">  ⎿ revisado por el clasificador · permitido</span>\n<span class="t-ok">  ⎿ ✓ 5 tests pasan</span>');}
  else{sp('<span class="t-warn">¿Permitir Bash(pnpm test envio)?</span> <span class="t-dim">(accept edits no aprueba comandos arbitrarios)</span>');}
}
const simIn=$("#simIn");
on(simIn,"keydown",e=>{
  if(e.key==="Enter"){simRun(simIn.value);simIn.value="";}
  if(e.key==="Tab"&&e.shiftKey){e.preventDefault();simM=(simM+1)%SIMMODES.length;setSimMode();}
});
$("#simChips").innerHTML=["/help","/init","/context","!git status","@src/lib/supabase.ts","arregla el cálculo de envío","/plan","/btw","/rewind","/agents","/doctor"].map(c=>'<button class="chip" data-sim="'+esc(c)+'">'+esc(c)+'</button>').join("");
on($("#simChips"),"click",e=>{const b=e.target.closest("[data-sim]");if(b)simRun(b.dataset.sim);});
on($("#simClear"),"click",()=>{simOut.innerHTML="";});
setSimMode();
sp('<span class="t-p"></span> <b>Claude Code</b> <span class="t-dim">· ~/mi-app</span>\n<span class="t-dim">Prueba "arregla el cálculo de envío" en cada modo (Shift+Tab en el input).</span>');

/* ---------- KEYS ---------- */
const KEYS=[
 ["Shift+Tab","cambiar modo","Cicla los modos de permiso: auto → manual → accept edits → plan (y bypass si lo habilitaste al lanzar). La forma más rápida de entrar a plan mode antes de un cambio grande."],
 ["Esc","interrumpir","Detiene la respuesta o herramienta en curso. Claude conserva el trabajo hecho y espera tu instrucción. Si tenías mensajes en cola, los envía."],
 ["Esc Esc","rewind","Con el input vacío abre el menú de rewind. Con texto en el input, lo borra y lo guarda en el historial (recupéralo con ↑)."],
 ["Ctrl+G","editor","Abre tu prompt (o el plan propuesto) en tu editor de texto para escribir o modificar con calma."],
 ["Ctrl+O","transcript","Alterna el visor detallado de herramientas, con hora y modelo en cada mensaje."],
 ["Ctrl+R","buscar historial","Búsqueda inversa en tus prompts anteriores."],
 ["Ctrl+B","al fondo","Manda a segundo plano comandos Bash y agentes en curso (en tmux, dos veces)."],
 ["Ctrl+T","tareas","Muestra u oculta la checklist de tareas de Claude. Para lo que corre de fondo usa /tasks."],
 ["Ctrl+S","reservar","Guarda el texto del input y lo limpia; vuelve a presionarlo con input vacío para restaurarlo."],
 ["Ctrl+V","pegar imagen","Inserta una imagen del portapapeles como chip [Image #N] (Cmd+V en iTerm2, Alt+V en Windows)."],
 ["Opt/Alt+P","modelo","Cambia de modelo sin borrar tu prompt."],
 ["Opt/Alt+T","thinking","Alterna el pensamiento extendido (no aplica a los modelos 5.5 y Fable, que siempre lo usan)."],
 ["Ctrl+Enter","enviar cola","Envía de inmediato los mensajes que encolaste mientras Claude trabajaba."],
 ["Ctrl+C","cancelar","Interrumpe o limpia el input; dos veces con nada corriendo sale de Claude Code."],
 ["?","ayuda","Con el input vacío, muestra el panel de atajos."],
 ["↑ / ↓","historial","Recorre prompts anteriores (o mueve el cursor si el input tiene varias líneas)."]
];
$("#keys").innerHTML=KEYS.map((k,i)=>'<button class="key" data-k="'+i+'"><kbd>'+esc(k[0])+'</kbd><small>'+k[1]+'</small></button>').join("");
on($("#keys"),"click",e=>{const b=e.target.closest(".key");if(!b)return;$$(".key").forEach(x=>x.classList.remove("on"));b.classList.add("on");const k=KEYS[+b.dataset.k];$("#keyOut").innerHTML='<b style="font-family:var(--mono);color:var(--lv)">'+esc(k[0])+'</b> — '+k[2];});

/* ---------- PROMPT LAB ---------- */
const PL=[
 {n:"Bug",v:["arregla el bug del login",[30,85,60,15],"Busca \"login\" en todo el repo, encuentra varios candidatos y adivina cuál es el bug. Probablemente cambie algo que no era el problema."],
          s:["los usuarios ven pantalla en blanco al ingresar una contraseña incorrecta en /login. Revisa src/auth/, en especial el refresh de token. Escribe un test que reproduzca el fallo y luego arréglalo",[92,20,12,95],"Va directo al área correcta, reproduce el fallo con un test, corrige la causa y usa el test como criterio de término."]},
 {n:"Feature",v:["agrega un widget de calendario",[40,80,55,20],"Inventa diseño, ubicación y probablemente agrega una librería nueva."],
          s:["mira cómo están implementados los widgets del home; HotDogWidget.tsx es un buen ejemplo. Sigue ese patrón para un widget de calendario que permita elegir mes y paginar por año. Sin librerías nuevas",[90,25,15,75],"Reutiliza un patrón existente y respeta restricciones explícitas."]},
 {n:"Tests",v:["agrega tests para foo.py",[45,70,30,40],"Escribe tests genéricos del camino feliz, probablemente con mocks."],
          s:["escribe un test para foo.py que cubra el caso borde en que el usuario no tiene sesión. Evita mocks. Corre los tests al terminar",[90,20,10,95],"Alcance acotado, preferencia de estilo explícita y verificación incluida."]},
 {n:"Pregunta",v:["¿por qué ExecutionFactory tiene una API tan rara?",[35,60,5,20],"Especula a partir del código actual."],
          s:["revisa la historia de git de ExecutionFactory y resume cómo llegó a tener esta API",[88,20,5,80],"Apunta a la fuente que realmente responde la pregunta."]}
];
let plI=0,plV=0;
function renderPL(){
  $$("#plScen .chip").forEach((c,i)=>c.classList.toggle("on",i===plI));
  $$("#plTog button").forEach((b,i)=>b.classList.toggle("on",i===plV));
  const d=PL[plI][plV?"s":"v"];
  $("#plPrompt").textContent="> "+d[0];$("#plRes").textContent=d[2];
  const [a,b,c,dd]=d[1];
  const set=(id,val,good)=>{const el=$("#"+id);el.style.width=val+"%";el.style.background=good?"var(--ok)":(val>50?"var(--bad)":"var(--warn)");$("#"+id+"t").textContent=val+"%";};
  set("m1",a,a>70);set("m2",b,b<40);set("m3",c,c<30);set("m4",dd,dd>70);
}
$("#plScen").innerHTML=PL.map((p,i)=>'<button class="chip" data-i="'+i+'">'+p.n+'</button>').join("");
on($("#plScen"),"click",e=>{const b=e.target.closest(".chip");if(b){plI=+b.dataset.i;renderPL();}});
on($("#plTog"),"click",e=>{const b=e.target.closest("button");if(b){plV=+b.dataset.v;renderPL();}});
renderPL();

/* ---------- PERMISSION MODES ---------- */
const PM=[
 {st:"⏵⏵ auto mode on",cfg:"auto",d:"Modo de inicio por defecto en terminal y VS Code (v2.1.283+). Un clasificador revisa las acciones en segundo plano y bloquea las riesgosas en vez de preguntarte. Lecturas y ediciones en el directorio de trabajo se aprueban sin clasificador.",r:[["Leer y buscar","ok"],["Editar en el directorio de trabajo","ok"],["Comandos de shell","ok*"],["Red, push, deploy","ok*"],["Reglas ask explícitas","ask"]]},
 {st:" manual mode on",cfg:"default (alias manual)",d:"Solo lee sin preguntar (más un set de comandos de solo lectura como ls o git status). Pide aprobación para ediciones y comandos. Modo de inicio de claude -p y el Agent SDK.",r:[["Leer y buscar","ok"],["Editar en el directorio de trabajo","ask"],["Comandos de shell","ask"],["Red, push, deploy","ask"],["Reglas ask explícitas","ask"]]},
 {st:"⏵⏵ accept edits on",cfg:"acceptEdits",d:"Edita archivos y corre comandos comunes de sistema de archivos (mkdir, touch, mv, cp, rm, sed) dentro de tus directorios de trabajo. Otros comandos siguen preguntando.",r:[["Leer y buscar","ok"],["Editar en el directorio de trabajo","ok"],["Comandos de shell","ask"],["Red, push, deploy","ask"],["Reglas ask explícitas","ask"]]},
 {st:" plan mode on",cfg:"plan",d:"Lee, explora y propone un plan sin editar tu código. Si auto está disponible, el clasificador revisa los comandos durante la planificación.",r:[["Leer y buscar","ok"],["Editar en el directorio de trabajo","no"],["Comandos de shell","ok*"],["Red, push, deploy","no"],["Reglas ask explícitas","ask"]]},
 {st:"⏵⏵ bypass permissions on",cfg:"bypassPermissions",d:"Solo aparece en el ciclo si lanzaste con --allow-dangerously-skip-permissions o similar. Todo sin preguntar, incluso rutas protegidas. Úsalo solo en contenedores o VMs aislados. Las reglas deny siguen aplicando.",r:[["Leer y buscar","ok"],["Editar en el directorio de trabajo","ok"],["Comandos de shell","ok"],["Red, push, deploy","ok"],["Reglas ask explícitas","ask"]]}
];
let pmI=0;
function renderPM(){const m=PM[pmI];$("#permSt").textContent=m.st;$("#permCfg").textContent='config: "'+m.cfg+'"';$("#permDesc").textContent=m.d;
  $("#permTb").innerHTML=m.r.map(([a,s])=>{const map={ok:['p-ok','sin preguntar'],'ok*':['p-ok','revisado por el clasificador'],ask:['p-ask','pregunta'],no:['p-no','bloqueado']}[s];return '<tr><td>'+a+'</td><td><span class="pill '+map[0]+'">'+map[1]+'</span></td></tr>';}).join("");}
function cyclePM(){pmI=(pmI+1)%PM.length;renderPM();}
on($("#permBtn"),"click",cyclePM);
on($("#permW"),"keydown",e=>{if(e.key==="Tab"&&e.shiftKey){e.preventDefault();cyclePM();}});
renderPM();

/* ---------- RULE TESTER ---------- */
let RT=[["allow","Bash(npm run *)"],["allow","Bash(git diff *)"],["ask","Bash(git push *)"],["deny","Bash(rm -rf *)"]];
function rtRender(){
  $("#rtRules").innerHTML=RT.map((r,i)=>'<div class="rt-row" data-i="'+i+'"><select data-f="t"><option'+(r[0]==="allow"?" selected":"")+'>allow</option><option'+(r[0]==="ask"?" selected":"")+'>ask</option><option'+(r[0]==="deny"?" selected":"")+'>deny</option></select><input data-f="p" value="'+esc(r[1])+'"><button data-del="'+i+'">×</button></div>').join("");
  rtEval();
}
function globToRe(p){
  let body=p;let bare=null;
  if(/:\*$/.test(body))body=body.replace(/:\*$/," *");
  const stars=(body.match(/\*/g)||[]).length;
  if(stars===1&&/ \*$/.test(body))bare=body.slice(0,-2);
  const re=new RegExp("^"+body.split("*").map(s=>s.replace(/[.+?^${}()|[\]\\]/g,"\\$&")).join(".*")+"$");
  return {re,bare};
}
function ruleMatches(rule,cmd){
  const m=rule.match(/^Bash\((.*)\)$/);if(!m)return rule.trim()==="Bash";
  const g=globToRe(m[1].trim());return g.re.test(cmd)||(g.bare!==null&&cmd===g.bare);
}
function rtEval(){
  const cmd=$("#rtCmd").value.trim();
  const subs=cmd.split(/\s*(?:&&|\|\||;|\||&)\s*/).map(s=>s.trim()).filter(Boolean);
  const hits=new Set();
  let verdict=null,why="";
  for(const type of ["deny","ask"]){
    for(let i=0;i<RT.length;i++){if(RT[i][0]!==type)continue;
      const sub=subs.find(s=>ruleMatches(RT[i][1],s));
      if(sub){verdict=type;hits.add(i);why='La regla <b>'+esc(RT[i][1])+'</b> calza con <code>'+esc(sub)+'</code>.'+(subs.length>1?' En un comando compuesto, un '+type+' aplica si calza con cualquier subcomando.':'');break;}
    }
    if(verdict)break;
  }
  if(!verdict){
    const cover=subs.map(s=>{const i=RT.findIndex(r=>r[0]==="allow"&&ruleMatches(r[1],s));return i;});
    if(subs.length&&cover.every(i=>i>=0)){verdict="allow";cover.forEach(i=>hits.add(i));why=subs.length>1?'Cada subcomando calza con alguna regla allow.':'La regla <b>'+esc(RT[cover[0]][1])+'</b> lo autoriza.';}
    else{verdict="none";const miss=subs.filter((s,j)=>cover[j]<0);why='Ninguna regla cubre '+(miss.length?'<code>'+esc(miss.join("</code>, <code>"))+'</code>':'el comando')+'. Decide el modo: en Manual pregunta; en auto lo revisa el clasificador; en dontAsk se deniega.';}
  }
  $$("#rtRules .rt-row").forEach(r=>r.classList.toggle("hit",hits.has(+r.dataset.i)));
  const lab={deny:['var(--bad)','✕ DENEGADO'],ask:['var(--warn)','? PREGUNTA'],allow:['var(--ok)','✓ PERMITIDO SIN PREGUNTAR'],none:['var(--mute)','· SIN REGLA']}[verdict];
  $("#rtOut").innerHTML='<span class="big" style="color:'+lab[0]+'">'+lab[1]+'</span>'+why+'<br><span style="color:var(--dim);font-size:12px">orden de evaluación: deny → ask → allow</span>';
}
on($("#rtRules"),"input",e=>{const row=e.target.closest(".rt-row");if(!row)return;const i=+row.dataset.i;if(e.target.dataset.f==="t")RT[i][0]=e.target.value;else RT[i][1]=e.target.value;rtEval();});
on($("#rtRules"),"change",e=>{const row=e.target.closest(".rt-row");if(!row)return;RT[+row.dataset.i][0]=row.querySelector("select").value;rtEval();});
on($("#rtRules"),"click",e=>{const d=e.target.closest("[data-del]");if(d){RT.splice(+d.dataset.del,1);rtRender();}});
on($("#rtAdd"),"click",()=>{RT.push(["allow","Bash(ls *)"]);rtRender();});
on($("#rtCmd"),"input",rtEval);
$("#rtEx").innerHTML=["npm run test --watch","npm install lodash","git diff main && git push origin main","rm -rf dist","git diff","ls"].map(c=>'<button class="chip" data-c="'+esc(c)+'">'+esc(c)+'</button>').join("");
on($("#rtEx"),"click",e=>{const b=e.target.closest("[data-c]");if(b){$("#rtCmd").value=b.dataset.c;rtEval();}});
rtRender();

/* ---------- CLAUDE.md builder ---------- */
const STK=["Next.js (App Router)","TypeScript","Supabase","Tailwind","shadcn/ui","Vitest","Playwright","Prisma"];
const stkOn=new Set(["Next.js (App Router)","TypeScript","Supabase","Tailwind","shadcn/ui","Vitest"]);
$("#cmStack").innerHTML=STK.map(s=>'<button class="chip'+(stkOn.has(s)?" on":"")+'" data-s="'+s+'">'+s+'</button>').join("");
on($("#cmStack"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;const s=b.dataset.s;stkOn.has(s)?stkOn.delete(s):stkOn.add(s);b.classList.toggle("on");renderCM();});
function lines(id){return $(id).value.split("\n").map(x=>x.trim()).filter(Boolean);}
function renderCM(){
  const t=["# "+$("#cmName").value,"","## Stack","- "+STK.filter(s=>stkOn.has(s)).join(", "),"","## Comandos",
  "- Dev: `"+$("#cmDev").value+"`","- Tests de un archivo: `"+$("#cmTest").value+"` (prefiere tests puntuales a la suite completa)","- Lint: `"+$("#cmLint").value+"`","- Typecheck: `"+$("#cmBuild").value+"` (correr al terminar una serie de cambios)","",
  "## Convenciones",...lines("#cmConv").map(x=>"- "+x),"","## Nunca",...lines("#cmNever").map(x=>"- IMPORTANT: no "+x.charAt(0).toLowerCase()+x.slice(1)),"","## Flujo","- Cambios en más de 3 archivos: propone un plan antes de editar","- Commits en formato Conventional Commits","","<!-- nota para humanos: este comentario no ocupa contexto -->"].join("\n");
  const o=$("#cmOut");o.dataset.raw=t;
  o.innerHTML=esc(t).replace(/^(#{1,2} .*)$/gm,'<span class="hf">$1</span>').replace(/`([^`]+)`/g,'<span class="hs">`$1`</span>').replace(/^- /gm,'<span class="hm">- </span>').replace(/(&lt;!--.*--&gt;)/,'<span class="hc">$1</span>');
  const n=t.split("\n").length;$("#cmLines").innerHTML='<span style="color:'+(n<200?"var(--ok)":"var(--bad)")+'">'+n+' líneas · meta &lt; 200</span>';
}
["#cmName","#cmDev","#cmTest","#cmLint","#cmBuild","#cmConv","#cmNever"].forEach(s=>on($(s),"input",renderCM));
renderCM();

/* ---------- flow player ---------- */
function makeFlow(cont,steps,renderDet){
  cont.innerHTML=steps.map((s,i)=>'<div class="fstep" data-i="'+i+'"><div class="fi">'+s.i+'</div><b>'+s.t+'</b><small>'+s.s+'</small></div>').join("");
  let run=0;
  function show(i){cont.querySelectorAll(".fstep").forEach((f,j)=>{f.classList.toggle("on",j===i);f.classList.toggle("past",j<i);});renderDet(steps[i],i);}
  on(cont,"click",e=>{const f=e.target.closest(".fstep");if(f){run++;show(+f.dataset.i);}});
  return async function play(){const my=++run;for(let i=0;i<steps.length;i++){if(my!==run)return;show(i);await sleep(steps[i].ms||2000);}};
}
const PF=[
 {i:"",t:"Explorar",s:"plan mode",d:"<b>Shift+Tab hasta  plan mode on</b> (o <code>claude --permission-mode plan</code>).<br><code>lee /src/auth y entiende cómo manejamos sesiones y login. Revisa también cómo gestionamos variables de entorno para secretos.</code>"},
 {i:"",t:"Planificar",s:"plan detallado",d:"<code>quiero agregar Google OAuth. ¿Qué archivos cambian? ¿Cuál es el flujo de sesión? Crea un plan.</code><br>Presiona <kbd class=\"k\">Ctrl</kbd>+<kbd class=\"k\">G</kbd> para editar el plan en tu editor antes de seguir."},
 {i:"",t:"Aprobar",s:"tú decides",d:"Elige <b>Yes, and use auto mode</b>, <b>Yes, manually approve edits</b> o <b>No, keep planning</b>. Aprobar le pone título a la sesión."},
 {i:"",t:"Implementar",s:"contra el plan",d:"<code>implementa el flujo OAuth de tu plan. Escribe tests para el callback, corre la suite y arregla los fallos.</code><br>Interrumpe con <kbd class=\"k\">Esc</kbd> si se desvía."},
 {i:"",t:"Verificar",s:"evidencia",d:"Pide que muestre la salida de los tests. Para cambios grandes, un subagente revisor contrasta el diff con el plan: <code>usa un subagente para revisar el diff contra PLAN.md y reportar brechas</code>."},
 {i:"",t:"Commit",s:"y PR",d:"<code>haz commit con un mensaje descriptivo y abre un PR</code>"}
];
const pfPlay=makeFlow($("#pfFlow"),PF,s=>{$("#pfDet").innerHTML=s.d;});
on($("#pfPlay"),"click",()=>pfPlay());

/* ---------- CHECKPOINTS ---------- */
const CP=[
 {p:"crea el schema de pedidos",f:{"supabase/migrations/001_pedidos.sql":"new"}},
 {p:"agrega la API de pedidos",f:{"supabase/migrations/001_pedidos.sql":"","src/app/api/pedidos/route.ts":"new"}},
 {p:"refactoriza a server actions",f:{"supabase/migrations/001_pedidos.sql":"","src/app/api/pedidos/route.ts":"mod","src/app/pedidos/actions.ts":"new","src/lib/utils.ts":"mod"}},
 {p:"agrega caché agresivo",f:{"supabase/migrations/001_pedidos.sql":"","src/app/api/pedidos/route.ts":"mod","src/app/pedidos/actions.ts":"mod","src/lib/utils.ts":"mod","src/lib/cache.ts":"new"}}
];
let cpAt=CP.length-1;
function renderCP(){
  $("#cps").innerHTML=CP.map((c,i)=>'<button class="cp'+(i>cpAt?" gone":"")+(i===cpAt?" cur":"")+'" data-i="'+i+'"><small>checkpoint '+(i+1)+'</small>'+esc(c.p)+'</button>').join("");
  const f=CP[cpAt].f;$("#cpFiles").innerHTML=Object.keys(f).map(k=>'<div class="'+f[k]+'">'+(f[k]==="new"?"+ ":f[k]==="mod"?"~ ":"  ")+k+'</div>').join("");
}
on($("#cps"),"click",e=>{const b=e.target.closest(".cp");if(!b)return;const i=+b.dataset.i;if(i===cpAt)return;
  if(i>cpAt){$("#cpMsg").innerHTML="Esos cambios ya se descartaron. Usa <b>reiniciar</b> para volver al estado final.";return;}
  const lost=CP.slice(i+1).map(c=>"«"+c.p+"»").join(", ");cpAt=i;renderCP();
  $("#cpMsg").innerHTML='<span style="color:var(--lv)">⟲ Restore code and conversation → checkpoint '+(i+1)+'.</span><br>Se deshicieron: '+esc(lost)+'. El prompt original vuelve al input para que lo reenvíes o edites. Ojo: si una migración ya se aplicó a la base de datos, eso no se revierte.';});
on($("#cpReset"),"click",()=>{cpAt=CP.length-1;renderCP();$("#cpMsg").textContent="Haz clic en un checkpoint anterior para volver.";});
renderCP();$("#cpMsg").textContent="Haz clic en un checkpoint anterior para volver.";

/* ---------- CONTEXT ---------- */
const MAXC=200000;
const CTXC={base:["Sistema, entorno, MCP, skills","var(--ink-3)"],md:["CLAUDE.md + memoria","var(--ok)"],files:["Archivos leídos","var(--accent)"],conv:["Conversación y salidas","var(--c4)"],sum:["Resumen","var(--c5)"]};
let ctx;function ctxReset(){ctx={base:4200+280+120+450,md:320+1800+680,files:0,conv:45,sum:0};}ctxReset();
const fmt=n=>n>=1000?(n/1000).toFixed(1).replace(".0","")+"k":String(n);
function renderCtx(msg){
  const tot=Object.values(ctx).reduce((a,b)=>a+b,0);
  $("#ctxBar").innerHTML=Object.keys(CTXC).map(k=>'<b style="width:'+(ctx[k]/MAXC*100)+'%;background:'+CTXC[k][1]+'"></b>').join("");
  $("#ctxLeg").innerHTML=Object.keys(CTXC).filter(k=>ctx[k]>0).map(k=>'<span><i style="background:'+CTXC[k][1]+'"></i>'+CTXC[k][0]+' '+fmt(ctx[k])+'</span>').join("");
  const p=Math.min(100,Math.round(tot/MAXC*100));$("#ctxPct").innerHTML='<span style="color:'+(p>85?"var(--bad)":p>65?"var(--warn)":"var(--ok)")+'">'+fmt(tot)+' / 200k · '+p+'%</span>';
  if(msg)$("#ctxMsg").innerHTML=msg;
  if(p>=95)$("#ctxMsg").innerHTML='<span style="color:var(--bad)">Casi lleno.</span> Claude Code compactaría automáticamente: primero limpia salidas viejas, luego resume. Mejor <code>/compact</code> con foco o <code>/clear</code>.';
}
function addC(k,n){const free=MAXC-Object.values(ctx).reduce((a,b)=>a+b,0);ctx[k]+=Math.max(0,Math.min(n,free));}
$$("[data-ctx]").forEach(b=>on(b,"click",()=>{
  const a=b.dataset.ctx;let msg="";
  if(a==="file"){addC("files",2400);msg="Un archivo de auth de ejemplo: ~2.400 tokens. Si cae bajo una rule con <code>paths</code>, esa rule también se carga.";}
  if(a==="big"){addC("files",27000);msg="Seguir imports por 15 archivos suma rápido. Para investigar, delega a un subagente.";}
  if(a==="log"){addC("conv",1200);msg="Salidas de tests largas cuestan. Un hook puede filtrar solo los fallos antes de que Claude los vea.";}
  if(a==="explore"){addC("files",60000);addC("conv",8000);msg='<span style="color:var(--warn)">"Investiga X" sin acotar</span> puede leer cientos de archivos. Acota la investigación o usa subagentes.';}
  if(a==="sub"){addC("conv",420);msg='<span style="color:var(--ok)">Subagente:</span> leyó varios archivos en su propio contexto; a tu conversación solo volvió un resumen de ~420 tokens.';}
  if(a==="compact"){const s=Math.min(18000,Math.round((ctx.conv+ctx.files)*0.12))+ctx.sum;ctx.conv=0;ctx.files=0;ctx.sum=s;msg='<span style="color:var(--ok)">/compact:</span> la conversación se reemplaza por un resumen estructurado. CLAUDE.md y la memoria se recargan; las skills invocadas se re-adjuntan (hasta 5k tokens cada una).';}
  if(a==="clear"){ctxReset();msg='<span style="color:var(--ok)">/clear:</span> conversación nueva. Lo de inicio vuelve a cargarse; la sesión anterior queda en <code>/resume</code>.';}
  renderCtx(msg);}));
renderCtx("Así parte una sesión: unos 7.800 tokens antes de tu primer prompt. Agrega lecturas y observa.");

/* ---------- HOOKS SIM ---------- */
const hkTog={block:true,fmt:true,ctx:false,stop:false};
[["#hkBlock","block"],["#hkFmt","fmt"],["#hkCtx","ctx"],["#hkStop","stop"]].forEach(([s,k])=>on($(s),"click",function(){hkTog[k]=!hkTog[k];this.classList.toggle("on",hkTog[k]);}));
function hkEvents(){const e=[
 ["SessionStart","startup","",null],
 ["UserPromptSubmit",'"limpia el build y arregla el formato de checkout.tsx"',"",null],
 ["PreToolUse","Bash(rm -rf dist)",hkTog.block?"block-rm.sh → exit 2 · stderr: «Bloqueado: no se permite rm». Claude lee el motivo y usa pnpm clean.":"sin hook: el comando corre",hkTog.block?"blk":null],
 ["PreToolUse","Bash(pnpm clean)",hkTog.block?"block-rm.sh → exit 0 · sin objeción, sigue el flujo normal de permisos":"",null],
 ["PostToolUse","Bash(pnpm clean) ✓","",null],
 ["PostToolUse","Edit(src/app/checkout.tsx) ✓",hkTog.fmt?"prettier --write → archivo formateado":"sin hook: queda como lo escribió el modelo",null]];
 if(hkTog.stop){e.push(["Stop","Claude termina de responder","hook prompt → {\"ok\": false, \"reason\": \"no corriste los tests\"} · Claude sigue trabajando","blk"]);e.push(["PostToolUse","Bash(pnpm test) ✓","",null]);e.push(["Stop","Claude termina de responder","hook prompt → {\"ok\": true} · el turno termina",null]);}
 else e.push(["Stop","Claude termina de responder","",null]);
 e.push(["PreCompact","auto-compactación","",null]);
 e.push(["SessionStart","compact",hkTog.ctx?"echo → «Usa pnpm. Corre pnpm test antes de commitear. Sprint: refactor de auth.» entra al contexto":"",null]);
 return e;}
function renderHk(upto){const ev=hkEvents();$("#hkTl").innerHTML=ev.map((e,i)=>'<div class="hkev'+(i<=upto?(e[3]==="blk"?" blk":" on"):"")+'"><span class="ev">'+e[0]+'</span><span>'+esc(e[1])+(e[2]&&i<=upto?'<br><span style="color:'+(e[3]==="blk"?"var(--bad)":"var(--ok)")+';font-family:var(--mono);font-size:12px">↳ '+esc(e[2])+'</span>':'')+'</span><span style="font-family:var(--mono);font-size:11px;color:var(--dim)">'+(e[2]?"":"")+'</span></div>').join("");}
let hkRun=0;
on($("#hkPlay"),"click",async()=>{const my=++hkRun;const n=hkEvents().length;for(let i=0;i<n;i++){if(my!==hkRun)return;renderHk(i);await sleep(850);}});
renderHk(-1);

/* ---------- EXIT TESTER ---------- */
const ex={ev:"pre",code:"0",out:"none"};
function exRender(){
  const E={pre:"PreToolUse",post:"PostToolUse",stop:"Stop",ups:"UserPromptSubmit"}[ex.ev];let r="";
  if(ex.code==="2"){r={pre:'<span class="tag" style="color:var(--bad)">BLOQUEA</span> La herramienta no corre. stderr se le entrega a Claude como motivo y puede ajustar su plan.',
     post:'<span class="tag" style="color:var(--warn)">NO DESHACE</span> La herramienta ya corrió. stderr se le muestra a Claude como feedback.',
     stop:'<span class="tag" style="color:var(--bad)">IMPIDE TERMINAR</span> Claude recibe stderr y sigue trabajando. Hay un tope de bloqueos consecutivos para evitar loops.',
     ups:'<span class="tag" style="color:var(--bad)">BLOQUEA EL PROMPT</span> El prompt no se procesa.'}[ex.ev];}
  else if(ex.code==="1"){r='<span class="tag" style="color:var(--warn)">ERROR NO BLOQUEANTE</span> La acción sigue y aparece un aviso «'+E+' hook error» en el transcript. Para imponer una política no uses exit 1.';
     if(ex.out==="json")r='<span class="tag" style="color:var(--ok)">EL JSON DECIDE</span> Con un JSON válido en stdout, Claude Code ignora el código de salida y aplica el JSON.';}
  else{ if(ex.out==="none")r='<span class="tag" style="color:var(--ok)">SIN OBJECIÓN</span> '+(ex.ev==="pre"?'No aprueba la herramienta: sigue el flujo normal de permisos.':'La acción continúa.');
     else if(ex.out==="text")r=(ex.ev==="ups")?'<span class="tag" style="color:var(--ok)">AGREGA CONTEXTO</span> En UserPromptSubmit (y SessionStart) el texto plano de stdout se agrega al contexto de Claude.':'<span class="tag" style="color:var(--ok)">TEXTO PLANO</span> Se trata como texto, no como decisión. Claude no ve stderr de un hook exitoso.';
     else r={pre:'<span class="tag" style="color:var(--ok)">CONTROL FINO</span> <code>permissionDecision</code>: allow (salta el prompt), deny (cancela con motivo), ask (prompt normal). Puede reescribir argumentos con <code>updatedInput</code>.',
      post:'<span class="tag" style="color:var(--ok)">CONTROL FINO</span> <code>"decision": "block"</code> con <code>reason</code> le devuelve feedback a Claude.',
      stop:'<span class="tag" style="color:var(--ok)">CONTROL FINO</span> <code>"decision": "block"</code> con <code>reason</code> hace que Claude siga trabajando.',
      ups:'<span class="tag" style="color:var(--ok)">CONTROL FINO</span> <code>hookSpecificOutput.additionalContext</code> inyecta texto; también puede bloquear el prompt.'}[ex.ev];}
  $("#exRes").innerHTML='<div style="font-family:var(--mono);font-size:12px;color:var(--dim);margin-bottom:8px">'+E+' · exit '+ex.code+' · stdout '+ex.out+'</div>'+r;
}
function tg(id,key){on($(id),"click",e=>{const b=e.target.closest("button");if(!b)return;$$(id+" button").forEach(x=>x.classList.toggle("on",x===b));ex[key]=b.dataset.v;exRender();});}
tg("#exEv","ev");tg("#exCode","code");tg("#exOut","out");exRender();

/* ---------- HOOK BUILDER ---------- */
const HB=[
 {n:"Formatear tras editar",e:"PostToolUse",t:"command",m:"Edit|Write",i:"",c:"jq -r '.tool_input.file_path' | xargs npx prettier --write",w:"Determinístico: cada archivo que Claude toca queda formateado sin depender de que lo recuerde."},
 {n:"Bloquear rm",e:"PreToolUse",t:"command",m:"Bash",i:"Bash(rm *)",c:"${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh",w:"PreToolUse puede bloquear: el script sale con exit 2 y su stderr llega a Claude."},
 {n:"Proteger migraciones",e:"PreToolUse",t:"command",m:"Edit|Write",i:"Edit(supabase/migrations/**)",c:"echo 'Las migraciones aplicadas no se editan: crea una nueva' >&2; exit 2",w:"Una instrucción en CLAUDE.md es un pedido; este hook es enforcement."},
 {n:"Reinyectar contexto tras compactar",e:"SessionStart",t:"command",m:"compact",i:"",c:"echo 'Recordatorio: usa pnpm. Corre pnpm test antes de commitear.'; git log --oneline -5",w:"El matcher compact dispara el hook después de cada compactación; su stdout vuelve al contexto."},
 {n:"Aprobar planes automáticamente",e:"PermissionRequest",t:"command",m:"ExitPlanMode",i:"",c:"echo '{\"hookSpecificOutput\": {\"hookEventName\": \"PermissionRequest\", \"decision\": {\"behavior\": \"allow\"}}}'",w:"Mantén el matcher estrecho: con .* aprobarías cualquier prompt de permiso."},
 {n:"No terminar sin tareas completas (prompt)",e:"Stop",t:"prompt",m:"",i:"",c:"Revisa si todas las tareas pedidas están completas. Si no, responde {\"ok\": false, \"reason\": \"lo que falta\"}.",w:"Un modelo evalúa; con ok:false Claude sigue trabajando usando reason como siguiente instrucción."},
 {n:"Verificar tests antes de terminar (agent)",e:"Stop",t:"agent",m:"",i:"",c:"Verifica que todos los tests unitarios pasen. Corre la suite y revisa el resultado. $ARGUMENTS",w:"Experimental: un subagente con herramientas verifica el estado real del código (timeout default 60 s)."},
 {n:"Auditoría HTTP",e:"PostToolUse",t:"http",m:"",i:"",c:"http://localhost:8080/hooks/tool-use",w:"POST del JSON del evento a tu servicio. Solo se resuelven variables listadas en allowedEnvVars."},
 {n:"Notificación de escritorio",e:"Notification",t:"command",m:"",i:"",c:"notify-send 'Claude Code' 'Claude necesita tu atención'",w:"Te avisa cuando Claude espera input o permiso."}
];
const EVS=["PreToolUse","PostToolUse","PermissionRequest","UserPromptSubmit","SessionStart","Stop","SubagentStop","Notification","PreCompact","ConfigChange","SessionEnd"];
$("#hbPreset").innerHTML=HB.map((h,i)=>'<option value="'+i+'">'+h.n+'</option>').join("");
$("#hbEvent").innerHTML=EVS.map(e=>'<option>'+e+'</option>').join("");
function loadHB(i){const h=HB[i];$("#hbEvent").value=h.e;$("#hbType").value=h.t;$("#hbMatch").value=h.m;$("#hbIf").value=h.i;$("#hbCmd").value=h.c;$("#hbWhy").textContent=h.w;renderHB();}
function renderHB(){
  const ev=$("#hbEvent").value,t=$("#hbType").value,m=$("#hbMatch").value.trim(),iff=$("#hbIf").value.trim(),c=$("#hbCmd").value;
  $("#hbCmdL").textContent={command:"Comando",prompt:"Prompt",agent:"Prompt del agente",http:"URL"}[t];
  const h={type:t};if(iff&&/Tool/.test(ev))h.if=iff;
  if(t==="command")h.command=c;else if(t==="http"){h.url=c;h.headers={Authorization:"Bearer $MY_TOKEN"};h.allowedEnvVars=["MY_TOKEN"];}else{h.prompt=c;if(t==="agent")h.timeout=120;}
  const grp={};if(m)grp.matcher=m;grp.hooks=[h];
  setCode($("#hbOut"),JSON.stringify({hooks:{[ev]:[grp]}},null,2));
}
on($("#hbPreset"),"change",e=>loadHB(+e.target.value));
["#hbEvent","#hbType","#hbMatch","#hbIf","#hbCmd"].forEach(s=>{on($(s),"input",renderHB);on($(s),"change",renderHB);});
loadHB(0);

/* ---------- SUBAGENT BUILDER ---------- */
const TOOLS=["Read","Grep","Glob","Edit","Write","Bash","WebFetch","WebSearch"];
const SA=[
 {k:"code-reviewer",d:"Revisa código por calidad, seguridad y convenciones. Use proactively tras cambios de código.",t:["Read","Grep","Glob","Bash"],m:"sonnet",p:"default",mem:"project",iso:"",b:"Eres un revisor senior. Al invocarte:\n1. Identifica los archivos modificados (git diff).\n2. Revisa calidad, seguridad y estilo según CLAUDE.md.\n3. Reporta hallazgos por severidad con archivo:línea.\nReporta solo lo que afecta correctitud o requisitos. No edites archivos."},
 {k:"security-reviewer",d:"Revisa vulnerabilidades de seguridad en el código.",t:["Read","Grep","Glob","Bash"],m:"opus",p:"default",mem:"",iso:"",b:"Eres un ingeniero de seguridad senior. Revisa:\n- Inyección (SQL, XSS, comandos)\n- Fallas de autenticación y autorización\n- Secretos o credenciales en el código\n- Manejo inseguro de datos\nEntrega referencias de línea y arreglos sugeridos."},
 {k:"test-runner",d:"Corre tests y corrige fallos. Usar cuando haya tests rojos o tras implementar features.",t:["Read","Grep","Glob","Edit","Bash"],m:"sonnet",p:"acceptEdits",mem:"",iso:"worktree",b:"Corres la suite, analizas cada fallo y corriges la causa raíz.\nNunca modifiques un test para que pase salvo que el test esté mal; en ese caso explícalo."},
 {k:"explorador-db",d:"Investiga el schema de Supabase, RLS y queries. Usar para preguntas sobre datos.",t:["Read","Grep","Glob"],m:"haiku",p:"plan",mem:"",iso:"",b:"Analizas supabase/migrations y el uso de queries en src/.\nResponde con tablas, relaciones y policies relevantes, citando archivos."}
];
$("#saTools").innerHTML=TOOLS.map(t=>'<button class="chip" data-t="'+t+'">'+t+'</button>').join("");
$("#saPre").innerHTML=SA.map((s,i)=>'<button class="chip" data-i="'+i+'">'+s.k+'</button>').join("");
let saTools=new Set();
function loadSA(i){const s=SA[i];$("#saName").value=s.k;$("#saDesc").value=s.d;saTools=new Set(s.t);$("#saModel").value=s.m;$("#saPerm").value=s.p;$("#saMem").value=s.mem;$("#saIso").value=s.iso;$("#saBody").value=s.b;$$("#saPre .chip").forEach((c,j)=>c.classList.toggle("on",i===j));renderSA();}
function renderSA(){$$("#saTools .chip").forEach(c=>c.classList.toggle("on",saTools.has(c.dataset.t)));
  const n=$("#saName").value.trim()||"mi-agente";
  const fm=["---","name: "+n,"description: "+$("#saDesc").value.trim(),"tools: "+TOOLS.filter(x=>saTools.has(x)).join(", "),"model: "+$("#saModel").value,"permissionMode: "+$("#saPerm").value];
  if($("#saMem").value)fm.push("memory: "+$("#saMem").value);if($("#saIso").value)fm.push("isolation: "+$("#saIso").value);
  fm.push("---","",$("#saBody").value);setCode($("#saOut"),fm.join("\n"));
  $("#saPath").textContent=".claude/agents/"+n+".md · invocar: @agent-"+n;}
on($("#saTools"),"click",e=>{const c=e.target.closest(".chip");if(!c)return;const t=c.dataset.t;saTools.has(t)?saTools.delete(t):saTools.add(t);renderSA();});
on($("#saPre"),"click",e=>{const c=e.target.closest(".chip");if(c)loadSA(+c.dataset.i);});
["#saName","#saDesc","#saModel","#saPerm","#saMem","#saIso","#saBody"].forEach(s=>{on($(s),"input",renderSA);on($(s),"change",renderSA);});
loadSA(0);

/* ---------- SKILL BUILDER ---------- */
function renderSK(){const n=$("#skName").value.trim()||"mi-skill";const fm=["---","name: "+n,"description: "+$("#skDesc").value.trim()];
  if($("#skHint").value.trim())fm.push("argument-hint: "+$("#skHint").value.trim());
  if($("#skTools").value.trim())fm.push("allowed-tools: "+$("#skTools").value.trim());
  if($("#skManual").checked)fm.push("disable-model-invocation: true");
  if($("#skFork").checked){fm.push("context: fork","agent: general-purpose");}
  fm.push("---","",$("#skBody").value);setCode($("#skOut"),fm.join("\n"));
  $("#skPath").innerHTML=".claude/skills/"+esc(n)+"/SKILL.md · invocar: <span style='color:var(--lv)'>/"+esc(n)+" pedidos_v2</span>";}
["#skName","#skDesc","#skHint","#skTools","#skBody","#skManual","#skFork"].forEach(s=>{on($(s),"input",renderSK);on($(s),"change",renderSK);});renderSK();

/* ---------- MCP ---------- */
let mcpT="http",mcpS="local";
const MCPDEF={http:["notion","https://mcp.notion.com/mcp","URL",""],sse:["asana","https://mcp.asana.com/sse","URL",""],stdio:["db","npx -y @bytebase/dbhub --dsn \"postgresql://readonly:pass@localhost:5432/app\"","Comando","DB_PASSWORD=..."]};
function toggleGroup(id,cb){on($(id),"click",e=>{const b=e.target.closest("button");if(!b)return;$$(id+" button").forEach(x=>x.classList.toggle("on",x===b));cb(b.dataset.v);});}
toggleGroup("#mcpT",v=>{mcpT=v;$("#mcpName").value=MCPDEF[v][0];$("#mcpTarget").value=MCPDEF[v][1];$("#mcpTargetL").textContent=MCPDEF[v][2];$("#mcpExtra").value=MCPDEF[v][3];renderMCP();});
toggleGroup("#mcpS",v=>{mcpS=v;renderMCP();});
function renderMCP(){const n=$("#mcpName").value.trim(),t=$("#mcpTarget").value.trim(),x=$("#mcpExtra").value.trim();
  const sc=mcpS==="local"?"":" --scope "+mcpS;let cmd;
  if(mcpT==="stdio")cmd="claude mcp add"+(x?" --env "+x:"")+" --transport stdio"+sc+" "+n+" -- "+t;
  else cmd="claude mcp add --transport "+mcpT+sc+" "+n+" "+t+(x?" \\\n  --header \""+x+"\"":"");
  setCode($("#mcpOut"),cmd+"\n\n# verificar\nclaude mcp list\n# autenticar (OAuth) desde la shell\nclaude mcp login "+n);
  const W={local:"<b>local</b>: solo tú, en este proyecto. Se guarda en ~/.claude.json bajo la ruta del proyecto.",project:"<b>project</b>: escribe <code>.mcp.json</code> en la raíz; se versiona y lo usa todo el equipo (con aprobación al primer uso).",user:"<b>user</b>: tú, en todos tus proyectos."};
  $("#mcpWhy").innerHTML=W[mcpS]+(mcpT==="stdio"?" stdio lanza un proceso local; todo lo que va después de <code>--</code> es el comando del servidor.":mcpT==="sse"?" SSE está obsoleto: prefiere HTTP si el servidor lo soporta.":" HTTP es el transporte remoto recomendado. Los servidores con OAuth se autentican desde <code>/mcp</code>.");}
["#mcpName","#mcpTarget","#mcpExtra"].forEach(s=>on($(s),"input",renderMCP));renderMCP();

/* ---------- FAILURES ---------- */
const FAILS=[
 [" La sesión cajón de sastre","Empiezas una tarea, preguntas algo no relacionado y vuelves. El contexto se llena de información irrelevante.","<strong>Arreglo:</strong> /clear entre tareas no relacionadas (con /rename antes si quieres volver)."],
 [" Corregir una y otra vez","Algo sale mal, corriges, sigue mal, vuelves a corregir. El contexto se contamina de enfoques fallidos.","<strong>Arreglo:</strong> tras dos correcciones fallidas, /clear y un prompt inicial mejor que incorpore lo aprendido."],
 [" El CLAUDE.md sobreespecificado","Es tan largo que Claude ignora la mitad: las reglas importantes se pierden en el ruido.","<strong>Arreglo:</strong> poda sin piedad. Si Claude ya lo hace bien sin la instrucción, bórrala o conviértela en hook."],
 [" Confiar y después verificar","Claude produce algo plausible que no maneja casos borde.","<strong>Arreglo:</strong> siempre dale una forma de verificar (tests, scripts, capturas). Si no lo puedes verificar, no lo publiques."],
 [" La exploración infinita","Pides \"investiga\" sin acotar; Claude lee cientos de archivos y llena el contexto.","<strong>Arreglo:</strong> acota la investigación o delégala a subagentes."],
 [" El revisor que todo lo objeta","Un revisor al que pides encontrar problemas siempre encuentra algunos, y persiguiéndolos todos sobreingenierizas.","<strong>Arreglo:</strong> pide reportar solo brechas que afecten correctitud o los requisitos; el resto es opcional."]
];
$("#fails").innerHTML=FAILS.map(f=>'<button class="fail"><b>'+f[0]+'</b>'+f[1]+'<div class="fx">'+f[2]+'</div></button>').join("");
on($("#fails"),"click",e=>{const f=e.target.closest(".fail");if(f)f.classList.toggle("open");});

/* ---------- SCENARIOS ---------- */
const MECH=["CLAUDE.md","Hook","Skill","Subagente","MCP","Permisos","Plugin","Headless/CI","Output style","Workflow"];
const SC=[
 ["El equipo usa pnpm, nunca npm.","CLAUDE.md","Convención que Claude debe conocer en cada sesión. Si quieres garantizarlo, suma un deny o un hook para Bash(npm *)."],
 ["Cada archivo editado debe quedar formateado, sin excepción.","Hook","\"Sin excepción\" = determinista. PostToolUse con matcher Edit|Write lo garantiza; CLAUDE.md solo lo pide."],
 ["Procedimiento de release de 12 pasos que se usa una vez al mes.","Skill","Largo y ocasional: no debe ocupar contexto siempre. Una skill con disable-model-invocation cuesta cero hasta /release."],
 ["Investigar 40 archivos del flujo de pagos sin llenar el contexto.","Subagente","Contexto aislado: lee todo y devuelve un resumen. Tu conversación queda limpia."],
 ["Consultar issues de Jira y errores de Sentry desde la sesión.","MCP","Acceso a sistemas externos sin CLI cómodo. Configúralo con scope project para el equipo."],
 ["Nadie debe poder leer .env, en ningún modo.","Permisos","Un deny en Read(./.env) aplica en todos los modos, incluso bypass. En managed settings, para toda la organización."],
 ["Distribuir hooks, skills, agentes y MCP a 30 devs con versionado.","Plugin","Los plugins empaquetan todo lo anterior y se instalan desde un marketplace con versiones."],
 ["Revisar automáticamente cada PR antes del review humano.","Headless/CI","GitHub Action con claude-code-action o claude -p en tu pipeline, con herramientas preaprobadas (o el servicio Code Review)."],
 ["Quieres respuestas cortas en todas las sesiones, sin pedirlo cada vez.","Output style","El estilo Concise (o uno propio) fija el formato de toda la sesión."],
 ["Migrar 500 componentes a TypeScript, verificando cada resultado.","Workflow","Supera a un puñado de subagentes: un script con pipeline() y verificación cruzada; resultados intermedios fuera de tu contexto."]
];
const scAns={};
$("#scen").innerHTML=SC.map((s,i)=>'<div class="sc" data-i="'+i+'"><div>'+esc(s[0])+'</div><div class="mechs">'+MECH.map(m=>'<button class="chip" data-m="'+m+'">'+m+'</button>').join("")+'</div><div class="ans"><b>'+s[1]+'</b> — '+esc(s[2])+'</div></div>').join("");
on($("#scen"),"click",e=>{const b=e.target.closest("[data-m]");if(!b)return;const card=b.closest(".sc"),i=+card.dataset.i;if(scAns[i]!==undefined)return;
  const ok=b.dataset.m===SC[i][1];scAns[i]=ok;b.classList.add(ok?"right":"wrong");if(!ok)card.querySelector('[data-m="'+SC[i][1]+'"]').classList.add("right");card.classList.add("open");
  $("#scScore").textContent=Object.values(scAns).filter(Boolean).length+"/"+SC.length+" correctas";});

/* ---------- STACK ---------- */
const LAY=[
 ["Managed settings","consola de claude.ai, MDM o managed-settings.json","claude-opus-5-5"],
 ["Línea de comandos","--settings '{...}' (solo esta sesión)","haiku"],
 ["Local del proyecto",".claude/settings.local.json (fuera de git)","opus"],
 ["Proyecto compartido",".claude/settings.json (versionado)","sonnet"],
 ["Usuario","~/.claude/settings.json (todos tus proyectos)","opus"]
];
const layOn=[false,false,false,true,true];
function renderStack(){const win=layOn.indexOf(true);
  $("#stack").innerHTML=LAY.map((l,i)=>'<div class="layer'+(layOn[i]?" def":"")+(i===win?" win":"")+(layOn[i]&&i!==win?" shadow":"")+'" data-i="'+i+'"><span class="sw">'+(layOn[i]?"✓":"")+'</span><div><b>'+(i+1)+'. '+l[0]+'</b><small>'+esc(l[1])+'</small></div><span class="val">'+(layOn[i]?'"model": "'+l[2]+'"':"—")+'</span></div>').join("");
  $("#stackMsg").innerHTML=win<0?"Ninguna capa define <code>model</code>: se usa el default de la cuenta.":"Gana <b style='color:var(--lv)'>"+LAY[win][0]+"</b> → <code>"+LAY[win][2]+"</code>."+(win===0?" Un model gestionado es el default de partida; para bloquear modelos se usan availableModels y deniedModels.":"")+" Recuerda: <code>/model</code>, <code>--model</code> y <code>ANTHROPIC_MODEL</code> también lo sobrescriben por su cuenta.";}
on($("#stack"),"click",e=>{const l=e.target.closest(".layer");if(!l)return;const i=+l.dataset.i;layOn[i]=!layOn[i];renderStack();});
renderStack();

/* ---------- TREE ---------- */
const TREE=[
 ["mi-repo/",0,null],
 ["CLAUDE.md",1,["Memoria del proyecto","Comandos, stack, convenciones y prohibiciones. Menos de 200 líneas. Puede importar otros archivos con @ruta."]],
 ["CLAUDE.local.md",1,["Instrucciones personales","Tus preferencias para este proyecto. En .gitignore."]],
 [".mcp.json",1,["Servidores MCP del equipo","Creado con claude mcp add --scope project. Usa ${VAR} para credenciales, nunca secretos en claro."]],
 [".worktreeinclude",1,["Archivos ignorados para worktrees","Sintaxis de .gitignore: copia .env y similares a cada worktree que crea Claude Code."]],
 [".claude/",1,null],
 ["settings.json",2,["Settings del equipo","Permisos allow/ask/deny, hooks, sandbox, env, plugins habilitados. Agrega $schema para autocompletado."]],
 ["settings.local.json",2,["Ajustes personales","Fuera de git. Aquí se guardan tus 'Yes, and don't ask again'."]],
 ["rules/",2,null],
 ["api.md",3,["Rule con paths","Solo se carga cuando Claude toca src/app/api/**. Mantiene CLAUDE.md pequeño."]],
 ["agents/",2,null],
 ["code-reviewer.md",3,["Subagente de revisión","Solo lectura, sonnet, memory: project. Se invoca con @agent-code-reviewer o automáticamente."]],
 ["skills/",2,null],
 ["nueva-migracion/",3,null],
 ["SKILL.md",4,["Skill de migraciones","disable-model-invocation, allowed-tools acotadas, !`git status` para contexto dinámico. Se invoca con /nueva-migracion."]],
 ["template.sql",4,["Archivo de apoyo","Claude lo lee solo cuando ejecuta la skill. Referéncialo desde SKILL.md."]],
 ["hooks/",2,null],
 ["block-rm.sh",3,["Hook de seguridad","Referenciado desde settings.json en PreToolUse con ${CLAUDE_PROJECT_DIR}. Sale con exit 2 para bloquear."]],
 ["workflows/",2,null],
 ["audit-routes.js",3,["Workflow guardado","Script de orquestación reutilizable; corre como /audit-routes."]],
 ["output-styles/",2,null],
 ["diagramas.md",3,["Output style del equipo","Se activa con /output-style."]],
 ["agent-memory/",2,["Memoria de subagentes","Lo que aprenden los subagentes con memory: project. Versionable."]],
 [".github/workflows/claude.yml",1,["CI con Claude","claude-code-action@v1: responde a @claude y puede revisar PRs automáticamente."]]
];
$("#tree").innerHTML=TREE.map((t,i)=>{const pre="  ".repeat(t[1])+(t[1]?"└ ":"");const ic=t[0].endsWith("/")?" ":" ";return '<button data-i="'+i+'"'+(t[2]?"":' disabled style="opacity:.7;cursor:default"')+'>'+esc(pre)+ic+esc(t[0])+'</button>';}).join("");
on($("#tree"),"click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;$$("#tree button").forEach(x=>x.classList.toggle("on",x===b));const d=TREE[+b.dataset.i][2];$("#tdesc").innerHTML="<h4>"+esc(TREE[+b.dataset.i][0])+"</h4><b>"+esc(d[0])+"</b><p style='color:var(--mute);margin:8px 0 0'>"+esc(d[1])+"</p>";});

/* ---------- PARALLEL DECISION ---------- */
const DQ=[
 ["¿Quién debe coordinar el trabajo?",["Claude, dentro de mi conversación","Yo: delego y reviso después","Claude, repartiendo a un grupo","Un script con el plan"]],
 ["¿Los trabajadores necesitan hablar entre ellos?",["No, solo devolver resultado","Sí, discutir y desafiarse"]],
 ["¿Cuánto trabajo es?",["Unas pocas tareas","Decenas o cientos de ítems"]],
 ["¿Debe seguir con tu máquina apagada?",["No","Sí"]]
];
const dqA=[null,null,null,null];
$("#dqs").innerHTML=DQ.map((q,i)=>'<div class="dq"><p>'+(i+1)+'. '+q[0]+'</p><div class="chips" data-q="'+i+'">'+q[1].map((o,j)=>'<button class="chip" data-o="'+j+'">'+o+'</button>').join("")+'</div></div>').join("");
on($("#dqs"),"click",e=>{const b=e.target.closest("[data-o]");if(!b)return;const q=+b.parentElement.dataset.q;dqA[q]=+b.dataset.o;b.parentElement.querySelectorAll(".chip").forEach(c=>c.classList.toggle("on",c===b));dqRender();});
function dqRender(){
  if(dqA.some(a=>a===null)){$("#dqReco").innerHTML='<span style="color:var(--mute)">Responde las '+DQ.length+' preguntas.</span>';return;}
  let r;
  if(dqA[3]===1)r=["Nube: Projects o claude --cloud","Trabajo que debe seguir sin tu máquina: sesiones en la nube (una por tarea con --cloud) o un Project que lance y siga hilos por ti. Para tareas recurrentes, /schedule."];
  else if(dqA[2]===1||dqA[0]===3)r=["Dynamic workflow","Muchos ítems o un plan que conviene codificar: un workflow corre decenas o cientos de subagentes, verifica hallazgos entre ellos y deja tu contexto con la respuesta final. Para un cambio grande puntual, /batch."];
  else if(dqA[1]===1||dqA[0]===2)r=["Agent teams (experimental)","Necesitas que los trabajadores discutan, se desafíen y se coordinen con una lista de tareas compartida. Empieza con 3 a 5 compañeros con archivos separados."];
  else if(dqA[0]===1)r=["Agent view + worktrees","Tareas independientes que delegas y revisas después: claude agents o --bg, cada sesión aislada en su worktree."];
  else r=["Subagentes","Trabajo enfocado dentro de tu conversación: cada subagente lee lo que necesita en su contexto y te devuelve un resumen."];
  $("#dqReco").innerHTML="<h4>"+r[0]+"</h4>"+r[1];
}
dqRender();

/* ---------- FAN-OUT ---------- */
const fanSvg=$("#fanSvg");
const SUBS=[{x:95,t:"Explore",s:"flujo de cobro"},{x:285,t:"Explore",s:"webhooks de pago"},{x:475,t:"security",s:"RLS y secretos"},{x:665,t:"test-runner",s:"cobertura"}];
function drawFan(){
  let h='';
  SUBS.forEach((s,i)=>{h+='<path id="pd'+i+'" d="M380 92 C380 150 '+s.x+' 140 '+s.x+' 196" fill="none" stroke="var(--line2)" stroke-width="1.5" stroke-dasharray="4 5"/>';});
  h+='<rect x="270" y="30" width="220" height="62" rx="14" fill="var(--surface-2)" stroke="var(--lv)" stroke-width="1.5"/><text x="380" y="56" text-anchor="middle" font-size="13" font-weight="700">SCRIPT DEL WORKFLOW</text><text x="380" y="76" text-anchor="middle" font-size="11" style="fill:var(--mute)">tu contexto: solo el resultado</text>';
  h+='<rect x="300" y="100" width="160" height="8" rx="4" fill="var(--line)"/><rect id="orcCtx" x="300" y="100" width="12" height="8" rx="4" fill="var(--lv)"/>';
  SUBS.forEach((s,i)=>{h+='<g id="sub'+i+'" opacity=".4"><rect x="'+(s.x-80)+'" y="196" width="160" height="88" rx="12" fill="var(--surface)" stroke="var(--line2)"/><text x="'+s.x+'" y="222" text-anchor="middle" font-size="12" font-weight="700">'+s.t+'</text><text x="'+s.x+'" y="240" text-anchor="middle" font-size="11" style="fill:var(--mute)">'+s.s+'</text><rect x="'+(s.x-60)+'" y="256" width="120" height="8" rx="4" fill="var(--line)"/><rect id="sc'+i+'" x="'+(s.x-60)+'" y="256" width="0" height="8" rx="4" fill="var(--a)"/><text id="st'+i+'" x="'+s.x+'" y="306" text-anchor="middle" font-size="10.5" style="fill:var(--dim)">en espera</text></g>';});
  h+='<g id="pkts"></g><text x="380" y="356" text-anchor="middle" font-size="11" style="fill:var(--dim)" id="fanFoot">cada agente tiene su propia ventana de contexto</text>';
  fanSvg.innerHTML=h;
}
function packet(i,back){return new Promise(res=>{const p=byId("pd"+i),L=p.getTotalLength(),c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("r",back?5:6);c.setAttribute("fill",back?"var(--ok)":"var(--lv)");$("#pkts").appendChild(c);const t0=performance.now(),D=900;
  (function f(t){const k=Math.min((t-t0)/D,1),pt=p.getPointAtLength(back?L*(1-k):L*k);c.setAttribute("cx",pt.x);c.setAttribute("cy",pt.y);if(k<1)requestAnimationFrame(f);else{c.remove();res();}})(t0);});}
let fanRun=0;
async function playFan(){const my=++fanRun;drawFan();const msg=$("#fanMsg");
  msg.innerHTML="<b>1. Fan-out:</b> el script divide la auditoría en 4 tareas independientes y lanza un agente por cada una con <code>parallel()</code>.";
  await Promise.all(SUBS.map((s,i)=>sleep(i*150).then(()=>packet(i,false)).then(()=>{byId("sub"+i).setAttribute("opacity","1");byId("st"+i).textContent="trabajando…";})));
  if(my!==fanRun)return;
  msg.innerHTML="<b>2. Trabajo aislado:</b> cada agente lee decenas de archivos en su contexto. Los resultados intermedios viven en variables del script.";
  const tgt=[105,92,118,80];const t0=performance.now();
  await new Promise(r=>{(function f(t){const k=Math.min((t-t0)/2200,1);SUBS.forEach((s,i)=>byId("sc"+i).setAttribute("width",tgt[i]*k));if(k<1&&my===fanRun)requestAnimationFrame(f);else r();})(t0);});
  if(my!==fanRun)return;
  SUBS.forEach((s,i)=>byId("st"+i).textContent=["3 hallazgos","1 crítico","2 hallazgos","cobertura 64%"][i]);
  msg.innerHTML="<b>3. Verificación cruzada:</b> agentes independientes intentan refutar cada hallazgo; los que no sobreviven se descartan.";
  await sleep(1500);if(my!==fanRun)return;
  byId("st0").textContent="2 confirmados";byId("st2").textContent="1 confirmado";
  await Promise.all(SUBS.map((s,i)=>sleep(i*200).then(()=>packet(i,true))));
  if(my!==fanRun)return;
  byId("orcCtx").setAttribute("width",34);
  msg.innerHTML='<b style="color:var(--ok)">4. Resultado:</b> a tu conversación llega un solo informe priorizado: <span style="color:var(--bad)">1 crítico</span> (webhook sin verificación de firma), 3 medios y un plan de tests. Tu contexto casi no creció.';
}
drawFan();on($("#fanPlay"),"click",playFan);

/* ---------- CI FLOW ---------- */
const CI=[
 {i:"",t:"PR abierto",s:"evento GitHub",d:"pull_request: opened\n→ dispara .github/workflows/claude-review.yml",ms:1500},
 {i:"",t:"Action",s:"runner",d:"actions/checkout@v6\nanthropics/claude-code-action@v1\n  plugins: code-review@claude-code-plugins\n  prompt: /code-review:code-review --comment …",ms:1800},
 {i:"",t:"Claude analiza",s:"herramientas acotadas",d:"● Read(diff + archivos tocados)\n● Read(CLAUDE.md)  ← convenciones del repo\n● Bash(pnpm test)\n  ⎿ ✓ 128 tests",ms:2200},
 {i:"",t:"Comenta",s:"inline en el PR",d:" 2 hallazgos:\n  src/lib/envio.ts:48  división por cero si peso = 0\n  src/app/api/pedidos/route.ts:12  body sin validar con zod",ms:2000},
 {i:"",t:"Humano decide",s:"merge humano",d:"El dev comenta \"@claude agrega el test para peso = 0\"\n→ Claude hace push de un commit a la rama del PR.\nEl merge sigue siendo una decisión humana.",ms:2000}
];
const ciPlay=makeFlow($("#ciFlow"),CI,s=>{$("#ciDet").textContent=s.d;});
on($("#ciPlay"),"click",()=>ciPlay());

/* ---------- GOV ---------- */
const GOV=["CLAUDE.md del repo versionado y bajo 200 líneas, revisado en PRs como código","Deny de secretos (.env, credenciales) en settings del equipo o managed","Reglas ask para push, deploy y comandos destructivos","Hooks de formato/lint en PostToolUse y compuerta de tests en Stop","Sandbox de Bash activado con allowlist de dominios","Subagente de revisión compartido en .claude/agents","Skills para procedimientos repetibles con disable-model-invocation si tienen efectos","Servidores MCP en .mcp.json sin secretos en claro","Plugin interno publicado en un marketplace de la organización","Marketplaces permitidos restringidos (strictKnownMarketplaces)","Revisión automática de PRs (Action o Code Review) con herramientas acotadas","Monitoreo de uso y costo (analytics u OpenTelemetry) y límites de gasto"];
const govS=state.gov||{};
function renderGov(){$("#gov").innerHTML=GOV.map((g,i)=>'<label style="display:flex;gap:10px;align-items:center;text-transform:none;letter-spacing:0;font-family:var(--body);font-size:14px;color:'+(govS[i]?"var(--text)":"var(--ink-2)")+';cursor:pointer;margin:8px 0"><input type="checkbox" data-g="'+i+'" style="width:auto;accent-color:var(--x)"'+(govS[i]?" checked":"")+'> '+g+'</label>').join("");
  const n=Object.values(govS).filter(Boolean).length;$("#govScore").textContent=n+"/"+GOV.length+(n===GOV.length?" · harness maduro ":"");}
on($("#gov"),"change",e=>{const c=e.target.closest("[data-g]");if(!c)return;govS[c.dataset.g]=c.checked;state.gov=govS;save();renderGov();});
renderGov();

/* ---------- QUIZZES ---------- */
const QZ={
 basico:[
  ["¿Cuál es la mejora individual más grande en la calidad de lo que entrega Claude Code?",["Usar siempre el modelo más caro","Darle una forma de verificar su trabajo (tests, build, capturas)","Escribir prompts muy largos","Desactivar los permisos"],1,"Con un chequeo que devuelva pasa/falla, el loop agéntico se cierra solo: actúa, verifica, corrige."],
  ["¿Qué hace el prefijo ! en el input?",["Marca el prompt como urgente","Corre un comando de shell directo y agrega su salida a la sesión","Abre los permisos","Fuerza una respuesta corta"],1,"El modo shell ejecuta el comando sin pasar por el modelo; la salida queda en la conversación."],
  ["Claude va en la dirección equivocada a mitad de una tarea. ¿Qué haces primero?",["Ctrl+D dos veces","Esperar a que termine","Presionar Esc y redirigirlo","Cerrar la terminal"],2,"Esc detiene la acción en curso, conserva el contexto y espera tu instrucción."],
  ["¿Qué hace /btw?",["Guarda un recordatorio","Hace una pregunta al margen cuya respuesta no entra al historial","Cambia de modelo","Exporta la sesión"],1,"Sirve para consultar un detalle sin hacer crecer el contexto."],
  ["¿Cuáles son las tres fases del loop agéntico?",["Planificar, codificar, desplegar","Reunir contexto, actuar, verificar","Leer, escribir, commitear","Preguntar, responder, resumir"],1,"Las fases se mezclan y se repiten hasta cumplir el objetivo; tú puedes interrumpir en cualquier momento."]
 ],
 intermedio:[
  ["Quieres que Claude nunca lea .env, en ningún modo. ¿Qué usas?",["Una línea en CLAUDE.md","Una regla deny: Read(./.env)","Plan mode","Una regla ask"],1,"deny bloquea en todos los modos, incluido bypassPermissions. CLAUDE.md es solo un pedido."],
  ["¿En qué orden se evalúan las reglas de permisos?",["allow → ask → deny","De la más específica a la más general","deny → ask → allow","Según el archivo donde están"],2,"Gana la primera coincidencia en ese orden; la especificidad no cambia el orden."],
  ["¿Con qué modo parte por defecto una sesión interactiva de terminal en versiones recientes?",["Manual","Plan","Auto","Accept edits"],2,"Desde la v2.1.283 el modo de inicio en terminal y VS Code es auto; claude -p parte en Manual."],
  ["Terminaste una tarea y empiezas otra no relacionada. ¿Qué es lo mejor?",["/compact","/clear","/rewind","Nada"],1,"/clear da un contexto limpio; /compact es para seguir en la misma tarea liberando espacio."],
  ["¿Qué NO deshace un rewind?",["Ediciones hechas con la herramienta Edit","Un archivo borrado con rm vía Bash","La conversación","Archivos creados con Write"],1,"Los checkpoints rastrean solo las herramientas de edición de archivos; cambios por Bash y efectos remotos no se revierten."]
 ],
 avanzado:[
  ["Un hook PreToolUse debe bloquear un comando. ¿Con qué código de salida?",["exit 1","exit 0","exit 2","exit 127"],2,"exit 2 bloquea y envía stderr a Claude. exit 1 es un error no bloqueante: la acción sigue."],
  ["¿Cuál es la ventaja principal de un subagente?",["Siempre es más barato","Tiene su propia ventana de contexto y devuelve solo un resumen","Puede saltarse los permisos","Corre en la nube"],1,"El aislamiento de contexto mantiene limpia la conversación principal."],
  ["¿Qué hace disable-model-invocation: true en una skill?",["La borra","Solo tú puedes invocarla y su descripción no ocupa contexto","La corre en un subagente","La hace obligatoria"],1,"Ideal para skills con efectos secundarios: costo cero de contexto hasta que la invocas."],
  ["¿Dónde se guarda un servidor MCP agregado con --scope project?",["~/.claude.json","CLAUDE.md","Un .mcp.json en la raíz del repo","settings.local.json"],2,".mcp.json se versiona y lo comparte el equipo, con aprobación al primer uso."],
  ["¿Qué NO cubre el sandbox de Bash?",["Comandos de shell que corre Claude","Procesos hijos de esos comandos","Las herramientas Read y Edit","Conexiones de red de comandos sandboxeados"],2,"Read, Edit, Write y WebFetch se rigen por las reglas de permiso; el sandbox envuelve solo los comandos de shell."]
 ],
 arquitecto:[
  ["Para un valor escalar como model, ¿qué capa de settings gana si está definida?",["Usuario","Proyecto compartido","Managed settings","Local del proyecto"],2,"Managed tiene la máxima prioridad; nada en tus archivos ni --settings lo sobrescribe."],
  ["Un procedimiento de 12 pasos que se usa ocasionalmente debería ser…",["Parte de CLAUDE.md","Una skill","Un hook Stop","Un servidor MCP"],1,"Las skills cargan su contenido solo al usarse; no gastan contexto en cada sesión."],
  ["En CI sin humanos, ¿qué modo evita que la corrida se quede esperando un permiso?",["default","plan","dontAsk con herramientas preaprobadas","acceptEdits"],2,"dontAsk deniega todo lo que pediría aprobación en vez de esperar."],
  ["¿Cuál es la diferencia clave entre subagentes y un dynamic workflow?",["Los workflows no usan subagentes","En un workflow el plan y los resultados intermedios viven en un script, no en el contexto de Claude","Los subagentes son más caros","Los workflows solo corren en la nube"],1,"Con subagentes Claude decide turno a turno; en un workflow lo decide el script y tu contexto recibe solo la respuesta final."],
  ["¿Cómo evalúa /goal si se cumplió la condición?",["Corre los tests por su cuenta","Un modelo rápido juzga la condición contra lo que Claude mostró en la conversación","El usuario confirma cada turno","Revisa el último commit"],1,"El evaluador no corre comandos ni lee archivos: escribe condiciones que la salida de Claude pueda demostrar."]
 ]
};
/* ===== Datos: catálogo de comandos (fuente: code.claude.com/docs/en/commands, cli-reference, interactive-mode; nov 2026) ===== */
const CMD_CATS={ses:"Sesión y conversación",ctx:"Contexto y memoria",mod:"Modelo y rendimiento",per:"Permisos y seguridad",cfg:"Configuración e interfaz",rev:"Revisión y cambios",par:"Agentes y automatización",ext:"MCP, plugins y skills",nube:"Nube, remoto e integraciones",art:"Artefactos y diseño",cta:"Cuenta, uso y ayuda"};
/* n=nombre a=argumentos c=categoría d=qué hace o=opciones e=ejemplos t=tipo(s skill, w workflow, x eliminado) al=alias tip=consejo */
const CMDS=[
{n:"/add-dir",a:"<ruta>",c:"ctx",d:"Agrega un directorio de trabajo extra para que Claude pueda leer y editar archivos ahí durante la sesión. Da acceso a archivos, pero la mayoría de la configuración .claude/ de ese directorio no se descubre.",o:[["<ruta>","Directorio a agregar. Escribe parte de la ruta y presiona Tab para autocompletar."]],e:["/add-dir ../libs/shared","/add-dir ~/proyectos/api"],tip:"Para que sea permanente usa permissions.additionalDirectories en settings. Al agregarlo corren tus hooks DirectoryAdded."},
{n:"/advisor",a:"[modelo|off]",c:"mod",d:"Activa o desactiva la herramienta advisor: un segundo modelo al que Claude consulta en momentos clave de la tarea.",o:[["fable | opus | sonnet","Alias del modelo asesor (fable requiere acceso a Fable)."],["<id de modelo>","ID completo de un modelo."],["off","Desactiva el advisor."]],e:["/advisor opus","/advisor off"]},
{n:"/agents",c:"par",d:"Muestra un recordatorio: pídele a Claude que cree o gestione subagentes, o edita .claude/agents/ o ~/.claude/agents/ directamente. (Hasta v2.1.197 abría un asistente interactivo.)",o:[],e:["/agents","crea un subagente 'revisor' de solo lectura que use sonnet"]},
{n:"/artifact-capabilities",c:"art",t:"s",d:"Carga la referencia de capacidades de runtime que puede usar un artefacto publicado, como llamar a tus conectores.",o:[],e:["/artifact-capabilities"]},
{n:"/artifact-diagramming",c:"art",t:"s",d:"Carga guía de diagramación para artefactos: cuándo conviene un diagrama, qué dibujar y cómo escribir SVG legible en tema claro y oscuro.",o:[],e:["/artifact-diagramming"]},
{n:"/artifacts",c:"art",d:"Lista los artefactos que tienes o que te compartieron; luego puedes adjuntar uno a la sesión, abrirlo en el navegador o copiar su enlace.",o:[],e:["/artifacts"]},
{n:"/auto-mode-setup",c:"per",d:"Redacta entradas autoMode.environment a partir de tu proyecto y sesiones recientes; las revisas y se guardan en tus settings de usuario. Le da contexto al clasificador del modo auto sobre tu infraestructura.",o:[],e:["/auto-mode-setup"],tip:"Requiere plan Pro, Max o Team. Revisa el borrador antes de guardar."},
{n:"/autocompact",a:"[auto|<tokens>]",c:"ctx",d:"Define qué tan lleno puede estar el contexto antes de que Claude Code compacte automáticamente. Se guarda en settings de usuario y aplica a la sesión actual.",o:[["<tokens>","Tamaño, por ejemplo 500k."],["auto","Vuelve a la ventana ajustada para tu modelo."],["(sin argumento)","Abre un diálogo con la ventana actual."]],e:["/autocompact 500k","/autocompact auto"],tip:"Solo para una sesión: claude --autocompact 500k"},
{n:"/autofix-pr",a:"[prompt]",c:"nube",d:"Lanza una sesión en la nube que vigila el PR de tu rama actual y empuja arreglos cuando falla CI o llegan comentarios de revisores.",o:[["[prompt]","Instrucciones extra para la sesión (por ejemplo, solo arreglar lint)."]],e:["/autofix-pr","/autofix-pr solo arregla los tests, no toques la API pública"]},
{n:"/background",a:"[prompt]",c:"par",al:"/bg",d:"Desacopla la sesión actual para que siga como agente en segundo plano y libera la terminal. La monitoreas con claude agents.",o:[["[prompt]","Una última instrucción antes de pasar a segundo plano."]],e:["/background","/bg termina la migración y corre los tests"],tip:"Si quieres seguir trabajando aquí y lanzar una copia, usa /fork."},
{n:"/batch",a:"<instrucción>",c:"par",t:"s",d:"Orquesta cambios masivos en paralelo: investiga el código, divide el trabajo en 5 a 30 unidades independientes y te presenta un plan. Al aprobarlo, lanza un subagente en segundo plano por unidad, cada uno en su propio worktree; cada uno implementa, corre tests y publica su cambio.",o:[["<instrucción>","El cambio a gran escala que quieres."]],e:["/batch migra src/ de JavaScript a TypeScript","/batch reemplaza moment.js por date-fns en todo el repo"],tip:"Necesita un repo git o un hook WorktreeCreate que cree los worktrees."},
{n:"/branch",a:"[nombre]",c:"ses",d:"Crea una rama de la conversación en este punto y te cambia a ella, para probar otra dirección sin perder la original (vuelves con /resume).",o:[["[nombre]","Nombre para la rama de conversación."]],e:["/branch alternativa-redis"],tip:"/branch = te cambias tú a la copia. /fork = la copia corre en segundo plano. /subtask = un subagente te reporta aquí."},
{n:"/btw",a:"[pregunta]",c:"ses",d:"Hace una pregunta lateral sobre la sesión sin agregarla a la conversación (no gasta el contexto principal). Sin argumento, muestra tus preguntas laterales anteriores.",o:[["[pregunta]","Tu pregunta al margen."]],e:["/btw ¿qué archivo era el del middleware de auth?"]},
{n:"/bug",a:"[reporte]",c:"cta",d:"Reporta un bug o comparte la conversación. Eliges cuánto historial incluir y confirmas en una pantalla de consentimiento antes de enviar.",o:[["[reporte]","Descripción del problema."]],e:["/bug el diff no muestra archivos renombrados"]},
{n:"/cd",a:"<ruta>",c:"ses",d:"Mueve la sesión a otro directorio de trabajo conservando la conversación. Claude Code relee la configuración del proyecto desde el nuevo directorio.",o:[["<ruta>","Directorio destino (Tab autocompleta)."]],e:["/cd ../frontend"],tip:"/cd cambia el directorio principal; /add-dir solo suma acceso a archivos."},
{n:"/chrome",c:"nube",d:"Configura la integración Claude in Chrome.",o:[],e:["/chrome"]},
{n:"/claude-api",a:"[subcomando]",c:"ext",t:"s",d:"Carga material de referencia de la Claude API y el Agent SDK para tu lenguaje. Tiene subcomandos para migraciones, auditoría de prompts, costos y evaluaciones.",o:[["migrate | upgrade","Migrar a versiones o modelos nuevos."],["managed-agents-onboard","Onboarding de agentes gestionados."],["prompt-audit","Auditar prompts."],["cost-optimize","Optimizar costos."],["build-eval | hillclimb","Construir evaluaciones e iterar."],["preserved-thinking-migration","Migrar a thinking preservado."]],e:["/claude-api","/claude-api cost-optimize"]},
{n:"/claude-in-chrome",a:"[tarea]",c:"nube",t:"s",d:"Hace que Claude ejecute una tarea en tu navegador (probar una página, llenar un formulario, leer la consola) mediante Claude in Chrome.",o:[["[tarea]","Lo que debe hacer en el navegador."]],e:["/claude-in-chrome abre localhost:3000 y revisa errores de consola"]},
{n:"/clear",a:"[nombre]",c:"ctx",d:"Empieza una conversación nueva con contexto vacío. Con nombre, etiqueta la conversación anterior en el selector de /resume.",o:[["[nombre]","Etiqueta para la conversación que dejas."]],e:["/clear","/clear migracion-auth"],tip:"Úsalo entre tareas no relacionadas. Para liberar espacio sin cambiar de tarea usa /compact."},
{n:"/code-review",a:"[esfuerzo] [--fix] [--comment] [--max-findings n] [objetivo]",c:"rev",t:"s",al:"/review",d:"Revisa el diff actual (o un PR, rama o ruta) buscando bugs de correctitud; según modelo y esfuerzo también limpieza. Puede aplicar los hallazgos o publicarlos en el PR.",o:[["low … max","Nivel de esfuerzo de la revisión."],["ultra","Revisión profunda multiagente en la nube (ultrareview)."],["--fix","Claude aplica los hallazgos."],["--comment","Publica los hallazgos en el PR de GitHub o MR de GitLab."],["--max-findings n|all|default","Cuántos hallazgos reportar."],["pr# | rama | ruta","Qué revisar."]],e:["/code-review","/code-review high --fix","/code-review 1234 --comment","/code-review ultra"]},
{n:"/color",a:"[color|default]",c:"cfg",d:"Cambia el color de la barra del prompt de esta sesión (útil para distinguir terminales).",o:[["red | blue | green | yellow | purple | orange | pink | cyan","Color elegido."],["default","Restablece."],["(sin argumento)","Color al azar."]],e:["/color purple"]},
{n:"/compact",a:"[instrucciones]",c:"ctx",d:"Libera contexto resumiendo la conversación hasta ahora. Puedes indicar en qué enfocar el resumen.",o:[["[instrucciones]","Qué debe conservar el resumen."]],e:["/compact","/compact conserva la lista de archivos modificados y los comandos de test"],tip:"El CLAUDE.md raíz se relee del disco tras compactar; las instrucciones dadas solo en el chat pueden perderse."},
{n:"/config",a:"[clave=valor …]",c:"cfg",al:"/settings",d:"Abre la interfaz de Settings (tema, modelo, output style, etc.). Con pares clave=valor cambia un ajuste sin abrir el panel; también funciona en -p.",o:[["clave=valor","Uno o más ajustes directos."],["--help","Lista las claves aceptadas."]],e:["/config","/config theme=dark","/config verbose=true model=sonnet"]},
{n:"/context",a:"[all]",c:"ctx",d:"Visualiza el uso de contexto como una grilla de colores, con sugerencias para herramientas pesadas, memoria inflada y advertencias de capacidad.",o:[["all","Expande el detalle por elemento (en modo pantalla completa)."]],e:["/context","/context all"]},
{n:"/copy",a:"[N]",c:"ses",d:"Copia la última respuesta al portapapeles. Si hay bloques de código, muestra un selector para copiar solo un bloque.",o:[["[N]","Copia la N-ésima respuesta más reciente."]],e:["/copy","/copy 2"]},
{n:"/cost",c:"cta",d:"Alias de /usage.",o:[],e:["/cost"]},
{n:"/dataviz",a:"[pedido]",c:"art",t:"s",d:"Guía de diseño para gráficos y dashboards: elige la forma del gráfico, asigna color por rol y valida la paleta para daltonismo y contraste.",o:[],e:["/dataviz gráfico de latencia p95 por servicio"]},
{n:"/debug",a:"[descripción]",c:"cta",t:"s",d:"Activa el log de depuración desde ese momento y diagnostica problemas leyendo el log de la sesión.",o:[["[descripción]","El problema, para enfocar el análisis."]],e:["/debug el servidor MCP de github no conecta"]},
{n:"/deep-research",a:"<pregunta>",c:"par",t:"w",d:"Workflow que abre búsquedas web en paralelo, verifica fuentes cruzadas y sintetiza un reporte con citas.",o:[],e:["/deep-research comparar ORMs para Postgres en TypeScript"]},
{n:"/design",a:"[brief]",c:"art",t:"s",d:"Bosqueja mockups, flujos de pantallas, landings o posters como artboards en un lienzo, publicado como artefacto de Claude Design.",o:[],e:["/design pantalla de onboarding de una app de finanzas"]},
{n:"/design-login",c:"art",d:"Autoriza el acceso al design system para /design-sync con tu cuenta claude.ai.",o:[],e:["/design-login"]},
{n:"/design-sync",a:"[pista]",c:"art",t:"s",d:"Convierte el design system React de tu repo y lo sube a Claude Design, para que los diseños usen tus componentes reales.",o:[],e:["/design-sync"]},
{n:"/desktop",c:"nube",al:"/app",d:"Continúa la sesión actual en la app Claude Code Desktop (macOS o Windows x64, con suscripción).",o:[],e:["/desktop"]},
{n:"/diff",c:"rev",d:"Revisa los cambios del árbol de trabajo, incluidas las ediciones que Claude hizo hasta ahora.",o:[],e:["/diff"]},
{n:"/doctor",a:"[prompt-audit [ruta]]",c:"cta",t:"s",al:"/checkup",d:"Chequeo de instalación, settings, extensiones y CLAUDE.md; propone arreglos que Claude aplica tras tu confirmación. prompt-audit audita tus archivos de instrucciones.",o:[["prompt-audit [ruta]","Audita CLAUDE.md, reglas y skills."]],e:["/doctor","/doctor prompt-audit"],tip:"Desde la shell, sin abrir sesión: claude doctor (solo lectura)."},
{n:"/effort",a:"[nivel|auto|status|ultracode [on|off]]",c:"mod",d:"Define el nivel de esfuerzo (cuánto razona el modelo). status lo muestra. ultracode activa el modo en que Claude planifica un workflow por tarea.",o:[["low | medium | high | xhigh","Nivel persistente."],["max","Solo para esta sesión."],["auto","Deja que Claude Code lo ajuste."],["status","Muestra el nivel actual."],["ultracode [on|off]","Activa o desactiva ultracode."]],e:["/effort high","/effort status","/effort ultracode on"]},
{n:"/exit",c:"ses",al:"/quit",d:"Sale del CLI. En una sesión en segundo plano adjunta, solo se desacopla y la sesión sigue corriendo.",o:[],e:["/exit"]},
{n:"/export",a:"[archivo]",c:"ses",d:"Exporta la conversación como texto plano, a un archivo o al portapapeles.",o:[["[archivo]","Escribe directo a ese archivo."]],e:["/export sesion-auth.txt"]},
{n:"/fast",a:"[on|off]",c:"mod",d:"Activa o desactiva el modo rápido (salida más veloz a mayor costo, en modelos que lo soportan).",o:[["on | off","Estado deseado."]],e:["/fast on"]},
{n:"/feedback",a:"[reporte]",c:"cta",d:"Envía feedback del producto. Mismo diálogo y consentimiento que /bug.",o:[],e:["/feedback me gustaría filtrar /resume por rama"]},
{n:"/fewer-permission-prompts",c:"per",t:"s",d:"Escanea tus transcripts buscando llamadas Bash y MCP de solo lectura frecuentes y agrega una allowlist priorizada a .claude/settings.json del proyecto.",o:[],e:["/fewer-permission-prompts"],tip:"Revisa la lista antes de commitearla: queda para todo el equipo."},
{n:"/focus",c:"cfg",d:"Alterna la vista focus: solo tu último prompt, un resumen de una línea de herramientas (con diffstats) y la respuesta final. Solo en renderizado de pantalla completa.",o:[],e:["/focus"]},
{n:"/fork",a:"[prompt]",c:"par",d:"Copia la conversación a una nueva sesión en segundo plano y sigues trabajando aquí. Con prompt, la copia empieza a trabajar de inmediato; se le indica crear su propio worktree antes de cambiar código.",o:[["[prompt]","Tarea para la copia."]],e:["/fork escribe los tests de integración del endpoint nuevo"]},
{n:"/goal",a:"[condición|clear]",c:"par",d:"Fija una meta: Claude sigue trabajando turno tras turno hasta que se cumpla la condición. Sin argumento muestra la meta actual.",o:[["<condición>","Criterio verificable de término."],["clear | stop | off | reset | none | cancel","Quita la meta."]],e:["/goal todos los tests de npm test pasan y no hay errores de tsc","/goal clear"],tip:"Escribe condiciones verificables, no deseos: 'el build pasa', no 'que quede bonito'."},
{n:"/heapdump",c:"cta",d:"Escribe un snapshot de heap y un desglose de memoria para diagnosticar consumo alto. Adjunta solo el archivo -diagnostics.json al reportar.",o:[],e:["/heapdump"]},
{n:"/help",c:"cta",d:"Muestra la ayuda y los comandos disponibles.",o:[],e:["/help"]},
{n:"/hooks",c:"ext",d:"Navegador de solo lectura de los hooks configurados, por evento y fuente.",o:[],e:["/hooks"],tip:"Para crear o editar hooks, pídeselo a Claude o usa /update-config."},
{n:"/ide",c:"nube",d:"Gestiona integraciones con el IDE y muestra su estado.",o:[],e:["/ide"]},
{n:"/import",a:"[codex|gemini|cursor] [--dry-run] [--yes]",c:"cfg",d:"Trae configuración de OpenAI Codex, Gemini CLI o Cursor: archivos de instrucciones, servidores MCP, comandos, subagentes y skills.",o:[["codex | gemini | cursor","Origen."],["--dry-run","Previsualiza sin escribir."],["--yes","Salta el selector interactivo."]],e:["/import codex --dry-run","/import cursor"]},
{n:"/init",c:"ctx",d:"Inicializa el proyecto con un CLAUDE.md. Con CLAUDE_CODE_NEW_INIT=1 hay un flujo interactivo que también propone skills, hooks y memoria personal.",o:[],e:["/init"],tip:"Después recórtalo: borra todo lo que Claude podría deducir leyendo el código."},
{n:"/insights",c:"cta",d:"Genera un reporte HTML de tus sesiones recientes: proyectos, cómo usas Claude Code, dónde fallan las cosas y funciones por probar.",o:[],e:["/insights"]},
{n:"/install-github-app",c:"nube",d:"Instala la app de GitHub de Claude en un repo y opcionalmente configura workflows de GitHub Actions y secretos.",o:[],e:["/install-github-app"]},
{n:"/install-slack-app",c:"nube",d:"Instala la app de Claude para Slack (flujo OAuth en el navegador).",o:[],e:["/install-slack-app"]},
{n:"/keybindings",c:"cfg",d:"Abre tu archivo de atajos de teclado personalizados.",o:[],e:["/keybindings"]},
{n:"/list-agents",c:"par",al:"/peers",d:"Lista subagentes, compañeros de agent team y otras sesiones a las que Claude puede enviar mensajes, con el nombre a usar para cada uno.",o:[],e:["/list-agents"]},
{n:"/login",c:"cta",d:"Inicia sesión en tu cuenta de Anthropic.",o:[],e:["/login"]},
{n:"/logout",c:"cta",d:"Cierra sesión.",o:[],e:["/logout"]},
{n:"/loop",a:"[intervalo] [prompt]",c:"par",t:"s",al:"/proactive",d:"Repite un prompt mientras la sesión siga abierta. Sin intervalo, Claude decide el ritmo; sin prompt, corre el prompt de mantenimiento o tu loop.md.",o:[["[intervalo]","Ej.: 30s, 5m, 1h."],["[prompt]","Qué repetir."]],e:["/loop 5m revisa si terminó el deploy","/loop"],tip:"Vive solo mientras la sesión está abierta. Para algo que corra sin tu máquina usa /schedule."},
{n:"/mcp",a:"[reconnect|enable|disable [servidor|all]]",c:"ext",d:"Gestiona conexiones MCP y autenticación OAuth. Sin argumento abre la lista interactiva.",o:[["reconnect <servidor|all>","Reintenta servidores caídos o que piden auth."],["enable | disable <servidor|all>","Activa o desactiva."]],e:["/mcp","/mcp reconnect all","/mcp disable sentry"]},
{n:"/memory",c:"ctx",d:"Edita tus archivos CLAUDE.md, activa o desactiva la memoria automática y ve sus entradas.",o:[],e:["/memory"]},
{n:"/mobile",c:"cta",al:"/ios, /android",d:"Muestra un QR para descargar la app móvil de Claude.",o:[],e:["/mobile"]},
{n:"/model",a:"[modelo]",c:"mod",d:"Cambia el modelo y lo guarda como predeterminado. Sin argumento abre un selector: flechas izquierda/derecha ajustan esfuerzo; s cambia solo para esta sesión.",o:[["sonnet | opus | haiku | fable","Alias de modelo."],["<id completo>","Por ejemplo claude-opus-5-5."]],e:["/model opus","/model sonnet"],tip:"Cada modelo tiene su propio caché: el primer request tras cambiar relee toda la conversación sin caché."},
{n:"/output-style",a:"[estilo]",c:"cfg",d:"Lista los output styles o cambia a uno (Default, Proactive, Concise, Explanatory, Learning o los tuyos).",o:[["[estilo]","Nombre del estilo."]],e:["/output-style","/output-style learning"]},
{n:"/passes",c:"cta",d:"Comparte una semana gratis de Claude Code con amigos (si tu cuenta es elegible).",o:[],e:["/passes"]},
{n:"/permissions",c:"per",d:"Gestiona reglas allow, ask y deny por scope, directorios de trabajo y revisa las denegaciones recientes del modo auto (con r reintentas aprobando a mano).",o:[],e:["/permissions"]},
{n:"/plan",a:"[descripción]",c:"ses",d:"Entra a modo plan directamente. Con descripción, empieza a planificar esa tarea.",o:[["[descripción]","La tarea a planificar."]],e:["/plan arreglar el bug de refresh de tokens"]},
{n:"/plugin",a:"[subcomando]",c:"ext",d:"Gestiona plugins. Sin argumento abre el menú; con subcomando actúa directo.",o:[["list","Lista instalados."],["install <plugin@marketplace>","Instala."],["enable | disable <plugin>","Activa o desactiva."],["marketplace add <repo|url>","Agrega un marketplace."]],e:["/plugin","/plugin install code-review@claude-plugins-official","/plugin marketplace add mi-org/plugins"]},
{n:"/plugin-authoring",c:"ext",t:"s",d:"Carga la referencia que usa Claude para escribir un mod (cambio a la interfaz o comportamiento de Claude Code).",o:[],e:["/plugin-authoring"]},
{n:"/powerup",c:"cta",d:"Descubre funciones de Claude Code con lecciones interactivas cortas y demos animadas.",o:[],e:["/powerup"]},
{n:"/pr-comments",a:"[PR]",c:"rev",t:"x",d:"Eliminado en v2.1.91. Pídele a Claude directamente que lea los comentarios del PR.",o:[],e:["lee los comentarios del PR 412 y resuélvelos"]},
{n:"/privacy-settings",c:"cta",d:"Ve y actualiza tus ajustes de privacidad (Pro y Max).",o:[],e:["/privacy-settings"]},
{n:"/radio",c:"cta",d:"Abre la radio lo-fi Claude FM en el navegador.",o:[],e:["/radio"]},
{n:"/rate-limit-options",c:"cta",d:"Muestra opciones cuando un límite de uso bloquea un request: esperar y continuar al reset, agregar créditos de uso, etc.",o:[],e:["/rate-limit-options"]},
{n:"/recap",c:"ses",d:"Genera un resumen de una línea de la sesión actual.",o:[],e:["/recap"]},
{n:"/release-notes",c:"cta",d:"Abre el changelog en un selector de versiones. Las notas aparecen en tu transcript sin entrar al contexto de Claude.",o:[],e:["/release-notes"]},
{n:"/reload-plugins",a:"[--force]",c:"ext",d:"Recarga los plugins activos para aplicar cambios sin reiniciar; reporta conteos y errores.",o:[["--force","Recarga aunque cambie el set de herramientas MCP cargadas."]],e:["/reload-plugins"]},
{n:"/reload-skills",c:"ext",d:"Re-escanea los directorios de skills y comandos para tomar skills agregadas o cambiadas en disco sin reiniciar.",o:[],e:["/reload-skills"]},
{n:"/remote-control",c:"nube",al:"/rc",d:"Hace que esta sesión pueda controlarse desde claude.ai o la app de Claude (requiere suscripción claude.ai).",o:[],e:["/rc"]},
{n:"/remote-env",c:"nube",d:"Elige el entorno cloud predeterminado para las sesiones en la nube que lanzas desde el CLI.",o:[],e:["/remote-env"]},
{n:"/rename",a:"[nombre]",c:"ses",d:"Renombra la sesión y muestra el nombre en la barra del prompt. Sin nombre, genera uno a partir del historial. Funciona en -p.",o:[["[nombre]","Nuevo nombre."]],e:["/rename refactor-pagos"]},
{n:"/resume",a:"[sesión]",c:"ses",al:"/continue",d:"Retoma una conversación por ID o nombre, o abre el selector. Las sesiones en segundo plano aparecen marcadas bg; si sigue corriendo, te adjuntas a ella.",o:[["[sesión]","ID o nombre."]],e:["/resume","/resume refactor-pagos"]},
{n:"/review",a:"[igual que /code-review]",c:"rev",d:"Alias de /code-review.",o:[],e:["/review high"]},
{n:"/rewind",c:"ses",al:"/checkpoint, /undo",d:"Retrocede la conversación, el código, o ambos a un punto anterior; o resume desde un mensaje elegido.",o:[],e:["/rewind","Esc Esc (con el prompt vacío)"],tip:"Solo revierte ediciones hechas con las herramientas de archivo. Cambios hechos por Bash (rm, mv, sed -i) no se restauran."},
{n:"/run",c:"rev",t:"s",d:"Lanza y maneja la app de tu proyecto para ver un cambio funcionando, no solo tests verdes.",o:[],e:["/run"]},
{n:"/run-skill-generator",c:"rev",t:"s",d:"Le enseña a /run y /verify cómo compilar, lanzar y manejar tu app desde cero, escribiendo una skill por proyecto en .claude/skills/run-<nombre>/.",o:[],e:["/run-skill-generator"]},
{n:"/sandbox",c:"per",d:"Activa o desactiva el sandbox de Bash (aislamiento de sistema de archivos y red) en plataformas soportadas.",o:[],e:["/sandbox"]},
{n:"/schedule",a:"[descripción]",c:"par",al:"/routines",d:"Crea, actualiza, lista o ejecuta tareas programadas en la nube (antes rutinas). Claude te guía conversando.",o:[["[descripción]","Qué debe correr y cuándo."]],e:["/schedule cada lunes 9:00 revisa dependencias desactualizadas y abre un PR"]},
{n:"/scroll-speed",c:"cfg",d:"Ajusta la velocidad de la rueda del mouse (solo pantalla completa).",o:[],e:["/scroll-speed"]},
{n:"/security-review",c:"rev",d:"Analiza los cambios de tu rama contra la rama por defecto de origin buscando vulnerabilidades: inyección, auth, exposición de datos.",o:[],e:["/security-review"],tip:"Necesita un remoto origin."},
{n:"/setup-bedrock",c:"cta",d:"Asistente para configurar Amazon Bedrock (auth, región, modelos). Visible con CLAUDE_CODE_USE_BEDROCK=1.",o:[],e:["/setup-bedrock"]},
{n:"/setup-vertex",c:"cta",d:"Asistente para configurar Google Cloud (auth, proyecto, región, modelos). Visible con CLAUDE_CODE_USE_VERTEX=1.",o:[],e:["/setup-vertex"]},
{n:"/simplify",a:"[objetivo]",c:"rev",t:"s",d:"Revisa el código cambiado buscando limpieza y aplica los arreglos. Cuatro agentes en paralelo: reutilizar helpers, simplificar, eficiencia y nivel de abstracción. No busca bugs (para eso /code-review).",o:[["[objetivo]","Ruta o PR."]],e:["/simplify","/simplify src/billing"]},
{n:"/skill-doctor",c:"ext",d:"Muestra cuánto contexto cuesta cada skill y cuánto se usa, para encontrar las que conviene apagar.",o:[],e:["/skill-doctor"]},
{n:"/skills",c:"ext",d:"Lista las skills disponibles. Filtra escribiendo; t ordena por tokens; Espacio o Enter cambia su visibilidad para Claude y el menú /; Esc guarda.",o:[],e:["/skills"]},
{n:"/slides",a:"[brief]",c:"art",t:"s",d:"Crea una presentación nueva como artefacto Claude Slides a partir de tu brief.",o:[],e:["/slides revisión trimestral del equipo de plataforma"]},
{n:"/stats",c:"cta",d:"Alias de /usage, abre en la pestaña Stats.",o:[],e:["/stats"]},
{n:"/status",c:"cfg",d:"Abre Settings en la pestaña Status: versión, modelo, cuenta, conectividad y la línea Setting sources (qué archivos de settings cargaron).",o:[],e:["/status"],tip:"Primer paso cuando un setting 'no aplica'."},
{n:"/statusline",c:"cfg",d:"Configura la línea de estado. Describe lo que quieres o deja que se autoconfigure desde tu prompt de shell.",o:[],e:["/statusline muestra rama git, modelo y % de contexto"]},
{n:"/stickers",c:"cta",d:"Pide stickers de Claude Code.",o:[],e:["/stickers"]},
{n:"/stop",c:"par",d:"Detiene la sesión en segundo plano a la que estás adjunto; se conservan transcript y worktree.",o:[],e:["/stop"]},
{n:"/subtask",a:"<tarea>",c:"par",d:"Lanza un subagente fork: hereda toda la conversación, trabaja en segundo plano y su resultado vuelve a esta conversación al terminar.",o:[["<tarea>","Lo que debe hacer."]],e:["/subtask investiga por qué falla el test de checkout en CI"]},
{n:"/tasks",c:"par",al:"/bashes",d:"Ve y gestiona el trabajo en segundo plano de la sesión, incluidos subagentes terminados.",o:[],e:["/tasks"]},
{n:"/team-onboarding",c:"cta",d:"Genera una guía de onboarding a partir de tus últimos 30 días de uso (sesiones, comandos, MCP) que un compañero puede pegar como primer mensaje.",o:[],e:["/team-onboarding"]},
{n:"/teleport",c:"nube",al:"/tp",d:"Trae una sesión cloud a esta terminal: abre un selector y descarga la rama y la conversación.",o:[],e:["/teleport"]},
{n:"/terminal-setup",c:"cfg",d:"Instala Shift+Enter para saltos de línea en VS Code, Cursor, Alacritty, Zed y otros; en Apple Terminal habilita Option+Enter.",o:[],e:["/terminal-setup"]},
{n:"/theme",c:"cfg",d:"Cambia el tema de color: auto, claro/oscuro, variantes para daltonismo, ANSI y temas personalizados.",o:[],e:["/theme"]},
{n:"/tui",a:"[default|fullscreen]",c:"cfg",d:"Cambia el renderizador de la terminal y relanza conservando la conversación. fullscreen = sin parpadeo.",o:[["default | fullscreen","Renderizador."]],e:["/tui fullscreen"]},
{n:"/ultraplan",a:"<prompt>",c:"ses",t:"x",d:"Eliminado. Usa el modo plan.",o:[],e:["/plan …"]},
{n:"/ultrareview",a:"[PR o rama]",c:"rev",d:"Revisión profunda multiagente en un sandbox cloud. La forma preferida es /code-review ultra. Incluye 3 corridas gratis en Pro y Max; luego requiere créditos de uso.",o:[["[PR]","PR a revisar."],["[rama o commit]","Base de comparación."]],e:["/ultrareview 1234"],tip:"No interactivo: claude ultrareview 1234 --json"},
{n:"/update-config",a:"[pedido]",c:"cfg",t:"s",d:"Describe un cambio de settings (permitir un comando, una variable de entorno, un hook) y Claude edita el settings.json correcto.",o:[],e:["/update-config permite npm run test sin preguntar","/update-config agrega un hook que corra prettier después de cada edición"]},
{n:"/upgrade",c:"cta",d:"Abre la página para subir de plan.",o:[],e:["/upgrade"]},
{n:"/usage",c:"cta",al:"/cost, /stats",d:"Muestra costo de la sesión, límites del plan y estadísticas de actividad, con desglose de qué cuenta contra tus límites.",o:[],e:["/usage"]},
{n:"/usage-credits",c:"cta",d:"Configura o solicita créditos de uso cuando alcanzas un límite.",o:[],e:["/usage-credits"]},
{n:"/verify",c:"rev",t:"s",d:"Confirma que un cambio funciona compilando, ejecutando y observando la app, en vez de confiar solo en tests o type checks. Solo corre cuando lo invocas.",o:[],e:["/verify"]},
{n:"/vim",c:"cfg",t:"x",d:"Eliminado en v2.1.92. Usa /config → Editor mode.",o:[],e:["/config"]},
{n:"/voice",a:"[hold|tap|off]",c:"cfg",d:"Activa el dictado por voz o lo pone en un modo específico (requiere cuenta claude.ai).",o:[["hold","Mantén presionado para hablar."],["tap","Toca para empezar y terminar."],["off","Desactiva."]],e:["/voice hold"]},
{n:"/web-setup",c:"nube",d:"Conecta tu cuenta de GitHub para sesiones cloud usando las credenciales de tu gh CLI local.",o:[],e:["/web-setup"]},
{n:"/workflow-authoring",c:"par",t:"s",d:"Carga la referencia para escribir scripts de workflows dinámicos (API, reanudación, patrones de calidad).",o:[],e:["/workflow-authoring"]},
{n:"/workflows",c:"par",d:"Abre la vista de progreso de workflows: observar, pausar, reanudar o guardar los que corren o terminaron.",o:[],e:["/workflows"]}
];

/* ===== Subcomandos de la CLI (claude …) ===== */
const CLI_CMDS=[
["claude","Inicia una sesión interactiva.","claude"],
["claude \"consulta\"","Sesión interactiva con prompt inicial.","claude \"explica este proyecto\""],
["claude -p \"consulta\"","Modo no interactivo (print/SDK): responde y sale.","claude -p \"explica esta función\""],
["cat archivo | claude -p","Procesa contenido por pipe.","cat logs.txt | claude -p \"explica los errores\""],
["claude -c","Continúa la conversación más reciente del directorio.","claude -c"],
["claude -r \"<sesión>\" \"consulta\"","Retoma una sesión por ID o nombre.","claude -r auth-refactor \"termina este PR\""],
["claude update","Actualiza a la última versión.","claude update"],
["claude install [versión]","Instala o reinstala el binario nativo (versión, stable o latest).","claude install stable"],
["claude auth login | logout | status","Inicia/cierra sesión o muestra el estado (JSON; --text legible). login acepta --email, --sso, --console.","claude auth status --text"],
["claude agents","Abre agent view para monitorear y despachar sesiones en segundo plano. --json para scripts.","claude agents --json"],
["claude attach <id|nombre>","Se adjunta a una sesión en segundo plano.","claude attach 7c5dcf5d"],
["claude logs <id|nombre>","Imprime la salida reciente de una sesión en segundo plano.","claude logs 7c5dcf5d"],
["claude stop <id>","Detiene una sesión en segundo plano (alias kill).","claude stop 7c5dcf5d"],
["claude respawn <id> [--all]","Reinicia una sesión en segundo plano conservando la conversación.","claude respawn --all"],
["claude rm <id>","Quita una sesión en segundo plano de la lista.","claude rm 7c5dcf5d"],
["claude auto-mode defaults | config | reset","Muestra las reglas del clasificador del modo auto, tu config efectiva, o la restablece.","claude auto-mode config"],
["claude doctor","Diagnóstico de solo lectura de instalación y settings, sin abrir sesión.","claude doctor"],
["claude import [origen]","Importa configuración de Codex, Gemini CLI o Cursor (--dry-run, --yes).","claude import codex --dry-run"],
["claude mcp …","Gestiona servidores MCP: add, list, get, remove, login, logout.","claude mcp add --transport http sentry https://mcp.sentry.dev/mcp"],
["claude plugin …","Gestiona plugins (alias claude plugins).","claude plugin install code-review@claude-plugins-official"],
["claude purge [ruta]","Borra todo el estado local de un proyecto: transcripts, historial de ediciones, logs. --dry-run para previsualizar.","claude purge ~/work/repo --dry-run"],
["claude remote-control","Servidor de Remote Control (sin sesión local interactiva).","claude remote-control --name \"Mi proyecto\""],
["claude setup-token","Genera un token OAuth de larga duración para CI y scripts (requiere suscripción).","claude setup-token"],
["claude ultrareview [objetivo]","ultrareview no interactivo; --json, --timeout, --post.","claude ultrareview 1234 --json"],
["claude daemon status | logs | run | stop","Diagnostica el supervisor de sesiones en segundo plano.","claude daemon status"],
["claude gateway --config <yaml>","Servidor del gateway self-hosted (administradores).","claude gateway --config gateway.yaml"],
["claude self-hosted-runner","Registra esta máquina como runner de un entorno self-hosted.","claude self-hosted-runner setup"]
];

/* ===== Flags principales ===== */
const CLI_FLAGS=[
["--print, -p","Headless","Responde sin modo interactivo y sale.","claude -p \"resume README.md\""],
["--output-format","Headless","text, json o stream-json (con -p).","claude -p \"…\" --output-format json"],
["--input-format","Headless","text o stream-json.","claude -p --input-format stream-json"],
["--json-schema","Headless","Salida JSON validada contra un schema (queda en structured_output).","claude -p --json-schema '{…}' \"extrae los endpoints\""],
["--max-turns","Headless","Limita los turnos agénticos (solo -p).","claude -p --max-turns 3 \"…\""],
["--max-budget-usd","Headless","Detiene la corrida al alcanzar ese gasto estimado (solo -p).","claude -p --max-budget-usd 5 \"…\""],
["--bare","Headless","Modo mínimo: no descubre hooks, skills, plugins, MCP, memoria ni CLAUDE.md. Arranque más rápido para scripts.","claude --bare -p \"…\""],
["--no-session-persistence","Headless","No guarda la sesión en disco (solo -p).","claude -p --no-session-persistence \"…\""],
["--permission-prompts","Headless","host (default) o none: en none se deniega lo que pediría permiso.","claude -p --permission-prompts none \"…\""],
["--continue, -c","Sesiones","Carga la conversación más reciente del directorio.","claude -c"],
["--resume, -r","Sesiones","Retoma por ID o nombre, o abre el selector.","claude -r auth-refactor"],
["--fork-session","Sesiones","Al retomar, crea un ID nuevo en vez de reutilizar el original.","claude -r abc123 --fork-session"],
["--name, -n","Sesiones","Nombre visible de la sesión.","claude -n feature-pagos"],
["--from-pr","Sesiones","Selector filtrado a sesiones ligadas a un PR.","claude --from-pr 123"],
["--session-id","Sesiones","Usa un UUID específico.","claude --session-id 550e8400-…"],
["--model","Modelo","Modelo de la sesión (alias o ID).","claude --model opus"],
["--effort","Modelo","low, medium, high, xhigh, max o ultracode, solo para esta sesión.","claude --effort high"],
["--fallback-model","Modelo","Modelos de respaldo, en orden, si el principal está saturado.","claude --fallback-model sonnet,haiku"],
["--advisor","Modelo","Activa el advisor con fable, opus o sonnet.","claude --advisor opus"],
["--autocompact","Modelo","Ventana de autocompactación solo para esta sesión.","claude --autocompact 500k"],
["--permission-mode","Permisos","default/manual, acceptEdits, plan, auto, dontAsk o bypassPermissions.","claude --permission-mode plan"],
["--allowedTools","Permisos","Herramientas que corren sin preguntar.","claude --allowedTools \"Bash(git log *)\" Read"],
["--disallowedTools","Permisos","Reglas deny; un nombre suelto quita la herramienta del contexto.","claude --disallowedTools \"Bash(rm *)\""],
["--tools","Permisos","Restringe las herramientas built-in disponibles.","claude --tools \"Bash,Edit,Read\""],
["--dangerously-skip-permissions","Permisos","Equivale a bypassPermissions. Solo en contenedores aislados.","claude --dangerously-skip-permissions"],
["--allow-dangerously-skip-permissions","Permisos","Agrega bypass al ciclo Shift+Tab sin arrancar en él.","claude --permission-mode plan --allow-dangerously-skip-permissions"],
["--permission-prompt-tool","Permisos","Herramienta MCP que responde los prompts de permiso en -p.","claude -p --permission-prompt-tool mcp_auth \"…\""],
["--add-dir","Permisos","Directorios de trabajo adicionales.","claude --add-dir ../apps ../lib"],
["--restricted","Permisos","Modo restringido para harnesses de evaluación en máquinas compartidas.","claude --restricted -p \"…\""],
["--settings","Config","Archivo o JSON de settings solo para esta sesión (por encima de usuario/proyecto, debajo de managed).","claude --settings '{\"model\":\"opus\"}'"],
["--setting-sources","Config","Qué fuentes cargar: user, project, local.","claude --setting-sources user,project"],
["--mcp-config","Config","Carga servidores MCP desde JSON.","claude --mcp-config ./mcp.json"],
["--strict-mcp-config","Config","Usa solo los MCP de --mcp-config.","claude --strict-mcp-config --mcp-config ./mcp.json"],
["--plugin-dir","Config","Carga un plugin (carpeta o .zip) solo para esta sesión.","claude --plugin-dir ./mi-plugin"],
["--agent","Config","Inicia la sesión como un subagente específico.","claude --agent revisor"],
["--agents","Config","Define subagentes en JSON al vuelo.","claude --agents '{\"rev\":{\"description\":\"Revisa\",\"prompt\":\"Eres revisor\"}}'"],
["--safe-mode","Config","Arranca sin ninguna personalización (CLAUDE.md, skills, hooks, MCP…) para diagnosticar.","claude --safe-mode"],
["--disable-slash-commands","Config","Desactiva skills y comandos en esta sesión.","claude --disable-slash-commands"],
["--system-prompt","Prompt","Reemplaza todo el system prompt.","claude --system-prompt \"Eres experto en Python\""],
["--append-system-prompt","Prompt","Agrega texto al final del system prompt por defecto.","claude --append-system-prompt \"Usa siempre TypeScript\""],
["--system-prompt-file / --append-system-prompt-file","Prompt","Igual, desde archivo.","claude --append-system-prompt-file ./reglas.txt"],
["--worktree, -w","Paralelo","Arranca en un worktree aislado .claude/worktrees/<nombre>; acepta #PR o URL de PR.","claude -w feature-auth"],
["--tmux","Paralelo","Crea una sesión tmux para el worktree.","claude -w feature-auth --tmux"],
["--bg, --background","Paralelo","Arranca como agente en segundo plano y vuelve de inmediato.","claude --bg \"investiga el test inestable\""],
["--exec","Paralelo","Con --bg, corre un comando de shell como job de fondo.","claude --bg --exec 'pytest -x'"],
["--teammate-mode","Paralelo","Cómo se muestran los compañeros de agent team: in-process, auto, tmux, iterm2.","claude --teammate-mode tmux"],
["--cloud","Nube","Crea una sesión en la nube con la tarea, o encola un mensaje en una existente.","claude --cloud \"arregla el bug del login\""],
["--teleport","Nube","Trae una sesión cloud a tu terminal.","claude --teleport"],
["--remote-control, --rc","Nube","Sesión interactiva también controlable desde claude.ai o la app.","claude --rc \"Mi proyecto\""],
["--desktop","Nube","Abre la app Desktop en este directorio y sale.","claude --desktop"],
["--chrome / --no-chrome","Nube","Activa o desactiva la integración con Chrome.","claude --chrome"],
["--ide","Nube","Se conecta al IDE al arrancar si hay uno solo disponible.","claude --ide"],
["--init / --init-only / --maintenance","Hooks","Corre hooks Setup (init o maintenance). --init-only corre Setup y SessionStart y sale.","claude --init-only"],
["--include-hook-events","Hooks","Incluye eventos de hooks en stream-json.","claude -p --output-format stream-json --verbose --include-hook-events \"…\""],
["--debug","Diagnóstico","Modo debug con filtro de categorías opcional (usa la forma con =).","claude --debug='mcp,startup'"],
["--debug-file","Diagnóstico","Escribe los logs de debug a un archivo.","claude --debug-file /tmp/cc.log"],
["--verbose","Diagnóstico","Salida turno a turno completa.","claude --verbose"],
["--version, -v","Diagnóstico","Imprime la versión.","claude -v"]
];

/* ===== Atajos de teclado ===== */
const KBD=[
["Esc","Interrumpe a Claude (conserva lo hecho) o cierra un diálogo.","Control"],
["Esc Esc","Con texto: borra el borrador. Con el prompt vacío: abre el menú de rewind.","Control"],
["Ctrl+C","Interrumpe; sin nada corriendo, limpia el input; dos veces sale.","Control"],
["Ctrl+D","Sale (confirma con una segunda pulsación en 800 ms).","Control"],
["Shift+Tab","Cicla modos de permiso (Manual → acceptEdits → plan → auto…). En Windows a veces Alt+M.","Modos"],
["Option/Alt+P","Cambia de modelo sin borrar tu prompt.","Modos"],
["Option/Alt+T","Alterna extended thinking (sin efecto en modelos que siempre piensan).","Modos"],
["Option/Alt+O","Alterna fast mode.","Modos"],
["Ctrl+B","Manda a segundo plano comandos Bash y agentes en curso (en tmux, dos veces).","Trabajo"],
["Ctrl+X Ctrl+K","Detiene todos los subagentes en segundo plano de la sesión.","Trabajo"],
["Ctrl+T","Muestra u oculta la checklist de tareas de Claude.","Trabajo"],
["Ctrl+O","Visor de transcript: detalle de herramientas, timestamps y modelo por mensaje.","Trabajo"],
["Ctrl+Enter","Envía ya los mensajes en cola (también Ctrl+X Ctrl+S).","Trabajo"],
["Ctrl+G","Abre el prompt en tu editor de texto (también Ctrl+X Ctrl+E).","Edición"],
["Ctrl+S","Guarda el prompt a un lado (stash); de nuevo con el prompt vacío, lo restaura.","Edición"],
["Ctrl+R","Búsqueda inversa en el historial.","Edición"],
["Ctrl+V / Alt+V","Pega una imagen del portapapeles como chip [Image #N].","Edición"],
["Ctrl+L","Redibuja la pantalla sin perder nada.","Edición"],
["Ctrl+K / Ctrl+U / Ctrl+W","Borra hasta fin de línea / hasta inicio / palabra anterior (Ctrl+Y lo pega).","Edición"],
["Ctrl+_","Deshace la última edición del input.","Edición"],
["Shift+Enter","Nueva línea (configúralo con /terminal-setup si no funciona). También \\ + Enter.","Edición"],
["Ctrl+Z","Suspende Claude Code (Unix); vuelve con fg.","Control"],
["/","Al inicio: comandos y skills.","Prefijos"],
["!","Al inicio: modo shell. Corre el comando, agrega su salida a la sesión y Claude responde.","Prefijos"],
["@","Autocompleta rutas de archivos (y nombres de sesiones para mensajería).","Prefijos"],
["?","Con el input vacío: panel de atajos.","Prefijos"]
];

/* =================== V3 · infraestructura =================== */
function codeBlock(title,txt){return '<div class="code"><div class="ch"><span>'+esc(title)+'</span><button class="copy">copiar</button></div><pre>'+hl(txt)+'</pre></div>';}
function fillCode(root){root.querySelectorAll("pre[data-raw-src]").forEach(p=>{setCode(p,p.dataset.rawSrc);p.removeAttribute("data-raw-src");});}
function tabs(tabsEl,items,onSel){tabsEl.innerHTML=items.map((t,i)=>'<button data-ix="'+i+'"'+(i?'':' class="on"')+'>'+esc(t)+'</button>').join("");
  on(tabsEl,"click",e=>{const b=e.target.closest("button[data-ix]");if(!b)return;tabsEl.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));onSel(+b.dataset.ix);});onSel(0);}
/* TOC para vistas de referencia */
["hooks","skills","settings"].forEach(l=>{
  const view=$("#v-"+l);if(!view)return;const arts=Array.from(view.querySelectorAll("article.lesson"));
  view.querySelector("aside.toc").innerHTML='<div class="lbl">Secciones</div>'+arts.map((a,i)=>'<button data-go="'+a.id+'"><span class="ck">'+(a.id.endsWith("q")?"?":(i+1))+'</span><span>'+esc(a.dataset.t)+'</span></button>').join("");
});

/* =================== COMANDOS =================== */
try{(function(){if(!document.getElementById("v-comandos"))return; // módulo de la vista comandos
  if(!$("#v-comandos"))return;
  /* anatomía */
  const AN=[["Comando","El nombre después de /. Puede ser un comando integrado o una skill. El menú filtra mientras escribes."],["Argumento posicional","Muchos comandos aceptan opciones sin guiones: aquí el nivel de esfuerzo de la revisión."],["Flag","Opciones con -- cambian el comportamiento: --fix hace que Claude aplique los hallazgos."],["Objetivo","Un número de PR, una rama o una ruta. Si lo omites, /code-review revisa tu diff actual."]];
  on($("#anat"),"mouseover",show);on($("#anat"),"click",show);
  function show(e){const s=e.target.closest("[data-p]");if(!s)return;$$("#anat [data-p]").forEach(x=>x.classList.toggle("on",x===s));const a=AN[+s.dataset.p];$("#anatExp").innerHTML="<b>"+a[0]+"</b> · "+a[1];}

  $("#cntSlash").textContent=CMDS.length;$("#cntCli").textContent=CLI_CMDS.length;$("#cntFlags").textContent=CLI_FLAGS.length;$("#cntKeys").textContent=KBD.length;
  const panes=$$("#v-comandos [data-pane]");
  function goTab(t){$$("#cmdTabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));panes.forEach(p=>p.hidden=p.dataset.pane!==t);}
  on($("#cmdTabs"),"click",e=>{const b=e.target.closest("button");if(b)goTab(b.dataset.t);});

  /* slash */
  let cat="all",intent=null,sel=CMDS.findIndex(c=>c.n==="/compact");
  const INT={ctx:["/context","/compact","/clear","/autocompact","/btw","/memory"],undo:["/rewind","/diff","/branch","/export"],review:["/code-review","/simplify","/security-review","/ultrareview","/diff","/verify","/run"],par:["/subtask","/fork","/background","/batch","/tasks","/workflows","/list-agents"],auto:["/goal","/loop","/schedule","/batch","/autofix-pr"],model:["/model","/effort","/fast","/advisor","/output-style"],perm:["/permissions","/fewer-permission-prompts","/auto-mode-setup","/sandbox","/update-config"],sess:["/resume","/rename","/branch","/fork","/clear","/cd","/teleport","/desktop"],diag:["/doctor","/debug","/status","/context","/heapdump","/bug","/release-notes"],ext:["/skills","/mcp","/plugin","/hooks","/reload-skills","/reload-plugins","/skill-doctor","/update-config","/init"]};
  $("#cmdCats").innerHTML='<button class="chip on" data-c="all">Todos</button>'+Object.entries(CMD_CATS).map(([k,v])=>'<button class="chip" data-c="'+k+'">'+esc(v)+'</button>').join("");
  on($("#cmdCats"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;cat=b.dataset.c;intent=null;$$("#cmdIntent .chip").forEach(x=>x.classList.remove("on"));$$("#cmdCats .chip").forEach(x=>x.classList.toggle("on",x===b));renderList();});
  on($("#cmdIntent"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;const was=intent===b.dataset.i;intent=was?null:b.dataset.i;$$("#cmdIntent .chip").forEach(x=>x.classList.toggle("on",!was&&x===b));cat="all";$$("#cmdCats .chip").forEach(x=>x.classList.toggle("on",x.dataset.c==="all"));$("#cmdQ").value="";goTab("slash");renderList(true);$("#cmdTabs").scrollIntoView({behavior:"smooth",block:"start"});});
  const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  function filtered(){const q=norm($("#cmdQ").value.trim().replace(/^\//,""));
    let r=CMDS.map((c,i)=>i);
    if(intent)r=INT[intent].map(n=>CMDS.findIndex(c=>c.n===n)).filter(i=>i>=0);
    if(cat!=="all")r=r.filter(i=>CMDS[i].c===cat);
    if(q){const sc=i=>{const c=CMDS[i],n=norm(c.n.slice(1));if(n.startsWith(q))return 0;if(n.includes(q)||(c.al&&norm(c.al).includes(q)))return 1;if(norm(c.d+" "+(c.a||"")+" "+CMD_CATS[c.c]).includes(q))return 2;return 9;};r=r.filter(i=>sc(i)<9).sort((a,b)=>sc(a)-sc(b));}
    return r;}
  let cur=[];
  function renderList(selFirst){cur=filtered();
    if(!cur.includes(sel)||selFirst)sel=cur.length?cur[0]:-1;
    $("#cmdList").innerHTML=cur.length?cur.map(i=>{const c=CMDS[i];return '<button class="ci'+(i===sel?' on':'')+(c.t==="x"?' rm':'')+'" data-i="'+i+'"><span class="cn">'+esc(c.n)+'</span>'+(c.a?'<span class="ca">'+esc(c.a)+'</span>':'')+(c.t==="s"?'<span class="badge sk">skill</span>':c.t==="w"?'<span class="badge sk">workflow</span>':c.t==="x"?'<span class="badge">eliminado</span>':'')+'<span class="cd">'+esc(c.d.split(". ")[0].replace(/\.$/,""))+'</span></button>';}).join(""):'<p class="pn" style="padding:14px">Nada coincide. Prueba otra palabra: "contexto", "revisar", "sesión"…</p>';
    renderDet();}
  function renderDet(){const d=$("#cmdDet");if(sel<0){d.innerHTML="";return;}const c=CMDS[sel];
    d.innerHTML='<div class="cdh"><span class="cn big">'+esc(c.n)+'</span>'+(c.a?' <span class="ca">'+esc(c.a)+'</span>':'')+'</div>'+
    '<div class="cdm"><span class="badge">'+esc(CMD_CATS[c.c])+'</span>'+(c.t==="s"?'<span class="badge sk">skill incluida</span>':'')+(c.t==="w"?'<span class="badge sk">workflow</span>':'')+(c.t==="x"?'<span class="badge exp">eliminado</span>':'')+(c.al?'<span class="badge">alias '+esc(c.al)+'</span>':'')+'</div>'+
    '<p class="cdd">'+esc(c.d)+'</p>'+
    (c.o&&c.o.length?'<div class="cdl">Opciones</div><table class="ref opt"><tbody>'+c.o.map(o=>'<tr><td><code>'+esc(o[0])+'</code></td><td>'+esc(o[1])+'</td></tr>').join("")+'</tbody></table>':'<div class="cdl">Opciones</div><p class="pn">No recibe argumentos.</p>')+
    '<div class="cdl">Ejemplos</div>'+c.e.map(x=>'<div class="exl"><code>'+esc(x)+'</code><button class="copy mini-copy" data-txt="'+esc(x)+'">copiar</button></div>').join("")+
    (c.tip?'<div class="tip" style="margin:14px 0 0"><b class="h">Consejo</b>'+esc(c.tip)+'</div>':'');}
  on($("#cmdList"),"click",e=>{const b=e.target.closest(".ci");if(!b)return;sel=+b.dataset.i;$$("#cmdList .ci").forEach(x=>x.classList.toggle("on",x===b));renderDet();if(innerWidth<900)$("#cmdDet").scrollIntoView({behavior:"smooth",block:"nearest"});});
  on($("#cmdQ"),"input",()=>{intent=null;$$("#cmdIntent .chip").forEach(x=>x.classList.remove("on"));renderList(true);});
  on($("#cmdQ"),"keydown",e=>{if(e.key!=="ArrowDown"&&e.key!=="ArrowUp")return;e.preventDefault();const k=cur.indexOf(sel)+(e.key==="ArrowDown"?1:-1);if(k<0||k>=cur.length)return;sel=cur[k];$$("#cmdList .ci").forEach(x=>x.classList.toggle("on",+x.dataset.i===sel));const el=$('#cmdList .ci[data-i="'+sel+'"]');if(el)el.scrollIntoView({block:"nearest"});renderDet();});
  renderList();

  /* copiar líneas sueltas */
  document.addEventListener("click",e=>{const b=e.target.closest(".mini-copy");if(!b)return;e.stopImmediatePropagation();const t=b.dataset.txt;try{navigator.clipboard.writeText(t).then(()=>{b.textContent="✓";setTimeout(()=>b.textContent="copiar",1200);},()=>toast(t));}catch(err){toast(t);}},true);

  /* CLI */
  function renderCli(){const q=norm($("#cliQ").value);$("#cliList").innerHTML=CLI_CMDS.filter(r=>!q||norm(r.join(" ")).includes(q)).map(r=>'<div class="clirow"><div><code class="cn">'+esc(r[0])+'</code><p>'+esc(r[1])+'</p></div><div class="exl"><code>'+esc(r[2])+'</code><button class="copy mini-copy" data-txt="'+esc(r[2])+'">copiar</button></div></div>').join("");}
  on($("#cliQ"),"input",renderCli);renderCli();
  /* flags */
  const FC=[...new Set(CLI_FLAGS.map(f=>f[1]))];let fc="all";
  $("#flagCats").innerHTML='<button class="chip on" data-c="all">Todos</button>'+FC.map(c=>'<button class="chip" data-c="'+c+'">'+c+'</button>').join("");
  on($("#flagCats"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;fc=b.dataset.c;$$("#flagCats .chip").forEach(x=>x.classList.toggle("on",x===b));renderFlags();});
  function renderFlags(){$("#flagList").innerHTML=CLI_FLAGS.filter(f=>fc==="all"||f[1]===fc).map(f=>'<div class="clirow"><div><code class="cn">'+esc(f[0])+'</code> <span class="badge">'+esc(f[1])+'</span><p>'+esc(f[2])+'</p></div><div class="exl"><code>'+esc(f[3])+'</code><button class="copy mini-copy" data-txt="'+esc(f[3])+'">copiar</button></div></div>').join("");}
  renderFlags();
  /* keys */
  const KG=[...new Set(KBD.map(k=>k[2]))];
  $("#keyList").innerHTML=KG.map(g=>'<div class="kgrp"><div class="cdl">'+g+'</div>'+KBD.filter(k=>k[2]===g).map(k=>'<div class="krow"><span class="kk">'+k[0].split(/ \/ | /).map(p=>p==="/"?"/":'<kbd class="k">'+esc(p)+'</kbd>').join(" ")+'</span><span>'+esc(k[1])+'</span></div>').join("")+'</div>').join("");

  /* armador de comando */
  const CB=[
   ["inicio","Cómo empezar",[["","Sesión nueva"],["-c","Continuar la última (-c)"],["-r","Retomar por nombre (-r)"],["-p","No interactivo (-p)"]]],
   ["model","Modelo",[["","(el de settings)"],["sonnet","sonnet"],["opus","opus"],["haiku","haiku"],["fable","fable"]]],
   ["effort","Esfuerzo",[["","(por defecto)"],["low","low"],["medium","medium"],["high","high"],["xhigh","xhigh"],["max","max"]]],
   ["mode","Modo de permiso",[["","(por defecto)"],["plan","plan"],["acceptEdits","acceptEdits"],["auto","auto"],["dontAsk","dontAsk"]]],
   ["wt","Worktree aislado",[["","No"],["feature-x","Sí: -w feature-x"]]],
   ["fmt","Salida (-p)",[["","texto"],["json","json"],["stream-json","stream-json"]]]
  ];
  $("#cbForm").innerHTML=CB.map(c=>'<label>'+c[1]+'</label><select data-cb="'+c[0]+'">'+c[2].map(o=>'<option value="'+o[0]+'">'+esc(o[1])+'</option>').join("")+'</select>').join("")+'<label>Prompt (opcional)</label><input data-cb="prompt" value="">';
  function cb(){const v={};$$("[data-cb]").forEach(s=>v[s.dataset.cb]=s.value.trim());const p=["claude"],ex=[];
    if(v.inicio==="-c"){p.push("-c");ex.push("-c retoma la conversación más reciente de este directorio.");}
    if(v.inicio==="-r"){p.push('-r "auth-refactor"');ex.push("-r retoma una sesión por nombre o ID.");}
    if(v.inicio==="-p"){p.push("-p");ex.push("-p responde una vez y sale: ideal para scripts y CI.");}
    if(v.model){p.push("--model "+v.model);ex.push("--model solo para esta sesión (no cambia tu default).");}
    if(v.effort){p.push("--effort "+v.effort);ex.push("--effort "+v.effort+" no se guarda.");}
    if(v.mode){p.push("--permission-mode "+v.mode);ex.push(v.mode==="dontAsk"?"dontAsk deniega todo lo que pediría permiso: útil en CI.":"Arranca en modo "+v.mode+".");}
    if(v.wt){p.push("-w "+v.wt);ex.push("-w crea un worktree en .claude/worktrees/"+v.wt+" para no pisar tu checkout.");}
    if(v.fmt){if(v.inicio!=="-p"){ex.push("⚠ --output-format solo aplica con -p.");}p.push("--output-format "+v.fmt);}
    if(v.prompt)p.push('"'+v.prompt.replace(/"/g,'\\"')+'"');else if(v.inicio==="-p"){p.push('"resume los cambios del último commit"');}
    $("#cbOut").textContent=p.join(" \\\n  ");$("#cbExp").innerHTML=ex.map(esc).join("<br>")||"Sesión interactiva con tu configuración por defecto.";}
  on($("#cbForm"),"input",cb);on($("#cbForm"),"change",cb);cb();

  /* práctica */
  const DR=[
   ["Llevas dos horas en la misma sesión, Claude empieza a olvidar decisiones y la tarea sigue.",["/clear","/compact conserva las decisiones de diseño","/exit","/rewind"],1,"/compact resume y libera espacio sin perder el hilo. /clear borraría todo el contexto: úsalo al cambiar de tarea."],
   ["Claude editó 6 archivos en la dirección equivocada. Quieres volver al estado de hace 3 mensajes.",["/undo-all","/diff","/rewind (o Esc Esc)","/clear"],2,"/rewind restaura código y/o conversación a un checkpoint. Recuerda: lo que cambió vía Bash no se revierte."],
   ["Antes de abrir el PR quieres una revisión de bugs y que se arreglen solos.",["/security-review","/code-review --fix","/simplify","/diff"],1,"--fix hace que Claude aplique los hallazgos. /simplify busca limpieza, no bugs."],
   ["Necesitas una respuesta rápida sobre otra parte del código sin ensuciar la conversación.",["/btw ¿dónde se valida el token?","/fork","/clear","/subtask"],0,"/btw responde al margen y no agrega nada al historial."],
   ["Quieres que Claude siga trabajando hasta que todos los tests pasen, sin que le digas 'sigue'.",["/loop","/goal npm test pasa sin errores","/schedule","/background"],1,"/goal evalúa la condición al final de cada turno y continúa hasta cumplirla."],
   ["Migrar 40 archivos de JS a TS en paralelo, cada uno aislado.",["/fork","/batch migra src/ a TypeScript","/subtask","/loop"],1,"/batch divide en unidades, lanza un subagente por unidad en su worktree y abre los cambios."],
   ["Tu settings.json tiene una regla allow pero Claude igual pregunta.",["/permissions y /status","/doctor prompt-audit","/clear","/model"],0,"/status muestra qué archivos cargaron; /permissions muestra las reglas por scope. Un ask de otro archivo gana sobre tu allow."],
   ["Quieres ver cuánto de tu ventana de contexto se están comiendo los servidores MCP.",["/usage","/context","/mcp","/cost"],1,"/context muestra la grilla de uso por categoría con sugerencias."]
  ];
  $("#drill").innerHTML=DR.map((d,i)=>'<div class="q" data-d="'+i+'"><p>'+(i+1)+'. '+esc(d[0])+'</p>'+d[1].map((o,j)=>'<button class="opt" data-o="'+j+'"><code>'+esc(o)+'</code></button>').join("")+'<div class="why">'+esc(d[3])+'</div></div>').join("")+'<div class="qscore" id="drSc"></div>';
  const dra={};
  on($("#drill"),"click",e=>{const o=e.target.closest(".opt");if(!o)return;const q=o.closest(".q"),i=+q.dataset.d;if(dra[i]!==undefined)return;const j=+o.dataset.o;dra[i]=j===DR[i][2];q.classList.add("ans");o.classList.add(dra[i]?"ok":"no");if(!dra[i])q.querySelectorAll(".opt")[DR[i][2]].classList.add("ok");const n=Object.keys(dra).length,ok=Object.values(dra).filter(Boolean).length;$("#drSc").textContent=n===DR.length?ok+"/"+DR.length+(ok===DR.length?" · ¡perfecto!":" · revisa las explicaciones"):n+"/"+DR.length+" respondidas";});
})();}catch(e){console.warn("[guía]",e);}

/* =================== HOOKS =================== */
const HK_EV=[
 ["SessionStart","Sesión","Al iniciar o retomar una sesión.","startup, resume, clear, compact, fork","No","source, model","additionalContext (o texto en stdout), sessionTitle, watchPaths, reloadSkills","Cargar contexto dinámico (git log, tickets abiertos) o variables con CLAUDE_ENV_FILE. Solo tipos command y mcp_tool."],
 ["Setup","Sesión","Con --init-only, o con --init / --maintenance en modo -p.","init, maintenance","No","—","—","Preparación única en CI o scripts: instalar dependencias, migrar."],
 ["SessionEnd","Sesión","Al terminar la sesión.","clear, resume, logout, prompt_input_exit, other","No","reason","—","Limpieza y logs. Todos comparten un presupuesto de 1,5 s por defecto."],
 ["UserPromptSubmit","Turno","Al enviar un prompt, antes de que Claude lo procese.","(sin matcher)","Sí: bloquea y borra el prompt","prompt","decision: block, reason, additionalContext, sessionTitle","Validar prompts, agregar contexto (rama, freeze de deploys), bloquear secretos pegados."],
 ["UserPromptExpansion","Turno","Cuando un comando que escribiste se expande a un prompt.","nombre del comando","Sí: bloquea la expansión","—","decision: block, reason","Restringir o auditar el uso de ciertas skills o comandos."],
 ["Stop","Turno","Cuando Claude termina de responder (no en interrupciones).","(sin matcher)","Sí: Claude sigue trabajando","stop_hook_active, last_assistant_message","decision: block + reason (la siguiente instrucción)","No terminar hasta que pasen los tests o el lint."],
 ["StopFailure","Turno","Cuando el turno termina por un error de API.","rate_limit, overloaded, billing_error…","No","error","—","Alertar o registrar fallas de API."],
 ["PreToolUse","Herramientas","Antes de ejecutar una herramienta. Corre antes de cualquier chequeo de modo.","nombre de herramienta: Bash, Edit|Write, mcp__.*","Sí: cancela la llamada","tool_name, tool_input, tool_use_id","permissionDecision allow/deny/ask/defer, permissionDecisionReason, updatedInput, additionalContext","Guardrails: bloquear rm -rf, proteger archivos, reescribir comandos."],
 ["PermissionRequest","Herramientas","Cuando Claude Code está por pedirte permiso.","nombre de herramienta","Usa JSON","tool_name, tool_input","decision.behavior allow/deny, updatedInput, updatedPermissions","Auto-aprobar prompts que siempre aceptas (p. ej. ExitPlanMode)."],
 ["PermissionDenied","Herramientas","Cuando el modo auto deniega una llamada.","nombre de herramienta","No","tool_name, tool_input","retry: true (permite reintentar)","Registrar o permitir reintentos tras una denegación."],
 ["PostToolUse","Herramientas","Después de que una herramienta tiene éxito.","nombre de herramienta","No bloquea (ya corrió); stderr va a Claude","tool_name, tool_input, tool_response","decision: block + reason, updatedToolOutput, additionalContext","Formatear, correr linters, validar el resultado."],
 ["PostToolUseFailure","Herramientas","Después de que una herramienta falla.","nombre de herramienta","No","tool_name, error","decision: block, additionalContext","Dar pistas a Claude cuando algo falla."],
 ["PostToolBatch","Herramientas","Tras resolverse un lote de llamadas en paralelo, antes de la siguiente llamada al modelo.","(sin matcher)","Sí: detiene el loop","—","decision: block, reason","Chequeos agregados por lote."],
 ["SubagentStart","Agentes y tareas","Al lanzar un subagente.","tipo: Explore, Plan, general-purpose, propios","No","agent_type","additionalContext","Inyectar contexto a subagentes concretos."],
 ["SubagentStop","Agentes y tareas","Cuando un subagente termina.","tipo de agente","Sí: el subagente sigue","last_assistant_message","decision: block, additionalContext","Exigir calidad mínima al resultado de un subagente."],
 ["TaskCreated","Agentes y tareas","Al crear una tarea con TaskCreate.","(sin matcher)","Sí: revierte la creación","—","decision: block, reason","Políticas sobre tareas del equipo."],
 ["TaskCompleted","Agentes y tareas","Al marcar una tarea como completada.","(sin matcher)","Sí: impide completarla","—","continue: false","Exigir tests antes de cerrar tareas."],
 ["TeammateIdle","Agentes y tareas","Cuando un compañero de agent team va a quedar inactivo.","(sin matcher)","Sí: lo mantiene trabajando","—","continue: false","Asignar más trabajo automáticamente."],
 ["PreCompact","Contexto","Antes de compactar.","manual, auto","Sí: bloquea la compactación","trigger","decision: block, reason","Guardar un respaldo del transcript."],
 ["PostCompact","Contexto","Después de compactar.","manual, auto","No","—","—","Registrar; para re-inyectar contexto usa SessionStart con matcher compact."],
 ["InstructionsLoaded","Contexto","Cuando se carga un CLAUDE.md o .claude/rules/*.md.","session_start, nested_traversal, path_glob_match, include, compact","No","file_path","—","Depurar qué instrucciones cargan y cuándo."],
 ["ConfigChange","Entorno","Cuando cambia un archivo de configuración durante la sesión.","user_settings, project_settings, local_settings, policy_settings, skills","Sí (salvo policy_settings)","source, file_path","decision: block, reason","Auditar o bloquear cambios de configuración."],
 ["CwdChanged","Entorno","Cuando cambia el directorio de trabajo.","(sin matcher)","No","old_cwd, new_cwd","—","Recargar variables con direnv (CLAUDE_ENV_FILE)."],
 ["DirectoryAdded","Entorno","Al agregar un directorio con /add-dir.","slash_command, register_repo_root","No","—","—","Preparar el directorio agregado."],
 ["FileChanged","Entorno","Cuando cambia en disco un archivo vigilado.","nombres literales: .envrc|.env","No","file_path","—","Recargar entorno o reformatear un archivo concreto."],
 ["WorktreeCreate","Entorno","Al crear un worktree (-w, isolation, sesiones de fondo).","(sin matcher)","Cualquier salida ≠ 0 hace fallar","—","Imprime la ruta en stdout","Reemplazar git worktree (otro VCS, copias propias)."],
 ["WorktreeRemove","Entorno","Al borrar un worktree creado por el hook anterior.","(sin matcher)","Falla si el directorio queda","—","—","Limpieza del worktree propio."],
 ["PreModelSwitch","Modelo","Antes de aplicar un cambio de modelo pedido.","nombre canónico: .*opus.*","Sí: bloquea el cambio","from_model, to_model","permissionDecision allow/deny/ask","Impedir modelos caros en ciertos repos."],
 ["PostModelSwitch","Modelo","Después de que cambia el modelo.","nombre canónico","No","from_model, to_model","additionalContext","Ajustar instrucciones según el modelo."],
 ["Notification","Interfaz","Cuando Claude Code envía una notificación.","permission_prompt, idle_prompt, auth_success, agent_needs_input…","No","message, notification_type","—","Aviso de escritorio, Slack o sonido."],
 ["MessageDisplay","Interfaz","Mientras se muestra texto del asistente.","(sin matcher)","No","—","displayContent (solo cambia lo que ves)","Redactar o reformatear lo que aparece en pantalla."],
 ["Elicitation","MCP","Cuando un servidor MCP pide datos al usuario.","nombre del servidor","Sí: declina sin diálogo","—","action accept/decline/cancel, content","Responder automáticamente formularios MCP."],
 ["ElicitationResult","MCP","Tras responder una elicitation, antes de enviarla.","nombre del servidor","Sí: se vuelve decline","—","action, content","Validar lo que se envía al servidor."]
];
try{(function(){if(!document.getElementById("v-hooks"))return; // módulo de la vista hooks
  if(!$("#v-hooks"))return;
  const byName=n=>HK_EV.find(e=>e[0]===n);
  function evCard(e){return '<div class="cdh"><span class="cn big">'+e[0]+'</span> <span class="badge">'+e[1]+'</span></div><p class="cdd">'+esc(e[2])+'</p><table class="ref opt"><tbody>'+
    '<tr><td>Matcher</td><td>'+esc(e[3])+'</td></tr><tr><td>¿Bloquea con exit 2?</td><td>'+esc(e[4])+'</td></tr><tr><td>Entrada propia</td><td><code>'+esc(e[5])+'</code></td></tr><tr><td>Decisión JSON</td><td>'+esc(e[6])+'</td></tr><tr><td>Uso típico</td><td>'+esc(e[7])+'</td></tr></tbody></table>';}
  /* ciclo de vida */
  const LC=[["SessionStart","Abres claude. SessionStart (matcher startup) puede inyectar contexto."],["InstructionsLoaded","Se cargan los CLAUDE.md y reglas: InstructionsLoaded por cada archivo."],["UserPromptSubmit","Escribes 'agrega validación al formulario'. UserPromptSubmit puede bloquearlo o agregar contexto."],["PreToolUse","Claude quiere ejecutar Edit. PreToolUse corre ANTES del chequeo de permisos: puede denegar."],["PermissionRequest","No hay regla allow: Claude Code va a preguntarte. PermissionRequest puede responder por ti."],["PostToolUse","El Edit tuvo éxito: PostToolUse corre prettier sobre el archivo."],["PostToolBatch","Claude había lanzado varias herramientas en paralelo: PostToolBatch al resolverse todas."],["Notification","Claude espera tu respuesta: Notification (idle_prompt) te avisa en el escritorio."],["Stop","Claude terminó de responder. Stop puede obligarlo a seguir si los tests fallan."],["PreCompact","El contexto se llenó: PreCompact antes de compactar (puede bloquear)."],["SessionStart","Tras compactar, SessionStart vuelve a disparar con matcher compact: re-inyecta lo importante."],["SessionEnd","Sales con /exit: SessionEnd para limpieza (1,5 s de presupuesto)."]];
  const PH=[[0,1,"Inicio"],[2,2,"Turno"],[3,6,"Cada herramienta"],[7,8,"Fin de turno"],[9,10,"Compactación"],[11,11,"Salida"]];
  $("#lc").innerHTML=PH.map(p=>'<div class="lcph"><div class="lcpt">'+p[2]+'</div><div class="lcrow">'+LC.slice(p[0],p[1]+1).map((x,k)=>'<button class="lcn" data-k="'+(p[0]+k)+'">'+x[0]+'</button>').join("")+'</div></div>').join("");
  let lcRun=0;
  function lcShow(k){$$("#lc .lcn").forEach(b=>b.classList.toggle("on",+b.dataset.k===k));$$("#lc .lcn").forEach(b=>{if(+b.dataset.k<k)b.classList.add("past");});$("#lcNar").innerHTML='<b>'+(k+1)+'/'+LC.length+'</b> · '+esc(LC[k][1]);}
  on($("#lcPlay"),"click",async()=>{const my=++lcRun;$$("#lc .lcn").forEach(b=>b.classList.remove("past","on"));for(let k=0;k<LC.length;k++){if(my!==lcRun)return;lcShow(k);await sleep(1900);}$("#lcNar").innerHTML+=' <span style="color:var(--ok)">· fin de la sesión</span>';});
  on($("#lc"),"click",e=>{const b=e.target.closest(".lcn");if(!b)return;lcRun++;const ev=byName(b.textContent);$$("#lc .lcn").forEach(x=>x.classList.toggle("on",x===b));$("#lcNar").innerHTML=evCard(ev);});
  /* anatomía */
  const NJ=['{','  "hooks": {','    "PreToolUse": [','      {','        "matcher": "Bash",','        "hooks": [','          {','            "type": "command",','            "if": "Bash(rm *)",','            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/block-rm.sh"','          }','        ]','      }','    ]','  }','}'];
  const NR={1:[2,13],2:[3,12],3:[6,10]};
  function nj(n){$("#nestJson").innerHTML=NJ.map((l,i)=>{const r=NR[n];const o=r&&i>=r[0]&&i<=r[1];return '<span class="jl'+(o?' on n'+n:'')+'">'+hl(l)+'</span>';}).join("\n");$$("#nest .nl").forEach(x=>x.classList.toggle("on",+x.dataset.n===n));}
  on($("#nest"),"mouseover",e=>{const l=e.target.closest(".nl");if(l){e.stopPropagation();nj(+l.dataset.n);}});
  on($("#nest"),"click",e=>{const l=e.target.closest(".nl");if(l){nj(+l.dataset.n);}});nj(3);
  /* catálogo */
  const CATS=[...new Set(HK_EV.map(e=>e[1]))];let ec="all",es=7;
  $("#evCats").innerHTML='<button class="chip on" data-c="all">Todos</button>'+CATS.map(c=>'<button class="chip" data-c="'+c+'">'+c+'</button>').join("")+'<button class="chip" data-c="block">Pueden bloquear</button>';
  on($("#evCats"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;ec=b.dataset.c;$$("#evCats .chip").forEach(x=>x.classList.toggle("on",x===b));evR();});
  function evR(){const l=HK_EV.map((e,i)=>i).filter(i=>ec==="all"||(ec==="block"?/^Sí/.test(HK_EV[i][4]):HK_EV[i][1]===ec));if(!l.includes(es))es=l[0];
    $("#evCount").textContent=l.length+" eventos";
    $("#evList").innerHTML=l.map(i=>'<button class="ci'+(i===es?' on':'')+'" data-i="'+i+'"><span class="cn">'+HK_EV[i][0]+'</span>'+(/^Sí/.test(HK_EV[i][4])?'<span class="badge blk">bloquea</span>':'')+'<span class="cd">'+esc(HK_EV[i][2])+'</span></button>').join("");$("#evDet").innerHTML=evCard(HK_EV[es]);}
  on($("#evList"),"click",e=>{const b=e.target.closest(".ci");if(!b)return;es=+b.dataset.i;evR();});evR();
  /* matcher */
  function mt(){const m=$("#mtM").value,t=$("#mtT").value.trim();let ok,why;
    if(m==="*"||m.trim()===""){ok=true;why="Comodín: coincide con cualquier valor.";}
    else if(/^[A-Za-z0-9_\-|, ]+$/.test(m)){const list=m.split(/[|,]/).map(s=>s.trim()).filter(Boolean);ok=list.includes(t);why="Solo letras, dígitos, _ y - con separadores: se trata como lista exacta ["+list.join(", ")+"]. Distingue mayúsculas.";}
    else{try{ok=new RegExp(m).test(t);why="Tiene caracteres especiales: se evalúa como regex JavaScript sin anclar. Para coincidencia exacta usa ^…$.";}catch(err){ok=false;why="Regex inválida: "+err.message;}}
    $("#mtV").className="verdict "+(ok?"allow":"deny");$("#mtV").textContent=ok?"✓ El hook se ejecuta":"✗ El hook no se ejecuta";$("#mtWhy").textContent=why;}
  [["Edit|Write","Write"],["Edit","MultiEdit"],["mcp__github__.*","mcp__github__create_issue"],["Bash","bash"],["*","WebFetch"],["Notebook.*","NotebookEdit"],["mcp__.*__write.*","mcp__fs__write_file"]].forEach(([m,t])=>{const b=document.createElement("button");b.className="chip";b.textContent=m+" ← "+t;b.onclick=()=>{$("#mtM").value=m;$("#mtT").value=t;mt();};$("#mtEx").appendChild(b);});
  on($("#mtM"),"input",mt);on($("#mtT"),"input",mt);mt();
  /* stdin */
  const IN=[["PreToolUse · Bash",{session_id:"abc123",transcript_path:"~/.claude/projects/…/abc123.jsonl",cwd:"/Users/ana/tienda",permission_mode:"default",hook_event_name:"PreToolUse",tool_name:"Bash",tool_input:{command:"npm test",description:"Corre los tests"},tool_use_id:"toolu_01ABC"},"Lee tool_input.command para decidir. tool_use_id permite correlacionar con PostToolUse."],
   ["PostToolUse · Write",{session_id:"abc123",cwd:"/Users/ana/tienda",hook_event_name:"PostToolUse",tool_name:"Write",tool_input:{file_path:"/Users/ana/tienda/src/app.ts",content:"…"},tool_response:{filePath:"/Users/ana/tienda/src/app.ts",success:true},tool_use_id:"toolu_01ABD"},"tool_response trae el resultado. La herramienta ya corrió: no puedes deshacerla, solo reaccionar."],
   ["UserPromptSubmit",{session_id:"abc123",cwd:"/Users/ana/tienda",permission_mode:"default",hook_event_name:"UserPromptSubmit",prompt:"agrega validación al formulario de registro"},"El texto que imprimas en stdout (exit 0) se agrega al contexto de Claude."],
   ["Stop",{session_id:"abc123",cwd:"/Users/ana/tienda",hook_event_name:"Stop",stop_hook_active:false,last_assistant_message:"Listo, agregué la validación…"},"Si stop_hook_active es true, ya forzaste una continuación: sal con 0 para no entrar en loop."],
   ["SessionStart",{session_id:"abc123",cwd:"/Users/ana/tienda",hook_event_name:"SessionStart",source:"compact",model:"claude-opus-5-5"},"source dice cómo arrancó: startup, resume, clear, compact o fork. Úsalo como matcher."],
   ["Notification",{session_id:"abc123",cwd:"/Users/ana/tienda",hook_event_name:"Notification",message:"Claude needs your permission to use Bash",notification_type:"permission_prompt"},"Solo efectos secundarios: no puede bloquear ni decidir nada."]];
  tabs($("#inTabs"),IN.map(x=>x[0]),i=>{setCode($("#inOut"),JSON.stringify(IN[i][1],null,2));$("#inNote").textContent=IN[i][2];});
  /* simulador exit */
  const EXE=["PreToolUse","PostToolUse","UserPromptSubmit","Stop","SessionStart","Notification"];
  const EXO=[["0e","exit 0, sin salida"],["0t","exit 0 + texto en stdout"],["0j","exit 0 + JSON de decisión"],["2","exit 2 + motivo en stderr"],["1","exit 1 (u otro código)"],["1b","exit 1 con onFailure: \"block\""]];
  $("#xsEv").innerHTML=EXE.map(e=>'<option>'+e+'</option>').join("");$("#xsOut").innerHTML=EXO.map(o=>'<option value="'+o[0]+'">'+o[1]+'</option>').join("");
  const R={
   PreToolUse:{"0e":["go","Sin objeción. Sigue el flujo normal de permisos (reglas y modo): exit 0 no aprueba."],"0t":["go","El texto no afecta a Claude; queda en el transcript/log. Sigue el flujo normal de permisos."],"0j":["stop","Con permissionDecision \"deny\" la llamada se cancela y el motivo se le envía a Claude. Con \"allow\" se salta el prompt (las reglas deny siguen valiendo); con \"ask\" te pregunta."],"2":["stop","Bloqueado. La herramienta no corre y Claude recibe tu stderr como feedback para ajustar su plan."],"1":["go","Error no bloqueante: la herramienta corre igual y ves \"PreToolUse hook error\" en el transcript."],"1b":["stop","Con onFailure: block, un hook que falla o expira bloquea la acción. Ideal para guardrails críticos."]},
   PostToolUse:{"0e":["go","Todo sigue. La herramienta ya había corrido."],"0t":["go","El texto no entra al contexto; queda en el transcript/log."],"0j":["warn","decision: \"block\" + reason le devuelve el motivo a Claude (la herramienta ya corrió). additionalContext agrega información; updatedToolOutput cambia lo que Claude ve."],"2":["warn","No puede deshacer nada: la herramienta ya corrió. Tu stderr se le muestra a Claude para que reaccione (p. ej. errores de lint)."],"1":["go","Error no bloqueante; Claude sigue."],"1b":["warn","Marca el fallo como bloqueante, pero el efecto de la herramienta ya ocurrió."]},
   UserPromptSubmit:{"0e":["go","El prompt llega a Claude sin cambios."],"0t":["go","Tu stdout se agrega al contexto de Claude junto con el prompt. Así inyectas la rama, el sprint, etc."],"0j":["stop","decision: \"block\" descarta el prompt y muestra el motivo. Con hookSpecificOutput.additionalContext, en cambio, agregas contexto."],"2":["stop","Bloquea el prompt y lo borra; tu stderr se le muestra al usuario, no a Claude."],"1":["go","Error no bloqueante; el prompt sigue."],"1b":["stop","Si el hook falla, el prompt se bloquea."]},
   Stop:{"0e":["go","Claude termina su turno normalmente."],"0t":["go","Claude termina; el texto queda en el log."],"0j":["loop","decision: \"block\" + reason: Claude NO termina y usa tu reason como siguiente instrucción (ej.: \"faltan 2 tests\")."],"2":["loop","Claude sigue trabajando con tu stderr como feedback. Revisa stop_hook_active para no entrar en loop (tope: 8 bloqueos seguidos)."],"1":["go","Error no bloqueante; Claude termina."],"1b":["loop","Si el hook falla, Claude no puede terminar."]},
   SessionStart:{"0e":["go","La sesión arranca normal."],"0t":["go","Tu stdout se agrega al contexto inicial de Claude: perfecto para git log, tickets o recordatorios tras compactar."],"0j":["go","additionalContext entra al contexto; también puedes fijar sessionTitle o watchPaths."],"2":["warn","SessionStart no puede bloquear: se muestra stderr al usuario y la sesión sigue."],"1":["go","Error no bloqueante; la sesión sigue."],"1b":["warn","No hay acción que bloquear: la sesión sigue."]},
   Notification:{"0e":["go","Se ejecutó tu efecto (notificación, sonido)."],"0t":["go","El texto no afecta nada."],"0j":["go","No tiene campos de decisión: solo efectos secundarios."],"2":["warn","No puede bloquear: stderr se muestra al usuario."],"1":["go","Error no bloqueante."],"1b":["warn","No hay acción que bloquear."]}};
  function ex(){const ev=$("#xsEv").value,o=$("#xsOut").value,r=R[ev][o];
    const steps=["Evento "+ev,"Tu hook: "+EXO.find(x=>x[0]===o)[1],{go:"La acción continúa",stop:"Acción bloqueada",warn:"Continúa con aviso",loop:"Claude sigue trabajando"}[r[0]]];
    $("#xsFlow").innerHTML=steps.map((s,i)=>'<div class="exs '+(i===2?r[0]:'')+'">'+esc(s)+'</div>').join('<span class="exa">→</span>');$("#xsRes").textContent=r[1];}
  on($("#xsEv"),"change",ex);on($("#xsOut"),"change",ex);ex();
  /* tipos de handler */
  const HT=[["command","Ejecuta un comando de shell. Recibe el JSON por stdin; responde con exit code y stdout/stderr. El 90% de los hooks.",{type:"command",command:"\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check.sh",timeout:30,async:false,onFailure:"block"},[["command","Comando a ejecutar (forma shell)"],["args","Lista de argumentos: activa la forma exec, sin shell"],["shell","bash o powershell"],["async / asyncRewake","En segundo plano / despertar a Claude al terminar"],["onFailure","continue (defecto) o block"]]],
   ["http","Hace POST del mismo JSON a una URL. La respuesta usa el mismo formato JSON. Un estado no-2xx es error no bloqueante (salvo onFailure: block).",{type:"http",url:"http://localhost:8080/hooks/tool-use",headers:{Authorization:"Bearer $MY_TOKEN"},allowedEnvVars:["MY_TOKEN"]},[["url","Endpoint"],["headers","Admite $VAR / ${VAR}"],["allowedEnvVars","Solo estas variables se interpolan; el resto queda vacío"]]],
   ["mcp_tool","Llama a una herramienta de un servidor MCP configurado, con la entrada interpolada desde el JSON del evento.",{type:"mcp_tool",server:"slack",tool:"send_message",input:{channel:"#deploys",text:"Claude terminó en ${cwd}"}},[["server","Nombre del servidor MCP"],["tool","Herramienta a llamar"],["input","Argumentos; ${ruta} toma valores del JSON de entrada"]]],
   ["prompt","Envía el JSON a un modelo Claude con tu prompt para una decisión de juicio. Debe responder {\"ok\": true} o {\"ok\": false, \"reason\": \"…\"}. Timeout 30 s.",{type:"prompt",prompt:"¿Completó Claude todas las tareas pedidas? Si no, responde {\"ok\": false, \"reason\": \"qué falta\"}. Contexto: $ARGUMENTS",model:"haiku"},[["prompt","$ARGUMENTS inserta el JSON de entrada"],["model","Modelo evaluador"],["continueOnBlock","En PreToolUse/PostToolUse: devolver el motivo a Claude en vez de cortar el turno"]]],
   ["agent","(Experimental) Lanza un subagente con herramientas (Read, Grep, Bash…) que verifica el estado real antes de decidir. Hasta 50 turnos; timeout 60 s.",{type:"agent",prompt:"Verifica que todos los tests unitarios pasen. Corre la suite y revisa los resultados. $ARGUMENTS",timeout:120},[["prompt","Instrucciones del verificador"],["model","Modelo del subagente"],["timeout","Súbelo si la verificación es larga"]]]];
  tabs($("#htTabs"),HT.map(x=>x[0]),i=>{$("#htDesc").textContent=HT[i][1];const evn=["PreToolUse","PostToolUse","Notification","Stop","Stop"][i];setCode($("#htOut"),JSON.stringify({hooks:{[evn]:[{hooks:[HT[i][2]]}]}},null,2));$("#htFields").innerHTML='<table class="ref opt"><tbody>'+HT[i][3].map(f=>'<tr><td><code>'+esc(f[0])+'</code></td><td>'+esc(f[1])+'</td></tr>').join("")+'</tbody></table>';});
  /* recetas */
  const RC=[
   ["Formatear después de editar","PostToolUse","Corre Prettier sobre cada archivo que Claude edita o crea. Sin mensajes si todo va bien: verás el archivo reformateado.",".claude/settings.json",{hooks:{PostToolUse:[{matcher:"Edit|Write",hooks:[{type:"command",command:"jq -r '.tool_input.file_path' | xargs npx prettier --write"}]}]}},null,"Requiere jq. Cambios hechos por Bash no lo disparan; para eso usa FileChanged."],
   ["Proteger archivos sensibles","PreToolUse","Bloquea ediciones a .env, package-lock.json y .git/. Claude recibe el motivo y ajusta su enfoque.",".claude/settings.json",{hooks:{PreToolUse:[{matcher:"Edit|Write",hooks:[{type:"command",command:"\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh"}]}]}},["#!/bin/bash","# .claude/hooks/protect-files.sh  (chmod +x)","INPUT=$(cat)","FILE_PATH=$(echo \"$INPUT\" | jq -r '.tool_input.file_path // empty')","FILE_PATH=\"${FILE_PATH//\\\\//}\"   # normaliza separadores de Windows","for p in \".env\" \"package-lock.json\" \".git/\"; do","  if [[ \"$FILE_PATH\" == *\"$p\"* ]]; then","    echo \"Bloqueado: $FILE_PATH coincide con '$p'\" >&2","    exit 2","  fi","done","exit 0"],"Para lecturas de secretos usa además reglas deny Read(./.env)."],
   ["Bloquear rm -rf","PreToolUse","Con el campo if, el script solo se lanza para comandos rm. Exit 2 con el motivo en stderr.",".claude/settings.json",{hooks:{PreToolUse:[{matcher:"Bash",hooks:[{type:"command",if:"Bash(rm *)",command:"\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-rm.sh"}]}]}},["#!/bin/bash","CMD=$(jq -r '.tool_input.command')","if echo \"$CMD\" | grep -qE 'rm\\s+-(rf|fr)'; then","  echo \"Bloqueado: usa rutas explícitas o pídemelo a mí\" >&2","  exit 2","fi","exit 0"],"Un deny de hook bloquea incluso en modo bypassPermissions."],
   ["Notificación de escritorio","Notification","Aviso cuando Claude espera tu input o un permiso, para que puedas cambiar de tarea.","~/.claude/settings.json",{hooks:{Notification:[{matcher:"",hooks:[{type:"command",command:"osascript -e 'display notification \"Claude Code te necesita\" with title \"Claude Code\"'"}]}]}},null,"Linux: notify-send 'Claude Code' 'Te necesita'. En macOS, habilita notificaciones para Script Editor si no aparece nada."],
   ["Re-inyectar contexto tras compactar","SessionStart","Al compactar se pueden perder detalles. Este hook vuelve a decir lo crítico después de cada compactación.",".claude/settings.json",{hooks:{SessionStart:[{matcher:"compact",hooks:[{type:"command",command:"echo 'Recordatorio: usamos Bun, no npm. Corre bun test antes de commitear. Sprint actual: refactor de auth.'"}]}]}},null,"Cambia el echo por algo dinámico: git log --oneline -5."],
   ["No terminar con tests rotos","Stop","Si los tests fallan, Claude no puede terminar el turno y recibe la salida como siguiente instrucción.",".claude/settings.json",{hooks:{Stop:[{hooks:[{type:"command",command:"\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/tests-pass.sh",timeout:300}]}]}},["#!/bin/bash","INPUT=$(cat)","# evita loops: si ya forzamos una continuación, deja terminar","[ \"$(echo \"$INPUT\" | jq -r '.stop_hook_active')\" = \"true\" ] && exit 0","if ! OUT=$(npm test 2>&1); then","  jq -n --arg r \"Los tests fallan. Arréglalos:\\n$(echo \"$OUT\" | tail -30)\" '{decision:\"block\",reason:$r}'","fi","exit 0"],"Alternativa sin script: un hook type agent que corre la suite y responde ok/reason."],
   ["Registrar cada comando Bash","PreToolUse","Bitácora de auditoría de todo lo que Claude ejecuta. No decide nada (exit 0).","~/.claude/settings.json",{hooks:{PreToolUse:[{matcher:"Bash",hooks:[{type:"command",command:"jq -r '\"\\(now|todate) \\(.cwd) \\(.tool_input.command)\"' >> ~/.claude/bash.log",async:true}]}]}},null,"async: true para no agregar latencia."],
   ["Auto-aprobar el plan","PermissionRequest","Responde por ti el prompt de ExitPlanMode. El matcher estrecho evita aprobar cualquier otra cosa.","~/.claude/settings.json",{hooks:{PermissionRequest:[{matcher:"ExitPlanMode",hooks:[{type:"command",command:"echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PermissionRequest\",\"decision\":{\"behavior\":\"allow\"}}}'"}]}]}},null,"Nunca uses matcher vacío o .* aquí: aprobarías todo."],
   ["Contexto en cada prompt","UserPromptSubmit","Agrega la rama actual y el estado del freeze a cada mensaje que envías.",".claude/settings.json",{hooks:{UserPromptSubmit:[{hooks:[{type:"command",command:"echo \"Rama actual: $(git branch --show-current). Revisa FREEZE.md antes de tocar infra.\""}]}]}},null,"El timeout por defecto aquí es 30 s: mantenlo rápido."],
   ["Recargar entorno con direnv","CwdChanged","Cada vez que Claude cambia de directorio, recarga las variables de .envrc para los siguientes comandos Bash.","~/.claude/settings.json",{hooks:{SessionStart:[{hooks:[{type:"command",command:"direnv export bash > \"$CLAUDE_ENV_FILE\""}]}],CwdChanged:[{hooks:[{type:"command",command:"direnv export bash > \"$CLAUDE_ENV_FILE\""}]}]}},null,"Corre direnv allow una vez en cada directorio. Con FileChanged (matcher .envrc|.env) reaccionas a cambios del archivo."]];
  $("#rcChips").innerHTML=RC.map((r,i)=>'<button class="chip'+(i?'':' on')+'" data-i="'+i+'">'+esc(r[0])+'</button>').join("");
  function rc(i){const r=RC[i];$("#rcT").textContent=r[0];$("#rcD").textContent=r[2];$("#rcMeta").innerHTML='<table class="ref opt"><tbody><tr><td>Evento</td><td><code>'+r[1]+'</code></td></tr><tr><td>Dónde</td><td><code>'+esc(r[3])+'</code></td></tr></tbody></table>'+(r[6]?'<div class="tip" style="margin:10px 0 0"><b class="h">Nota</b>'+esc(r[6])+'</div>':'');
    $("#rcCode").innerHTML=codeBlock(r[3],JSON.stringify(r[4],null,2))+(r[5]?codeBlock("script",r[5].join("\n")):"");}
  on($("#rcChips"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;$$("#rcChips .chip").forEach(x=>x.classList.toggle("on",x===b));rc(+b.dataset.i);});rc(0);
  /* constructor */
  $("#hqEv").innerHTML=HK_EV.map(e=>'<option'+(e[0]==="PreToolUse"?' selected':'')+'>'+e[0]+'</option>').join("");
  const TF={command:[["cmd","Comando",'"$CLAUDE_PROJECT_DIR"/.claude/hooks/mi-hook.sh']],http:[["url","URL","http://localhost:8080/hook"]],prompt:[["pr","Prompt","Evalúa si la acción es segura: $ARGUMENTS"],["mo","Modelo","haiku"]],agent:[["pr","Prompt","Verifica que los tests pasen. $ARGUMENTS"]],mcp_tool:[["sv","Servidor","slack"],["tl","Herramienta","send_message"]]};
  function hbF(){const t=$("#hqT").value;$("#hqTf").innerHTML=TF[t].map(f=>'<label>'+f[1]+'</label><input data-hb="'+f[0]+'" value="'+esc(f[2])+'">').join("");hb();}
  let hAsync=false,hBlock=false;
  on($("#hqAsync"),"click",()=>{hAsync=!hAsync;$("#hqAsync").classList.toggle("on",hAsync);hb();});on($("#hqBlock"),"click",()=>{hBlock=!hBlock;$("#hqBlock").classList.toggle("on",hBlock);hb();});
  function hb(){const ev=$("#hqEv").value,t=$("#hqT").value,v={};$$("[data-hb]").forEach(i=>v[i.dataset.hb]=i.value);const h={type:t};
    if(t==="command")h.command=v.cmd;if(t==="http")h.url=v.url;if(t==="prompt"){h.prompt=v.pr;if(v.mo)h.model=v.mo;}if(t==="agent")h.prompt=v.pr;if(t==="mcp_tool"){h.server=v.sv;h.tool=v.tl;h.input={};}
    const iff=$("#hqIf").value.trim(),to=$("#hqTo").value.trim();if(iff)h.if=iff;if(to&&!isNaN(+to))h.timeout=+to;if(hAsync&&t==="command")h.async=true;if(hBlock&&(t==="command"||t==="http"))h.onFailure="block";
    const g={};const m=$("#hqM").value;const evd=HK_EV.find(e=>e[0]===ev);const noM=/sin matcher/.test(evd[3]);if(m&&!noM)g.matcher=m;g.hooks=[h];
    setCode($("#hqOut"),JSON.stringify({hooks:{[ev]:[g]}},null,2));
    const w=[];if(noM&&m)w.push("ℹ "+ev+" no usa matcher: se omitió.");if(iff&&!/Tool|Permission/.test(ev))w.push("⚠ if solo funciona en eventos de herramientas.");if(ev==="SessionStart"&&!/command|mcp_tool/.test(t))w.push("⚠ SessionStart solo admite command y mcp_tool.");if(hAsync&&t!=="command")w.push("⚠ async es solo para command.");if(ev==="PermissionRequest"&&(!m||m==="*"))w.push("⚠ Sin matcher, PermissionRequest podría auto-aprobar todo.");
    w.push(" Pégalo en "+$("#hqFile").selectedOptions[0].text.split(" (")[0]+" (fusiónalo con lo que ya tengas bajo \"hooks\").");
    $("#hqWarn").innerHTML=w.map(x=>'<div class="pn">'+esc(x)+'</div>').join("");}
  ["#hqEv","#hqM","#hqIf","#hqTo","#hqFile"].forEach(s=>{on($(s),"input",hb);on($(s),"change",hb);});on($("#hqT"),"change",hbF);on($("#hqTf"),"input",hb);hbF();
  /* diagnóstico */
  const DG=[["No se ejecuta nunca","1) /hooks: ¿aparece bajo el evento correcto? 2) El matcher distingue mayúsculas: 'bash' ≠ 'Bash'. 3) ¿Evento correcto? PreToolUse es antes, PostToolUse después. 4) Si dice 'Only hooks from managed settings run here', tu organización activó allowManagedHooksOnly."],["Aparece 'hook error'","Tu script salió con un código distinto de 0 y 2. Pruébalo a mano con echo '{…}' | ./hook.sh; echo $?. 'command not found': usa rutas absolutas o $CLAUDE_PROJECT_DIR. 'jq: command not found': instálalo o usa Python. ¿Es ejecutable? chmod +x."],["Mi JSON no tiene efecto","1) Algo imprime antes del JSON (un echo en tu ~/.bashrc): envuélvelo en if [[ $- == *i* ]]. 2) Campo en el nivel equivocado: permissionDecision y additionalContext van dentro de hookSpecificOutput. Con claude --debug busca 'Hook JSON output had unrecognized keys'."],["/hooks no muestra nada","JSON inválido (comas finales, comentarios), archivo en ruta equivocada, o el watcher no captó el cambio: reinicia la sesión."],["Claude no para nunca","Tu hook Stop bloquea siempre. Lee stop_hook_active y sal con 0 si es true. Tras 8 bloqueos seguidos sin herramientas, Claude Code lo ignora (CLAUDE_CODE_STOP_HOOK_BLOCK_CAP cambia el tope)."],["Dos hooks reescriben la entrada","Si varios PreToolUse devuelven updatedInput, gana el último en terminar y el orden no es determinista. Deja uno solo modificando cada herramienta."]];
  $("#dgChips").innerHTML=DG.map((d,i)=>'<button class="chip" data-i="'+i+'">'+esc(d[0])+'</button>').join("");
  on($("#dgChips"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;$$("#dgChips .chip").forEach(x=>x.classList.toggle("on",x===b));$("#dgOut").textContent=DG[+b.dataset.i][1];});
  $("#dgOut").textContent="Elige un síntoma.";
})();}catch(e){console.warn("[guía]",e);}

/* =================== SKILLS =================== */
try{(function(){if(!document.getElementById("v-skills"))return; // módulo de la vista skills
  if(!$("#v-skills"))return;
  /* carga progresiva */
  const PDS=[[0,"Tú: \"genera las notas de la versión 2.4\". Claude solo ve el listado: 23 skills, nombre + descripción."],[0,"La descripción de release-notes dice \"Úsala cuando pidan notas de versión o changelog\": coincide."],[1,"Claude invoca la skill: el cuerpo de SKILL.md entra al contexto (y los !`comandos` ya traen el git log real)."],[2,"El SKILL.md dice \"para el formato, lee templates/notas.md\": Claude lo lee recién ahora."],[2,"Corre scripts/contributors.sh: el script se ejecuta, solo su salida entra al contexto."]];
  let pdr=0;on($("#pdPlay"),"click",async()=>{const my=++pdr;$$("#pd .pdl").forEach(x=>x.classList.remove("on","lit"));for(let k=0;k<PDS.length;k++){if(my!==pdr)return;const l=PDS[k][0];$$("#pd .pdl").forEach(x=>{const n=+x.dataset.l;x.classList.toggle("on",n===l);if(n<=l)x.classList.add("lit");});$("#pdNar").innerHTML="<b>"+(k+1)+"/"+PDS.length+"</b> · "+esc(PDS[k][1]);await sleep(2300);}});
  /* anatomía */
  const AF=[
   ["---","fm","Delimitador del frontmatter YAML. Todo lo que está entre los dos --- es configuración; lo de abajo, instrucciones."],
   ["name: release-notes","fm","Nombre del comando: la invocas con /release-notes. Si lo omites, se usa el nombre de la carpeta."],
   ["description: Genera notas de versión a partir de los commits. Úsala cuando pidan notas de versión, changelog o resumen de un release.","fm","Lo más importante del archivo. Claude la lee siempre para decidir si cargar la skill: di qué hace y CUÁNDO usarla, con las palabras que usaría alguien al pedirlo."],
   ["argument-hint: [versión]","fm","Pista de autocompletado que ves al escribir /release-notes."],
   ["disable-model-invocation: true","fm","Solo tú puedes invocarla. Útil porque publica algo: no quieres que Claude decida generar un release solo."],
   ["allowed-tools: Bash(git log *) Bash(git tag *)","fm","Herramientas que Claude puede usar sin pedirte permiso mientras dura el turno de la skill."],
   ["---","fm","Fin del frontmatter."],
   ["","",""],
   ["## Commits desde el último tag","body","Markdown normal: títulos y listas ayudan a Claude a seguir la estructura."],
   ["!`git log $(git describe --tags --abbrev=0)..HEAD --oneline`","dyn","Contexto dinámico: Claude Code ejecuta el comando ANTES de que Claude vea la skill y pega la salida aquí. Claude recibe los commits reales."],
   ["","",""],
   ["## Instrucciones","body","Las instrucciones: escríbelas como reglas permanentes, porque se quedan en el contexto los turnos siguientes."],
   ["1. Agrupa los commits en Novedades, Correcciones y Cambios internos.","body","Pasos concretos y verificables funcionan mejor que pedidos vagos."],
   ["2. Usa el formato de ${CLAUDE_SKILL_DIR}/templates/notas.md","sub","${CLAUDE_SKILL_DIR} apunta a la carpeta de la skill. El template se lee solo cuando hace falta (carga progresiva)."],
   ["3. Versión a publicar: $ARGUMENTS","sub","$ARGUMENTS se reemplaza por lo que escribas después del comando: /release-notes 2.4.0."]];
  $("#anFile").innerHTML=AF.map((l,i)=>'<div class="afl '+l[1]+'" data-i="'+i+'"><span class="afn">'+(i+1)+'</span><code>'+(l[0]?esc(l[0]):"&nbsp;")+'</code></div>').join("");
  on($("#anFile"),"click",e=>{const r=e.target.closest(".afl");if(!r||!AF[+r.dataset.i][2])return;$$("#anFile .afl").forEach(x=>x.classList.toggle("on",x===r));const l=AF[+r.dataset.i];$("#anExp").innerHTML='<b>'+({fm:"Frontmatter",body:"Cuerpo",dyn:"Inyección dinámica",sub:"Sustitución"}[l[1]])+'</b><p>'+esc(l[2])+'</p>';});
  /* invocación */
  let dmi=false,ui=false;
  function iv(){const you=!ui,cl=!dmi;const desc=cl?"Siempre en contexto":"No está en contexto";
    $("#ivOut").innerHTML=[["Tú con /nombre",you],["Claude automáticamente",cl],["Descripción en contexto",cl,desc],["Cuerpo completo","*","Se carga al invocarla"]].map(r=>'<div class="ivc '+(r[1]===true?"y":r[1]===false?"n":"")+'"><b>'+r[0]+'</b><span>'+(r[2]||(r[1]?"✓ Sí":"✗ No"))+'</span></div>').join("");
    $("#ivUse").textContent=dmi&&ui?"⚠ Nadie puede invocarla: combinación inútil.":dmi?"Úsalo para flujos con efectos secundarios: /deploy, /commit, /publicar. Tú decides el momento.":ui?"Úsalo para conocimiento de fondo que no es una acción: contexto de un sistema legado, convenciones de un dominio.":"Por defecto: tú puedes invocarla y Claude también cuando la descripción coincide.";
    $("#ivDmi").classList.toggle("on",dmi);$("#ivUi").classList.toggle("on",ui);}
  on($("#ivDmi"),"click",()=>{dmi=!dmi;iv();});on($("#ivUi"),"click",()=>{ui=!ui;iv();});iv();
  /* frontmatter */
  const FM=[["name","Nombre en el menú /. Por defecto, el nombre de la carpeta.","name: deploy"],["description","Qué hace y cuándo usarla. Claude la usa para decidir. Pon el caso principal primero (se trunca a 1.536 caracteres junto con when_to_use).","description: Despliega a staging…"],["when_to_use","Frases gatillo o pedidos de ejemplo extra; se agregan a la descripción.","when_to_use: \"sube a staging\", \"deploy\""],["argument-hint","Pista de autocompletado de argumentos.","argument-hint: [issue]"],["arguments","Argumentos con nombre para $nombre (lista YAML o separados por espacios).","arguments: [origen, destino]"],["disable-model-invocation","true: solo tú la invocas. También impide precargarla en subagentes.","disable-model-invocation: true"],["user-invocable","false: se oculta del menú /, solo Claude la usa.","user-invocable: false"],["allowed-tools","Herramientas sin prompt durante el turno que la invoca. Se limpia con tu siguiente mensaje.","allowed-tools: Bash(git add *) Bash(git commit *)"],["disallowed-tools","Herramientas quitadas mientras la skill está activa.","disallowed-tools: WebFetch"],["model","Modelo solo para el turno actual (o inherit).","model: opus"],["effort","Esfuerzo mientras está activa: low a max.","effort: high"],["context","fork: corre en un subagente aislado.","context: fork"],["agent","Tipo de subagente con context: fork. Por defecto general-purpose.","agent: Explore"],["background","Con fork, false espera el resultado en el mismo turno. Por defecto true.","background: false"],["hooks","Hooks registrados al invocarla, que siguen activos en la sesión.","hooks:\n  PostToolUse: …"],["paths","Globs que limitan la carga automática a ciertos archivos.","paths: \"src/api/**\""],["shell","bash (defecto) o powershell para los !`comandos`.","shell: powershell"],["metadata","Mapa libre para tus herramientas; Claude Code lo ignora.","metadata: {owner: plataforma}"],["license","Identificador de licencia (no se usa).","license: MIT"],["compatibility","Requisitos de entorno, hasta 500 caracteres (no se usa).","compatibility: requiere gh CLI"]];
  function fm(){const q=$("#fmQ").value.toLowerCase();$("#fmBody").innerHTML=FM.filter(f=>!q||f.join(" ").toLowerCase().includes(q)).map(f=>'<tr><td><code>'+f[0]+'</code></td><td>'+esc(f[1])+'</td><td><code>'+esc(f[2])+'</code></td></tr>').join("");}
  on($("#fmQ"),"input",fm);fm();
  /* sustituciones */
  function splitArgs(s){const out=[];s.replace(/"([^"]*)"|'([^']*)'|(\S+)/g,(m,a,b,c)=>{out.push(a!==undefined?a:b!==undefined?b:c);});return out;}
  function sb(){const call=$("#sbCall").value.trim();const m=call.match(/^\/(\S+)\s*([\s\S]*)$/);const name=m?m[1]:"skill",raw=m?m[2]:"";const args=splitArgs(raw);
    const names=$("#sbArgs").value.split(/[\s,\[\]]+/).filter(Boolean);let used=false;
    let out=$("#sbBody").value.replace(/\\\$|\$\{(CLAUDE_[A-Z_]+)\}|\$ARGUMENTS\[(\d+)\]|\$ARGUMENTS|\$(\d+)|\$([A-Za-z_][A-Za-z0-9_]*)/g,(t,env,ai,n,nm)=>{
      if(t==="\\$")return "$";
      if(env)return {CLAUDE_SKILL_DIR:".claude/skills/"+name,CLAUDE_SESSION_ID:"9f2c…e41a",CLAUDE_PROJECT_DIR:"/Users/ana/tienda",CLAUDE_EFFORT:"high"}[env]||t;
      if(ai!==undefined){used=true;return args[+ai]!==undefined?args[+ai]:t;}
      if(t==="$ARGUMENTS"){used=true;return raw;}
      if(n!==undefined){used=true;return args[+n]!==undefined?args[+n]:t;}
      if(nm){const k=names.indexOf(nm);if(k<0)return t;used=true;return args[k]!==undefined?args[k]:"";}
      return t;});
    if(!used&&raw)out+="\n\nARGUMENTS: "+raw;
    $("#sbOut").textContent=out;}
  [["/migrar-componente SearchBar JavaScript TypeScript","Tres argumentos"],["/migrar-componente \"Barra de búsqueda\" JS","Con comillas y uno faltante"],["/migrar-componente","Sin argumentos"]].forEach(([c,l])=>{const b=document.createElement("button");b.className="chip";b.textContent=l;b.onclick=()=>{$("#sbCall").value=c;sb();};$("#sbEx").appendChild(b);});
  ["#sbArgs","#sbBody","#sbCall"].forEach(s=>on($(s),"input",sb));sb();
  /* dinámico */
  const DA="## Cambios sin commitear\n!`git diff --stat`\n\n## Instrucciones\nResume los cambios en 3 viñetas\ny marca riesgos.";
  const DB="## Cambios sin commitear\n src/auth/token.ts   | 24 +++++++---\n src/auth/refresh.ts | 11 ++++\n 2 files changed, 29 insertions(+), 6 deletions(-)\n\n## Instrucciones\nResume los cambios en 3 viñetas\ny marca riesgos.";
  $("#dynA").textContent=DA;$("#dynB").textContent="…";
  on($("#dynPlay"),"click",async()=>{$("#dynB").textContent="…";$("#dynArr").classList.add("run");$("#dynA").innerHTML=esc(DA).replace("!`git diff --stat`",'<mark>!`git diff --stat`</mark>');await sleep(900);$("#dynArr").classList.remove("run");$("#dynB").innerHTML=esc(DB).replace(/( src[\s\S]*?deletions\(-\))/,'<mark>$1</mark>');});
  /* presupuesto */
  function bud(){const v=$("#cbSk").value.split(/[,\s]+/).map(Number).filter(n=>n>0);let left=25000;const res=[];for(let i=v.length-1;i>=0;i--){const keep=Math.min(v[i],5000,left);left-=keep;res[i]=[v[i],keep];}
    $("#cbBar").innerHTML=res.map((r,i)=>'<div class="bsk"><span>skill '+(i+1)+(i===res.length-1?' (más reciente)':'')+'</span><div class="bt"><i class="full" style="width:'+Math.min(100,r[0]/150)+'%"></i><i class="keep" style="width:'+(r[1]/150)+'%"></i></div><b>'+(r[1]?r[1].toLocaleString("es")+" tok":"descartada")+'</b></div>').join("");
    const tot=res.reduce((a,r)=>a+r[1],0);$("#cbTxt").textContent="Re-adjuntado: "+tot.toLocaleString("es")+" de 25.000 tokens. Cada skill se corta a 5.000; se llena desde la más reciente."+(res.some(r=>!r[1])?" Las más antiguas quedaron fuera: re-invócalas si las necesitas.":"");}
  on($("#cbSk"),"input",bud);bud();
  /* incluidas */
  const BS=[["/code-review","Revisión de bugs del diff, PR o rama; --fix aplica, --comment publica."],["/simplify","Cuatro agentes en paralelo buscan limpieza y la aplican."],["/batch","Cambios masivos en paralelo, un subagente por unidad en su worktree."],["/loop","Repite un prompt cada cierto intervalo mientras la sesión esté abierta."],["/debug","Activa logs de depuración y diagnostica leyendo el log."],["/doctor","Chequeo de instalación, settings y CLAUDE.md con arreglos."],["/verify","Compila, ejecuta y observa la app para confirmar un cambio."],["/run","Lanza y maneja la app del proyecto."],["/run-skill-generator","Escribe la skill de ejecución de tu proyecto para /run y /verify."],["/claude-api","Referencia de la Claude API y el Agent SDK."],["/update-config","Edita settings.json a partir de una descripción."],["/fewer-permission-prompts","Propone una allowlist a partir de tus transcripts."],["/dataviz","Guía de diseño de gráficos accesibles."],["/design · /slides","Diseños y presentaciones como artefactos."],["/claude-in-chrome","Tareas en tu navegador."],["/workflow-authoring","Referencia para escribir workflows dinámicos."]];
  $("#bundled").innerHTML=BS.map(b=>'<div class="mini"><b><code>'+esc(b[0])+'</code></b>'+esc(b[1])+'</div>').join("");
  /* generador */
  let dyn=true;on($("#sgDyn"),"click",()=>{dyn=!dyn;$("#sgDyn").classList.toggle("on",dyn);sg();});
  function sg(){const n=($("#sgN").value.trim()||"mi-skill").toLowerCase().replace(/[^a-z0-9-]+/g,"-");const L=["---","name: "+n,"description: "+$("#sgD").value.trim().replace(/\n/g," ")];
    const a=$("#sgA").value.trim();if(a)L.push("argument-hint: "+a);
    if($("#sgI").value==="user")L.push("disable-model-invocation: true");if($("#sgI").value==="model")L.push("user-invocable: false");
    const t=$("#sgT").value.trim();if(t)L.push("allowed-tools: "+t);
    if($("#sgC").value){L.push("context: fork","agent: "+$("#sgC").value);}
    L.push("---","");
    if(dyn){L.push("## Contexto","!`gh pr view $0 --json title,body,author`","!`gh pr diff $0 --name-only`","");}
    L.push("## Instrucciones","1. Lee el diff completo del PR "+(a?"$0":"indicado")+".","2. Compáralo con las convenciones de CLAUDE.md.","3. Reporta: bugs, riesgos y sugerencias, cada uno con archivo:línea.","4. Termina con un veredicto: aprobar, cambios menores o bloquear.");
    if($("#sgC").value)L.push("","Devuelve solo el reporte final: el subagente no ve la conversación.");
    setCode($("#sgOut"),L.join("\n"));$("#sgPath").innerHTML=" Guárdalo en <code>"+($("#sgL").value==="p"?".claude/skills/":"~/.claude/skills/")+n+"/SKILL.md</code> · invócala con <code>/"+n+(a?" "+esc(a):"")+"</code>";}
  ["#sgN","#sgD","#sgI","#sgA","#sgT","#sgC","#sgL"].forEach(s=>{on($(s),"input",sg);on($(s),"change",sg);});sg();
  /* qué uso */
  const WU=[["Usamos pnpm, no npm","CLAUDE.md","Es un hecho que aplica a cada sesión y es corto. Una línea en CLAUDE.md."],["Formatear siempre tras editar","Hook","\"Siempre\" = determinista. Un hook PostToolUse no depende de que Claude se acuerde."],["Nuestro proceso de release en 12 pasos","Skill","Procedimiento largo que se usa de vez en cuando: solo pagas contexto cuando lo invocas. Con disable-model-invocation, porque publica."],["Investigar cómo funciona el módulo de pagos","Subagente","Va a leer decenas de archivos: que lo haga en su propio contexto y te devuelva el resumen."],["Leer y crear tickets en Jira","MCP","Conectar con un sistema externo es trabajo de un servidor MCP."],["Reglas de estilo solo para src/api/","Regla con paths","Un archivo en .claude/rules/ con paths: src/api/** se carga solo cuando Claude toca esos archivos."],["Que nunca lea .env","Regla deny en settings","Permisos: deny Read(./.env). Para máxima seguridad, súmale el sandbox."],["Compartir todo lo anterior con 5 repos","Plugin","Empaqueta skills, hooks, agentes y MCP en un plugin y distribúyelo con un marketplace."]];
  $("#wuChips").innerHTML=WU.map((w,i)=>'<button class="chip" data-i="'+i+'">'+esc(w[0])+'</button>').join("");
  on($("#wuChips"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;$$("#wuChips .chip").forEach(x=>x.classList.toggle("on",x===b));const w=WU[+b.dataset.i];$("#wuOut").innerHTML="<b>→ "+esc(w[1])+"</b><br>"+esc(w[2]);});
  $("#wuOut").textContent="Elige una situación.";
})();}catch(e){console.warn("[guía]",e);}

/* =================== SETTINGS =================== */
const SET_KEYS=[
["model","Modelo","Cualquiera","Modelo con que arrancan las sesiones nuevas (alias o ID).","\"model\": \"opus\""],
["effortLevel","Modelo","Cualquiera","Esfuerzo por defecto: low, medium, high, xhigh.","\"effortLevel\": \"high\""],
["maxEffortLevel","Modelo","Cualquiera","Tope de esfuerzo; el más bajo de cualquier scope gana.","\"maxEffortLevel\": \"high\""],
["modelSettings","Modelo","Cualquiera","Por modelo: effortLevel, maxEffortLevel, autoCompactWindow.","\"modelSettings\": {\"opus\": {\"effortLevel\": \"xhigh\"}}"],
["availableModels","Modelo","Cualquiera","Restringe los modelos elegibles (managed lo impone tal cual).","\"availableModels\": [\"sonnet\", \"haiku\"]"],
["fallbackModel","Modelo","Cualquiera","Modelos de respaldo, en orden, si el principal está saturado.","\"fallbackModel\": [\"sonnet\", \"haiku\"]"],
["fastMode","Modelo","Cualquiera","Activa fast mode donde esté disponible.","\"fastMode\": true"],
["advisorModel","Modelo","Cualquiera","Modelo de la herramienta advisor.","\"advisorModel\": \"opus\""],
["alwaysThinkingEnabled","Modelo","Cualquiera","false apaga extended thinking.","\"alwaysThinkingEnabled\": false"],
["language","Modelo","Cualquiera","Idioma de las respuestas.","\"language\": \"español\""],
["outputStyle","Modelo","Cualquiera","Rol, tono y formato de Claude.","\"outputStyle\": \"Explanatory\""],
["permissions.allow","Permisos","Cualquiera (espera confianza en el repo)","Usos aprobados sin prompt.","\"allow\": [\"Bash(npm run test *)\"]"],
["permissions.ask","Permisos","Cualquiera","Usos que siempre preguntan.","\"ask\": [\"Bash(git push *)\"]"],
["permissions.deny","Permisos","Cualquiera","Usos bloqueados, incluso en bypass.","\"deny\": [\"Read(./.env)\"]"],
["permissions.defaultMode","Permisos","Cualquiera (auto/bypass: solo usuario o managed)","Modo con que arrancan las sesiones.","\"defaultMode\": \"acceptEdits\""],
["permissions.additionalDirectories","Permisos","Cualquiera","Directorios extra con acceso a archivos.","\"additionalDirectories\": [\"../libs\"]"],
["permissions.blockReadsOutsideWorkingDirectories","Permisos","Cualquiera (true gana siempre)","Las herramientas de archivo no leen fuera de los directorios de trabajo.","\"blockReadsOutsideWorkingDirectories\": true"],
["permissions.disableBypassPermissionsMode","Permisos","Cualquiera","Impide entrar a bypassPermissions.","\"disableBypassPermissionsMode\": \"disable\""],
["disableAutoMode","Permisos","Cualquiera","Quita el modo auto del ciclo.","\"disableAutoMode\": true"],
["autoMode","Permisos","Usuario/managed","Reglas propias para el clasificador del modo auto (environment, allow, deny).","\"autoMode\": {\"environment\": [\"…\"]}"],
["allowManagedPermissionRulesOnly","Permisos","Managed","Solo valen las reglas de permisos managed.","\"allowManagedPermissionRulesOnly\": true"],
["hooks","Hooks","Cualquiera","Comandos en puntos del ciclo de vida.","\"hooks\": {\"PostToolUse\": […]}"],
["disableAllHooks","Hooks","Cualquiera","Apaga hooks, status line y comando de sugerencia de archivos (no los managed).","\"disableAllHooks\": true"],
["allowManagedHooksOnly","Hooks","Managed","Solo corren hooks de la organización.","\"allowManagedHooksOnly\": true"],
["allowedHttpHookUrls","Hooks","Cualquiera","Limita a qué URLs pueden apuntar los hooks http.","\"allowedHttpHookUrls\": [\"https://audit.miempresa.com/*\"]"],
["autoMemoryEnabled","Memoria y contexto","Cualquiera","Activa o apaga la memoria automática.","\"autoMemoryEnabled\": false"],
["claudeMdExcludes","Memoria y contexto","Cualquiera","Salta CLAUDE.md específicos (útil en monorepos).","\"claudeMdExcludes\": [\"packages/legacy/**\"]"],
["autoCompactEnabled","Memoria y contexto","Cualquiera","Autocompactación on/off.","\"autoCompactEnabled\": true"],
["autoCompactWindow","Memoria y contexto","Cualquiera","Qué tan lleno el contexto antes de compactar (número o auto).","\"autoCompactWindow\": 500000"],
["plansDirectory","Memoria y contexto","Cualquiera","Dónde escribe los planes el modo plan.","\"plansDirectory\": \"docs/plans\""],
["fileCheckpointingEnabled","Memoria y contexto","Cualquiera","Snapshots de archivos para /rewind.","\"fileCheckpointingEnabled\": true"],
["env","Memoria y contexto","Cualquiera (espera confianza)","Variables de entorno para la sesión y subprocesos.","\"env\": {\"NODE_ENV\": \"development\"}"],
["skillOverrides","Skills y plugins","Cualquiera","Oculta o colapsa skills: on, name-only, user-invocable-only, off.","\"skillOverrides\": {\"deploy\": \"off\"}"],
["disableBundledSkills","Skills y plugins","Cualquiera","Apaga las skills incluidas.","\"disableBundledSkills\": true"],
["disableSkillShellExecution","Skills y plugins","Cualquiera","Desactiva !`comandos` en skills.","\"disableSkillShellExecution\": true"],
["enabledPlugins","Skills y plugins","Cualquiera","Plugins activos por scope.","\"enabledPlugins\": {\"code-review@claude-plugins-official\": true}"],
["extraKnownMarketplaces","Skills y plugins","Cualquiera (espera confianza)","Registra marketplaces para el repo u org.","\"extraKnownMarketplaces\": {\"mi-org\": {\"source\": {\"source\": \"github\", \"repo\": \"mi-org/plugins\"}}}"],
["strictKnownMarketplaces","Skills y plugins","Managed","Allowlist de marketplaces.","\"strictKnownMarketplaces\": […]"],
["enableAllProjectMcpServers","MCP","Cualquiera","Aprueba todos los servidores de .mcp.json sin preguntar.","\"enableAllProjectMcpServers\": true"],
["enabledMcpjsonServers","MCP","Cualquiera","Aprueba servidores específicos de .mcp.json.","\"enabledMcpjsonServers\": [\"github\"]"],
["deniedMcpServers","MCP","Cualquiera","Bloquea servidores por nombre, URL o comando.","\"deniedMcpServers\": [{\"serverName\": \"filesystem\"}]"],
["allowedMcpServers","MCP","Cualquiera","Allowlist de servidores que se pueden agregar.","\"allowedMcpServers\": [{\"serverName\": \"github\"}]"],
["disableClaudeAiConnectors","MCP","Cualquiera (true gana siempre)","No trae los conectores de claude.ai.","\"disableClaudeAiConnectors\": true"],
["sandbox.enabled","Sandbox","Cualquiera","Sandbox de Bash en macOS, Linux y WSL2.","\"sandbox\": {\"enabled\": true}"],
["sandbox.autoAllowBashIfSandboxed","Sandbox","Cualquiera","Los comandos en sandbox no piden permiso.","\"autoAllowBashIfSandboxed\": true"],
["sandbox.excludedCommands","Sandbox","Cualquiera","Comandos que corren fuera del sandbox.","\"excludedCommands\": [\"docker\"]"],
["sandbox.filesystem.denyRead","Sandbox","Cualquiera","Rutas que nada en el sandbox puede leer.","\"denyRead\": [\"~/.aws\"]"],
["sandbox.network.allowedDomains","Sandbox","Cualquiera","Dominios permitidos en red.","\"allowedDomains\": [\"registry.npmjs.org\"]"],
["sandbox.failIfUnavailable","Sandbox","Cualquiera","No arranca si el sandbox no puede correr.","\"failIfUnavailable\": true"],
["theme","Interfaz","Cualquiera","Tema de color.","\"theme\": \"dark\""],
["tui","Interfaz","Cualquiera","Renderizador: fullscreen o clásico.","\"tui\": \"fullscreen\""],
["viewMode","Interfaz","Cualquiera","Vista inicial: default, verbose, focus.","\"viewMode\": \"focus\""],
["editorMode","Interfaz","Cualquiera","Atajos Vim en el prompt.","\"editorMode\": \"vim\""],
["statusLine","Interfaz","Cualquiera","Comando para la línea de estado.","\"statusLine\": {\"type\": \"command\", \"command\": \"~/.claude/statusline.sh\"}"],
["spinnerTipsEnabled","Interfaz","Cualquiera","Tips bajo el spinner.","\"spinnerTipsEnabled\": false"],
["respectGitignore","Interfaz","Cualquiera","Excluye archivos gitignored del selector @.","\"respectGitignore\": true"],
["defaultShell","Interfaz","Cualquiera","Shell para comandos ! (bash o powershell).","\"defaultShell\": \"powershell\""],
["prefersReducedMotion","Interfaz","Cualquiera","Reduce animaciones.","\"prefersReducedMotion\": true"],
["companyAnnouncements","Interfaz","Cualquiera","Anuncios al iniciar.","\"companyAnnouncements\": [\"Lee CONTRIBUTING.md\"]"],
["apiKeyHelper","Autenticación","Cualquiera","Script que genera la credencial de API.","\"apiKeyHelper\": \"~/bin/get-key.sh\""],
["forceLoginMethod","Autenticación","Cualquiera","Restringe el método de login.","\"forceLoginMethod\": \"claudeai\""],
["forceLoginOrgUUID","Autenticación","Cualquiera (se impone desde managed)","Fija el login a una organización.","\"forceLoginOrgUUID\": \"…\""],
["attribution","Git","Cualquiera","Personaliza u oculta la atribución en commits y PRs.","\"attribution\": {\"commit\": \"\", \"pr\": \"\"}"],
["includeGitInstructions","Git","Cualquiera","false quita las instrucciones integradas de commits y PRs.","\"includeGitInstructions\": false"],
["prUrlTemplate","Git","Cualquiera","Apunta los links de PR a tu herramienta interna.","\"prUrlTemplate\": \"https://review.miempresa.com/{number}\""],
["worktree.baseRef","Sesiones","Cualquiera","Ramifica los worktrees desde el default remoto o el HEAD local.","\"worktree\": {\"baseRef\": \"origin/main\"}"],
["worktree.symlinkDirectories","Sesiones","Cualquiera","Enlaza carpetas grandes en vez de copiarlas.","\"symlinkDirectories\": [\"node_modules\"]"],
["cleanupPeriodDays","Sesiones","Cualquiera","Días que se guardan los transcripts.","\"cleanupPeriodDays\": 60"],
["agent","Sesiones","Cualquiera","Arranca las sesiones como un subagente.","\"agent\": \"revisor\""],
["teammateMode","Sesiones","Cualquiera","Cómo se ven los compañeros de agent team.","\"teammateMode\": \"tmux\""],
["remoteControlAtStartup","Sesiones","Cualquiera","Conecta Remote Control al iniciar.","\"remoteControlAtStartup\": true"],
["skipDangerousModePermissionPrompt","Permisos","Usuario/local/managed","Salta la confirmación de bypass.","\"skipDangerousModePermissionPrompt\": true"],
["requiredMinimumVersion","Organización","Managed","No arranca fuera del rango de versiones.","\"requiredMinimumVersion\": \"2.1.300\""],
["strictPluginOnlyCustomization","Organización","Managed","Bloquea skills, agentes, hooks y MCP que no vengan de plugins.","\"strictPluginOnlyCustomization\": {…}"],
["claudeMd","Organización","Managed","Instrucciones CLAUDE.md para toda la organización.","\"claudeMd\": \"Nunca subas secretos…\""],
["disableSideloadFlags","Organización","Managed","Rechaza flags que cargan plugins, agentes o MCP por CLI.","\"disableSideloadFlags\": true"]
];
try{(function(){if(!document.getElementById("v-settings"))return; // módulo de la vista settings
  if(!$("#v-settings"))return;
  /* mapa de alcance */
  const SF=[["user","~/.claude/settings.json"],["proj","acme-app/.claude/settings.json"],["local","acme-app/.claude/settings.local.json"],["man","Managed settings"]];
  const BOX=[["Tu máquina",[["website/","m1"],["api/","m2"],["acme-app/","m3"]]],["Máquina de un compañero",[["acme-app/","t3"]]],["Sesión en la nube",[["acme-app/","c3"]]]];
  const REACH={user:{on:["m1","m2","m3"],dash:[],t:"Todos los proyectos de tu máquina, y nada en la de tu compañero ni en la nube."},proj:{on:["m3"],dash:["t3","c3"],t:"Tu acme-app. Llega al compañero y a la nube solo si lo commiteas (punteado); hasta entonces es un archivo más en tu disco."},local:{on:["m3"],dash:[],t:"Solo tu acme-app. Claude Code lo agrega a tus exclusiones globales de git la primera vez que lo escribe."},man:{on:["m1","m2","m3","t3"],dash:["c3"],t:"Todos los proyectos en todas las máquinas donde tu organización lo despliega. A la nube llegan solo los managed servidos desde la consola de claude.ai."}};
  $("#scFiles").innerHTML=SF.map((f,i)=>'<button class="chip'+(i?'':' on')+'" data-f="'+f[0]+'"><code style="background:none;border:none;padding:0">'+esc(f[1])+'</code></button>').join("");
  $("#scMap").innerHTML=BOX.map(b=>'<div class="scb"><div class="scbt">'+b[0]+'</div>'+b[1].map(p=>'<div class="scp" data-p="'+p[1]+'"> '+p[0]+'</div>').join("")+'</div>').join("");
  function sc(f){const r=REACH[f];$$("#scMap .scp").forEach(p=>{p.classList.toggle("on",r.on.includes(p.dataset.p));p.classList.toggle("dash",r.dash.includes(p.dataset.p));});$("#scTxt").textContent=r.t;}
  on($("#scFiles"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;$$("#scFiles .chip").forEach(x=>x.classList.toggle("on",x===b));sc(b.dataset.f);});sc("user");
  /* precedencia */
  const PL=[["Managed","Organización: MDM, managed-settings.json, consola","man"],["Línea de comandos","--settings para esta sesión","cli"],["Proyecto local",".claude/settings.local.json","loc"],["Proyecto compartido",".claude/settings.json","prj"],["Usuario","~/.claude/settings.json","usr"]];
  const pv={man:null,cli:null,loc:null,prj:true,usr:false};const PV0=Object.assign({},pv);
  function pr(){$("#prStack").innerHTML=PL.map((l,i)=>'<div class="prl" data-k="'+l[2]+'"><div class="prn"><b>'+(i+1)+' · '+l[0]+'</b><small>'+esc(l[1])+'</small></div><div class="toggle">'+[["—",null],["true",true],["false",false]].map(o=>'<button data-v="'+o[0]+'"'+(pv[l[2]]===o[1]?' class="on"':'')+'>'+o[0]+'</button>').join("")+'</div></div>').join("");
    const w=PL.find(l=>pv[l[2]]!==null);$$("#prStack .prl").forEach(r=>r.classList.toggle("win",w&&r.dataset.k===w[2]));
    $("#prRes").innerHTML=w?'Resultado: <code>spinnerTipsEnabled = '+pv[w[2]]+'</code> → los tips '+(pv[w[2]]?'<b>se muestran</b>':'<b>se ocultan</b>')+'. Gana <b>'+w[0]+'</b> por ser el nivel más alto que define la clave.'+(w[2]==="man"?' Nada por debajo puede cambiarlo: pídelo a tu admin.':w[2]==="prj"&&pv.usr!==null?' Tu valor de usuario queda tapado: para recuperarlo en este proyecto ponlo en settings.local.json.':w[2]==="cli"?' Dura solo esta sesión.':''):'Nadie define la clave: se usa el valor por defecto (tips activados).';}
  on($("#prStack"),"click",e=>{const b=e.target.closest("button[data-v]");if(!b)return;const k=b.closest(".prl").dataset.k;pv[k]={"—":null,"true":true,"false":false}[b.dataset.v];pr();});
  on($("#prReset"),"click",()=>{Object.assign(pv,PV0);pr();});pr();
  /* fusión */
  const MG=[["~/.claude/settings.json",["Bash(git status)","Bash(git diff *)"]],[".claude/settings.json",["Bash(npm run test *)","Bash(npm run lint)"]],[".claude/settings.local.json",["Bash(docker compose up *)"]]];
  $("#mgBox").innerHTML='<div class="mgsrc">'+MG.map(m=>'<div class="mgc"><div class="scbt">'+esc(m[0])+'</div>'+m[1].map(r=>'<code>'+esc(r)+'</code>').join("")+'</div>').join("")+'</div><div class="mgarr">⟶ fusión ⟶</div><div class="mgc res"><div class="scbt">permissions.allow efectivo</div>'+MG.flatMap(m=>m[1]).map(r=>'<code>'+esc(r)+'</code>').join("")+'</div>';
  /* cómo cambiar */
  const CH=[["/config","Abre el panel de opciones personales (tema, modo editor, verbose…) y guarda por ti, casi siempre en ~/.claude/settings.json. Directo sin panel:","/config theme=dark verbose=true","No muestra todas las claves: es un subconjunto. No existe en VS Code ni en la app de escritorio."],["Editar el archivo","Abre el settings del scope que quieres y agrega la clave. Los cambios se recargan solos.","{\n  \"$schema\": \"https://json.schemastore.org/claude-code-settings.json\",\n  \"permissions\": {\n    \"allow\": [\"Bash(npm run lint)\", \"Bash(npm run test *)\"],\n    \"deny\": [\"Read(./.env)\", \"Read(./.env.*)\"]\n  }\n}","Tras guardar, /status confirma que el archivo cargó."],["--settings","Pasa JSON (o la ruta a un archivo) solo para una sesión. Queda por encima de usuario, proyecto y local, por debajo de managed. No escribe a ningún archivo.","claude --settings '{\"model\": \"opus\", \"spinnerTipsEnabled\": false}'","Puede setear cualquier clave de usuario; no claves Managed ni Global config."],["Flag o variable","Algunas claves tienen flag (--model, --effort) o variable de entorno (ANTHROPIC_MODEL). Quién gana entre variable y archivo se decide por cada par, no por niveles.","ANTHROPIC_MODEL=sonnet claude\nclaude --model opus --effort high","/model guarda como default; en su selector, la tecla s cambia solo para esta sesión."]];
  tabs($("#chTabs"),CH.map(c=>c[0]),i=>{const c=CH[i];$("#chBody").innerHTML='<p class="pn">'+esc(c[1])+'</p>'+codeBlock(c[0],c[2])+'<p class="pn">'+esc(c[3])+'</p>';});
  /* explorador */
  const SC=[...new Set(SET_KEYS.map(k=>k[1]))];let skc="all";
  $("#skCats").innerHTML='<button class="chip on" data-c="all">Todas ('+SET_KEYS.length+')</button>'+SC.map(c=>'<button class="chip" data-c="'+c+'">'+c+'</button>').join("");
  on($("#skCats"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;skc=b.dataset.c;$$("#skCats .chip").forEach(x=>x.classList.toggle("on",x===b));skr();});
  function skr(){const q=$("#skQ").value.toLowerCase();const r=SET_KEYS.filter(k=>(skc==="all"||k[1]===skc)&&(!q||k.join(" ").toLowerCase().includes(q)));
    $("#skList").innerHTML=r.length?r.map(k=>'<details class="skr"><summary><code class="cn">'+esc(k[0])+'</code><span class="badge">'+esc(k[1])+'</span><span class="skd">'+esc(k[3])+'</span></summary><div class="skb"><div><span class="cdl">Scope</span> '+esc(k[2])+'</div><div class="exl"><code>'+esc(k[4])+'</code><button class="copy mini-copy" data-txt="'+esc(k[4])+'">copiar</button></div></div></details>').join(""):'<p class="pn">Sin resultados.</p>';}
  on($("#skQ"),"input",skr);skr();
  /* constructor */
  const SBF=[["model","sel","Modelo por defecto",[["","(sin definir)"],["sonnet","sonnet"],["opus","opus"],["haiku","haiku"]]],["mode","sel","Modo inicial",[["","(por defecto)"],["acceptEdits","acceptEdits"],["plan","plan"]]],["lang","sel","Idioma de respuestas",[["","(sin definir)"],["español","español"],["English","English"]]],
    ["a_test","chk","Permitir npm run test/lint sin preguntar",true],["a_git","chk","Permitir git status/diff/log",true],["d_env","chk","Bloquear lectura de .env y secrets/",true],["k_push","chk","Preguntar siempre antes de git push",true],["h_fmt","chk","Hook: Prettier tras cada edición",false],["sbx","chk","Activar sandbox de Bash",false],["tips","chk","Ocultar tips del spinner",false],["attr","chk","Quitar atribución de Claude en commits/PR",false],["mem","chk","Desactivar memoria automática",false]];
  $("#sbForm").innerHTML=SBF.map(f=>f[1]==="sel"?'<label>'+f[2]+'</label><select data-sb="'+f[0]+'">'+f[3].map(o=>'<option value="'+o[0]+'">'+o[1]+'</option>').join("")+'</select>':'<label class="chk"><input type="checkbox" data-sb="'+f[0]+'"'+(f[3]?' checked':'')+'> '+esc(f[2])+'</label>').join("")+'<label>Para</label><select data-sb="scope"><option value="proj">El equipo (.claude/settings.json)</option><option value="user">Mí, global (~/.claude/settings.json)</option><option value="local">Mí, este proyecto (.claude/settings.local.json)</option></select>';
  function sbuild(){const v={};$$("[data-sb]").forEach(i=>v[i.dataset.sb]=i.type==="checkbox"?i.checked:i.value);const o={"$schema":"https://json.schemastore.org/claude-code-settings.json"};
    if(v.model)o.model=v.model;if(v.lang)o.language=v.lang;
    const p={};const al=[],dn=[],ak=[];if(v.a_test)al.push("Bash(npm run test *)","Bash(npm run lint)");if(v.a_git)al.push("Bash(git status)","Bash(git diff *)","Bash(git log *)");if(v.d_env)dn.push("Read(./.env)","Read(./.env.*)","Read(./secrets/**)");if(v.k_push)ak.push("Bash(git push *)");
    if(al.length)p.allow=al;if(ak.length)p.ask=ak;if(dn.length)p.deny=dn;if(v.mode)p.defaultMode=v.mode;if(Object.keys(p).length)o.permissions=p;
    if(v.h_fmt)o.hooks={PostToolUse:[{matcher:"Edit|Write",hooks:[{type:"command",command:"jq -r '.tool_input.file_path' | xargs npx prettier --write"}]}]};
    if(v.sbx)o.sandbox={enabled:true,autoAllowBashIfSandboxed:true};if(v.tips)o.spinnerTipsEnabled=false;if(v.attr)o.attribution={commit:"",pr:""};if(v.mem)o.autoMemoryEnabled=false;
    setCode($("#sbJson"),JSON.stringify(o,null,2));
    const w={proj:" .claude/settings.json — commitéalo. Las reglas allow y el env esperan a que cada compañero confíe en la carpeta; deny y ask aplican de inmediato.",user:" ~/.claude/settings.json — aplica a todos tus proyectos en esta máquina.",local:" .claude/settings.local.json — solo tú, este proyecto. Asegúrate de que esté en .gitignore si lo creas a mano."}[v.scope];
    $("#sbWhere").textContent=w+(v.scope!=="user"&&v.mode==="auto"?" ⚠ auto no aplica desde archivos de proyecto.":"");}
  on($("#sbForm"),"input",sbuild);on($("#sbForm"),"change",sbuild);sbuild();
  /* ejemplos */
  const EX=[["Personal",{"$schema":"https://json.schemastore.org/claude-code-settings.json",model:"opus",effortLevel:"high",language:"español",theme:"dark",spinnerTipsEnabled:false,permissions:{allow:["Bash(git status)","Bash(git diff *)","Bash(git log *)"],deny:["Read(~/.ssh/**)","Read(~/.aws/**)"]},hooks:{Notification:[{matcher:"",hooks:[{type:"command",command:"osascript -e 'display notification \"Claude Code te necesita\"'"}]}]}},["~/.claude/settings.json","Tus preferencias en todos los proyectos: modelo, idioma, tema.","Deny de tus credenciales personales en cualquier repo.","Notificación de escritorio cuando Claude espera."]],
   ["Equipo",{"$schema":"https://json.schemastore.org/claude-code-settings.json",permissions:{allow:["Bash(pnpm test *)","Bash(pnpm lint)","Bash(pnpm build)"],ask:["Bash(git push *)"],deny:["Read(./.env)","Read(./.env.*)","Edit(./migrations/**)"]},env:{NODE_ENV:"development"},hooks:{PostToolUse:[{matcher:"Edit|Write",hooks:[{type:"command",command:"jq -r '.tool_input.file_path' | xargs pnpm prettier --write"}]}]},enabledPlugins:{"code-review@claude-plugins-official":true}},[".claude/settings.json, commiteado","Comandos del proyecto sin prompts.","Push siempre pregunta; .env y migraciones protegidas.","Formato automático y un plugin para todo el equipo."]],
   ["Organización",{permissions:{deny:["Bash(curl *)","Read(**/.env)","WebFetch(domain:pastebin.com)"],disableBypassPermissionsMode:"disable"},allowManagedHooksOnly:true,allowManagedPermissionRulesOnly:false,sandbox:{enabled:true,failIfUnavailable:true,network:{allowManagedDomainsOnly:true,allowedDomains:["github.com","registry.npmjs.org"]}},strictKnownMarketplaces:[{source:"github",repo:"acme/claude-plugins"}],requiredMinimumVersion:"2.1.300",cleanupPeriodDays:30,companyAnnouncements:["Usa solo plugins del marketplace interno"]},["managed-settings.json o consola de claude.ai","Nadie puede sobreescribir estas claves.","Sin bypass, solo hooks y marketplaces aprobados.","Sandbox obligatorio con red restringida."]]];
  tabs($("#exTabs"),EX.map(e=>e[0]),i=>{setCode($("#exJson"),JSON.stringify(EX[i][1],null,2));$("#exNotes").innerHTML='<div class="cdl">'+esc(EX[i][2][0])+'</div><ul class="pts">'+EX[i][2].slice(1).map(n=>'<li>'+esc(n)+'</li>').join("")+'</ul>';});
  /* diagnóstico */
  const DT={s:["¿El archivo aparece en /status → Setting sources?",[["No","nf"],["Sí","y1"]]],nf:["¿El JSON es válido? (sin comentarios, sin comas finales)",[["No estoy seguro","fix"],["Sí","loc"]]],fix:["→ Corre claude doctor: te dice qué archivo y qué entrada falló. Un Settings Error descarta el archivo entero; un Warning solo la entrada.",[]],loc:["→ Revisa la ruta: el settings del proyecto se lee desde el directorio donde arrancaste (o la raíz del repo para el local). Si arrancaste en una subcarpeta, arranca en la raíz.",[]],y1:["¿La clave la define también un nivel más alto (managed, --settings, local sobre proyecto)?",[["Sí o no sé","hi"],["No","y2"]]],hi:["→ Gana el nivel más alto. Si es managed, nada lo sobreescribe: habla con tu admin. Si es el settings del equipo, pon tu valor en settings.local.json.",[]],y2:["¿Es una clave de permisos, env o marketplace en el archivo commiteado?",[["Sí","tr"],["No","y3"]]],tr:["→ allow, additionalDirectories, env y extraKnownMarketplaces del repo esperan a que confíes en la carpeta. deny y ask aplican de inmediato. Si allow sigue preguntando, revisa si hay un ask en otro archivo: ask gana sobre allow.",[]],y3:["¿Es model, effortLevel o defaultMode?",[["Sí","st"],["No","y4"]]],st:["→ model y effort se leen al iniciar: usa /model o /effort, o reinicia. defaultMode auto o bypassPermissions no aplica desde proyecto/local: ponlo en ~/.claude/settings.json.",[]],y4:["→ Revisa el Scope de la clave en la referencia: claves 'Usuario o managed' se ignoran en el repo. También puede haber una variable de entorno que gane (ANTHROPIC_MODEL sobre model). Último recurso: claude --safe-mode para descartar personalizaciones.",[]]};
  function dt(k){const n=DT[k];$("#dtBox").innerHTML='<p class="dtq">'+esc(n[0])+'</p><div class="chips">'+n[1].map(o=>'<button class="chip" data-g="'+o[1]+'">'+esc(o[0])+'</button>').join("")+'</div>';}
  on($("#dtBox"),"click",e=>{const b=e.target.closest("[data-g]");if(b)dt(b.dataset.g);});on($("#dtReset"),"click",()=>dt("s"));dt("s");
})();}catch(e){console.warn("[guía]",e);}

/* =================== GLOSARIO =================== */
const GLOSS=[
["Agent SDK","Biblioteca (Python/TypeScript) para construir tus propios agentes con el mismo motor de Claude Code.","arquitecto"],
["Agent team","Varias sesiones de Claude que colaboran con un líder y se mandan mensajes.","arquitecto"],
["Agent view","Panel (claude agents) para ver y despachar sesiones en segundo plano.","arquitecto"],
["acceptEdits","Modo de permiso que aprueba ediciones de archivos sin preguntar, pero sigue preguntando por comandos.","intermedio"],
["additionalContext","Campo de salida de un hook que inyecta texto en el contexto de Claude.","hooks"],
["Auto mode","Modo por defecto en la terminal: un clasificador aprueba acciones seguras y bloquea las riesgosas.","intermedio"],
["Auto memory","Notas que Claude escribe solo en MEMORY.md por proyecto para recordar entre sesiones.","intermedio"],
["Background agent","Sesión que sigue trabajando sin terminal: /background, --bg o claude agents.","arquitecto"],
["Bare mode","claude --bare: arranque mínimo sin hooks, skills, MCP ni CLAUDE.md, para scripts.","avanzado"],
["bypassPermissions","Modo que no pide ningún permiso. Solo en contenedores o VMs aisladas.","intermedio"],
["Checkpoint","Punto de restauración automático antes de cada edición; se usa con /rewind.","intermedio"],
["CLAUDE.md","Archivo de instrucciones que Claude lee al iniciar: comandos, convenciones, arquitectura.","intermedio"],
["Compactación","Resumir la conversación para liberar contexto, automática o con /compact.","intermedio"],
["Contexto (ventana de)","Todo lo que el modelo 've' en un momento: conversación, archivos leídos, herramientas. Es el recurso más escaso.","basico"],
["context: fork","Campo de skill que la ejecuta dentro de un subagente aislado.","skills"],
["dontAsk","Modo que deniega todo lo que pediría permiso; útil en CI.","intermedio"],
["Effort","Cuánto razona el modelo: low, medium, high, xhigh, max. /effort o --effort.","intermedio"],
["Exit code 2","En un hook de comando: bloquear la acción; stderr explica por qué.","hooks"],
["Fast mode","Salida más rápida a mayor costo en modelos que lo soportan (/fast).","intermedio"],
["Frontmatter","Bloque YAML entre --- al inicio de un SKILL.md o un agente, con su configuración.","skills"],
["Goal","/goal: condición que Claude persigue turno tras turno hasta cumplirla.","arquitecto"],
["Headless","Uso no interactivo con claude -p, para scripts y CI.","avanzado"],
["Hook","Comando o handler que se ejecuta automáticamente en un evento del ciclo de vida.","hooks"],
["Managed settings","Settings que impone la organización y nadie puede sobreescribir.","settings"],
["Matcher","Filtro de un hook: qué herramienta u origen lo dispara.","hooks"],
["MCP","Model Context Protocol: estándar para conectar Claude con herramientas y datos externos.","avanzado"],
["Modo plan","Claude investiga y propone un plan sin editar nada hasta que apruebes.","basico"],
["Output style","Cambia rol, tono y formato de Claude: Explanatory, Learning, Concise…","intermedio"],
["Permission mode","Cuánta autonomía tiene Claude: Manual, acceptEdits, plan, auto, dontAsk, bypass.","intermedio"],
["Plugin","Paquete que distribuye skills, agentes, hooks y servidores MCP juntos.","arquitecto"],
["Marketplace","Catálogo de plugins (un repo git) que se agrega con /plugin marketplace add.","arquitecto"],
["PreToolUse","Evento de hook antes de ejecutar una herramienta; puede bloquearla incluso en bypass.","hooks"],
["Prompt caching","Reutilizar el prefijo de la conversación entre requests para bajar costo y latencia.","avanzado"],
["Regla (allow/ask/deny)","Permiso fino con sintaxis Herramienta(especificador). Orden: deny, ask, allow.","intermedio"],
["Remote Control","Controlar una sesión local desde claude.ai o la app del teléfono.","arquitecto"],
["Sandbox","Aislamiento de sistema de archivos y red para los comandos Bash (Seatbelt o bubblewrap).","avanzado"],
["Scope","A quién aplica un archivo de settings o servidor MCP: usuario, proyecto, local, managed.","settings"],
["Settings precedence","Orden en que gana una clave: managed > línea de comandos > local > proyecto > usuario.","settings"],
["Skill","Carpeta con SKILL.md que Claude carga cuando la necesita o que invocas con /nombre.","skills"],
["Slash command","Lo que escribes con / al inicio: controla la sesión o invoca una skill.","comandos"],
["Subagente","Instancia de Claude con su propio contexto que hace una tarea y devuelve un resumen.","avanzado"],
["Teleport","Traer una sesión de la nube a tu terminal (--teleport, /teleport).","arquitecto"],
["Tool search","Carga diferida de herramientas MCP: solo se cargan las definiciones que hacen falta.","avanzado"],
["Turno","Un ciclo de tu mensaje más todo lo que Claude hace hasta responder.","basico"],
["ultrathink","Palabra en el prompt que pide máximo razonamiento para ese turno.","intermedio"],
["Worktree","Checkout aislado de git para que varias sesiones trabajen sin pisarse (claude -w).","arquitecto"],
["$ARGUMENTS","Placeholder de una skill que se reemplaza por lo que escribes tras el comando.","skills"],
["!`comando`","En una skill: ejecuta el comando antes y pega su salida (contexto dinámico).","skills"]
].sort((a,b)=>a[0].replace(/[^A-Za-z]/g,"").localeCompare(b[0].replace(/[^A-Za-z]/g,""),"es"));
try{(function(){if(!document.getElementById("v-glosario"))return; // módulo de la vista glosario
  if(!$("#v-glosario"))return;
  const LBL={basico:"Básico",intermedio:"Intermedio",avanzado:"Avanzado",arquitecto:"Arquitecto",hooks:"Hooks",skills:"Skills",settings:"Settings",comandos:"Comandos"};
  let L="";const first=t=>t.replace(/[^A-Za-z]/g,"")[0].toUpperCase();
  const AZ=[...new Set(GLOSS.map(g=>first(g[0])))];
  $("#glAZ").innerHTML='<button class="chip on" data-l="">Todo</button>'+AZ.map(a=>'<button class="chip" data-l="'+a+'">'+a+'</button>').join("");
  on($("#glAZ"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;L=b.dataset.l;$$("#glAZ .chip").forEach(x=>x.classList.toggle("on",x===b));gl();});
  function gl(){const q=$("#glQ").value.toLowerCase();$("#glList").innerHTML=GLOSS.filter(g=>(!L||first(g[0])===L)&&(!q||(g[0]+" "+g[1]).toLowerCase().includes(q))).map(g=>'<div class="glc"><b>'+esc(g[0])+'</b><p>'+esc(g[1])+'</p><a href="#'+g[2]+'">'+LBL[g[2]]+' →</a></div>').join("")||'<p class="pn">Sin resultados.</p>';}
  on($("#glQ"),"input",gl);gl();
})();}catch(e){console.warn("[guía]",e);}

/* =================== NOVEDADES =================== */
const NEWS=[
["9 nov 2026 · v2.1.321","Modelos","Claude Fable 5.2","Nuevo modelo Fable: más rápido y con precio por token menor que Fable 5.1. En Claude Code arranca en esfuerzo medium. Requiere v2.1.321 o posterior: en versiones anteriores el alias fable sigue dando Fable 5.1. Actualiza con claude update y verifica con claude -v.",0],
["v2.1.321","Seguridad","v2.1.321: reglas deny ahora se aplican a cp y mv","Además de traer Fable 5.2, la versión corrige que algunas reglas deny no se aplicaban a cp/mv. Buena razón para actualizar.",1],
["v2.1.322","Modelos","v2.1.322: fast mode en Vertex","Fast mode disponible también con Google Cloud.",1],
["30 nov 2026","Modelos","Fast mode de Opus 4.8 se retira el 30 de noviembre","Si lo usas con --fallback-model o settings, migra a un modelo actual.",1],
["v2.1.314","Permisos","permissions.blockWritesOutsideWorkingDirectories","Nueva clave que impide escrituras fuera de los directorios de trabajo, complemento de blockReadsOutsideWorkingDirectories (v2.1.314).",1],
["v2.1.311 · v2.1.316","Modelos","ultrathink usa xhigh y nuevas variables","ultrathink pide esfuerzo xhigh (v2.1.311). CLAUDE_CODE_DISABLE_ULTRATHINK lo desactiva y CLAUDE_CODE_SUBAGENT_EFFORT fija el esfuerzo de subagentes (v2.1.316).",1],
["v2.1.312","Hooks","Tope de concurrencia en hooks prompt y agent","Como máximo 24 hooks de tipo prompt o agent en paralelo (v2.1.312).",1],
["v2.1.314 · v2.1.318","Headless","claude -p sale con código 1 si falla al iniciar","Útil para que tu CI detecte errores de arranque (v2.1.314). Campos de expiración de credenciales en auth status (v2.1.318).",1],
["v2.1.307","Revisión","@claude review stop","En GitHub, detiene una revisión en curso (v2.1.307).",1],
["v2.1.309","Checkpoints","/rewind no restaura sed -i","Aclaración: los cambios hechos por comandos Bash, incluido sed -i, no se revierten con /rewind (v2.1.309).",1],
["22 oct 2026","Skills","Agent Skills pasa a la Agentic AI Foundation","Anthropic donó el estándar abierto de Agent Skills a la Agentic AI Foundation (Linux Foundation). El formato SKILL.md es portable entre plataformas compatibles.",0],
["v2.1.304","Permisos","/auto-mode-setup","Redacta entradas autoMode.environment desde tu proyecto para que el clasificador del modo auto entienda tu infraestructura (v2.1.304).",0],
["v2.1.304","Subagentes","Subagentes fork por defecto en -p, SDK, desktop y VS Code","Los subagentes heredan la conversación (fork) por defecto en esas superficies; CLAUDE_CODE_FORK_SUBAGENT=0 vuelve al comportamiento anterior (v2.1.304).",0],
["v2.1.283","Permisos","Modo auto por defecto en terminal y VS Code","Desde v2.1.283 las sesiones interactivas arrancan en modo auto; -p y el SDK siguen en Manual.",0],
["v2.1.283 · v2.1.285","CLI","claude --desktop y /doctor prompt-audit","Abre la app de escritorio en el directorio (v2.1.285) y audita tus CLAUDE.md, reglas y skills (v2.1.283).",0],
["v2.1.284","Modelos","/effort ultracode on|off","Activa o desactiva ultracode conservando el nivel actual (v2.1.284).",0]
];
try{(function(){if(!document.getElementById("v-novedades"))return; // módulo de la vista novedades
  if(!$("#v-novedades"))return;
  const C=[...new Set(NEWS.map(n=>n[1]))];let f="all";
  $("#nvF").innerHTML='<button class="chip on" data-c="all">Todo</button>'+C.map(c=>'<button class="chip" data-c="'+c+'">'+c+'</button>').join("");
  on($("#nvF"),"click",e=>{const b=e.target.closest(".chip");if(!b)return;f=b.dataset.c;$$("#nvF .chip").forEach(x=>x.classList.toggle("on",x===b));nv();});
  function nv(){$("#nvList").innerHTML=NEWS.filter(n=>f==="all"||n[1]===f).map(n=>'<div class="nvi"><div class="nvd">'+esc(n[0])+'</div><div class="nvb"><div><span class="badge">'+esc(n[1])+'</span>'+(n[4]?'<span class="badge exp">comunidad</span>':'')+'</div><h3>'+esc(n[2])+'</h3><p>'+esc(n[3])+'</p></div></div>').join("");}
  nv();
})();}catch(e){console.warn("[guía]",e);}

/* =================== INICIO: ¿por dónde empiezo? =================== */
try{(function(){if(!document.getElementById("v-inicio"))return; // módulo de la vista inicio
  const box=$("#startPick");if(!box)return;
  const Q=[["¿Ya usaste Claude Code?",[["Nunca",0],["Algunas veces",1],["A diario",2]]],["¿Qué quieres lograr ahora?",[["Aprender lo básico",0],["Trabajar más rápido y con menos prompts",1],["Automatizar y conectar herramientas",2],["Estandarizarlo en mi equipo",3]]]];
  const ans=[];
  function r(){const k=ans.length;if(k<Q.length){box.innerHTML='<p class="dtq">'+Q[k][0]+'</p><div class="chips">'+Q[k][1].map(o=>'<button class="chip" data-v="'+o[1]+'">'+o[0]+'</button>').join("")+'</div>';return;}
    const s=Math.max(ans[0],ans[1]);const R=[["basico","Básico","Instalación, el loop agéntico, modo plan y tus primeros prompts que funcionan.","--b"],["intermedio","Intermedio","Permisos, CLAUDE.md, contexto y sesiones. Después mira la sección Comandos.","--i"],["avanzado","Avanzado","Hooks, skills, subagentes y MCP. Complementa con las referencias a fondo.","--a"],["arquitecto","Arquitecto","Plugins, managed settings, CI y trabajo en paralelo. Y Settings a fondo.","--x"]][s];
    box.innerHTML='<p class="dtq">Te recomendamos empezar por <b style="color:var('+R[3]+')">'+R[1]+'</b></p><p class="pn">'+R[2]+'</p><div class="cta" style="margin-top:12px"><a class="btn pri" href="#'+R[0]+'">Ir a '+R[1]+' →</a><button class="btn" data-again>Volver a preguntar</button></div>';}
  on(box,"click",e=>{if(e.target.closest("[data-again]")){ans.length=0;r();return;}const b=e.target.closest("[data-v]");if(b){ans.push(+b.dataset.v);r();}});r();
})();}catch(e){console.warn("[guía]",e);}

/* =================== QUIZZES de referencia =================== */
QZ.hooks=[
 ["¿Qué diferencia hay entre poner 'corre prettier tras editar' en CLAUDE.md y un hook PostToolUse?",["Ninguna","CLAUDE.md es una sugerencia que el modelo puede olvidar; el hook se ejecuta siempre","El hook es más lento","CLAUDE.md es más seguro"],1,"Los hooks los ejecuta Claude Code, no el modelo: son deterministas."],
 ["Tu hook PreToolUse sale con exit 2. ¿Qué pasa?",["Error no bloqueante","La herramienta no corre y Claude recibe tu stderr","Claude Code se cierra","Se pide permiso al usuario"],1,"Exit 2 bloquea en los eventos que pueden bloquear, y stderr es el motivo."],
 ["¿Cómo se interpreta el matcher \"Edit|Write\"?",["Como regex","Como lista exacta de nombres","Coincide con todo","Es inválido"],1,"Solo letras, dígitos, _, - y separadores | o , → lista exacta. Con otros caracteres sería regex."],
 ["Tu hook imprime JSON válido pero no tiene efecto. Causa más probable:",["El JSON es demasiado largo","Tu perfil de shell imprime algo antes del JSON, o el campo está fuera de hookSpecificOutput","Falta reiniciar el computador","Los hooks no aceptan JSON"],1,"Si stdout no empieza con {, se trata como texto. permissionDecision y additionalContext van dentro de hookSpecificOutput."],
 ["¿Un PreToolUse que devuelve deny bloquea en modo bypassPermissions?",["No, bypass salta todo","Sí: PreToolUse corre antes del chequeo de modo","Solo en macOS","Solo si es managed"],1,"Por eso los hooks sirven para políticas que el usuario no puede saltar cambiando de modo."],
 ["Quieres que Claude no termine hasta que pasen los tests. ¿Qué evento usas?",["SessionEnd","Notification","Stop","PostCompact"],2,"Stop con decision: block (o exit 2) hace que Claude siga trabajando. Revisa stop_hook_active para evitar loops."]];
QZ.skills=[
 ["¿Qué parte de una skill está siempre en el contexto?",["Todo el SKILL.md","Solo el nombre y la descripción","Los scripts","Nada"],1,"Carga progresiva: listado siempre, cuerpo al invocarla, archivos de apoyo bajo demanda."],
 ["Tienes una skill /deploy. ¿Qué campo agregas para que Claude nunca la ejecute por su cuenta?",["user-invocable: false","disable-model-invocation: true","context: fork","allowed-tools: none"],1,"disable-model-invocation: true deja la invocación solo en tus manos."],
 ["¿Qué hace la línea !`git diff HEAD` en un SKILL.md?",["Le pide a Claude que corra git diff","Claude Code ejecuta el comando antes y pega la salida en la skill","Es un comentario","Bloquea git"],1,"Es contexto dinámico: Claude recibe el diff real, no una instrucción."],
 ["Invocas /migrar Foo JS TS con arguments: [comp, desde, hacia]. ¿Qué vale $hacia?",["Foo","JS","TS","vacío"],2,"Los argumentos con nombre se asignan por posición."],
 ["¿Para qué sirve context: fork?",["Duplicar la skill","Ejecutar la skill en un subagente aislado","Crear una rama git","Hacer la skill portable"],1,"El subagente no ve la conversación: las instrucciones deben bastarse solas."],
 ["Después de compactar, ¿qué pasa con las skills invocadas?",["Se pierden todas","Se re-adjuntan, hasta 5.000 tokens cada una y 25.000 en total","Se recargan completas","Se convierten en CLAUDE.md"],1,"El presupuesto se llena desde la más reciente; las antiguas pueden quedar fuera."]];
QZ.settings=[
 ["¿Qué nivel gana si la misma clave está en todos?",["Usuario","Proyecto compartido","Managed","Proyecto local"],2,"Orden: managed > línea de comandos > local > proyecto > usuario."],
 ["Tu equipo puso spinnerTipsEnabled: true en .claude/settings.json y tú lo quieres en false solo en ese repo. ¿Dónde lo pones?",["~/.claude/settings.json","El mismo archivo del equipo","~/.claude.json",".claude/settings.local.json"],3,"Local está por encima de proyecto y no se commitea."],
 ["permissions.allow está en usuario y en proyecto. ¿Qué pasa?",["Gana proyecto","Gana usuario","Se combinan ambas listas","Error"],2,"Las listas se fusionan entre archivos."],
 ["Pones defaultMode: \"auto\" en .claude/settings.json y no aplica. ¿Por qué?",["auto no existe","auto y bypassPermissions no se aceptan desde proyecto o local","Falta reiniciar","Hay que usar comillas simples"],1,"Ponlo en ~/.claude/settings.json o usa --permission-mode auto."],
 ["¿Qué comando muestra qué archivos de settings cargaron?",["/config","/status","/context","/memory"],1,"/status → Setting sources. claude doctor muestra los errores de validación."],
 ["¿Qué settings llegan a una sesión en la nube?",["Todos","~/.claude/settings.json","El .claude/settings.json commiteado y los managed de la consola","Ninguno"],2,"Tu archivo de usuario y el local quedan en tu máquina."]];
$$("[data-quiz]").forEach(w=>{
  const l=w.dataset.quiz,qs=QZ[l],box=w.querySelector(".wb");const ans={};
  w.querySelector(".tt").textContent=qs.length+" preguntas · necesitas "+qs.length+"/"+qs.length;
  box.innerHTML=qs.map((q,i)=>'<div class="q" data-q="'+i+'"><p>'+(i+1)+'. '+esc(q[0])+'</p>'+q[1].map((o,j)=>'<button class="opt" data-o="'+j+'">'+esc(o)+'</button>').join("")+'<div class="why">'+esc(q[3])+'</div></div>').join("")+'<div class="qscore"></div>';
  const sc=box.querySelector(".qscore");
  function upd(){const n=Object.keys(ans).length,ok=Object.values(ans).filter(Boolean).length;
    if(state.quiz[l])sc.innerHTML='<span style="color:var(--ok)">✓ Quiz aprobado</span> <button class="btn sm" style="margin-left:10px" data-retry>reintentar</button>';
    else if(n===qs.length){sc.innerHTML=ok===qs.length?'<span style="color:var(--ok)">✓ '+ok+'/'+qs.length+' ¡Aprobado!</span>':'<span style="color:var(--warn)">'+ok+'/'+qs.length+'</span> Revisa las explicaciones y <button class="btn sm" data-retry>reintenta</button>';
      if(ok===qs.length){state.quiz[l]=true;save();renderProgress();toast(LEVELS.includes(l)?" Nivel aprobado":" Quiz aprobado");}}
    else sc.textContent=n+"/"+qs.length+" respondidas";}
  on(box,"click",e=>{
    if(e.target.closest("[data-retry]")){Object.keys(ans).forEach(k=>delete ans[k]);delete state.quiz[l];save();renderProgress();box.querySelectorAll(".q").forEach(q=>{q.classList.remove("ans");q.querySelectorAll(".opt").forEach(o=>o.classList.remove("ok","no"));});upd();return;}
    const o=e.target.closest(".opt");if(!o)return;const q=o.closest(".q"),i=+q.dataset.q;if(ans[i]!==undefined)return;
    const j=+o.dataset.o;ans[i]=j===qs[i][2];q.classList.add("ans");o.classList.add(ans[i]?"ok":"no");if(!ans[i])q.querySelectorAll(".opt")[qs[i][2]].classList.add("ok");upd();});
  upd();
});

/* ---------- counts ---------- */
const nLessons=window.__CC?Object.values(window.__CC.lessons).flat().filter(id=>!id.endsWith("q")).length:$$("article.lesson").filter(a=>!a.id.endsWith("q")).length;
const nWidgets=window.__CC?window.__CC.widgets:$$(".wd").length;
const nQuiz=Object.values(QZ).reduce((a,b)=>a+b.length,0);
$$('[data-count="lessons"]').forEach(e=>e.textContent=nLessons);
$$('[data-count="widgets"]').forEach(e=>e.textContent=nWidgets);
$$('[data-count="quiz"]').forEach(e=>e.textContent=nQuiz);
$$('[data-count="cmds"]').forEach(e=>e.textContent=CMDS.length);

renderProgress();
route();
})();
