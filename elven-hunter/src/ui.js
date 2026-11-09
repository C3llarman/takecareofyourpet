/* ================= ui: the laptop HUD =================
   Framed panels in the spirit of the big online fantasy games, kept simple for
   young players: your portrait and health top-left, the thing you're fighting
   beside it, an action bar along the bottom with the keys printed on it and a
   sweep while things cool down, the zone name and a quest tracker by the map, and
   a short log of what you picked up. Phones keep their own touch layout (game.js).
   Nothing about the controls changes: attacks still find the best target on their
   own; T only lets older players pick one. */

var UI_GOLD='#e8c26a', UI_INK='#f3e7c9', UI_DIM='#a89873';
/* a framed panel: dark glass, a thin gold rule and a faint inner bevel */
function uiPanel(x,y,w,h,r,alpha){
  hx.fillStyle='rgba(10,9,6,'+(alpha||0.72)+')'; roundRect(x,y,w,h,r); hx.fill();
  hx.strokeStyle='rgba(232,194,106,.55)'; hx.lineWidth=1.5; hx.stroke();
  hx.strokeStyle='rgba(255,240,200,.07)'; hx.lineWidth=1; roundRect(x+2.5,y+2.5,w-5,h-5,Math.max(1,r-2)); hx.stroke();
}
function uiBar(x,y,w,h,f,col,back){
  hx.fillStyle=back||'rgba(0,0,0,.55)'; roundRect(x,y,w,h,h/2); hx.fill();
  if(f>0){ hx.fillStyle=col; roundRect(x,y,Math.max(h,w*clamp(f,0,1)),h,h/2); hx.fill();
    hx.fillStyle='rgba(255,255,255,.16)'; roundRect(x+2,y+1,Math.max(h-2,(w-4)*clamp(f,0,1)),h*0.38,h*0.2); hx.fill(); }
  hx.strokeStyle='rgba(0,0,0,.6)'; hx.lineWidth=1; roundRect(x,y,w,h,h/2); hx.stroke();
}
function uiText(t,x,y,size,col,align,weight){
  hx.font=(weight||600)+' '+size+'px Georgia,serif'; hx.textAlign=align||'left';
  hx.fillStyle='rgba(0,0,0,.7)'; hx.fillText(t,x+1,y+1); hx.fillStyle=col||UI_INK; hx.fillText(t,x,y);
}

