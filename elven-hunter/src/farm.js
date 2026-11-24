/* ================= farm life: fly fishing and the farm kitty =================
   Bram sells a fly rod. With it, walk to the edge of any water (the river, the
   sea, the Emberleaf shore) and E / FISH: cast your fly, wait for a rise, strike,
   then reel in time with the line. What you catch goes in your creel: sell it to
   Bram, or take it home to your kitty.
   Once the cottage is yours you can adopt a kitty and name it. It lives on the
   farm, and anything with teeth that comes too close to the house, it gets.
   Give it a fish and it purrs. */

var ROD_PRICE=40, KITTY_PRICE=60, KITTY_GUARD=30, KITTY_LEASH=44;
/* what bites where: w is how often, by kind of water */
var FISH={
  trout:   {n:'Brook trout',   sell:10, w:{river:6},   col:'#9a8a5c', spot:'#d2643c', tier:1},
  grayling:{n:'Grayling',      sell:14, w:{river:3},   col:'#8c95a6', spot:'#5a6278', tier:2},
  rainbow: {n:'Rainbow trout', sell:22, w:{river:1.6}, col:'#a9b4a4', spot:'#e07aa0', tier:3},
  mackerel:{n:'Mackerel',      sell:10, w:{sea:6},     col:'#4c7f9a', spot:'#1d3446', tier:1},
  bass:    {n:'Sea bass',      sell:18, w:{sea:3},     col:'#a7b3bb', spot:'#5d6c76', tier:2},
  ember:   {n:'Ember carp',    sell:26, w:{isle:5},    col:'#d8782c', spot:'#8a3414', tier:2},
  golden:  {n:'Golden trout',  sell:60, w:{river:0.35,sea:0.25,isle:0.35}, col:'#f2c24a', spot:'#b07a12', tier:4}
};
var FISH_ORDER=['trout','grayling','rainbow','mackerel','bass','ember','golden'];
function fishTotal(){ var n=0, f=WILD.fish||{}; for(var k in f) n+=f[k]|0; return n; }
function fishValue(){ var v=0, f=WILD.fish||{}; for(var k in f) if(FISH[k]) v+=(f[k]|0)*FISH[k].sell; return v; }
function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

/* ---------- where you can fish: deep water a few steps from where you stand ---------- */
var FISHSPOT=null, FISHT=-1;
function fishSpot(p){
  if(!WILD.rod||WILD.inCave||WILD.inHall||G.flight||p.dead) return null;
  if(H(p.x,p.z)<WATER-0.6) return null;                 // wading in too deep to cast
  var best=null, bs=1e9;
  for(var i=0;i<12;i++){ var a=i/12*6.2832;
    for(var r=2.2;r<=4.7;r+=1.25){ var x=p.x+Math.sin(a)*r, z=p.z+Math.cos(a)*r;
      if(H(x,z)<WATER-0.45){ var sc=Math.abs(wrapA(a-p.yaw))+r*0.15; if(sc<bs){ bs=sc; best={x:x,z:z,a:a}; } break; } } }
  return best;
}
function fishWhere(x,z){
  if(typeof inIsle==='function'&&inIsle(x,z)) return 'isle';
  return coastK(x,z)>0.3&&shoreD(x,z)>SHORE.beach?'sea':'river';
}
var WATERNAME={river:'The river',sea:'The sea',isle:'The Emberleaf shore'};
function pickFish(where){
  var tot=0, k; for(k in FISH) tot+=FISH[k].w[where]||0;
  var r=Math.random()*tot;
  for(k in FISH){ r-=FISH[k].w[where]||0; if(r<=0) return k; }
  return where==='sea'?'mackerel':(where==='isle'?'ember':'trout');
}

/* ---------- what you can walk up to: the water's edge, and your kitty ---------- */
function farmTalk(p,list){
  if(G.t-FISHT>0.25||G.t<FISHT){ FISHT=G.t; FISHSPOT=fishSpot(p); }
  if(FISHSPOT) list.push({x:FISHSPOT.x,y:WATER,z:FISHSPOT.z,lift:1.2,label:'fly fish',tap:'FISH',open:function(){ fishScreen(); }});
  var k=findKitty();
  if(k&&HOME.kitty&&!WILD.inCave&&!WILD.inHall&&Math.hypot(k.x-p.x,k.z-p.z)<2.6)
    list.push({x:k.x,y:k.y,z:k.z,lift:1.1,label:'pet '+HOME.kitty.name,tap:'PET',open:function(){ kittyScreen(); }});
}

/* ================= fly fishing =================
   Cast; a fish swims up under your fly; when it rises, STRIKE before it spits the
   fly; then a needle swings across the line's tension bar: REEL whenever it is in
   the green. Three good pulls land it; three bad ones and it's gone. */
