(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.BiciParkMarketplaceStore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const KEY="bicipark.marketplace.v1";
  const CATEGORIES=["bike","components","accessories","clothing","tools","other"];
  const MODES=["sale","exchange","both"];
  const CONDITIONS=["new","excellent","good","used"];

  function cleanText(value,max=500){return String(value??"").trim().slice(0,max)}
  function num(value){if(value==null||String(value).trim()==="")return null;const n=Number(value);return Number.isFinite(n)?n:null}
  function id(){return `MK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`}

  function normalize(item={}){
    const mode=MODES.includes(item.mode)?item.mode:"sale";
    const category=CATEGORIES.includes(item.category)?item.category:"other";
    const condition=CONDITIONS.includes(item.condition)?item.condition:"good";
    const price=mode==="exchange"?null:num(item.price);
    return {
      id:cleanText(item.id,80)||id(),
      title:cleanText(item.title,90),
      category,mode,condition,price,
      city:cleanText(item.city,70),
      description:cleanText(item.description,800),
      exchangeFor:cleanText(item.exchangeFor,180),
      createdAt:item.createdAt||new Date().toISOString(),
      isMine:Boolean(item.isMine),
      favorite:Boolean(item.favorite)
    };
  }

  function validate(item){
    const n=normalize(item);const errors=[];
    if(n.title.length<3)errors.push("title");
    if((n.mode==="sale"||n.mode==="both")&&(n.price==null||n.price<0))errors.push("price");
    if((n.mode==="exchange"||n.mode==="both")&&!n.exchangeFor)errors.push("exchangeFor");
    return {valid:errors.length===0,errors,item:n};
  }

  function demo(){return [
    normalize({id:"DEMO-1",title:"Rodes gravel 700C",category:"components",mode:"sale",condition:"good",price:180,city:"Barcelona",description:"Joc de rodes per gravel, ús normal i sense cops importants.",createdAt:"2026-10-18T10:00:00Z"}),
    normalize({id:"DEMO-2",title:"Casc carretera talla M",category:"accessories",mode:"exchange",condition:"excellent",city:"Barcelona",exchangeFor:"Llum davantera de qualitat",description:"Poc ús. M'interessa canvi per llum potent per carretera.",createdAt:"2026-10-17T08:30:00Z"}),
    normalize({id:"DEMO-3",title:"Bici urbana singlespeed",category:"bike",mode:"both",condition:"used",price:320,city:"Badalona",exchangeFor:"Bici plegable",description:"Bici urbana funcional. Accepto venda o canvi per plegable.",createdAt:"2026-10-15T18:20:00Z"})
  ]}

  function read(storage){
    try{const parsed=JSON.parse(storage.getItem(KEY)||"null");if(parsed&&Array.isArray(parsed.items))return {version:1,items:parsed.items.map(normalize)}}catch(_){ }
    return {version:1,items:demo()}
  }
  function write(storage,state){storage.setItem(KEY,JSON.stringify({version:1,items:state.items.map(normalize)}));return state}
  function add(state,input){const result=validate({...input,isMine:true});if(!result.valid)return result;state.items.unshift(result.item);return {...result,state}}
  function remove(state,id){state.items=state.items.filter(x=>x.id!==id||!x.isMine);return state}
  function toggleFavorite(state,id){state.items=state.items.map(x=>x.id===id?{...x,favorite:!x.favorite}:x);return state}
  function filter(items,{query="",category="all",mode="all",favorites=false}={}){
    const q=cleanText(query,120).toLowerCase();
    return items.filter(item=>{
      if(category!=="all"&&item.category!==category)return false;
      if(mode!=="all"&&item.mode!==mode&&item.mode!=="both")return false;
      if(favorites&&!item.favorite)return false;
      if(q&&!`${item.title} ${item.description} ${item.city} ${item.exchangeFor}`.toLowerCase().includes(q))return false;
      return true;
    });
  }
  return {KEY,CATEGORIES,MODES,CONDITIONS,normalize,validate,read,write,add,remove,toggleFavorite,filter,demo};
});
