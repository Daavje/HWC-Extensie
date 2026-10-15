import test from 'node:test';
import assert from 'node:assert/strict';
import {safeUrl,safeDate,daysUntil,formatTimer,defaultData,sanitizeData,DEFAULT_SHORTCUTS} from '../lib.js';

test('Only ordinary http(s) shortcuts are allowed',()=>{
  assert.equal(safeUrl('https://example.org/path'),'https://example.org/path');
  assert.equal(safeUrl('javascript:alert(1)'),null);
  assert.equal(safeUrl('data:text/html,hello'),null);
  assert.equal(safeUrl('file:///tmp/test'),null);
  assert.equal(safeUrl('https://user:pass@example.com'),null);
});
test('Reject invalid calendar days, including February 30',()=>{
  assert.equal(safeDate('2026-02-30'),null);
  assert.equal(safeDate('2024-02-29'),'2024-02-29');
  assert.equal(safeDate('2025-02-29'),null);
});
test('Dates are measured by calendar day, not elapsed local hours',()=>{
  assert.equal(daysUntil('2026-10-16',new Date(2026,9,15,23,58)),1);
  assert.equal(daysUntil('2026-10-14',new Date(2026,9,15,0,2)),-1);
});
test('Time formatting',()=>{assert.equal(formatTimer(1500),'25:00');assert.equal(formatTimer(9),'00:09');assert.equal(formatTimer(-3),'00:00');});
test('Defaults preserve original links',()=>{
  assert.equal(DEFAULT_SHORTCUTS.length,6);
  assert.equal(defaultData().shortcuts[0].url,'https://hermannwesselink.magister.net/');
});
test('Imported data is validated and dangerous fields ignored',()=>{
  const result=sanitizeData({
    version:2,
    settings:{name:'Hi',theme:'invalid',focus:100000,break:0},
    shortcuts:[{name:'bad',url:'javascript:alert(1)'},{id:'ok',name:'OK',url:'https://example.com',icon:'🌐'}],
    tasks:[{title:'Task',due:'2026-02-31',done:true},{title:'',due:'2026-12-01'}],
    notes:'hello', timer:{mode:'focus',remaining:1,running:true,endAt:Date.now()+1000}
  },false);
  assert.equal(result.shortcuts.length,1);
  assert.equal(result.tasks.length,1);
  assert.equal(result.tasks[0].due,'');
  assert.equal(result.settings.theme,'system');
  assert.equal(result.settings.focus,25);
  assert.equal(result.timer.running,false);
  assert.equal(result.notes,'hello');
});

test('Folders and customizations are sanitized and survive roundtrip',()=>{
  const raw=defaultData();
  raw.folders=[{id:'math',name:'Wiskunde',icon:'📐'}];
  raw.shortcuts=[{id:'test',name:'Huiswerk',url:'https://example.org/',icon:'📚',
    iconType:'auto',folderId:'math',pinned:true}];
  raw.settings.density='compact';
  raw.settings.popupSize='large';
  raw.settings.showSections={roster:false,integrations:false};
  const clean=sanitizeData(raw);
  assert.equal(clean.folders[0].name,'Wiskunde');
  assert.equal(clean.shortcuts[0].folderId,'math');
  assert.equal(clean.shortcuts[0].pinned,true);
  assert.equal(clean.settings.density,'compact');
  assert.equal(clean.settings.popupSize,'large');
  assert.equal(clean.settings.showSections.roster,false);
  assert.equal(clean.settings.showSections.integrations,false);
  assert.equal(clean.settings.showSections.notes,true);
});
test('Invalid uploaded icons and path injection are removed',()=>{
  const data=sanitizeData({shortcuts:[{
    id:'a',name:'Safe',url:'https://example.org/',folderId:'unknown',
    iconType:'upload',image:'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
  }]});
  assert.equal(data.shortcuts[0].folderId,'');
  assert.equal(data.shortcuts[0].iconType,'auto');
  assert.equal(data.shortcuts[0].image,'');
});
test('Old shortcuts still load and max 300 are retained',()=>{
  const old={version:2,shortcuts:[{name:'Old',url:'https://example.org',icon:'📘'}]};
  assert.equal(sanitizeData(old).shortcuts[0].icon,'📘');
  const huge={shortcuts:Array.from({length:500},(_,i)=>({name:'Link'+i,url:'https://example.org/'+i}))};
  assert.equal(sanitizeData(huge).shortcuts.length,300);
});
