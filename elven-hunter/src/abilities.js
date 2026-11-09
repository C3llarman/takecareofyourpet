/* ================= abilities: three per calling, for the action bar =================
   Built for young players: no mana or rage to manage, only short cooldowns; every
   ability aims itself (at the target frame's foe, else the best thing ahead) and
   still does something useful with nothing in range, so a press is never wasted;
   and they arrive one at a time, at levels 2, 4 and 7, each with a "press 3!" cue.
   On a laptop they sit on keys 3-5; on a phone each gets its own round button. */

var ABIL={
  warrior:[
    {id:'charge',n:'Charge',lvl:2,cd:8,icon:'charge',d:'Rush at a foe and knock it silly',fn:abCharge},
    {id:'spin',  n:'Whirlwind',lvl:4,cd:10,icon:'spin',d:'Spin your axe through everything around you',fn:abSpin},
    {id:'shout', n:'Battle Shout',lvl:7,cd:20,icon:'shout',d:'Heal a quarter of your health and hit harder for 8 s',fn:abShout}],
  rogue:[
    {id:'volley',n:'Volley',lvl:2,cd:8,icon:'volley',d:'A fan of seven bolts',fn:abVolley},
    {id:'smoke', n:'Smoke Step',lvl:4,cd:9,icon:'smoke',d:'Leap back in a puff of smoke that slows foes',fn:abSmoke},
    {id:'rain',  n:'Rain of Arrows',lvl:7,cd:16,icon:'rain',d:'Arrows fall on a whole crowd',fn:abRain}],
  wizard:[
    {id:'nova',  n:'Frost Nova',lvl:2,cd:9,icon:'nova',d:'Freeze everything close to you',fn:abNova},
    {id:'fireball',n:'Fireball',lvl:4,cd:7,icon:'fireball',d:'A big bolt of fire that bursts',fn:abFireball},
    {id:'ward',  n:'Arcane Ward',lvl:7,cd:18,icon:'ward',d:'A shield that soaks up harm for 10 s',fn:abWard}]
};
function abList(){ return ABIL[G.build.cls]||[]; }
function abUnlocked(a){ return G.player&&G.player.level>=a.lvl; }
function abLeft(a){ return Math.max(0,((G.player&&G.player.abCd)||{})[a.id]||0); }
function abCdFull(a){ return a.cd*(DF().abCd||1); }
function useAbility(i){
  var p=G.player, a=abList()[i];
  if(!a||!p||p.dead||G.state!=='play'||G.flight) return false;
  if(!abUnlocked(a)){ tip(a.n+' unlocks at level '+a.lvl); return false; }
  if(abLeft(a)>0) return false;
  p.abCd=p.abCd||{}; p.abCd[a.id]=abCdFull(a);
  a.fn(p); buzz(15);
  return true;
}
function abTick(dt){
  var p=G.player; if(!p.abCd) p.abCd={};
  for(var k in p.abCd) if(p.abCd[k]>0) p.abCd[k]-=dt;
  if(p.shoutT>0) p.shoutT-=dt;
  if(p.wardT>0){ p.wardT-=dt; if(p.wardT<=0) p.ward=0; }
  // a new ability arrives with your level
  var L=p.level;
  if(p.abSeen===undefined) p.abSeen=L;
  if(L>p.abSeen){ abList().forEach(function(a,i){ if(a.lvl>p.abSeen&&a.lvl<=L){
      tip('New ability: '+a.n+'! '+(DESKTOP?'Press '+(i+3):'Tap its new button'));
      msg(a.n+'!','#ffe6a0',p.x,p.y+3.2,p.z,20); sfx('discover'); layoutButtons(); } });
    p.abSeen=L; }
}
/* the foe an ability goes for: your picked or framed target, else the best ahead */
function abTarget(maxD){
  var p=G.player, t=(typeof pickedIn==='function'&&pickedIn(maxD))||null;
  if(!t&&G.target&&FOE[G.target.kind]&&Math.hypot(G.target.x-p.x,G.target.z-p.z)<maxD) t=G.target;
  if(!t){ t=aimTarget(p,maxD); if(t&&t.kind==='cocoon') t=null; }
  return t;
}
function foesNear(x,z,r){ var out=[]; for(var i=0;i<G.ents.length;i++){ var e=G.ents[i];
  if(FOE[e.kind]&&e.hp>0&&!(e.riseT>0)&&e.state!=='sleep'&&Math.hypot(e.x-x,e.z-z)<r+(e.rad||0)) out.push(e); } return out; }
function meleeDmg(k){ var p=G.player; return (10+p.level*2.6)*G.S.melee*k*(p.shoutT>0?1.3:1); }
function rangedDmg(k){ var p=G.player; return (9+p.level*2.4)*G.S.ranged*k*(p.shoutT>0?1.3:1); }
function abHit(e,dmg,fx,fz){ impact(e,fx||0,fz||0); hurtEnemy(e,dmg); }