var FISHING=null;
function fishScreen(){
  if(G.state==='play'){ menuOpen('talk'); sfx('click'); }
  else if(G.state!=='talk') return;
  var p=G.player, s=FISHSPOT||{x:p.x+Math.sin(p.yaw)*3,z:p.z+Math.cos(p.yaw)*3};
  FISHING={stage:'ready',where:fishWhere(s.x,s.z),spot:s,t:0,tok:((FISHING&&FISHING.tok)||0)+1,
    fx:0.62,fy:0.55,shadow:null,ripples:[],drops:[],hits:0,miss:0,u:0,dir:1,catchK:null};
  var F=FISHING;
  show('<h1>Fly fishing</h1><p class="sub">'+WATERNAME[F.where]+' · <span id="fcreel">'+creelText()+'</span></p>'+
    '<canvas id="fcv" class="scene" width="480" height="230"></canvas>'+
    '<p class="say" id="fsay">The water is quiet. Somewhere under it, something is hungry.</p>'+
    '<button class="btn" id="fbtn">Cast your fly</button>'+
    '<button class="btn alt" id="fleave">Back to the wood</button>'+
    (DESKTOP?'<p class="hint">Space or E works the rod too</p>':''));
  document.getElementById('fbtn').onclick=fishButton;
  document.getElementById('fleave').onclick=function(){ FISHING=null; menuClose(); };
  fishLoop(F.tok);
}
function creelText(){ var n=fishTotal(); return n?'creel: '+n+' fish':'creel: empty'; }
function fishSay(t){ var e=document.getElementById('fsay'); if(e) e.innerHTML=t; }
function fishBtn(t,gold,quiet){ var b=document.getElementById('fbtn'); if(!b) return;
  b.textContent=t; b.className='btn'+(quiet?' alt':'')+(gold?' strike':''); }
