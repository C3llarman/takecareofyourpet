/* ================= Elven Hunter 3D ================= */
var cvs=document.getElementById('gl'), hud=document.getElementById('hud'), hx=hud.getContext('2d');
var ui=document.getElementById('ui');
/* three.js does the drawing; the game, HUD and input are unchanged */
var R3=null;
try{ R3=new THREE.WebGLRenderer({canvas:cvs,antialias:true,alpha:false,powerPreference:'high-performance'}); }catch(e){ R3=null; }
if(!R3){ document.body.innerHTML='<div style="color:#e8c26a;font:16px Georgia,serif;padding:30px">This device cannot run WebGL 2.</div>'; }
var SCENE=null, CAM3=null, SKY=null, WORLDMAT=null, CHARMAT=null, SHADMAT=null;
var W=0,H2=0,DPR=1,WORLD=null;
var proj=m4(), view=m4(), model=m4(), tmp=m4();

/* ---------- data ---------- */
var RACES={
  elf:{name:'Elf',hp:-8,move:1.14,melee:1.0,ranged:1.2,xp:1.0,skin:SKIN.elf,hair:HAIR.blonde,ears:1,
    desc:'Fleet and keen-eyed. Faster, deadlier at range.'},
  human:{name:'Human',hp:8,move:1.0,melee:1.06,ranged:1.06,xp:1.14,skin:SKIN.human,hair:HAIR.brown,
    desc:'Adaptable. Learns faster than anyone.'},
  dwarf:{name:'Dwarf',hp:34,move:0.92,melee:1.2,ranged:0.9,xp:1.0,skin:SKIN.dwarf,hair:HAIR.red,beard:1,scale:0.82,
    desc:'Stout and stubborn. Hits like a falling tree.'}
};
var CLASSES={
  warrior:{name:'Warrior',hp:150,melee:1.5,ranged:0.75,cd:0.62,weapon:'axe',proj:'axe',
    tunic:[0.52,0.44,0.36],cloak:[0.46,0.20,0.17],metal:[0.76,0.78,0.82],pauldron:[0.68,0.70,0.74],
    desc:'Wades in. Cleaves. Throws the axe when he must.'},
  rogue:{name:'Rogue',hp:112,melee:1.05,ranged:1.2,cd:0.34,weapon:'sword',proj:'arrow',
    tunic:[0.34,0.48,0.26],cloak:[0.20,0.33,0.17],metal:[0.82,0.84,0.86],pauldron:[0.46,0.33,0.19],
    desc:'Bow first, blade second, always moving.'},
  wizard:{name:'Wizard',hp:90,melee:0.6,ranged:1.35,cd:0.52,weapon:'staff',proj:'bolt',
    tunic:[0.30,0.34,0.62],cloak:[0.20,0.22,0.46],metal:[0.78,0.80,0.88],pauldron:[0.42,0.46,0.74],
    desc:'Frail. Bolts that split, freeze and burst.'}
};
var SKILLS={
  shared:[{id:'vigor',n:'Vigor',r:8,t:0,d:'+15 max health per rank'},
          {id:'swift',n:'Swiftfoot',r:5,t:0,d:'+6% movement per rank'},
          {id:'comp',n:'Companionship',r:3,t:2,d:'+1 follower per rank'}],
  warrior:[{id:'iron',n:'Ironbark Skin',r:3,t:0,d:'+22 max health per rank'},
           {id:'cleave',n:'Cleaving Blows',r:3,t:0,d:'+16% melee damage per rank'},
           {id:'wall',n:'Shield Wall',r:2,t:2,d:'Take 12% less damage per rank'},
           {id:'blood',n:'Bloodthirst',r:2,t:3,d:'Heal 9% of melee damage per rank'},
           {id:'whirl',n:'Whirlwind',r:1,t:5,d:'Your swing hits every foe around you'}],
  rogue:[{id:'fletch',n:'Fletcher',r:3,t:0,d:'+16% ranged damage per rank'},
         {id:'quick',n:'Quickdraw',r:3,t:0,d:'+12% attack speed per rank'},
         {id:'twin',n:'Twin Shot',r:2,t:2,d:'+1 arrow per shot per rank'},
         {id:'pierce',n:'Piercing Shot',r:2,t:3,d:'Shots pass through 1 more foe per rank'},
         {id:'dash',n:'Shadowstep',r:1,t:5,d:'Unlocks a dash that slips through danger'}],
  wizard:[{id:'arcane',n:'Arcane Power',r:3,t:0,d:'+18% bolt damage per rank'},
          {id:'burst',n:'Detonation',r:2,t:0,d:'Bolts burst for area damage'},
          {id:'frost',n:'Frostbite',r:2,t:2,d:'Bolts slow what they hit'},
          {id:'fork',n:'Forked Bolt',r:2,t:3,d:'+1 bolt per cast per rank'},
          {id:'ley',n:'Leyline Study',r:2,t:5,d:'+25% experience per rank'}]
};
var NAMES=['Aerin','Thalor','Nimwen','Faelor','Sylla','Bregor','Maethel','Orin','Lirael','Erith','Hathor','Yrsa','Caelin','Rowan','Idris','Tamsin'];
var ALLYKIND=[
  {k:'ranger',n:'Ranger',hp:70,dmg:13,range:22,rate:1.1,weapon:'bow',tunic:[0.26,0.36,0.22],cloak:[0.22,0.32,0.18],hair:HAIR.blonde},
  {k:'blade',n:'Blade',hp:96,dmg:17,range:2.4,rate:0.8,weapon:'sword',tunic:[0.30,0.30,0.26],cloak:[0.24,0.22,0.20],hair:HAIR.brown},
  {k:'knight',n:'Knight',hp:165,dmg:12,range:2.6,rate:1.0,weapon:'sword',taunt:1,helm:1,tunic:[0.42,0.42,0.46],cloak:[0.34,0.18,0.18],hair:HAIR.black},
  {k:'mage',n:'Mage',hp:56,dmg:24,range:20,rate:1.6,weapon:'staff',tunic:[0.24,0.26,0.46],cloak:[0.20,0.22,0.40],hair:HAIR.white},
  {k:'druid',n:'Druid',hp:62,dmg:0,heal:9,range:0,rate:2.4,weapon:'staff',tunic:[0.28,0.38,0.26],cloak:[0.24,0.34,0.22],hair:HAIR.white},
  {k:'dwarf',n:'Dwarf',hp:124,dmg:28,range:2.6,rate:1.3,weapon:'axe',beard:1,scale:0.84,tunic:[0.38,0.30,0.22],cloak:[0.30,0.24,0.18],hair:HAIR.red}
];
var FAIRYCOL=[[0.45,0.75,1.0],[1.0,0.82,0.35],[1.0,0.55,0.80],[0.55,1.0,0.60]];
var FAIRYNAME=['SWIFT — faster attacks','WRATH — +45% damage','WARD — damage halved','BLOOM — regeneration'];

/* ---------- telemetry: so fixes stop being guesswork ---------- */
var TELE={
  taps:0, hits:0, miss:0, missPts:[], fps:[], worstFrame:0, deaths:[], dmg:{}, stickGrabs:0, qual:1,
  started:Date.now(), btn:{},
  tap:function(id,x,y,hit){
    this.taps++;
    if(hit){ this.hits++; this.btn[id]=(this.btn[id]||0)+1; }
    else { this.miss++; if(this.missPts.length<40) this.missPts.push([Math.round(x),Math.round(y)]); }
  },
  frame:function(ms){ if(ms>this.worstFrame) this.worstFrame=ms; },
  hurt:function(src,amt){ this.dmg[src]=Math.round((this.dmg[src]||0)+amt); },
  died:function(lvl,src){ this.deaths.push({lvl:lvl,by:src,t:Math.round((Date.now()-this.started)/1000)}); },
  report:function(){
    var f=this.fps.slice().sort(function(a,b){return a-b;});
    var med=f.length?f[Math.floor(f.length/2)]:0, low=f.length?f[Math.floor(f.length*0.05)]:0;
    return {
      device:{ w:W, h:H2, dpr:DPR, ua:(navigator.userAgent||'').slice(0,110),
               touch:('ontouchstart' in window), vibrate:!!navigator.vibrate },
      fps:{ median:med, worst5pct:low, worstFrameMs:Math.round(this.worstFrame) },
      taps:{ total:this.taps, onButton:this.hits, missedOrCamera:this.miss, perButton:this.btn,
             stickGrabs:this.stickGrabs, missedAt:this.missPts },
      render:{ quality:Math.round(QUAL*100)/100, hudScale:HDPR, safeBottom:SAFEB,
               worldShadows:!(WORLD&&!WORLD.castShadow), models:MODELS_READY, actors:ACTOR_OF.size },
      combat:{ damageTakenBy:this.dmg, deaths:this.deaths, kills:G.killed, freed:G.freed,
               level:G.player?G.player.level:0 },
      build:{ race:G.build.race, cls:G.build.cls, skills:G.build.skills },
      playedSec:Math.round((Date.now()-this.started)/1000)
    };
  }
};

/* ---------- state ---------- */
var G={
  state:'title', t:0, build:{race:'elf',cls:'rogue',skills:{},points:0},
  player:null, ents:[], S:null, cam:{yaw:0.6,pitch:0.34,dist:7.0,x:0,y:0,z:0},
  msgs:[], found:{}, killed:0, freed:0, spawnT:0, hitFlash:0, best:0, tip:'', tipT:0
};
function SK(id){return G.build.skills[id]||0;}
function spentClass(){var n=0,T=SKILLS[G.build.cls];for(var i=0;i<T.length;i++)n+=SK(T[i].id);return n;}
function tree(){return SKILLS.shared.concat(SKILLS[G.build.cls]);}
function recalc(){
  var r=RACES[G.build.race], c=CLASSES[G.build.cls], S={};
  S.maxHp=Math.round(c.hp+r.hp+SK('vigor')*15+SK('iron')*22);
  S.move=6.4*r.move*(1+0.06*SK('swift'));
  S.melee=c.melee*r.melee*(1+0.16*SK('cleave'));
  S.ranged=c.ranged*r.ranged*(1+0.16*SK('fletch'))*(1+0.18*SK('arcane'));
  S.cd=c.cd*(1-0.12*SK('quick'));
  S.armor=Math.pow(0.88,SK('wall'));
  S.lifesteal=0.09*SK('blood'); S.whirl=SK('whirl')>0; S.dash=SK('dash')>0;
  S.extra=SK('twin')+SK('fork'); S.pierce=SK('pierce');
  S.burst=SK('burst')?3.0+1.4*SK('burst'):0; S.frost=SK('frost');
  S.allies=2+SK('comp'); S.xp=r.xp*(1+0.25*SK('ley'));
  S.proj=c.proj; G.S=S;
  if(G.player){var d=S.maxHp-G.player.maxHp; G.player.maxHp=S.maxHp; if(d>0)G.player.hp=Math.min(S.maxHp,G.player.hp+d);}
}
function look(race,cls,extra){
  var r=RACES[race], c=CLASSES[cls]||{};
  var L={skin:r.skin,hair:r.hair,ears:r.ears,beard:r.beard,
    tunic:c.tunic||[0.3,0.35,0.25], cloak:c.cloak||null, metal:c.metal||[0.7,0.72,0.75],
    pauldron:c.pauldron||null,
    pants:[0.30,0.27,0.25], boot:[0.33,0.22,0.14], belt:[0.40,0.28,0.16],
    sleeve:(c.tunic||[0.3,0.35,0.25]), weapon:c.weapon, gem:[0.5,0.8,1.0], quiver:cls==='rogue'?1:0};
  if(extra) for(var k in extra) L[k]=extra[k];
  return L;
}
function msg(txt,col,x,y,z,size){ G.msgs.push({txt:txt,col:col||'#f3e7c9',x:x,y:y,z:z,t:0,size:size||17}); }
function tip(s){ G.tip=s; G.tipT=3.2; }

/* ---------- entities ---------- */
function newPlayer(){
  recalc();
  var r=RACES[G.build.race];
  return {kind:'player',x:0,y:H(0,0),z:6,vy:0,yaw:0,hp:G.S.maxHp,maxHp:G.S.maxHp,
    xp:0,level:1,scale:r.scale||1,look:look(G.build.race,G.build.cls),
    walkPhase:0,speed:0,onGround:true,atkT:0,atkDur:0.42,atkKind:'melee',cdT:0,
    hurtT:0,inv:0,buff:null,buffT:0,dashT:0,dashCd:0,potions:2,coins:0,dead:false,deadT:undefined};
}
function spawnSpider(x,z,big){
  var s=big?1.12:(0.70+Math.random()*0.30);
  G.ents.push({kind:'spider',x:x,y:H(x,z),z:z,vy:0,yaw:Math.random()*6.28,scale:s,
    hp:(big?105:24)*(1+G.player.level*0.10),maxHp:(big?105:24)*(1+G.player.level*0.10),
    dmg:(big?12:6.5)*Math.min(1.6,0.55+G.player.level*0.07),speed:0,walkPhase:Math.random()*6,
    look:{body:big?[0.26,0.10,0.11]:[0.20,0.13,0.12],dark:[0.13,0.09,0.09],eye:[0.95,0.25,0.18]},
    aggro:big?22:15, atkCd:0, wind:0, hurtT:0, home:{x:x,z:z}, wander:Math.random()*6.28, wanderT:0, big:big});
}
/* what you fight: all monsters, no people. Spiders, snakes in the grass (bite up
   close) and wasps (hover and fire stingers from range) */
var FOE={spider:1,snake:1,wasp:1};
function lvlHp(b){ return b*(1+G.player.level*0.10); }
function lvlDmg(b){ return b*Math.min(1.6,0.55+G.player.level*0.07); }
function spawnSnake(x,z){
  var hp=lvlHp(40);
  G.ents.push({kind:'snake',x:x,y:H(x,z),z:z,vy:0,yaw:Math.random()*6.28,scale:0.85+Math.random()*0.25,
    hp:hp,maxHp:hp,dmg:lvlDmg(9),speed:0,walkPhase:Math.random()*6,onGround:true,
    look:{body:[0.28,0.52,0.34],belly:[0.50,0.66,0.42],eye:[0.95,0.80,0.20]},
    aggro:17, atkCd:0, wind:0, hurtT:0, home:{x:x,z:z}, wander:Math.random()*6.28, wanderT:0});
}
function spawnWasp(x,z){
  var hp=lvlHp(30);
  G.ents.push({kind:'wasp',x:x,y:H(x,z),z:z,vy:0,yaw:Math.random()*6.28,scale:0.9+Math.random()*0.2,hover:1.25,
    hp:hp,maxHp:hp,dmg:lvlDmg(8),speed:0,walkPhase:Math.random()*6,onGround:true,
    look:{body:[0.12,0.10,0.08],stripe:[0.92,0.72,0.18],wing:[0.70,0.86,0.92]},
    aggro:24, atkCd:0, wind:0, hurtT:0, home:{x:x,z:z}, wander:Math.random()*6.28, wanderT:0});
}
function spawnBeast(x,z,ranged){ if(ranged) spawnWasp(x,z); else spawnSnake(x,z); }
/* where on a foe to aim: wasps fly at chest height */
function aimH(o){ return (o.kind==='wasp'?(o.hover||1.25):1.0)*(o.scale||1); }
function spawnCocoon(x,z){
  G.ents.push({kind:'cocoon',x:x,y:H(x,z),z:z,scale:1,hp:34,maxHp:34,seed:Math.random()*6,
    anchor:0,hurtT:0});
}
function spawnFairy(x,z){
  G.ents.push({kind:'fairy',x:x,y:H(x,z)+1.8,z:z,col:(Math.random()*4)|0,t:Math.random()*6,bx:0,by:0});
}
function spawnAlly(kind,x,z,name){
  var K=ALLYKIND[kind];
  G.ents.push({kind:'ally',ak:kind,name:name||NAMES[(Math.random()*NAMES.length)|0],
    x:x,y:H(x,z),z:z,vy:0,yaw:0,scale:K.scale||1,hp:K.hp,maxHp:K.hp,speed:0,walkPhase:0,onGround:true,
    look:look('human','rogue',{tunic:K.tunic,sleeve:K.tunic,cloak:K.cloak,weapon:K.weapon,hair:K.hair,
      beard:K.beard,helm:K.helm,ears:Math.random()<0.6?1:0,quiver:K.weapon==='bow'?1:0}),
    cd:Math.random(), atkT:0, atkDur:0.4, hurtT:0, cheer:1.2});
}

/* ---------- world build ---------- */
function buildWorld(){
  initProps();
  var m=terrainMesh();
  scatterWorld(m);
  LANDMARKS.length=0;
  buildTavern(m,0,-34);
  buildHive(m,-72,48);
  buildHollow(m,86,-56);
  buildStones(m,-88,-78);
  WORLD=new THREE.Mesh(toGeom(m),WORLDMAT); WORLD.frustumCulled=false;
  WORLD.castShadow=true; WORLD.receiveShadow=true;
  SCENE.add(WORLD);
  // trees, rocks and undergrowth live in chunks the camera and the sun can cull
  PROPS3=chunkMeshes(WORLDMAT);
  for(var i=0;i<PROPS3.length;i++){ SCENE.add(PROPS3[i].hi); SCENE.add(PROPS3[i].lo); }
  WORLDTRIS=m.count()/3+PROPTRIS;
}
var WORLDTRIS=0, PROPS3=[];
/* level of detail per chunk: full models near the camera, stand-ins further out,
   nothing past the fog (it would be drawn in solid fog colour anyway) */
