import test from 'node:test';
import assert from 'node:assert/strict';
import {gatewayOrigin, validProxyKey, mondayOf, addDays, localDate, fetchRange, scheduleUrl, parseAppointments, downloadRoster} from '../magister.js';

const KEY = 'mag_sk_live_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234';
const gateway = 'https://rooster.example.nl';

test('Gateway must be an HTTPS origin without password, paths or parameters', () => {
  assert.equal(gatewayOrigin('https://rooster.example.nl/'), gateway);
  for (const invalid of ['http://rooster.example.nl','https://rooster.example.nl/abc','https://a:b@rooster.example.nl','https://rooster.example.nl?key=secret','javascript:alert(1)']) {
    assert.equal(gatewayOrigin(invalid), null, invalid);
  }
  assert.ok(validProxyKey(KEY));
  assert.equal(validProxyKey('Bearer hello'), false);
  assert.equal(validProxyKey(`${KEY}\nInjected: test`), false);
});

test('Fetch range covers four calendar weeks and Monday boundaries', () => {
  const mon = mondayOf(new Date(2026, 9, 15));
  assert.equal(localDate(mon),'2026-10-12');
  assert.equal(localDate(addDays(mon,-7)),'2026-10-05');
  assert.deepEqual(fetchRange(new Date(2026,9,15)),{from:'2026-10-05',to:'2026-11-01'});
});

test('Verified MCP endpoint replaces invalid /personen/me/afspraken endpoint', () => {
  const url=new URL(scheduleUrl(gateway,'2026-10-05','2026-11-01'));
  assert.equal(url.origin,gateway);
  assert.equal(url.pathname,'/mcp');
});

test('Appointments display subjects and homework without HTML execution', () => {
  const records=parseAppointments({Items:[
    {Id:3,Start:'2026-10-15T11:20:00+02:00',Einde:'2026-10-15T12:05:00+02:00',Omschrijving:'Scheikunde',Vakken:[{Naam:'SK'}],Lokalen:[{Naam:'B204'}],Inhoud:'<b>Leer</b> &amp; oefen'},
    {Id:3,Start:'2026-10-15T11:20:00+02:00',Einde:'2026-10-15T12:05:00+02:00',Omschrijving:'Dubbel'},
    {Id:4,Start:'ongeldig',Einde:'2026-10-15T12:05:00+02:00'}
  ]});
  assert.equal(records.length,1);
  assert.equal(records[0].title,'Scheikunde');
  assert.equal(records[0].location,'B204');
  assert.equal(records[0].homework,'Leer & oefen');
  assert.equal(parseAppointments({Items:[]}).length,0);
  assert.throws(()=>parseAppointments({Error:'not a roster'}),/geen herkenbare/);
});

test('Fetches four weeks as two verified MCP requests with secret only in header', async () => {
  const calls=[];
  const result=await downloadRoster({gateway,proxyKey:KEY},new Date(2026,9,15),async(url,options)=>{
    calls.push({url,options,body:JSON.parse(options.body)});
    return {ok:true,status:200,async json(){return {jsonrpc:'2.0',id:1,result:{
      structuredContent:{events:[],partial:false,totalCount:0}
    }}}};
  });
  assert.equal(result.items.length,0);
  assert.equal(calls.length,2);
  assert.equal(calls[0].body.params.arguments.from,'2026-10-05');
  assert.equal(calls[0].body.params.arguments.to,'2026-10-18');
  assert.equal(calls[1].body.params.arguments.from,'2026-10-19');
  assert.equal(calls[1].body.params.arguments.to,'2026-11-01');
  for(const c of calls){
    assert.equal(c.url,gateway+'/mcp');
    assert.equal(c.options.method,'POST');
    assert.equal(c.options.headers.Authorization,'Bearer '+KEY);
    assert.ok(!c.url.includes(KEY));
    assert.equal(c.options.redirect,'error');
    assert.equal(c.options.credentials,'omit');
  }
});

test('Unauthorized proxy response gives a clear error without exposing credentials', async () => {
  await assert.rejects(downloadRoster({gateway, proxyKey:KEY},new Date(),async()=>({status:401,ok:false})),/Geen toegang/);
});

test('MCP result parses Magister lesson fields used by real gateway',()=>{
 const result=parseAppointments({Items:[{
   id:2461110,start:'2026-10-20T09:30:00.0000000Z',end:'2026-10-20T10:20:00.0000000Z',
   subject:'scheikunde',description:'sk - kay - v5.sk3',location:'214',teacher:'J. Kayhan',
   homework:'Maak alle oefenopgaven over pH',statusCode:3
 }]});
 assert.equal(result.length,1);
 assert.equal(result[0].subject,'scheikunde');
 assert.equal(result[0].location,'214');
 assert.equal(result[0].homework,'Maak alle oefenopgaven over pH');
});
