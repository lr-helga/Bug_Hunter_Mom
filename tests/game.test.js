const test=require('node:test');
const assert=require('node:assert/strict');
const {Game,CONFIG}=require('../src/game.js');
function advance(g,seconds){for(let n=0;n<Math.ceil(seconds*120);n++)g.step(1/120);}
test('75-second unattended round delivers exactly 20 features and ends',()=>{const g=new Game(()=>.5);advance(g,76);assert.equal(g.done,true);assert.equal(g.delivered,20);assert.equal(g.missed.medium,68);assert.equal(g.entities.length,0);assert.equal(g.time,75);});
test('strike only affects hit zone; feature loss has no extra penalty',()=>{const g=new Game();g.entities=[{kind:'feature',p:.85,direction:1},{kind:'minor',p:.3,direction:1}];assert.equal(g.strike(),true);assert.equal(g.lost,1);assert.equal(g.delivered,0);assert.equal(g.entities.length,1);assert.equal(g.entities[0].direction,1);assert.equal(g.strike(),false);});
test('bug can return once, then must be fixed',()=>{const g=new Game(()=>0);g.schedule=[];g.entities=[{kind:'critical',p:.85,direction:1,travel:4,returns:0}];g.strike();advance(g,1);assert.equal(g.returned,1);assert.equal(g.entities[0].direction,1);while(g.entities[0].p<.84)g.step(1/120);g.strike();advance(g,1);assert.equal(g.fixed,1);assert.equal(g.returned,1);assert.equal(g.entities.length,0);});
test('verdict thresholds and critical priority',()=>{const g=new Game();g.delivered=13;assert.equal(g.verdict().title,'Релиз не состоялся');g.delivered=14;g.missed.minor=2;assert.equal(g.verdict().title,'Мама спасла релиз!');g.missed.minor=3;assert.equal(g.verdict().title,'Релиз с ошибками');g.delivered=0;g.missed.critical=1;assert.equal(g.verdict().title,'Вы уронили прод');});
test('last moment return is fixed instead of creating a bug past deadline',()=>{const g=new Game(()=>0);g.schedule=[];g.time=74;g.entities=[{kind:'minor',p:.001,direction:-1,returnSpeed:1.2,travel:4,returns:0}];g.step(.01);assert.equal(g.fixed,1);assert.equal(g.returned,0);});
test('timed player can save every feature and prevent every bug',()=>{const g=new Game(()=>.5);while(!g.done){if(g.entities.some(e=>e.direction===1&&e.kind!=='feature'&&e.p>=.84&&e.p<=.9))g.strike();g.step(1/120);}assert.equal(g.delivered,20);assert.equal(g.lost,0);assert.deepEqual(g.missed,{critical:0,medium:0,minor:0});assert.equal(g.verdict().title,'Мама спасла релиз!');});

test('waves keep exactly 20 features and have varied cadence',()=>{const g=new Game();assert.equal(g.schedule.filter(e=>e.kind==='feature').length,20);assert.ok(g.travelAt(0)>g.travelAt(25));assert.ok(g.travelAt(25)>g.travelAt(50));assert.ok(g.travelAt(58)<g.travelAt(54)*.8);assert.ok(g.schedule.every((s,i)=>i===0||s.at>g.schedule[i-1].at));});
test('visitors arrive before waves and leave on schedule',()=>{const g=new Game();advance(g,13.1);assert.equal(g.visitor.role,'ТИМЛИД');assert.equal(g.phase,'Входим в спринт');advance(g,7);assert.equal(g.visitor,null);assert.equal(g.phase,'Темп растёт');});
test('combo counts saved features and hits, resets on mistakes, retains best',()=>{const g=new Game();g.emit('hit');g.emit('feature');g.emit('hit');assert.equal(g.combo,3);g.emit('lost');assert.equal(g.combo,0);assert.equal(g.bestCombo,3);g.emit('feature');g.emit('miss');assert.equal(g.combo,0);});

test('deadline warning has a supply break and fast final features arrive before end',()=>{const g=new Game();assert.equal(g.visits.find(v=>v.at===55).role,'ТИМЛИД');assert.equal(g.schedule.filter(s=>s.at>=53&&s.at<58).length,0);assert.ok(g.schedule.filter(s=>s.at>=58).every(s=>s.at+g.travelAt(s.at)<75));});

test('50 randomized rounds remain perfectly playable with precise timing',()=>{for(let seed=1;seed<=50;seed++){let value=seed;const g=new Game(()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;});while(!g.done){if(g.entities.some(e=>e.direction===1&&e.kind!=='feature'&&e.p>=.84&&e.p<=.9))g.strike();g.step(1/120);}assert.equal(g.delivered,20,'features, seed '+seed);assert.deepEqual(g.missed,{critical:0,medium:0,minor:0},'bugs, seed '+seed);}});

test('speed rises by 15 percent every ten seconds after 20; rush is slower',()=>{const g=new Game();assert.equal(g.travelAt(0),5);assert.equal(g.travelAt(10),5-3.1*10/55);for(const t of [20,30,40,50]){const before=t===20?5-3.1*20/55:g.travelAt(t-1);assert.ok(Math.abs(before/g.travelAt(t)-1.15)<1e-10);}assert.equal(g.travelAt(58),1.65);assert.equal(g.travelAt(74),1.65);});


test('mobile strike reaches bugs at the bat before they reach mom',()=>{
 for(const width of [292,362,562]){
  const g=new Game(()=>.5,width);
  g.entities=[{kind:'critical',p:.66,direction:1},{kind:'minor',p:.85,direction:1},{kind:'minor',p:.63,direction:1},{kind:'minor',p:.94,direction:1}];
  g.strike();
  assert.deepEqual(g.entities.map(e=>e.direction),[-1,-1,1,1]);
 }
 const desktop=new Game(()=>.5,1044);
 desktop.entities=[{kind:'critical',p:.66,direction:1}];desktop.strike();
 assert.equal(desktop.hits,0);
});

test('mobile zone handles crossing during a swing and still breaks features',()=>{
 const g=new Game(()=>.5,362);g.schedule=[];
 g.entities=[{kind:'minor',p:.63,direction:1,travel:1.65},{kind:'feature',p:.75,direction:1,travel:1.65}];
 g.strike();assert.equal(g.lost,1);g.step(.03);
 assert.equal(g.hits,1);assert.equal(g.entities[0].direction,-1);
});

test('resizing updates hit detection without resetting the round',()=>{
 const g=new Game(()=>.5);g.schedule=[];g.time=30;g.delivered=7;
 g.entities=[{kind:'critical',p:.66,direction:1}];g.setFieldWidth(362);g.strike();
 assert.equal(g.hits,1);assert.equal(g.time,30);assert.equal(g.delivered,7);
 g.setFieldWidth(1044);g.cooldown=0;g.entities=[{kind:'minor',p:.66,direction:1}];g.strike();assert.equal(g.hits,1);
});
