import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Main page defines every directly referenced element ID',()=>{
  const script=read('app.js')+'\n'+read('shortcuts.js')+'\n'+read('customizer.js');
  const html=read('index.html');
  const ids=[...script.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
  for(const id of new Set(ids)){
    assert.ok(html.includes('id="'+id+'"'), 'Missing id '+id+' in index.html');
  }
});
test('Popup page defines every directly referenced element ID',()=>{
  const script=read('popup.js'),html=read('popup.html');
  for(const [,id] of script.matchAll(/\$\('([^']+)'\)/g)){
    assert.ok(html.includes('id="'+id+'"'), 'Missing popup id '+id);
  }
});
test('All manifest icons exist and are PNG images',()=>{
  const manifest=JSON.parse(read('manifest.json'));
  assert.equal(manifest.manifest_version,3);
  assert.equal(manifest.version,'3.0.0');
  assert.ok(manifest.permissions.includes('favicon'));
  assert.ok(manifest.optional_permissions.includes('bookmarks'));
  for(const size of ['16','48','128']){
    const buf=readFileSync(new URL('../'+manifest.icons[size],import.meta.url));
    assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(buf.readUInt32BE(16),Number(size));
    assert.equal(buf.readUInt32BE(20),Number(size));
  }
});
test('Background, popup and UI asset references exist',()=>{
  const manifest=JSON.parse(read('manifest.json'));
  for(const path of ['index.html','popup.html','popup.css','popup.js','styles.css','studio.css',
    'shortcuts.js','customizer.js','assets/hwc-mark.svg',manifest.background.service_worker]){
    assert.ok(read(path).length>20,'Empty asset '+path);
  }
});