var LOD_NEAR=58;
function cullProps(cx,cz){
  var far=133+CHUNK*0.71;
  for(var i=0;i<PROPS3.length;i++){ var ch=PROPS3[i], d=Math.hypot(ch.cx-cx,ch.cz-cz);
    ch.hi.visible=d<LOD_NEAR; ch.lo.visible=d>=LOD_NEAR&&d<far; }
}
function populate(){
  G.ents.length=0;
  var r=mulberry(4242);
  // spiders near the hollow + scattered
  for(var i=0;i<16;i++){ var a=r()*6.28,d=4+r()*16; spawnSpider(86+Math.cos(a)*d,-56+Math.sin(a)*d,r()<0.18); }
  for(var i2=0;i2<22;i2++){ var x=(r()*2-1)*WHALF*0.8, z=(r()*2-1)*WHALF*0.8;
    var dd=Math.hypot(x,z);
    if(dd<34||H(x,z)<WATER+0.5||nearTavern(x,z,32)) continue;
    spawnSpider(x,z, dd>70&&r()<0.09); }
  // wasps swarm their hive, snakes lie in the grass around it
  for(var k=0;k<13;k++){ var a2=r()*6.28,d2=3+r()*13;
    spawnBeast(-72+Math.cos(a2)*d2,48+Math.sin(a2)*d2, r()<0.45); }
  for(var k2=0;k2<8;k2++){ var gx=(r()*2-1)*WHALF*0.7, gz=(r()*2-1)*WHALF*0.7;
    if(Math.hypot(gx,gz)<40||H(gx,gz)<WATER+0.5||nearTavern(gx,gz,32)) continue; spawnBeast(gx,gz,r()<0.3); }
  // prisoners
  var spots=[[86,-56],[-72,48],[0,0],[-88,-78]];
  for(var p=0;p<14;p++){
    var sp=spots[(r()*spots.length)|0], a3=r()*6.28, d3=8+r()*22;
    var cx=sp[0]+Math.cos(a3)*d3, cz=sp[1]+Math.sin(a3)*d3;
    cx=Math.max(-WHALF*0.9,Math.min(WHALF*0.9,cx)); cz=Math.max(-WHALF*0.9,Math.min(WHALF*0.9,cz));
    if(H(cx,cz)<WATER+0.4||nearTavern(cx,cz,22)||pathDist(cx,cz)<3) continue;
    spawnCocoon(cx,cz);
  }
  for(var f=0;f<10;f++){ var fx=(r()*2-1)*WHALF*0.8, fz=(r()*2-1)*WHALF*0.8;
    if(H(fx,fz)<WATER+0.4) continue; spawnFairy(fx,fz); }
  spawnKeeper();
}
function nearTavern(x,z,r){ return Math.hypot(x-TAVERN.x,z-TAVERN.z)<r; }
/* Bram keeps the Greenleaf: rest, potions, hired blades and bounties */
function spawnKeeper(){
  var k=TAVERN.keeper; if(!k) return;
  G.ents.push({kind:'npc',name:'Bram',x:k.x,y:H(k.x,k.z),z:k.z,yaw:k.yaw,home:k.yaw,scale:1.05,speed:0,walkPhase:0,onGround:true,
    hp:1,maxHp:1,cheer:0,greeted:false,
    look:look('human','warrior',{tunic:[0.55,0.42,0.30],sleeve:[0.55,0.42,0.30],cloak:null,weapon:null,hair:HAIR.brown,beard:1})});
  if(!G.keeperColl){ collCircle(k.x,k.z,0.5); G.keeperColl=1; }
}
function keeper(){ for(var i=0;i<G.ents.length;i++) if(G.ents[i].kind==='npc') return G.ents[i]; return null; }

/* ---------- input ---------- */
var IN={mx:0,mz:0,look:{x:0,y:0},attack:false,shoot:false,shootHeld:false,jump:false,dash:false,interact:false,atkBuf:0,shotBuf:0,jumpBuf:0};
var KEY={}, touches={}, btns=[];
var SAFEB=0, SAFET=0;        // iOS reserves the strip at the bottom for its own gestures
function readSafe(){
  var cs=getComputedStyle(document.documentElement);
  var b=parseFloat(cs.getPropertyValue('--sab'))||0;
  var t=parseFloat(cs.getPropertyValue('--sat'))||0;
  SAFEB=Math.max(b,64);      // floor it: Safari's toolbar eats touches even when inset reports 0
  SAFET=Math.max(t,6);
}
function layoutButtons(){
  if(DESKTOP){ btns=[]; return; }
  var r=clamp(Math.min(W,H2)*0.105,36,56);
  var bot=H2-SAFEB-r*1.30, right=W-r*1.25;
  btns=[
    {id:'attack',x:right,       y:bot,        r:r*1.16,label:'STRIKE'},
    {id:'shoot', x:right-r*2.2, y:bot+r*0.10, r:r*0.78,label:'SHOOT'},
    {id:'jump',  x:right,       y:bot-r*2.25, r:r*0.78,label:'JUMP'},
    {id:'potion',x:W-r*0.90,    y:SAFET+r*0.60, r:r*0.58,label:''},
    {id:'skills',x:W-r*0.90,    y:SAFET+r*2.05, r:r*0.58,label:'SKILL'}
  ];
  if(G.S&&G.S.dash) btns.push({id:'dash',x:right-r*2.4,y:bot-r*2.0,r:r*0.70,label:'DASH'});
}
function hitBtn(x,y){
  var best=null,bd=1e9;
  for(var i=0;i<btns.length;i++){
    var b=btns[i], d=Math.hypot(x-b.x,y-b.y)/(b.r*1.35);
    if(d<1&&d<bd){ bd=d; best=b; }
  }
  return best;
}
function press(id){
  if(id==='attack'){ IN.attack=true; IN.atkBuf=0.45; }
  else if(id==='shoot'){ IN.shoot=true; IN.shotBuf=0.45; }
  else if(id==='jump'){ IN.jump=true; IN.jumpBuf=0.35; }
  else if(id==='dash') IN.dash=true;
  else if(id==='potion') usePotion();
  else if(id==='skills') skillScreen();
  buzz(8);
}
function ptrDown(id,x,y){
  if(G.state!=='play') return;
  var b=hitBtn(x,y);
  if(b){ touches[id]={btn:b.id}; press(b.id); TELE.tap(b.id,x,y,true); return; }
  var MG=mapGeom();
  if(Math.hypot(x-MG.x,y-MG.y)<MG.r){ SHOWKEY=!SHOWKEY; return; }   // tap the map for its key
  var stickTaken=false;
  for(var k in touches) if(touches[k].stick) stickTaken=true;
  if(!stickTaken && x<W*0.58){
    touches[id]={stick:1,sx:x,sy:y,x:x,y:y}; STICK.on=1; STICK.x=x; STICK.y=y;
    TELE.stickGrabs++;
  } else {
    touches[id]={look:1,x:x,y:y};
    TELE.tap('none',x,y,false);      // a right-side touch that was not a button: camera, or a fumbled press
  }
}
function ptrMove(id,x,y){
  var o=touches[id]; if(!o) return;
  if(o.stick){ o.x=x; o.y=y; }
  else if(o.look){
    var dyaw=-(x-o.x)*0.0075;
    G.cam.yaw+=dyaw; MREF+=dyaw;           // steering the camera steers your heading too
    G.cam.pitch=clamp(G.cam.pitch+(y-o.y)*0.005,-0.05,0.95);
    G.cam.manual=1.4;                      // pause auto-follow briefly after you steer
    o.x=x; o.y=y;
  }
}
function ptrUp(id){
  var o=touches[id];
  if(o&&o.btn==='attack') IN.attack=false;
  if(o&&o.stick) STICK.on=0;
  delete touches[id];
}
var STICK={on:0,x:0,y:0};
/* the developer overlay (fps, taps, damage) only exists with ?debug in the address */
var DEBUG=/[?&]debug\b/.test(location.search||''), SHOWDBG=false;
var MREF=0, MREFset=false;
var DESKTOP=(function(){ try{
    return !!(window.matchMedia&&window.matchMedia('(pointer:fine)').matches)&&!('ontouchstart' in window);
  }catch(e){ return false; } })();
var LOCKED=false;
function setMode(desk){
  if(DESKTOP===desk) return;
  DESKTOP=desk; layoutButtons();
  if(!desk&&document.pointerLockElement){ try{document.exitPointerLock();}catch(e){} }
}
function readStick(){
  var mx=0,mz=0;
  for(var k in touches){ var o=touches[k];
    if(o.stick){
      var R=Math.max(42,Math.min(W,H2)*0.11);
      var dx=(o.x-o.sx)/R, dy=(o.y-o.sy)/R;
      var l=Math.hypot(dx,dy);
      if(l<0.16){ dx=0; dy=0; }            // dead zone: a resting thumb does not drift
      else {
        var n=Math.min(1,(l-0.16)/0.84);
        n=n*n*(3-2*n);                      // ease in, so small pushes are precise
        dx=dx/l*n; dy=dy/l*n;
      }
      mx=dx; mz=dy; } }
  if(KEY.w||KEY.ArrowUp) mz-=1; if(KEY.s||KEY.ArrowDown) mz+=1;
  if(KEY.a||KEY.ArrowLeft) mx-=1; if(KEY.d||KEY.ArrowRight) mx+=1;
  var L=Math.hypot(mx,mz); if(L>1){mx/=L;mz/=L;}
  IN.mx=mx; IN.mz=mz;
}
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function buzz(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){} }

/* ---------- actions ---------- */
function usePotion(){
  var p=G.player; if(!p||G.state!=='play') return;
  if(p.potions<=0||p.hp>=p.maxHp) return;
  p.potions--; p.hp=Math.min(p.maxHp,p.hp+Math.round(p.maxHp*0.45));
  msg('+health','#8ff08a',p.x,p.y+2.4,p.z); buzz(20); sfx('potion');
  burst(p.x,p.y+1.2,p.z,14,[0.55,1.0,0.5],{up:3,spread:2,size:0.13,life:0.8,grav:-1.5});
}
function doAttack(){
  var p=G.player, S=G.S;
  if(p.cdT>0||p.dead) return;
  if(DESKTOP&&LOCKED) p.yaw=G.cam.yaw;
  // turn to face the nearest thing worth hitting, so a tap is never wasted on empty air
  var lock=aimTarget(p,5.4);
  if(lock) p.yaw=Math.atan2(lock.x-p.x,lock.z-p.z);
  p.cdT=0.45; p.atkT=p.atkDur=0.42; p.atkKind='melee';
  sfx('swing',p.x,p.z);
  var reach=3.6, hit=0, hitSpider=false, kills=0;
  for(var i=0;i<G.ents.length;i++){
    var e=G.ents[i];
    if(!FOE[e.kind]&&e.kind!=='cocoon') continue;
    var dx=e.x-p.x, dz=e.z-p.z, d=Math.hypot(dx,dz);
    if(d>reach+(e.scale||1)) continue;
    if(!S.whirl){
      var fx=Math.sin(p.yaw), fz=Math.cos(p.yaw);
      if((dx*fx+dz*fz)/(d||1) < -0.15) continue;   // a forgiving arc, not a narrow cone
    }
    var dmg=(10+p.level*2.6)*S.melee;
    if(e.kind==='cocoon') breakCocoon(e,dmg);
    else {
      if(e.kind==='spider') hitSpider=true;
      impact(e,dx/(d||1),dz/(d||1));
      hurtEnemy(e,dmg); if(S.lifesteal) p.hp=Math.min(p.maxHp,p.hp+dmg*S.lifesteal);
      if(e.hp<=0) kills++;
      if(e.hp>0&&d>0.01){ var kb=e.big?0.25:0.6; e.x+=dx/d*kb; e.z+=dz/d*kb; collide(e,bodyR(e)); }
    }
    hit++;
  }
  G.lock=lock||null;
  if(hit){ buzz(18); sfx(hitSpider?'squish':'hit',p.x,p.z);
    // a hit lands with weight: the world stalls for a blink and the camera jolts
    G.hitStop=Math.max(G.hitStop||0,kills?0.075:0.05); shake(kills?0.22:0.14); }
}
function aimTarget(p,maxD){
  var best=null,bs=-1;
  var fx=Math.sin(p.yaw), fz=Math.cos(p.yaw);
  for(var i=0;i<G.ents.length;i++){
    var o=G.ents[i];
    if(!FOE[o.kind]&&o.kind!=='cocoon') continue;
    var dx=o.x-p.x, dz=o.z-p.z, d=Math.hypot(dx,dz);
    if(d<0.4||d>maxD) continue;
    var dot=(dx*fx+dz*fz)/d;
    if(dot<0.30) continue;                      // generous: catches what you meant
    var score=dot*2.2-(d/maxD);
    if(score>bs){ bs=score; best=o; }
  }
  return best;
}
function doShoot(){
  var p=G.player, S=G.S;
  if(p.cdT>0||p.dead) return;
  p.cdT=S.cd; p.atkT=p.atkDur=0.34;
  p.atkKind=(S.proj==='arrow')?'bow':(S.proj==='bolt'?'cast':'throw');
  sfx(S.proj==='arrow'?'bow':(S.proj==='bolt'?'zap':'throw'),p.x,p.z);
  var n=1+S.extra, sp=(S.proj==='bolt')?30:(S.proj==='axe'?26:38);
  if(DESKTOP&&LOCKED) p.yaw=G.cam.yaw;
  var tgt=aimTarget(p,34); G.lock=tgt||null;
  var sy=p.y+1.35*p.scale;
  var aimY=0;
  if(tgt){
    var tx=tgt.x-p.x, tz=tgt.z-p.z, ty=(tgt.y+aimH(tgt))-sy;
    var hd=Math.hypot(tx,tz)||1;
    aimY=ty/hd;
    p.yaw=Math.atan2(tx,tz);                    // snap to face the target
  }
  for(var q=0;q<n;q++){
    var spread=(q-(n-1)/2)*0.075;
    var yaw=p.yaw+spread;
    var dx=Math.sin(yaw), dz=Math.cos(yaw), dy=aimY;
    var L=Math.hypot(dx,dy,dz)||1;
    G.ents.push({kind:'shot',x:p.x+dx*0.7,y:sy,z:p.z+dz*0.7,
      vx:dx/L*sp, vy:dy/L*sp, vz:dz/L*sp, life:1.9, aimed:1,
      dmg:(9+p.level*2.4)*S.ranged, pierce:S.pierce, hits:[], proj:S.proj,
      burst:S.burst, frost:S.frost, spin:0});
  }
  buzz(10);
}
function hurtEnemy(e,d,quiet){
  e.hp-=d; e.hurtT=0.18;
  if(!quiet) msg(''+Math.round(d),'#fff1d0',e.x+(Math.random()-0.5)*0.6,e.y+2.0*(e.scale||1),e.z,13);
  if(e.hp<=0){
    G.killed++; gainXp(50,e.x,e.y+2,e.z);
    bountyTick(e.kind==='spider'?(e.big?['spider','giant']:['spider']):[e.kind]);
    sfx(e.kind+'die',e.x,e.z);
    // monsters burst in a puff of ichor and dust, no blood
    burst(e.x,e.y+(e.kind==='wasp'?aimH(e):0.7*(e.scale||1)),e.z,16,ICHOR[e.kind],{up:4,spread:4,size:0.16*(e.scale||1),life:0.9});
    if(Math.random()<0.3){ G.player.coins+=3+((Math.random()*7)|0); sfx('coin'); }
    if(Math.random()<0.16){ G.player.potions++; msg('+potion','#ff9d9d',e.x,e.y+2,e.z); sfx('pickup'); }
    var i=G.ents.indexOf(e); if(i>=0) G.ents.splice(i,1);
    // leave a body that plays its death and sinks away
    G.ents.push({kind:'corpse',of:e.kind,hover:e.hover,big:e.big,x:e.x,y:e.y,z:e.z,yaw:e.yaw,scale:e.scale,
      look:e.look,t:0,deadT:0.001,speed:0,walkPhase:e.walkPhase});
  }
}
/* ---------- feel: particles, shake, hit-stop ---------- */
var FX=[], FX_MAX=320;
/* n bits flying out of (x,y,z): opt.up = upward speed, spread = sideways speed,
   size, life, grav (negative floats up), flat = dust that hugs the ground */
