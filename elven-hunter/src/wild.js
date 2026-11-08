/* ================= the wilder wood =================
   Difficulty, the mushroom grumps, the Stone Warden you can call up at the
   standing stones, the dragon on its crag, the Glimmer Cave (bring a torch),
   and the small things that make the wood feel alive: butterflies, rabbits,
   bouncy toadstools and seven lost garden gnomes.
   Loaded before game.js; nothing here runs until the game calls it. */

/* ---------- difficulty ----------
   Easy is the wood as it used to be. Normal and Hard bring more monsters, hitting
   harder and more often, and pay a little better for the trouble. */
var DIFFS={
  easy:  {n:'Easy',  hp:1.0, dmg:1.0, spawn:7.0, cap:46, aggro:1.0,  spd:1.0,  cd:1.0,  pop:0.8, pay:1.0, elites:0, champ:0,
          d:'The gentle wood. Fewer foes, and they forgive mistakes.'},
  normal:{n:'Normal',hp:1.35,dmg:1.55,spawn:4.0, cap:64, aggro:1.18, spd:1.08, cd:0.82, pop:1.15,pay:1.2, elites:5, champ:0.12,
          d:'A proper hunt. Foes come in numbers and bite hard.'},
  hard:  {n:'Hard',  hp:1.8, dmg:2.2, spawn:2.6, cap:84, aggro:1.35, spd:1.16, cd:0.68, pop:1.5, pay:1.5, elites:10, champ:0.24,
          d:'The wood wants you dead. Half again the pay, if you live.'}
};
var DIFF_ORDER=['easy','normal','hard'];
function DF(){ return DIFFS[G.build.diff]||DIFFS.normal; }

/* ---------- the wild state, saved with your hunter ---------- */
var WILD=null;
function wildReset(){
  WILD={torch:false, gnomes:{}, stone:{c:0,tier:0,full:false}, dragon:{t:0,kills:0}, chestT:0, wardens:0, inCave:false, lore:{}, minis:{}, trophies:0,
    q:{}, inv:{}, recipes:{}, charms:{}, compass:0, eagle:0};
}
wildReset();
function wildSave(){ return {torch:WILD.torch,gnomes:WILD.gnomes,stone:{c:WILD.stone.c,tier:WILD.stone.tier},
  dragon:WILD.dragon,chestT:Math.round(WILD.chestT),wardens:WILD.wardens,lore:WILD.lore,minis:WILD.minis,trophies:WILD.trophies,
  q:WILD.q,inv:WILD.inv,recipes:WILD.recipes,charms:WILD.charms,compass:WILD.compass,eagle:WILD.eagle}; }
function wildLoad(w){
  wildReset(); if(!w) return;
  WILD.torch=!!w.torch; WILD.gnomes=w.gnomes||{}; WILD.chestT=w.chestT||0; WILD.wardens=w.wardens||0;
  WILD.lore=w.lore||{}; WILD.minis=w.minis||{}; WILD.trophies=w.trophies||0;
  WILD.q=w.q||{}; WILD.inv=w.inv||{}; WILD.recipes=w.recipes||{}; WILD.charms=w.charms||{}; WILD.compass=w.compass||0; WILD.eagle=w.eagle||0;
  if(w.stone){ WILD.stone.c=w.stone.c||0; WILD.stone.tier=w.stone.tier||0; WILD.stone.full=WILD.stone.c>=1; }
  if(w.dragon){ WILD.dragon.t=w.dragon.t||0; WILD.dragon.kills=w.dragon.kills||0; }
}

/* ---------- mushroom grumps ---------- */
var SHROOMCAP=[[0.82,0.20,0.18],[0.88,0.46,0.20],[0.62,0.30,0.70],[0.86,0.30,0.52]];
function spawnShroom(x,z){
  var hp=lvlHp(22)*DF().hp;
  G.ents.push({kind:'shroom',x:x,y:H(x,z),z:z,vy:0,yaw:Math.random()*6.28,scale:0.75+Math.random()*0.3,
    hp:hp,maxHp:hp,dmg:lvlDmg(6),speed:0,walkPhase:Math.random()*6,onGround:true,
    look:{cap:SHROOMCAP[(Math.random()*4)|0],stem:[0.92,0.88,0.76],spot:[0.98,0.96,0.92]},
    aggro:14, atkCd:0, wind:0, hurtT:0, home:{x:x,z:z}, wander:Math.random()*6.28, wanderT:0});
}
/* the grumps' clans live in the meadows, a few to a patch */
function spawnShroomPatch(x,z,n){ for(var i=0;i<n;i++){ var a=Math.random()*6.28, d=1+Math.random()*3.5; spawnShroom(x+Math.cos(a)*d,z+Math.sin(a)*d); } }

