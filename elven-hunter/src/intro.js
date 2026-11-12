/* ---------- the intro: a slow-motion fly-through of the wood, with the story ----------
   Shot in the game's own world, so it costs nothing in file size and always matches
   the game. A first visit gets "tap to begin" (which also wakes the sound), then the
   film; later visits go straight to the title, which offers it again. Any key or tap
   skips it. Behind the title the camera keeps circling your hunter and band. */

var CINE_SLOW=0.38;                 // the world runs at this fraction of real time
var CINE_END=38.5;
var CINE_SHOTS=[                    // [start, end] in real seconds, and the camera for it
  [0,8,'aerial'],[8,14.5,'hollow'],[14.5,21,'dragon'],[21,28.5,'band'],[28.5,CINE_END,'crane']
];
var CINE_LINES=[                    // [in, out, text]
  [0.9,7.2,'A long time ago, in a wood far away…'],
  [8.9,20.3,'where the wilds have taken over…'],
  [21.7,28.0,'one hunter and his weary band'],
  [29.2,35.0,'seek to bring peace to the land,<br>and restore harmony to its creatures.']
];
var CINE_TITLE=[34.4,38.2];
var CINE_BAND=[[2,'Maera'],[0,'Corin'],[5,'Durgan'],[3,'Ilsevel']];   // knight, ranger, dwarf, mage
var CINE_FORM=[[-1.9,-2.3],[1.9,-2.5],[-1.0,-4.6],[1.3,-4.9]];       // right, ahead (negative: behind)
var CINE_START={x:0,z:9};

var cineEl=document.createElement('div');
cineEl.id='cine';
cineEl.innerHTML='<div class="cv"></div><div class="cb top"></div><div class="cb bot"></div>'+
  '<div class="cblack"></div><div class="cline"></div><div class="ctitle">Elven Hunter</div>'+
  '<div class="cgate"><b>Elven Hunter</b><span></span></div><div class="cskip">skip ›</div>';
(document.getElementById('wrap')||document.body).appendChild(cineEl);
var cineQ=function(s){ return cineEl.querySelector(s); };

function cineSeen(){ try{ return localStorage.getItem('eh3_intro')==='1'; }catch(e){ return false; } }
function cineMarkSeen(){ try{ localStorage.setItem('eh3_intro','1'); }catch(e){} }

/* a fresh wood for the film and the title: your saved hunter if there is one */
function cineWorld(){
  var sv=loadSave();
  if(sv){ G.build.race=sv.build.race; G.build.cls=sv.build.cls; }
  gearInit(sv?sv.build:null);
  wildLoad(null); CAVEENV=null; WILD.inCave=false; setCaveEnv(false);
  G.player=null; recalc();
  G.player=newPlayer(); G.msgs.length=0; G.bounty=null; FX.length=0; G.hitStop=0; G.shakeA=0; G.tipT=0;
  homeReset();
  G.player.x=CINE_START.x; G.player.z=CINE_START.z;
  populate();
  buildCottage();
  var p=G.player;
  p.yaw=Math.atan2(TAVERN.x-p.x,TAVERN.z-p.z); p.y=H(p.x,p.z);
  G.cineBand=[];
  for(var i=0;i<CINE_BAND.length;i++){ spawnAlly(CINE_BAND[i][0],p.x,p.z,CINE_BAND[i][1]);
    var a=G.ents[G.ents.length-1]; a.cheer=0; a.yaw=p.yaw; a.ears=1; G.cineBand.push(a); }
  // nothing hostile wanders up to the band while they pose
  for(var j=G.ents.length-1;j>=0;j--){ var e=G.ents[j];
    if(FOE[e.kind]&&!e.boss&&Math.hypot(e.x-p.x,e.z-p.z)<26) G.ents.splice(j,1); }
  cineForm(0);
  G.cine={mode:'orbit',T:0,sd:0,look:{x:p.x,y:p.y+1.4,z:p.z},fov:null,orbit:0.9};
}
/* the band keeps its formation round the hunter */
function cineForm(speed){
  var p=G.player, fx=Math.sin(p.yaw), fz=Math.cos(p.yaw), rx=-fz, rz=fx;
  p.speed=speed; p.y=H(p.x,p.z);
  for(var i=0;i<G.cineBand.length;i++){ var a=G.cineBand[i], f=CINE_FORM[i];
    var wob=Math.sin(G.t*0.9+i*1.7)*0.25;
    a.x=p.x+rx*(f[0]+wob)+fx*f[1]; a.z=p.z+rz*(f[0]+wob)+fz*f[1]; a.y=H(a.x,a.z);
    a.yaw=p.yaw; a.speed=speed; a.onGround=true; a.cheer=0; }
}