function burst(x,y,z,n,col,opt){
  opt=opt||{};
  for(var i=0;i<n;i++){
    if(FX.length>=FX_MAX) FX.shift();
    var a=Math.random()*6.283, sp=(opt.spread||2)*(0.3+Math.random()*0.7);
    FX.push({x:x,y:y,z:z,vx:Math.cos(a)*sp,vy:(opt.up||2)*(0.4+Math.random()*0.8)*(opt.flat?0.3:1),vz:Math.sin(a)*sp,
      t:0,life:(opt.life||0.7)*(0.6+Math.random()*0.6),size:(opt.size||0.12)*(0.6+Math.random()*0.8),
      col:[col[0]*(0.85+Math.random()*0.3),col[1]*(0.85+Math.random()*0.3),col[2]*(0.85+Math.random()*0.3)],
      grav:opt.grav===undefined?12:opt.grav, spin:Math.random()*6, flat:!!opt.flat});
  }
}
function updateFX(dt){
  for(var i=FX.length-1;i>=0;i--){ var f=FX[i];
    f.t+=dt; if(f.t>=f.life){ FX.splice(i,1); continue; }
    f.vy-=f.grav*dt; var drag=f.flat?Math.exp(-dt*5):Math.exp(-dt*1.2);
    f.vx*=drag; f.vz*=drag; f.x+=f.vx*dt; f.y+=f.vy*dt; f.z+=f.vz*dt; f.spin+=dt*8;
    var g=H(f.x,f.z); if(f.y<g+0.02){ f.y=g+0.02; f.vy*=-0.3; f.vx*=0.6; f.vz*=0.6; }
  }
}
function drawFX(){
  for(var i=0;i<FX.length;i++){ var f=FX[i], k=f.t/f.life;
    // sparks shrink away; dust swells a little first
    var s=f.size*(f.flat?(1+k*1.5)*(1-k):(1-k*k));
    if(s<0.01) continue;
    var m=mat(); m4trs(m,f.x,f.y-s*0.5,f.z,f.spin,f.spin*0.7,0,s,s,s);
    DRAW.push(['box',m,f.col]);
  }
}
function shake(a){ G.shakeA=Math.max(G.shakeA||0,a); }
/* a hit on a foe: sparks where the blow lands, and a splash of what it bleeds */
var ICHOR={spider:[0.32,0.46,0.18],snake:[0.36,0.58,0.40],wasp:[0.92,0.78,0.26]};
function impact(e,nx,nz,hy){
  var y=(hy!==undefined)?hy:e.y+aimH(e), x=e.x-nx*0.5*(e.scale||1), z=e.z-nz*0.5*(e.scale||1);
  burst(x,y,z,6,[1.0,0.92,0.62],{up:3,spread:3.5,size:0.07,life:0.3});
  burst(x,y,z,5,ICHOR[e.kind]||[0.4,0.4,0.3],{up:2.5,spread:2.5,size:0.10,life:0.6});
}
/* an arrow or axe that misses stays where it lands for a while; bolts fizzle out */
var STUCK_MAX=40;
function landShot(e,ground){
  sfx(e.proj==='bolt'&&e.kind==='shot'?'ehit':'thunk',e.x,e.z);
  if(e.proj==='bolt'&&e.kind==='shot'){ burst(e.x,e.y,e.z,10,[0.6,0.9,1.0],{up:2,spread:3,size:0.09,life:0.45}); return; }
  if(e.proj==='sting') return;
  burst(e.x,e.y,e.z,5,ground?[0.45,0.38,0.26]:[0.50,0.36,0.22],{up:1.6,spread:1.8,size:0.07,life:0.4});
  var n=0; for(var i=0;i<G.ents.length;i++) if(G.ents[i].kind==='stuck') n++;
  if(n>=STUCK_MAX) for(var j=0;j<G.ents.length;j++) if(G.ents[j].kind==='stuck'){ G.ents.splice(j,1); break; }
  var vx=e.vx, vy=e.vy, vz=e.vz;
  if(e.proj==='axe'){ var hl=Math.hypot(vx,vz)||1; vx=vx/hl; vz=vz/hl; vy=-0.6; }   // axes bite in blade-first
  G.ents.push({kind:'stuck',x:e.x,y:e.y,z:e.z,vx:vx,vy:vy,vz:vz,proj:e.proj||'arrow',enemy:e.kind==='eshot',life:7,spin:0});
}
function breakCocoon(c,d){
  c.hp-=d; c.hurtT=0.18;
  if(c.hp<=0){
    G.freed++; gainXp(100,c.x,c.y+2.4,c.z,'+100 XP — FREED'); bountyTick(['freed']);
    sfx('freed',c.x,c.z); burst(c.x,c.y+1.4,c.z,22,[0.92,0.94,0.90],{up:3,spread:3.5,size:0.15,life:1.1});
    var i=G.ents.indexOf(c); if(i>=0) G.ents.splice(i,1);
    var deployed=0; for(var k=0;k<G.ents.length;k++) if(G.ents[k].kind==='ally') deployed++;
    var kind=(Math.random()*ALLYKIND.length)|0;
    if(deployed<G.S.allies){ spawnAlly(kind,c.x,c.z); }
    else { G.player.coins+=14; msg(ALLYKIND[kind].n+' runs for the tavern','#ffe08a',c.x,c.y+2,c.z); }
    buzz([12,40,12]);
  }
}
function gainXp(n,x,y,z,label){
  var p=G.player; p.xp+=Math.round(n*G.S.xp);
  msg(label||('+'+n+' XP'),'#ffe08a',x,y,z);
  while(p.xp>=xpNeed(p.level)){
    p.xp-=xpNeed(p.level); p.level++; p.maxHp+=10; p.hp=p.maxHp; G.build.points++;
    msg('LEVEL '+p.level+' — skill point','#9ff07a',p.x,p.y+2.8,p.z); buzz([20,40,20,40,40]);
    tip('Level '+p.level+'! '+(DESKTOP?'Press TAB':'Tap ★')+' to spend your skill point');
    sfx('levelup'); burst(p.x,p.y+1,p.z,30,[1.0,0.86,0.42],{up:5,spread:2.5,size:0.12,life:1.3,grav:-2});
  }
}
function xpNeed(l){ return Math.round(190*Math.pow(l,1.17)); }
function hurtPlayer(d,src){
  var p=G.player;
  if(p.inv>0||p.dead) return;
  if(p.buff===2) d*=0.5;
  d*=G.S.armor;
  p.hp-=d; p.inv=0.95; p.hurtT=0.3; G.hitFlash=0.5; buzz([30,40,30]);
  sfx('hurt'); shake(0.3);
  TELE.hurt(src||'unknown',d);
  if(p.hp<=0){ p.hp=0; p.dead=true; p.deadT=0; TELE.died(p.level,src||'unknown'); sfx('death'); setTimeout(gameOver,1500); }
}

