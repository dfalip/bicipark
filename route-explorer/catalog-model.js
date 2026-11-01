(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BiciParkCatalogModel=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const distance=r=>typeof r.distanceKm==='number'&&Number.isFinite(r.distanceKm)&&r.distanceKm>=0?r.distanceKm:null;
 function filter(routes,options={},favorites=[]){
  const q=normalize(options.q).trim(),max=options.max===''||options.max==null?null:Number(options.max);
  return routes.filter(r=>(!q||normalize(r.name+' '+r.modality).includes(q))&&(!options.modality||r.modality===options.modality)&&(!options.local||r.kind==='local')&&(!options.favorites||favorites.includes(r.id))&&(max===null||(Number.isFinite(max)&&max>=0&&distance(r)!==null&&distance(r)<=max))).sort((a,b)=>options.sort==='distance'?(distance(a)??Infinity)-(distance(b)??Infinity)||a.name.localeCompare(b.name):a.name.localeCompare(b.name));
 }
 return {filter,distance};
});