/* ---------- icons, drawn with the canvas so they cost no bytes ---------- */
function uiIcon(id,x,y,s){
  hx.save(); hx.translate(x,y); hx.scale(s/24,s/24); hx.lineCap='round'; hx.lineJoin='round';
  function st(c,w){ hx.strokeStyle=c; hx.lineWidth=w||2.4; hx.stroke(); }
  function fl(c){ hx.fillStyle=c; hx.fill(); }
  hx.beginPath();
  switch(id){
    case 'sword': hx.moveTo(-8,8); hx.lineTo(8,-8); st('#dfe4ea',3.2); hx.beginPath(); hx.moveTo(-9,3); hx.lineTo(-3,9); st('#c99a3f',2.6);
      hx.beginPath(); hx.moveTo(-8,8); hx.lineTo(-11,11); st('#7a5530',3); break;
    case 'axe': hx.moveTo(-9,10); hx.lineTo(6,-5); st('#8a6034',3); hx.beginPath(); hx.moveTo(2,-11); hx.quadraticCurveTo(13,-8,10,3); hx.lineTo(3,-3); hx.closePath(); fl('#d8dde4'); break;
    case 'staff': hx.moveTo(-8,10); hx.lineTo(5,-5); st('#8a6034',2.8); hx.beginPath(); hx.arc(7,-7,4.5,0,6.3); fl('#8fd8ff'); break;
    case 'bow': hx.moveTo(-6,-10); hx.quadraticCurveTo(10,0,-6,10); st('#b07a40',2.6); hx.beginPath(); hx.moveTo(-6,-10); hx.lineTo(-6,10); st('#eee',1);
      hx.beginPath(); hx.moveTo(-10,0); hx.lineTo(9,0); st('#ddd',1.6); hx.beginPath(); hx.moveTo(9,0); hx.lineTo(5,-3); hx.lineTo(5,3); hx.closePath(); fl('#ddd'); break;
    case 'throw': hx.arc(0,0,9,3.6,5.6); st('#bbb',1.4); hx.beginPath(); hx.moveTo(-5,8); hx.lineTo(7,-4); st('#8a6034',2.6); hx.beginPath(); hx.moveTo(4,-9); hx.lineTo(11,-2); hx.lineTo(5,0); hx.closePath(); fl('#d8dde4'); break;
    case 'bolt': hx.moveTo(-2,-11); hx.lineTo(-6,1); hx.lineTo(0,1); hx.lineTo(-3,11); hx.lineTo(7,-3); hx.lineTo(1,-3); hx.lineTo(4,-11); hx.closePath(); fl('#9fe0ff'); break;
    case 'dash': for(var i=0;i<3;i++){ hx.moveTo(-10,-6+i*6); hx.lineTo(2-i*2,-6+i*6); } st('#bff0ff',2.2); hx.beginPath(); hx.moveTo(4,-8); hx.lineTo(11,0); hx.lineTo(4,8); st('#bff0ff',2.6); break;
    case 'potion': hx.moveTo(-3,-10); hx.lineTo(3,-10); hx.lineTo(3,-4); hx.lineTo(8,4); hx.quadraticCurveTo(9,10,0,10); hx.quadraticCurveTo(-9,10,-8,4); hx.lineTo(-3,-4); hx.closePath(); fl('#e05050');
      hx.beginPath(); hx.rect(-4,-12,8,3); fl('#c9a070'); break;
    case 'cake': hx.moveTo(-10,6); hx.lineTo(10,6); hx.lineTo(8,-2); hx.lineTo(-8,-2); hx.closePath(); fl('#e0a850'); hx.beginPath(); hx.ellipse(0,-3,9,4,0,0,6.3); fl('#f6e0a0');
      hx.beginPath(); hx.arc(0,-7,2,0,6.3); fl('#d04050'); break;
    case 'tonic': hx.moveTo(-6,10); hx.lineTo(6,10); hx.lineTo(4,-6); hx.lineTo(-4,-6); hx.closePath(); fl('#5fc8a0'); hx.beginPath(); hx.moveTo(0,-6); hx.quadraticCurveTo(8,-14,9,-6); hx.quadraticCurveTo(3,-4,0,-6); fl('#7ee070'); break;
    case 'skills': for(var k=0;k<10;k++){ var a=k/10*6.283-1.57, r=(k&1)?4.5:10; hx.lineTo(Math.cos(a)*r,Math.sin(a)*r); } hx.closePath(); fl('#ffd76a'); break;
    case 'journal': hx.rect(-8,-10,16,20); fl('#7a4a2a'); hx.beginPath(); hx.rect(-5,-10,2,20); fl('#c9a070'); hx.beginPath(); hx.moveTo(-1,-4); hx.lineTo(6,-4); hx.moveTo(-1,0); hx.lineTo(6,0); st('#e8d6a8',1.2); break;
    case 'fly': hx.moveTo(0,-1); hx.lineTo(11,-7); hx.lineTo(5,1); hx.lineTo(0,7); hx.lineTo(-5,1); hx.lineTo(-11,-7); hx.closePath(); fl('#e8c88a'); break;
    case 'charge': for(var c=0;c<3;c++){ hx.moveTo(-11,-5+c*5); hx.lineTo(-3,-5+c*5); } st('#e8c08a',2); hx.beginPath(); hx.moveTo(-1,-9); hx.lineTo(11,0); hx.lineTo(-1,9); hx.closePath(); fl('#d8dde4'); break;
    case 'spin': hx.arc(0,0,9,0.3,5.6); st('#d8dde4',3); hx.beginPath(); hx.moveTo(9,-4); hx.lineTo(12,2); hx.lineTo(5,1); hx.closePath(); fl('#d8dde4'); hx.beginPath(); hx.arc(0,0,3,0,6.3); fl('#8a6034'); break;
    case 'shout': hx.moveTo(-9,-4); hx.lineTo(-2,-4); hx.lineTo(5,-10); hx.lineTo(5,10); hx.lineTo(-2,4); hx.lineTo(-9,4); hx.closePath(); fl('#ffd76a');
      hx.beginPath(); hx.arc(6,0,6,-0.8,0.8); st('#ffd76a',1.6); hx.beginPath(); hx.arc(6,0,10,-0.8,0.8); st('#ffd76a',1.6); break;
    case 'volley': for(var v=-2;v<=2;v++){ hx.moveTo(-10,0); hx.lineTo(10,v*4); } st('#e8e2d0',1.6); break;
    case 'smoke': hx.arc(-4,3,6,0,6.3); hx.arc(4,1,7,0,6.3); hx.arc(0,-5,6,0,6.3); fl('#b8b8c4'); break;
    case 'rain': for(var a2=0;a2<5;a2++){ hx.moveTo(-9+a2*4.5,-10); hx.lineTo(-11+a2*4.5,6); } st('#e8e2d0',1.8); hx.beginPath(); hx.moveTo(-12,10); hx.lineTo(12,10); st('#8a7050',2); break;
    case 'nova': for(var n2=0;n2<8;n2++){ var na=n2/8*6.283; hx.moveTo(Math.cos(na)*3,Math.sin(na)*3); hx.lineTo(Math.cos(na)*11,Math.sin(na)*11); } st('#bfe8ff',2.4); hx.beginPath(); hx.arc(0,0,3.5,0,6.3); fl('#ffffff'); break;
    case 'fireball': hx.arc(2,2,7,0,6.3); fl('#ff8a30'); hx.beginPath(); hx.arc(3,3,3.5,0,6.3); fl('#ffe080'); hx.beginPath(); hx.moveTo(-3,-3); hx.lineTo(-11,-9); hx.moveTo(-1,-6); hx.lineTo(-7,-12); st('#ff8a30',2); break;
    case 'ward': hx.moveTo(0,-11); hx.lineTo(9,-6); hx.lineTo(8,4); hx.quadraticCurveTo(5,9,0,11); hx.quadraticCurveTo(-5,9,-8,4); hx.lineTo(-9,-6); hx.closePath(); fl('#7fb0ff');
      hx.beginPath(); hx.arc(0,0,3,0,6.3); fl('#e8f4ff'); break;
    case 'lock': hx.rect(-6,-2,12,10); fl('#6a6458'); hx.beginPath(); hx.arc(0,-3,4.5,3.14,6.29); st('#6a6458',2.4); break;
  }
  hx.restore();
}

