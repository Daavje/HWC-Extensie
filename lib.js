// Pure helpers shared by the dashboard and automated tests.
export const DEFAULT_SHORTCUTS = Object.freeze([
  { id:'magister',name:'Magister',url:'https://hermannwesselink.magister.net/',icon:'📚' },
  { id:'outlook',name:'Outlook',url:'https://outlook.office.com/mail/',icon:'✉️' },
  { id:'workspace',name:'Workspace365',url:'https://portal.workspace365.net/cedergroep',icon:'🏫' },
  { id:'chatgpt',name:'ChatGPT',url:'https://chatgpt.com/',icon:'✨' },
  { id:'deepl',name:'DeepL',url:'https://www.deepl.com/translator',icon:'🌍' },
  { id:'youtube',name:'YouTube',url:'https://www.youtube.com/',icon:'▶️' }
]);
export const SEARCH_ENGINES = Object.freeze({
  google:'https://www.google.com/search?q=',
  duckduckgo:'https://duckduckgo.com/?q=',
  bing:'https://www.bing.com/search?q='
});
export function safeUrl(value){
  try {
    const url=new URL(String(value).trim());
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password) return null;
    return url.href;
  }catch{return null;}
}
export function safeDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const [y,m,d]=value.split('-').map(Number);
  const date=new Date(y,m-1,d,12);
  if(date.getFullYear()!==y||date.getMonth()+1!==m||date.getDate()!==d)return null;
  return value;
}
export function daysUntil(date,today=new Date()){
  const safe=safeDate(date);
  if(!safe)return null;
  const [y,m,d]=safe.split('-').map(Number);
  return Math.round((Date.UTC(y,m-1,d)-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);
}
export function formatTimer(seconds){
  const s=Math.max(0,Math.floor(Number(seconds)||0));
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
const string=(s,max)=>typeof s==='string'?s.slice(0,max).trim():'';
const options=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
const boundedInt=(n,min,max,fallback)=>Number.isInteger(Number(n))&&Number(n)>=min&&Number(n)<=max?Number(n):fallback;
export function defaultData(){return{
  version:2,
  settings:{name:'',theme:'system',accent:'violet',engine:'google',clock24:true,focus:25,break:5},
  shortcuts:DEFAULT_SHORTCUTS.map(s=>({...s})),
  tasks:[],notes:'',timer:{mode:'focus',remaining:25*60,running:false,endAt:null}
};}
export function sanitizeData(raw,keepTimer=true){
  const defaults=defaultData();
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return defaults;
  const s=raw.settings&&typeof raw.settings==='object'?raw.settings:{};
  const settings={
    name:string(s.name,30),theme:options(s.theme,['system','dark','light'],'system'),
    accent:options(s.accent,['violet','blue','mint','pink'],'violet'),
    engine:options(s.engine,['google','duckduckgo','bing'],'google'),
    clock24:typeof s.clock24==='boolean'?s.clock24:true,
    focus:boundedInt(s.focus,1,120,25),break:boundedInt(s.break,1,60,5)
  };
  const shortcuts=Array.isArray(raw.shortcuts)?raw.shortcuts.slice(0,12).flatMap((item,i)=>{
    if(!item||typeof item!=='object')return [];
    const name=string(item.name,32),url=safeUrl(item.url);
    if(!name||!url)return [];
    return [{id:string(item.id,70)||`link-${i}`,name,url,icon:string(item.icon,8)||'🔗'}];
  }):defaults.shortcuts;
  const tasks=Array.isArray(raw.tasks)?raw.tasks.slice(0,500).flatMap((item,i)=>{
    if(!item||typeof item!=='object')return [];
    const title=string(item.title,120);
    if(!title)return [];
    return [{id:string(item.id,70)||`task-${i}`,title,due:safeDate(item.due)||'',priority:item.priority==='high'?'high':'normal',done:item.done===true,createdAt:Number.isFinite(item.createdAt)?item.createdAt:0}];
  }):[];
  const mode=raw.timer?.mode==='break'?'break':'focus';
  const fullMinutes=mode==='focus'?settings.focus:settings.break;
  const t=raw.timer||{};
  const timer=keepTimer?{mode,remaining:boundedInt(t.remaining,0,7200,fullMinutes*60),running:t.running===true&&Number.isFinite(t.endAt)&&t.endAt>0,endAt:Number.isFinite(t.endAt)?t.endAt:null}:{mode:'focus',remaining:settings.focus*60,running:false,endAt:null};
  return{version:2,settings,shortcuts,tasks,notes:typeof raw.notes==='string'?raw.notes.slice(0,12000):'',timer};
}
