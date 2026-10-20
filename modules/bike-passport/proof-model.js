(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.BiciParkBikePassportProof=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const STORE_KEY="bicipark.passport.proofs.v1";

  function clean(value,max=180){return String(value??"").trim().slice(0,max)}
  function num(value){const n=Number(value);return Number.isFinite(n)?n:null}
  function canonical(value){
    if(value===null||typeof value!=="object")return JSON.stringify(value);
    if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
    return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  async function subtle(){
    if(globalThis.crypto?.subtle)return globalThis.crypto.subtle;
    if(typeof require==="function")return require("node:crypto").webcrypto.subtle;
    throw new Error("Web Crypto unavailable");
  }
  async function sha256Hex(text){
    const data=new TextEncoder().encode(String(text));
    const digest=await (await subtle()).digest("SHA-256",data);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  function safeBikeSnapshot(bike={}){
    return {
      id:clean(bike.id,80),nickname:clean(bike.nickname,90),brand:clean(bike.brand,90),model:clean(bike.model,90),year:clean(bike.year,12),modality:clean(bike.modality,40),
      wheelSize:clean(bike.wheelSize,40),tireWidthMm:num(bike.tireWidthMm),tireType:clean(bike.tireType,40),serialHint:clean(bike.serialHint,4),odometerKm:num(bike.odometerKm),lastWorkshopDate:clean(bike.lastWorkshopDate,20)
    };
  }
  async function createProof({bike,type="registration",previousDigest="",actorRole="owner",payload={}}={}){
    const body={schema:"bicipark-bike-passport-proof-v1",bike:safeBikeSnapshot(bike),type:clean(type,60),actorRole:clean(actorRole,40),at:new Date().toISOString(),previousDigest:clean(previousDigest,128),payload};
    const digest=await sha256Hex(canonical(body));
    return {...body,digest};
  }
  async function verifyProof(proof){
    if(!proof?.digest)return false;
    const {digest,...body}=proof;
    return (await sha256Hex(canonical(body)))===digest;
  }
  async function verifyChain(state,bikeId){
    const proofs=forBike(state,bikeId),seen=new Set();let previous="";
    for(const proof of proofs){
      if(proof.schema!=="bicipark-bike-passport-proof-v1"||proof.previousDigest!==previous||seen.has(proof.digest)||!await verifyProof(proof))return false;
      seen.add(proof.digest);previous=proof.digest;
    }
    return true;
  }
  function read(storage){
    try{const parsed=JSON.parse(storage.getItem(STORE_KEY)||"null");if(parsed&&Array.isArray(parsed.proofs))return {version:1,proofs:parsed.proofs}}catch(_){ }
    return {version:1,proofs:[]};
  }
  function write(storage,state){storage.setItem(STORE_KEY,JSON.stringify({version:1,proofs:state.proofs||[]}));return state}
  function forBike(state,bikeId){return (state?.proofs||[]).filter(p=>p?.bike?.id===bikeId).sort((a,b)=>String(a.at).localeCompare(String(b.at)))}
  function latest(state,bikeId){const list=forBike(state,bikeId);return list[list.length-1]||null}
  function verificationLevel(state,bikeId){
    const list=forBike(state,bikeId);if(!list.length)return "none";
    // Local role/type claims are not authenticated external attestations.
    return "passport";
  }
  function transferPackage(bike,proof){return {schema:"bicipark-bike-transfer-v1",createdAt:new Date().toISOString(),bike:safeBikeSnapshot(bike),latestDigest:proof?.digest||null,status:"pending-recipient"}}
  return {STORE_KEY,canonical,sha256Hex,safeBikeSnapshot,createProof,verifyProof,verifyChain,read,write,forBike,latest,verificationLevel,transferPackage};
});