/* ---------- the thing you're fighting ----------
   Not a control you must use: the target frame simply shows what your attacks will go
   for (the last thing you aimed at, else the best thing in front of you). T picks
   the next foe for older players; attacks then favour it while it's in reach. */
function uiTarget(){
  var p=G.player;
  if(G.pick&&(G.ents.indexOf(G.pick)<0||G.pick.hp<=0||Math.hypot(G.pick.x-p.x,G.pick.z-p.z)>40)) G.pick=null;
  if(G.pick) return G.pick;
  if(G.lock&&G.ents.indexOf(G.lock)>=0&&G.lock.hp>0&&Math.hypot(G.lock.x-p.x,G.lock.z-p.z)<34) return G.lock;
  var t=aimTarget(p,22); if(t&&t.kind!=='cocoon') return t;
  var best=null,bd=12;
  for(var i=0;i<G.ents.length;i++){ var e=G.ents[i]; if(!FOE[e.kind]||e.state==='sleep') continue;
    var d=Math.hypot(e.x-p.x,e.z-p.z); if(d<bd){ bd=d; best=e; } }
  return best;
}
function cycleTarget(){
  var p=G.player, list=G.ents.filter(function(e){ return FOE[e.kind]&&e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<30&&e.state!=='sleep'; });
  list.sort(function(a,b){ return Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z); });
  if(!list.length){ G.pick=null; return; }
  var i=list.indexOf(G.pick); G.pick=list[(i+1)%list.length]; sfx('click');
}
/* attacks prefer the picked target while it's in reach; otherwise the old auto-aim */
function pickedIn(maxD){
  var p=G.player, t=G.pick; if(!t||G.ents.indexOf(t)<0||t.hp<=0) return null;
  var d=Math.hypot(t.x-p.x,t.z-p.z)-(t.rad?t.rad*0.6:0);
  return d<=maxD?t:null;
}
function foeName(e){
  if(e.name) return e.name;
  if(e.kind==='spider') return e.big?'Giant spider':(e.minion?'Spiderling':'Spider');
  return {snake:'Snake',wasp:'Wasp',shroom:'Mushroom grump',cocoon:'Cocoon'}[e.kind]||e.kind;
}