/* ---------- the camera, shot by shot ---------- */
function ease(u){ return 0.5-0.5*Math.cos(Math.PI*clamp(u,0,1)); }
function lerp(a,b,u){ return a+(b-a)*u; }
function cineSet(x,y,z,lx,ly,lz,fov){
  var g=Math.max(H(x,z),WATER)+1.0; if(y<g) y=g;          // never inside a hill
  G.cam.x=x; G.cam.y=y; G.cam.z=z;
  G.cine.look.x=lx; G.cine.look.y=ly; G.cine.look.z=lz; G.cine.fov=fov||null;
}
var CINE_CAM={
  // over the sea, gliding in on the wood
  aerial:function(u){ var e=ease(u);
    var x=lerp(118,46,e), z=lerp(52,24,e), y=lerp(46,20,e);
    var lx=lerp(10,0,e), lz=lerp(-14,-4,e);
    cineSet(x,y,z,lx,H(lx,lz)+lerp(6,2,e),lz,lerp(0.95,0.85,e)); },
  // low through the Queen's Hollow: spiders creeping past the cocoons
  hollow:function(u){ var h=LM.hollow, e=ease(u), a=lerp(2.6,1.6,e), r=lerp(14,9.5,e);
    var x=h.x+Math.sin(a)*r, z=h.z+Math.cos(a)*r, base=H(h.x,h.z);
    cineSet(x,Math.max(base,H(x,z))+lerp(8,4.5,e),z,h.x,base+0.6,h.z,0.80); },
  // round the sleeping dragon on his crag
  // (from the south-west you see his head curled by the hoard)
  dragon:function(u){ var L=CRAG.lair, e=ease(u), a=lerp(-0.45,0.75,e), r=lerp(13,10,e);
    var top=CRAG.top||H(L.x,L.z);
    cineSet(L.x+Math.sin(a)*r,top+lerp(5.5,3.4,e),L.z+Math.cos(a)*r,L.x,top+1.5,L.z,0.70); },
  // beside the band as they run, long lens, slow motion
  band:function(u){ var p=G.player, e=ease(u), fx=Math.sin(p.yaw), fz=Math.cos(p.yaw), rx=-fz, rz=fx;
    var ahead=lerp(6.5,4.2,e), side=lerp(-3.4,2.6,e);
    cineSet(p.x+fx*ahead+rx*side,p.y+lerp(1.0,1.6,e),p.z+fz*ahead+rz*side,
      p.x+fx*1.5,p.y+1.35,p.z+fz*1.5,0.62); },
  // rise up and back as they run on into the wood
  crane:function(u){ var p=G.player, e=ease(u), fx=Math.sin(p.yaw), fz=Math.cos(p.yaw);
    var back=lerp(5,15,e), up=lerp(2.0,15,e);
    cineSet(p.x-fx*back+Math.cos(p.yaw)*lerp(1.5,4,e),p.y+up,p.z-fz*back-Math.sin(p.yaw)*lerp(1.5,4,e),
      p.x+fx*lerp(3,14,e),p.y+lerp(1.4,2.5,e),p.z+fz*lerp(3,14,e),lerp(0.78,0.95,e)); },
  // behind the title: circle the band where they stand
  orbit:function(dt){ var p=G.player, c=G.cine;
    c.orbit+=dt*0.045;
    var cx=p.x-Math.sin(p.yaw)*1.6, cz=p.z-Math.cos(p.yaw)*1.6, a=p.yaw+c.orbit;
    // on a wide screen, aim past the band so they stand clear of the title card, on the left
    var off=(W/Math.max(1,H2)>1.2)?5.2:0;
    cineSet(cx+Math.sin(a)*10.5,p.y+3.6,cz+Math.cos(a)*10.5,
      cx+Math.cos(a)*off,p.y+1.3,cz-Math.sin(a)*off,0.80); }
};