/* the one button does whatever the moment needs */
function fishButton(){
  var F=FISHING; if(!F) return;
  if(F.stage==='ready'||F.stage==='landed'||F.stage==='lost'){
    F.stage='cast'; F.t=0; F.hits=0; F.miss=0; F.catchK=null; F.shadow=null;
    F.tx=0.45+Math.random()*0.3; F.ty=0.42+Math.random()*0.2;
    sfx('cast'); fishSay('Back, and forward… the line unrolls over the water.'); fishBtn('Wait for a rise…',false,true);
  } else if(F.stage==='cast'){ /* still in the air */ }
  else if(F.stage==='wait'){
    F.stage='lost'; F.t=0; F.shadow=null; ripple(F,F.fx,F.fy,0.5); sfx('splash');
    fishSay('Too soon! You yanked the fly away and the fish darted off. Wait for the splash, then strike.'); fishBtn('Cast again');
  } else if(F.stage==='bite'){
    F.stage='reel'; F.t=0; F.catchK=pickFish(F.where);
    var T=FISH[F.catchK].tier, easy=G.build.diff==='easy';
    F.zw=(0.30-T*0.035)*(easy?1.25:1); F.spd=0.75+T*0.17; F.u=Math.random()<0.5?0.05:0.95; F.dir=F.u<0.5?1:-1; F.zc=0.5;
    sfx('reel'); ripple(F,F.fx,F.fy,1); fishSay('Hooked! Reel when the needle is in the green.'); fishBtn('REEL!',true);
  } else if(F.stage==='reel'){
    var good=Math.abs(F.u-F.zc)<F.zw/2;
    if(good){ F.hits++; sfx('reel'); ripple(F,F.fx,F.fy,0.8); F.fx+=(0.25-F.fx)*0.3; F.fy+=(0.82-F.fy)*0.3; F.spd*=1.12;
      if(F.hits>=3){ fishLand(F); return; }
      fishSay(['Good pull!','It\'s coming in!','Nearly there!'][F.hits-1]+' '+(3-F.hits)+' more.');
    } else { F.miss++; sfx('splash'); ripple(F,F.fx,F.fy,1.2); F.fx=clamp(F.fx+(Math.random()-0.4)*0.2,0.3,0.85);
      if(F.miss>=3){ F.stage='lost'; F.t=0; fishSay('The line goes slack. It got away! Cast again?'); fishBtn('Cast again'); return; }
      fishSay('Too far! The fish thrashes. Wait for the green.'); }
  }
}
function fishLand(F){
  var k=F.catchK, D=FISH[k], p=G.player;
  F.stage='landed'; F.t=0;
  WILD.fish[k]=(WILD.fish[k]||0)+1; WILD.caught=(WILD.caught||0)+1;
  sfx(D.tier>=4?'levelup':'pickup');
  gainXp(10+D.tier*8,p.x,p.y+2.6,p.z,'+'+(10+D.tier*8)+' XP — a '+D.n.toLowerCase());
  logLine('Caught: '+D.n,'#9fd8ff');
  fishSay('You landed a <b style="color:'+D.col+'">'+D.n+'</b>!'+(D.tier>=4?' A rare one: it shines like a coin.':'')+
    (HOME.kitty?' '+esc(HOME.kitty.name)+' would love this.':' Bram buys fish for '+D.sell+' ◉.'));
  fishBtn('Cast again');
  var c=document.getElementById('fcreel'); if(c) c.textContent=creelText();
  setTimeout(saveGame,40);
}
function ripple(F,x,y,s){ F.ripples.push({x:x,y:y,r:0,s:s||1}); for(var i=0;i<Math.round(8*(s||1));i++) F.drops.push({x:x,y:y,vx:(Math.random()-0.5)*0.5,vy:-0.4-Math.random()*0.5,t:0}); }
function fishTick(F,dt){
  F.t+=dt;
  if(F.stage==='cast'){ var k=Math.min(1,F.t/0.8); F.fx=0.19+(F.tx-0.19)*k; F.fy=0.13+(F.ty-0.13)*k-Math.sin(k*Math.PI)*0.12;
    if(k>=1){ F.stage='wait'; F.t=0; F.waitT=1.6+Math.random()*2.4; ripple(F,F.fx,F.fy,0.3);
      var side=Math.random()<0.5?-1:1; F.shadow={x:F.fx+side*0.45,y:F.fy+0.25,a:0}; } }
  else if(F.stage==='wait'){
    var S=F.shadow, q=Math.min(1,F.t/F.waitT); S.x+=(F.fx-S.x)*Math.min(1,dt*1.4*q+dt*0.3); S.y+=(F.fy+0.03-S.y)*Math.min(1,dt*1.4*q+dt*0.3); S.a=q;
    if(Math.random()<dt*0.8) ripple(F,F.fx,F.fy,0.15);
    if(F.t>=F.waitT){ F.stage='bite'; F.t=0; F.biteT=G.build.diff==='easy'?1.7:1.25; ripple(F,F.fx,F.fy,1.3); sfx('splash');
      fishSay('<b>A fish rises! STRIKE!</b>'); fishBtn('STRIKE!',true); }
  }
  else if(F.stage==='bite'){ if(F.t>F.biteT){ F.stage='lost'; F.t=0; F.shadow=null; fishSay('It spat out the fly. Too slow! Cast again.'); fishBtn('Cast again'); } }
  else if(F.stage==='reel'){
    F.u+=F.dir*F.spd*dt; if(F.u>1){ F.u=1; F.dir=-1; } if(F.u<0){ F.u=0; F.dir=1; }
    F.zc=0.5+Math.sin(F.t*0.9)*0.28;
    if(F.shadow){ F.shadow.x=F.fx+Math.sin(F.t*7)*0.03; F.shadow.y=F.fy+0.02; }
  }
  for(var i=F.ripples.length-1;i>=0;i--){ var R=F.ripples[i]; R.r+=dt*0.12*R.s+dt*0.05; if(R.r>0.16*R.s+0.05) F.ripples.splice(i,1); }
  for(var j=F.drops.length-1;j>=0;j--){ var d=F.drops[j]; d.t+=dt; d.x+=d.vx*dt; d.y+=d.vy*dt; d.vy+=1.6*dt; if(d.t>0.6) F.drops.splice(j,1); }
}
function fishLoop(tok){
  var last=performance.now();
  function step(now){
    var F=FISHING, cv=document.getElementById('fcv');
    if(!F||F.tok!==tok||!cv||G.state!=='talk') return;
    var dt=Math.min(0.05,(now-last)/1000); last=now;
    fishTick(F,dt); fishDraw(cv,F);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
/* the little scene: far bank, water, your rod and line, the fly, a fish's shadow */
function fishDraw(cv,F){
  var c=cv.getContext('2d'), W=cv.width, Hh=cv.height, wtop=Hh*0.2, t=performance.now()/1000;
  var isle=F.where==='isle', sea=F.where==='sea';
  c.fillStyle=isle?'#6b4a22':(sea?'#5d7f8a':'#2f4a26'); c.fillRect(0,0,W,wtop);          // the far bank or the horizon
  if(!sea){ c.fillStyle=isle?'#a2501c':'#203a1c';
    for(var i=0;i<14;i++){ var x=i*W/13, h=18+((i*37)%23); c.beginPath(); c.moveTo(x-22,wtop); c.lineTo(x,wtop-h-10); c.lineTo(x+22,wtop); c.fill(); } }
  var g=c.createLinearGradient(0,wtop,0,Hh);
  g.addColorStop(0,isle?'#7a6a52':(sea?'#3d7f95':'#3a6a74')); g.addColorStop(1,isle?'#2e3a40':(sea?'#173c52':'#1a3540'));
  c.fillStyle=g; c.fillRect(0,wtop,W,Hh-wtop);
  c.strokeStyle='rgba(255,255,255,.08)'; c.lineWidth=2;                                   // the current
  for(var k=0;k<7;k++){ var yy=wtop+20+k*28, ox=((t*(sea?14:30)+k*90)%(W+120))-60; c.beginPath(); c.moveTo(ox,yy); c.lineTo(ox+50,yy); c.stroke(); }
  function X(u){ return u*W; } function Y(v){ return v*Hh; }
  // the fish's shadow, closing in
  if(F.shadow&&(F.stage==='wait'||F.stage==='bite'||F.stage==='reel')){
    var S=F.shadow; c.save(); c.globalAlpha=0.25+0.35*(F.stage==='wait'?S.a:1); c.fillStyle='#0b1a1e';
    c.beginPath(); c.ellipse(X(S.x),Y(S.y),26,9,Math.sin(t*3)*0.2,0,6.283); c.fill(); c.restore(); }
  // ripples and splash
  c.strokeStyle='rgba(230,245,255,.55)'; c.lineWidth=1.5;
  F.ripples.forEach(function(R){ c.globalAlpha=Math.max(0,1-R.r/(0.16*R.s+0.05)); c.beginPath(); c.ellipse(X(R.x),Y(R.y),R.r*W,R.r*W*0.35,0,0,6.283); c.stroke(); });
  c.globalAlpha=1; c.fillStyle='#e8f6ff'; F.drops.forEach(function(d){ c.fillRect(X(d.x)-1.5,Y(d.y)-1.5,3,3); });
  // rod and line
  var tipX=X(0.19), tipY=Y(0.13), flx=X(F.fx), fly=Y(F.fy);
  if(F.stage==='reel'){ tipX+=Math.sin(t*18)*3; tipY+=Math.abs(Math.sin(t*9))*6; }
  c.strokeStyle='#5a3a1c'; c.lineWidth=5; c.beginPath(); c.moveTo(-10,Hh+10); c.lineTo(tipX,tipY); c.stroke();
  c.strokeStyle='#c9a46a'; c.lineWidth=2; c.beginPath(); c.moveTo(X(0.05),Y(0.85)); c.lineTo(X(0.08),Y(0.73)); c.stroke();   // the cork grip
  if(F.stage!=='ready'&&F.stage!=='landed'){
    var tight=F.stage==='reel'||F.stage==='bite', sag=tight?4:28;
    c.strokeStyle='rgba(245,240,220,.85)'; c.lineWidth=1.2; c.beginPath(); c.moveTo(tipX,tipY);
    c.quadraticCurveTo((tipX+flx)/2,(tipY+fly)/2+sag,flx,fly); c.stroke();
    if(F.stage!=='reel'&&F.stage!=='lost'){ c.fillStyle='#ffcf5a'; c.beginPath(); c.arc(flx,fly+Math.sin(t*3)*1.5,3.5,0,6.283); c.fill();
      c.fillStyle='#d2643c'; c.fillRect(flx-1,fly-6,2,4); }
  }
  if(F.stage==='bite'){ c.fillStyle='#fff3c4'; c.font='700 30px Georgia,serif'; c.textAlign='center'; c.fillText('!',flx,fly-16); }
  // the tension bar while you reel
  if(F.stage==='reel'){
    var bx=W*0.1, bw=W*0.8, by=Hh-30, bh=16;
    c.fillStyle='rgba(10,8,4,.75)'; c.fillRect(bx-4,by-4,bw+8,bh+8);
    c.fillStyle='#7a2c22'; c.fillRect(bx,by,bw,bh);
    c.fillStyle='#62c24c'; c.fillRect(bx+(F.zc-F.zw/2)*bw,by,F.zw*bw,bh);
    c.fillStyle='#fff6d8'; c.fillRect(bx+F.u*bw-2.5,by-6,5,bh+12);
    for(var h2=0;h2<3;h2++){ c.beginPath(); c.arc(W/2-24+h2*24,by-16,6,0,6.283); c.fillStyle=h2<F.hits?'#ffd76a':'rgba(255,255,255,.2)'; c.fill(); }
  }
  // the catch, held up
  if(F.stage==='landed'&&F.catchK){
    var D=FISH[F.catchK], cx=W*0.6, cy=Hh*0.5+Math.sin(F.t*6)*4*Math.max(0,1-F.t), wig=Math.sin(F.t*10)*0.12*Math.max(0,1-F.t*0.5);
    c.save(); c.translate(cx,cy); c.rotate(wig);
    c.fillStyle=D.col; c.beginPath(); c.ellipse(0,0,58,20,0,0,6.283); c.fill();
    c.beginPath(); c.moveTo(48,0); c.lineTo(84,-20); c.lineTo(78,0); c.lineTo(84,20); c.fill();       // tail
    c.fillStyle=D.spot; for(var sp=0;sp<7;sp++){ c.beginPath(); c.arc(-20+sp*9,-6+((sp*7)%11)-3,2.6,0,6.283); c.fill(); }
    c.fillStyle='rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-6,8,40,6,0,0,6.283); c.fill();       // pale belly
    c.fillStyle='#111'; c.beginPath(); c.arc(-40,-4,3.4,0,6.283); c.fill();
    c.restore();
    if(D.tier>=4){ c.fillStyle='rgba(255,230,140,'+(0.5+0.5*Math.sin(t*6))+')'; for(var s2=0;s2<5;s2++){ var a=t*1.5+s2*1.25; c.fillRect(cx+Math.cos(a)*90-2,cy+Math.sin(a)*40-2,4,4); } }
    c.fillStyle='#fff3c4'; c.font='600 17px Georgia,serif'; c.textAlign='center'; c.fillText(D.n,cx,Hh-18);
  }
}
addEventListener('keydown',function(e){
  if(!FISHING||G.state!=='talk'||e.repeat||!document.getElementById('fbtn')) return;
  if(e.target&&e.target.tagName==='INPUT') return;
  if(e.key===' '||e.key==='e'||e.key==='E'||e.key==='Enter'){ e.preventDefault(); fishButton(); }
});
/* Bram buys the lot */
function sellFish(){ var v=fishValue(); if(!v) return 0; WILD.fish={}; G.player.coins+=v; return v; }

/* ================= the farm kitty ================= */
var KITTY_COATS={
  ginger:{n:'Ginger', c:[0.90,0.52,0.20], l:[0.98,0.86,0.70], s:[0.68,0.33,0.10], eye:[0.45,0.80,0.30]},
  tabby: {n:'Tabby',  c:[0.52,0.44,0.36], l:[0.86,0.80,0.70], s:[0.24,0.19,0.15], eye:[0.75,0.80,0.25]},
  black: {n:'Black',  c:[0.12,0.11,0.13], l:[0.24,0.22,0.25], s:null,             eye:[0.95,0.80,0.20]},
  grey:  {n:'Grey',   c:[0.55,0.57,0.62], l:[0.88,0.88,0.90], s:[0.40,0.42,0.47], eye:[0.95,0.70,0.25]},
  snow:  {n:'Snowy',  c:[0.95,0.93,0.89], l:[1.00,1.00,1.00], s:null,             eye:[0.40,0.65,1.00]}
};
var KITTY_NAMES=['Whiskers','Mittens','Biscuit','Pumpkin','Acorn','Bramble','Clover','Socks','Nutmeg','Pebble'];
var KITTY_SAY=['{n} winds round your ankles, purring a little hello.','{n} is washing one paw very seriously.',
  '{n} blinks at you slowly. In cat, that means you are loved.','{n} has brought you a leaf. It is a gift. Say thank you.',
  '{n} sniffs your pockets. Do they smell of fish?','{n} sits on the doorstep like a tiny guard on duty.'];
function findKitty(){ for(var i=0;i<G.ents.length;i++) if(G.ents[i].kind==='kitty') return G.ents[i]; return null; }
function spawnKitty(){
  if(!HOME.kitty||findKitty()) return;
  var q=HT(1.6,5.2);
  G.ents.push({kind:'kitty',x:q.x,y:H(q.x,q.z),z:q.z,yaw:HOUSE.ry,scale:1.35,speed:0,walkPhase:0,onGround:true,vy:0,
    t:Math.random()*9,wanderT:1,tx:q.x,tz:q.z,cd:0,scanT:0,tgt:null,eatT:0,purrT:0,purrS:0,petT:0,air:0});
}
function kittyGuardable(f){
  return FOE[f.kind]&&!f.boss&&f.hp>0&&!(f.riseT>0)&&f.state!=='sleep'&&Math.hypot(f.x-HOUSE.x,f.z-HOUSE.z)<KITTY_GUARD;
}
function hearts(e,n){ burst(e.x,e.y+0.7,e.z,n||3,[1.0,0.45,0.62],{up:1.4,spread:0.6,size:0.09,life:1.3,grav:-1.2}); }
function updateKitty(e,dt,pd){
  var K=HOME.kitty; if(!K){ var i0=G.ents.indexOf(e); if(i0>=0) G.ents.splice(i0,1); return; }
  var p=G.player; e.t+=dt; e.cd-=dt; e.petT=Math.max(0,e.petT-dt);
  var gh=H(e.x,e.z);
  if(e.air){                                        // mid-pounce
    e.vy-=22*dt; e.y+=e.vy*dt; e.x+=e.jx*dt; e.z+=e.jz*dt;
    if(e.y<=H(e.x,e.z)&&e.vy<0){ e.y=H(e.x,e.z); e.air=0; burst(e.x,e.y+0.05,e.z,5,[0.5,0.42,0.3],{up:1,spread:1.5,size:0.08,life:0.4,flat:1}); }
    return;
  }
  // on guard: anything hostile near the house gets chased off the farm, for good
  e.scanT-=dt;
  if(e.tgt&&(G.ents.indexOf(e.tgt)<0||e.tgt.hp<=0||Math.hypot(e.tgt.x-HOUSE.x,e.tgt.z-HOUSE.z)>KITTY_LEASH)) e.tgt=null;
  if(!e.tgt&&e.scanT<=0){ e.scanT=0.25; var bd=1e9;
    for(var i=0;i<G.ents.length;i++){ var f=G.ents[i]; if(!kittyGuardable(f)) continue;
      var d=Math.hypot(f.x-e.x,f.z-e.z); if(d<bd){ bd=d; e.tgt=f; } }
    if(e.tgt){ e.eatT=0; e.purrT=0; sfx('hiss',e.x,e.z); msg(K.name+'!','#ffd0a0',e.x,e.y+1.3,e.z,14); }
  }
  if(e.tgt){
    var T=e.tgt, td=Math.hypot(T.x-e.x,T.z-e.z), reach=1.6+(T.scale||1)*0.9;
    if(td>reach) moveCreature(e,dt,T.x,T.z,9.5);
    else { e.speed=0; e.yaw+=wrapA(Math.atan2(T.x-e.x,T.z-e.z)-e.yaw)*Math.min(1,dt*10); }
    if(td<reach+1.2&&e.cd<=0) kittyPounce(e,T);
    return;
  }
  if(e.eatT>0){                                       // nibbling a fish
    e.eatT-=dt; e.speed=0;
    if(e.eatT<=0){ e.purrT=6.5; e.purrS=0; msg(K.name+' purrs','#ffc0d8',e.x,e.y+1.2,e.z,15); hearts(e,10); }
    e.y=gh; return;
  }
  if(e.purrT>0){                                      // full of fish, eyes shut, purring
    e.purrT-=dt; e.purrS-=dt; e.speed=0;
    if(e.purrS<=0){ e.purrS=2.4; sfx('purr',e.x,e.z); msg('purrrr…','#ffc0d8',e.x+0.3,e.y+1.0,e.z,13); }
    if(Math.random()<dt*2.5) hearts(e,1);
    e.y=gh; return;
  }
  // at peace: trot over to you when you're home, otherwise potter about the yard
  var hd=Math.hypot(e.x-HOUSE.x,e.z-HOUSE.z);
  if(pd<9&&!p.dead&&!WILD.inCave&&!WILD.inHall){
    if(pd>1.5) moveCreature(e,dt,p.x,p.z,pd>4?4.2:2.0);
    else { e.speed=0; e.yaw+=wrapA(Math.atan2(p.x-e.x,p.z-e.z)-e.yaw)*Math.min(1,dt*3); }
  } else if(hd>16) moveCreature(e,dt,HOUSE.x,HOUSE.z,4.5);
  else {
    e.wanderT-=dt;
    if(e.wanderT<=0){ e.wanderT=3+Math.random()*5;
      var q=Math.random()<0.35?HT(1.6,4.4):HT(-7+Math.random()*18,-4+Math.random()*10); e.tx=q.x; e.tz=q.z; }
    if(Math.hypot(e.tx-e.x,e.tz-e.z)>0.4) moveCreature(e,dt,e.tx,e.tz,1.7); else e.speed=0;
  }
  if(!e.air) e.y+=(H(e.x,e.z)-e.y)*Math.min(1,dt*10);
}
function kittyPounce(e,T){
  var K=HOME.kitty, dx=T.x-e.x, dz=T.z-e.z, d=Math.hypot(dx,dz)||1;
  e.air=1; e.vy=6.5; e.jx=dx/d*Math.min(9,d*2.2); e.jz=dz/d*Math.min(9,d*2.2); e.cd=1.0; e.yaw=Math.atan2(dx,dz);
  sfx('pounce',e.x,e.z);
  // ordinary pests don't stand a chance; a champion or a mini-boss takes a few goes
  var dmg=(T.mini||T.elite)?T.maxHp*0.22:T.hp+1;
  impact(T,dx/d,dz/d); hurtEnemy(T,dmg,true);
  if(T.hp<=0){ K.got=(K.got||0)+1; e.tgt=null; msg(['Got it!','Pounce!','Mrrrow!','Not on MY farm!'][(Math.random()*4)|0],'#ffd0a0',e.x,e.y+1.4,e.z,15);
    if(K.got===1) tip(K.name+' chased off their first pest. Good kitty!'); setTimeout(function(){ sfx('meow',e.x,e.z); },500); }
}
/* drawn from blobs and cones, like the rabbits: sitting, trotting, pouncing, eating, purring */
function kittyRig(out,e,t){
  var C=KITTY_COATS[(HOME.kitty&&HOME.kitty.coat)||'ginger']||KITTY_COATS.ginger, LOW=(typeof LOD!=='undefined'&&LOD);
  var moving=e.speed>0.3||e.air, run=Math.min(1,(e.speed||0)/6), sw=Math.sin(e.walkPhase*2.2)*0.7*Math.min(1,(e.speed||0)/2);
  var shut=e.purrT>0||(Math.sin(t*0.7+e.t)>0.985), pink=[0.95,0.62,0.66], dark=[0.08,0.07,0.07];
  var s=e.scale||1;
  function P(k,x,y,z,rx,ry,rz,sx,sy,sz,c){ out.push([k,x*s,y*s,z*s,rx,ry,rz,sx*s,sy*s,sz*s,c]); }
  var hx=0, hy, hz, tilt=0;
  if(moving||e.eatT>0){
    var stretch=e.air?1.25:1, crouch=e.eatT>0?-0.06:0;
    P('blobR',0,0.11+crouch,-0.04,0,0,0,0.30,0.27,0.62*stretch,C.c);
    P('blob',0,0.10+crouch,0,0,0,0,0.24,0.18,0.48,C.l);
    if(C.s&&!LOW) for(var st=0;st<3;st++) P('box',0,0.35+crouch,-0.18+st*0.14,0,0,0,0.24,0.03,0.05,C.s);
    var legs=[[-0.1,0.2,sw],[0.1,0.2,-sw],[-0.1,-0.24,-sw],[0.1,-0.24,sw]];
    for(var l=0;l<4;l++){ var L=legs[l]; P('limb',L[0],0.21+crouch,L[1],e.air?(l<2?-1.0:1.0):L[2],0,0,0.1,0.2,0.1,C.c);
      if(!LOW) P('blob',L[0],0.0,L[1]+(e.air?0:Math.sin(L[2])*0.08),0,0,0,0.09,0.05,0.11,C.l); }
    hy=e.eatT>0?0.12:0.28; hz=0.36; tilt=e.eatT>0?0.35+Math.sin(t*14)*0.12:0;
    // the tail: up like a flag when trotting, straight out when hunting
    for(var ti=0;ti<8;ti++){ var up=e.tgt?0.012:0.05;
      P('blob',Math.sin(t*3+ti*0.5)*0.014*ti,0.22+ti*up,-0.33-ti*(e.tgt?0.07:0.035),0,0,0,0.1,0.1,0.1,ti>=6&&C.s?C.s:C.c); }
  } else {
    // sitting up, tail curled round the paws
    P('blobR',0,0.02,-0.06,0,0,0,0.32,0.42,0.40,C.c);
    P('blob',0,0.06,0.05,0,0,0,0.22,0.32,0.22,C.l);
    if(C.s&&!LOW) for(var sb=0;sb<2;sb++) P('box',0,0.20+sb*0.1,-0.24,0,0,0,0.26,0.03,0.04,C.s);
    P('limb',-0.07,0.2,0.1,0.1,0,0,0.08,0.2,0.08,C.c); P('limb',0.07,0.2,0.1,0.1,0,0,0.08,0.2,0.08,C.c);
    if(!LOW){ P('blob',-0.07,0.0,0.14,0,0,0,0.09,0.05,0.1,C.l); P('blob',0.07,0.0,0.14,0,0,0,0.09,0.05,0.1,C.l); }
    var flick=Math.sin(t*1.6+e.t)*0.04;
    for(var tc=0;tc<11;tc++){ var a=-1.75+tc*0.3; P('blob',Math.cos(a)*0.25+(tc>=9?flick:0),0.0,Math.sin(a)*0.23+0.02,0,0,0,0.1,0.08,0.1,tc>=9&&C.s?C.s:C.c); }
    hy=0.40; hz=0.08;
    if(e.purrT>0) tilt=-0.15+Math.sin(t*2)*0.05;                     // chin up, blissful
    else if(e.petT>0){ tilt=0.1; hx=Math.sin(t*9)*0.03; }
  }
  // the head, ears, eyes, nose and whiskers
  var cy=Math.cos(tilt), sy=Math.sin(tilt);
  function Hd(k,x,y,z,sx,sy2,sz,c,rx,rz){ P(k,hx+x,hy+y*cy-z*sy,hz+z*cy+y*sy,(rx||0)+tilt,0,rz||0,sx,sy2,sz,c); }
  Hd('blob',0,0,0,0.31,0.27,0.27,C.c);
  Hd('blob',0,0.03,0.09,0.15,0.09,0.09,C.l);
  Hd('cone',-0.09,0.21,-0.01,0.12,0.15,0.07,C.c,0,0.28); Hd('cone',0.09,0.21,-0.01,0.12,0.15,0.07,C.c,0,-0.28);
  if(!LOW){ Hd('cone',-0.09,0.22,0.01,0.07,0.1,0.03,pink,0,0.28); Hd('cone',0.09,0.22,0.01,0.07,0.1,0.03,pink,0,-0.28); }
  Hd('box',0,0.1,0.135,0.045,0.03,0.02,pink);
  if(shut){ Hd('box',-0.068,0.15,0.125,0.06,0.012,0.02,dark); Hd('box',0.068,0.15,0.125,0.06,0.012,0.02,dark); }
  else { Hd('box',-0.068,0.135,0.122,0.055,0.06,0.02,C.eye); Hd('box',0.068,0.135,0.122,0.055,0.06,0.02,C.eye);
    if(!LOW){ Hd('box',-0.068,0.14,0.128,0.018,0.05,0.02,dark); Hd('box',0.068,0.14,0.128,0.018,0.05,0.02,dark); } }
  if(!LOW){ var wc=[0.95,0.95,0.92];
    Hd('box',-0.13,0.07,0.11,0.16,0.006,0.006,wc,0,0.12); Hd('box',0.13,0.07,0.11,0.16,0.006,0.006,wc,0,-0.12);
    Hd('box',-0.13,0.05,0.11,0.16,0.006,0.006,wc,0,-0.06); Hd('box',0.13,0.05,0.11,0.16,0.006,0.006,wc,0,0.06); }
  // the fish it's eating
  if(e.eatT>0){ var fl=Math.max(0.3,e.eatT/2.4);
    P('blob',0,0.0,0.62,0,0.3,0,0.12,0.09,0.36*fl,[0.70,0.76,0.80]);
    P('cone',0,0.04,0.62+0.18*fl,1.57,0,0,0.12,0.1,0.04,[0.55,0.62,0.68]); }
}

/* ---------- the kitty's own screen: pet it, feed it, rename it ---------- */
function kittyScreen(say){
  if(!HOME.kitty) return;
  if(G.state==='play'){ menuOpen('talk'); var k0=findKitty(); sfx('meow',k0&&k0.x,k0&&k0.z); }
  else if(G.state!=='talk') return;
  var K=HOME.kitty, nm=esc(K.name), C=KITTY_COATS[K.coat]||KITTY_COATS.ginger, opts=[];
  FISH_ORDER.forEach(function(k){ var n=(WILD.fish||{})[k]|0; if(n) opts.push({id:'feed:'+k,t:'Give '+nm+' a '+FISH[k].n.toLowerCase(),d:'You have '+n+(K.fed?'':' · cats love fish'),gold:true}); });
  if(!opts.length) opts.push({id:'none',t:'Give '+nm+' a fish',d:WILD.rod?'Your creel is empty. Go fly fishing at the river or the sea':'Catch one first: Bram sells a fly rod at the Greenleaf',off:true});
  opts.push({id:'pet',t:'Pet '+nm,d:'Scritches behind the ears'});
  opts.push({id:'name',t:'Rename '+nm,d:'Or pick a new coat'});
  var html='<h1>'+nm+'</h1><p class="sub">'+C.n+' farm cat · pests caught: '+(K.got||0)+' · fish eaten: '+(K.fed||0)+'</p>'+
    '<p class="say">'+(say||esc(KITTY_SAY[(Math.random()*KITTY_SAY.length)|0].replace('{n}',K.name)))+'</p>'+
    '<p class="hint" style="margin-top:0">'+nm+' guards the farm: anything that bites and comes near the house, '+nm+' gets.</p><div class="opts">';
  opts.forEach(function(o){ html+='<button class="opt'+(o.off?' off':'')+(o.gold?' gold':'')+'" data-o="'+o.id+'"'+(o.off?' disabled':'')+'><b>'+o.t+'</b><small>'+o.d+'</small></button>'; });
  html+='</div><button class="btn" id="leave">Back to the wood</button>';
  show(html);
  var els=ui.querySelectorAll('.opt[data-o]');
  for(var i=0;i<els.length;i++) els[i].onclick=function(){ kittyDo(this.getAttribute('data-o')); };
  document.getElementById('leave').onclick=menuClose;
}
function kittyDo(id){
  var K=HOME.kitty, e=findKitty(), p=G.player; if(!K) return;
  if(id.indexOf('feed:')===0){
    var k=id.slice(5); if(!(WILD.fish[k]>0)) return;
    WILD.fish[k]--; if(!WILD.fish[k]) delete WILD.fish[k]; K.fed=(K.fed||0)+1;
    menuClose();                                      // so you can watch
    if(e){ e.tgt=null; e.purrT=0; e.eatT=2.4; e.speed=0; e.yaw=Math.atan2(p.x-e.x,p.z-e.z);
      msg('nom nom nom','#ffe6b0',e.x,e.y+1.2,e.z,14); sfx('meow',e.x,e.z); }
    setTimeout(saveGame,40);
  } else if(id==='pet'){
    if(e){ e.petT=2.2; hearts(e,4); sfx('meow',e.x,e.z); }
    kittyScreen(esc(['Mrrp! '+K.name+' bumps your hand with a fuzzy head.',K.name+' leans into the scritches and shuts both eyes.',
      K.name+' rolls over to show a fluffy tummy. It is a trap. You know it is a trap.'][(Math.random()*3)|0]));
  } else if(id==='name') kittyNameScreen(true);
}
/* adopting (from the cottage) or renaming */
function kittyNameScreen(rename,coat,typed){
  var K=HOME.kitty, p=G.player;
  coat=coat||(K&&K.coat)||'ginger';
  var val=typed!==undefined?typed:(K?K.name:KITTY_NAMES[(Math.random()*KITTY_NAMES.length)|0]);
  var html='<h1>'+(rename?'A new name':'A kitty for the farm')+'</h1>'+
    (rename?'':'<p class="say">“A little cat\'s been hanging round your yard,” says the notice-board by the gate. “Good mouser. Needs a home. '+KITTY_PRICE+' coins to the Greenleaf for the cat\'s keep so far.”</p>')+
    '<h3>Coat</h3><div class="picks coats">'+Object.keys(KITTY_COATS).map(function(k){ var C=KITTY_COATS[k], c=C.c;
      return '<div class="pick'+(coat===k?' on':'')+'" data-coat="'+k+'"><b><span class="sw" style="background:rgb('+c.map(function(v){ return Math.round(v*255); }).join(',')+')"></span>'+C.n+'</b></div>'; }).join('')+'</div>'+
    '<h3>Name</h3><input id="kname" class="field" maxlength="16" autocomplete="off" spellcheck="false" value="'+esc(val)+'">'+
    '<div class="bagbtns" style="flex-wrap:wrap">'+KITTY_NAMES.slice(0,6).map(function(n){ return '<button class="mini alt" data-n="'+n+'">'+n+'</button>'; }).join('')+'</div>'+
    (rename?'':'<div class="stat"><span>Your purse</span><b>◉ '+p.coins+' / '+KITTY_PRICE+'</b></div>')+
    '<button class="btn" id="kok"'+(!rename&&p.coins<KITTY_PRICE?' disabled':'')+'>'+(rename?'That\'s the name':(p.coins<KITTY_PRICE?'Not enough coin yet':'Welcome home! — '+KITTY_PRICE+' ◉'))+'</button>'+
    '<button class="btn alt" id="kback">Back</button>';
  show(html);
  var inp=document.getElementById('kname');
  function name(){ var s=(inp.value||'').replace(/\s+/g,' ').trim().slice(0,16); return s||KITTY_NAMES[0]; }
  inp.addEventListener('keydown',function(ev){ ev.stopPropagation(); if(ev.key==='Enter') document.getElementById('kok').click(); });
  inp.addEventListener('keyup',function(ev){ ev.stopPropagation(); });
  var picks=ui.querySelectorAll('[data-coat]');
  for(var i=0;i<picks.length;i++) picks[i].onclick=function(){ kittyNameScreen(rename,this.getAttribute('data-coat'),inp.value); };
  var ns=ui.querySelectorAll('[data-n]');
  for(var j=0;j<ns.length;j++) ns[j].onclick=function(){ inp.value=this.getAttribute('data-n'); };
  document.getElementById('kok').onclick=function(){
    if(rename){ K.name=name(); K.coat=coat; saveGame(); kittyScreen(esc(K.name)+' looks up at the sound of the new name, and approves.'); return; }
    if(p.coins<KITTY_PRICE||HOME.kitty) return;
    adoptKitty(name(),coat); sfx('freed');
    cottageScreen(esc(HOME.kitty.name)+' trots in through the gate, sniffs every corner of the yard, and sits down on the doorstep as if it had always lived here.');
  };
  document.getElementById('kback').onclick=function(){ if(rename) kittyScreen(); else cottageScreen(); };
}
function adoptKitty(name,coat){
  G.player.coins-=KITTY_PRICE; HOME.kitty={name:name,coat:KITTY_COATS[coat]?coat:'ginger',fed:0,got:0};
  spawnKitty(); saveGame();
}