/* ---------- the event log: loot, XP, quests, discoveries ---------- */
var LOG=[];
function logLine(t,col){ if(!t) return; LOG.push({t:t,c:col||UI_INK,at:G.t}); if(LOG.length>30) LOG.shift(); }

/* ---------- action bar ---------- */
function deskSlots(){
  var S=G.S, p=G.player, cls=G.build.cls;
  var main=cls==='warrior'?'axe':(cls==='wizard'?'staff':'sword'), ranged=S.proj==='arrow'?'bow':(S.proj==='bolt'?'bolt':'throw');
  var cd=Math.max(0,p.cdT);
  var abs=abList().map(function(a,i){ var on=abUnlocked(a);
    return {k:''+(i+3),icon:on?a.icon:'lock',n:on?a.n:a.n+' (level '+a.lvl+')',d:on?a.d:'Unlocks at level '+a.lvl,cd:on?abLeft(a)/abCdFull(a):0,off:!on,lockLvl:on?0:a.lvl,
      act:function(){ useAbility(i); }}; });
  return [
    {k:'1',alt:'E',icon:main,n:'Strike',d:'Swing at what\'s in front of you',cd:cd/0.45,act:function(){ press('attack'); IN.attack=false; }},
    {k:'2',alt:'F',icon:ranged,n:'Shoot',d:'Fire at the nearest foe ahead',cd:cd/Math.max(0.2,S.cd),act:function(){ press('shoot'); }},
    abs[0],abs[1],abs[2],
    {k:'6',alt:'Q',icon:'potion',n:'Healing potion',d:'Heals almost half your health',count:p.potions,off:p.potions<=0,act:function(){ usePotion(); }},
    {k:'7',icon:'cake',n:'Honey cake',d:'Mend for 40 seconds',count:inv('cake'),off:inv('cake')<=0,act:function(){ useItem('cake'); }},
    {k:'8',icon:'tonic',n:'Wardleaf tonic',d:'Half damage for 45 seconds',count:inv('tonic'),off:inv('tonic')<=0,act:function(){ useItem('tonic'); }}
  ];
}
function useItem(id){
  var p=G.player; if(!p||p.dead||inv(id)<=0) return;
  WILD.inv[id]--;
  if(id==='cake'){ p.buff=3; p.buffT=40; msg('Honey cake!','#ffe08a',p.x,p.y+2.4,p.z); }
  else { p.buff=2; p.buffT=45; msg('Wardleaf tonic','#bff0d0',p.x,p.y+2.4,p.z); }
  sfx('potion'); burst(p.x,p.y+1.2,p.z,14,id==='cake'?[1.0,0.85,0.4]:[0.5,1.0,0.7],{up:3,spread:2,size:0.12,life:0.8,grav:-1.5});
}
var UIBAR=null;
function barGeom(){
  var n=8, s=clamp(W/26,42,56), gap=6, micro=WILD.eagle?3:2, mw=s*0.62;
  var w=n*s+(n-1)*gap+14+micro*(mw+5)+12, x=W/2-w/2, y=H2-s-18;
  return {x:x,y:y,w:w,s:s,gap:gap,n:n,mw:mw,micro:micro};
}
function drawActionBar(){
  var B=barGeom(), slots=deskSlots(), p=G.player;
  uiPanel(B.x-8,B.y-8,B.w+16,B.s+16,10,0.62);
  UIBAR={B:B,slots:[],micro:[]};
  for(var i=0;i<slots.length;i++){
    var sl=slots[i], x=B.x+i*(B.s+B.gap), y=B.y, s=B.s;
    hx.fillStyle=sl.off?'rgba(30,26,20,.85)':'rgba(40,32,18,.9)'; roundRect(x,y,s,s,7); hx.fill();
    var gr=hx.createLinearGradient(x,y,x,y+s); gr.addColorStop(0,'rgba(255,230,170,.10)'); gr.addColorStop(1,'rgba(0,0,0,.25)');
    hx.fillStyle=gr; roundRect(x,y,s,s,7); hx.fill();
    hx.globalAlpha=sl.off?0.35:1; uiIcon(sl.icon,x+s/2,y+s/2+1,s*0.62); hx.globalAlpha=1;
    if(sl.cd>0.01){                                    // the cooldown sweep
      hx.save(); hx.beginPath(); hx.moveTo(x+s/2,y+s/2); hx.arc(x+s/2,y+s/2,s*0.75,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(sl.cd,0,1)); hx.closePath();
      roundRect(x,y,s,s,7); hx.clip(); hx.beginPath(); hx.moveTo(x+s/2,y+s/2); hx.arc(x+s/2,y+s/2,s*0.75,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(sl.cd,0,1)); hx.closePath();
      hx.fillStyle='rgba(0,0,0,.55)'; hx.fill(); hx.restore();
    } else if(!sl.off){ hx.strokeStyle='rgba(255,215,106,'+(0.35+0.25*Math.sin(G.t*3+i))+')'; hx.lineWidth=1.5; roundRect(x+1,y+1,s-2,s-2,6); hx.stroke(); }
    hx.strokeStyle='rgba(232,194,106,.75)'; hx.lineWidth=1.5; roundRect(x,y,s,s,7); hx.stroke();
    uiText(sl.k,x+5,y+13,12,'#fff6de','left',700);
    if(sl.alt) uiText(sl.alt,x+s-5,y+13,10,UI_DIM,'right',600);
    if(sl.count!==undefined) uiText(''+sl.count,x+s-5,y+s-5,13,sl.count?'#fff6de':'#8a7a6a','right',700);
    if(sl.lockLvl) uiText('Lv '+sl.lockLvl,x+s/2,y+s-6,10.5,'#c9b27a','center',700);
    UIBAR.slots.push({x:x,y:y,s:s,sl:sl});
  }
  // the little buttons: skills, journal, and Aelfrend once he's yours
  var mx=B.x+B.n*(B.s+B.gap)+8, my=B.y+B.s/2-B.mw/2;
  var micro=[{icon:'skills',k:'Tab',n:'Skills',act:function(){ skillScreen(); },glow:G.build.points>0},
             {icon:'journal',k:'L',n:'Journal and quests',act:function(){ journalScreen(); },glow:G.loreNew>0}];
  if(WILD.eagle) micro.push({icon:'fly',k:'G',n:'Fly with Aelfrend',act:function(){ flyScreen(); }});
  for(var m=0;m<micro.length;m++){ var mc=micro[m], ux=mx+m*(B.mw+5);
    hx.fillStyle='rgba(30,24,14,.9)'; roundRect(ux,my,B.mw,B.mw,6); hx.fill();
    hx.strokeStyle=mc.glow&&Math.sin(G.t*5)>0?'#9ff07a':'rgba(232,194,106,.6)'; hx.lineWidth=1.5; roundRect(ux,my,B.mw,B.mw,6); hx.stroke();
    uiIcon(mc.icon,ux+B.mw/2,my+B.mw/2,B.mw*0.6); uiText(mc.k,ux+B.mw/2,my+B.mw+11,9,UI_DIM,'center');
    UIBAR.micro.push({x:ux,y:my,s:B.mw,m:mc}); }
  // experience, a thin bar over the action bar
  var need=xpNeed(p.level), xw=B.w+16, xx=B.x-8, xy=B.y-20;
  uiBar(xx,xy,xw,7,p.xp/need,'#8f7ad6','rgba(20,16,30,.8)');
  hx.strokeStyle='rgba(0,0,0,.45)'; hx.lineWidth=1;
  for(var t=1;t<10;t++){ hx.beginPath(); hx.moveTo(xx+xw*t/10,xy+1); hx.lineTo(xx+xw*t/10,xy+6); hx.stroke(); }
  uiText('Level '+p.level+'  ·  '+p.xp+' / '+need+' xp',W/2,xy-4,11,'#c9b8ff','center');
  // purse, at the bar's right
  uiText('◉ '+p.coins,B.x+B.w+14,B.y+B.s*0.42,14,'#ffe08a','left',700);
  uiText('✚ '+p.potions,B.x+B.w+14,B.y+B.s*0.42+18,12,'#ff9d9d','left',700);
  // a tooltip when the cursor is free and over a slot
  if(!LOCKED&&UIMOUSE){ var hit=uiHit(UIMOUSE.x,UIMOUSE.y);
    if(hit){ var tt=hit.sl?hit.sl:hit.m, title=tt.n+(tt.k?'  ['+tt.k+(tt.alt?' / '+tt.alt:'')+']':''), body=tt.d||'';
      hx.font='600 13px Georgia,serif'; var tw=Math.max(hx.measureText(title).width,hx.measureText(body).width)+20;
      var tx=clamp(hit.x+hit.s/2-tw/2,8,W-tw-8), ty=hit.y-62;
      uiPanel(tx,ty,tw,body?46:28,7,0.9); uiText(title,tx+10,ty+18,13,UI_GOLD,'left',700); if(body) uiText(body,tx+10,ty+36,12,UI_INK); } }
}
var UIMOUSE=null;
function uiHit(x,y){
  if(!UIBAR) return null;
  for(var i=0;i<UIBAR.slots.length;i++){ var a=UIBAR.slots[i]; if(x>=a.x&&x<=a.x+a.s&&y>=a.y&&y<=a.y+a.s) return a; }
  for(var j=0;j<UIBAR.micro.length;j++){ var b=UIBAR.micro[j]; if(x>=b.x&&x<=b.x+b.s&&y>=b.y&&y<=b.y+b.s) return b; }
  return null;
}
function uiClick(x,y){
  var h=uiHit(x,y); if(!h) return false;
  if(h.sl){ if(!h.sl.off) h.sl.act(); } else h.m.act();
  return true;
}
function uiKey(k){
  if(!DESKTOP||G.state!=='play') return false;
  var i='12345678'.indexOf(k); if(i<0) return false;
  var sl=deskSlots()[i]; if(sl&&!sl.off) sl.act(); return true;
}