/* ---------- bosses ---------- */
function bossLevel(){ return 1+G.player.level*0.07; }
function spawnGolem(x,z,tier){
  var hp=1100*(1+0.45*tier)*bossLevel()*DF().hp;
  G.ents.push({kind:'golem',boss:1,name:tier?'Mossback, the Stone Warden ('+romanN(tier+1)+')':'Mossback, the Stone Warden',
    x:x,y:H(x,z),z:z,vy:0,yaw:Math.atan2(G.player.x-x,G.player.z-z),scale:1.25+tier*0.08,rad:2.2,tall:4.8,
    hp:hp,maxHp:hp,dmg:24*(1+0.2*tier)*bossLevel(),speed:0,walkPhase:0,onGround:true,
    look:{stone:[0.44,0.44,0.46],dark:[0.34,0.34,0.36],moss:[0.30,0.46,0.24],rune:[0.45,0.95,1.0]},
    aggro:40, atkCd:2.0, throwCd:3.5, wind:0, hurtT:0, riseT:2.4, inv:2.4, home:{x:STONES.x,z:STONES.z}, tier:tier, called:false, gone:0});
  shake(0.6); sfx('rumble',x,z);
}
function romanN(n){ return ['I','II','III','IV','V','VI','VII','VIII','IX','X'][Math.min(9,n-1)]||(''+n); }
function spawnDragon(){
  var L=CRAG.lair, k=WILD.dragon.kills, hp=2600*(1+0.4*k)*bossLevel()*DF().hp;
  G.ents.push({kind:'dragon',boss:1,name:k?'Cinderwing the Undying':'Cinderwing',x:L.x,y:CRAG.top,z:L.z,vy:0,yaw:2.2,scale:1.25,rad:3.6,tall:5.4,
    hp:hp,maxHp:hp,dmg:30*(1+0.2*k)*bossLevel(),speed:0,walkPhase:0,onGround:true,
    // obsidian scales, a membrane like banked coals, gold-ivory horns and an ember-lit belly
    look:{body:[0.17,0.13,0.14],dark:[0.10,0.08,0.09],belly:[0.52,0.30,0.18],horn:[0.92,0.80,0.52],wing:[0.62,0.12,0.08],eye:[1.0,0.78,0.22],ember:[1.0,0.52,0.14]},
    aggro:22, atkCd:2, wind:0, hurtT:0, state:'sleep', stT:0, fly:0, flyK:0, fireCd:1.5, home:{x:L.x,z:L.z}, snore:0});
}
function findKind(k){ for(var i=0;i<G.ents.length;i++) if(G.ents[i].kind===k) return G.ents[i]; return null; }
/* a boss lob: a boulder or a fireball that bursts where it lands */
function lob(e,from,tx,ty,tz,speed,kind,dmg,aoe,aimed){
  var dx=tx-from.x, dz=tz-from.z, dh=Math.hypot(dx,dz)||1, dy=ty-from.y, T=dh/speed;
  var vy=aimed?dy/T:(dy+0.5*11*T*T)/T;
  G.ents.push({kind:'eshot',x:from.x,y:from.y,z:from.z,vx:dx/dh*speed,vy:vy,vz:dz/dh*speed,life:4,aimed:aimed?1:0,
    proj:kind,dmg:dmg,aoe:aoe,src:e.kind==='dragon'?'dragon fire':'the Warden\'s boulder'});
}
/* everything a boss's blow can catch: you and your company */
function bossHit(cx,cz,r,dmg,src){
  var p=G.player;
  if(Math.hypot(p.x-cx,p.z-cz)<r) hurtPlayer(dmg,src);
  for(var i=0;i<G.ents.length;i++){ var a=G.ents[i]; if(a.kind==='ally'&&Math.hypot(a.x-cx,a.z-cz)<r) a.hp-=dmg*0.6*DF().dmg; }
}
function faceTo(e,x,z,k,dt){ e.yaw+=wrapA(Math.atan2(x-e.x,z-e.z)-e.yaw)*Math.min(1,dt*k); }
function stepTo(e,x,z,spd,dt){
  var dx=x-e.x, dz=z-e.z, d=Math.hypot(dx,dz);
  if(d<0.1){ e.speed=0; return d; }
  faceTo(e,x,z,3,dt);
  var m=Math.min(spd,d/Math.max(dt,0.001));
  e.x+=dx/d*m*dt; e.z+=dz/d*m*dt; e.speed=m; e.walkPhase+=dt*m*0.9;
  return d;
}
function updateBoss(e,dt){
  if(e.kind==='golem') updateGolem(e,dt); else updateDragon(e,dt);
  if(e.atkT>0) e.atkT-=dt;
  e.inv=Math.max(0,(e.inv||0)-dt);
}
function updateGolem(e,dt){
  var p=G.player, pd=Math.hypot(p.x-e.x,p.z-e.z), D=DF();
  if(e.riseT>0){                       // clawing up out of the ground
    e.riseT-=dt; e.speed=0; faceTo(e,p.x,p.z,2,dt);
    if(Math.random()<dt*12) burst(e.x+(Math.random()-0.5)*4,H(e.x,e.z)+0.2,e.z+(Math.random()-0.5)*4,3,[0.45,0.40,0.32],{up:3,spread:2,size:0.25,life:0.8});
    e.y=H(e.x,e.z); return;
  }
  var far=Math.hypot(p.x-STONES.x,p.z-STONES.z)>48||p.dead||WILD.inCave;
  if(far){                             // you ran: he plods home, and sinks back if you stay away
    e.wind=0; stepTo(e,STONES.x,STONES.z,2.4,dt); e.hp=Math.min(e.maxHp,e.hp+e.maxHp*0.04*dt);
    e.gone+=dt; if(e.gone>40){ var i=G.ents.indexOf(e); if(i>=0) G.ents.splice(i,1); WILD.stone.c=1; WILD.stone.full=true; tip('The Warden sinks back beneath the stones'); }
    e.y=H(e.x,e.z); return;
  }
  e.gone=0;
  e.atkCd-=dt; e.throwCd-=dt;
  if(!e.called&&e.hp<e.maxHp*0.5){    // half broken, he wakes the stones' little guardians
    e.called=true; msg('The stones answer him!','#9fe8ff',e.x,e.y+5,e.z,18); sfx('rumble',e.x,e.z);
    for(var k=0;k<3+e.tier;k++){ var a=k/(3+e.tier)*6.28; spawnShroom(e.x+Math.cos(a)*5,e.z+Math.sin(a)*5); }
  }
  if(e.wind>0){
    e.wind-=dt; e.speed=0; faceTo(e,p.x,p.z,e.windKind==='slam'?1.5:3,dt);
    if(e.wind<=0){
      e.atkT=0.5; e.atkDur=0.5;
      if(e.windKind==='slam'){         // both fists into the ground in front of him
        var fx=e.x+Math.sin(e.yaw)*2.4, fz=e.z+Math.cos(e.yaw)*2.4;
        bossHit(fx,fz,4.6,e.dmg,'the Stone Warden');
        shake(0.55); sfx('slam',fx,fz);
        burst(fx,H(fx,fz)+0.2,fz,30,[0.48,0.42,0.34],{up:5,spread:7,size:0.3,life:0.9,flat:1});
        burst(fx,H(fx,fz)+0.4,fz,14,[0.45,0.95,1.0],{up:6,spread:4,size:0.12,life:0.7});
      } else {                         // a boulder, lobbed where you stand
        var from={x:e.x+Math.sin(e.yaw)*1.4,y:e.y+4.2,z:e.z+Math.cos(e.yaw)*1.4};
        var lead=0.6, tx=p.x+(p.mvx||0)*(p.speed||0)*lead, tz=p.z+(p.mvz||0)*(p.speed||0)*lead;
        lob(e,from,tx,H(tx,tz)+0.6,tz,15,'rock',e.dmg*0.75,2.6,false); sfx('throw',e.x,e.z);
      }
    }
  } else if(pd<5.2&&e.atkCd<=0){
    e.atkCd=3.0*D.cd; e.wind=1.1; e.windFull=1.1; e.windKind='slam'; sfx('rumble',e.x,e.z);
  } else if(pd>9&&pd<34&&e.throwCd<=0){
    e.throwCd=(4.5-e.tier*0.4)*D.cd; e.wind=0.9; e.windFull=0.9; e.windKind='throw';
  } else {
    var stop=pd<3.6;
    if(!stop) stepTo(e,p.x,p.z,2.5*D.spd*(e.hp<e.maxHp*0.35?1.3:1),dt); else { e.speed*=0.6; faceTo(e,p.x,p.z,3,dt); }
  }
  collide(e,1.6); e.y=H(e.x,e.z);
  if(e.speed>0.5){ var st=Math.floor(e.walkPhase/Math.PI); if(st!==e.lastStep){ e.lastStep=st; shake(0.08); sfx('stomp',e.x,e.z); } }
}
/* Cinderwing: sleeps on the crag until you climb up. On the ground he bites and
   breathes fire; then he takes off, circles and rains fireballs, and lands again.
   Lead him off the crag and he flies home to sulk and heal. */
