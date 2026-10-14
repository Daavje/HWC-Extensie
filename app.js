import { defaultData, sanitizeData, safeUrl, safeDate, daysUntil, formatTimer, SEARCH_ENGINES } from './lib.js';

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
  wireEvents();$('notes').value=data.notes;renderAll();setInterval(()=>{updateClock();updateTimer();},1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateClock();updateTimer();renderDeadlines();}});
}
init();
