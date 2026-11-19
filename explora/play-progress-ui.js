import {localDay,missionForDay,readDaily,dailyStats,readBest} from './play-progress.js';
const $=id=>document.getElementById(id);
function timeLabel(seconds){
 if(!Number.isFinite(seconds))return 'Sense rècord';
 const min=Math.floor(seconds/60),s=(seconds%60).toFixed(1).padStart(4,'0');
 return min+':'+s;
}
function renderPlay(){
 const section=$('playMissions');
 if(!section)return;
 const day=localDay(),mission=missionForDay(day);
 if(!mission)return;
 const records=readDaily(window.localStorage),stats=dailyStats(records,day),
  best=readBest(window.localStorage),completed=records[day];
 $('playMissionIcon').textContent=mission.icon;
 $('playMissionTitle').textContent=mission.title;
 $('playMissionDescription').textContent=mission.description;
 $('playMissionSubtitle').textContent=mission.subtitle;
 $('playMissionStatus').textContent=completed?
  'Completat avui · '+completed.score.toLocaleString('ca-ES')+' punts':
  'Encara pendent · prova-ho avui';
 $('playMissionStatus').classList.toggle('is-complete',Boolean(completed));
 $('playMissionLink').href=mission.href;
 $('playMissionLink').textContent=completed?'Millora la teva marca':'Juga el repte del dia';
 $('playStreak').textContent=stats.streak+' dies';
 $('playWeekCount').textContent=stats.completed+' / 7';
 $('playSnowRecord').textContent=timeLabel(best.snowTime);
 $('playZombieRecord').textContent=best.zombieScore===null?'Sense rècord':best.zombieScore.toLocaleString('ca-ES')+' punts';
 $('playWeek').replaceChildren(...stats.lastSeven.map(item=>{
  const cell=document.createElement('span');cell.className='play-week-day';
  if(item.complete)cell.classList.add('is-complete');
  if(item.day===day)cell.classList.add('is-today');
  const date=new Date(item.day+'T12:00:00Z');
  cell.textContent=new Intl.DateTimeFormat('ca-ES',{weekday:'short',timeZone:'UTC'}).format(date);
  cell.title=item.day+(item.complete?' · completat':' · pendent');
  cell.setAttribute('aria-label',cell.title);
  return cell;
 }));
}
renderPlay();
window.addEventListener('pageshow',renderPlay);
window.addEventListener('storage',event=>{
 if(!event.key||event.key.startsWith('bicipark-'))renderPlay();
});