function updateDragon(e,dt){
  var p=G.player, D=DF(), L=CRAG.lair, top=CRAG.top;
  // a third of his life gone and the fire gets out: faster, angrier, more of it
  if(!e.enraged&&e.hp<e.maxHp*0.35&&e.state!=='sleep'){ e.enraged=true; sfx('roar',e.x,e.z); shake(0.8);
    tip('Cinderwing\'s scales split with fire!'); msg('ENOUGH!','#ff8a50',e.x,e.y+6,e.z,22); }
  var cdK=e.enraged?0.6:1;
  // smoke curls from his nostrils; embers drift off him when he's angry
  if(e.nose&&Math.random()<dt*(e.state==='sleep'?1.5:4)){ var nz=dragonPoint(e,e.nose);
    burst(nz.x,nz.y,nz.z,1,[0.32,0.30,0.30],{up:1.4,spread:0.3,size:0.28,life:1.6,grav:-1.2}); }
  if(e.enraged&&Math.random()<dt*14) burst(e.x+(Math.random()-0.5)*5,e.y+1+Math.random()*2,e.z+(Math.random()-0.5)*6,1,[1.0,0.55,0.15],{up:2.5,spread:0.6,size:0.1,life:0.9,grav:-2});
  var pd=Math.hypot(p.x-e.x,p.z-e.z), pl=Math.hypot(p.x-L.x,p.z-L.z);
  e.stT+=dt; e.breathT=Math.max(0,(e.breathT||0)-dt);
  var flyTo=function(h,k){ e.fly+=(h-e.fly)*Math.min(1,dt*k); };
  switch(e.state){
    case 'sleep':
      e.speed=0; flyTo(0,3); e.hp=Math.min(e.maxHp,e.hp+e.maxHp*0.05*dt);
      e.snore-=dt; if(e.snore<=0&&pd<40){ e.snore=2.6; msg('z z z','#d9d2ff',e.x,e.y+3.5,e.z,15);
        burst(e.x+Math.sin(e.yaw)*4.5,e.y+1.2,e.z+Math.cos(e.yaw)*4.5,5,[0.5,0.5,0.5],{up:1.5,spread:0.8,size:0.2,life:1.4,grav:-1}); }
      if(!p.dead&&pl<CRAG.r+3&&p.y>top-3){ e.state='wake'; e.stT=0; sfx('roar',e.x,e.z); shake(0.7); loreGet('cinderwing');
        tip('Cinderwing wakes!'); msg('WHO DISTURBS MY NAP?','#ffb070',e.x,e.y+5,e.z,20); }
      break;
    case 'wake':
      e.speed=0; faceTo(e,p.x,p.z,2,dt); e.headLift=Math.min(1,e.stT);
      if(e.stT>1.6){ e.state='ground'; e.stT=0; }
      break;
    case 'ground':
      flyTo(0,4); e.flyK=Math.max(0,e.flyK-dt*2);
      if(p.dead||pl>CRAG.r+30){ e.state='return'; e.stT=0; break; }
      e.atkCd-=dt;
      if(e.wind>0){
        e.wind-=dt; e.speed=0; faceTo(e,p.x,p.z,e.windKind==='breath'?2.5:4,dt);
        if(e.wind<=0){
          if(e.windKind==='bite'){ e.atkT=0.4; e.atkDur=0.4;
            var bx=e.x+Math.sin(e.yaw)*7.5, bz=e.z+Math.cos(e.yaw)*7.5; bossHit(bx,bz,3.6,e.dmg,'Cinderwing\'s jaws'); sfx('bite',bx,bz); shake(0.3); }
          else { e.breathT=e.enraged?2.2:1.5; sfx('fire',e.x,e.z); }
        }
      } else if(e.breathT>0){
        e.speed=0; faceTo(e,p.x,p.z,1.2,dt); breathe(e,dt);
      } else if(e.stT>11||(pl>CRAG.r+1&&e.stT>2)){ e.state='takeoff'; e.stT=0; sfx('wings',e.x,e.z); }
      else if(pd<10&&e.atkCd<=0){ e.atkCd=1.8*D.cd*cdK; e.wind=0.65; e.windFull=0.65; e.windKind='bite'; sfx('growl',e.x,e.z); }
      else if(pd<18&&pd>7&&e.atkCd<=0){ e.atkCd=3.2*D.cd*cdK; e.wind=0.8; e.windFull=0.8; e.windKind='breath'; sfx('growl',e.x,e.z); }
      else if(pd>7.5) stepTo(e,p.x,p.z,3.6*D.spd*(e.enraged?1.3:1),dt); else { e.speed*=0.6; faceTo(e,p.x,p.z,3,dt); }
      // he keeps to his crag on foot
      var cd=Math.hypot(e.x-CRAG.x,e.z-CRAG.z), lim=CRAG.r-3.5; if(cd>lim){ e.x=CRAG.x+(e.x-CRAG.x)*lim/cd; e.z=CRAG.z+(e.z-CRAG.z)*lim/cd; }
      break;
    case 'takeoff':
      e.speed=2; e.flyK=Math.min(1,e.flyK+dt*1.5); flyTo(9,1.6); faceTo(e,p.x,p.z,2,dt);
      if(Math.random()<dt*20) burst(e.x+(Math.random()-0.5)*6,H(e.x,e.z)+0.1,e.z+(Math.random()-0.5)*6,2,[0.55,0.50,0.40],{up:1,spread:5,size:0.3,life:0.6,flat:1});
      if(e.stT>1.4){ e.state='fly'; e.stT=0; e.orb=Math.atan2(e.x-p.x,e.z-p.z); }
      break;
    case 'fly':
      e.flyK=1; flyTo(9,1.2);
      if(p.dead||pl>CRAG.r+48){ e.state='return'; e.stT=0; break; }
      // circle above where you stand, breathing fireballs down at you
      e.orb+=dt*0.55; var R=13, cx=p.x+Math.sin(e.orb)*R, cz=p.z+Math.cos(e.orb)*R;
      var dx=cx-e.x, dz=cz-e.z, dd=Math.hypot(dx,dz)||1, sp=Math.min(11*D.spd,dd*2.5);
      e.x+=dx/dd*sp*dt; e.z+=dz/dd*sp*dt; e.speed=sp;
      e.yaw+=wrapA(Math.atan2(dx,dz)-e.yaw)*Math.min(1,dt*2.5);
      e.fireCd-=dt;
      if(e.fireCd<=0){ e.fireCd=1.25*D.cd*cdK; var m=dragonMouth(e);
        var lead=0.5, tx=p.x+(p.mvx||0)*(p.speed||0)*lead, tz=p.z+(p.mvz||0)*(p.speed||0)*lead;
        lob(e,m,tx,H(tx,tz)+0.3,tz,24,'fire',e.dmg*0.6,2.6,true); sfx('fireball',e.x,e.z);
        if(e.enraged) for(var fb=-1;fb<=1;fb+=2){ var ox=tx+fb*4*Math.cos(e.yaw), oz=tz-fb*4*Math.sin(e.yaw);
          lob(e,m,ox,H(ox,oz)+0.3,oz,22,'fire',e.dmg*0.45,2.4,true); } }
      if(e.stT>9){ e.state='land'; e.stT=0;
        // come down on the crag, near you if you're up there, else by the lair
        var on=Math.hypot(p.x-CRAG.x,p.z-CRAG.z)<CRAG.r-3;
        e.landX=on?p.x+Math.sin(e.orb)*7:L.x; e.landZ=on?p.z+Math.cos(e.orb)*7:L.z;
        var c2=Math.hypot(e.landX-CRAG.x,e.landZ-CRAG.z), l2=CRAG.r-4; if(c2>l2){ e.landX=CRAG.x+(e.landX-CRAG.x)*l2/c2; e.landZ=CRAG.z+(e.landZ-CRAG.z)*l2/c2; } }
      break;
    case 'land':
      var ld=stepTo(e,e.landX,e.landZ,10,dt); e.walkPhase-=dt*e.speed*0.9;
      if(ld<2){ flyTo(0,2.2); e.flyK=Math.max(0,e.flyK-dt*0.8); }
      if(ld<2&&e.fly<0.4){ e.state='ground'; e.stT=0; e.fly=0; shake(0.45); sfx('slam',e.x,e.z);
        burst(e.x,H(e.x,e.z)+0.2,e.z,26,[0.52,0.46,0.36],{up:2,spread:7,size:0.3,life:0.8,flat:1}); }
      if(e.stT>8){ e.x=e.landX; e.z=e.landZ; }
      break;
    case 'return':
      e.flyK=1; flyTo(7,1.5); var rd=stepTo(e,L.x,L.z,10,dt); e.walkPhase-=dt*e.speed*0.9;
      e.hp=Math.min(e.maxHp,e.hp+e.maxHp*0.03*dt);
      if(rd<1.5){ e.state='settle'; e.stT=0; }
      break;
    case 'settle':
      flyTo(0,2); e.flyK=Math.max(0,e.flyK-dt); e.speed=0;
      if(e.fly<0.3){ e.state='sleep'; e.stT=0; e.fly=0; e.headLift=0; e.yaw=2.2; }
      break;
  }
  e.y=H(e.x,e.z)+e.fly;
}
function dragonMouth(e){ return dragonPoint(e,e.mouth||{x:0,y:3.5,z:7}); }
function dragonPoint(e,mo){ var c=Math.cos(e.yaw), s=Math.sin(e.yaw); return {x:e.x+mo.x*c+mo.z*s, y:e.y+mo.y, z:e.z-mo.x*s+mo.z*c}; }
/* a cone of fire from the jaws: flames you can see, and harm if you're in it */
function breathe(e,dt){
  var m=dragonMouth(e), fx=Math.sin(e.yaw), fz=Math.cos(e.yaw), p=G.player, D=DF();
  for(var i=0;i<4;i++){
    if(FX.length>=FX_MAX) FX.shift();
    var sp=12+Math.random()*6, a=(Math.random()-0.5)*0.7, ca=Math.cos(a), sa=Math.sin(a);
    var dx=fx*ca+fz*sa, dz=fz*ca-fx*sa, hot=Math.random();
    FX.push({x:m.x,y:m.y-0.3,z:m.z,vx:dx*sp,vy:-1.2-Math.random()*2,vz:dz*sp,t:0,life:0.55+Math.random()*0.3,size:0.28+Math.random()*0.3,
      col:hot<0.5?[1.0,0.80,0.30]:[1.0,0.42,0.12],grav:-2,spin:Math.random()*6,flat:false});
  }
  var dx2=p.x-e.x, dz2=p.z-e.z, d=Math.hypot(dx2,dz2), dot=(dx2*fx+dz2*fz)/(d||1);
  if(d<19&&dot>0.85&&Math.abs(p.y-(e.y-e.fly))<4) hurtPlayer(e.dmg*0.7,'Cinderwing\'s fire');
  for(var j=0;j<G.ents.length;j++){ var a2=G.ents[j]; if(a2.kind!=='ally') continue;
    var ax=a2.x-e.x, az=a2.z-e.z, ad=Math.hypot(ax,az); if(ad<19&&(ax*fx+az*fz)/(ad||1)>0.8) a2.hp-=e.dmg*0.4*dt*D.dmg; }
}
/* a boss falls: a proper reward, and the world remembers */
function bossDown(e){
  var p=G.player, pay=DF().pay;
  if(e.kind==='golem'){
    var c=Math.round((140+70*e.tier)*pay); p.coins+=c; p.potions+=2; WILD.wardens++;
    WILD.stone.tier++; WILD.stone.c=0; WILD.stone.full=false; loreGet('warden');
    gainXp(500+200*e.tier,e.x,e.y+5,e.z,'+'+(500+200*e.tier)+' XP — the Warden falls');
    msg('+'+c+' ◉  +2 potions','#ffe08a',e.x,e.y+4,e.z,18);
    tip('The Warden crumbles. The stones fall quiet… for now');
    burst(e.x,e.y+2,e.z,60,[0.45,0.95,1.0],{up:6,spread:6,size:0.2,life:1.5,grav:-1});
  } else {
    var c2=Math.round((450+150*WILD.dragon.kills)*pay); p.coins+=c2; p.potions+=3;
    WILD.dragon.kills++; WILD.dragon.t=600; loreGet('dragonslayer');
    gainXp(1500,e.x,e.y+5,e.z,'+1500 XP — DRAGONSLAYER');
    msg('+'+c2+' ◉  +3 potions','#ffe08a',e.x,e.y+4,e.z,20);
    tip(WILD.dragon.kills>1?'Cinderwing falls again. He always comes back.':'Dragonslayer! Cinderwing is slain');
    burst(e.x,e.y+2,e.z,70,[1.0,0.62,0.22],{up:7,spread:7,size:0.24,life:1.6,grav:-1});
  }
  sfx('levelup'); shake(0.8); setTimeout(saveGame,100);
}

