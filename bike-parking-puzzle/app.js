import {LEVELS,COLORS,LABELS,cell,xy,newGame,selectBike,moveTo,
  moveDirection,movesAvailable,streetPath,undo,hint,restart,isSolved} from "./engine.js";
const $=id=>document.getElementById(id);
const ui={
  level:$("levelSelect"),chapter:$("chapterLabel"),moves:$("movesValue"),
  limit:$("movesLimit"),optimal:$("optimalValue"),parked:$("parkedValue"),
  best:$("bestValue"),board:$("board"),boardTitle:$("boardTitle"),
  spaces:$("spacesLabel"),status:$("statusText"),undo:$("undoButton"),
  hint:$("hintButton"),reset:$("resetButton"),win:$("winPanel"),
  winStars:$("winStars"),winText:$("winText"),next:$("nextLevelButton"),
  legend:$("legend"),chapters:$("chapters")
};
const KEY="bicipark-bike-parking-progress-v1";

let game=newGame(0),swipeStart=null,pendingMotion=null;
let traveling=false,travelTimer=null,headings=Array(LABELS.length).fill(0);
const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
function directionAngle(from,to,size){
 const a=xy(from,size),b=xy(to,size);
 return b.x>a.x?90:b.x<a.x?-90:b.y>a.y?180:0;
}
function rememberMotion(motion){
 const fromAngle=headings[motion.bike]??0;
 const toAngle=directionAngle(motion.from,motion.to,game.cfg.size);
 headings[motion.bike]=toAngle;
 pendingMotion={...motion,fromAngle,toAngle};
}
function queueMotion(ok){
 if(ok&&game.lastMove)rememberMotion(game.lastMove);
 return ok;
}
function cancelTravel(){
 traveling=false;
 if(travelTimer!==null)window.clearTimeout(travelTimer);
 travelTimer=null;
}
function travelPath(path){
 if(!path.length)return;
 if(path.length>game.limit-game.moves){
  game.notice="Calen "+path.length+" moviments i només en queden "+(game.limit-game.moves)+".";
  changed();return;
 }
 cancelTravel();traveling=true;
 const cells=path.slice();
 function advance(){
  if(!traveling)return;
  const next=cells.shift();
  if(!queueMotion(moveTo(game,next))){
   cancelTravel();changed();return;
  }
  if(!cells.length||game.phase!=="playing")cancelTravel();
  changed();
  if(traveling)travelTimer=window.setTimeout(advance,reducedMotion?40:240);
 }
 advance();
}
function rewind(){
 cancelTravel();
 const before=game.positions.slice();
 if(undo(game)){
  const bike=before.findIndex((p,i)=>p!==game.positions[i]);
  if(bike>=0)rememberMotion({bike,from:before[bike],to:game.positions[bike]});
 }
 changed();
}
function moveSelected(direction){
 if(game.phase!=="playing"||game.selected===null)return;
 if(!queueMotion(moveDirection(game,direction)))
  game.notice="La bicicleta no pot passar per aquí.";
 changed();
}
function createBikeArt(){
 const icon=document.createElement("span");
 icon.className="bike-icon";
 icon.setAttribute("aria-hidden","true");
 // Original top-down bike artwork; no external sprite dependency.
 icon.innerHTML='<svg class="cycle-top-view" viewBox="0 0 80 100" focusable="false" aria-hidden="true">'
  +'<path d="M40 25 V75" stroke="#17465a" stroke-width="7" stroke-linecap="round"/>'
  +'<path d="M23 31 H57 M29 70 H51" stroke="#133d4b" stroke-width="6" stroke-linecap="round"/>'
  +'<ellipse cx="40" cy="15" rx="10" ry="14" fill="#153b49" stroke="#e1f9ed" stroke-width="3"/>'
  +'<ellipse cx="40" cy="86" rx="11" ry="13" fill="#153b49" stroke="#e1f9ed" stroke-width="3"/>'
  +'<path d="M39 33 L53 51 L40 69 L27 51 Z" fill="none" stroke="#fff9d5" stroke-width="5"/>'
  +'<path d="M26 45 L53 60" stroke="#153b49" stroke-width="5" stroke-linecap="round"/>'
  +'<ellipse cx="40" cy="49" rx="11" ry="14" fill="#17465a"/>'
  +'<ellipse cx="40" cy="48" rx="6" ry="8" fill="#e8ffee"/></svg>';
 return icon;
}
function playMoveAnimation(oldRect,motion){
 if(!motion||reducedMotion||!oldRect||oldRect.width===0)return;
 const to=ui.board.querySelector('[data-pos="'+motion.to+'"]');
 const rider=to?.querySelector(".bike"),nextRect=to?.getBoundingClientRect();
 if(!rider||!nextRect||!nextRect.width)return;
 const ghost=rider.cloneNode(true);
 ghost.classList.add("bike-drive-ghost");
 ghost.dataset.bikeIndex=String(motion.bike);
 ghost.style.setProperty("--drive-start-angle",motion.fromAngle+"deg");
 ghost.style.setProperty("--drive-end-angle",motion.toAngle+"deg");
 ghost.style.setProperty("--drive-x",(oldRect.left-nextRect.left)+"px");
 ghost.style.setProperty("--drive-y",(oldRect.top-nextRect.top)+"px");
 rider.classList.add("bike-drive-hidden");
 to.append(ghost);
 let finished=false;
 function finish(){
  if(finished)return;finished=true;ghost.remove();rider.classList.remove("bike-drive-hidden");
 }
 ghost.addEventListener("animationend",finish,{once:true});
 window.setTimeout(finish,340);
}

