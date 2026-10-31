/* ================= Elven Hunter 3D ================= */
var cvs=document.getElementById('gl'), hud=document.getElementById('hud'), hx=hud.getContext('2d');
var ui=document.getElementById('ui');
var gl=cvs.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'});
if(!gl){ document.body.innerHTML='<div style="color:#e8c26a;font:16px Georgia,serif;padding:30px">This device cannot run WebGL.</div>'; }
var W=0,H2=0,DPR=1,prog,uni={},att={},WORLD=null;
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
      render:{ quality:Math.round(QUAL*100)/100, hudScale:HDPR, safeBottom:SAFEB },
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
function msg(txt,col,x,y,z){ G.msgs.push({txt:txt,col:col||'#f3e7c9',x:x,y:y,z:z,t:0}); }
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
function spawnGoblin(x,z,kind){
  var hp=42*(1+G.player.level*0.10);
  G.ents.push({kind:'goblin',gk:kind||'spear',x:x,y:H(x,z),z:z,vy:0,yaw:Math.random()*6.28,scale:0.78,
    hp:hp,maxHp:hp,dmg:9*Math.min(1.6,0.55+G.player.level*0.07),speed:0,walkPhase:Math.random()*6,onGround:true,
    look:{skin:SKIN.goblin,hair:HAIR.black,pants:[0.24,0.22,0.16],boot:[0.22,0.16,0.10],
      tunic:[0.33,0.30,0.18],sleeve:[0.33,0.30,0.18],belt:[0.26,0.19,0.12],metal:[0.62,0.60,0.56],
      cloak:null,weapon:kind==='bow'?'bow':'spear',ears:1},
    aggro:kind==='bow'?26:19, atkCd:0, wind:0, hurtT:0, home:{x:x,z:z}, wander:Math.random()*6.28, wanderT:0});
}
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
  buildCamp(m,-72,48);
  buildHollow(m,86,-56);
  buildStones(m,-88,-78);
  WORLD=new GPUMesh(gl,m);
  WORLDTRIS=m.count()/3;
}
var WORLDTRIS=0;
function populate(){
  G.ents.length=0;
  var r=mulberry(4242);
  // spiders near the hollow + scattered
  for(var i=0;i<16;i++){ var a=r()*6.28,d=4+r()*16; spawnSpider(86+Math.cos(a)*d,-56+Math.sin(a)*d,r()<0.18); }
  for(var i2=0;i2<22;i2++){ var x=(r()*2-1)*WHALF*0.8, z=(r()*2-1)*WHALF*0.8;
    var dd=Math.hypot(x,z);
    if(dd<34||H(x,z)<WATER+0.5) continue;
    spawnSpider(x,z, dd>70&&r()<0.09); }
  // goblins at the camp
  for(var k=0;k<13;k++){ var a2=r()*6.28,d2=3+r()*13;
    spawnGoblin(-72+Math.cos(a2)*d2,48+Math.sin(a2)*d2, r()<0.3?'bow':'spear'); }
  for(var k2=0;k2<8;k2++){ var gx=(r()*2-1)*WHALF*0.7, gz=(r()*2-1)*WHALF*0.7;
    if(Math.hypot(gx,gz)<40||H(gx,gz)<WATER+0.5) continue; spawnGoblin(gx,gz,r()<0.3?'bow':'spear'); }
  // prisoners
  var spots=[[86,-56],[-72,48],[0,0],[-88,-78]];
  for(var p=0;p<14;p++){
    var sp=spots[(r()*spots.length)|0], a3=r()*6.28, d3=8+r()*22;
    var cx=sp[0]+Math.cos(a3)*d3, cz=sp[1]+Math.sin(a3)*d3;
    cx=Math.max(-WHALF*0.9,Math.min(WHALF*0.9,cx)); cz=Math.max(-WHALF*0.9,Math.min(WHALF*0.9,cz));
    if(H(cx,cz)<WATER+0.4) continue;
    spawnCocoon(cx,cz);
  }
  for(var f=0;f<10;f++){ var fx=(r()*2-1)*WHALF*0.8, fz=(r()*2-1)*WHALF*0.8;
    if(H(fx,fz)<WATER+0.4) continue; spawnFairy(fx,fz); }
}