/* ---------- the standing stones ----------
   Six old stones that slowly wake while you hunt (faster for every kill). When
   all six runes glow, lay a hand on the altar stone to call up the Warden. */
var STONE_TIME=300;           // seconds of play to wake fully, without kills
function stonesUpdate(dt){
  var S=WILD.stone, g=findKind('golem');
  if(g||S.c>=1) return;
  S.c=Math.min(1,S.c+dt/STONE_TIME);
  if(S.c>=1&&!S.full){ S.full=true; tip('Far off, the standing stones begin to hum…'); sfx('discover'); }
}
function stonesKill(){ if(!findKind('golem')&&WILD.stone.c<1) WILD.stone.c=Math.min(1,WILD.stone.c+0.012); }
function drawStones(){
  var p=G.player; if(Math.hypot(p.x-STONES.x,p.z-STONES.z)>80||WILD.inCave) return;
  var c=WILD.stone.c, lit=Math.floor(c*6+1e-6), full=c>=1, pulse=full?0.75+0.25*Math.sin(G.t*5):1;
  for(var i=0;i<STONES.rune.length;i++){ var R=STONES.rune[i], on=i<lit;
    var col=on?[0.40*pulse,0.95*pulse,1.0*pulse]:[0.22,0.24,0.27];
    var m=mat(); m4trs(m,R.x,H(R.x,R.z)+R.h*0.42,R.z,0,-R.a+Math.PI/2,0,0.35,0.9,0.05); DRAW.push(['box',m,col]);
    var m2=mat(); m4trs(m2,R.x,H(R.x,R.z)+R.h*0.42+1.0,R.z,0,-R.a+Math.PI/2,0.785,0.28,0.28,0.05); DRAW.push(['box',m2,col]);
  }
  if(full&&Math.random()<0.3) burst(STONES.x+(Math.random()-0.5)*8,H(STONES.x,STONES.z)+0.5,STONES.z+(Math.random()-0.5)*8,1,[0.45,0.95,1.0],{up:2,spread:0.4,size:0.08,life:1.6,grav:-1.5});
}
function stonesScreen(){
  menuOpen('talk'); sfx('click');
  var S=WILD.stone, pct=Math.floor(S.c*100), p=G.player, html='<h1>The Standing Stones</h1>'+
    '<p class="sub">Six grey stones lean together on the hill, older than the wood.</p>'+
    '<p class="say">Moss fills the runes cut into them, and the flat stone in the middle is warm, as if something underneath is breathing. Bram says the old folk called things up here — and that whatever answered didn\'t always want to go back down.</p>'+
    '<div class="stat"><span>The runes</span><b>'+(S.c>=1?'all six blaze':pct+'% awake')+'</b></div>'+
    '<div class="stat"><span>Wardens broken</span><b>'+WILD.wardens+'</b></div><div class="opts">';
  if(S.c>=1) html+='<button class="opt gold" data-o="summon"><b>Lay your hand on the altar stone</b><small>Call up Mossback, the Stone Warden'+(S.tier?' — stronger than last time':'')+'. A fight for level '+(6+S.tier*2)+' or so. You are level '+p.level+'.</small></button>';
  else html+='<button class="opt off" disabled><b>The stones are still waking</b><small>They wake while you hunt; every monster you slay hurries them along. Come back when all six runes glow.</small></button>';
  html+='</div><button class="btn" id="leave">Step back</button>';
  show(html);
  var b=ui.querySelector('.opt[data-o="summon"]');
  if(b) b.onclick=function(){
    WILD.stone.c=0; WILD.stone.full=false; menuClose();
    var a=Math.atan2(p.x-STONES.x,p.z-STONES.z)+Math.PI;
    spawnGolem(STONES.x+Math.sin(a)*2.5,STONES.z+Math.cos(a)*2.5,WILD.stone.tier);
    tip('The ground splits. Something huge climbs out');
  };
  document.getElementById('leave').onclick=menuClose;
}

