(() => {
 'use strict';
 if(window.__bpPWA)return;window.__bpPWA=true;

 function mountLanguageHost(){
   if(document.querySelector('[data-bp-language-switcher]'))return;
   const host=document.createElement('span');host.setAttribute('data-bp-language-switcher','');
   const target=document.querySelector('.topbar-actions')||document.querySelector('.today-nav-links')||document.querySelector('.bike-nav > div')||document.querySelector('#bp-global-nav .bp-nav-actions')||document.querySelector('header nav');
   if(target)target.prepend(host);
 }
 function ensureI18n(){
   if(!document.querySelector('link[data-bp-i18n]')){const link=document.createElement('link');link.rel='stylesheet';link.href='/css/i18n.css?v=1';link.dataset.bpI18n='1';document.head.append(link)}
   mountLanguageHost();
   const load=(src,attr)=>new Promise(resolve=>{if(document.querySelector(`script[${attr}]`))return resolve();const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');s.onload=resolve;s.onerror=resolve;document.head.append(s)});
   load('/js/i18n.js?v=1','data-bp-i18n-core').then(()=>load('/js/i18n-bindings.js?v=1','data-bp-i18n-bindings')).then(()=>{
     if(!window.BiciParkI18n)return;
     window.BiciParkI18n.mountSwitchers();
     window.BiciParkI18n.translateDom();
     window.dispatchEvent(new CustomEvent('bicipark:language-changed',{detail:{language:window.BiciParkI18n.getLanguage()}}));
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureI18n,{once:true});else ensureI18n();

 if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
 const note=document.createElement('div');note.setAttribute('role','status');note.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;z-index:3000;background:#173d2b;color:white;padding:12px;border-radius:10px;font:14px system-ui';
 note.textContent='Sense connexió: pots consultar dades ja carregades i GPX guardats. Els mapes de fons i els càlculs necessiten Internet.';
 function update(){if(!navigator.onLine){if(!note.isConnected)document.body.append(note)}else note.remove()}
 window.addEventListener('online',update);window.addEventListener('offline',update);update();
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();const button=document.createElement('button');button.textContent='Instal·la BiciPark';button.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2000;padding:12px;background:#185b3e;color:white;border:0;border-radius:10px';button.onclick=async()=>{await e.prompt();button.remove()};document.body.append(button);window.addEventListener('appinstalled',()=>button.remove(),{once:true})});
})();