function loadProgress(){
  try{
    const a=JSON.parse(localStorage.getItem(KEY)||"[]");
    if(!Array.isArray(a))return Array(LEVELS.length).fill(0);
    return LEVELS.map((_,i)=>{
      const s=Number(a[i]);return Number.isInteger(s)&&s>=1&&s<=3?s:0;
    });
  }catch{return Array(LEVELS.length).fill(0);}
}
let best=loadProgress();
function saveProgress(){try{localStorage.setItem(KEY,JSON.stringify(best));}catch{/* private mode */}}
function tileLabel(pos,bike,goal,wall){
  const {x,y}=xy(pos,game.cfg.size);
  const coordinate=`fila ${y+1}, columna ${x+1}`;
  if(wall)return `Obstacle fix, ${coordinate}`;
  const park=goal!==-1?`, plaça ${LABELS[goal]}`:"";
  if(bike!==-1)return `Bicicleta ${LABELS[bike]} a ${coordinate}${park}; ${bike===game.selected?"seleccionada":"toca per seleccionar"}`;
  return `Casella lliure ${coordinate}${park}; toca per moure la bici seleccionada`;
}
function applySelection(pos){
  if(game.phase!=="playing"||traveling)return;
  const bike=game.positions.indexOf(pos);
  if(bike>=0){
    selectBike(game,bike);
  }else if(game.selected!==null){
    const path=streetPath(game,pos);
    if(path===null)game.notice="No hi ha cap carrer lliure fins a aquesta casella.";
    else if(path.length>1){travelPath(path);return;}
    else if(path.length===1)queueMotion(moveTo(game,pos));
    else game.notice="La bicicleta ja és en aquesta casella.";
  }else{
    game.notice="Primer selecciona una bicicleta; després, toca el carrer on vols anar.";
  }
  changed();
}
function swipeDirection(dx,dy){
  if(Math.abs(dx)<22&&Math.abs(dy)<22)return null;
  return Math.abs(dx)>Math.abs(dy)?dx>0?"right":"left":dy>0?"down":"up";
}
function renderBoard(){
  const motion=pendingMotion;pendingMotion=null;
  const previous=motion?ui.board.querySelector('[data-pos="'+motion.from+'"]'):null;
  const baseRect=previous?.getBoundingClientRect();
  const currentSprite=motion?ui.board.querySelector('.bike-drive-ghost[data-bike-index="'+motion.bike+'"]'):null;
  const movingRect=currentSprite?.getBoundingClientRect();
  const oldRect=movingRect?.width>0&&baseRect?.width>0
    ?{left:movingRect.left-baseRect.width*.125,top:movingRect.top-baseRect.height*.125,
      width:baseRect.width}:baseRect;
  // Preserve keyboard focus when rebuilding the board; ignore external controls.
  const focused=ui.board.contains(document.activeElement)?
    document.activeElement.closest("button[data-pos]"):null;
  const focusedPos=focused?Number(focused.dataset.pos):null;
  const cfg=game.cfg,walls=new Set(cfg.walls);
  const occupied=new Map(game.positions.map((p,i)=>[p,i]));
  const targets=new Map(cfg.goals.map((p,i)=>[p,i]));
  const options=new Set(game.selected===null?[]:movesAvailable(game,game.selected).map(m=>m.to));
  ui.board.replaceChildren();
  ui.board.style.setProperty("--board-size",String(cfg.size));
  for(let pos=0;pos<cfg.size*cfg.size;pos++){
    const wall=walls.has(pos),bike=occupied.get(pos)??-1,goal=targets.get(pos)??-1;
    const tile=document.createElement("button");
    tile.type="button";
    tile.className="tile";
    tile.classList.add(wall?(pos%4===0?"tile-park":"tile-building"):"tile-street");
    tile.dataset.pos=String(pos);
    tile.setAttribute("aria-label",tileLabel(pos,bike,goal,wall));
    if(wall){
      tile.classList.add("tile-wall");tile.disabled=true;
    }else{
      if(goal>=0){
        tile.classList.add("tile-goal");
        tile.style.setProperty("--bike-color",COLORS[goal]);
        const ring=document.createElement("span");ring.className="goal-ring";
        ring.setAttribute("aria-hidden","true");tile.append(ring);
        const letter=document.createElement("span");letter.className="goal-label";
        letter.setAttribute("aria-hidden","true");letter.textContent=LABELS[goal];
        tile.append(letter);
      }
      if(options.has(pos))tile.classList.add("tile-possible");
      if(bike>=0){
        tile.style.setProperty("--bike-color",COLORS[bike]);
        if(bike===game.selected)tile.classList.add("tile-selected");
        if(cfg.goals[bike]===pos)tile.classList.add("tile-parked");
        const box=document.createElement("span");box.className="bike";
        box.style.setProperty("--bike-heading",(headings[bike]??0)+"deg");
        const icon=createBikeArt();
        const letter=document.createElement("span");letter.className="bike-letter";
        letter.setAttribute("aria-hidden","true");letter.textContent=LABELS[bike];
        box.append(icon,letter);tile.append(box);
        tile.setAttribute("aria-pressed",String(bike===game.selected));
      }
      tile.addEventListener("click",()=>applySelection(pos));
      tile.addEventListener("pointerdown",event=>{
        if(traveling||event.button!=null&&event.button!==0)return;
        if(bike<0)return;
        swipeStart={id:event.pointerId,pos,bike,x:event.clientX,y:event.clientY};
      });
      tile.addEventListener("pointerup",event=>{
        if(!swipeStart||swipeStart.id!==event.pointerId)return;
        const d=swipeDirection(event.clientX-swipeStart.x,event.clientY-swipeStart.y);
        const chosen=swipeStart;swipeStart=null;
        if(!d)return;
        event.preventDefault();
        if(game.phase!=="playing"||traveling)return;
        selectBike(game,chosen.bike);
        queueMotion(moveDirection(game,d,chosen.bike));
        changed();
        // Avoid the synthetic click generated by touch immediately reselecting.
        tile.dataset.justSwiped="true";
      });
      tile.addEventListener("pointercancel",()=>{swipeStart=null;});
      tile.addEventListener("click",event=>{
        if(tile.dataset.justSwiped==="true"){
          event.stopImmediatePropagation();delete tile.dataset.justSwiped;
        }
      },true);
    }
    ui.board.append(tile);
  }
  playMoveAnimation(oldRect,motion);
  if(focusedPos!==null){
    const tiles=[...ui.board.querySelectorAll("button[data-pos]:not(:disabled)")];
    const target=tiles.find(x=>Number(x.dataset.pos)===focusedPos)||
      tiles.reduce((nearest,tile)=>!nearest||
        Math.abs(Number(tile.dataset.pos)-focusedPos)<
        Math.abs(Number(nearest.dataset.pos)-focusedPos)?tile:nearest,null);
    target?.focus({preventScroll:true});
  }
}
function renderLegend(){
  ui.legend.replaceChildren();
  for(let i=0;i<game.positions.length;i++){
    const row=document.createElement("div");row.className="legend-item";
    const mark=document.createElement("span");mark.className="legend-swatch";
    mark.style.background=COLORS[i];mark.textContent=LABELS[i];
    const text=document.createElement("span");
    text.textContent=game.positions[i]===game.cfg.goals[i]
      ?`Bici ${LABELS[i]} · ✓`:`Bici ${LABELS[i]} · pendent`;
    row.append(mark,text);ui.legend.append(row);
  }
}
function renderChapters(){
  ui.chapters.replaceChildren();
  const sections=[...new Set(LEVELS.map(l=>l.section))];
  for(const section of sections){
    const indexes=LEVELS.map((x,i)=>x.section===section?i:-1).filter(i=>i>=0);
    const count=indexes.filter(i=>best[i]>0).length;
    const entry=document.createElement("div");entry.className="chapter-row";
    const left=document.createElement("span");left.textContent=section;
    const right=document.createElement("strong");
    right.textContent=`${count}/${indexes.length} ★`;
    entry.append(left,right);ui.chapters.append(entry);
  }
}
function render(){
  ui.level.value=String(game.cfg.id);
  ui.chapter.textContent=game.cfg.section;
  ui.boardTitle.textContent=game.cfg.name;
  ui.spaces.textContent=`Places: ${game.cfg.goals.length}`;
  ui.moves.textContent=String(game.moves);
  ui.limit.textContent=String(game.limit);
  ui.optimal.textContent=String(game.optimal);
  const parked=game.positions.filter((p,i)=>p===game.cfg.goals[i]).length;
  ui.parked.textContent=`${parked} / ${game.positions.length}`;
  ui.best.textContent=best[game.cfg.id]?"★".repeat(best[game.cfg.id]):"—";
  ui.status.textContent=game.notice;
  ui.undo.disabled=traveling||game.history.length===0;
  ui.hint.disabled=traveling||game.phase!=="playing";
  ui.win.hidden=game.phase!=="won";
  if(game.phase==="won"){
    ui.winStars.textContent="★".repeat(game.stars)+"☆".repeat(3-game.stars);
    ui.winStars.setAttribute("aria-label",`${game.stars} de 3 estrelles`);
    ui.winText.textContent=`Has aparcat ${game.positions.length} bicicletes en ${game.moves} moviments! Òptim: ${game.optimal}. ${game.hints?"Has utilitzat "+game.hints+" pista(es).":"Sense pistes."}`;
    ui.next.textContent=game.cfg.id===LEVELS.length-1
      ?"TORNA AL PRIMER NIVELL ↻":"SEGÜENT REPTE →";
  }
  renderBoard();renderLegend();renderChapters();
  const choices=new Set(game.selected===null?[]:movesAvailable(game,game.selected).map(m=>m.direction));
  for(const button of document.querySelectorAll("[data-puzzle-direction]"))
   button.disabled=traveling||game.phase!=="playing"||!choices.has(button.dataset.puzzleDirection);
}
function changed(){
  if(game.phase==="won"&&game.stars>best[game.cfg.id]){
    best[game.cfg.id]=game.stars;saveProgress();
  }
  render();
}
function choose(index){
  cancelTravel();game=newGame(index);headings=Array(LABELS.length).fill(0);
  swipeStart=null;pendingMotion=null;render();
}
for(let i=0;i<LEVELS.length;i++){
  const l=LEVELS[i],option=document.createElement("option");
  option.value=String(i);option.textContent=`${String(i+1).padStart(2,"0")} · ${l.name}`;
  ui.level.append(option);
}
ui.level.addEventListener("change",()=>choose(Number(ui.level.value)));
ui.undo.addEventListener("click",rewind);
for(const button of document.querySelectorAll("[data-puzzle-direction]"))
 button.addEventListener("click",()=>moveSelected(button.dataset.puzzleDirection));
ui.hint.addEventListener("click",()=>{
  const result=hint(game);
  if(!result)game.notice="No hi ha una pista disponible. Pots desfer o reiniciar.";
  changed();
});
ui.reset.addEventListener("click",()=>{
 cancelTravel();restart(game);headings=Array(LABELS.length).fill(0);
 pendingMotion=null;changed();
});
ui.next.addEventListener("click",()=>choose((game.cfg.id+1)%LEVELS.length));
document.addEventListener("keydown",event=>{
  if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Escape","KeyZ"].includes(event.code))return;
  if(event.target instanceof HTMLElement&&
     ["INPUT","TEXTAREA","SELECT"].includes(event.target.tagName))return;
  if(event.code==="KeyZ"&&(event.ctrlKey||event.metaKey)){
    event.preventDefault();rewind();return;
  }
  if(event.code==="Escape"){
    cancelTravel();game.selected=null;game.notice="Selecció anul·lada.";changed();return;
  }
  const dirs={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
  if(traveling||!dirs[event.code]||game.selected===null)return;
  event.preventDefault();
  moveSelected(dirs[event.code]);
});
render();
