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

test('Proxy URL queries official Magister afspraken API', () => {
  const url=new URL(scheduleUrl(gateway,'2026-10-05','2026-11-01'));
  assert.equal(url.origin,gateway);
  assert.equal(url.pathname,'/api/proxy/api/personen/me/afspraken');
  assert.equal(url.searchParams.get('van'),'2026-10-05');
  assert.equal(url.searchParams.get('tot'),'2026-11-01');
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

test('Fetch passes proxy key in bearer header and never in URL', async () => {
  let captured;
  const result = await downloadRoster({gateway, proxyKey:KEY}, new Date(2026,9,15), async (url, options) => {
    captured={url, options};
    return {ok:true,status:200,async json(){return {Items:[]};}};
  });
  assert.equal(result.items.length,0);
  assert.equal(captured.options.headers.Authorization, `Bearer ${KEY}`);
  assert.ok(!captured.url.includes(KEY));
  assert.equal(captured.options.redirect,'error');
  assert.equal(captured.options.credentials,'omit');
});

test('Unauthorized proxy response gives a clear error without exposing credentials', async () => {
  await assert.rejects(downloadRoster({gateway, proxyKey:KEY},new Date(),async()=>({status:401,ok:false})),/Geen toegang/);
});