/* ---------- the frames: you, and what you're fighting ---------- */
function drawUnitFrames(){
  var p=G.player, x=14, y=14, w=264, h=74;
  uiPanel(x,y,w,h,12);
  // portrait: your calling's weapon in a gold ring, with your level on a badge
  var px=x+38, py=y+37, cls=G.build.cls;
  hx.fillStyle='rgba(30,24,14,.95)'; hx.beginPath(); hx.arc(px,py,27,0,6.3); hx.fill();
  hx.strokeStyle=UI_GOLD; hx.lineWidth=2; hx.stroke();
  uiIcon(cls==='warrior'?'axe':(cls==='wizard'?'staff':'bow'),px,py,30);
  hx.fillStyle='#2a1a0a'; hx.beginPath(); hx.arc(px-20,py+20,11,0,6.3); hx.fill(); hx.strokeStyle=UI_GOLD; hx.lineWidth=1.5; hx.stroke();
  uiText(''+p.level,px-20,py+24.5,12,'#ffe6a0','center',700);
  var bx=x+74, bw=w-86;
  uiText(RACES[G.build.race].name+' '+CLASSES[G.build.cls].name,bx,y+21,13.5,UI_GOLD,'left',700);
  if(G.build.points>0) uiText('★ '+G.build.points+' — Tab',x+w-12,y+21,11.5,Math.sin(G.t*5)>-0.3?'#9ff07a':'#6fbf55','right',700);
  var hpf=p.hp/p.maxHp;
  uiBar(bx,y+29,bw,17,hpf,hpf<0.3?(Math.sin(G.t*8)>0?'#e8594a':'#b83a2e'):'#3fae4a');
  uiText(Math.ceil(p.hp)+' / '+p.maxHp,bx+bw/2,y+42,11.5,'#fff','center',700);
  // what's on you: a fairy's blessing, poison, webs; and Bram's bounty
  var ix=bx, iy=y+52;
  function chip(txt,col){ hx.font='700 11px Georgia,serif'; var tw=hx.measureText(txt).width+12;
    hx.fillStyle='rgba(0,0,0,.5)'; roundRect(ix,iy,tw,16,8); hx.fill(); hx.strokeStyle=col; hx.lineWidth=1; hx.stroke();
    uiText(txt,ix+6,iy+12,11,col,'left',700); ix+=tw+5; }
  if(p.buff!==null&&p.buff!==undefined){ var bc=FAIRYCOL[p.buff]; chip(FAIRYNAME[p.buff].split(' ')[0]+' '+Math.ceil(p.buffT)+'s','rgb('+bc.map(function(v){return Math.round(v*255);}).join(',')+')'); }
  if(p.poisonT>0) chip('Poisoned','#8fe070');
  if(p.ward>0) chip('Ward '+Math.ceil(p.ward),'#bfe0ff');
  if(p.shoutT>0) chip('Battle cry '+Math.ceil(p.shoutT)+'s','#ffd76a');
  if(p.slowT>0.3) chip('Webbed','#e8e8f0');
  var bq=G.bounty;
  if(bq) chip(bq.got>=bq.n?'⚑ Bounty done':'⚑ '+bq.got+'/'+bq.n,bq.got>=bq.n?'#ffd76a':'#e8d6a8');
  // the target frame
  var t=G.target; if(!t) return;
  var tx=x+w+12, tw=236, boss=t.boss||t.mini, gold=t.elite||boss;
  uiPanel(tx,y,tw,58,12);
  if(gold){ hx.strokeStyle=t.boss?'rgba(255,140,80,.9)':'rgba(255,215,106,.9)'; hx.lineWidth=2.2; roundRect(tx,y,tw,58,12); hx.stroke(); }
  var cx=tx+tw-32, cy=y+29;
  hx.fillStyle='rgba(30,24,14,.95)'; hx.beginPath(); hx.arc(cx,cy,22,0,6.3); hx.fill(); hx.strokeStyle=gold?'#ffd76a':'#a05a4a'; hx.lineWidth=2; hx.stroke();
  mapIcon(t.kind==='spider'&&(t.big||boss)?'bigspider':t.kind,cx,cy,2.6);
  var tl=boss?(t.boss?'Boss':'Mini-boss'):(t.elite?'Champion':(t.kind==='cocoon'?'Captive':''));
  var nm=foeName(t); hx.font='700 13px Georgia,serif'; while(hx.measureText(nm).width>tw-76&&nm.length>6) nm=nm.slice(0,-2);
  if(nm!==foeName(t)) nm=nm.replace(/[ ,]+$/,'')+'…';
  uiText(nm,tx+12,y+19,13,gold?'#ffd76a':'#f0b0a0','left',700);
  var tf=t.hp/t.maxHp;
  uiBar(tx+12,y+27,tw-82,15,tf,t.kind==='cocoon'?'#cfe8e8':(t.boss?'#d6584a':(gold?'#e0a83a':'#c84a3a')));
  uiText(Math.max(0,Math.ceil(t.hp))+' / '+Math.ceil(t.maxHp),tx+12+(tw-82)/2,y+39,10.5,'#fff','center',700);
  var dist=Math.round(Math.hypot(t.x-p.x,t.z-p.z));
  uiText((tl?tl+'  ·  ':'')+dist+'m'+(t.state==='sleep'?'  ·  asleep':'')+(G.pick===t?'  ·  picked':''),tx+12,y+52,10.5,gold&&tl?'#e8c26a':UI_DIM);
}
/* a ring on the ground under the target */
function drawTargetRing(){
  var t=G.target; if(!t) return;
  var r=(t.rad||(t.scale||1)*0.9)+0.35, gy=H(t.x,t.z)+0.08, pts=[];
  for(var i=0;i<=24;i++){ var a=i/24*6.2832, s=project(t.x+Math.cos(a)*r,gy,t.z+Math.sin(a)*r); if(!s) return; pts.push(s); }
  var col=t.boss||t.mini||t.elite?'rgba(255,215,106,':(t.kind==='cocoon'?'rgba(220,240,240,':'rgba(235,90,70,');
  hx.lineWidth=G.pick===t?3:2; hx.strokeStyle=col+(0.55+0.25*Math.sin(G.t*4))+')';
  hx.beginPath(); hx.moveTo(pts[0].x,pts[0].y); for(var j=1;j<pts.length;j++) hx.lineTo(pts[j].x,pts[j].y); hx.stroke();
}