/* ---------- update ---------- */
function update(dt){
  G.t+=dt;
  if(G.state!=='play') return;
  var p=G.player, S=G.S;
  readStick();
  G.hitFlash=Math.max(0,G.hitFlash-dt*2);
  if(G.tipT>0) G.tipT-=dt;
  p.cdT-=dt; p.inv=Math.max(0,p.inv-dt); p.hurtT=Math.max(0,p.hurtT-dt);
  p.dashCd-=dt; p.dashT-=dt;
  if(p.atkT>0) p.atkT-=dt;
  if(p.buffT>0){ p.buffT-=dt; if(p.buffT<=0) p.buff=null; }
  if(p.buff===3&&p.hp<p.maxHp) p.hp=Math.min(p.maxHp,p.hp+6*dt);
  updateFX(dt);
  G.shakeA=(G.shakeA||0)*Math.exp(-dt*9);
  if(p.dead){ p.deadT+=dt; p.speed=0; followCam(dt); return; }

  // movement frame: latched when you start pushing, so the auto-camera can't
  // rotate your heading out from under you (that is what made you walk in circles)
  var inMag=Math.hypot(IN.mx,IN.mz);
  if(inMag>0.01){
    if(!MREFset){ MREF=G.cam.yaw; MREFset=true; }
    // when you are pushing roughly forward there is no feedback risk, so let the
    // frame ease back to the live camera and stay intuitive
    if(Math.abs(IN.mx)<0.35){
      var dd=((G.cam.yaw-MREF+Math.PI*3)%(Math.PI*2))-Math.PI;
      MREF+=dd*Math.min(1,dt*2.2);
    }
  } else MREFset=false;
  var cy=(DESKTOP&&LOCKED)?G.cam.yaw:MREF;
  // camera forward is (sin, cos); screen-right is forward × up = (-cos, sin).
  // (This used to be (cos, -sin), which sent D to the left and A to the right.)
  var fx=-Math.sin(cy), fz=-Math.cos(cy), rx=-Math.cos(cy), rz=Math.sin(cy);
  var wx=IN.mx*rx+IN.mz*fx, wz=IN.mx*rz+IN.mz*fz;
  var L=Math.hypot(wx,wz);
  var spd=S.move*(p.buff===0?1.25:1)*(p.slowT>0?0.55:1);
  if(p.dashT>0) spd=26;
  // with the mouse captured the hunter keeps facing where you look and strafes or
  // backs away; otherwise (touch, or a free cursor) she turns to run where you push
  var aimLock=DESKTOP&&LOCKED;
  p.strafe=aimLock;
  if(L>0.01){
    wx/=L; wz/=L;
    var tgt=aimLock?cy:Math.atan2(wx,wz);
    var dy=((tgt-p.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
    p.yaw+=dy*Math.min(1,dt*13);
    var fwd=wx*Math.sin(p.yaw)+wz*Math.cos(p.yaw);
    var mvs=spd*Math.min(1,L)*(aimLock&&fwd<-0.3?0.72:1);      // backpedalling is slower
    p.x+=wx*mvs*dt; p.z+=wz*mvs*dt; p.speed=mvs; p.mvx=wx; p.mvz=wz;
    p.walkPhase+=dt*mvs*1.5;
  } else { p.speed*=0.72; if(p.dashT<=0) p.speed=0; }
  if(p.dashT>0){ p.x+=Math.sin(p.dashDir)*spd*dt; p.z+=Math.cos(p.dashDir)*spd*dt; p.inv=Math.max(p.inv,0.2); }
  p.dodgeT=Math.max(0,(p.dodgeT||0)-dt);
  p.slowT=Math.max(0,(p.slowT||0)-dt);
  // bounds
  var bd=Math.hypot(p.x,p.z), lim=WHALF*0.95;
  if(bd>lim){ p.x*=lim/bd; p.z*=lim/bd; }
  collide(p,0.42*(p.scale||1));   // trunks, rocks and walls are solid
  // gravity / jump
  var gh=H(p.x,p.z);
  if((IN.jump||IN.jumpBuf>0)&&p.onGround){ p.vy=8.9; p.onGround=false; IN.jumpBuf=0; sfx('jump'); }
  IN.jump=false;
  p.vy-=24*dt; p.y+=p.vy*dt;
  if(p.y<=gh){
    if(!p.onGround&&p.vy<-5){                 // touching down: a thump and a puff of dust
      sfx('land',0,0,clamp(-p.vy/12,0.4,1));
      burst(p.x,gh+0.1,p.z,10,[0.55,0.50,0.40],{up:1.2,spread:3,size:0.18,life:0.5,flat:1});
    }
    p.y=gh; p.vy=0; p.onGround=true;
  }
  // footsteps follow the stride
  if(p.onGround&&p.speed>1){ var stp=Math.floor(p.walkPhase/Math.PI); if(stp!==p.lastStep){ p.lastStep=stp; sfx('step',0,0,clamp(p.speed/7,0.5,1)); } }
  // water slows
  if(p.y<WATER+0.3){ p.slowT=0.2; }
  // actions — a tap during cooldown is remembered briefly so it never feels dropped
  IN.atkBuf=Math.max(0,IN.atkBuf-dt); IN.shotBuf=Math.max(0,IN.shotBuf-dt); IN.jumpBuf=Math.max(0,IN.jumpBuf-dt);
  if((IN.attack||IN.atkBuf>0)&&G.talk){ IN.attack=false; IN.atkBuf=0; keeperScreen(); return; }
  if(IN.attack||IN.atkBuf>0){ if(p.cdT<=0){ doAttack(); IN.atkBuf=0; } }
  else if(!DESKTOP&&p.cdT<=0&&!p.dead&&!p.atTavern){
    // auto-swing (touch only): if something hostile is already in reach, the hunter
    // defends herself. With a mouse it just yanked your facing around, so it is off.
    for(var ai2=0;ai2<G.ents.length;ai2++){
      var ae=G.ents[ai2];
      if(!FOE[ae.kind]) continue;
      if(Math.hypot(ae.x-p.x,ae.z-p.z)<2.8+(ae.scale||1)){ doAttack(); break; }
    }
  }
  if(IN.shoot||IN.shotBuf>0||IN.shootHeld){ IN.shoot=false; if(p.cdT<=0){ doShoot(); IN.shotBuf=0; } }
  if(IN.dash){ IN.dash=false; if(S.dash&&p.dashCd<=0){ p.dashCd=1.6; p.dashT=0.19; msg('Shadowstep','#bff0ff',p.x,p.y+2.4,p.z);
    // dash the way you are pushing (or straight ahead), and roll to match
    p.dashDir=L>0.01?Math.atan2(wx,wz):p.yaw;
    var dl=((p.dashDir-p.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
    p.dodge=Math.abs(dl)<0.8?'Dodge_Forward':(Math.abs(dl)>2.35?'Dodge_Backward':(dl>0?'Dodge_Left':'Dodge_Right'));
    p.dodgeT=0.42; p.dodgeN=(p.dodgeN||0)+1;
    sfx('dash'); burst(p.x,p.y+1,p.z,12,[0.70,0.85,1.0],{up:1,spread:2.5,size:0.14,life:0.5}); } }

  updateEnts(dt);
  separate();
  followCam(dt);
  // landmarks: discovery, and the tavern as a place to rest
  p.atTavern=false;
  // who you can talk to: Bram, when you are close and nothing hostile is
  G.talk=null;
  var kp=keeper();
  if(kp&&Math.hypot(kp.x-p.x,kp.z-p.z)<3.8){
    var threat=false;
    for(var ti=0;ti<G.ents.length;ti++){ var te=G.ents[ti];
      if(FOE[te.kind]&&Math.hypot(te.x-p.x,te.z-p.z)<7){ threat=true; break; } }
    if(!threat) G.talk=kp;
  }
  for(var i=0;i<LANDMARKS.length;i++){
    var lm=LANDMARKS[i], ld=Math.hypot(p.x-lm.x,p.z-lm.z);
    if(!G.found[lm.name]&&ld<lm.r+4){
      G.found[lm.name]=1; tip('Discovered: '+lm.name); sfx('discover');
      gainXp(60,p.x,p.y+3,p.z,'+60 XP — discovery');
    }
    if(lm.kind==='tavern'&&ld<TAVERN.yard){
      // the yard is safe ground: you and your company mend here, and foes break off
      p.atTavern=true;
      if(p.hp<p.maxHp){ p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.10*dt); }
      for(var ai=0;ai<G.ents.length;ai++){ var al2=G.ents[ai];
        if(al2.kind==='ally'&&al2.hp<al2.maxHp) al2.hp=Math.min(al2.maxHp,al2.hp+al2.maxHp*0.15*dt); }
    }
  }
  // respawn pressure
  G.spawnT-=dt;
  if(G.spawnT<=0){
    G.spawnT=7;
    var alive=0; for(var k=0;k<G.ents.length;k++){var e=G.ents[k]; if(FOE[e.kind]) alive++;}
    if(alive<46){
      var a=Math.random()*6.28, d=46+Math.random()*26;
      var sx=p.x+Math.cos(a)*d, sz=p.z+Math.sin(a)*d, sd2=Math.hypot(sx,sz);
      if(sd2>34&&sd2<WHALF*0.9&&H(sx,sz)>WATER+0.5&&!nearTavern(sx,sz,32)){
        if(Math.random()<0.6) spawnSpider(sx,sz,sd2>70&&Math.random()<0.08); else spawnBeast(sx,sz,Math.random()<0.35);
      }
    }
  }
  for(var q=G.msgs.length-1;q>=0;q--){ var mm=G.msgs[q]; mm.t+=dt; mm.y+=dt*1.1; if(mm.t>1.5) G.msgs.splice(q,1); }
}

function moveCreature(e,dt,tx,tz,spd){
  var dx=tx-e.x, dz=tz-e.z, d=Math.hypot(dx,dz);
  if(d>0.05){
    var tgt=Math.atan2(dx,dz);
    var dy=((tgt-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
    e.yaw+=dy*Math.min(1,dt*7);
    var m=Math.min(spd,d/Math.max(dt,0.001));
    e.x+=(dx/d)*m*dt; e.z+=(dz/d)*m*dt; e.speed=m;
    e.walkPhase+=dt*m*(e.kind==='spider'?2.4:1.5);
  } else e.speed=0;
  collide(e,bodyR(e));
  var gh=H(e.x,e.z);
  if(e.onGround===false){ e.vy-=24*dt; e.y+=e.vy*dt; if(e.y<=gh){e.y=gh;e.vy=0;e.onGround=true;} }
  else e.y+=(gh-e.y)*Math.min(1,dt*10);
}
function bodyR(e){
  if(e.kind==='spider') return 0.75*(e.scale||1);
  return 0.42*(e.scale||1);
}
/* keep bodies from stacking: creatures, allies and the hunter shove each other apart */
var BODIES=[];
function separate(){
  var p=G.player; BODIES.length=0; BODIES.push(p);
  for(var i=0;i<G.ents.length;i++){ var e=G.ents[i];
    if((FOE[e.kind]||e.kind==='ally')&&Math.abs(e.x-p.x)<60&&Math.abs(e.z-p.z)<60) BODIES.push(e); }
  for(var a=0;a<BODIES.length;a++){ var A=BODIES[a], ra=bodyR(A);
    for(var b=a+1;b<BODIES.length;b++){ var B=BODIES[b];
      var dx=B.x-A.x, dz=B.z-A.z, R=ra+bodyR(B);
      if(dx>R||dx<-R||dz>R||dz<-R) continue;
      var d=Math.hypot(dx,dz); if(d>=R) continue;
      if(d<1e-4){ dx=Math.random()-0.5; dz=Math.random()-0.5; d=Math.hypot(dx,dz); }
      var push=(R-d), nx=dx/d, nz=dz/d;
      // the hunter is heavy: creatures give way, she barely moves
      var wa=(A===p)?0.15:0.5, wb=(A===p)?0.85:0.5;
      A.x-=nx*push*wa; A.z-=nz*push*wa; B.x+=nx*push*wb; B.z+=nz*push*wb;
    }
  }
  collide(p,0.42*(p.scale||1));
}
function updateEnts(dt){
  var p=G.player;
  for(var i=G.ents.length-1;i>=0;i--){
    var e=G.ents[i];
    var pd=Math.hypot(e.x-p.x,e.z-p.z);
    if(e.hurtT>0) e.hurtT-=dt;
    if(e.kind==='corpse'){
      e.t+=dt; e.deadT=e.t;
      if(e.t>1.6) e.y-=dt*0.9;                 // sink into the leaf litter
      if(e.t>2.8) G.ents.splice(i,1);
      continue;
    }

    if(e.kind==='shot'){
      e.spin+=dt*(e.proj==='axe'?14:0); e.life-=dt;
      var steps=Math.max(1,Math.ceil(Math.hypot(e.vx,e.vy,e.vz)*dt/0.55));
      var sdt=dt/steps, gone=false;
      for(var st=0;st<steps&&!gone;st++){
        e.x+=e.vx*sdt; e.y+=e.vy*sdt; e.z+=e.vz*sdt;
        if(e.proj!=='bolt'&&!e.aimed) e.vy-=11*sdt;
        var gy=H(e.x,e.z);
        if(e.y<gy-0.05||solidAt(e.x,e.z,e.y-gy)){ landShot(e,e.y<gy-0.05); gone=true; break; }
        for(var k=0;k<G.ents.length;k++){
          var o=G.ents[k];
          if(!FOE[o.kind]&&o.kind!=='cocoon') continue;
          if(e.hits.indexOf(o)>=0) continue;
          var rr=(o.scale||1)*1.1+0.6;
          if(Math.hypot(o.x-e.x,o.z-e.z)<rr && e.y>o.y-0.7 && e.y<o.y+2.7*(o.scale||1)){
            if(o.kind==='cocoon') breakCocoon(o,e.dmg);
            else {
              if(!e.ally){ sfx('ehit',o.x,o.z); var sl=Math.hypot(e.vx,e.vz)||1; impact(o,e.vx/sl,e.vz/sl,e.y); }
              hurtEnemy(o,e.dmg,e.ally);
              if(e.frost) o.slowT=1.4*e.frost;
              if(e.burst){ for(var bq=0;bq<G.ents.length;bq++){ var o2=G.ents[bq];
                if(FOE[o2.kind]&&o2!==o&&Math.hypot(o2.x-e.x,o2.z-e.z)<e.burst) hurtEnemy(o2,e.dmg*0.55,e.ally); } }
            }
            e.hits.push(o);
            if(e.pierce>0) e.pierce--; else gone=true;
            break;
          }
        }
      }
      if(gone||e.life<=0) G.ents.splice(i,1);
      continue;
    }
    if(e.kind==='stuck'){ e.life-=dt; if(e.life<=0) G.ents.splice(i,1); continue; }
    if(e.kind==='fairy'){
      e.t+=dt; e.bx=Math.sin(e.t*0.9)*2.2; e.by=Math.sin(e.t*1.7)*0.5;
      if(pd<2.6){
        p.buff=e.col; p.buffT=26;
        msg(FAIRYNAME[e.col],'#bff0ff',e.x,e.y+1.4,e.z); sfx('fairy');
        burst(e.x+e.bx,e.y+e.by,e.z,24,FAIRYCOL[e.col],{up:2,spread:3,size:0.12,life:1.0,grav:-1});
        buzz([12,30,12]); G.ents.splice(i,1);
      }
      continue;
    }
    if(e.kind==='cocoon'){
      if(pd<3.4&&G.tipT<=0) tip('Strike the cocoon to free them');
      continue;
    }
    if(pd>96&&e.kind!=='ally'){ continue; }   // sleep distant creatures

    if(FOE[e.kind]){
      e.slowT=Math.max(0,(e.slowT||0)-dt);
      var spd=(e.kind==='spider'?(e.big?3.4:4.2):(e.kind==='wasp'?4.4:3.8))*(e.slowT>0?0.5:1);
      if(e.kind==='wasp') e.hover=1.25+Math.sin(G.t*2.2+e.walkPhase)*0.18;
      // pick target: taunting ally, else player
      var tgt=p, tdist=pd;
      for(var a=0;a<G.ents.length;a++){ var al=G.ents[a];
        if(al.kind==='ally'&&ALLYKIND[al.ak].taunt){
          var ad=Math.hypot(al.x-e.x,al.z-e.z);
          if(ad<e.aggro){ tgt=al; tdist=ad; break; }
        }
      }
      e.atkCd-=dt;
      if(tdist<e.aggro&&!p.dead&&!(tgt===p&&p.atTavern)){
        if(e.kind==='wasp'){
          if(tdist>11) moveCreature(e,dt,tgt.x,tgt.z,spd);
          else if(tdist<7) moveCreature(e,dt,e.x-(tgt.x-e.x),e.z-(tgt.z-e.z),spd*0.7);
          else { e.speed*=0.7; var ty=Math.atan2(tgt.x-e.x,tgt.z-e.z); e.yaw+=(((ty-e.yaw+9.42)%6.28)-3.14)*Math.min(1,dt*6); }
          if(e.atkCd<=0&&tdist<22){
            e.atkCd=2.2; e.atkT=0.4; e.atkDur=0.4; sfx('sting',e.x,e.z);
            var wy=e.y+aimH(e)-0.25, gx=tgt.x-e.x, gz=tgt.z-e.z, gy=(tgt.y+1.1)-wy;
            var gL=Math.hypot(gx,gy,gz)||1;
            G.ents.push({kind:'eshot',x:e.x+gx/gL,y:wy,z:e.z+gz/gL,proj:'sting',
              vx:gx/gL*20,vy:gy/gL*20,vz:gz/gL*20,life:2.4,aimed:1,dmg:e.dmg,src:'wasp sting'});
          }
        } else {
          if(e.wind>0){
            e.speed*=0.5; e.wind-=dt;
            if(e.wind<=0){
              e.atkT=0.3; e.atkDur=0.3;
              if(tdist<2.4+(e.scale||1)){
                if(tgt===p) hurtPlayer(e.dmg,e.kind==='spider'?(e.big?'giant spider':'spider'):e.kind);
                else tgt.hp-=e.dmg;
              }
            }
          } else {
            var stopD=bodyR(e)+bodyR(tgt)+0.25;
            if(tdist>stopD) moveCreature(e,dt,tgt.x,tgt.z,spd);
            else { e.speed*=0.6; var fy=Math.atan2(tgt.x-e.x,tgt.z-e.z);
              e.yaw+=(((fy-e.yaw+9.42)%6.28)-3.14)*Math.min(1,dt*8); }
            if(tdist<1.6+(e.scale||1)&&e.atkCd<=0){
              e.atkCd=e.big?1.9:1.35; e.wind=e.big?0.55:0.38;
              sfx(e.kind==='snake'?'rattle':'hissup',e.x,e.z);
            }
          }
        }
      } else {
        e.wanderT-=dt;
        if(e.wanderT<=0){ e.wanderT=2+Math.random()*3; e.wander=Math.random()*6.28; }
        var wx2=e.home.x+Math.cos(e.wander)*7, wz2=e.home.z+Math.sin(e.wander)*7;
        moveCreature(e,dt,wx2,wz2,spd*0.3);
      }
      if(e.atkT>0) e.atkT-=dt;
      continue;
    }
    if(e.kind==='eshot'){
      e.life-=dt;
      var st2=Math.max(1,Math.ceil(Math.hypot(e.vx,e.vy,e.vz)*dt/0.55)), sd2=dt/st2, hit=false;
      for(var q2=0;q2<st2;q2++){
        e.x+=e.vx*sd2; e.y+=e.vy*sd2; e.z+=e.vz*sd2; if(!e.aimed) e.vy-=11*sd2;
        if(Math.hypot(e.x-p.x,e.z-p.z)<1.2 && e.y>p.y-0.2 && e.y<p.y+2.4){ hurtPlayer(e.dmg,e.src||'arrow'); hit=true; break; }
        var gy2=H(e.x,e.z);
        if(e.y<gy2-0.05||solidAt(e.x,e.z,e.y-gy2)){ landShot(e,e.y<gy2-0.05); hit=true; break; }
      }
      if(hit||e.life<=0) G.ents.splice(i,1);
      continue;
    }
    if(e.kind==='npc'){
      // Bram turns to watch you come up the path, and raises a mug when you arrive
      var want=pd<10?Math.atan2(p.x-e.x,p.z-e.z):e.home;
      e.yaw+=(((want-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI)*Math.min(1,dt*4);
      if(pd<10&&!e.greeted){ e.greeted=true; e.cheer=1.6; msg(G.bounty&&G.bounty.got>=G.bounty.n?'Back already? Come, collect!':'Welcome to the Greenleaf!','#ffe08a',e.x,e.y+2.6,e.z); }
      if(pd>18) e.greeted=false;
      if(e.cheer>0) e.cheer-=dt;
      continue;
    }
    if(e.kind==='ally'){
      var K=ALLYKIND[e.ak];
      if(e.cheer>0){ e.cheer-=dt; e.speed=0; e.y+=(H(e.x,e.z)-e.y)*Math.min(1,dt*10);
        if(e.cheer<=0){ msg(e.name+' the '+K.n+' joins you','#ffe08a',e.x,e.y+2.4,e.z); }
        continue; }
      if(e.hp<=0){ msg(e.name+' falls back','#ff9d9d',e.x,e.y+2,e.z); G.ents.splice(i,1); continue; }
      // find a foe
      var foe=null,bd2=1e9;
      for(var f=0;f<G.ents.length;f++){ var o3=G.ents[f];
        if(!FOE[o3.kind]) continue;
        var d3=Math.hypot(o3.x-e.x,o3.z-e.z);
        if(d3<Math.max(K.range+3,14)&&d3<bd2){bd2=d3;foe=o3;}
      }
      var home=Math.hypot(e.x-p.x,e.z-p.z);
      if(foe&&home<26){
        if(K.range>6){ if(bd2>K.range*0.7) moveCreature(e,dt,foe.x,foe.z,5.2); else {e.speed*=0.7;
            var ty2=Math.atan2(foe.x-e.x,foe.z-e.z); e.yaw+=(((ty2-e.yaw+9.42)%6.28)-3.14)*Math.min(1,dt*7);} }
        else moveCreature(e,dt,foe.x,foe.z,5.6);
      } else {
        var ang=(e.ak*1.7), fxp=p.x-Math.sin(p.yaw)*3.2+Math.cos(ang)*2.2, fzp=p.z-Math.cos(p.yaw)*3.2+Math.sin(ang)*2.2;
        if(home>3.2) moveCreature(e,dt,fxp,fzp,home>12?7.4:5.0); else e.speed*=0.7;
      }
      e.cd-=dt; if(e.atkT>0) e.atkT-=dt;
      if(e.cd<=0){
        if(K.heal){ e.cd=K.rate; if(p.hp<p.maxHp){ p.hp=Math.min(p.maxHp,p.hp+K.heal); msg('+'+K.heal,'#8ff08a',p.x,p.y+2.6,p.z);} }
        else if(foe&&bd2<K.range+1.2){
          e.cd=K.rate; e.atkT=e.atkDur=0.4;
          if(K.range>6){
            var ax=foe.x-e.x, az=foe.z-e.z, ay=(foe.y+aimH(foe))-(e.y+1.3);
            var aL=Math.hypot(ax,ay,az)||1;
            G.ents.push({kind:'shot',x:e.x+ax/aL,y:e.y+1.3,z:e.z+az/aL,
              vx:ax/aL*34,vy:ay/aL*34,vz:az/aL*34,life:1.6,aimed:1,dmg:K.dmg,
              pierce:0,hits:[],proj:'arrow',burst:0,frost:0,spin:0,ally:1});
          } else hurtEnemy(foe,K.dmg,true);
        }
      }
      continue;
    }
  }
}
function followCam(dt){
  var p=G.player, c=G.cam;
  c.manual=Math.max(0,(c.manual||0)-dt);
  // swing in behind the direction of travel once you stop steering by hand
  if(c.manual<=0 && p.speed>1.2 && !p.dead && !(DESKTOP&&LOCKED)){
    var want=p.yaw;
    var d=((want-c.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
    c.yaw+=d*Math.min(1,dt*1.3);
  }
  var px=p.x, py=p.y+1.9, pz=p.z;
  var asp=W/Math.max(1,H2);
  var crowd=0;
  for(var ci=0;ci<G.ents.length;ci++){ var ce=G.ents[ci];
    if(!FOE[ce.kind]) continue;
    var cd2=Math.hypot(ce.x-p.x,ce.z-p.z);
    if(cd2<9) crowd=Math.max(crowd,(ce.scale||1)*(1-cd2/9));
  }
  var want0=c.dist*(asp<1?0.74:1)*(1+crowd*0.55);
  var cp=Math.cos(c.pitch);
  var dx=-Math.sin(c.yaw)*cp, dz=-Math.cos(c.yaw)*cp, dy=Math.sin(c.pitch);
  // march out from the player and stop before the camera enters a hill
  var want=want0, d=want, N=14;
  for(var i=1;i<=N;i++){
    var t=want*i/N, sx=px+dx*t, sy=py+dy*t, sz=pz+dz*t;
    if(sy<H(sx,sz)+1.0){ d=want*(i-1)/N; break; }
  }
  d=Math.max(2.4,d);
  c.cd=(c.cd===undefined)?d:(d<c.cd ? d : c.cd+(d-c.cd)*Math.min(1,dt*2.2));
  var tx=px+dx*c.cd, ty=py+dy*c.cd, tz=pz+dz*c.cd;
  var fl=H(tx,tz)+1.1; if(ty<fl) ty=fl;
  var k=Math.min(1,dt*9);
  c.x+=(tx-c.x)*k; c.y+=(ty-c.y)*k; c.z+=(tz-c.z)*k;
}
/* ---------- render ---------- */
var DRAW=[], SHAD=[], VIS=[], LOD=0;
function addShadow(e){
  var sc=(e.kind==='spider')?3.0*(e.scale||1):1.5*(e.scale||1);
  if(e.kind==='cocoon') sc=1.6;
  var air=Math.max(0,e.y-H(e.x,e.z));
  var f=Math.max(0.35,1-air*0.22);
  var m=mat(); m4trs(m,e.x,H(e.x,e.z)+0.06,e.z,0,e.yaw||0,0,sc*f,1,sc*f);
  SHAD.push(m);
}
var SKYCOL=[0.47,0.58,0.56], SUN=null, SUNDIR=[0,1,0], SHADOWR=34, FRAMEDT=0.016;
/* scene, camera and lights, matched to the original hand-written shader:
   hemisphere ambient from (0.20,0.24,0.20) below to (0.42,0.48,0.40) above, a warm
   sun at 0.72, linear fog from 38 to 133 units. three.js divides diffuse light by
   pi, so intensities are scaled by pi to land on the same brightness. */
function initScene(){
  R3.outputColorSpace=THREE.LinearSRGBColorSpace; R3.toneMapping=THREE.NoToneMapping;
  R3.setClearColor(new THREE.Color(SKYCOL[0],SKYCOL[1],SKYCOL[2]),1);
  SCENE=new THREE.Scene();
  SCENE.fog=new THREE.Fog(new THREE.Color(SKYCOL[0],SKYCOL[1],SKYCOL[2]),38,133);
  CAM3=new THREE.PerspectiveCamera(59,1,0.35,260);
  var hemi=new THREE.HemisphereLight(new THREE.Color(0.42,0.48,0.40),new THREE.Color(0.20,0.24,0.20),Math.PI);
  SCENE.add(hemi);
  var sl=0.42, sx=Math.cos(sl)*0.55, sy=0.78, sz=Math.sin(sl)*0.3, sL=Math.hypot(sx,sy,sz);
  var sun=new THREE.DirectionalLight(new THREE.Color(1.0,0.95,0.80),0.72*sL*Math.PI);
  SUNDIR=[sx/sL,sy/sL,sz/sL];
  sun.position.set(SUNDIR[0]*100,SUNDIR[1]*100,SUNDIR[2]*100); SCENE.add(sun); SCENE.add(sun.target);
  // real shadows: trees, rocks and characters all cast; a box around the hunter
  R3.shadowMap.enabled=true; R3.shadowMap.type=THREE.PCFShadowMap;
  sun.castShadow=true;
  var sm=DESKTOP?2048:1024; sun.shadow.mapSize.set(sm,sm);
  var sc=sun.shadow.camera; sc.left=-SHADOWR; sc.right=SHADOWR; sc.top=SHADOWR; sc.bottom=-SHADOWR;
  sc.near=10; sc.far=180; sc.updateProjectionMatrix();
  sun.shadow.bias=-0.0006; sun.shadow.normalBias=0.05;
  SUN=sun;
  WORLDMAT=worldMaterial();
  CHARMAT=new THREE.MeshLambertMaterial({vertexColors:true});
  SHADMAT=new THREE.MeshBasicMaterial({color:new THREE.Color(0.03,0.04,0.025),transparent:true,opacity:0.30,depthWrite:false});
  SKY=new THREE.Mesh(PARTS.sky.geom,new THREE.MeshBasicMaterial({vertexColors:true,fog:false,depthWrite:false,side:THREE.DoubleSide}));
  SKY.scale.set(240,170,240); SKY.renderOrder=-1; SKY.frustumCulled=false; SCENE.add(SKY);
  // create every batch now, so no shader is compiled for the first time mid-fight
  for(var k in PARTS) if(k!=='sky'&&k!=='disc') partBatch(k);
  shadowBatch();
}
/* build one actor of each kind up front so their shaders compile at load */
function warmActors(){
  if(!MODELS_READY) return;
  var specs=[{model:'barbarian',weapons:[]},{model:'knight',weapons:[]},{model:'mage',weapons:[]},
    {model:'rogue',weapons:[],ears:true},{model:'rogue_hooded',weapons:[],beard:true},{model:'spider',weapons:[]},{model:'snake',weapons:[]},{model:'wasp',weapons:[]}];
  for(var i=0;i<specs.length;i++) if(MODELS[specs[i].model]){
    var a=makeActor(specs[i]); a.spec='warm'; a.group.visible=true; a.group.position.set(0,-50,0);
  }
}
function shadowBatch(){
  var sb=BATCH.shadow;
  if(!sb){ sb=batch('shadow',PARTS.disc.geom,SHADMAT,false); sb.mesh.renderOrder=1; SCENE.add(sb.mesh); }
  return sb;
}
var RESW=0, RESH=0;
function setRes(){
  if(!R3) return;
  var w=Math.max(1,Math.round(W*DPR*QUAL)), h=Math.max(1,Math.round(H2*DPR*QUAL));
  if(w===RESW&&h===RESH) return;
  RESW=w; RESH=h; R3.setPixelRatio(1); R3.setSize(w,h,false);
}
function partBatch(k){
  var b=BATCH[k];
  if(!b){ b=batch(k,PARTS[k].geom,CHARMAT,true); b.mesh.castShadow=true; SCENE.add(b.mesh); }
  return b;
}
function draw(){
  setRes();
  if(!G.player){ R3.clear(); return; }
  var p=G.player, c=G.cam;
  // the HUD projects through these, so keep them alongside the three.js camera
  var fov=(W/H2<1)?1.22:1.03;
  m4persp(proj,fov,W/H2,0.35,260);
  m4look(view,c.x,c.y,c.z,p.x,p.y+1.5,p.z);
  CAM3.fov=fov*180/Math.PI; CAM3.aspect=W/H2; CAM3.updateProjectionMatrix();
  var sa=(G.shakeA||0)>0.01?G.shakeA:0;
  var shx=(Math.random()-0.5)*sa, shy=(Math.random()-0.5)*sa, shz=(Math.random()-0.5)*sa;
  CAM3.position.set(c.x+shx,c.y+shy,c.z+shz); CAM3.lookAt(p.x+shx*0.4,p.y+1.5+shy*0.4,p.z+shz*0.4);
  cullProps(c.x,c.z);
  SKY.position.set(c.x,c.y,c.z);
  WORLDU.uTime.value=G.t;
  WORLDU.uCam.value.set(c.x,c.y,c.z);
  WORLDU.uFocus.value.set(p.x,p.y+1.1*(p.scale||1),p.z);
  batchesBegin();
  // contact shadows
  SHAD.length=0;
  // the sun's shadow map follows the hunter; contact discs only cover what lies
  // beyond its reach
  SUN.position.set(p.x+SUNDIR[0]*80,p.y+SUNDIR[1]*80,p.z+SUNDIR[2]*80);
  SUN.target.position.set(p.x,p.y,p.z); SUN.target.updateMatrixWorld();
  for(var si=0;si<G.ents.length;si++){ var se=G.ents[si];
    if(se.kind==='shot'||se.kind==='eshot'||se.kind==='fairy'||se.kind==='stuck') continue;
    var sd=Math.hypot(se.x-c.x,se.z-c.z);
    if(sd>50||Math.hypot(se.x-p.x,se.z-p.z)<SHADOWR-4) continue;
    addShadow(se); }
  var sb=shadowBatch();
  for(var sk=0;sk<SHAD.length;sk++) batchAdd(sb,SHAD[sk],null);
  // nearby humanoids get animated models; everything else is poured into
  // instanced batches from the primitive rigs
  var actors=assignActors(FRAMEDT);
  DRAW.length=0;
  if(!actors.has(p)) pushEnt(p);
  VIS.length=0;
  for(var i=0;i<G.ents.length;i++){
    var e=G.ents[i];
    if(actors.has(e)) continue;
    var ed=Math.hypot(e.x-c.x,e.z-c.z);
    if(ed>62) continue;
    VIS.push([ed,e]);
  }
  VIS.sort(function(a,b){return a[0]-b[0];});
  for(var vi=0;vi<VIS.length;vi++){
    LOD=(vi>=7||VIS[vi][0]>20)?1:0;
    pushEnt(VIS[vi][1]);
  }
  LOD=0;
  drawFX();
  for(var k=0;k<DRAW.length;k++){ var d=DRAW[k]; batchAdd(partBatch(d[0]),d[1],d[2]); }
  batchesEnd();
  R3.render(SCENE,CAM3);
}
var RIG=[], MPOOL=[], MPI=0;
/* a part laid along an arbitrary axis: local +y -> u (unit), local +x -> v (unit,
   perpendicular to u), local +z -> v × u. Offset `off` is measured along u. */
function axisMat(px,py,pz,ux,uy,uz,vx,vy,vz,off,sx,sy,sz){
  var o=mat(), wx=vy*uz-vz*uy, wy=vz*ux-vx*uz, wz=vx*uy-vy*ux;
  o[0]=vx*sx;o[1]=vy*sx;o[2]=vz*sx;o[3]=0;
  o[4]=ux*sy;o[5]=uy*sy;o[6]=uz*sy;o[7]=0;
  o[8]=wx*sz;o[9]=wy*sz;o[10]=wz*sz;o[11]=0;
  o[12]=px+ux*off;o[13]=py+uy*off;o[14]=pz+uz*off;o[15]=1;
  return o;
}
/* projectiles. Arrows fly point-first along their velocity (shaft, steel head and
   fletching); the warrior's axe tumbles end over end; bolts are a glowing orb. */
function pushShot(e){
  var sp=Math.hypot(e.vx,e.vy,e.vz)||1, ux=e.vx/sp, uy=e.vy/sp, uz=e.vz/sp;
  var h=Math.hypot(ux,uz), vx, vz;
  if(h>1e-3){ vx=uz/h; vz=-ux/h; } else { vx=1; vz=0; }   // horizontal, square to the flight
  var x=e.x, y=e.y, z=e.z;
  if(e.kind==='stuck'){ var sk=e.proj==='axe'?0.15:0.28; x+=ux*sk; y+=uy*sk; z+=uz*sk; }   // the head is buried
  if(e.proj==='bolt'&&e.kind==='shot'){
    var g=0.30+Math.sin(G.t*30+e.x)*0.04;
    var m=mat(); m4trs(m,x,y,z,0,G.t*9,0,g,g,g); DRAW.push(['blob',m,[0.55,0.85,1.0]]);
    var m2=mat(); m4trs(m2,x-ux*0.35,y-uy*0.35,z-uz*0.35,0,0,0,g*0.6,g*0.6,g*0.6); DRAW.push(['blob',m2,[0.80,0.95,1.0]]);
    var m3=mat(); m4trs(m3,x-ux*0.65,y-uy*0.65,z-uz*0.65,0,0,0,g*0.35,g*0.35,g*0.35); DRAW.push(['blob',m3,[0.45,0.70,1.0]]);
    return;
  }
  if(e.proj==='axe'&&e.kind!=='eshot'){
    // spin in the vertical plane that contains the flight path
    var a=e.spin||0, ca=Math.cos(a), sa=Math.sin(a);
    // "up" square to the flight, in that plane
    var qx=-ux*uy, qy=h*h, qz=-uz*uy, ql=Math.hypot(qx,qy,qz)||1; qx/=ql; qy/=ql; qz/=ql;
    var ax=ux*ca+qx*sa, ay=uy*ca+qy*sa, az=uz*ca+qz*sa;           // haft axis
    var bx=-ux*sa+qx*ca, by=-uy*sa+qy*ca, bz=-uz*sa+qz*ca;        // blade points this way
    DRAW.push(['box',axisMat(x,y,z,ax,ay,az,vx,0,vz,-0.45,0.07,0.9,0.07),[0.45,0.30,0.18]]);
    DRAW.push(['box',axisMat(x+ax*0.32,y+ay*0.32,z+az*0.32,bx,by,bz,vx,0,vz,-0.06,0.05,0.34,0.24),[0.74,0.76,0.80]]);
    return;
  }
  if(e.proj==='sting'){                 // a wasp's stinger: short, dark, gold-tipped
    DRAW.push(['box',axisMat(x,y,z,ux,uy,uz,vx,0,vz,-0.42,0.06,0.42,0.06),[0.14,0.11,0.08]]);
    DRAW.push(['cone',axisMat(x,y,z,ux,uy,uz,vx,0,vz,0,0.10,0.18,0.10),[0.95,0.78,0.25]]);
    return;
  }
  // arrow: origin is the tip end of the shaft
  var enemy=e.kind==='eshot'||e.enemy, len=0.95;
  var shaft=enemy?[0.30,0.22,0.14]:[0.62,0.48,0.30];
  var head=enemy?[0.42,0.40,0.38]:[0.80,0.82,0.86];
  var fl=enemy?[0.20,0.20,0.18]:(e.proj==='arrow'?[0.92,0.90,0.84]:[0.85,0.30,0.25]);
  DRAW.push(['box',axisMat(x,y,z,ux,uy,uz,vx,0,vz,-len,0.045,len,0.045),shaft]);
  DRAW.push(['cone',axisMat(x,y,z,ux,uy,uz,vx,0,vz,0,0.13,0.24,0.13),head]);
  // fletching: two crossed vanes at the tail
  var wx=vz*uy, wy=vx*uz-vz*ux, wz=-vx*uy, wl=Math.hypot(wx,wy,wz)||1;   // square to both
  DRAW.push(['box',axisMat(x,y,z,ux,uy,uz,vx,0,vz,-len+0.02,0.22,0.24,0.012),fl]);
  DRAW.push(['box',axisMat(x,y,z,ux,uy,uz,wx/wl,wy/wl,wz/wl,-len+0.02,0.22,0.24,0.012),fl]);
}

function mat(){ if(MPI>=MPOOL.length) MPOOL.push(m4()); return MPOOL[MPI++]; }
function pushEnt(e){
  RIG.length=0;
  var root=mat();
  var rk=e.kind==='corpse'?e.of:e.kind;
  if(rk==='spider') spiderRig(RIG,e,G.t);
  else if(rk==='snake') snakeRig(RIG,e,G.t);
  else if(rk==='wasp') waspRig(RIG,e,G.t);
  else if(e.kind==='cocoon') cocoonRig(RIG,e,G.t);
  else if(e.kind==='shot'||e.kind==='eshot'||e.kind==='stuck'){ pushShot(e); return; }
  else if(e.kind==='fairy'){
    var m2=mat();
    m4trs(m2,e.x+e.bx,e.y+e.by,e.z,0,G.t*2,0,0.42,0.42,0.42);
    DRAW.push(['blob',m2,FAIRYCOL[e.col]]);
    var m3=mat();
    m4trs(m3,e.x+e.bx,e.y+e.by+0.28,e.z,0,-G.t*1.4,0,0.75,0.12,0.75);
    DRAW.push(['cone',m3,FAIRYCOL[e.col]]);
    return;
  }
  else humanoidRig(RIG,e,G.t);
  m4trs(root,e.x,e.y,e.z,0,e.yaw||0,0,1,1,1);
  // death tilt (a dead spider rolls onto its back)
  if(e.kind==='corpse'&&e.of==='spider'){
    var tf=Math.min(1,e.t/0.35), sc0=e.scale||1;
    m4trs(root,e.x,e.y+tf*1.15*sc0,e.z,0,e.yaw||0,tf*3.14,1,1,1);
  } else if(e.deadT!==undefined&&e.deadT>0){
    var t2=Math.min(1,e.deadT/0.6);
    m4trs(root,e.x,e.y+t2*0.1,e.z,t2*1.45,e.yaw||0,0,1,1,1);
  }
  for(var i=0;i<RIG.length;i++){
    var r=RIG[i], lm=mat(), wm=mat();
    m4trs(lm,r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9]);
    m4mul(wm,root,lm);
    var col=r[10]||[1,1,1];
    if(e.hurtT>0) col=[Math.min(1,col[0]*1.1+0.5),col[1]*0.6,col[2]*0.6];
    DRAW.push([r[0],wm,col]);
  }
}

/* ---------- HUD ---------- */
var SHOWKEY=false;
/* minimap placement: top-right on a laptop; on a phone it sits under the health
   panel, because the top-right corner belongs to the potion / skill buttons */
function mapGeom(){
  if(DESKTOP){ var r=Math.min(92,W*0.07); return {x:W-12*clamp(W/1100,1,1.5)-r, y:12*clamp(W/1100,1,1.5)+r+10, r:r}; }
  var P=panelGeom(), r2=Math.min(54,W*0.13); return {x:12+r2, y:P.y+P.hMax+12+r2, r:r2};
}
/* the status panel, top-left: health bar, xp bar, a stats line and a status line.
   Every row has its own band, so nothing is drawn on top of anything else. */
function panelGeom(){
  var UI=DESKTOP?clamp(W/1100,1,1.5):1, pad=12*UI;
  var bw=DESKTOP?Math.min(230*UI,W*0.3):clamp(W*0.46,150,210);
  var ins=10*UI, hpH=16*UI, xpH=8*UI, row=17*UI;
  var hBase=ins+hpH+5*UI+xpH+6*UI+row+ins*0.5;
  return {UI:UI,x:pad,y:pad,ins:ins,bw:bw,w:bw+ins*2,hpH:hpH,xpH:xpH,row:row,
    hBase:hBase,hMax:hBase+row*2};
}      // phones: tap the minimap to show the map key
/* minimap glyphs, one shape per kind so you can tell what is what at a glance */
function mapIcon(kind,x,y,s,unknown){
  s=s||1; hx.save(); hx.translate(x,y); hx.scale(s,s); hx.lineWidth=1.4;
  if(unknown){
    hx.fillStyle='rgba(8,11,8,.85)'; hx.beginPath(); hx.arc(0,0,6,0,6.3); hx.fill();
    hx.strokeStyle='#8a7a50'; hx.stroke();
    hx.fillStyle='#c9b27a'; hx.font='700 9px Georgia,serif'; hx.textAlign='center'; hx.fillText('?',0,3.2);
    hx.restore(); return;
  }
  switch(kind){
    case 'spider': case 'bigspider':     // red body with legs
      var r=kind==='bigspider'?3.6:2.4;
      hx.strokeStyle='#d6584a'; hx.beginPath();
      hx.moveTo(-r*1.7,-r*0.9); hx.lineTo(r*1.7,r*0.9); hx.moveTo(-r*1.7,r*0.9); hx.lineTo(r*1.7,-r*0.9); hx.stroke();
      hx.fillStyle='#d6584a'; hx.beginPath(); hx.arc(0,0,r,0,6.3); hx.fill(); break;
    case 'snake':                        // a green squiggle
      hx.strokeStyle='#6fd08a'; hx.lineWidth=2; hx.beginPath(); hx.moveTo(-3.5,2); hx.quadraticCurveTo(-1.5,-3,0,0); hx.quadraticCurveTo(1.5,3,3.5,-2); hx.stroke(); break;
    case 'wasp':                         // a yellow dot with a black band
      hx.fillStyle='#f0c43a'; hx.beginPath(); hx.arc(0,0,3.2,0,6.3); hx.fill();
      hx.fillStyle='#1a1408'; hx.fillRect(-3.2,-0.8,6.4,1.6); break;
    case 'cocoon':                       // white ring: someone to rescue
      hx.strokeStyle='#eef6f6'; hx.lineWidth=1.8; hx.beginPath(); hx.arc(0,0,3,0,6.3); hx.stroke();
      hx.fillStyle='#eef6f6'; hx.beginPath(); hx.arc(0,0,1,0,6.3); hx.fill(); break;
    case 'ally':                         // green dot
      hx.fillStyle='#7fdf5a'; hx.beginPath(); hx.arc(0,0,2.6,0,6.3); hx.fill(); break;
    case 'fairy':                        // cyan four-point star
      hx.fillStyle='#bff0ff'; hx.beginPath();
      for(var k=0;k<8;k++){ var a=k/8*6.283, rr=(k&1)?1.2:4; hx.lineTo(Math.sin(a)*rr,-Math.cos(a)*rr); }
      hx.closePath(); hx.fill(); break;
    case 'keeper':                       // Bram: a gold "!" while he has work or a reward for you
      var ready=!G.bounty||G.bounty.got>=G.bounty.n;
      hx.fillStyle='#2a1a0a'; hx.beginPath(); hx.arc(0,0,4.2,0,6.3); hx.fill();
      hx.fillStyle=ready?'#ffd76a':'#c9b27a'; hx.beginPath(); hx.arc(0,0,3.2,0,6.3); hx.fill();
      if(ready){ hx.fillStyle='#2a1a0a'; hx.fillRect(-0.7,-2.4,1.4,3); hx.fillRect(-0.7,1.2,1.4,1.2); }
      break;
    case 'tavern':                       // warm house
      hx.fillStyle='#f0b860'; hx.beginPath(); hx.moveTo(-5,0); hx.lineTo(0,-5); hx.lineTo(5,0); hx.lineTo(5,4.5); hx.lineTo(-5,4.5); hx.closePath(); hx.fill();
      hx.strokeStyle='#2a1a0a'; hx.lineWidth=1; hx.stroke(); break;
    case 'hive':                         // honeycomb hexagon
      hx.fillStyle='#e0a63a'; hx.beginPath();
      for(var hk=0;hk<6;hk++){ var ha=hk/6*6.283+0.52; hx.lineTo(Math.cos(ha)*5,Math.sin(ha)*5); }
      hx.closePath(); hx.fill(); hx.strokeStyle='#2a1a0a'; hx.lineWidth=1; hx.stroke(); break;
    case 'hollow':                       // web
      hx.strokeStyle='#c9a0e8'; hx.lineWidth=1.2; hx.beginPath(); hx.arc(0,0,4.6,0,6.3); hx.arc(0,0,2.2,0,6.3);
      for(var w=0;w<4;w++){ var wa=w/4*3.1416; hx.moveTo(Math.cos(wa)*5,Math.sin(wa)*5); hx.lineTo(-Math.cos(wa)*5,-Math.sin(wa)*5); }
      hx.stroke(); break;
    case 'stones':                       // ring of stones
      hx.fillStyle='#b8b8c0';
      for(var q=0;q<6;q++){ var qa=q/6*6.283; hx.fillRect(Math.cos(qa)*4-1.2,Math.sin(qa)*4-1.2,2.4,2.4); } break;
  }
  hx.restore();
}
function drawHUD(){
  hx.setTransform(1,0,0,1,0,0);
  hx.clearRect(0,0,hud.width,hud.height);
  hx.save(); hx.scale(HDPR,HDPR);
  if(G.state!=='play'){ hx.restore(); return; }
  var p=G.player;
  // damage flash
  if(G.hitFlash>0){ hx.fillStyle='rgba(180,40,30,'+(G.hitFlash*0.33)+')'; hx.fillRect(0,0,W,H2); }
  // low health: the edges of the screen pulse red, so you notice without looking at the bar
  if(!p.dead&&p.hp<p.maxHp*0.3){
    var lowA=(1-p.hp/(p.maxHp*0.3))*0.35+0.22+Math.sin(G.t*6)*0.08;
    var vg=hx.createRadialGradient(W/2,H2/2,Math.min(W,H2)*0.32,W/2,H2/2,Math.hypot(W,H2)*0.55);
    vg.addColorStop(0,'rgba(150,20,15,0)'); vg.addColorStop(1,'rgba(150,20,15,'+lowA.toFixed(3)+')');
    hx.fillStyle=vg; hx.fillRect(0,0,W,H2);
  }
  // floating messages
  hx.textAlign='center';
  for(var i=0;i<G.msgs.length;i++){
    var m=G.msgs[i], s=project(m.x,m.y,m.z);
    if(!s) continue;
    hx.globalAlpha=Math.max(0,1-m.t/1.5);
    hx.font='600 '+m.size+'px Georgia,serif';
    hx.fillStyle='rgba(0,0,0,.65)'; hx.fillText(m.txt,s.x+1.5,s.y+1.5);
    hx.fillStyle=m.col; hx.fillText(m.txt,s.x,s.y);
  }
  hx.globalAlpha=1;
  // enemy health bars
  for(var k=0;k<G.ents.length;k++){
    var e=G.ents[k];
    if((!FOE[e.kind]&&e.kind!=='cocoon'&&e.kind!=='ally')||e.hp>=e.maxHp) continue;
    var sp=project(e.x,e.y+(e.kind==='wasp'?2.7:2.3)*(e.scale||1),e.z); if(!sp) continue;
    var w=Math.max(22,40-sp.d*0.25);
    hx.fillStyle='rgba(0,0,0,.55)'; hx.fillRect(sp.x-w/2-1,sp.y-1,w+2,6);
    hx.fillStyle=(e.kind==='ally')?'#7fbf5a':(e.kind==='cocoon'?'#cfe8e8':'#d6584a');
    hx.fillRect(sp.x-w/2,sp.y,w*Math.max(0,e.hp/e.maxHp),4);
  }
  // status panel
  var P=panelGeom(), UI=P.UI, pad=P.x, bx=P.x+P.ins, by=P.y+P.ins, bw=P.bw;
  var hasBuff=(p.buff!==null&&p.buff!==undefined), pts=G.build.points, bq=G.bounty;
  var ph=P.hBase+((hasBuff||pts>0)?P.row:0)+(bq?P.row:0);
  hx.fillStyle='rgba(8,11,8,.62)'; roundRect(P.x,P.y,P.w,ph,10*UI); hx.fill();
  hx.strokeStyle='rgba(232,194,106,.28)'; hx.lineWidth=1; hx.stroke();
  // health, with its numbers inside the bar
  var hpf=clamp(p.hp/p.maxHp,0,1);
  hx.fillStyle='#3a1f19'; roundRect(bx,by,bw,P.hpH,4*UI); hx.fill();
  if(hpf>0){ hx.fillStyle=hpf<0.3?(Math.sin(G.t*8)>0?'#e8594a':'#b83a2e'):'#cf4e42';
    roundRect(bx,by,Math.max(8*UI,bw*hpf),P.hpH,4*UI); hx.fill(); }
  hx.textAlign='center'; hx.font='700 '+Math.round(11*UI)+'px Georgia,serif';
  var hpT=Math.ceil(p.hp)+' / '+p.maxHp;
  hx.fillStyle='rgba(0,0,0,.55)'; hx.fillText(hpT,bx+bw/2+1,by+P.hpH*0.72+1);
  hx.fillStyle='#fff3e0'; hx.fillText(hpT,bx+bw/2,by+P.hpH*0.72);
  // experience
  var xy=by+P.hpH+5*UI, need=xpNeed(p.level);
  hx.fillStyle='#2a2438'; roundRect(bx,xy,bw,P.xpH,3*UI); hx.fill();
  var xpf=clamp(p.xp/need,0,1);
  if(xpf>0){ hx.fillStyle='#8f7ad6'; roundRect(bx,xy,Math.max(6*UI,bw*xpf),P.xpH,3*UI); hx.fill(); }
  // stats line: level and xp on the left, coins and potions on the right
  var ty=xy+P.xpH+6*UI+P.row*0.72, fs=Math.round(12.5*UI);
  hx.font='700 '+fs+'px Georgia,serif'; hx.textAlign='right';
  var potT='✚ '+p.potions+(DESKTOP?' (Q)':''), coinT='◉ '+p.coins;
  var wPot=hx.measureText(potT).width, wGap=12*UI;
  hx.fillStyle=p.potions>0?'#ff9d9d':'#8a7070'; hx.fillText(potT,bx+bw,ty);
  hx.fillStyle='#ffe08a'; hx.fillText(coinT,bx+bw-wPot-wGap,ty);
  var rightW=wPot+wGap+hx.measureText(coinT).width;
  hx.textAlign='left'; hx.fillStyle='#e8c26a'; var lvT='Lv '+p.level;
  hx.fillText(lvT,bx,ty);
  var lvW=hx.measureText(lvT).width;
  hx.font='600 '+Math.round(11*UI)+'px Georgia,serif'; hx.fillStyle='#b7a6e8';
  var xpT=p.xp+' / '+need+' xp';
  if(lvW+8*UI+hx.measureText(xpT).width<bw-rightW-wGap) hx.fillText(xpT,bx+lvW+8*UI,ty);
  // status line: unspent skill points, and the fairy blessing with its timer
  var sy=ty;
  if(hasBuff||pts>0){
    sy=ty+P.row; hx.font='700 '+Math.round(11*UI)+'px Georgia,serif';
    var bfW=0;
    if(hasBuff){
      var bn=FAIRYNAME[p.buff].split(' ')[0], bt2=bn+' '+Math.ceil(p.buffT)+'s';
      bfW=hx.measureText(bt2).width;
      hx.textAlign='right'; hx.fillStyle='rgb('+FAIRYCOL[p.buff].map(function(v){return Math.round(v*255);}).join(',')+')';
      hx.fillText(bt2,bx+bw,sy);
      hx.fillStyle='rgba(191,240,255,.35)'; hx.fillRect(bx+bw-bfW,sy+3*UI,bfW*clamp(p.buffT/26,0,1),2*UI);
    }
    if(pts>0){
      hx.textAlign='left'; hx.fillStyle=Math.sin(G.t*5)>-0.3?'#9ff07a':'#6fbf55';
      var spT='★ '+pts+' skill point'+(pts>1?'s':'')+(DESKTOP?' — TAB':' — tap ★');
      if(hx.measureText(spT).width>bw-bfW-10*UI) spT='★ '+pts+(DESKTOP?' — TAB':'');
      hx.fillText(spT,bx,sy);
    }
  }
  // Bram's bounty, if you took one
  if(bq){
    var qy=sy+P.row, done=bq.got>=bq.n;
    hx.textAlign='left'; hx.font='700 '+Math.round(11*UI)+'px Georgia,serif';
    hx.fillStyle=done?(Math.sin(G.t*4)>-0.4?'#ffd76a':'#c9a64a'):'#e8d6a8';
    hx.fillText(done?'⚑ Bounty done — see Bram':'⚑ '+bq.def.short+'  '+bq.got+' / '+bq.n,bx,qy);
    if(!done){ hx.fillStyle='rgba(255,215,106,.25)'; hx.fillRect(bx,qy+3*UI,bw,2*UI);
      hx.fillStyle='rgba(255,215,106,.8)'; hx.fillRect(bx,qy+3*UI,bw*bq.got/bq.n,2*UI); }
  }
  // minimap: every kind of thing has its own shape, landmarks off the edge stay
  // pinned to the rim so you always know which way they lie
  var MG=mapGeom(), mr=MG.r, mx=MG.x, my=MG.y;
  hx.save(); hx.beginPath(); hx.arc(mx,my,mr,0,6.3); hx.clip();
  hx.fillStyle='rgba(12,18,12,.62)'; hx.fillRect(mx-mr,my-mr,mr*2,mr*2);
  var sc=mr/(DESKTOP?86:70), ms=DESKTOP?1:0.85;
  for(var e2=0;e2<G.ents.length;e2++){
    var en=G.ents[e2];
    if(en.kind==='shot'||en.kind==='eshot'||en.kind==='stuck') continue;
    var ddx=(en.x-p.x)*sc, ddz=(en.z-p.z)*sc;
    if(Math.hypot(ddx,ddz)>mr) continue;
    var rp=rotPt(ddx,ddz,G.cam.yaw);
    mapIcon(en.kind==='spider'&&en.big?'bigspider':(en.kind==='npc'?'keeper':en.kind),mx+rp.x,my+rp.y,ms);
  }
  hx.restore();
  for(var L=0;L<LANDMARKS.length;L++){
    var lm=LANDMARKS[L], dx=(lm.x-p.x)*sc, dz=(lm.z-p.z)*sc;
    var rot=rotPt(dx,dz,G.cam.yaw), rl=Math.hypot(rot.x,rot.y), edge=rl>mr-7;
    if(edge){ rot.x*=(mr-7)/rl; rot.y*=(mr-7)/rl; }
    mapIcon(lm.kind,mx+rot.x,my+rot.y,ms*(edge?0.85:1.1),!G.found[lm.name]);
  }
  // north marker rides the rim (the map turns with the camera)
  var nr=rotPt(0,-mr,G.cam.yaw);
  hx.font='700 '+Math.round(11*ms)+'px Georgia,serif'; hx.textAlign='center';
  hx.fillStyle='rgba(8,11,8,.8)'; hx.beginPath(); hx.arc(mx+nr.x,my+nr.y,7*ms,0,6.3); hx.fill();
  hx.fillStyle='#e8c26a'; hx.fillText('N',mx+nr.x,my+nr.y+4*ms);
  hx.fillStyle='#f3e7c9'; hx.beginPath(); hx.moveTo(mx,my-5); hx.lineTo(mx-3.6,my+4); hx.lineTo(mx+3.6,my+4); hx.closePath(); hx.fill();
  hx.strokeStyle='rgba(232,194,106,.55)'; hx.lineWidth=2; hx.beginPath(); hx.arc(mx,my,mr,0,6.3); hx.stroke();
  if(DESKTOP||SHOWKEY){
    var keyItems=[['spider','Spider'],['snake','Snake'],['wasp','Wasp'],['cocoon','Captive — free them'],
      ['ally','Your company'],['fairy','Fairy blessing'],['tavern','Tavern — rest'],['keeper','Bram, innkeeper'],['hive','Wasp hive'],
      ['hollow',"Queen's Hollow"],['stones','Standing stones']];
    var kx=mx-mr, ky=my+mr+16, lh=DESKTOP?15:13;
    hx.fillStyle='rgba(8,11,8,.55)'; roundRect(kx-6,ky-11,mr*2+12,keyItems.length*lh+8,8); hx.fill();
    hx.textAlign='left'; hx.font='600 '+(DESKTOP?11.5:10.5)+'px Georgia,serif';
    for(var ki=0;ki<keyItems.length;ki++){
      mapIcon(keyItems[ki][0],kx+7,ky+ki*lh-3,0.9);
      hx.fillStyle='#d8c9a2'; hx.fillText(keyItems[ki][1],kx+18,ky+ki*lh+1);
    }
  }
  // diagnostics overlay — screenshot this and send it
  if(SHOWDBG){
    var f=TELE.fps.slice().sort(function(a,b){return a-b;});
    var med=f.length?f[Math.floor(f.length/2)]:0, lo=f.length?f[Math.floor(f.length*0.05)]:0;
    var lines=[
      'fps '+med+' (low '+lo+')  worst frame '+Math.round(TELE.worstFrame)+'ms',
      'screen '+W+'x'+H2+' @'+DPR+' q'+QUAL.toFixed(2)+'  safe '+SAFEB,
      'taps '+TELE.taps+'  on button '+TELE.hits+'  missed '+TELE.miss,
      'kills '+G.killed+'  freed '+G.freed+'  lvl '+p.level
    ];
    var dk=Object.keys(TELE.dmg).sort(function(a,b){return TELE.dmg[b]-TELE.dmg[a];});
    for(var di=0;di<Math.min(3,dk.length);di++) lines.push('hurt by '+dk[di]+': '+TELE.dmg[dk[di]]);
    var bw2=0; hx.font='600 12px ui-monospace,Menlo,monospace';
    for(var li=0;li<lines.length;li++) bw2=Math.max(bw2,hx.measureText(lines[li]).width);
    hx.fillStyle='rgba(6,9,7,.82)'; roundRect(10,P.y+P.hMax+(DESKTOP?10:MG.r*2+30),bw2+20,lines.length*16+14,8); hx.fill();
    hx.strokeStyle='rgba(232,194,106,.5)'; hx.lineWidth=1; hx.stroke();
    hx.textAlign='left'; hx.fillStyle='#cdbb8c';
    for(var lj=0;lj<lines.length;lj++) hx.fillText(lines[lj],20,P.y+P.hMax+(DESKTOP?28:MG.r*2+48)+lj*16);
    // show where taps landed off-target
    hx.fillStyle='rgba(255,90,70,.75)';
    for(var mi=0;mi<TELE.missPts.length;mi++){
      hx.beginPath(); hx.arc(TELE.missPts[mi][0],TELE.missPts[mi][1],5,0,6.3); hx.fill();
    }
  }
  // tip
  if(G.tipT>0){
    hx.textAlign='center'; hx.globalAlpha=Math.min(1,G.tipT);
    hx.font='600 15px Georgia,serif';
    // on a phone the minimap sits under the panel; keep the tip clear of it
    var tipY=DESKTOP?H2*0.22:Math.max(H2*0.22,MG.y+MG.r+26);
    hx.fillStyle='rgba(0,0,0,.6)'; hx.fillText(G.tip,W/2+1,tipY+1);
    hx.fillStyle='#e8c26a'; hx.fillText(G.tip,W/2,tipY);
    hx.globalAlpha=1;
  }
  // buttons
  var held={};
  for(var tq in touches) if(touches[tq].btn) held[touches[tq].btn]=1;
  for(var b=0;b<btns.length;b++){
    var bt=btns[b], dn=!!held[bt.id];
    var on=(bt.id!=='dash')||p.dashCd<=0;
    hx.fillStyle=dn?'rgba(232,194,106,.42)':'rgba(10,14,10,.42)';
    hx.beginPath(); hx.arc(bt.x,bt.y,bt.r*(dn?1.06:1),0,6.3); hx.fill();
    hx.strokeStyle=on?(dn?'rgba(255,230,170,.95)':'rgba(232,194,106,.65)'):'rgba(120,130,120,.35)';
    hx.lineWidth=dn?3:2; hx.stroke();
    hx.textAlign='center'; hx.fillStyle=on?(dn?'#fff6de':'#f3e7c9'):'#8a9088';
    hx.font='600 '+Math.round(bt.r*0.33)+'px Georgia,serif';
    if(bt.id==='potion'){ hx.fillStyle='#ff9d9d'; hx.fillText('✚'+p.potions,bt.x,bt.y+bt.r*0.16); }
    else if(bt.id==='skills'){ hx.fillStyle=G.build.points>0?'#9ff07a':'#f3e7c9';
      hx.fillText(G.build.points>0?'★'+G.build.points:'SKILL',bt.x,bt.y+bt.r*0.16); }
    else if(bt.id==='attack'&&G.talk){ hx.fillStyle='#ffd76a'; hx.fillText('TALK',bt.x,bt.y+bt.r*0.14); }
    else hx.fillText(bt.label,bt.x,bt.y+bt.r*0.14);
  }
  // talk to Bram
  if(G.talk){
    var ks=project(G.talk.x,G.talk.y+2.55,G.talk.z);
    if(ks){
      var kt=DESKTOP?'E  ·  talk to Bram':'Tap TALK';
      hx.font='700 15px Georgia,serif'; hx.textAlign='center';
      var kw=hx.measureText(kt).width+22;
      hx.fillStyle='rgba(8,11,8,.72)'; roundRect(ks.x-kw/2,ks.y-19,kw,27,8); hx.fill();
      hx.strokeStyle='rgba(255,215,106,.8)'; hx.lineWidth=1.5; hx.stroke();
      hx.fillStyle='#ffd76a'; hx.fillText(kt,ks.x,ks.y);
    }
  }
  // what a strike would hit
  if(G.lock&&G.ents.indexOf(G.lock)>=0){
    var ls=project(G.lock.x,G.lock.y+1.5*(G.lock.scale||1),G.lock.z);
    if(ls){
      var rr2=Math.max(13,34-ls.d*0.22);
      hx.strokeStyle='rgba(255,225,150,.85)'; hx.lineWidth=2;
      hx.beginPath(); hx.arc(ls.x,ls.y,rr2,0.4,1.2); hx.stroke();
      hx.beginPath(); hx.arc(ls.x,ls.y,rr2,2.0,2.8); hx.stroke();
      hx.beginPath(); hx.arc(ls.x,ls.y,rr2,3.6,4.4); hx.stroke();
      hx.beginPath(); hx.arc(ls.x,ls.y,rr2,5.2,6.0); hx.stroke();
    }
  }
  // an enemy winding up to strike: a ring that closes in
  for(var wq=0;wq<G.ents.length;wq++){
    var we=G.ents[wq];
    if(!we.wind||we.wind<=0) continue;
    var ws=project(we.x,we.y+2.1*(we.scale||1),we.z); if(!ws) continue;
    var full=we.big?0.55:0.38, prog=1-we.wind/full;
    var rad=Math.max(10,(38-ws.d*0.2))*(1.6-prog*0.6);
    hx.strokeStyle='rgba(235,90,70,'+(0.45+prog*0.5)+')'; hx.lineWidth=3;
    hx.beginPath(); hx.arc(ws.x,ws.y,rad,0,6.3); hx.stroke();
  }
  // left stick (touch only)
  var SR=Math.max(42,Math.min(W,H2)*0.11);
  if(DESKTOP){
    var keys='WASD move   ·   mouse look   ·   E / L-click strike   ·   F / R-click shoot';
    var keys2='space jump   ·   shift dash   ·   Q potion   ·   TAB skills   ·   M sound';
    var runT=G.t-(G.runStart||0), ka=runT<50?0.42:Math.max(0,0.42*(1-(runT-50)/6));
    if(ka>0){
      hx.textAlign='center'; hx.font='600 12.5px Georgia,serif';
      hx.fillStyle='rgba(243,231,201,'+ka.toFixed(3)+')';
      hx.fillText(keys,W/2,H2-30); hx.fillText(keys2,W/2,H2-13);
    }
    if(!LOCKED){
      var bw3=210, bh3=34, by3=H2*0.80;
      hx.fillStyle='rgba(8,11,8,.62)'; roundRect(W/2-bw3/2,by3-bh3/2,bw3,bh3,9); hx.fill();
      hx.strokeStyle='rgba(232,194,106,.6)'; hx.lineWidth=1.5; hx.stroke();
      hx.fillStyle='#e8c26a'; hx.font='600 14px Georgia,serif';
      hx.fillText('Click to look around',W/2,by3+5);
    } else {
      // a small crosshair, since the mouse is captured
      hx.strokeStyle='rgba(243,231,201,.5)'; hx.lineWidth=1.5;
      hx.beginPath(); hx.moveTo(W/2-7,H2*0.46); hx.lineTo(W/2+7,H2*0.46); hx.stroke();
      hx.beginPath(); hx.moveTo(W/2,H2*0.46-7); hx.lineTo(W/2,H2*0.46+7); hx.stroke();
    }
  } else if(STICK.on){
    var o=null; for(var tk in touches) if(touches[tk].stick) o=touches[tk];
    if(o){
      hx.strokeStyle='rgba(243,231,201,.34)'; hx.lineWidth=2.5;
      hx.beginPath(); hx.arc(o.sx,o.sy,SR,0,6.3); hx.stroke();
      hx.fillStyle='rgba(243,231,201,.14)'; hx.fill();
      var ddx2=o.x-o.sx, ddy=o.y-o.sy, l2=Math.hypot(ddx2,ddy);
      if(l2>SR){ddx2*=SR/l2;ddy*=SR/l2;}
      hx.fillStyle='rgba(243,231,201,.55)';
      hx.beginPath(); hx.arc(o.sx+ddx2,o.sy+ddy,SR*0.42,0,6.3); hx.fill();
    }
  } else {
    var hx0=SR+26, hy0=H2-SAFEB-SR-14;
    if(DESKTOP){ hx0=-999; hy0=-999; }
    hx.strokeStyle='rgba(243,231,201,.16)'; hx.lineWidth=2;
    hx.beginPath(); hx.arc(hx0,hy0,SR,0,6.3); hx.stroke();
    hx.fillStyle='rgba(243,231,201,.10)';
    hx.beginPath(); hx.arc(hx0,hy0,SR*0.4,0,6.3); hx.fill();
    hx.fillStyle='rgba(243,231,201,.3)'; hx.font='600 11px Georgia,serif'; hx.textAlign='center';
    hx.fillText('drag to move',hx0,hy0+SR+15);
  }
  hx.restore();
}
function roundRect(x,y,w,h,r){
  hx.beginPath(); hx.moveTo(x+r,y);
  hx.arcTo(x+w,y,x+w,y+h,r); hx.arcTo(x+w,y+h,x,y+h,r);
  hx.arcTo(x,y+h,x,y,r); hx.arcTo(x,y,x+w,y,r); hx.closePath();
}
/* world offset -> minimap offset. The camera looks along (sin yaw, cos yaw) and its
   screen-right is (-cos yaw, sin yaw); those become map-up and map-right, so the map
   turns with the view. (The old version was mirrored: things ahead of you showed up
   behind the arrow, and left/right were swapped.) */
function rotPt(x,z,yaw){ var c=Math.cos(yaw),s=Math.sin(yaw); return {x:-x*c+z*s, y:-(x*s+z*c)}; }
function project(x,y,z){
  var vx=view[0]*x+view[4]*y+view[8]*z+view[12];
  var vy=view[1]*x+view[5]*y+view[9]*z+view[13];
  var vz=view[2]*x+view[6]*y+view[10]*z+view[14];
  if(vz>-0.5) return null;
  var cx=proj[0]*vx, cy2=proj[5]*vy, cw=-vz;
  return {x:(cx/cw*0.5+0.5)*W, y:(0.5-cy2/cw*0.5)*H2, d:cw};
}

/* ---------- screens ---------- */
function show(html){ ui.innerHTML='<div class="card">'+html+'</div>'; ui.classList.add('on'); }
function hide(){ ui.classList.remove('on'); ui.innerHTML=''; touches={}; IN.attack=false; }
function titleScreen(){
  G.state='title';
  show('<h1>Elven Hunter</h1>'+
    '<p class="sub">An open wood. Spiders in the canopy, snakes in the grass, wasps round their hive, and your kin strung up between the trees.</p>'+
    '<p class="sub">Free them and they fight beside you.</p>'+
    '<button class="btn" id="make">Make your hunter</button>'+
    '<button class="btn alt" id="snd">'+sndLabel()+'</button>'+
    '<a class="btn alt" id="arcade" href="../">&larr; Back to Elk Leaf Arcade</a>'+
    (G.best?'<p class="hint">Best: level '+G.best+'</p>':'')+
    (DESKTOP
      ? '<p class="hint"><b>Laptop:</b> WASD to move · move the mouse to look · E or left-click strike · F or right-click shoot<br>'+
        'Space jump · Shift dash · Q potion · Tab skills · M sound · scroll to zoom · Esc frees the cursor</p>'
      : '<p class="hint"><b>Phone:</b> drag the left side to move, the right side to look, buttons to fight.<br>'+
        'Your hunter swings on her own when something gets close.</p>'));
  document.getElementById('make').onclick=makeScreen;
  document.getElementById('snd').onclick=function(){ sndWake(); this.textContent=sndCycle(); };
}
function makeScreen(){
  G.state='make';
  var b=G.build;
  function opts(kind,map){
    var o='';
    for(var k in map){ var v=map[k];
      o+='<div class="pick'+(b[kind]===k?' on':'')+'" data-kind="'+kind+'" data-k="'+k+'"><b>'+v.name+'</b><small>'+v.desc+'</small></div>';
    } return o;
  }
  recalc();
  show('<h1>Make your hunter</h1>'+
    '<h3>Race</h3><div class="picks">'+opts('race',RACES)+'</div>'+
    '<h3>Calling</h3><div class="picks">'+opts('cls',CLASSES)+'</div>'+
    '<div class="stat"><span>Health</span><b>'+G.S.maxHp+'</b></div>'+
    '<div class="stat"><span>Melee / ranged</span><b>'+Math.round(G.S.melee*100)+'% / '+Math.round(G.S.ranged*100)+'%</b></div>'+
    '<div class="stat"><span>Followers</span><b>'+G.S.allies+'</b></div>'+
    '<button class="btn" id="go">Into the wood</button>'+
    '<button class="btn alt" id="back">Back</button>');
  var els=ui.querySelectorAll('.pick');
  for(var i=0;i<els.length;i++) els[i].onclick=function(){
    G.build[this.getAttribute('data-kind')]=this.getAttribute('data-k'); makeScreen(); };
  document.getElementById('go').onclick=startRun;
  document.getElementById('back').onclick=titleScreen;
}
function startRun(){
  G.build.skills={}; G.build.points=0;
  recalc();
  G.player=newPlayer(); G.killed=0; G.freed=0; G.found={}; G.msgs.length=0; G.bounty=null; G.bountiesDone=0; G.runStart=G.t; FX.length=0; G.hitStop=0; G.shakeA=0;
  populate();
  G.cam.yaw=0; G.cam.pitch=DESKTOP?0.32:0.30; G.cam.dist=DESKTOP?6.2:7.0;
  G.cam.x=G.player.x; G.cam.y=G.player.y+6; G.cam.z=G.player.z+9;
  layoutButtons();
  hide(); G.state='play';
  wantLock();                     // the Play click is a user gesture: capture the mouse now
  tip('Follow the path north to the tavern');
}
/* menus pause the wood; on a laptop they free the cursor so you can click */
function menuOpen(state){
  G.state=state; IN.attack=false; IN.shoot=false; IN.shootHeld=false; IN.atkBuf=0; IN.shotBuf=0;
  for(var k in KEY) KEY[k]=false;
  if(document.pointerLockElement){ try{ document.exitPointerLock(); }catch(e){} }
}
function menuClose(){ hide(); G.state='play'; wantLock(); }
function skillScreen(flash){
  if(G.state==='play'||G.state==='talk') menuOpen('skills');
  else if(G.state!=='skills') return;          // (it re-draws itself after every point you spend)
  var sp=spentClass(), T=tree(), rows='';
  for(var i=0;i<T.length;i++){
    var s=T[i], have=SK(s.id), locked=(SKILLS[G.build.cls].indexOf(s)>=0&&s.t>sp);
    var can=G.build.points>0&&have<s.r&&!locked;
    rows+='<div class="sk'+(can?' can':' off')+(have?' has':'')+(flash===s.id?' flash':'')+'" data-i="'+i+'">'+
      '<div class="skh"><b>'+s.n+'</b><span>'+(have>=s.r?'MAX':have+'/'+s.r)+'</span></div><small>'+s.d+
      (locked?' — unlocks after '+s.t+' points in your calling ('+sp+' so far)':'')+'</small>'+
      (can?'<em>tap to learn</em>':'')+'</div>';
  }
  show('<h1>'+RACES[G.build.race].name+' '+CLASSES[G.build.cls].name+'</h1>'+
    '<p class="sub">Level '+G.player.level+' · <b class="pts">'+G.build.points+'</b> skill point'+(G.build.points===1?'':'s')+' to spend</p>'+
    '<div class="stat"><span>Health</span><b>'+G.S.maxHp+'</b></div>'+
    '<div class="stat"><span>Melee / ranged</span><b>'+Math.round(G.S.melee*100)+'% / '+Math.round(G.S.ranged*100)+'%</b></div>'+
    '<div class="stat"><span>Prisoners freed / foes slain</span><b>'+G.freed+' / '+G.killed+'</b></div>'+
    '<div class="skills">'+rows+'</div>'+
    '<button class="btn" id="close">Back to the wood</button>'+
    '<button class="btn alt" id="snd2">'+sndLabel()+'</button>');
  document.getElementById('snd2').onclick=function(){ sndWake(); this.textContent=sndCycle(); };
  var els=ui.querySelectorAll('.sk');
  for(var k=0;k<els.length;k++) els[k].onclick=function(){
    var s=tree()[+this.getAttribute('data-i')];
    if(G.build.points<=0||SK(s.id)>=s.r) return;
    if(SKILLS[G.build.cls].indexOf(s)>=0&&s.t>spentClass()) return;
    G.build.skills[s.id]=SK(s.id)+1; G.build.points--; recalc(); layoutButtons(); buzz(15); sfx('pickup');
    var top=ui.scrollTop; skillScreen(s.id); ui.scrollTop=top;    // keep your place in the list
  };
  document.getElementById('close').onclick=menuClose;
}

/* ---------- the Greenleaf: Bram's counter ---------- */
var BOUNTIES=[
  {id:'spiders', short:'Spiders slain', t:'Slay {n} spiders', n:function(l){ return 6+Math.min(6,l); }, on:['spider'],
   say:'The spiders creep closer every night. Thin them out — {n} of them — and the drinks are on me.'},
  {id:'snakes', short:'Snakes', t:'Drive off {n} snakes', n:function(l){ return 5+Math.min(5,(l/2)|0); }, on:['snake'],
   say:'Snakes in the cellar, snakes on the path. Deal with {n} of them and I\'ll sleep easier.'},
  {id:'wasps', short:'Wasps', t:'Swat {n} wasps', n:function(l){ return 5+Math.min(5,(l/2)|0); }, on:['wasp'],
   say:'Those wasps have been at my honey again. Swat {n} of them for me?'},
  {id:'freed', short:'Captives freed', t:'Free {n} captives', n:function(){ return 3; }, on:['freed'],
   say:'Folk have gone missing in the webs. Cut {n} of them down and send them home.'},
  {id:'giant', short:'Giant spider', t:'Slay a giant spider', n:function(){ return 1; }, on:['giant'],
   say:'Something huge broods out past the Queen\'s Hollow. Kill it and I\'ll make it worth your while.'}
];
var HIRE_PRICE={ranger:45,blade:45,knight:70,mage:60,druid:60,dwarf:70};
function bountyReward(b){ var l=G.player.level; return {coins:20+b.n*6+l*4, xp:60+b.n*20+l*10}; }
function bountyTick(tags){
  var b=G.bounty; if(!b||b.got>=b.n) return;
  if(tags.indexOf(b.def.on[0])<0) return;
  b.got++;
  var p=G.player;
  if(b.got>=b.n){ tip('Bounty done — Bram has your reward'); sfx('discover'); msg('Bounty done!','#ffd76a',p.x,p.y+2.8,p.z); }
  else msg(b.def.short+' '+b.got+'/'+b.n,'#ffd76a',p.x,p.y+3.0,p.z,14);
}
function deployed(){ var n=0; for(var i=0;i<G.ents.length;i++) if(G.ents[i].kind==='ally') n++; return n; }
function keeperScreen(say){
  if(G.state==='play'){ menuOpen('talk'); G.offers=null; sfx('click'); }
  else if(G.state!=='talk') return;
  var p=G.player, b=G.bounty, S=G.S, k=keeper();
  if(!G.offers){                                     // who's drinking at the bar this visit
    var pool=[0,1,2,3,4,5].sort(function(){ return Math.random()-0.5; }).slice(0,3);
    var names=NAMES.slice().sort(function(){ return Math.random()-0.5; });
    G.offers=pool.map(function(i,n){ return {ak:i,name:names[n]}; });
  }
  var lines=['Mind the mud. What\'ll it be?','Sit, sit. The stew is mostly safe.','Back in one piece! Good.','The fire\'s warm and the ale is cold.'];
  var hpFull=p.hp>=p.maxHp-0.5;
  var opts=[];
  opts.push({id:'rest',  t:'Rest by the fire', d:hpFull?'You are already rested':'Mend you and your company — free', off:false});
  opts.push({id:'potion',t:'Buy a healing potion — 25 ◉', d:p.potions>=6?'Your belt is full':(p.coins<25?'Not enough coin':'You carry '+p.potions+' of 6'), off:p.potions>=6||p.coins<25});
  var full=deployed()>=S.allies;
  opts.push({id:'hire',  t:'Hire a companion', d:full?'Your company is full ('+deployed()+' of '+S.allies+')':'Blades for coin ('+deployed()+' of '+S.allies+' in your company)', off:full});
  if(!b) opts.push({id:'work', t:'Ask for work', d:'Bram always has a job going', off:false});
  else if(b.got>=b.n){ var rw=bountyReward(b); opts.push({id:'claim', t:'Collect your bounty', d:'+'+rw.coins+' ◉ and +'+rw.xp+' XP', off:false, gold:true}); }
  else opts.push({id:'none', t:'Bounty: '+b.def.t.replace('{n}',b.n), d:'Progress '+b.got+' of '+b.n, off:true});
  if(G.build.points>0) opts.push({id:'train', t:'Spend your skill point'+(G.build.points>1?'s':'')+' ('+G.build.points+')', d:'Train in the back room', off:false, gold:true});
  var html='<h1>Bram</h1><p class="sub">Keeper of the Greenleaf Tavern</p>'+
    '<p class="say">“'+(say||lines[(Math.random()*lines.length)|0])+'”</p>'+
    '<div class="stat"><span>Your purse</span><b>◉ '+p.coins+' &nbsp; ✚ '+p.potions+'</b></div>'+
    '<div class="stat"><span>Health</span><b>'+Math.ceil(p.hp)+' / '+p.maxHp+'</b></div>'+
    '<div class="opts">';
  for(var i=0;i<opts.length;i++){ var o=opts[i];
    html+='<button class="opt'+(o.off?' off':'')+(o.gold?' gold':'')+'" data-o="'+o.id+'"'+(o.off?' disabled':'')+'><b>'+o.t+'</b><small>'+o.d+'</small></button>'; }
  html+='</div><button class="btn" id="leave">Back to the wood</button>';
  show(html);
  var els=ui.querySelectorAll('.opt');
  for(var j=0;j<els.length;j++) els[j].onclick=function(){ keeperDo(this.getAttribute('data-o')); };
  document.getElementById('leave').onclick=menuClose;
}
function keeperDo(id){
  var p=G.player, k=keeper();
  if(id==='rest'){
    p.hp=p.maxHp; for(var i=0;i<G.ents.length;i++){ var a=G.ents[i]; if(a.kind==='ally') a.hp=a.maxHp; }
    sfx('potion'); keeperScreen('There. Feet up a while — you look better already.');
  } else if(id==='potion'){
    if(p.coins<25||p.potions>=6) return;
    p.coins-=25; p.potions++; sfx('coin'); keeperScreen('Brewed it myself. Mostly herbs.');
  } else if(id==='hire'){ hireScreen(); }
  else if(id==='work'){
    var l=p.level, defs=BOUNTIES.filter(function(d){ return d.id!=='giant'||l>=3; });
    var d=defs[(Math.random()*defs.length)|0];
    G.bounty={def:d,n:d.n(l),got:0};
    sfx('pickup'); keeperScreen(d.say.replace('{n}',G.bounty.n));
  } else if(id==='claim'){
    var b=G.bounty, rw=bountyReward(b);
    p.coins+=rw.coins; G.bounty=null; G.bountiesDone=(G.bountiesDone||0)+1;
    sfx('coin'); gainXp(rw.xp,k?k.x:p.x,(k?k.y:p.y)+2.6,k?k.z:p.z,'+'+rw.xp+' XP — bounty');
    keeperScreen('As promised. You\'ve earned every coin.');
  } else if(id==='train'){ skillScreen(); }
}
function hireScreen(){
  var p=G.player, S=G.S, full=deployed()>=S.allies, html='<h1>Hire a companion</h1>'+
    '<p class="sub">Your company: '+deployed()+' of '+S.allies+' · ◉ '+p.coins+'</p><div class="opts">';
  for(var i=0;i<G.offers.length;i++){ var o=G.offers[i], K=ALLYKIND[o.ak], price=HIRE_PRICE[K.k]||50;
    if(o.hired){ html+='<button class="opt off" disabled><b>'+o.name+' the '+K.n+'</b><small>Already with you</small></button>'; continue; }
    var off=full||p.coins<price;
    var role=K.heal?'heals you as you fight':(K.range>6?'fights from range':(K.taunt?'draws foes onto a shield':'fights up close'));
    html+='<button class="opt'+(off?' off':'')+'" data-h="'+i+'"'+(off?' disabled':'')+'><b>'+o.name+' the '+K.n+' — '+price+' ◉</b><small>'+
      K.hp+' health, '+role+(full?' · your company is full':(p.coins<price?' · not enough coin':''))+'</small></button>'; }
  html+='</div><button class="btn alt" id="hback">Back to the counter</button>';
  show(html);
  var els=ui.querySelectorAll('.opt[data-h]');
  for(var j=0;j<els.length;j++) els[j].onclick=function(){
    var o=G.offers[+this.getAttribute('data-h')], K=ALLYKIND[o.ak], price=HIRE_PRICE[K.k]||50;
    if(deployed()>=G.S.allies||p.coins<price||o.hired) return;
    p.coins-=price; o.hired=true;
    var kp=keeper(), ax=(kp?kp.x:p.x)+1.5, az=(kp?kp.z:p.z)+1.5;
    spawnAlly(o.ak,ax,az,o.name); sfx('freed',ax,az);
    hireScreen();
  };
  document.getElementById('hback').onclick=function(){ keeperScreen(); };
}
function gameOver(){
  if(G.state!=='play') return;
  G.state='dead';
  if(G.player.level>G.best){ G.best=G.player.level; try{localStorage.setItem('eh3_best',G.best);}catch(e){} }
  var dmgList=Object.keys(TELE.dmg).sort(function(a,b){return TELE.dmg[b]-TELE.dmg[a];})
    .map(function(k){return '<div class="stat"><span>'+k+'</span><b>'+TELE.dmg[k]+' dmg</b></div>';}).join('');
  show('<h1>The wood takes you</h1>'+
    '<p class="sub">Killed by '+(TELE.deaths.length?TELE.deaths[TELE.deaths.length-1].by:'the wood')+'</p>'+
    dmgList+
    '<div class="stat"><span>Level reached</span><b>'+G.player.level+'</b></div>'+
    '<div class="stat"><span>Prisoners freed</span><b>'+G.freed+'</b></div>'+
    '<div class="stat"><span>Foes slain</span><b>'+G.killed+'</b></div>'+
    '<button class="btn" id="again">Walk in again</button>'+
    '<button class="btn alt" id="menu">Title</button>');
  document.getElementById('again').onclick=startRun;
  document.getElementById('menu').onclick=titleScreen;
}

/* ---------- boot ---------- */
function resize(){
  readSafe();
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=cvs.clientWidth; H2=cvs.clientHeight;
  setRes();
  HDPR=Math.min(DPR,1.5);                 // the HUD costs real time on iOS; it needs less resolution
  hud.width=Math.round(W*HDPR); hud.height=Math.round(H2*HDPR);
  layoutButtons();
}
var QUAL=1, HDPR=1, qSamp=[], qT=0;
function autoQuality(dt){
  qT+=dt; qSamp.push(1/Math.max(dt,0.001));
  if(qT<1.4) return;
  var a=0; for(var i=0;i<qSamp.length;i++) a+=qSamp[i];
  a/=qSamp.length; qSamp.length=0; qT=0;
  var old=QUAL;
  // last resort on a struggling device: the world stops casting shadows (it is the
  // big cost of the shadow pass); characters keep theirs
  if(a<32&&QUAL<=0.62&&WORLD&&WORLD.castShadow){ WORLD.castShadow=false; TELE.lowShadows=1;
    for(var pi=0;pi<PROPS3.length;pi++){ PROPS3[pi].hi.castShadow=false; PROPS3[pi].lo.castShadow=false; } }
  if(a<42&&QUAL>0.62) QUAL=Math.max(0.62,QUAL-0.12);
  else if(a>57&&QUAL<1) QUAL=Math.min(1,QUAL+0.06);
  if(QUAL!==old) setRes();
}
var last=0, acc=0, JSMS=0, DRAWMS=0;
function frame(ts){
  var dt=Math.min(0.05,(ts-last)/1000||0.016); last=ts;
  var realDt=dt;
  // hit-stop: for a blink after a blow lands, the world nearly freezes
  if(G.hitStop>0){ G.hitStop-=dt; dt*=0.06; }
  FRAMEDT=G.state==='play'?dt:0;
  MPI=0;
  var t0=performance.now();
  if(G.state==='play') update(dt);
  var t1=performance.now();
  draw(); drawHUD();
  var t2=performance.now();
  JSMS=JSMS*0.9+(t1-t0)*0.1; DRAWMS=DRAWMS*0.9+(t2-t1)*0.1;
  if(G.state==='play'&&realDt>0){ TELE.frame(realDt*1000); if(TELE.fps.length<900) TELE.fps.push(Math.round(1/realDt)); autoQuality(realDt); }
  requestAnimationFrame(frame);
}
function boot(){
  resize();
  initParts();
  initScene();
  buildWorld();
  try{ G.best=+localStorage.getItem('eh3_best')||0; }catch(e){}
  recalc();
  var bt=document.getElementById('boot'); if(bt) bt.textContent='waking the hunters…';
  loadModels(function(){
    warmActors();
    R3.compile(SCENE,CAM3);        // warm every shader up front
    for(var wi=ACTORS.length-1;wi>=0;wi--) if(ACTORS[wi].spec==='warm'){ SCENE.remove(ACTORS[wi].group); ACTORS.splice(wi,1); }
    if(bt) bt.style.display='none';
    titleScreen();
    window.__ready=true;
    requestAnimationFrame(function(t){last=t;requestAnimationFrame(frame);});
  });
}
/* events */
addEventListener('resize',resize);
addEventListener('orientationchange',function(){setTimeout(resize,150);});
ui.addEventListener('click',function(e){ sndWake(); if(e.target&&e.target.closest&&e.target.closest('.btn,.pick,.sk')) sfx('click'); });
addEventListener('pointerdown',function(){ sndWake(); },true);
cvs.addEventListener('pointerdown',function(e){ e.preventDefault(); try{cvs.setPointerCapture(e.pointerId);}catch(_){ }
  ptrDown(e.pointerId,e.clientX,e.clientY); });
cvs.addEventListener('pointermove',function(e){ ptrMove(e.pointerId,e.clientX,e.clientY); });
['pointerup','pointercancel','lostpointercapture'].forEach(function(t){
  cvs.addEventListener(t,function(e){ ptrUp(e.pointerId); }); });
cvs.addEventListener('touchstart',function(e){e.preventDefault();},{passive:false});
cvs.addEventListener('touchmove',function(e){e.preventDefault();},{passive:false});
addEventListener('keydown',function(e){
  if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key)>=0) e.preventDefault();
  KEY[e.key]=true; KEY[e.key.toLowerCase&&e.key.toLowerCase()]=true;
  sndWake();
  if((e.key==='m'||e.key==='M')&&!e.repeat){ var lbl=sndCycle(); if(G.state==='play') tip(lbl); }
  if(e.key===' ') IN.jump=true;
  if(e.key==='j'||e.key==='J'){ IN.attack=true; IN.atkBuf=0.45; }
  // keyboard combat beside WASD: E strikes, F shoots (J / K too); hold either to repeat
  if(e.key==='k'||e.key==='K'||e.key==='f'||e.key==='F'){ IN.shoot=true; IN.shotBuf=0.45; IN.shootHeld=true; }
  if(e.key==='q'||e.key==='Q') usePotion();
  if(e.key==='c'||e.key==='C'||e.key==='Shift') IN.dash=true;
  if(DEBUG&&(e.key==='i'||e.key==='I')) SHOWDBG=!SHOWDBG;
  if(e.key==='e'||e.key==='E'){ IN.attack=true; IN.atkBuf=0.45; }
  setMode(true);
  if(e.key==='Tab'){ e.preventDefault(); if(G.state==='play') skillScreen(); else if(G.state==='skills') menuClose(); }
  if(e.key==='Escape'&&(G.state==='skills'||G.state==='talk')) menuClose();
});
addEventListener('keyup',function(e){
  KEY[e.key]=false; if(e.key.toLowerCase) KEY[e.key.toLowerCase()]=false;
  if(e.key==='j'||e.key==='J'||e.key==='e'||e.key==='E') IN.attack=false;
  if(e.key==='k'||e.key==='K'||e.key==='f'||e.key==='F') IN.shootHeld=false;
});
/* ---------- laptop / desktop input ---------- */
function wantLock(){
  if(!DESKTOP||G.state!=='play') return;
  if(document.pointerLockElement===cvs) return;
  try{ cvs.requestPointerLock(); }catch(e){}
}
cvs.addEventListener('click',function(){ wantLock(); });
document.addEventListener('pointerlockchange',function(){
  LOCKED=(document.pointerLockElement===cvs);
  if(!LOCKED){ IN.attack=false; IN.shoot=false; IN.shootHeld=false; }
});
var LASTTOUCH=0;
addEventListener('touchstart',function(){ LASTTOUCH=performance.now(); },{capture:true,passive:true});
addEventListener('mousemove',function(e){
  // phones send a fake mouse move after a tap; only a real mouse switches to laptop controls
  if((e.movementX||e.movementY)&&performance.now()-LASTTOUCH>1000) setMode(true);
  if(!LOCKED) return;
  G.cam.yaw-=e.movementX*0.0024;
  G.cam.pitch=clamp(G.cam.pitch+e.movementY*0.0022,-0.30,1.05);
  G.cam.manual=0.8;
});
addEventListener('mousedown',function(e){
  if(!DESKTOP||!LOCKED||G.state!=='play') return;
  if(e.button===0){ IN.attack=true; IN.atkBuf=0.45; }
  else if(e.button===2){ IN.shoot=true; IN.shotBuf=0.45; IN.shootHeld=true; }
  else if(e.button===1){ IN.jump=true; IN.jumpBuf=0.35; }
});
addEventListener('mouseup',function(e){ if(e.button===0) IN.attack=false; if(e.button===2) IN.shootHeld=false; });
addEventListener('contextmenu',function(e){ if(DESKTOP) e.preventDefault(); });
cvs.addEventListener('wheel',function(e){
  if(!DESKTOP) return;
  e.preventDefault();
  G.cam.dist=clamp(G.cam.dist+e.deltaY*0.012,4.0,18.0);
},{passive:false});
cvs.addEventListener('touchstart',function(){ setMode(false); },{passive:true});
if(R3) boot();