/* ---------- the clock ---------- */
function cineUpdate(dt){
  var c=G.cine; if(!c||!G.player) return;
  var sd=dt*CINE_SLOW; c.sd=sd;
  G.t+=sd; updateFX(sd);
  // pollen and motes drift through the light
  var L=c.look;
  if(Math.random()<dt*24){ var a=Math.random()*6.283, d=2+Math.random()*9;
    burst(L.x+Math.cos(a)*d,L.y-0.5+Math.random()*3,L.z+Math.sin(a)*d,1,
      Math.random()<0.7?[1.0,0.86,0.52]:[0.80,1.0,0.70],{up:0.25,spread:0.35,size:0.05,life:5,grav:-0.04}); }
  if(c.mode!=='intro'){ cineForm(0); CINE_CAM.orbit(dt); cineFade(0); return; }
  c.T+=dt; var T=c.T;
  if(T>=CINE_END){ cineEnd(); return; }
  var shot=CINE_SHOTS[0];
  for(var i=0;i<CINE_SHOTS.length;i++) if(T>=CINE_SHOTS[i][0]) shot=CINE_SHOTS[i];
  // the band runs from the moment we meet them
  var p=G.player;
  if(T>=CINE_SHOTS[3][0]){ var run=6.0*sd; p.x+=Math.sin(p.yaw)*run; p.z+=Math.cos(p.yaw)*run; cineForm(6.0); }
  else cineForm(0);
  // the Queen's brood creeps about the hollow
  if(shot[2]==='hollow') for(var k=0;k<G.ents.length;k++){ var s=G.ents[k];
    if(s.kind!=='spider'||Math.hypot(s.x-LM.hollow.x,s.z-LM.hollow.z)>24) continue;
    s.yaw=(s.yaw||0)+Math.sin(G.t*0.7+k)*sd*0.8; s.speed=1.6;
    if(Math.hypot(s.x-G.cam.x,s.z-G.cam.z)<9) s.yaw=Math.atan2(s.x-G.cam.x,s.z-G.cam.z);   // not into the lens
    s.x+=Math.sin(s.yaw)*1.6*sd; s.z+=Math.cos(s.yaw)*1.6*sd; s.y=H(s.x,s.z); }
  CINE_CAM[shot[2]]((T-shot[0])/(shot[1]-shot[0]));
  // fade through black between shots
  var edge=Math.min(T-shot[0],shot[1]-T), black=clamp(1-edge/0.6,0,1);
  if(T<1.4) black=Math.max(black,1-T/1.4);
  cineFade(black);
  // the words
  var txt='', on=0;
  for(var j=0;j<CINE_LINES.length;j++){ var l=CINE_LINES[j];
    if(T>=l[0]-0.2&&T<l[1]+1.2){ txt=l[2]; on=(T>=l[0]&&T<l[1])?1:0; } }
  var ln=cineQ('.cline'); if(ln.__t!==txt){ ln.innerHTML=txt; ln.__t=txt; }
  ln.classList.toggle('on',!!on);
  cineQ('.ctitle').classList.toggle('on',T>=CINE_TITLE[0]&&T<CINE_TITLE[1]);
  if(T>1.2) cineQ('.cskip').classList.add('on');
}
function cineFade(b){ var el=cineQ('.cblack'); var v=b.toFixed(3); if(el.__v!==v){ el.style.opacity=v; el.__v=v; } }

/* ---------- starting, skipping, ending ---------- */
function cineShow(mode){ cineEl.className='on '+mode; }
function cineGate(){
  G.state='intro'; G.cine.mode='gate';
  cineQ('.cgate span').textContent=DESKTOP?'click to begin':'tap to begin';
  cineShow('gate'); cineFade(0.45);
}
function cinePlay(){
  // from the gate the wood is already set; from the title, start the band afresh
  if(!G.cine||G.cine.mode!=='gate') cineWorld();
  hide();
  G.state='intro'; G.cine.mode='intro'; G.cine.T=0;
  cineQ('.cline').classList.remove('on'); cineQ('.ctitle').classList.remove('on'); cineQ('.cskip').classList.remove('on');
  cineFade(1); cineShow('play');
  sndWake();
}
function cineEnd(){
  if(!G.cine) return;
  cineMarkSeen();
  G.cine.mode='orbit'; G.cine.orbit=0.9;
  // the title picks up from wherever the band has run to
  cineEl.className=''; cineFade(0);
  titleScreen();
}
function cineStop(){ G.cine=null; G.cineBand=null; cineEl.className=''; }
function cineBoot(){
  cineWorld();
  if(cineSeen()||navigator.webdriver) titleScreen();
  else cineGate();
}
cineEl.addEventListener('pointerdown',function(e){
  e.preventDefault(); e.stopPropagation();
  if(!G.cine) return;
  if(G.cine.mode==='gate') cinePlay();
  else if(G.cine.mode==='intro'&&G.cine.T>0.4) cineEnd();
});
addEventListener('keydown',function(e){
  if(G.state!=='intro'||!G.cine||e.repeat||e.key==='m'||e.key==='M') return;   // M only changes the sound
  if(G.cine.mode==='gate'&&(e.key==='Enter'||e.key===' ')){ cinePlay(); return; }
  if(G.cine.mode==='intro'&&G.cine.T>0.4) cineEnd();
},true);
