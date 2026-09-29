/* Pure simulation shared by the browser and Node tests. No build step. */
(function(root){
'use strict';
const CONFIG={duration:75,features:20,minimum:14,hitStart:.82,hitEnd:.93,swingDuration:.09,cooldown:.23};
class Game {
 constructor(random=Math.random){this.random=random;this.time=0;this.entities=[];this.events=[];this.delivered=0;this.lost=0;this.missed={critical:0,medium:0,minor:0};this.fixed=0;this.hits=0;this.returned=0;this.swing=0;this.cooldown=0;this.done=false;this.next=0;this.combo=0;this.bestCombo=0;this.phase='Входим в спринт';this.visitor=null;this.moodUntil=0;this.mood='neutral';this.effects=[];this.nextVisit=0;
 this.visits=[{at:13,role:'ТИМЛИД',line:'Тут маленькая правочка…',hint:'Темп растёт. Проверяем внимательно.',until:19},{at:30,role:'ПРОДАКТ',line:'Эти фичи уже согласовали!',hint:'Береги золотые звёзды',until:36},{at:55,role:'ТИМЛИД',line:'СРОКИ ПОДЖИМАЮТ!',hint:'До релиза 20 секунд. Все на аврал!',until:61}];
 this.waves=[{at:0,name:'Входим в спринт'},{at:20,name:'Темп растёт'},{at:40,name:'До релиза всё ближе'},{at:55,name:'Сроки поджимают'},{at:58,name:'АВРАЛ · ФИНАЛЬНЫЙ РЫВОК'}];
 const makeKinds=(count,features)=>{const kinds=Array.from({length:count},(_,i)=>i<features?'feature':'bug');for(let i=kinds.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}return kinds;};
 const kinds=makeKinds(56,14),gaps=Array.from({length:55},(_,i)=>i<10?1.15:[.62,.8,.98][i%3]);const scale=51/gaps.reduce((a,b)=>a+b,0);
 let at=1;this.schedule=kinds.map((kind,i)=>{const slot={at,kind,special:at>=30&&at<36};at+=(gaps[i]||0)*scale;return slot;});
 at=58;this.schedule.push(...makeKinds(32,6).map((kind,i)=>{const slot={at,kind,special:false};at+=i%2?.54:.36;return slot;}));
 }
 travelAt(time){
 if(time<20)return 5-3.1*time/55;
 if(time>=58)return 1.65;
 const steps=1+Math.floor((time-20)/10);
 return (5-3.1*20/55)/Math.pow(1.15,steps);
 }

 emit(type,entity){this.events.push({type,kind:entity?.kind});
 if(type==='hit'||type==='feature'){this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.mood='happy';this.moodUntil=this.time+.7;}
 if(type==='lost'||type==='miss'){this.combo=0;this.mood='surprised';this.moodUntil=this.time+1;}
 if(['hit','feature','lost','miss'].includes(type))this.effects.push({at:this.time,p:entity?.p??.85,type});
 }
 strike(){if(this.done||this.cooldown>0)return false;this.swing=CONFIG.swingDuration;this.cooldown=CONFIG.cooldown;this.emit('swing');this.collide();return true;}
 collide(){for(const e of this.entities){if(e.direction!==1||e.p<CONFIG.hitStart||e.p>CONFIG.hitEnd)continue;if(e.kind==='feature'){e.dead=true;this.lost++;this.emit('lost',e);}else{e.direction=-1;e.returnSpeed=1.2;this.hits++;this.emit('hit',e);}}this.entities=this.entities.filter(e=>!e.dead);}
 step(dt){if(this.done)return;dt=Math.min(dt,CONFIG.duration-this.time);this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);
 this.phase=[...this.waves].reverse().find(w=>w.at<=this.time)?.name||'Входим в спринт';
 while(this.nextVisit<this.visits.length&&this.visits[this.nextVisit].at<=this.time){this.visitor=this.visits[this.nextVisit++];this.emit('visitor');}
 if(this.visitor&&this.time>this.visitor.until)this.visitor=null;
 this.effects=this.effects.filter(e=>this.time-e.at<.7);
 while(this.next<this.schedule.length&&this.schedule[this.next].at<=this.time){const slot=this.schedule[this.next++];const r=this.random();this.entities.push({kind:slot.kind==='feature'?'feature':r<.18?'critical':r<.55?'medium':'minor',special:slot.special,p:0,direction:1,returns:0,travel:this.travelAt(this.time)});}
 for(const e of this.entities){if(e.direction===0){if(this.time<e.resumeAt)continue;e.direction=1;}const old=e.p;e.p+=dt*(e.direction===1?1/e.travel:-e.returnSpeed);if(e.direction===1&&this.swing>0&&old<=CONFIG.hitEnd&&e.p>=CONFIG.hitStart){e.p=Math.max(CONFIG.hitStart,Math.min(e.p,CONFIG.hitEnd));}
 if(e.direction===-1&&e.p<=0){e.travel=this.travelAt(this.time);let delay=null;
 if(e.returns===0&&!(this.time>=51&&this.time<58)&&this.random()<.3){
 const arrivals=[...this.entities.filter(other=>other!==e&&!other.dead&&other.direction>=0).map(other=>Math.max(this.time,other.resumeAt||0)+(.86-other.p)*other.travel),...this.schedule.slice(this.next).map(slot=>slot.at+.86*this.travelAt(slot.at))];
 for(let d=0;d<=4;d+=.2){const arrival=this.time+d+.86*e.travel;if(this.time+d+e.travel<CONFIG.duration&&arrivals.every(t=>Math.abs(t-arrival)>.85)){delay=d;break;}}
 }
 if(delay!==null){e.p=0;e.direction=delay?0:1;e.resumeAt=this.time+delay;e.returns++;this.returned++;this.emit('return',e);}else{e.dead=true;this.fixed++;this.emit('fixed',e);}}
 if(e.direction===1&&e.p>=1){e.dead=true;if(e.kind==='feature'){this.delivered++;this.emit('feature',e);}else{this.missed[e.kind]++;this.emit('miss',e);}}
 }
 this.entities=this.entities.filter(e=>!e.dead);if(this.swing>0)this.collide();this.swing=Math.max(0,this.swing-dt);
 if(this.time>=CONFIG.duration){this.done=true;this.emit('end');}}
 verdict(){if(this.missed.critical)return {title:'Вы уронили прод',text:'Критичный баг добрался до пользователей.'+(this.delivered<14?' И фич для релиза не хватило.':'')};if(this.delivered<14)return {title:'Релиз не состоялся',text:'Нужно сохранить минимум 14 из 20 фич. Звёзды пропускаем!'};if(this.missed.medium||this.missed.minor>2)return {title:'Релиз с ошибками',text:'Фичи доставлены, но пользователи уже пишут в поддержку.'};return {title:'Мама спасла релиз!',text:'Фичи на месте, прод стабилен. Можно пить чай.'};}
}
root.BugHunter={Game,CONFIG};if(typeof module!=='undefined')module.exports=root.BugHunter;
})(typeof globalThis!=='undefined'?globalThis:window);
