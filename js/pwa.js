(() => {
 'use strict';
 if(window.__bpPWA)return;window.__bpPWA=true;
 if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
 const note=document.createElement('div');note.setAttribute('role','status');note.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;z-index:3000;background:#173d2b;color:white;padding:12px;border-radius:10px;font:14px system-ui';
 note.textContent='Sense connexió: pots consultar dades ja carregades i GPX guardats. Els mapes de fons i els càlculs necessiten Internet.';
 function update(){if(!navigator.onLine){if(!note.isConnected)document.body.append(note)}else note.remove()}
 window.addEventListener('online',update);window.addEventListener('offline',update);update();
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();const button=document.createElement('button');button.textContent='Instal·la BiciPark';button.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2000;padding:12px;background:#185b3e;color:white;border:0;border-radius:10px';button.onclick=async()=>{await e.prompt();button.remove()};document.body.append(button);window.addEventListener('appinstalled',()=>button.remove(),{once:true})});
})();
