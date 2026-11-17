import {LEVELS,COLORS,LABELS,cell,xy,newGame,selectBike,moveTo,
  moveDirection,movesAvailable,undo,hint,restart,isSolved} from "./engine.js";
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
let game=newGame(0),swipeStart=null;
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
  if(game.phase!=="playing")return;
  const bike=game.positions.indexOf(pos);
  if(bike>=0){
    selectBike(game,bike);
  }else if(game.selected!==null){
    moveTo(game,pos);
  }else{
    game.notice="Primer selecciona una bicicleta; després, la casella lliure.";
  }
  changed();
}
function swipeDirection(dx,dy){
  if(Math.abs(dx)<22&&Math.abs(dy)<22)return null;
  return Math.abs(dx)>Math.abs(dy)?dx>0?"right":"left":dy>0?"down":"up";
}
function renderBoard(){
  const cfg=game.cfg,walls=new Set(cfg.walls);
  const occupied=new Map(game.positions.map((p,i)=>[p,i]));
  const targets=new Map(cfg.goals.map((p,i)=>[p,i]));
  const options=new Set(game.selected===null?[]:movesAvailable(game,game.selected).map(m=>m.to));
  // Rebuilding the board after a keyboard move must not drop keyboard focus.
  const focusedTile = ui.board.contains(document.activeElement)
    ? document.activeElement.closest("button[data-pos]") : null;
  const focusedPos = focusedTile ? Number(focusedTile.dataset.pos) : null;
  ui.board.replaceChildren();
  ui.board.style.setProperty("--board-size",String(cfg.size));
  for(let pos=0;pos<cfg.size*cfg.size;pos++){
    const wall=walls.has(pos),bike=occupied.get(pos)??-1,goal=targets.get(pos)??-1;
    const tile=document.createElement("button");
    tile.type="button";
    tile.className="tile";
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
        const icon=document.createElement("span");icon.className="bike-icon";
        icon.setAttribute("aria-hidden","true");icon.textContent="🚲";
        const letter=document.createElement("span");letter.className="bike-letter";
        letter.setAttribute("aria-hidden","true");letter.textContent=LABELS[bike];
        box.append(icon,letter);tile.append(box);
        tile.setAttribute("aria-pressed",String(bike===game.selected));
      }
      tile.addEventListener("click",()=>applySelection(pos));
      tile.addEventListener("pointerdown",event=>{
        if(event.button!=null&&event.button!==0)return;
        if(bike<0)return;
        swipeStart={id:event.pointerId,pos,bike,x:event.clientX,y:event.clientY};
      });
      tile.addEventListener("pointerup",event=>{
        if(!swipeStart||swipeStart.id!==event.pointerId)return;
        const d=swipeDirection(event.clientX-swipeStart.x,event.clientY-swipeStart.y);
        const chosen=swipeStart;swipeStart=null;
        if(!d)return;
        event.preventDefault();
        if(game.phase!=="playing")return;
        selectBike(game,chosen.bike);
        moveDirection(game,d,chosen.bike);
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
  if(focusedPos !== null) {
    const replacement = ui.board.querySelector(`button[data-pos="${focusedPos}"]`);
    if(replacement && !replacement.disabled) replacement.focus({preventScroll:true});
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
  ui.undo.disabled=game.history.length===0;
  ui.hint.disabled=game.phase!=="playing";
  ui.win.hidden=game.phase!=="won";
  if(game.phase==="won"){
    ui.winStars.textContent="★".repeat(game.stars)+"☆".repeat(3-game.stars);
    ui.winStars.setAttribute("aria-label",`${game.stars} de 3 estrelles`);
    ui.winText.textContent=`Has aparcat ${game.positions.length} bicicletes en ${game.moves} moviments! Òptim: ${game.optimal}. ${game.hints?"Has utilitzat "+game.hints+" pista(es).":"Sense pistes."}`;
    ui.next.textContent=game.cfg.id===LEVELS.length-1
      ?"TORNA AL PRIMER NIVELL ↻":"SEGÜENT REPTE →";
  }
  renderBoard();renderLegend();renderChapters();
}
function changed(){
  if(game.phase==="won"&&game.stars>best[game.cfg.id]){
    best[game.cfg.id]=game.stars;saveProgress();
  }
  render();
}
function choose(index){
  game=newGame(index);swipeStart=null;render();
}
for(let i=0;i<LEVELS.length;i++){
  const l=LEVELS[i],option=document.createElement("option");
  option.value=String(i);option.textContent=`${String(i+1).padStart(2,"0")} · ${l.name}`;
  ui.level.append(option);
}
ui.level.addEventListener("change",()=>choose(Number(ui.level.value)));
ui.undo.addEventListener("click",()=>{undo(game);changed();});
ui.hint.addEventListener("click",()=>{
  const result=hint(game);
  if(!result)game.notice="No hi ha una pista disponible. Pots desfer o reiniciar.";
  changed();
});
ui.reset.addEventListener("click",()=>{restart(game);changed();});
ui.next.addEventListener("click",()=>choose((game.cfg.id+1)%LEVELS.length));
document.addEventListener("keydown",event=>{
  if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Escape","KeyZ"].includes(event.code))return;
  if(event.target instanceof HTMLElement&&
     ["INPUT","TEXTAREA","SELECT"].includes(event.target.tagName))return;
  if(event.code==="KeyZ"&&(event.ctrlKey||event.metaKey)){
    event.preventDefault();undo(game);changed();return;
  }
  if(event.code==="Escape"){
    game.selected=null;game.notice="Selecció anul·lada.";changed();return;
  }
  const dirs={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
  if(!dirs[event.code]||game.selected===null)return;
  event.preventDefault();
  if(!moveDirection(game,dirs[event.code]))
    game.notice="La bicicleta no pot passar per aquí.";
  changed();
});
render();