/* ---------- warrior ---------- */
function abCharge(p){
  var t=abTarget(18), ang=t?Math.atan2(t.x-p.x,t.z-p.z):p.yaw;
  var dist=t?Math.max(0,Math.hypot(t.x-p.x,t.z-p.z)-1.6-(t.rad||0.5)):8;
  p.yaw=ang; p.dashDir=ang; p.dashT=Math.min(0.5,dist/26); p.dodge='Dodge_Forward'; p.dodgeT=0.4; p.dodgeN=(p.dodgeN||0)+1;
  p.chargeHit=t; sfx('dash'); burst(p.x,p.y+0.4,p.z,14,[0.55,0.50,0.40],{up:1.2,spread:3,size:0.2,life:0.5,flat:1});
  setTimeout(function(){ if(!G.player||G.player.dead) return; var q=G.player;
    var hit=foesNear(q.x+Math.sin(ang)*1.5,q.z+Math.cos(ang)*1.5,3.2);
    hit.forEach(function(e){ abHit(e,meleeDmg(2.0),Math.sin(ang),Math.cos(ang)); e.stunT=Math.max(e.stunT||0,1.4); });
    q.atkT=q.atkDur=0.42; q.atkKind='melee'; shake(hit.length?0.35:0.15); sfx(hit.length?'slam':'land',q.x,q.z); },Math.max(120,p.dashT*1000));
}
function abSpin(p){
  p.atkT=p.atkDur=0.5; p.atkKind='melee'; sfx('swing',p.x,p.z); sfx('dash');
  var hit=foesNear(p.x,p.z,4.8);
  hit.forEach(function(e){ var dx=e.x-p.x, dz=e.z-p.z, d=Math.hypot(dx,dz)||1; abHit(e,meleeDmg(1.6),dx/d,dz/d);
    if(!e.boss&&!e.mini&&e.hp>0){ e.x+=dx/d*1.6; e.z+=dz/d*1.6; collide(e,bodyR(e)); } });
  for(var i=0;i<20;i++){ var a=i/20*6.283; burst(p.x+Math.cos(a)*3,p.y+0.9,p.z+Math.sin(a)*3,1,[0.85,0.88,0.95],{up:1,spread:2,size:0.12,life:0.4}); }
  if(hit.length) shake(0.25);
}
function abShout(p){
  p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.25); p.shoutT=8;
  for(var i=0;i<G.ents.length;i++){ var a=G.ents[i]; if(a.kind==='ally') a.hp=Math.min(a.maxHp,a.hp+a.maxHp*0.25); }
  foesNear(p.x,p.z,8).forEach(function(e){ if(!e.boss) e.stunT=Math.max(e.stunT||0,0.8); });
  msg('FOR THE WOOD!','#ffd76a',p.x,p.y+3,p.z,20); sfx('roar',p.x,p.z); shake(0.3);
  burst(p.x,p.y+1,p.z,30,[1.0,0.80,0.35],{up:4,spread:4,size:0.14,life:0.9,grav:-1});
}
/* ---------- rogue ---------- */
function abVolley(p){
  var t=abTarget(30), yaw=t?Math.atan2(t.x-p.x,t.z-p.z):p.yaw; p.yaw=yaw;
  p.atkT=p.atkDur=0.34; p.atkKind='bow'; sfx('bow',p.x,p.z);
  var sy=p.y+1.35*p.scale, aimY=t?((t.y+aimH(t))-sy)/Math.max(1,Math.hypot(t.x-p.x,t.z-p.z)):0;
  for(var q=-3;q<=3;q++){ var y2=yaw+q*0.09, dx=Math.sin(y2), dz=Math.cos(y2), L=Math.hypot(dx,aimY,dz);
    G.ents.push({kind:'shot',x:p.x+dx*0.7,y:sy,z:p.z+dz*0.7,vx:dx/L*38,vy:aimY/L*38,vz:dz/L*38,life:1.6,aimed:1,
      dmg:rangedDmg(0.8),pierce:G.S.pierce,hits:[],proj:'arrow',burst:0,frost:0,spin:0}); }
}
function abSmoke(p){
  var t=abTarget(12), away=t?Math.atan2(p.x-t.x,p.z-t.z):p.yaw+Math.PI;
  burst(p.x,p.y+0.8,p.z,30,[0.62,0.62,0.66],{up:1.5,spread:3.5,size:0.35,life:1.4,grav:-0.5});
  foesNear(p.x,p.z,6).forEach(function(e){ e.slowT=Math.max(e.slowT||0,3); e.stunT=Math.max(e.stunT||0,0.6); });
  p.dashDir=away; p.dashT=0.26; p.inv=Math.max(p.inv,1.2); p.dodge='Dodge_Backward'; p.dodgeT=0.42; p.dodgeN=(p.dodgeN||0)+1;
  sfx('dash'); msg('*poof*','#d8d8e0',p.x,p.y+2.6,p.z,16);
}
function abRain(p){
  var t=abTarget(30), cx=t?t.x:p.x+Math.sin(p.yaw)*10, cz=t?t.z:p.z+Math.cos(p.yaw)*10;
  p.atkT=p.atkDur=0.34; p.atkKind='bow'; sfx('bow',p.x,p.z);
  for(var w=0;w<3;w++) (function(w){ setTimeout(function(){ if(!G.player||G.state!=='play') return;
    for(var i=0;i<10;i++){ var a=Math.random()*6.283, r=Math.sqrt(Math.random())*6, ax=cx+Math.cos(a)*r, az=cz+Math.sin(a)*r;
      G.ents.push({kind:'stuck',x:ax,y:H(ax,az)+0.3,z:az,vx:0.1,vy:-1,vz:0.1,proj:'arrow',life:2.5,spin:0});
      burst(ax,H(ax,az)+0.2,az,2,[0.55,0.45,0.30],{up:1,spread:1,size:0.08,life:0.3}); }
    foesNear(cx,cz,6).forEach(function(e){ abHit(e,rangedDmg(1.1),0,0); });
    sfx('thunk',cx,cz); },250+w*380); })(w);
}
/* ---------- wizard ---------- */
function abNova(p){
  sfx('zap',p.x,p.z); shake(0.2);
  foesNear(p.x,p.z,7).forEach(function(e){ abHit(e,rangedDmg(0.7),0,0); e.stunT=Math.max(e.stunT||0,e.boss?0.8:2.5); e.slowT=Math.max(e.slowT||0,4); e.frozen=e.stunT; });
  for(var i=0;i<36;i++){ var a=i/36*6.283; burst(p.x+Math.cos(a)*1.2,p.y+0.3,p.z+Math.sin(a)*1.2,1,[0.70,0.92,1.0],{up:0.6,spread:7,size:0.16,life:0.6,flat:1}); }
}
function abFireball(p){
  var t=abTarget(34), yaw=t?Math.atan2(t.x-p.x,t.z-p.z):p.yaw; p.yaw=yaw;
  p.atkT=p.atkDur=0.34; p.atkKind='cast'; sfx('fireball',p.x,p.z);
  var sy=p.y+1.35*p.scale, aimY=t?((t.y+aimH(t))-sy)/Math.max(1,Math.hypot(t.x-p.x,t.z-p.z)):0, dx=Math.sin(yaw), dz=Math.cos(yaw), L=Math.hypot(dx,aimY,dz);
  G.ents.push({kind:'shot',x:p.x+dx,y:sy,z:p.z+dz,vx:dx/L*26,vy:aimY/L*26,vz:dz/L*26,life:2,aimed:1,
    dmg:rangedDmg(2.6),pierce:0,hits:[],proj:'bolt',burst:4.5,frost:0,spin:0,fire:1});
}
function abWard(p){
  p.ward=Math.round(p.maxHp*0.45); p.wardT=10; sfx('fairy');
  msg('Arcane Ward','#bfe0ff',p.x,p.y+3,p.z,18);
  burst(p.x,p.y+1,p.z,28,[0.55,0.75,1.0],{up:2,spread:2.5,size:0.13,life:1,grav:-1});
}
/* the ward drinks harm before your health does */
function wardSoak(d){ var p=G.player; if(!(p.ward>0)) return d; var s=Math.min(p.ward,d); p.ward-=s;
  if(p.ward<=0){ p.ward=0; p.wardT=0; msg('ward breaks','#bfe0ff',p.x,p.y+2.6,p.z,13); } return d-s; }
/* stunned or frozen foes stand still; a frozen one sparkles blue */
function stunTick(e,dt){
  if(!(e.stunT>0)) return false;
  e.stunT-=dt; e.wind=0; e.speed=0; if(e.puffT) e.puffT=0; if(e.lungeT) e.lungeT=0;
  if(Math.random()<dt*6) burst(e.x,e.y+(e.frozen>0?0.8:2)*(e.scale||1),e.z,1,e.frozen>0?[0.7,0.92,1.0]:[1.0,0.95,0.5],{up:0.8,spread:0.6,size:0.09,life:0.5,grav:-1});
  if(e.stunT<=0) e.frozen=0;
  return true;
}
/* ---------- phone buttons, one per unlocked ability ---------- */
function abButtons(btns,r,right,bot){
  var spots=[[right-r*2.05,bot-r*3.95],[right,bot-r*4.35],[right-r*3.75,bot-r*2.85]];
  abList().forEach(function(a,i){ if(abUnlocked(a)) btns.push({id:'ab'+i,x:spots[i][0],y:spots[i][1],r:r*0.66,label:a.n.split(' ')[0].toUpperCase().slice(0,6),ab:a}); });
}