/* ---------- input ---------- */
var IN={mx:0,mz:0,look:{x:0,y:0},attack:false,shoot:false,jump:false,dash:false,interact:false,atkBuf:0,shotBuf:0,jumpBuf:0};
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
    {id:'skills',x:W-r*0.90,    y:SAFET+r*2.05, r:r*0.58,label:'SKILL'},
    {id:'dbg',   x:W-r*0.90,    y:SAFET+r*3.40, r:r*0.44,label:'i'}
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
  else if(id==='dbg') SHOWDBG=!SHOWDBG;
  buzz(8);
}
function ptrDown(id,x,y){
  if(G.state!=='play') return;
  var b=hitBtn(x,y);
  if(b){ touches[id]={btn:b.id}; press(b.id); TELE.tap(b.id,x,y,true); return; }
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
var SHOWDBG=false;
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
  msg('+health','#8ff08a',p.x,p.y+2.4,p.z); buzz(20);
}
function doAttack(){
  var p=G.player, S=G.S;
  if(p.cdT>0||p.dead) return;
  // turn to face the nearest thing worth hitting, so a tap is never wasted on empty air
  var lock=aimTarget(p,5.4);
  if(lock) p.yaw=Math.atan2(lock.x-p.x,lock.z-p.z);
  p.cdT=0.45; p.atkT=p.atkDur=0.42; p.atkKind='melee';
  var reach=3.6, hit=0;
  for(var i=0;i<G.ents.length;i++){
    var e=G.ents[i];
    if(e.kind!=='spider'&&e.kind!=='goblin'&&e.kind!=='cocoon') continue;
    var dx=e.x-p.x, dz=e.z-p.z, d=Math.hypot(dx,dz);
    if(d>reach+(e.scale||1)) continue;
    if(!S.whirl){
      var fx=Math.sin(p.yaw), fz=Math.cos(p.yaw);
      if((dx*fx+dz*fz)/(d||1) < -0.15) continue;   // a forgiving arc, not a narrow cone
    }
    var dmg=(10+p.level*2.6)*S.melee;
    if(e.kind==='cocoon') breakCocoon(e,dmg);
    else { hurtEnemy(e,dmg); if(S.lifesteal) p.hp=Math.min(p.maxHp,p.hp+dmg*S.lifesteal); }
    hit++;
  }
  G.lock=lock||null;
  if(hit) buzz(18);
}
function aimTarget(p,maxD){
  var best=null,bs=-1;
  var fx=Math.sin(p.yaw), fz=Math.cos(p.yaw);
  for(var i=0;i<G.ents.length;i++){
    var o=G.ents[i];
    if(o.kind!=='spider'&&o.kind!=='goblin'&&o.kind!=='cocoon') continue;
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
  p.cdT=S.cd; p.atkT=p.atkDur=0.34; p.atkKind=(S.proj==='arrow')?'bow':'melee';
  var n=1+S.extra, sp=(S.proj==='bolt')?30:(S.proj==='axe'?26:38);
  var tgt=aimTarget(p,34); G.lock=tgt||null;
  var sy=p.y+1.35*p.scale;
  var aimY=0;
  if(tgt){
    var tx=tgt.x-p.x, tz=tgt.z-p.z, ty=(tgt.y+1.0*(tgt.scale||1))-sy;
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
function hurtEnemy(e,d){
  e.hp-=d; e.hurtT=0.18;
  if(e.hp<=0){
    G.killed++; gainXp(50,e.x,e.y+2,e.z);
    if(Math.random()<0.3){ G.player.coins+=3+((Math.random()*7)|0); }
    if(Math.random()<0.16){ G.player.potions++; msg('+potion','#ff9d9d',e.x,e.y+2,e.z); }
    var i=G.ents.indexOf(e); if(i>=0) G.ents.splice(i,1);
  }
}
function breakCocoon(c,d){
  c.hp-=d; c.hurtT=0.18;
  if(c.hp<=0){
    G.freed++; gainXp(100,c.x,c.y+2.4,c.z,'+100 XP — FREED');
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
  }
}
function xpNeed(l){ return Math.round(190*Math.pow(l,1.17)); }
function hurtPlayer(d,src){
  var p=G.player;
  if(p.inv>0||p.dead) return;
  if(p.buff===2) d*=0.5;
  d*=G.S.armor;
  p.hp-=d; p.inv=0.95; p.hurtT=0.3; G.hitFlash=0.5; buzz([30,40,30]);
  TELE.hurt(src||'unknown',d);
  if(p.hp<=0){ p.hp=0; p.dead=true; p.deadT=0; TELE.died(p.level,src||'unknown'); setTimeout(gameOver,1500); }
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
  var fx=-Math.sin(cy), fz=-Math.cos(cy), rx=Math.cos(cy), rz=-Math.sin(cy);
  var wx=IN.mx*rx+IN.mz*fx, wz=IN.mx*rz+IN.mz*fz;
  var L=Math.hypot(wx,wz);
  var spd=S.move*(p.buff===0?1.25:1)*(p.slowT>0?0.55:1);
  if(p.dashT>0) spd=26;
  if(L>0.01){
    wx/=L; wz/=L;
    var tgt=Math.atan2(wx,wz);
    var dy=((tgt-p.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
    p.yaw+=dy*Math.min(1,dt*13);
    var mvs=spd*Math.min(1,L);
    p.x+=wx*mvs*dt; p.z+=wz*mvs*dt; p.speed=mvs;
    p.walkPhase+=dt*mvs*1.5;
  } else { p.speed*=0.72; if(p.dashT<=0) p.speed=0; }
  if(p.dashT>0){ p.x+=Math.sin(p.yaw)*spd*dt; p.z+=Math.cos(p.yaw)*spd*dt; p.inv=Math.max(p.inv,0.2); }
  p.slowT=Math.max(0,(p.slowT||0)-dt);
  // bounds
  var bd=Math.hypot(p.x,p.z), lim=WHALF*0.95;
  if(bd>lim){ p.x*=lim/bd; p.z*=lim/bd; }
  // gravity / jump
  var gh=H(p.x,p.z);
  if((IN.jump||IN.jumpBuf>0)&&p.onGround){ p.vy=8.9; p.onGround=false; IN.jumpBuf=0; }
  IN.jump=false;
  p.vy-=24*dt; p.y+=p.vy*dt;
  if(p.y<=gh){ p.y=gh; p.vy=0; p.onGround=true; }
  // water slows
  if(p.y<WATER+0.3){ p.slowT=0.2; }
  // actions — a tap during cooldown is remembered briefly so it never feels dropped
  IN.atkBuf=Math.max(0,IN.atkBuf-dt); IN.shotBuf=Math.max(0,IN.shotBuf-dt); IN.jumpBuf=Math.max(0,IN.jumpBuf-dt);
  if(IN.attack||IN.atkBuf>0){ if(p.cdT<=0){ doAttack(); IN.atkBuf=0; } }
  else if(p.cdT<=0&&!p.dead){
    // auto-swing: if something hostile is already in reach, the hunter defends herself
    for(var ai2=0;ai2<G.ents.length;ai2++){
      var ae=G.ents[ai2];
      if(ae.kind!=='spider'&&ae.kind!=='goblin') continue;
      if(Math.hypot(ae.x-p.x,ae.z-p.z)<2.8+(ae.scale||1)){ doAttack(); break; }
    }
  }
  if(IN.shoot||IN.shotBuf>0){ IN.shoot=false; if(p.cdT<=0){ doShoot(); IN.shotBuf=0; } }
  if(IN.dash){ IN.dash=false; if(S.dash&&p.dashCd<=0){ p.dashCd=1.6; p.dashT=0.19; msg('Shadowstep','#bff0ff',p.x,p.y+2.4,p.z);} }

  updateEnts(dt);
  followCam(dt);
  // landmarks: discovery, and the tavern as a place to rest
  p.atTavern=false;
  for(var i=0;i<LANDMARKS.length;i++){
    var lm=LANDMARKS[i], ld=Math.hypot(p.x-lm.x,p.z-lm.z);
    if(!G.found[lm.name]&&ld<lm.r+4){
      G.found[lm.name]=1; tip('Discovered: '+lm.name);
      gainXp(60,p.x,p.y+3,p.z,'+60 XP — discovery');
    }
    if(lm.kind==='tavern'&&ld<lm.r+3){
      p.atTavern=true;
      if(p.hp<p.maxHp){ p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.22*dt); }
      for(var ai=0;ai<G.ents.length;ai++){ var al2=G.ents[ai];
        if(al2.kind==='ally'&&al2.hp<al2.maxHp) al2.hp=Math.min(al2.maxHp,al2.hp+al2.maxHp*0.25*dt); }
      G.restT=(G.restT||0)+dt;
      if(G.restT>2.4){ G.restT=0;
        if(p.coins>=25&&p.potions<6){ p.coins-=25; p.potions++; msg('bought a potion','#ff9d9d',p.x,p.y+2.6,p.z); }
      }
      if(G.tipT<=0) tip('Resting — your company mends here');
    }
  }
  // respawn pressure
  G.spawnT-=dt;
  if(G.spawnT<=0){
    G.spawnT=7;
    var alive=0; for(var k=0;k<G.ents.length;k++){var e=G.ents[k]; if(e.kind==='spider'||e.kind==='goblin') alive++;}
    if(alive<46){
      var a=Math.random()*6.28, d=46+Math.random()*26;
      var sx=p.x+Math.cos(a)*d, sz=p.z+Math.sin(a)*d, sd2=Math.hypot(sx,sz);
      if(sd2>34&&sd2<WHALF*0.9&&H(sx,sz)>WATER+0.5){
        if(Math.random()<0.6) spawnSpider(sx,sz,sd2>70&&Math.random()<0.08); else spawnGoblin(sx,sz,Math.random()<0.3?'bow':'spear');
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
  var gh=H(e.x,e.z);
  if(e.onGround===false){ e.vy-=24*dt; e.y+=e.vy*dt; if(e.y<=gh){e.y=gh;e.vy=0;e.onGround=true;} }
  else e.y+=(gh-e.y)*Math.min(1,dt*10);
}
function updateEnts(dt){
  var p=G.player;
  for(var i=G.ents.length-1;i>=0;i--){
    var e=G.ents[i];
    var pd=Math.hypot(e.x-p.x,e.z-p.z);
    if(e.hurtT>0) e.hurtT-=dt;

    if(e.kind==='shot'){
      e.spin+=dt*18; e.life-=dt;
      var steps=Math.max(1,Math.ceil(Math.hypot(e.vx,e.vy,e.vz)*dt/0.55));
      var sdt=dt/steps, gone=false;
      for(var st=0;st<steps&&!gone;st++){
        e.x+=e.vx*sdt; e.y+=e.vy*sdt; e.z+=e.vz*sdt;
        if(e.proj!=='bolt'&&!e.aimed) e.vy-=11*sdt;
        if(e.y<H(e.x,e.z)-0.2){ gone=true; break; }
        for(var k=0;k<G.ents.length;k++){
          var o=G.ents[k];
          if(o.kind!=='spider'&&o.kind!=='goblin'&&o.kind!=='cocoon') continue;
          if(e.hits.indexOf(o)>=0) continue;
          var rr=(o.scale||1)*1.1+0.6;
          if(Math.hypot(o.x-e.x,o.z-e.z)<rr && e.y>o.y-0.7 && e.y<o.y+2.7*(o.scale||1)){
            if(o.kind==='cocoon') breakCocoon(o,e.dmg);
            else {
              hurtEnemy(o,e.dmg);
              if(e.frost) o.slowT=1.4*e.frost;
              if(e.burst){ for(var bq=0;bq<G.ents.length;bq++){ var o2=G.ents[bq];
                if((o2.kind==='spider'||o2.kind==='goblin')&&o2!==o&&Math.hypot(o2.x-e.x,o2.z-e.z)<e.burst) hurtEnemy(o2,e.dmg*0.55); } }
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
    if(e.kind==='fairy'){
      e.t+=dt; e.bx=Math.sin(e.t*0.9)*2.2; e.by=Math.sin(e.t*1.7)*0.5;
      if(pd<2.6){
        p.buff=e.col; p.buffT=26;
        msg(FAIRYNAME[e.col],'#bff0ff',e.x,e.y+1.4,e.z);
        buzz([12,30,12]); G.ents.splice(i,1);
      }
      continue;
    }
    if(e.kind==='cocoon'){
      if(pd<3.4&&G.tipT<=0) tip('Strike the cocoon to free them');
      continue;
    }
    if(pd>96&&e.kind!=='ally'){ continue; }   // sleep distant creatures

    if(e.kind==='spider'||e.kind==='goblin'){
      e.slowT=Math.max(0,(e.slowT||0)-dt);
      var spd=(e.kind==='spider'?(e.big?3.4:4.2):3.8)*(e.slowT>0?0.5:1);
      // pick target: taunting ally, else player
      var tgt=p, tdist=pd;
      for(var a=0;a<G.ents.length;a++){ var al=G.ents[a];
        if(al.kind==='ally'&&ALLYKIND[al.ak].taunt){
          var ad=Math.hypot(al.x-e.x,al.z-e.z);
          if(ad<e.aggro){ tgt=al; tdist=ad; break; }
        }
      }
      e.atkCd-=dt;
      if(tdist<e.aggro&&!p.dead){
        if(e.kind==='goblin'&&e.gk==='bow'){
          if(tdist>11) moveCreature(e,dt,tgt.x,tgt.z,spd);
          else if(tdist<7) moveCreature(e,dt,e.x-(tgt.x-e.x),e.z-(tgt.z-e.z),spd*0.7);
          else { e.speed*=0.7; var ty=Math.atan2(tgt.x-e.x,tgt.z-e.z); e.yaw+=(((ty-e.yaw+9.42)%6.28)-3.14)*Math.min(1,dt*6); }
          if(e.atkCd<=0&&tdist<22){
            e.atkCd=2.2; e.atkT=0.4; e.atkDur=0.4;
            var gx=tgt.x-e.x, gz=tgt.z-e.z, gy=(tgt.y+1.1)-(e.y+1.2);
            var gL=Math.hypot(gx,gy,gz)||1;
            G.ents.push({kind:'eshot',x:e.x+gx/gL,y:e.y+1.2,z:e.z+gz/gL,
              vx:gx/gL*22,vy:gy/gL*22,vz:gz/gL*22,life:2.4,aimed:1,dmg:e.dmg,src:'goblin archer'});
          }
        } else {
          if(e.wind>0){
            e.speed*=0.5; e.wind-=dt;
            if(e.wind<=0){
              e.atkT=0.3; e.atkDur=0.3;
              if(tdist<2.4+(e.scale||1)){
                if(tgt===p) hurtPlayer(e.dmg,e.kind==='spider'?(e.big?'giant spider':'spider'):'goblin');
                else tgt.hp-=e.dmg;
              }
            }
          } else {
            moveCreature(e,dt,tgt.x,tgt.z,spd);
            if(tdist<1.6+(e.scale||1)&&e.atkCd<=0){
              e.atkCd=e.big?1.9:1.35; e.wind=e.big?0.55:0.38;
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
        if(e.y<H(e.x,e.z)-0.2){ hit=true; break; }
      }
      if(hit||e.life<=0) G.ents.splice(i,1);
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
        if(o3.kind!=='spider'&&o3.kind!=='goblin') continue;
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
            var ax=foe.x-e.x, az=foe.z-e.z, ay=(foe.y+1.0*(foe.scale||1))-(e.y+1.3);
            var aL=Math.hypot(ax,ay,az)||1;
            G.ents.push({kind:'shot',x:e.x+ax/aL,y:e.y+1.3,z:e.z+az/aL,
              vx:ax/aL*34,vy:ay/aL*34,vz:az/aL*34,life:1.6,aimed:1,dmg:K.dmg,
              pierce:0,hits:[],proj:'arrow',burst:0,frost:0,spin:0});
          } else hurtEnemy(foe,K.dmg);
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
    if(ce.kind!=='spider'&&ce.kind!=='goblin') continue;
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
function draw(){
  gl.viewport(0,0,cvs.width,cvs.height);
  var sky=[0.47,0.58,0.56];
  gl.clearColor(sky[0],sky[1],sky[2],1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  if(!G.player) return;
  var p=G.player, c=G.cam;
  m4persp(proj,(W/H2<1)?1.22:1.03,W/H2,0.35,260);
  m4look(view,c.x,c.y,c.z,p.x,p.y+1.5,p.z);
  gl.useProgram(prog);
  gl.uniformMatrix4fv(uni.proj,false,proj);
  gl.uniformMatrix4fv(uni.view,false,view);
  gl.uniform1f(uni.time,G.t);
  gl.uniform3f(uni.fog,sky[0],sky[1],sky[2]);
  var sl=0.42;
  gl.uniform3f(uni.sun,Math.cos(sl)*0.55,0.78,Math.sin(sl)*0.3);
  gl.uniform1f(uni.alpha,1);
  // sky dome, drawn around the camera before anything else
  gl.uniform1f(uni.unlit,1); gl.depthMask(false); gl.disable(gl.CULL_FACE);
  m4trs(model,c.x,c.y,c.z,0,0,0,240,170,240);
  gl.uniformMatrix4fv(uni.model,false,model);
  gl.uniform3f(uni.tint,1,1,1);
  bindMesh(PARTS.sky); gl.drawArrays(gl.TRIANGLES,0,PARTS.sky.n);
  gl.depthMask(true); gl.enable(gl.CULL_FACE); gl.uniform1f(uni.unlit,0);
  // world
  m4id(model);
  gl.uniformMatrix4fv(uni.model,false,model);
  gl.uniform3f(uni.tint,1,1,1);
  bindMesh(WORLD); gl.drawArrays(gl.TRIANGLES,0,WORLD.n);
  // contact shadows
  SHAD.length=0;
  addShadow(p);
  for(var si=0;si<G.ents.length;si++){ var se=G.ents[si];
    if(se.kind==='shot'||se.kind==='eshot'||se.kind==='fairy') continue;
    if(Math.hypot(se.x-c.x,se.z-c.z)>50) continue;
    addShadow(se); }
  if(SHAD.length){
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.uniform1f(uni.alpha,0.30); gl.uniform3f(uni.tint,0.05,0.07,0.04);
    bindMesh(PARTS.disc);
    for(var sk=0;sk<SHAD.length;sk++){ gl.uniformMatrix4fv(uni.model,false,SHAD[sk]); gl.drawArrays(gl.TRIANGLES,0,PARTS.disc.n); }
    gl.depthMask(true); gl.disable(gl.BLEND); gl.uniform1f(uni.alpha,1);
  }
  // entities
  DRAW.length=0;
  pushEnt(p);
  VIS.length=0;
  for(var i=0;i<G.ents.length;i++){
    var e=G.ents[i];
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
  // group by mesh
  DRAW.sort(function(a,b){return a[0]<b[0]?-1:(a[0]>b[0]?1:0);});
  var cur=null;
  for(var k=0;k<DRAW.length;k++){
    var d=DRAW[k];
    if(d[0]!==cur){ cur=d[0]; bindMesh(PARTS[cur]); }
    gl.uniformMatrix4fv(uni.model,false,d[1]);
    gl.uniform3f(uni.tint,d[2][0],d[2][1],d[2][2]);
    gl.drawArrays(gl.TRIANGLES,0,PARTS[cur].n);
  }
}
function bindMesh(M){
  gl.bindBuffer(gl.ARRAY_BUFFER,M.pb); gl.vertexAttribPointer(att.p,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,M.nb); gl.vertexAttribPointer(att.n,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,M.cb); gl.vertexAttribPointer(att.c,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,M.fb); gl.vertexAttribPointer(att.f,1,gl.FLOAT,false,0,0);
}
var RIG=[], MPOOL=[], MPI=0;
function mat(){ if(MPI>=MPOOL.length) MPOOL.push(m4()); return MPOOL[MPI++]; }
function pushEnt(e){
  RIG.length=0;
  var root=mat();
  if(e.kind==='spider') spiderRig(RIG,e,G.t);
  else if(e.kind==='cocoon') cocoonRig(RIG,e,G.t);
  else if(e.kind==='shot'||e.kind==='eshot'){
    var m=mat();
    var yaw=Math.atan2(e.vx,e.vz), pit=-Math.atan2(e.vy,Math.hypot(e.vx,e.vz));
    var col=e.kind==='eshot'?[0.5,0.4,0.3]:(e.proj==='bolt'?[0.55,0.85,1.0]:(e.proj==='axe'?[0.7,0.72,0.76]:[0.75,0.68,0.5]));
    var sc=(e.proj==='bolt')?0.34:0.16;
    m4trs(m,e.x,e.y,e.z,pit,yaw,e.spin||0, sc,(e.proj==='bolt')?sc:1.1,sc);
    DRAW.push(['box',m,col]);
    return;
  }
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
  // death tilt
  if(e.deadT!==undefined&&e.deadT>0){
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
function drawHUD(){
  hx.setTransform(1,0,0,1,0,0);
  hx.clearRect(0,0,hud.width,hud.height);
  hx.save(); hx.scale(HDPR,HDPR);
  if(G.state!=='play'){ hx.restore(); return; }
  var p=G.player;
  // damage flash
  if(G.hitFlash>0){ hx.fillStyle='rgba(180,40,30,'+(G.hitFlash*0.33)+')'; hx.fillRect(0,0,W,H2); }
  // floating messages
  hx.textAlign='center';
  for(var i=0;i<G.msgs.length;i++){
    var m=G.msgs[i], s=project(m.x,m.y,m.z);
    if(!s) continue;
    hx.globalAlpha=Math.max(0,1-m.t/1.5);
    hx.font='600 17px Georgia,serif';
    hx.fillStyle='rgba(0,0,0,.65)'; hx.fillText(m.txt,s.x+1.5,s.y+1.5);
    hx.fillStyle=m.col; hx.fillText(m.txt,s.x,s.y);
  }
  hx.globalAlpha=1;
  // enemy health bars
  for(var k=0;k<G.ents.length;k++){
    var e=G.ents[k];
    if((e.kind!=='spider'&&e.kind!=='goblin'&&e.kind!=='cocoon'&&e.kind!=='ally')||e.hp>=e.maxHp) continue;
    var sp=project(e.x,e.y+2.3*(e.scale||1),e.z); if(!sp) continue;
    var w=Math.max(22,40-sp.d*0.25);
    hx.fillStyle='rgba(0,0,0,.55)'; hx.fillRect(sp.x-w/2-1,sp.y-1,w+2,6);
    hx.fillStyle=(e.kind==='ally')?'#7fbf5a':(e.kind==='cocoon'?'#cfe8e8':'#d6584a');
    hx.fillRect(sp.x-w/2,sp.y,w*Math.max(0,e.hp/e.maxHp),4);
  }
  // health + xp
  var UI=DESKTOP?clamp(W/1100,1,1.5):1, pad=12*UI, bw=DESKTOP?Math.min(300,W*0.22):Math.min(210,W*0.45);
  hx.fillStyle='rgba(8,11,8,.55)'; roundRect(pad,pad,bw+92*UI,56*UI,10); hx.fill();
  hx.fillStyle='#3a1f19'; hx.fillRect(pad+10*UI,pad+10*UI,bw,12*UI);
  hx.fillStyle='#cf4e42'; hx.fillRect(pad+10*UI,pad+10*UI,bw*clamp(p.hp/p.maxHp,0,1),12*UI);
  hx.fillStyle='#2a2438'; hx.fillRect(pad+10*UI,pad+27*UI,bw,7*UI);
  hx.fillStyle='#8f7ad6'; hx.fillRect(pad+10*UI,pad+27*UI,bw*clamp(p.xp/xpNeed(p.level),0,1),7*UI);
  hx.textAlign='left'; hx.fillStyle='#f3e7c9'; hx.font='600 '+Math.round(12*UI)+'px Georgia,serif';
  hx.fillText('Lv '+p.level+'  ·  '+Math.ceil(p.hp)+'/'+p.maxHp,pad+10*UI,pad+48*UI);
  hx.textAlign='right'; hx.fillStyle='#ffe08a';
  hx.fillText('◉ '+p.coins,pad+bw+84*UI,pad+22*UI);
  if(p.buff!==null&&p.buff!==undefined){
    hx.fillStyle='#bff0ff'; hx.font='600 11px Georgia,serif';
    hx.fillText(FAIRYNAME[p.buff].split(' ')[0]+' '+Math.ceil(p.buffT)+'s',pad+bw+84,pad+40);
  }
  // minimap
  var mr=DESKTOP?Math.min(92,W*0.07):Math.min(58,W*0.14), mx=W-pad-mr, my=pad+mr+(DESKTOP?10:34);
  hx.save(); hx.beginPath(); hx.arc(mx,my,mr,0,6.3); hx.clip();
  hx.fillStyle='rgba(12,18,12,.62)'; hx.fillRect(mx-mr,my-mr,mr*2,mr*2);
  var sc=mr/(DESKTOP?86:70);
  for(var L=0;L<LANDMARKS.length;L++){
    var lm=LANDMARKS[L], dx=(lm.x-p.x)*sc, dz=(lm.z-p.z)*sc;
    var rot=rotPt(dx,dz,G.cam.yaw);
    hx.fillStyle=G.found[lm.name]?'#e8c26a':'#6b5f3a';
    hx.fillRect(mx+rot.x-3,my+rot.y-3,6,6);
  }
  for(var e2=0;e2<G.ents.length;e2++){
    var en=G.ents[e2];
    if(en.kind==='shot'||en.kind==='eshot') continue;
    var ddx=(en.x-p.x)*sc, ddz=(en.z-p.z)*sc;
    if(Math.hypot(ddx,ddz)>mr) continue;
    var rp=rotPt(ddx,ddz,G.cam.yaw);
    hx.fillStyle=en.kind==='ally'?'#7fbf5a':(en.kind==='cocoon'?'#dfe8e8':(en.kind==='fairy'?'#bff0ff':'#d6584a'));
    hx.beginPath(); hx.arc(mx+rp.x,my+rp.y,en.kind==='cocoon'?2.6:2,0,6.3); hx.fill();
  }
  hx.fillStyle='#f3e7c9'; hx.beginPath(); hx.moveTo(mx,my-5); hx.lineTo(mx-3.6,my+4); hx.lineTo(mx+3.6,my+4); hx.closePath(); hx.fill();
  hx.restore();
  hx.strokeStyle='rgba(232,194,106,.55)'; hx.lineWidth=2; hx.beginPath(); hx.arc(mx,my,mr,0,6.3); hx.stroke();
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
    hx.fillStyle='rgba(6,9,7,.82)'; roundRect(10,pad+86,bw2+20,lines.length*16+14,8); hx.fill();
    hx.strokeStyle='rgba(232,194,106,.5)'; hx.lineWidth=1; hx.stroke();
    hx.textAlign='left'; hx.fillStyle='#cdbb8c';
    for(var lj=0;lj<lines.length;lj++) hx.fillText(lines[lj],20,pad+104+lj*16);
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
    hx.fillStyle='rgba(0,0,0,.6)'; hx.fillText(G.tip,W/2+1,H2*0.22+1);
    hx.fillStyle='#e8c26a'; hx.fillText(G.tip,W/2,H2*0.22);
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
    else hx.fillText(bt.label,bt.x,bt.y+bt.r*0.14);
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
    var keys='WASD move   ·   mouse look   ·   L-click strike   ·   R-click shoot';
    var keys2='space jump   ·   shift dash   ·   Q potion   ·   TAB skills   ·   I stats';
    hx.textAlign='center'; hx.font='600 12.5px Georgia,serif';
    hx.fillStyle='rgba(243,231,201,.42)';
    hx.fillText(keys,W/2,H2-30); hx.fillText(keys2,W/2,H2-13);
    if(!LOCKED){
      var bw3=250, bh3=44;
      hx.fillStyle='rgba(8,11,8,.72)'; roundRect(W/2-bw3/2,H2*0.5-bh3/2,bw3,bh3,10); hx.fill();
      hx.strokeStyle='rgba(232,194,106,.7)'; hx.lineWidth=2; hx.stroke();
      hx.fillStyle='#e8c26a'; hx.font='600 15px Georgia,serif';
      hx.fillText('Click to look around',W/2,H2*0.5+5);
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
  // skills nudge
  if(G.build.points>0){
    hx.textAlign='left'; hx.fillStyle='#9ff07a'; hx.font='600 12px Georgia,serif';
    hx.fillText('⬆ '+G.build.points+' skill point'+(G.build.points>1?'s':'')+(DESKTOP?' — press TAB':' — tap ★'),pad+10,pad+72);
  }
  hx.restore();
}
function roundRect(x,y,w,h,r){
  hx.beginPath(); hx.moveTo(x+r,y);
  hx.arcTo(x+w,y,x+w,y+h,r); hx.arcTo(x+w,y+h,x,y+h,r);
  hx.arcTo(x,y+h,x,y,r); hx.arcTo(x,y,x+w,y,r); hx.closePath();
}
function rotPt(x,z,yaw){ var c=Math.cos(-yaw),s=Math.sin(-yaw); return {x:x*c-z*s,y:x*s+z*c}; }
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
    '<p class="sub">An open wood. Spiders in the canopy, goblins at the fire, and your kin strung up between the trees.</p>'+
    '<p class="sub">Free them and they fight beside you.</p>'+
    '<button class="btn" id="make">Make your hunter</button>'+
    '<button class="btn alt" id="diag2">Copy diagnostic report</button>'+
    '<textarea id="dgout" style="display:none;width:100%;height:120px;margin-top:8px;font-size:11px;'+
    'background:#0d0a04;color:#cdbb8c;border:1px solid #3b2f16;border-radius:8px;padding:6px"></textarea>'+
    (G.best?'<p class="hint">Best: level '+G.best+'</p>':'')+
    (DESKTOP
      ? '<p class="hint"><b>Laptop:</b> WASD to move · move the mouse to look · left-click strike · right-click shoot<br>'+
        'Space jump · Shift dash · Q potion · Tab skills · scroll to zoom · Esc frees the cursor</p>'
      : '<p class="hint"><b>Phone:</b> drag the left side to move, the right side to look, buttons to fight.<br>'+
        'Your hunter swings on her own when something gets close.</p>'));
  document.getElementById('make').onclick=makeScreen;
  document.getElementById('diag2').onclick=copyDiag;
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
  G.player=newPlayer(); G.killed=0; G.freed=0; G.found={}; G.msgs.length=0;
  populate();
  G.cam.yaw=0; G.cam.pitch=DESKTOP?0.36:0.30; G.cam.dist=DESKTOP?9.2:7.0;
  G.cam.x=G.player.x; G.cam.y=G.player.y+6; G.cam.z=G.player.z+9;
  layoutButtons();
  hide(); G.state='play';
  tip('Find the tavern light to the north');
}
function skillScreen(){
  if(G.state==='play') G.state='skills'; else return;
  var sp=spentClass(), T=tree(), rows='';
  for(var i=0;i<T.length;i++){
    var s=T[i], have=SK(s.id), locked=(SKILLS[G.build.cls].indexOf(s)>=0&&s.t>sp);
    var can=G.build.points>0&&have<s.r&&!locked;
    rows+='<div class="sk'+(can?'':' off')+(have?' has':'')+'" data-i="'+i+'">'+
      '<div class="skh"><b>'+s.n+'</b><span>'+have+'/'+s.r+'</span></div><small>'+s.d+
      (locked?' — needs '+s.t+' points in your calling':'')+'</small></div>';
  }
  show('<h1>'+RACES[G.build.race].name+' '+CLASSES[G.build.cls].name+'</h1>'+
    '<p class="sub">Level '+G.player.level+' · <b>'+G.build.points+'</b> point'+(G.build.points===1?'':'s')+' to spend</p>'+
    '<div class="stat"><span>Health</span><b>'+G.S.maxHp+'</b></div>'+
    '<div class="stat"><span>Melee / ranged</span><b>'+Math.round(G.S.melee*100)+'% / '+Math.round(G.S.ranged*100)+'%</b></div>'+
    '<div class="stat"><span>Prisoners freed / foes slain</span><b>'+G.freed+' / '+G.killed+'</b></div>'+
    '<div class="skills">'+rows+'</div>'+
    '<button class="btn" id="close">Back to the wood</button>'+
    '<button class="btn alt" id="diag3">Copy diagnostic report</button>'+
    '<textarea id="dgout" style="display:none;width:100%;height:130px;margin-top:8px;font-size:11px;'+
    'background:#0d0a04;color:#cdbb8c;border:1px solid #3b2f16;border-radius:8px;padding:6px"></textarea>');
  document.getElementById('diag3').onclick=copyDiag;
  var els=ui.querySelectorAll('.sk');
  for(var k=0;k<els.length;k++) els[k].onclick=function(){
    var s=tree()[+this.getAttribute('data-i')];
    if(G.build.points<=0||SK(s.id)>=s.r) return;
    if(SKILLS[G.build.cls].indexOf(s)>=0&&s.t>spentClass()) return;
    G.build.skills[s.id]=SK(s.id)+1; G.build.points--; recalc(); layoutButtons(); buzz(15); skillScreen();
  };
  document.getElementById('close').onclick=function(){ hide(); G.state='play'; };
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
    '<button class="btn alt" id="diag">Copy diagnostic report</button>'+
    '<button class="btn" id="again">Walk in again</button>'+
    '<button class="btn alt" id="menu">Title</button>'+
    '<textarea id="dgout" style="display:none;width:100%;height:120px;margin-top:8px;font-size:11px;'+
    'background:#0d0a04;color:#cdbb8c;border:1px solid #3b2f16;border-radius:8px;padding:6px"></textarea>');
  document.getElementById('diag').onclick=copyDiag;
  document.getElementById('again').onclick=startRun;
  document.getElementById('menu').onclick=titleScreen;
}

function copyDiag(){
  var txt=JSON.stringify(TELE.report(),null,1);
  var ta=document.getElementById('dgout');
  if(ta){ ta.style.display='block'; ta.value=txt; ta.select(); }
  try{ if(navigator.clipboard) navigator.clipboard.writeText(txt); }catch(e){}
  this.textContent='Copied — paste it to Claude';
}

/* ---------- boot ---------- */
function resize(){
  readSafe();
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=cvs.clientWidth; H2=cvs.clientHeight;
  cvs.width=Math.round(W*DPR*QUAL); cvs.height=Math.round(H2*DPR*QUAL);
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
  if(a<42&&QUAL>0.62) QUAL=Math.max(0.62,QUAL-0.12);
  else if(a>57&&QUAL<1) QUAL=Math.min(1,QUAL+0.06);
  if(QUAL!==old){ cvs.width=Math.round(W*DPR*QUAL); cvs.height=Math.round(H2*DPR*QUAL); }
}
var last=0, acc=0, JSMS=0, DRAWMS=0;
function frame(ts){
  var dt=Math.min(0.05,(ts-last)/1000||0.016); last=ts;
  MPI=0;
  var t0=performance.now();
  if(G.state==='play') update(dt);
  var t1=performance.now();
  draw(); drawHUD();
  var t2=performance.now();
  JSMS=JSMS*0.9+(t1-t0)*0.1; DRAWMS=DRAWMS*0.9+(t2-t1)*0.1;
  if(G.state==='play'&&dt>0){ TELE.frame(dt*1000); if(TELE.fps.length<900) TELE.fps.push(Math.round(1/dt)); autoQuality(dt); }
  requestAnimationFrame(frame);
}
function boot(){
  prog=makeProgram(gl);
  gl.useProgram(prog);
  att.p=gl.getAttribLocation(prog,'aP'); att.n=gl.getAttribLocation(prog,'aN');
  att.c=gl.getAttribLocation(prog,'aC'); att.f=gl.getAttribLocation(prog,'aF');
  gl.enableVertexAttribArray(att.p); gl.enableVertexAttribArray(att.n);
  gl.enableVertexAttribArray(att.c); gl.enableVertexAttribArray(att.f);
  uni.proj=gl.getUniformLocation(prog,'uProj'); uni.view=gl.getUniformLocation(prog,'uView');
  uni.model=gl.getUniformLocation(prog,'uModel'); uni.time=gl.getUniformLocation(prog,'uTime');
  uni.tint=gl.getUniformLocation(prog,'uTint'); uni.fog=gl.getUniformLocation(prog,'uFog');
  uni.sun=gl.getUniformLocation(prog,'uSun'); uni.alpha=gl.getUniformLocation(prog,'uAlpha'); uni.unlit=gl.getUniformLocation(prog,'uUnlit');
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  resize();
  initParts(gl);
  buildWorld();
  try{ G.best=+localStorage.getItem('eh3_best')||0; }catch(e){}
  recalc();
  var bt=document.getElementById('boot'); if(bt) bt.style.display='none';
  titleScreen();
  window.__ready=true;
  requestAnimationFrame(function(t){last=t;requestAnimationFrame(frame);});
}
/* events */
addEventListener('resize',resize);
addEventListener('orientationchange',function(){setTimeout(resize,150);});
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
  if(e.key===' ') IN.jump=true;
  if(e.key==='j'||e.key==='J') IN.attack=true;
  if(e.key==='k'||e.key==='K') IN.shoot=true;
  if(e.key==='q'||e.key==='Q') usePotion();
  if(e.key==='c'||e.key==='C'||e.key==='Shift') IN.dash=true;
  if(e.key==='i'||e.key==='I') SHOWDBG=!SHOWDBG;
  if(e.key==='e'||e.key==='E'){ IN.attack=true; IN.atkBuf=0.45; }
  setMode(true);
  if(e.key==='Tab'){ e.preventDefault(); if(G.state==='play') skillScreen(); }
});
addEventListener('keyup',function(e){
  KEY[e.key]=false; if(e.key.toLowerCase) KEY[e.key.toLowerCase()]=false;
  if(e.key==='j'||e.key==='J'||e.key==='e'||e.key==='E') IN.attack=false;
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
  if(!LOCKED){ IN.attack=false; IN.shoot=false; }
});
addEventListener('mousemove',function(e){
  if(e.movementX||e.movementY) setMode(true);
  if(!LOCKED) return;
  G.cam.yaw-=e.movementX*0.0024;
  G.cam.pitch=clamp(G.cam.pitch+e.movementY*0.0022,-0.30,1.05);
  G.cam.manual=0.8;
});
addEventListener('mousedown',function(e){
  if(!DESKTOP||!LOCKED||G.state!=='play') return;
  if(e.button===0){ IN.attack=true; IN.atkBuf=0.45; }
  else if(e.button===2){ IN.shoot=true; IN.shotBuf=0.45; }
  else if(e.button===1){ IN.jump=true; IN.jumpBuf=0.35; }
});
addEventListener('mouseup',function(e){ if(e.button===0) IN.attack=false; });
addEventListener('contextmenu',function(e){ if(DESKTOP) e.preventDefault(); });
cvs.addEventListener('wheel',function(e){
  if(!DESKTOP) return;
  e.preventDefault();
  G.cam.dist=clamp(G.cam.dist+e.deltaY*0.012,4.0,18.0);
},{passive:false});
cvs.addEventListener('touchstart',function(){ setMode(false); },{passive:true});
if(gl) boot();
