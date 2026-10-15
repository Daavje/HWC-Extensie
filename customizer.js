const $=id=>document.getElementById(id);
const SECTIONS=['roster','tasks','deadlines','notes','focus','integrations','shortcuts','search'];
export function setupCustomizer({getData,save,notify}) {
  const getSettings=()=>getData().settings;
  const apply=()=>{
    const s=getSettings();
    const root=document.documentElement;
    root.dataset.density=s.density||'comfortable';
    root.dataset.animations=s.animations===false?'off':'on';
    root.style.setProperty('--user-wallpaper',s.wallpaper?'url("'+s.wallpaper+'")':'none');
    document.body.classList.toggle('has-wallpaper',Boolean(s.wallpaper));
    for(const section of SECTIONS){
      const className={integrations:'.integrations-panel',shortcuts:'.shortcuts-section',search:'.search-box'}[section]||'.'+section+'-panel';
      const node=document.querySelector(className);
      if(node)node.hidden=s.showSections?.[section]===false;
    }
  };
  const prepare=()=>{
    const s=getSettings(),f=$('settingsForm');
    f.elements.density.value=s.density||'comfortable';
    f.elements.popupSize.value=s.popupSize||'normal';
    f.elements.animations.checked=s.animations!==false;
    for(const section of SECTIONS){
      f.elements['show-'+section].checked=s.showSections?.[section]!==false;
    }
    $('wallpaperStatus').textContent=s.wallpaper?'Eigen achtergrond ingesteld':'Standaardachtergrond';
  };
  const saveSettings=()=>{
    const f=$('settingsForm'),s=getSettings();
    s.density=f.elements.density.value;
    s.popupSize=f.elements.popupSize.value;
    s.animations=f.elements.animations.checked;
    s.showSections=Object.fromEntries(SECTIONS.map(key=>[key,f.elements['show-'+key].checked]));
    apply();
  };
  const setWallpaper=async file=>{
    if(!file || !/^image\/(png|jpeg|webp)$/.test(file.type) || file.size>8_000_000)
      throw Error('Gebruik PNG, JPG of WebP van maximaal 8 MB.');
    const bmp=await createImageBitmap(file);
    const canvas=document.createElement('canvas');
    const factor=Math.min(1,1920/bmp.width,1080/bmp.height);
    canvas.width=Math.max(1,Math.round(bmp.width*factor));
    canvas.height=Math.max(1,Math.round(bmp.height*factor));
    canvas.getContext('2d').drawImage(bmp,0,0,canvas.width,canvas.height);
    bmp.close();
    const image=canvas.toDataURL('image/jpeg',0.68);
    if(image.length>600000)throw Error('Achtergrond is nog te groot. Kies een kleinere afbeelding.');
    getSettings().wallpaper=image;
    await save();
    apply();
    $('wallpaperStatus').textContent='Eigen achtergrond ingesteld';
    notify('Achtergrond opgeslagen.');
  };
  const bind=()=>{
    $('wallpaperFile').addEventListener('change',async event=>{
      const file=event.target.files?.[0];
      event.target.value='';
      if(!file)return;
      try{await setWallpaper(file);}catch(err){$('settingsError').textContent=err.message;}
    });
    $('wallpaperRemove').addEventListener('click',async()=>{
      getSettings().wallpaper='';
      await save();apply();
      $('wallpaperStatus').textContent='Standaardachtergrond';
      notify('Achtergrond verwijderd.');
    });
  };
  return {bind,prepare,saveSettings,apply};
}
