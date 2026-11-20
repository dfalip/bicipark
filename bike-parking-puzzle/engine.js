// BiciPark Puzzle — original, deterministic grid parking puzzle.
// The solver is also the source of valid hints and minimum-move targets.
export const COLORS=Object.freeze(["#ffb255","#78e8d1","#bfa4ff","#f48fb3"]);
export const LABELS=Object.freeze(["A","B","C","D"]);
export const LEVELS=Object.freeze([
 {name:"Primers aparcaments",section:"Inici",size:4,goals:[[3,3],[0,3]],walls:[],scramble:5,seed:31},
 {name:"L'espai del mig",section:"Inici",size:4,goals:[[0,3],[3,3]],walls:[[1,1]],scramble:8,seed:44},
 {name:"Tercer en joc",section:"Inici",size:4,goals:[[3,0],[0,3],[3,3]],walls:[[1,2]],scramble:10,seed:61},
 {name:"Plaça compartida",section:"Cruïlles",size:5,goals:[[0,4],[4,4],[4,0]],walls:[[2,2]],scramble:14,seed:94},
 {name:"Dues voreres",section:"Cruïlles",size:5,goals:[[0,0],[0,4],[4,4]],walls:[[2,1],[2,3]],scramble:17,seed:118},
 {name:"Canvia de direcció",section:"Cruïlles",size:5,goals:[[0,4],[4,4],[4,0]],walls:[[1,2],[3,2]],scramble:19,seed:135},
 {name:"El passadís",section:"Colls d'ampolla",size:5,goals:[[0,0],[4,0],[4,4]],walls:[[2,0],[2,1],[2,3]],scramble:22,seed:163},
 {name:"Quatre bicicletes",section:"Colls d'ampolla",size:5,goals:[[0,4],[4,4],[0,0],[4,0]],walls:[[1,2],[3,2]],scramble:23,seed:184},
 {name:"El pati interior",section:"Colls d'ampolla",size:5,goals:[[0,4],[4,4],[0,0],[4,0]],walls:[[1,1],[3,1],[1,3],[3,3]],scramble:25,seed:199},
 {name:"Ponts estrets",section:"Mestres del pàrquing",size:5,goals:[[0,0],[4,0],[0,4],[4,4]],walls:[[2,0],[2,2],[2,4]],scramble:28,seed:223},
 {name:"Cap espai sobra",section:"Mestres del pàrquing",size:5,goals:[[0,0],[4,0],[0,4],[4,4]],walls:[[1,1],[1,3],[3,1],[3,3],[2,2]],scramble:31,seed:251},
 {name:"El repte final",section:"Mestres del pàrquing",size:5,goals:[[0,0],[4,0],[0,4],[4,4]],walls:[[0,2],[2,2],[4,2],[2,0],[2,4]],scramble:34,seed:299}
]);
export const directionNames=Object.freeze({up:"amunt",down:"avall",left:"esquerra",right:"dreta"});
const directions=Object.freeze([
 {name:"up",dx:0,dy:-1},{name:"down",dx:0,dy:1},
 {name:"left",dx:-1,dy:0},{name:"right",dx:1,dy:0}
]);
export const cell=(x,y,size)=>y*size+x;
export const xy=(pos,size)=>({x:pos%size,y:Math.floor(pos/size)});
const encode=positions=>positions.join(",");
const random=seed=>{let s=seed>>>0;return ()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};};
export function config(index=0){
  const id=Math.max(0,Math.min(LEVELS.length-1,index|0));
  const level=LEVELS[id],size=level.size;
  return {id,name:level.name,section:level.section,size,
    goals:level.goals.map(([x,y])=>cell(x,y,size)),
    walls:level.walls.map(([x,y])=>cell(x,y,size)),
    seed:level.seed,scramble:level.scramble};
}
function neighborStates(cfg,positions){
  const occupied=new Set(positions),walls=new Set(cfg.walls),out=[];
  for(let bike=0;bike<positions.length;bike++){
    const from=positions[bike],{x,y}=xy(from,cfg.size);
    for(const d of directions){
      const xx=x+d.dx,yy=y+d.dy;
      if(xx<0||xx>=cfg.size||yy<0||yy>=cfg.size)continue;
      const to=cell(xx,yy,cfg.size);
      if(walls.has(to)||occupied.has(to))continue;
      const next=positions.slice();next[bike]=to;
      out.push({positions:next,bike,from,to,direction:d.name});
    }
  }
  return out;
}
const heuristic=(cfg,positions)=>positions.reduce((sum,p,i)=>{
  const from=xy(p,cfg.size),goal=xy(cfg.goals[i],cfg.size);
  return sum+Math.abs(from.x-goal.x)+Math.abs(from.y-goal.y);
},0);
export function scramble(cfg){
  const rng=random(cfg.seed),visited=new Map();
  let positions=cfg.goals.slice(),previous="";
  visited.set(encode(positions),1);
  let chosen=positions.slice(),max=0;
  for(let step=0;step<cfg.scramble;step++){
    let choices=neighborStates(cfg,positions).filter(m=>encode(m.positions)!==previous);
    if(!choices.length)choices=neighborStates(cfg,positions);
    if(!choices.length)break;
    // Prefer moving away from goals, but avoid simply ping-ponging back.
    choices.sort((a,b)=>{
      const ha=heuristic(cfg,a.positions),hb=heuristic(cfg,b.positions);
      const wa=visited.get(encode(a.positions))||0,wb=visited.get(encode(b.positions))||0;
      return (hb*2-wb*5)-(ha*2-wa*5);
    });
    const choice=choices[Math.floor(rng()*Math.min(choices.length,3))];
    previous=encode(positions);positions=choice.positions;
    const key=encode(positions);visited.set(key,(visited.get(key)||0)+1);
    const h=heuristic(cfg,positions);
    if(h>max){max=h;chosen=positions.slice();}
  }
  return chosen;
}
function heapPush(heap,node){
  heap.push(node);let i=heap.length-1;
  while(i>0){const parent=(i-1)>>1;
    if(heap[parent].f<node.f||(heap[parent].f===node.f&&heap[parent].g<=node.g))break;
    heap[i]=heap[parent];i=parent;
  }
  heap[i]=node;
}
function heapPop(heap){
  const top=heap[0],last=heap.pop();if(!heap.length)return top;
  let i=0;
  while(true){const left=i*2+1,right=left+1;if(left>=heap.length)break;
    const child=right<heap.length&&
      (heap[right].f<heap[left].f||(heap[right].f===heap[left].f&&heap[right].g<heap[left].g))
      ?right:left;
    if(last.f<heap[child].f||(last.f===heap[child].f&&last.g<=heap[child].g))break;
    heap[i]=heap[child];i=child;
  }
  heap[i]=last;return top;
}
export function solve(cfg,start,limit=150000){
  if(!Array.isArray(start)||start.length!==cfg.goals.length)return null;
  const startKey=encode(start),goalKey=encode(cfg.goals);
  if(startKey===goalKey)return [];
  const heap=[],cost=new Map([[startKey,0]]),previous=new Map();
  heapPush(heap,{positions:start.slice(),key:startKey,g:0,f:heuristic(cfg,start)});
  let examined=0;
  while(heap.length && examined++<limit){
    const current=heapPop(heap);
    if(current.g!==(cost.get(current.key)))continue;
    if(current.key===goalKey){
      const result=[];let key=current.key;
      while(key!==startKey){
        const edge=previous.get(key);
        if(!edge)return null;
        result.push(edge.move);key=edge.before;
      }
      return result.reverse();
    }
    for(const move of neighborStates(cfg,current.positions)){
      const key=encode(move.positions),g=current.g+1;
      if(g>=(cost.get(key)??Infinity))continue;
      cost.set(key,g);
      previous.set(key,{before:current.key,move:{
        bike:move.bike,from:move.from,to:move.to,direction:move.direction
      }});
      heapPush(heap,{positions:move.positions,key,g,f:g+heuristic(cfg,move.positions)});
    }
  }
  return null;
}
export function isSolved(game){return game.positions.every((p,i)=>p===game.cfg.goals[i]);}
export function movesAvailable(game,bike){
  if(!Number.isInteger(bike)||bike<0||bike>=game.positions.length)return [];
  return neighborStates(game.cfg,game.positions).filter(x=>x.bike===bike);
}
// A rider can follow existing connected streets in one gesture. This is
// strictly a shortest route through free cells; no teleporting or ignored
// occupancy. Every visited cell is still one original engine move.
export function streetPath(game,to,bike=game.selected){
  if(game.phase!=="playing"||!Number.isInteger(bike)||
     bike<0||bike>=game.positions.length||
     !Number.isInteger(to)||to<0||to>=game.cfg.size**2)return null;
  const from=game.positions[bike];
  if(from===to)return [];
  const blocked=new Set([...game.cfg.walls,
    ...game.positions.filter((_,index)=>index!==bike)]);
  if(blocked.has(to))return null;
  const size=game.cfg.size,queue=[from],parent=new Map([[from,null]]);
  for(let head=0;head<queue.length&&!parent.has(to);head++){
    const pos=queue[head],{x,y}=xy(pos,size);
    for(const d of directions){
      const xx=x+d.dx,yy=y+d.dy;
      if(xx<0||xx>=size||yy<0||yy>=size)continue;
      const candidate=cell(xx,yy,size);
      if(blocked.has(candidate)||parent.has(candidate))continue;
      parent.set(candidate,pos);queue.push(candidate);
    }
  }
  if(!parent.has(to))return null;
  const result=[];
  for(let pos=to;pos!==from;pos=parent.get(pos))result.push(pos);
  return result.reverse();
}
export function newGame(index=0){
  const cfg=config(index),positions=scramble(cfg);
  const solution=solve(cfg,positions);
  if(!solution || !solution.length)throw Error("Level is unsolvable or trivial: "+cfg.id);
  const extra=cfg.id<3?3:cfg.id<8?4:5;
  return {cfg,positions,initial:positions.slice(),selected:null,
    history:[],moves:0,limit:solution.length+extra,optimal:solution.length,
    hints:0,phase:"playing",notice:"Selecciona una bicicleta i busca el seu aparcament!",
    lastMove:null,stars:0};
}
export function selectBike(g,bike){
  if(g.phase!=="playing"||bike<0||bike>=g.positions.length)return false;
  g.selected=bike;g.notice="Bici "+LABELS[bike]+" seleccionada. Mou-la fins al seu aparcament.";
  return true;
}
export function moveTo(g,to,bike=g.selected){
  if(g.phase!=="playing")return false;
  if(!Number.isInteger(bike)||!Number.isInteger(to))return false;
  const option=movesAvailable(g,bike).find(m=>m.to===to);
  if(!option){g.notice="Moviment bloquejat! Busca un espai lliure.";return false;}
  if(g.moves>=g.limit){
    g.notice="Has esgotat els moviments. Desfés una jugada o reinicia.";
    return false;
  }
  g.history.push({positions:g.positions.slice(),selected:g.selected});
  g.positions=option.positions;g.moves++;
  g.selected=bike;g.lastMove={bike,from:option.from,to,direction:option.direction};
  if(isSolved(g)){
    g.phase="won";
    g.stars=(g.hints===0&&g.moves<=g.optimal)?3:
      g.moves<=g.optimal+2?2:1;
    g.notice="TOTES LES BICICLETES APARCADES! "+ "★".repeat(g.stars);
  }else if(g.moves>=g.limit){
    g.notice="Cap moviment lliure: desfés, consulta una pista o reinicia.";
  }else{
    g.notice="Moviment "+g.moves+"/"+g.limit+" · planifica el següent!";
  }
  return true;
}
export function moveDirection(g,direction,bike=g.selected){
  const option=movesAvailable(g,bike).find(m=>m.direction===direction);
  return option?moveTo(g,option.to,bike):false;
}
export function undo(g){
  const prev=g.history.pop();if(!prev)return false;
  g.positions=prev.positions;g.selected=prev.selected;
  g.moves=Math.max(0,g.moves-1);g.phase="playing";g.stars=0;g.lastMove=null;
  g.notice="Últim moviment desfet.";return true;
}
export function hint(g){
  if(g.phase!=="playing")return null;
  const solution=solve(g.cfg,g.positions);
  if(!solution || !solution.length)return null;
  const next=solution[0];g.selected=next.bike;g.hints++;
  g.notice="Pista: mou la bici "+LABELS[next.bike]+" cap a "+directionNames[next.direction]+".";
  return next;
}
export function restart(g){
  g.positions=g.initial.slice();g.selected=null;g.history=[];
  g.moves=0;g.hints=0;g.phase="playing";g.stars=0;g.lastMove=null;
  g.notice="Torna a intentar-ho! Troba la millor estratègia.";return g;
}