/* ---------- zone name, quest tracker and the event log ---------- */
function zoneName(){
  var p=G.player; if(WILD.inCave) return 'The Glimmer Cave';
  var best=null,bd=1e9;
  for(var i=0;i<LANDMARKS.length;i++){ var l=LANDMARKS[i], d=Math.hypot(p.x-l.x,p.z-l.z); if(d<l.r+16&&d<bd&&G.found[l.name]){ bd=d; best=l.name; } }
  return best||'The Elderwood';
}
function qPlain(q){
  var g=q.goal, pr=qProgress(q);
  if(qReady(q)) return 'Return to '+FOLK[q.giver].name;
  if(g.type==='bring') return Object.keys(g.cost).map(function(k){ return RES[k].n+' '+Math.min(inv(k),g.cost[k])+'/'+g.cost[k]; }).join(', ');
  if(g.type==='deliver') return 'Take it to Bram at the Greenleaf';
  if(g.type==='gather') return RES[g.item].n+' '+pr.have+'/'+pr.need;
  return pr.have+' of '+pr.need+' found';
}
function drawTracker(){
  var MG=mapGeom(), x=MG.x+MG.r, y=MG.y+MG.r+22, lines=[];
  QUESTS.forEach(function(q){ if(qActive(q.id)) lines.push([q.t,qPlain(q),qReady(q)]); });
  if(G.bounty) lines.push(['Bram\'s bounty',G.bounty.got>=G.bounty.n?'Return to Bram':G.bounty.def.t.replace('{n}',G.bounty.n)+' — '+G.bounty.got+'/'+G.bounty.n,G.bounty.got>=G.bounty.n]);
  uiText('K  map key',x,MG.y+MG.r+14,10,UI_DIM,'right');
  if(!lines.length||SHOWKEY) return;
  lines=lines.slice(0,5);
  var w=250, h=18+lines.length*34;
  uiPanel(x-w,y,w,h,10,0.55);
  uiText('Quests',x-w+12,y+15,12,UI_GOLD,'left',700);
  for(var i=0;i<lines.length;i++){ var ly=y+32+i*34;
    uiText((lines[i][2]?'✔ ':'• ')+lines[i][0],x-w+12,ly,12.5,lines[i][2]?'#9ff07a':'#ffe6a0','left',700);
    var sub=lines[i][1]; hx.font='600 11px Georgia,serif'; while(hx.measureText(sub).width>w-30&&sub.length>8) sub=sub.slice(0,-2);
    uiText(sub,x-w+24,ly+15,11,UI_INK); }
}
function drawLog(){
  var B=barGeom(), x=14, y=H2-22, shown=0;
  for(var i=LOG.length-1;i>=0&&shown<6;i--){ var L=LOG[i], age=G.t-L.at; if(age>9) break;
    hx.globalAlpha=clamp(1-(age-7)/2,0,1)*0.95; var w=Math.min(W*0.3,B.x-30);
    var txt=L.t; hx.font='600 12px Georgia,serif'; while(hx.measureText(txt).width>w&&txt.length>8) txt=txt.slice(0,-2);
    uiText(txt,x,y-shown*17,12,L.c); shown++; }
  hx.globalAlpha=1;
}
function drawZone(){ var MG=mapGeom(); uiText(zoneName(),MG.x,MG.y-MG.r-8,13,UI_GOLD,'center',700); }

/* everything the laptop HUD adds, in one call from drawHUD */
function drawDeskHUD(){
  G.target=uiTarget();
  drawTargetRing();
  drawUnitFrames();
  drawZone();
  drawTracker();
  drawLog();
  drawActionBar();
}
