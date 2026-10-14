import { defaultData, sanitizeData, safeUrl, safeDate, daysUntil, formatTimer, SEARCH_ENGINES } from './lib.js';
import { MAGISTER_CONFIG_KEY, MAGISTER_CACHE_KEY, gatewayOrigin, validProxyKey, mondayOf, addDays, localDate, fetchRange } from './magister.js';

const DATA_KEY='hwcNextData';
const $=id=>document.getElementById(id);
const storage=globalThis.chrome?.storage?.local ? {
  async get(){const result=await chrome.storage.local.get(DATA_KEY);return result[DATA_KEY];},
  async set(data){await chrome.storage.local.set({[DATA_KEY]:data});}
}: {
  async get(){try{return JSON.parse(localStorage.getItem(DATA_KEY)||'null');}catch{return null;}},
  async set(data){localStorage.setItem(DATA_KEY,JSON.stringify(data));}
};
let data=defaultData();
let filter='open';
let editingShortcut=null;
let editingTask=null;
let noteSaveTimeout=null;
let toastTimeout=null;
let writeQueue=Promise.resolve();
const id=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const save=()=>{const snapshot=structuredClone(data);writeQueue=writeQueue.catch(()=>{}).then(()=>storage.set(snapshot)).catch(()=>notify('Opslaan is niet gelukt.'));return writeQueue;};
const dateLabel=due=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(new Date(`${due}T12:00:00`));
const fullDate=due=>new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${due}T12:00:00`));
const shortRelative=due=>{const days=daysUntil(due);return days<0?`${Math.abs(days)} dag${Math.abs(days)===1?'':'en'} te laat`:days===0?'Vandaag':days===1?'Morgen':`Over ${days} dagen`;};
const element=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const notify=message=>{const toast=$('toast');toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toast.classList.remove('visible'),3300);};

// The gateway key and fetched roster are NOT part of the exported dashboard data.
let magisterConfig = null;
let magisterCache = null;
let rosterWeekOffset = 0;
let rosterSyncing = false;

const msg = type => chrome.runtime.sendMessage({type});
function rosterTime(value) {
  return new Intl.DateTimeFormat('nl-NL', {hour:'2-digit', minute:'2-digit'}).format(new Date(value));
}
function rosterDay(when) {
  return new Intl.DateTimeFormat('nl-NL', {weekday:'short'}).format(when);
}
function renderRoster() {
  const configured = Boolean(magisterConfig);
  $('rosterConnection').textContent = configured ? (magisterCache?.updatedAt ? 'Gekoppeld' : 'Ingesteld') : 'Niet gekoppeld';
  $('rosterConnection').classList.toggle('connected', configured && Boolean(magisterCache?.updatedAt));
  $('rosterRefresh').disabled = !configured || rosterSyncing;
  $('rosterRefresh').textContent = rosterSyncing ? 'Bezig...' : '↻ Verversen';
  $('rosterSettings').textContent = configured ? '⚙ Instellingen' : '⚙ Koppelen';
  const last = magisterCache?.updatedAt ? new Intl.DateTimeFormat('nl-NL', {dateStyle:'short',timeStyle:'short'}).format(new Date(magisterCache.updatedAt)) : '';
  let status = !configured ? 'Koppel een Magister Auth Gateway om automatisch je echte lessen te zien.' :
    magisterCache?.error ? `⚠ ${magisterCache.error}${last ? ` · Oud rooster van ${last} beschikbaar.` : ''}` :
    rosterSyncing ? 'Rooster ophalen uit Magister...' :
    last ? `Automatisch bijgewerkt: ${last}. De browser controleert elke 15 minuten zolang hij open is.` : 'Nog geen rooster opgehaald. Klik op Verversen.';
  $('rosterStatus').textContent = status;

  const monday = addDays(mondayOf(), 7 * rosterWeekOffset);
  $('rosterWeek').textContent = `${new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(monday)} – ${new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(addDays(monday,6))}`;
  $('rosterPrev').disabled = rosterWeekOffset <= -1;
  $('rosterNext').disabled = rosterWeekOffset >= 2;
  $('rosterCurrent').disabled = rosterWeekOffset === 0;
  const grid = $('rosterGrid'); grid.replaceChildren();
  const items = Array.isArray(magisterCache?.items) ? magisterCache.items : [];
  const from = magisterCache?.from || '';
  const to = magisterCache?.to || '';
  const today = localDate(new Date());
  for (let n=0; n<7; n++) {
    const date = addDays(monday,n);
    const dayIso = localDate(date);
    const card = element('div', `roster-day${dayIso===today?' is-today':''}`);
    const head = element('div','roster-day-header');
    head.append(element('span','',rosterDay(date)), element('strong','',String(date.getDate())));
    card.append(head);
    const lessons = items.filter(x => localDate(new Date(x.start)) === dayIso);
    if (!configured || !magisterCache?.updatedAt) {
      card.append(element('div','roster-no-lessons',configured?'Nog geen gegevens':'Niet gekoppeld'));
    } else if (dayIso < from || dayIso > to) {
      card.append(element('div','roster-no-lessons','Buiten opgehaalde periode'));
    } else if (!lessons.length) {
      card.append(element('div','roster-no-lessons','Geen afspraken'));
    }
    for (const lesson of lessons) {
      const lessonEl = element('div', `roster-lesson${lesson.cancelled?' cancelled':''}`);
      lessonEl.append(element('span','roster-time',`${rosterTime(lesson.start)}–${rosterTime(lesson.end)}`));
      lessonEl.append(element('strong','roster-title',lesson.title));
      if (lesson.location) lessonEl.append(element('span','roster-detail',`📍 ${lesson.location}`));
      if (lesson.teachers) lessonEl.append(element('span','roster-detail',lesson.teachers));
      if (lesson.cancelled) lessonEl.append(element('span','roster-detail','Uitgevallen'));
      if (lesson.homework) {
        const details=element('details','roster-homework');
        details.append(element('summary','','Huiswerk / inhoud'),element('p','',lesson.homework));
        lessonEl.append(details);
      }
      card.append(lessonEl);
    }
    grid.append(card);
  }
}
async function loadMagister() {
  if (!globalThis.chrome?.runtime?.id || !chrome.storage?.local) {
    $('rosterStatus').textContent='Installeer de extensie in Chrome of Edge om Magister te koppelen.';
    return;
  }
  const saved = await chrome.storage.local.get([MAGISTER_CONFIG_KEY, MAGISTER_CACHE_KEY]);
  magisterConfig = saved[MAGISTER_CONFIG_KEY] || null;
  magisterCache = saved[MAGISTER_CACHE_KEY] || null;
  renderRoster();
  if (magisterConfig && (!magisterCache?.updatedAt || Date.now()-magisterCache.updatedAt > 15*60000 ||
      magisterCache.from!==fetchRange().from)) await refreshRoster();
}
async function refreshRoster() {
  if (!magisterConfig || rosterSyncing) return;
  rosterSyncing = true;renderRoster();
  try {
    const result=await msg('HWC_MAGISTER_SYNC');
    if (!result?.ok) notify(result?.error || 'Rooster ophalen is mislukt.');
  } catch {notify('Kan geen verbinding maken met de achtergronddienst.');}
  finally {
    rosterSyncing=false;
    try {
      const stored=await chrome.storage.local.get(MAGISTER_CACHE_KEY);
      magisterCache=stored[MAGISTER_CACHE_KEY]||null;
    } catch {}
    renderRoster();
  }
}
function openMagisterSettings() {
  const form=$('magisterForm');form.reset();
  form.elements.gateway.value=magisterConfig?.gateway||'';
  $('magisterDisconnect').hidden=!magisterConfig;
  $('magisterError').textContent='';
  $('magisterDialog').showModal();
}
function wireMagisterEvents() {
  $('rosterSettings').addEventListener('click',openMagisterSettings);
  $('rosterRefresh').addEventListener('click',refreshRoster);
  $('rosterPrev').addEventListener('click',()=>{rosterWeekOffset=Math.max(-1,rosterWeekOffset-1);renderRoster();});
  $('rosterNext').addEventListener('click',()=>{rosterWeekOffset=Math.min(2,rosterWeekOffset+1);renderRoster();});
  $('rosterCurrent').addEventListener('click',()=>{rosterWeekOffset=0;renderRoster();});
  $('magisterForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const form=event.currentTarget;
    const gateway=gatewayOrigin(form.elements.gateway.value);
    const proxyKey=form.elements.proxyKey.value.trim() || (gateway===magisterConfig?.gateway?magisterConfig.proxyKey:'');
    if (!gateway) { $('magisterError').textContent='Gebruik het HTTPS-adres van je gateway (zonder pad of gegevens).';return; }
    if (!validProxyKey(proxyKey)) { $('magisterError').textContent='Voer een geldige Managed Proxy Key in (mag_sk_...).';return; }
    if (!globalThis.chrome?.permissions) { $('magisterError').textContent='Open deze pagina als geïnstalleerde browserextensie.';return; }
    try {
      // Host permission is requested only for the selected gateway, not every site.
      const allowed=await chrome.permissions.request({origins:[`${gateway}/*`]});
      if (!allowed) { $('magisterError').textContent='Toegang tot je gateway is nodig om het rooster op te halen.';return; }
      await chrome.storage.local.set({[MAGISTER_CONFIG_KEY]:{gateway,proxyKey}});
      if (magisterConfig?.gateway && magisterConfig.gateway!==gateway)
        await chrome.permissions.remove({origins:[`${magisterConfig.gateway}/*`]});
      magisterConfig={gateway,proxyKey};
      magisterCache=null;
      await chrome.storage.local.remove(MAGISTER_CACHE_KEY);
      $('magisterDialog').close();renderRoster();
      const result=await msg('HWC_MAGISTER_CONFIG_CHANGED');
      if (!result?.ok) notify(result?.error||'Configuratie bewaard, maar synchroniseren mislukt.');
      else notify(`${result.count} Magister-afspraken opgehaald.`);
      await loadMagister();
    } catch { $('magisterError').textContent='De instellingen konden niet worden opgeslagen.'; }
    finally {form.elements.proxyKey.value='';}
  });
  $('magisterDisconnect').addEventListener('click', async ()=>{
    if (!confirm('Magister ontkoppelen? Je rooster en proxy key worden lokaal verwijderd.')) return;
    const oldOrigin=magisterConfig?.gateway;
    try {
      await chrome.storage.local.remove([MAGISTER_CONFIG_KEY,MAGISTER_CACHE_KEY]);
      await msg('HWC_MAGISTER_DISCONNECT');
      if (oldOrigin) await chrome.permissions.remove({origins:[`${oldOrigin}/*`]});
      magisterConfig=null;magisterCache=null;
      $('magisterDialog').close();renderRoster();notify('Magister is ontkoppeld.');
    } catch { $('magisterError').textContent='Ontkoppelen is niet volledig gelukt.'; }
  });
  globalThis.chrome?.storage?.onChanged?.addListener((changes,area)=>{
    if (area!=='local')return;
    if (changes[MAGISTER_CACHE_KEY]) {magisterCache=changes[MAGISTER_CACHE_KEY].newValue||null;renderRoster();}
  });
  document.addEventListener('visibilitychange',()=>{
    if (!document.hidden && magisterConfig && (!magisterCache?.updatedAt || Date.now()-magisterCache.updatedAt>15*60000))
      refreshRoster();
  });
}

function applyAppearance(){
  const chosen=data.settings.theme;
  document.documentElement.dataset.theme=chosen==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):chosen;
  document.documentElement.dataset.accent=data.settings.accent;
}
function updateClock(){
  const now=new Date(), hour=now.getHours();
  const greeting=hour<6?'Goedenacht':hour<12?'Goedemorgen':hour<18?'Goedemiddag':'Goedenavond';
  const name=data.settings.name;
  $('greeting').replaceChildren(document.createTextNode(name?`${greeting}, ${name}`:greeting),element('span','title-stop','.'));
  const clock=$('clock');clock.textContent=new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit',hour12:!data.settings.clock24}).format(now);clock.dateTime=now.toISOString();
  const today=$('today');today.textContent=new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long'}).format(now);today.dateTime=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function renderShortcuts(){
  const grid=$('shortcutGrid');grid.replaceChildren();
  for(const shortcut of data.shortcuts){
    const card=element('div','shortcut-card');
    const link=element('a');link.href=shortcut.url;link.target='_self';link.className='shortcut-target';link.setAttribute('aria-label',`${shortcut.name} openen`);
    // Link covers the tile, while edit/delete are independent buttons.
    link.style.cssText='position:absolute;inset:0;border-radius:inherit;z-index:1;';
    const icon=element('span','shortcut-icon',shortcut.icon);
    const name=element('span','shortcut-name',shortcut.name);
    const edit=element('button','shortcut-edit','✎');edit.type='button';edit.title=`${shortcut.name} bewerken`;edit.setAttribute('aria-label',edit.title);edit.style.zIndex='2';edit.onclick=()=>openShortcut(shortcut.id);
    const remove=element('button','shortcut-delete','×');remove.type='button';remove.title=`${shortcut.name} verwijderen`;remove.setAttribute('aria-label',remove.title);remove.style.zIndex='2';remove.onclick=()=>{if(confirm(`Snelkoppeling “${shortcut.name}” verwijderen?`)){data.shortcuts=data.shortcuts.filter(s=>s.id!==shortcut.id);renderShortcuts();save();}};
    card.append(icon,name,link,edit,remove);grid.append(card);
  }
  $('shortcutAdd').disabled=data.shortcuts.length>=12;
}
function openShortcut(linkId=null){
  editingShortcut=linkId;
  const s=data.shortcuts.find(item=>item.id===linkId);
  const form=$('shortcutForm');form.reset();form.elements.name.value=s?.name||'';form.elements.url.value=s?.url||'';form.elements.icon.value=s?.icon||'';
  $('shortcutDialogTitle').textContent=s?'Snelkoppeling bewerken':'Snelkoppeling toevoegen';$('shortcutError').textContent='';$('shortcutDialog').showModal();form.elements.name.focus();
}
function renderTasks(){
  const list=$('taskList');list.replaceChildren();
  const filtered=data.tasks.filter(t=>filter==='all'||(filter==='done'?t.done:!t.done)).sort((a,b)=>Number(a.done)-Number(b.done)||(a.due||'9999').localeCompare(b.due||'9999')||(a.priority===b.priority?0:a.priority==='high'?-1:1)||b.createdAt-a.createdAt);
  for(const task of filtered){
    const li=element('li',`task-item${task.done?' completed':''}`);
    const checked=element('input','task-check');checked.type='checkbox';checked.checked=task.done;checked.setAttribute('aria-label',`${task.title} afronden`);
    checked.addEventListener('change',()=>{task.done=checked.checked;renderAll();save();});
    const body=element('div','task-body');body.append(element('span','task-name',task.title));
    if(task.due||task.priority==='high'){
      const meta=element('div','task-meta');if(task.due)meta.append(element('span','',`${task.done?'✓ ':''}${shortRelative(task.due)} · ${dateLabel(task.due)}`));
      if(task.priority==='high')meta.append(element('span','high','● Belangrijk'));body.append(meta);
    }
    const actions=element('div','task-actions');
    const edit=element('button','', '✎');edit.type='button';edit.title=`${task.title} bewerken`;edit.setAttribute('aria-label',edit.title);edit.onclick=()=>openTask(task.id);
    const remove=element('button','', '×');remove.type='button';remove.title=`${task.title} verwijderen`;remove.setAttribute('aria-label',remove.title);remove.onclick=()=>{if(confirm(`Taak “${task.title}” verwijderen?`)){data.tasks=data.tasks.filter(t=>t.id!==task.id);renderAll();save();}};
    actions.append(edit,remove);li.append(checked,body,actions);list.append(li);
  }
  $('taskCount').textContent=String(data.tasks.filter(t=>!t.done).length);
  $('tasksEmpty').hidden=filtered.length!==0;
  $('taskAdd').disabled=data.tasks.length>=500;
  for(const button of document.querySelectorAll('[data-filter]')){const active=button.dataset.filter===filter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
}
function renderDeadlines(){
  const list=$('deadlineList');list.replaceChildren();
  const tasks=data.tasks.filter(t=>!t.done&&t.due).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,5);
  for(const task of tasks){
    const li=element('li','deadline-item');const badge=element('div','day-badge');badge.append(element('strong','',String(Number(task.due.slice(8)))),element('small','',new Intl.DateTimeFormat('nl-NL',{month:'short'}).format(new Date(`${task.due}T12:00:00`))));
    const main=element('div','');main.append(element('span','deadline-name',task.title));main.append(element('span',`deadline-info${daysUntil(task.due)<0?' overdue':''}`,`${fullDate(task.due)} · ${shortRelative(task.due)}`));li.append(badge,main);list.append(li);
  }
  $('deadlinesEmpty').hidden=tasks.length!==0;
}
function openTask(taskId=null){
  editingTask=taskId;const task=data.tasks.find(t=>t.id===taskId),form=$('taskForm');form.reset();
  form.elements.title.value=task?.title||'';form.elements.due.value=task?.due||'';form.elements.priority.value=task?.priority||'normal';
  $('taskDialogTitle').textContent=task?'Taak bewerken':'Nieuwe taak';$('taskError').textContent='';$('taskDialog').showModal();form.elements.title.focus();
}
function remainingTime(){return data.timer.running?Math.max(0,Math.ceil((data.timer.endAt-Date.now())/1000)):data.timer.remaining;}
function updateTimer(){
  const t=data.timer,seconds=remainingTime();
  if(t.running&&seconds<=0){t.running=false;t.endAt=null;t.remaining=0;save();notify(t.mode==='focus'?'Focus afgerond! Neem even pauze.':'Pauze voorbij! Je kunt weer verder.');}
  const total=(t.mode==='focus'?data.settings.focus:data.settings.break)*60;
  $('timerValue').textContent=formatTimer(seconds);$('timerRing').style.setProperty('--progress',`${Math.min(100,Math.max(0,(1-seconds/total)*100))}%`);
  $('timerToggle').textContent=t.running?'Ⅱ Pauzeren':seconds===0?'↻ Opnieuw starten':t.mode==='focus'?'▶ Start focus':'▶ Start pauze';
  $('timerSubtitle').textContent=t.running?'Je bent lekker bezig':t.mode==='focus'?'Tijd om te knallen':'Even ontspannen';
  $('focusState').textContent=t.mode==='focus'?'Focus':'Pauze';$('focusMinutes').textContent=`${data.settings.focus} min`;$('breakMinutes').textContent=`${data.settings.break} min`;
  for(const [button,mode] of [['modeFocus','focus'],['modeBreak','break']]){$(button).classList.toggle('active',t.mode===mode);$(button).setAttribute('aria-pressed',String(t.mode===mode));}
}
function setTimerMode(mode){data.timer={mode,remaining:(mode==='focus'?data.settings.focus:data.settings.break)*60,running:false,endAt:null};updateTimer();save();}
function toggleTimer(){const t=data.timer;if(t.running){t.remaining=remainingTime();t.running=false;t.endAt=null;}else{if(t.remaining<=0)t.remaining=(t.mode==='focus'?data.settings.focus:data.settings.break)*60;t.endAt=Date.now()+t.remaining*1000;t.running=true;}updateTimer();save();}
function renderAll(){applyAppearance();updateClock();renderShortcuts();renderTasks();renderDeadlines();updateTimer();}

function wireEvents(){
  $('settingsOpen').addEventListener('click',()=>{const s=data.settings,f=$('settingsForm');f.elements.name.value=s.name;f.elements.theme.value=s.theme;f.elements.accent.value=s.accent;f.elements.engine.value=s.engine;f.elements.clock24.checked=s.clock24;f.elements.focus.value=s.focus;f.elements.break.value=s.break;$('settingsError').textContent='';$('settingsDialog').showModal();});
  $('searchForm').addEventListener('submit',event=>{event.preventDefault();const q=$('searchInput').value.trim();if(q)window.location.assign(SEARCH_ENGINES[data.settings.engine]+encodeURIComponent(q));});
  $('shortcutAdd').addEventListener('click',()=>openShortcut());
  $('shortcutForm').addEventListener('submit',event=>{
    event.preventDefault();const f=event.currentTarget,name=f.elements.name.value.trim(),url=safeUrl(f.elements.url.value),icon=f.elements.icon.value.trim()||'🔗';
    if(!name||!url){$('shortcutError').textContent='Vul een naam en een geldige http(s)-website in.';return;}
    const item={id:editingShortcut||id(),name:name.slice(0,32),url,icon:icon.slice(0,8)};
    if(editingShortcut){const idx=data.shortcuts.findIndex(s=>s.id===editingShortcut);if(idx<0)return;data.shortcuts[idx]=item;}
    else if(data.shortcuts.length<12)data.shortcuts.push(item);else{$('shortcutError').textContent='Maximaal 12 snelkoppelingen.';return;}
    $('shortcutDialog').close();renderShortcuts();save();notify('Snelkoppeling opgeslagen.');
  });
  $('taskAdd').addEventListener('click',()=>openTask());$('deadlineAdd').addEventListener('click',()=>openTask());
  $('taskForm').addEventListener('submit',event=>{
    event.preventDefault();const f=event.currentTarget,title=f.elements.title.value.trim(),rawDue=f.elements.due.value;
    if(!title||rawDue&&!safeDate(rawDue)){$('taskError').textContent='Vul een taaknaam en een geldige datum in.';return;}
    const old=data.tasks.find(t=>t.id===editingTask);
    const task={id:editingTask||id(),title:title.slice(0,120),due:rawDue,priority:f.elements.priority.value==='high'?'high':'normal',done:old?.done||false,createdAt:old?.createdAt||Date.now()};
    if(editingTask){const idx=data.tasks.findIndex(t=>t.id===editingTask);if(idx<0)return;data.tasks[idx]=task;}
    else if(data.tasks.length<500)data.tasks.push(task);else{$('taskError').textContent='Maximaal 500 taken.';return;}
    $('taskDialog').close();renderAll();save();notify('Taak opgeslagen.');
  });
  $('taskFilters').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(button){filter=button.dataset.filter;renderTasks();}});
  $('notes').addEventListener('input',event=>{data.notes=event.target.value.slice(0,12000);$('notesStatus').textContent='Opslaan...';clearTimeout(noteSaveTimeout);noteSaveTimeout=setTimeout(()=>{save().then(()=>$('notesStatus').textContent='Opgeslagen');},400);});
  $('timerToggle').addEventListener('click',toggleTimer);$('timerReset').addEventListener('click',()=>setTimerMode(data.timer.mode));$('modeFocus').addEventListener('click',()=>setTimerMode('focus'));$('modeBreak').addEventListener('click',()=>setTimerMode('break'));
  $('settingsForm').addEventListener('submit',event=>{
    event.preventDefault();const f=event.currentTarget,focus=Number(f.elements.focus.value),rest=Number(f.elements.break.value);
    if(!Number.isInteger(focus)||focus<1||focus>120||!Number.isInteger(rest)||rest<1||rest>60){$('settingsError').textContent='Gebruik 1–120 minuten focus en 1–60 minuten pauze.';return;}
    const oldFocus=data.settings.focus,oldBreak=data.settings.break;
    data.settings={name:f.elements.name.value.trim().slice(0,30),theme:f.elements.theme.value,accent:f.elements.accent.value,engine:f.elements.engine.value,clock24:f.elements.clock24.checked,focus,break:rest};
    if(!data.timer.running&&((data.timer.mode==='focus'&&focus!==oldFocus)||(data.timer.mode==='break'&&rest!==oldBreak)))data.timer.remaining=(data.timer.mode==='focus'?focus:rest)*60;
    $('settingsDialog').close();renderAll();save();notify('Instellingen opgeslagen.');
  });
  for(const close of document.querySelectorAll('[data-close]'))close.addEventListener('click',()=>$(close.dataset.close).close());
  $('exportButton').addEventListener('click',()=>{
    const content=JSON.stringify({format:'hwc-dashboard-next',exportedAt:new Date().toISOString(),data:{...data,timer:{...data.timer,running:false,endAt:null}}},null,2);
    const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='hwc-dashboard-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);notify('Back-up gemaakt.');
  });
  $('importFile').addEventListener('change',async event=>{
    const file=event.currentTarget.files?.[0];event.currentTarget.value='';if(!file)return;
    if(file.size>2_000_000){$('settingsError').textContent='Dit bestand is te groot (maximaal 2 MB).';return;}
    try{const doc=JSON.parse(await file.text());if(doc?.format!=='hwc-dashboard-next'||!doc.data||doc.data.version!==2)throw Error('Onbekend back-upformaat');
      if(!confirm('Weet je zeker dat je je huidige taken, notities en instellingen wilt vervangen?'))return;
      data=sanitizeData(doc.data,false);filter='open';await save();$('settingsDialog').close();$('notes').value=data.notes;renderAll();notify('Back-up geïmporteerd.');
    }catch(error){$('settingsError').textContent=`Importeren mislukt: ${error.message}`;}
  });
  document.addEventListener('keydown',event=>{
    const target=event.target,typing=target instanceof HTMLElement&&(target.matches('input,textarea,select')||target.isContentEditable);
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(document.querySelector('dialog[open]'))return;$('searchInput').focus();$('searchInput').select();}
    else if(!typing&&!event.ctrlKey&&!event.metaKey&&!document.querySelector('dialog[open]')&&event.key==='/'){event.preventDefault();$('searchInput').focus();}
    else if(!typing&&!event.ctrlKey&&!event.metaKey&&!document.querySelector('dialog[open]')&&event.key.toLowerCase()==='n'){event.preventDefault();openTask();}
  });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>{if(data.settings.theme==='system')applyAppearance();});
}
async function init(){
  try{data=sanitizeData(await storage.get());}catch{notify('Gegevens konden niet worden geladen; instellingen zijn tijdelijk standaard.');}
  wireEvents();wireMagisterEvents();$('notes').value=data.notes;renderAll();renderRoster();loadMagister().catch(()=>notify('Magistergegevens konden niet worden geladen.'));setInterval(()=>{updateClock();updateTimer();},1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateClock();updateTimer();renderDeadlines();}});
}
init();