/* ---------- the Glimmer Cave ---------- */
var CAVE3=null, GLOW3=null, SHAFT3=null, TORCH=null, HEMI=null, TORCH_PRICE=60;
function buildCave(){
  var cm=caveMeshes();
  CAVE3=new THREE.Mesh(toGeom(cm.rock),WORLDMAT); CAVE3.frustumCulled=false; CAVE3.receiveShadow=true; CAVE3.visible=false;
  GLOW3=new THREE.Mesh(toGeom(cm.glow),new THREE.MeshBasicMaterial({vertexColors:true})); GLOW3.frustumCulled=false; GLOW3.visible=false;
  // the shaft of daylight at the way out: see-through
  SHAFT3=new THREE.Mesh(toGeom(cm.shaft),new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.16,depthWrite:false,side:THREE.DoubleSide}));
  SHAFT3.frustumCulled=false; SHAFT3.visible=false; SHAFT3.renderOrder=2;
  SCENE.add(CAVE3); SCENE.add(GLOW3); SCENE.add(SHAFT3);
}
/* outside and in, the light is different: sky and sun up top; down below, only
   your torch and the crystals */
var CAVEENV=null;
function setCaveEnv(on){
  if(CAVEENV===on) return; CAVEENV=on; WILD.inCave=on;
  var c=on?[0.025,0.025,0.035]:SKYCOL;
  R3.setClearColor(new THREE.Color(c[0],c[1],c[2]),1);
  SCENE.fog.color.setRGB(c[0],c[1],c[2]); SCENE.fog.near=on?5:38; SCENE.fog.far=on?36:133;
  SKY.visible=!on; WORLD.visible=!on; if(HOUSE3) HOUSE3.visible=!on;
  if(CAVE3){ CAVE3.visible=on; GLOW3.visible=on; SHAFT3.visible=on; }
  HEMI.intensity=Math.PI*(on?0.22:1); SUN.intensity=on?0:SUN.userData.base;
  TORCH.intensity=on?1:0;
}
function torchUpdate(){
  if(!TORCH) return;
  var p=G.player, on=WILD.inCave;
  if(!on){ TORCH.intensity=0; return; }
  var fl=0.85+Math.sin(G.t*13)*0.06+Math.sin(G.t*29)*0.05;
  TORCH.intensity=7.5*fl; TORCH.position.set(p.x+Math.sin(p.yaw)*0.4,p.y+2.4,p.z+Math.cos(p.yaw)*0.4);
  // a flame over your shoulder
  if(Math.random()<0.7){ var hx=p.x-Math.cos(p.yaw)*0.35, hz=p.z+Math.sin(p.yaw)*0.35;
    burst(hx,p.y+1.95,hz,1,Math.random()<0.5?[1.0,0.78,0.30]:[1.0,0.45,0.12],{up:1.6,spread:0.25,size:0.10,life:0.35,grav:-2}); }
}
function caveMouthScreen(){
  menuOpen('talk'); sfx('click');
  show('<h1>The Glimmer Cave</h1><p class="sub">A crack in the foot of the Dragon\'s Crag</p>'+
    '<p class="say">Cold air breathes out of the dark. Somewhere far inside, something glints — and something else skitters. You can\'t see your own hand in there.</p>'+
    '<div class="stat"><span>You need</span><b>a torch</b></div>'+
    '<p class="sub">Bram keeps a few behind the bar.</p>'+
    '<button class="btn" id="leave">Back away</button>');
  document.getElementById('leave').onclick=menuClose;
}
function enterCave(){
  var p=G.player, ex=CAVE.exit;
  moveParty(ex.x,ex.z+6,0);
  sfx('discover'); tip('Your torch catches. The walls glitter.');
  if(!G.found['The Glimmer Cave']){ G.found['The Glimmer Cave']=1; gainXp(60,p.x,p.y+3,p.z,'+60 XP — discovery'); }
}
function leaveCave(){
  var M=CRAG.mouth; moveParty(M.x-4,M.z,-Math.PI/2);
  tip('Daylight!');
}
function moveParty(x,z,yaw){
  var p=G.player; p.x=x; p.z=z; p.y=H(x,z); p.vy=0; p.yaw=yaw; MREFset=false;
  var n=0;
  for(var i=0;i<G.ents.length;i++){ var e=G.ents[i];
    if(e.kind==='ally'){ e.x=x+Math.cos(n*2.1)*2.2-Math.sin(yaw)*2; e.z=z+Math.sin(n*2.1)*2.2-Math.cos(yaw)*2; e.y=H(e.x,e.z); collide(e,0.42); n++; }
    if(e.kind==='shot'||e.kind==='eshot') e.life=0; }
  G.cam.yaw=yaw; G.cam.x=x-Math.sin(yaw)*6; G.cam.z=z-Math.cos(yaw)*6; G.cam.y=p.y+4; G.cam.cd=undefined;
  setCaveEnv(inCave(x,z));
}
function chestScreen(){
  menuOpen('talk'); sfx('click');
  var p=G.player, ready=WILD.chestT<=0;
  if(ready){
    var c=Math.round((180+p.level*12)*DF().pay); p.coins+=c; p.potions+=2; WILD.chestT=480; loreGet('hoard',true);
    sfx('coin'); sfx('freed');
    show('<h1>The Glimmer Hoard</h1><p class="say">Under a crust of crystal: coins, old and new, and two stoppered bottles that still smell of mint.</p>'+
      '<div class="stat"><span>You take</span><b>+'+c+' ◉ &nbsp; +2 ✚</b></div><p class="sub">The cave seems to fill it again, given time.</p><button class="btn" id="leave">Lovely</button>');
    setTimeout(saveGame,50);
  } else {
    show('<h1>The Glimmer Hoard</h1><p class="say">Empty, apart from a very small spider who looks embarrassed.</p>'+
      '<div class="stat"><span>Refills in</span><b>'+fmtTime(WILD.chestT)+'</b></div><button class="btn" id="leave">Back to the dark</button>');
  }
  document.getElementById('leave').onclick=menuClose;
}
/* the cave's own residents: pale spiders, and snakes in the damp */
function caveSpawnSpot(far){
  var p=G.player;
  for(var k=0;k<12;k++){ var R=CAVE.rooms[1+((Math.random()*(CAVE.rooms.length-1))|0)];
    var a=Math.random()*6.28, d=Math.random()*R[2]*0.6, x=CAVE.x+R[0]+Math.cos(a)*d, z=CAVE.z+R[1]+Math.sin(a)*d;
    if(caveSD(x,z)<-1&&(!far||Math.hypot(x-p.x,z-p.z)>far)) return {x:x,z:z}; }
  return null;
}
function caveFoe(x,z){
  var r=Math.random();
  if(r<0.6){ spawnSpider(x,z,Math.random()<0.15); var s=G.ents[G.ents.length-1]; s.look.body=s.big?[0.62,0.62,0.70]:[0.52,0.54,0.62]; s.look.eye=[0.4,0.9,1.0]; s.cave=1; }
  else if(r<0.8){ spawnSnake(x,z); G.ents[G.ents.length-1].look.body=[0.36,0.30,0.50]; G.ents[G.ents.length-1].cave=1; }
  else { spawnShroom(x,z); var m=G.ents[G.ents.length-1]; m.look.cap=[0.30,0.80,0.95]; m.cave=1; }
}
function populateCave(){
  var n=Math.round(14*DF().pop);
  for(var i=0;i<n;i++){ var s=caveSpawnSpot(0); if(s) caveFoe(s.x,s.z); }
}

