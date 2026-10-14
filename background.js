import {MAGISTER_CONFIG_KEY, MAGISTER_CACHE_KEY, MAGISTER_ALARM, downloadRoster} from './magister.js';

let inFlight = null;
async function scheduleAlarm() {
  const saved = await chrome.storage.local.get(MAGISTER_CONFIG_KEY);
  await chrome.alarms.clear(MAGISTER_ALARM);
  if (saved[MAGISTER_CONFIG_KEY]) await chrome.alarms.create(MAGISTER_ALARM, {periodInMinutes: 15});
}
async function synchronize() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const stored = await chrome.storage.local.get([MAGISTER_CONFIG_KEY, MAGISTER_CACHE_KEY]);
    const config = stored[MAGISTER_CONFIG_KEY];
    if (!config) return {ok:false, error:'Nog niet gekoppeld.'};
    try {
      const cache = await downloadRoster(config);
      // Disconnection/reconfiguration might have happened while fetch was in flight.
      const fresh = (await chrome.storage.local.get(MAGISTER_CONFIG_KEY))[MAGISTER_CONFIG_KEY];
      if (!fresh || fresh.gateway !== config.gateway || fresh.proxyKey !== config.proxyKey)
        return {ok:false, error:'Koppeling veranderd.'};
      // Never store the proxy key in the cache or expose it to the UI.
      await chrome.storage.local.set({[MAGISTER_CACHE_KEY]:cache});
      return {ok:true, count:cache.items.length, updatedAt:cache.updatedAt};
    } catch (e) {
      const fresh = (await chrome.storage.local.get(MAGISTER_CONFIG_KEY))[MAGISTER_CONFIG_KEY];
      if (!fresh || fresh.gateway !== config.gateway || fresh.proxyKey !== config.proxyKey)
        return {ok:false, error:'Koppeling veranderd.'};
      const previous = stored[MAGISTER_CACHE_KEY] || {items:[], from:'', to:'', updatedAt:null};
      await chrome.storage.local.set({[MAGISTER_CACHE_KEY]:{...previous, error:e.message}});
      return {ok:false, error:e.message};
    }
  })();
  try { return await inFlight; } finally { inFlight = null; }
}
chrome.runtime.onInstalled.addListener(() => {scheduleAlarm().catch(()=>{});});
chrome.runtime.onStartup.addListener(() => {scheduleAlarm().catch(()=>{});});
chrome.alarms.onAlarm.addListener(alarm => {if (alarm.name === MAGISTER_ALARM) synchronize().catch(()=>{});});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (message?.type === 'HWC_MAGISTER_SYNC') {
    synchronize().then(respond).catch(()=>respond({ok:false,error:'Synchroniseren mislukt.'}));
    return true;
  }
  if (message?.type === 'HWC_MAGISTER_CONFIG_CHANGED') {
    scheduleAlarm().then(synchronize).then(respond).catch(()=>respond({ok:false,error:'Koppeling kon niet starten.'}));
    return true;
  }
  if (message?.type === 'HWC_MAGISTER_DISCONNECT') {
    chrome.alarms.clear(MAGISTER_ALARM).then(()=>respond({ok:true})).catch(()=>respond({ok:false}));
    return true;
  }
  return false;
});
