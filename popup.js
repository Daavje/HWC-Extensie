import { defaultData, sanitizeData } from './lib.js';
import { MAGISTER_CACHE_KEY, MAGISTER_CONFIG_KEY } from './magister.js';
import { renderIcon } from './shortcuts.js';

const DATA_KEY='hwcNextData';
const $=id=>document.getElementById(id);
let data=defaultData(),roster=null,configured=false,folderId='',tab='links';
const el=(tag,c='',text)=>{const n=document.createElement(tag);if(c)n.className=c;if(text!==undefined)n.textContent=text;return n;};
function toast(message){const box=$('popupToast');box.textContent=message;box.classList.add('visible');setTimeout(()=>box.classList.remove('visible'),2500);}
async function writeData(){await chrome.storage.local.set({[DATA_KEY]:data});}
function shortDate(millis){return new Intl.DateTimeFormat('nl-NL',{weekday:'short',day:'numeric',month:'short'}).format(new Date(millis));}
function clock(){
  const now=new Date();
  $('popupClock').textContent=new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit',hour12:!data.settings.clock24}).format(now);
  $('popupToday').textContent=new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long'}).format(now);
}
function apply(){
  document.body.dataset.size=data.settings.popupSize||'normal';
  const accent={violet:'#a58bff',blue:'#63a7ff',mint:'#5edebb',pink:'#fa85bd'};
  document.documentElement.style.setProperty('--accent',accent[data.settings.accent]||accent.violet);
  $('popupHello').textContent=data.settings.name?'Hoi, '+data.settings.name+'!':'Welkom terug';
  clock();
}
function renderLinks(){
  const folders=$('popupFolders'),list=$('popupLinks');
  folders.replaceChildren();list.replaceChildren();
  const root=el('button',folderId?'':'active','Alles');
  root.type='button';root.onclick=()=>{folderId='';renderLinks();};folders.append(root);
  for(const f of data.folders||[]){
    const b=el('button',folderId===f.id?'active':'',f.icon+' '+f.name);
    b.type='button';b.onclick=()=>{folderId=f.id;renderLinks();};
    folders.append(b);
  }
  const query=$('linkFilter').value.trim().toLowerCase();
  const all=data.shortcuts.filter(x=>(!folderId||x.folderId===folderId)&&
    (!query||(x.name+' '+x.url).toLowerCase().includes(query)));
  const selected=query||folderId?all:all.sort((a,b)=>Number(b.pinned)-Number(a.pinned));
  for(const shortcut of selected.slice(0,40)){
    const a=el('a','quick-link');a.href=shortcut.url;a.target='_blank';a.rel='noopener noreferrer';
    a.title=shortcut.url;
    const icon=renderIcon(shortcut,'ico'),label=el('span','name',shortcut.name);
    a.append(icon,label);list.append(a);
  }
  $('linksEmpty').hidden=Boolean(selected.length);
}
function renderTasks(){
  const box=$('popupTasks');box.replaceChildren();
  const open=data.tasks.filter(x=>!x.done).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||(a.priority==='high'?-1:1));
  for(const task of open.slice(0,30)){
    const label=el('label','task-line');
    const check=el('input');check.type='checkbox';check.checked=false;
    check.addEventListener('change',async()=>{
      task.done=true;await writeData();renderTasks();toast('Taak afgevinkt.');
    });
    const text=el('span','label',task.title);
    label.append(check,text);
    if(task.due)label.append(el('span','due',task.due));
    box.append(label);
  }
  $('tasksEmpty').hidden=Boolean(open.length);
}
function renderRoster(){
  const list=$('popupRoster');list.replaceChildren();
  if(!configured){$('rosterMiniStatus').textContent='Verbind Magister via het volledige dashboard.';return;}
  if(!roster?.updatedAt){
    $('rosterMiniStatus').textContent='Nog geen rooster opgehaald. Klik op Verversen.';return;
  }
  $('rosterMiniStatus').textContent=roster.error?'Laatste synchronisatiefout: '+roster.error:
    'Bijgewerkt: '+new Intl.DateTimeFormat('nl-NL',{dateStyle:'short',timeStyle:'short'}).format(new Date(roster.updatedAt));
  const now=Date.now();
  const future=(roster.items||[]).filter(x=>Number(x.end)>now).sort((a,b)=>a.start-b.start).slice(0,6);
  if(!future.length){list.append(el('p','muted','Geen komende lessen gevonden.'));return;}
  for(const l of future){
    const row=el('article','lesson');
    row.append(el('strong','',l.subject||l.title||'Les'));
    row.append(el('p','',shortDate(l.start)+' · '+new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'}).format(l.start)+' · '+(l.location||'Lokaal onbekend')));
    if(l.homework)row.append(el('p','homework',l.homework.slice(0,180)));
    list.append(row);
  }
}
function renderFocus(){
  const t=data.timer;
  const rest=t.running?Math.max(0,Math.ceil((t.endAt-Date.now())/1000)):t.remaining;
  const minutes=Math.floor(rest/60),seconds=rest%60;
  $('quickFocus').textContent=(t.running?'⏸ Pauzeren':'▶ Start focus')+' · '+String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0');
}
function render(){apply();renderLinks();renderTasks();renderRoster();renderFocus();}
function selectTab(target){
  tab=target;
  for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===tab));
  for(const pane of document.querySelectorAll('.pane'))pane.hidden=pane.id!=='pane-'+tab;
}
function openDashboard(settings=false){
  chrome.tabs.create({url:chrome.runtime.getURL('index.html'+(settings?'#settings':''))});
}
async function load(){
  const saved=await chrome.storage.local.get([DATA_KEY,MAGISTER_CACHE_KEY,MAGISTER_CONFIG_KEY]);
  data=sanitizeData(saved[DATA_KEY]);
  roster=saved[MAGISTER_CACHE_KEY]||null;
  configured=Boolean(saved[MAGISTER_CONFIG_KEY]);
  render();
}
document.addEventListener('DOMContentLoaded',async()=>{
  for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>selectTab(b.dataset.tab));
  $('linkFilter').addEventListener('input',renderLinks);
  $('popupSettings').addEventListener('click',()=>openDashboard(true));
  $('openDashboard').addEventListener('click',e=>{e.preventDefault();openDashboard();});
  $('quickTaskForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const title=$('quickTask').value.trim();
    if(!title)return;
    data.tasks.push({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),title:title.slice(0,120),due:'',priority:'normal',done:false,createdAt:Date.now()});
    $('quickTask').value='';
    await writeData();renderTasks();toast('Taak toegevoegd.');
  });
  $('quickFocus').addEventListener('click',async()=>{
    const t=data.timer;
    if(t.running){
      t.remaining=Math.max(0,Math.ceil((t.endAt-Date.now())/1000));t.running=false;t.endAt=null;
    }else{
      if(t.remaining<=0)t.remaining=data.settings.focus*60;
      t.endAt=Date.now()+t.remaining*1000;t.running=true;
    }
    await writeData();renderFocus();
  });
  $('syncRoster').addEventListener('click',async()=>{
    if(!configured){openDashboard(true);return;}
    $('rosterMiniStatus').textContent='Rooster ophalen...';
    try{
      const res=await chrome.runtime.sendMessage({type:'HWC_MAGISTER_SYNC'});
      if(!res?.ok)throw Error(res?.error||'Onbekende fout');
      const got=await chrome.storage.local.get(MAGISTER_CACHE_KEY);
      roster=got[MAGISTER_CACHE_KEY]||null;
      renderRoster();toast('Rooster bijgewerkt.');
    }catch(e){$('rosterMiniStatus').textContent='Synchroniseren mislukt: '+e.message;}
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes[DATA_KEY])data=sanitizeData(changes[DATA_KEY].newValue);
    if(changes[MAGISTER_CACHE_KEY])roster=changes[MAGISTER_CACHE_KEY].newValue;
    if(changes[MAGISTER_CONFIG_KEY])configured=Boolean(changes[MAGISTER_CONFIG_KEY].newValue);
    render();
  });
  await load();
  setInterval(()=>{clock();renderFocus();},1000);
});