/* ---------- butterflies, rabbits, gnomes ---------- */
var FLYCOL=[[0.98,0.72,0.20],[0.55,0.75,1.0],[0.98,0.55,0.75],[0.95,0.95,0.98],[0.70,0.95,0.45]];
var BUNCOL=[[0.62,0.50,0.38],[0.78,0.72,0.64],[0.46,0.38,0.32],[0.90,0.88,0.84]];
function spawnCritters(){
  var r=mulberry(919);
  for(var i=0;i<Math.round(48*WS*WS);i++){ var q0=randIn(r), x=q0.x, z=q0.z;
    if(H(x,z)<WATER+0.4) continue;
    var fly=r()<0.62;
    G.ents.push({kind:'critter',sub:fly?'fly':'bunny',x:x,y:H(x,z),z:z,home:{x:x,z:z},yaw:r()*6.28,seed:r()*9,t:r()*20,
      col:fly?FLYCOL[(r()*FLYCOL.length)|0]:BUNCOL[(r()*BUNCOL.length)|0],speed:0,hopT:r()*2,hopH:0,scale:1});
    if(fly&&r()<0.6){ var e=G.ents[G.ents.length-1]; G.ents.push({kind:'critter',sub:'fly',x:x+1,y:e.y,z:z+1,home:{x:x+1,z:z+1},yaw:0,seed:r()*9,t:r()*20,col:e.col,speed:0,scale:1}); }
  }
}
function updateCritter(e,dt,pd){
  if(pd>70) return;
  e.t+=dt;
  if(e.sub==='fly'){
    var ox=Math.sin(e.t*0.45+e.seed)*3.2+Math.sin(e.t*1.3+e.seed*2)*0.8, oz=Math.cos(e.t*0.38+e.seed)*3.2+Math.cos(e.t*1.1)*0.8;
    // flutter away from you a little if you charge through
    if(pd<2.5){ e.home.x+=(e.x-G.player.x)*dt*1.5; e.home.z+=(e.z-G.player.z)*dt*1.5; }
    var nx=e.home.x+ox, nz=e.home.z+oz;
    e.yaw=Math.atan2(nx-e.x,nz-e.z); e.x=nx; e.z=nz;
    e.y=H(e.x,e.z)+1.1+Math.sin(e.t*2.1+e.seed)*0.45;
    return;
  }
  // a rabbit: nibbles, hops about, and bolts if you come close
  var p=G.player, flee=pd<6;
  e.hopT-=dt;
  if(flee||e.hopT<=0&&e.speed<0.1){
    if(flee) e.dir=Math.atan2(e.x-p.x,e.z-p.z)+(Math.random()-0.5)*0.6;
    else e.dir=Math.atan2(e.home.x-e.x,e.home.z-e.z)+(Math.random()-0.5)*2.4;
    e.hopT=flee?0.25:1+Math.random()*3; e.hopL=flee?0.6:0.45; e.speed=flee?6.5:2.6;
  }
  if(e.speed>0.1){
    e.hopL-=dt; e.x+=Math.sin(e.dir)*e.speed*dt; e.z+=Math.cos(e.dir)*e.speed*dt; e.yaw=e.dir;
    e.hopH=Math.abs(Math.sin(e.hopL*Math.PI/0.45))*0.35;
    if(e.hopL<=0){ if(flee){ e.hopL=0.45; } else { e.speed=0; e.hopH=0; } }
    collide(e,0.25);
  }
  e.y=H(e.x,e.z);
}
var GNOMES=[
  {id:'tavern', at:function(){ var c=Math.cos(TAVERN.ry), s=Math.sin(TAVERN.ry), lx=2.6, lz=-4.6; return {x:TAVERN.x+lx*c+lz*s,z:TAVERN.z-lx*s+lz*c}; },
   say:'“Oi! I was promised this was a garden.”', hat:[0.82,0.18,0.16]},
  {id:'ring',   at:function(){ return {x:FAIRYRING.x,z:FAIRYRING.z}; }, say:'“Dance with me! No? Fine. FINE.”', hat:[0.85,0.40,0.80]},
  {id:'hive',   at:function(){ return {x:LM.hive.x+6.5,z:LM.hive.z+5}; }, say:'“Shh! I\'m hiding from the wasps. Have been since spring.”', hat:[0.95,0.75,0.20]},
  {id:'hollow', at:function(){ return {x:LM.hollow.x+2.5,z:LM.hollow.z+4}; }, say:'“The spiders keep knitting me jumpers. I didn\'t ask.”', hat:[0.30,0.60,0.85]},
  {id:'stones', at:function(){ return {x:STONES.x+Math.cos(0.5)*7.6,z:STONES.z+Math.sin(0.5)*7.6}; }, say:'“The stones talk at night, you know. Mostly about you.”', hat:[0.30,0.75,0.40]},
  {id:'crag',   at:function(){ return {x:CRAG.lair.x-5.2,z:CRAG.lair.z-1.5}; }, say:'“Dragons eat gnomes. Allegedly. I\'m not testing it.”', hat:[0.95,0.45,0.15]},
  {id:'cave',   at:function(){ return {x:CAVE.chest.x-3.2,z:CAVE.chest.z-1.6}; }, say:'“It\'s dark. I\'ve been dark for WEEKS. Is that a torch? Can I have it?”', hat:[0.55,0.30,0.75]}
];
function spawnGnomes(){
  for(var i=0;i<GNOMES.length;i++){ var g=GNOMES[i]; if(WILD.gnomes[g.id]) continue;
    var q=g.at(); G.ents.push({kind:'gnome',gid:g.id,x:q.x,y:H(q.x,q.z),z:q.z,yaw:Math.random()*6.28,seed:Math.random()*6,hat:g.hat,scale:1}); }
}
function gnomeCount(){ var n=0; for(var k in WILD.gnomes) if(WILD.gnomes[k]) n++; return n; }
function findGnome(e){
  var g=null; for(var i=0;i<GNOMES.length;i++) if(GNOMES[i].id===e.gid) g=GNOMES[i];
  WILD.gnomes[e.gid]=1; loreGet('gnomes');
  var p=G.player, n=gnomeCount(), c=Math.round(35*DF().pay);
  p.coins+=c; gainXp(80,e.x,e.y+1.6,e.z,'+80 XP — a gnome!');
  msg(g?g.say:'“Hello!”','#ffe6b0',e.x,e.y+2.4,e.z,15); msg('+'+c+' ◉','#ffe08a',e.x+0.6,e.y+1.2,e.z,13);
  sfx('gnome',e.x,e.z); burst(e.x,e.y+0.6,e.z,20,e.hat,{up:3,spread:2,size:0.12,life:1,grav:-1});
  if(n>=GNOMES.length){ p.coins+=300; loreGet('marigold'); tip('All seven gnomes found! Bram sends 300 coins, and his thanks'); sfx('levelup'); }
  else tip('Lost gnomes found: '+n+' of '+GNOMES.length);
  var i2=G.ents.indexOf(e); if(i2>=0) G.ents.splice(i2,1);
  setTimeout(saveGame,50);
}

