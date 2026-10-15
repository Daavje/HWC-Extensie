import { safeUrl } from './lib.js';

export const APP_CATALOG = [
  ['Magister','https://hermannwesselink.magister.net/','📚','School'],
  ['Outlook Mail','https://outlook.office.com/mail/','✉️','School'],
  ['Outlook Agenda','https://outlook.office.com/calendar/','📅','School'],
  ['Workspace365','https://portal.workspace365.net/cedergroep','🏫','School'],
  ['Microsoft Teams','https://teams.microsoft.com/','👥','School'],
  ['OneDrive','https://onedrive.live.com/','☁️','Cloud'],
  ['Microsoft 365','https://www.office.com/','📄','School'],
  ['Google Drive','https://drive.google.com/','📂','Cloud'],
  ['Google Agenda','https://calendar.google.com/','📅','Productiviteit'],
  ['Gmail','https://mail.google.com/','📨','Productiviteit'],
  ['Google Keep','https://keep.google.com/','📝','Productiviteit'],
  ['ChatGPT','https://chatgpt.com/','✨','AI'],
  ['Notion','https://www.notion.so/','📒','Productiviteit'],
  ['Todoist','https://app.todoist.com/','✅','Productiviteit'],
  ['Canva','https://www.canva.com/','🎨','Creatief'],
  ['DeepL','https://www.deepl.com/translator','🌍','Talen'],
  ['YouTube','https://www.youtube.com/','▶️','Media'],
  ['Spotify','https://open.spotify.com/','🎵','Media'],
  ['Discord','https://discord.com/app','🎮','Sociaal'],
  ['GitHub','https://github.com/','🐙','Programmeren'],
  ['Figma','https://www.figma.com/','🖌️','Creatief'],
  ['Google Maps','https://maps.google.com/','🗺️','Overig'],
  ['Wikipedia','https://nl.wikipedia.org/','🌐','Overig'],
  ['Kahoot','https://kahoot.it/','🎯','School']
];
const ICON_TAGS={
  '📚':'boeken school magister huiswerk', '🏫':'school gebouw', '🎓':'studie diploma', '📖':'lezen boeken', '📐':'wiskunde meetkunde', '🔬':'wetenschap biologie','🧪':'scheikunde natuurkunde','🧬':'dna biologie','🧮':'rekenen','📝':'notities taak',
  '📅':'kalender agenda datum', '✅':'check todo taak klaar', '⏰':'klok tijd timer',
  '📁':'map folder bestanden', '📂':'map folder open', '☁️':'cloud drive opslag',
  '💻':'laptop programmeren computer', '🌐':'web internet browser', '⚙️':'settings instellingen',
  '🧠':'leren studeren ai', '🤖':'robot ai chatgpt','✨':'ster sparkle magie','🚀':'raket snelheid launch',
  '✉️':'email mail outlook','📨':'mail berichten gmail','👥':'teams samenwerken personen',
  '🎤':'microfoon zingen audio', '🎧':'koptelefoon muziek spotify', '🎵':'muziek spotify',
  '🎮':'games gaming discord','▶️':'video youtube','📺':'video televisie',
  '🎨':'kunst tekenen design', '🛒':'winkelen shop','📰':'nieuws krant',
  '🗺️':'maps kaart locatie','📍':'locatie pin', '🚴':'fiets', '🍕':'eten pizza',
  '🌞':'zon weer licht', '🌙':'maan nacht donker', '💜':'hart paars liefde', '🏆':'prijs trofee winnaar'
};
export const ICON_LIBRARY = [
  '📚','🏫','🎓','📖','📐','🔬','🧪','🧬','🧮','📝','📓','✏️','📅','🗓️','✅','⏰','⌛','📌','📎','📊',
  '💻','🖥️','⌨️','📱','📡','🌐','🔗','⚙️','🧠','🤖','✨','🚀','🔒','💡','📁','📂','🗄️','☁️','🔍','🔧',
  '✉️','📨','📬','📞','💬','👥','🗣️','🎤','🎧','🎵','🎼','🎹','🎸','🎬','▶️','🎮','🎯','📺','📷',
  '🎨','🖌️','🛠️','🛒','📰','🗺️','📍','🚴','🚌','🚆','🍕','☕','🌍','🌞','🌙','⭐','❤️','💜','🏆'
];
const $ = id => document.getElementById(id);
const el = (tag,cl='',t) => {
  const e=document.createElement(tag); if(cl)e.className=cl; if(t!==undefined)e.textContent=t; return e;
};
const makeId=()=>globalThis.crypto?.randomUUID?.()||('item-'+Date.now()+'-'+Math.random().toString(36).slice(2));
let selectedIconImage='';
const fileToIcon = async file => {
  if(!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size>3_000_000)throw Error('Kies een PNG, JPG, WebP of GIF van maximaal 3 MB.');
  const bitmap=await createImageBitmap(file);
  const canvas=document.createElement('canvas'),side=96;
  canvas.width=side;canvas.height=side;
  const ctx=canvas.getContext('2d');
  const scale=Math.min(side/bitmap.width,side/bitmap.height);
  const w=bitmap.width*scale,h=bitmap.height*scale;
  ctx.drawImage(bitmap,(side-w)/2,(side-h)/2,w,h);
  bitmap.close();
  const result=canvas.toDataURL('image/webp',0.79);
  if(result.length>65000)throw Error('Het icoon is te groot om op te slaan.');
  return result;
};
export function faviconURL(url){
  const safe=safeUrl(url);
  if(!safe)return '';
  // Chrome's own favicon database, rather than sending every site to a third party.
  return globalThis.chrome?.runtime?.getURL
    ? chrome.runtime.getURL('_favicon/?pageUrl='+encodeURIComponent(safe)+'&size=64')
    : '';
}
export function renderIcon(iconData,klass='shortcut-icon'){
  const wrap=el('span',klass);
  const type=iconData?.iconType||'emoji';
  const fallback=()=>{wrap.replaceChildren(el('span','shortcut-emoji',iconData?.icon||'🔗'));};
  if(type==='upload'&&/^data:image\/(?:png|jpeg|webp);base64,/i.test(iconData.image||'')){
    const img=el('img','shortcut-image');img.src=iconData.image;img.alt='';img.onerror=fallback;wrap.append(img);
  } else if(type==='auto' && faviconURL(iconData.url)){
    const img=el('img','shortcut-image');img.src=faviconURL(iconData.url);img.alt='';
    img.onerror=()=>{
      if(img.dataset.fallbackTried){fallback();return;}
      img.dataset.fallbackTried='true';
      try{img.src=new URL('/favicon.ico',iconData.url).href;}catch{fallback();}
    };
    wrap.append(img);
  } else fallback();
  return wrap;
}
export function setupShortcuts({getData,save,notify}) {
  let folderId='', editingId=null, editingFolderId=null, draggingId=null;
  const data=()=>getData();
  const persist=()=>{save();render();};
  const open = (id=null) => {
    editingId=id;
    selectedIconImage='';
    const s=data().shortcuts.find(x=>x.id===id);
    const form=$('shortcutForm');form.reset();
    form.elements.name.value=s?.name||'';
    form.elements.url.value=s?.url||'';
    form.elements.icon.value=s?.icon||'🔗';
    form.elements.iconType.value=s?.iconType||'auto';
    form.elements.pinned.checked=s?.pinned===true;
    selectedIconImage=s?.image||'';
    const folders=form.elements.folderId;
    folders.replaceChildren(new Option('Geen map (Start)', ''));
    for(const f of data().folders)folders.add(new Option(f.name,f.id));
    folders.value=s?.folderId??folderId;
    $('shortcutDialogTitle').textContent=s?'Snelkoppeling bewerken':'Nieuwe snelkoppeling';
    $('shortcutError').textContent='';
    $('iconSearch').value='';
    drawIcons();
    updateIconPreview();
    $('shortcutDialog').showModal();form.elements.name.focus();
  };
  const updateIconPreview = () => {
    const f=$('shortcutForm'), mode=f.elements.iconType.value;
    $('shortcutIconPreview').replaceChildren(renderIcon({
      iconType:mode, icon:f.elements.icon.value||'🔗',
      url:safeUrl(f.elements.url.value)||'https://example.com/', image:selectedIconImage
    }));
    $('iconCatalogArea').hidden=mode!=='emoji';
    $('iconUploadArea').hidden=mode!=='upload';
  };
  const drawIcons=()=>{
    const list=$('iconCatalog');list.replaceChildren();
    const query=$('iconSearch').value.trim().toLowerCase();
    const results=ICON_LIBRARY.filter(icon=>!query||(ICON_TAGS[icon]||'').includes(query)||icon.includes(query));
    // The catalog also accepts any Unicode emoji pasted into the icon field.
    if(!results.length){
      const p=el('p','hint','Geen iconen gevonden. Je kunt ook zelf een emoji plakken.');
      list.append(p);
    }
    for(const emoji of results){
      const b=el('button','icon-choice',emoji);b.type='button';b.title='Kies '+emoji;
      b.setAttribute('aria-label','Kies icoon '+emoji);
      b.onclick=()=>{const f=$('shortcutForm');f.elements.icon.value=emoji;updateIconPreview();};
      list.append(b);
    }
  };
  const currentEntries=()=>data().shortcuts.filter(x=>(x.folderId||'')===folderId);
  const render=()=>{
    const grid=$('shortcutGrid');if(!grid)return;
    grid.replaceChildren();
    const parent=$('shortcutBread');
    parent.replaceChildren();
    const root=el('button','crumb', 'Start');root.type='button';root.onclick=()=>{folderId='';render();};parent.append(root);
    const folder=data().folders.find(x=>x.id===folderId);
    if(folder){
      parent.append(el('span','crumb-sep',' / '));
      parent.append(el('strong','crumb-name',folder.icon+' '+folder.name));
    }
    $('folderNew').hidden=data().folders.length>=40;
    $('folderEdit').hidden=!folder;
    $('folderBack').hidden=!folder;
    $('shortcutAdd').disabled=data().shortcuts.length>=300;
    if(!folder){
      for(const f of data().folders){
        const card=el('button','shortcut-card shortcut-folder');
        card.type='button';card.setAttribute('aria-label','Map '+f.name+' openen');
        card.append(el('span','shortcut-icon',f.icon),el('span','shortcut-name',f.name),
          el('span','folder-count',String(data().shortcuts.filter(x=>x.folderId===f.id).length)));
        card.onclick=()=>{folderId=f.id;render();};
        grid.append(card);
      }
    }
    for(const shortcut of currentEntries()){
      const card=el('div','shortcut-card');
      card.draggable=true;
      card.dataset.id=shortcut.id;
      card.title='Sleep om te ordenen';
      card.addEventListener('dragstart',event=>{
        draggingId=shortcut.id;
        event.dataTransfer.effectAllowed='move';
        event.dataTransfer.setData('text/plain',shortcut.id);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend',()=>{draggingId=null;card.classList.remove('dragging');});
      card.addEventListener('dragover',event=>{if(draggingId&&draggingId!==shortcut.id)event.preventDefault();});
      card.addEventListener('drop',event=>{
        event.preventDefault();
        if(!draggingId||draggingId===shortcut.id)return;
        const src=data().shortcuts.findIndex(x=>x.id===draggingId);
        const dest=data().shortcuts.findIndex(x=>x.id===shortcut.id);
        if(src<0||dest<0||data().shortcuts[src].folderId!==shortcut.folderId)return;
        const [item]=data().shortcuts.splice(src,1);
        data().shortcuts.splice(data().shortcuts.findIndex(x=>x.id===shortcut.id),0,item);
        persist();
      });
      const a=el('a','shortcut-target');a.href=shortcut.url;a.target='_self';
      a.setAttribute('aria-label',shortcut.name+' openen');a.title=shortcut.url;
      a.style.cssText='position:absolute;inset:0;border-radius:inherit;z-index:1';
      const icon=renderIcon(shortcut);
      const label=el('span','shortcut-name',shortcut.name);
      const edit=el('button','shortcut-edit','✎');edit.type='button';edit.title=shortcut.name+' bewerken';edit.style.zIndex='2';edit.onclick=()=>open(shortcut.id);
      const del=el('button','shortcut-delete','×');del.type='button';del.title='Verwijderen';del.style.zIndex='2';
      del.onclick=()=>{
        if(!confirm('Snelkoppeling “'+shortcut.name+'” verwijderen?'))return;
        data().shortcuts=data().shortcuts.filter(x=>x.id!==shortcut.id);persist();
      };
      card.append(icon,label,a,edit,del);grid.append(card);
    }
    if(!currentEntries().length&&!data().folders.length){
      const empty=el('p','empty','Nog geen snelkoppelingen. Voeg er een toe.');grid.append(empty);
    }
    $('shortcutTotal').textContent=data().shortcuts.length+' links · '+data().folders.length+' mappen';
  };
  const openFolder=(id=null)=>{
    editingFolderId=id;
    const form=$('folderForm');form.reset();
    const f=data().folders.find(x=>x.id===id);
    form.elements.name.value=f?.name||'';
    form.elements.icon.value=f?.icon||'📁';
    $('folderDelete').hidden=!f;
    $('folderTitle').textContent=f?'Map bewerken':'Map maken';
    $('folderError').textContent='';
    $('folderDialog').showModal();
  };
  const addIntegration = item => {
    const [name,url,icon]=item;
    if(data().shortcuts.some(s=>s.url===url)){notify(name+' staat al tussen je snelkoppelingen.');return;}
    if(data().shortcuts.length>=300){notify('Maximaal 300 snelkoppelingen.');return;}
    data().shortcuts.push({id:makeId(),name,url,icon,iconType:'auto',image:'',folderId,pinned:false});
    persist();notify(name+' toegevoegd.');
  };
  async function importBookmarks() {
    const allowed=await chrome.permissions.request({permissions:['bookmarks']});
    if(!allowed){notify('Toegang tot bladwijzers is geweigerd.');return;}
    if(!globalThis.chrome?.bookmarks){notify('Bladwijzers zijn niet beschikbaar.');return;}
    const trees=await chrome.bookmarks.getTree();
    let added=0;
    const existing=new Set(data().shortcuts.map(x=>x.url));
    const visit=(node,section)=>{
      if(data().shortcuts.length>=300)return;
      let current=section;
      if(node.children && node.title && node.id!=='0' && !['1','2'].includes(node.id) && node.children.some(x=>x.url)){
        let found=data().folders.find(f=>f.name===node.title);
        if(!found&&data().folders.length<40){
          found={id:makeId(),name:node.title.slice(0,32),icon:'📁'};
          data().folders.push(found);
        }
        if(found)current=found.id;
      }
      if(node.url){
        const url=safeUrl(node.url);
        if(url&&!existing.has(url)){
          data().shortcuts.push({id:makeId(),name:(node.title||new URL(url).hostname).slice(0,32),url,
            icon:'🔗',iconType:'auto',image:'',folderId:current,pinned:false});
          existing.add(url);added++;
        }
      }
      for(const child of node.children||[])visit(child,current);
    };
    if(!confirm('Bladwijzers importeren? Er worden maximaal 300 links lokaal toegevoegd.'))return;
    trees.forEach(node=>visit(node,''));
    persist();notify(added+' bladwijzers geïmporteerd.');
  }
  const bind=()=>{
    $('shortcutAdd').addEventListener('click',()=>open());
    $('folderNew').addEventListener('click',()=>openFolder());
    $('folderEdit').addEventListener('click',()=>openFolder(folderId));
    $('folderBack').addEventListener('click',()=>{folderId='';render();});
    $('shortcutForm').addEventListener('submit',event=>{
      event.preventDefault();
      const f=event.currentTarget;
      const name=f.elements.name.value.trim(),url=safeUrl(f.elements.url.value);
      if(!name||!url){$('shortcutError').textContent='Vul een naam en een geldige https/http-link in.';return;}
      const iconType=f.elements.iconType.value;
      if(iconType==='upload'&&!selectedIconImage){$('shortcutError').textContent='Upload eerst een icoon.';return;}
      const old=data().shortcuts.find(x=>x.id===editingId);
      const item={id:old?.id||makeId(),name:name.slice(0,32),url,icon:f.elements.icon.value.slice(0,8)||'🔗',
        iconType, image:iconType==='upload'?selectedIconImage:'',
        folderId:data().folders.some(x=>x.id===f.elements.folderId.value)?f.elements.folderId.value:'',
        pinned:f.elements.pinned.checked};
      if(old)Object.assign(old,item);
      else if(data().shortcuts.length<300)data().shortcuts.push(item);
      else{$('shortcutError').textContent='Maximaal 300 links.';return;}
      $('shortcutDialog').close();persist();notify('Snelkoppeling opgeslagen.');
    });
    $('shortcutForm').elements.iconType.addEventListener('change',updateIconPreview);
    $('shortcutForm').elements.url.addEventListener('input',updateIconPreview);
    $('shortcutForm').elements.icon.addEventListener('input',updateIconPreview);
    $('iconSearch').addEventListener('input',drawIcons);
    $('iconFile').addEventListener('change',async event=>{
      const file=event.target.files?.[0];
      event.target.value='';
      if(!file)return;
      try {selectedIconImage=await fileToIcon(file);$('shortcutError').textContent='';updateIconPreview();}
      catch(err){$('shortcutError').textContent=err.message;}
    });
    $('folderForm').addEventListener('submit',event=>{
      event.preventDefault();
      const f=event.currentTarget,name=f.elements.name.value.trim(),icon=f.elements.icon.value.trim()||'📁';
      if(!name){$('folderError').textContent='Geef de map een naam.';return;}
      const folder=data().folders.find(x=>x.id===editingFolderId);
      if(folder){folder.name=name.slice(0,32);folder.icon=icon.slice(0,8);}
      else if(data().folders.length<40)data().folders.push({id:makeId(),name:name.slice(0,32),icon:icon.slice(0,8)});
      $('folderDialog').close();persist();notify('Map opgeslagen.');
    });
    $('folderDelete').addEventListener('click',()=>{
      const folder=data().folders.find(x=>x.id===editingFolderId);
      if(!folder||!confirm('Map verwijderen? Snelkoppelingen blijven behouden en verhuizen naar Start.'))return;
      for(const x of data().shortcuts)if(x.folderId===folder.id)x.folderId='';
      data().folders=data().folders.filter(x=>x.id!==folder.id);
      folderId='';$('folderDialog').close();persist();
    });
    $('bookmarksImport').addEventListener('click',()=>importBookmarks().catch(()=>notify('Importeren mislukt.')));
    const list=$('integrationsCatalog');
    for(const app of APP_CATALOG){
      const button=el('button','integration-option');button.type='button';
      button.append(el('span','integration-emoji',app[2]),el('span','integration-name',app[0]));
      button.title='Voeg '+app[0]+' toe ('+app[3]+')';
      button.onclick=()=>addIntegration(app);
      list.append(button);
    }
    $('integrationsSearch').addEventListener('input',event=>{
      const q=event.target.value.toLowerCase();
      [...list.children].forEach((item,i)=>{
        item.hidden=!(APP_CATALOG[i][0]+' '+APP_CATALOG[i][3]).toLowerCase().includes(q);
      });
    });
  };
  return {render,open,bind};
}