/* ---------- toadstools that bounce you ---------- */
function bounceCheck(p){
  if(p.bounceCd>0||!p.onGround) return;
  for(var i=0;i<BOUNCE.length;i++){ var b=BOUNCE[i];
    if(Math.hypot(p.x-b.x,p.z-b.z)<1.35){
      p.vy=16.5; p.onGround=false; p.bounceCd=0.6; sfx('boing',b.x,b.z);
      var words=['boing!','wheee!','boing!','sproing!','hup!'];
      msg(words[(Math.random()*words.length)|0],'#ffd0f0',p.x,p.y+2.6,p.z,16);
      burst(b.x,(b.y||H(b.x,b.z))+1.6,b.z,14,[1.0,0.85,0.95],{up:4,spread:2.5,size:0.1,life:0.8,grav:2});
      return;
    }
  }
}

/* ---------- what you can walk up to and use ---------- */
function wildTalk(p,list){
  legendTalk(p,list); folkTalk(p,list);
  var g=findKind('golem');
  if(!WILD.inCave){
    if(!g&&Math.hypot(STONES.x-p.x,STONES.z-p.z)<3.6)
      list.push({x:STONES.x,y:H(STONES.x,STONES.z),z:STONES.z,lift:2.2,label:WILD.stone.c>=1?'touch the altar stone':'the standing stones',
        tap:WILD.stone.c>=1?'SUMMON':'LOOK',open:stonesScreen});
    var M=CRAG.mouth;
    if(Math.hypot(M.x-p.x,M.z-p.z)<3.8)
      list.push({x:M.x+1.5,y:H(M.x,M.z),z:M.z,lift:3.0,label:WILD.torch?'light your torch and go in':'peer into the dark',tap:WILD.torch?'ENTER':'LOOK',
        open:function(){ if(WILD.torch){ G.talk=null; enterCave(); } else caveMouthScreen(); }, now:!!WILD.torch});
  } else {
    var X=CAVE.exit;
    if(Math.hypot(X.x-p.x,X.z-p.z)<4.2) list.push({x:X.x,y:H(X.x,X.z),z:X.z,lift:2.6,label:'climb out into daylight',tap:'LEAVE',open:function(){ G.talk=null; leaveCave(); },now:true});
    var C=CAVE.chest;
    if(Math.hypot(C.x-p.x,C.z-p.z)<2.9) list.push({x:C.x,y:H(C.x,C.z),z:C.z,lift:1.8,label:WILD.chestT<=0?'open the hoard':'the hoard (empty)',tap:'OPEN',open:chestScreen});
  }
}

/* ---------- the world ticking along ---------- */
function wildUpdate(dt){
  var p=G.player;
  setCaveEnv(inCave(p.x,p.z));
  torchUpdate();
  stonesUpdate(dt);
  minisTick(dt);
  if(WILD.chestT>0) WILD.chestT-=dt;
  p.bounceCd=Math.max(0,(p.bounceCd||0)-dt);
  if(!WILD.inCave) bounceCheck(p);
  // the dragon comes back to his crag in his own time
  if(WILD.dragon.t>0){ WILD.dragon.t-=dt; if(WILD.dragon.t<=0&&!findKind('dragon')){ spawnDragon(); } }
  // a glint where the hoard waits
  if(WILD.inCave&&WILD.chestT<=0&&Math.random()<0.15) burst(CAVE.chest.x+(Math.random()-0.5)*1.4,H(CAVE.chest.x,CAVE.chest.z)+1.2,CAVE.chest.z+(Math.random()-0.5)*1,1,[1.0,0.9,0.5],{up:1,spread:0.3,size:0.07,life:0.6,grav:-1});
}

/* the boss's name and health across the top while it's awake */
function drawBossBar(){
  var p=G.player, b=null, bd=1e9;
  for(var i=0;i<G.ents.length;i++){ var e=G.ents[i]; if(!(e.boss||e.mini)||e.state==='sleep') continue;
    if(e.mini&&!(e.hp<e.maxHp||Math.hypot(e.x-p.x,e.z-p.z)<e.aggro*DF().aggro)) continue;
    var d=Math.hypot(e.x-p.x,e.z-p.z); if(d<60&&d<bd){ bd=d; b=e; } }
  if(!b) return;
  var w=Math.min(420,W*0.62), x=W/2-w/2, y=DESKTOP?18:Math.max(SAFET+8,12)+(DESKTOP?0:0);
  if(!DESKTOP){ var P=panelGeom(); y=Math.max(y,P.y); x=Math.max(P.x+P.w+10,x); w=Math.min(w,W-x-74); }
  hx.textAlign='center'; hx.font='700 13px Georgia,serif';
  hx.fillStyle='rgba(0,0,0,.6)'; hx.fillText(b.name,x+w/2+1,y+12+1);
  hx.fillStyle=b.kind==='dragon'?'#ffb070':(b.mini?'#e0c0ff':'#9fe8ff'); hx.fillText(b.name,x+w/2,y+12);
  hx.fillStyle='rgba(8,11,8,.7)'; roundRect(x-2,y+18,w+4,12,5); hx.fill();
  var f=clamp(b.hp/b.maxHp,0,1);
  hx.fillStyle=b.kind==='dragon'?'#d6584a':(b.mini?'#b070d8':'#5fb8c8'); if(f>0){ roundRect(x,y+20,Math.max(6,w*f),8,4); hx.fill(); }
}
