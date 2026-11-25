/* ================= fly fishing =================
   Bram sells a fly rod. With it, walk to the edge of any water and E / FISH.
   This is fly fishing as it's really done, simplified for young players:

   1. Pick a fly from your box. Each one suits some water better than others,
      and the dry flies work best when they match what is hatching.
   2. False cast: BACK, wait for the line to straighten out behind you, then
      FORWARD. Too soon and it cracks like a whip; too late and it falls on the
      grass. Each good false cast carries the line further. Lay it down when
      it reaches the fish.
   3. Fish the fly the way it's meant to be fished:
        dry flies float and drift with the current: MEND the line before it
        drags, and SET (lift) when a fish rises to it;
        nymphs sink under a strike indicator: set when the indicator dips;
        streamers are STRIPPED back in little pulls, and in salt water you
        strip-set, you don't lift.
   4. Play the fish: HOLD to strip line in, and let go when it runs, or the
      tippet snaps. Slack line lets it shake the hook.

   Kinds of water: the river (moving), the lakes and ponds (still), the sea off
   the Sunlit Shore, and the Emberleaf Isle's shore (salt). What you catch goes
   in your creel: sell it to Bram or take it home to the kitty (farm.js). */

var ROD_PRICE=40;
/* fishing follows the hunt's difficulty, gently: the timing windows narrow, the fish
   run harder, the line forgives less, and Bram and the journal pay a little more.
   win: extra seconds to set the hook · early/late: the forward-cast window, as a
   fraction of the time the line takes to straighten · snap: tension that breaks the
   tippet · slack: seconds of slack before it shakes free · run: how hard fish pull */
var FISHDIFF={
  easy:  {win:0.45, early:0.50, late:1.70, snap:1.12, slack:3.6, run:0.85, pay:1.0},
  normal:{win:0,    early:0.55, late:1.35, snap:1.00, slack:2.6, run:1.0,  pay:1.0},
  hard:  {win:-0.12,early:0.58, late:1.25, snap:0.96, slack:2.2, run:1.12, pay:1.15},
  expert:{win:-0.22,early:0.60, late:1.18, snap:0.93, slack:1.9, run:1.25, pay:1.3}
};
function FD(){ return FISHDIFF[G.build.diff]||FISHDIFF.normal; }
var FISH={
  trout:   {n:'Brook trout',   sell:10, w:{river:6,lake:3},   cm:[18,32], pw:0.45, like:{dry:1.3},           col:'#9a8a5c', spot:'#d2643c', tier:1},
  grayling:{n:'Grayling',      sell:14, w:{river:3},          cm:[25,42], pw:0.5,  like:{nymph:2.2},         col:'#8c95a6', spot:'#5a6278', tier:2},
  rainbow: {n:'Rainbow trout', sell:22, w:{river:1.6,lake:4}, cm:[30,58], pw:0.8,  like:{nymph:1.3,streamer:1.2}, col:'#a9b4a4', spot:'#e07aa0', tier:3},
  perch:   {n:'Perch',         sell:8,  w:{lake:4},           cm:[15,32], pw:0.4,  like:{streamer:1.5,nymph:1.2}, col:'#8fa04a', spot:'#3a4a1c', tier:1},
  pike:    {n:'Pike',          sell:34, w:{lake:0.9},         cm:[55,95], pw:1.0,  like:{streamer:4,dry:0.15,nymph:0.15}, col:'#6f8a4a', spot:'#d8e0a0', tier:3},
  mackerel:{n:'Mackerel',      sell:10, w:{sea:6},            cm:[25,40], pw:0.55, like:{clouser:2.2},       col:'#4c7f9a', spot:'#1d3446', tier:1},
  bass:    {n:'Sea bass',      sell:18, w:{sea:3},            cm:[35,62], pw:0.85, like:{shrimp:2.5},        col:'#a7b3bb', spot:'#5d6c76', tier:2},
  ember:   {n:'Ember carp',    sell:26, w:{isle:5},           cm:[40,72], pw:0.85, like:{shrimp:1.5},        col:'#d8782c', spot:'#8a3414', tier:2},
  golden:  {n:'Golden trout',  sell:60, w:{river:0.35,lake:0.3,sea:0.2,isle:0.35}, cm:[30,52], pw:0.75, like:{dry:1.5}, col:'#f2c24a', spot:'#b07a12', tier:4}
};
var FISH_ORDER=['trout','grayling','rainbow','perch','pike','mackerel','bass','ember','golden'];
/* the fly box: real patterns, each fished its own way */
var FLIES={
  caddis:    {n:'Elk Hair Caddis',     style:'dry',      hatch:'caddis', col:'#c9a46a', wing:'#e8dcc0', d:'Floats high and bushy. For trout rising to caddis.'},
  adams:     {n:'Parachute Adams',     style:'dry',      hatch:'mayfly', col:'#8f8f99', wing:'#f4f4f4', d:'The classic mayfly dry. Floats with a white post you can see.'},
  hopper:    {n:'Foam Hopper',         style:'dry',      hatch:'hoppers',col:'#a6c24a', wing:'#d8c070', d:'A big grasshopper. Plop it near the bank on a breezy day.'},
  pheasant:  {n:'Pheasant Tail Nymph', style:'nymph',    col:'#8a5a32', wing:'#c08040', d:'Sinks under an indicator. Fish eat nymphs nearly all the time.'},
  chironomid:{n:'Chironomid',          style:'nymph',    col:'#2e2e2e', wing:'#c03030', d:'A tiny midge pupa hung deep under an indicator. Still water loves it.'},
  bugger:    {n:'Woolly Bugger',       style:'streamer', col:'#2e3a26', wing:'#6a8a3a', d:'Stripped back like a leech or a little fish. Finds the big ones.'},
  clouser:   {n:'Clouser Minnow',      style:'streamer', col:'#e8e0c0', wing:'#5a8a4a', d:'A darting baitfish with heavy eyes. Made for salt water.'},
  shrimp:    {n:'Shrimp Fly',          style:'streamer', col:'#e8a080', wing:'#f0c0a0', d:'Twitched slowly near the bottom. Sea bass can\'t resist it.'}
};
var FLY_ORDER=['caddis','adams','hopper','pheasant','chironomid','bugger','clouser','shrimp'];
/* how well each fly suits each water, 0 (nothing will look at it) to 3 */
var FLY_EFF={
  river:{caddis:2,adams:2,hopper:1,pheasant:3,chironomid:1,bugger:2,clouser:0,shrimp:0},
  lake: {caddis:1,adams:1,hopper:2,pheasant:2,chironomid:3,bugger:3,clouser:0,shrimp:0},
  sea:  {caddis:0,adams:0,hopper:0,pheasant:0,chironomid:0,bugger:1,clouser:3,shrimp:3},
  isle: {caddis:0,adams:0,hopper:0,pheasant:0,chironomid:0,bugger:1,clouser:2,shrimp:3}
};
var WATERNAME={river:'The river',lake:'A still lake',sea:'The sea',isle:'The Emberleaf shore'};
var WATERTIP={river:'Moving water: let your fly drift with the current, and mend before the line drags it.',
  lake:'Still water: fish cruise the edges, sipping midges and chasing leeches and little fish.',
  sea:'Salt water: the fish here hunt baitfish and shrimp. Strip your fly back, and strip-set when one hits: don\'t lift!',
  isle:'Salt water round the isle: shrimp and little fish in the weed. Strip it back, and strip-set: don\'t lift!'};
var HATCHES=['caddis','mayfly','none','hoppers'];
var HATCHSAY={caddis:'Caddis are hatching: little moth-like flies skitter on the water.',mayfly:'Mayflies are hatching: they ride the water like tiny sailboats.',
  hoppers:'A breeze is blowing grasshoppers onto the water.',none:'Nothing is hatching. The fish are feeding down deep.'};
function fishTotal(){ var n=0, f=WILD.fish||{}; for(var k in f) n+=f[k]|0; return n; }
function fishValue(){ var v=0, f=WILD.fish||{}; for(var k in f) if(FISH[k]) v+=(f[k]|0)*FISH[k].sell; return Math.round(v*FD().pay); }
function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
/* what's on the water now: it changes every couple of minutes, and the lakes run behind the river */
function hatchFor(where){
  if(where!=='river'&&where!=='lake') return 'none';
  var i=Math.floor(((HOME.playT||0)+(where==='lake'?75:0))/150);
  return HATCHES[((i%4)+4)%4];
}
function flyEff(fly,where,hatch){
  var b=(FLY_EFF[where]||FLY_EFF.river)[fly]|0, F=FLIES[fly];
  if(F.style==='dry'&&(where==='river'||where==='lake')){
    if(hatch===undefined) hatch=hatchFor(where);
    if(hatch===F.hatch) return 3;
    if(hatch==='none') return Math.max(0,b-1);
  }
  return b;
}
function flyKnown(fly,where){ return !!(WILD.flyKnow&&WILD.flyKnow[where+':'+fly]>=2); }
function flyLearn(fly,where,took){ if(!WILD.flyKnow) WILD.flyKnow={}; var k=where+':'+fly; WILD.flyKnow[k]=Math.max(took?2:0,(WILD.flyKnow[k]|0)+1); }

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
/* the river is the long winding channel from world.js; any other fresh water is a lake or pond */
function onRiver(x,z){ var xs=x/WS, zs=z/WS; return Math.abs(zs-58+Math.sin(xs*0.035)*16)<17; }
function fishWhere(x,z){
  if(typeof inIsle==='function'&&inIsle(x,z)) return 'isle';
  if(coastK(x,z)>0.3&&shoreD(x,z)>SHORE.beach) return 'sea';
  return onRiver(x,z)?'river':'lake';
}
function pickFish(where,fly){
  var st=FLIES[fly].style, tot=0, k, w={};
  for(k in FISH){ var L=FISH[k].like||{}; w[k]=(FISH[k].w[where]||0)*(L[fly]||L[st]||1); tot+=w[k]; }
  var r=Math.random()*tot;
  for(k in w){ r-=w[k]; if(r<=0&&w[k]>0) return k; }
  return where==='sea'?'mackerel':(where==='isle'?'ember':(where==='lake'?'perch':'trout'));
}

/* ---------- what you can walk up to: the water's edge (and the kitty, in farm.js) ---------- */
function farmTalk(p,list){
  if(G.t-FISHT>0.25||G.t<FISHT){ FISHT=G.t; FISHSPOT=fishSpot(p); }
  if(FISHSPOT) list.push({x:FISHSPOT.x,y:WATER,z:FISHSPOT.z,lift:1.2,label:'fly fish',tap:'FISH',open:function(){ fishScreen(); }});
  kittyTalk(p,list);
}

/* ================= the fishing screen ================= */
var FISHING=null;
var CAST_DUR=0.7;                 // how long the line takes to straighten behind you
function fishScreen(){
  if(G.state==='play'){ menuOpen('talk'); sfx('click'); }
  else if(G.state!=='talk') return;
  var p=G.player, s=FISHSPOT||{x:p.x+Math.sin(p.yaw)*3,z:p.z+Math.cos(p.yaw)*3};
  if(!WILD.fly||!FLIES[WILD.fly]) WILD.fly='pheasant';
  var where=fishWhere(s.x,s.z);
  FISHING={stage:'ready',where:where,hatch:hatchFor(where),spot:s,t:0,tok:((FISHING&&FISHING.tok)||0)+1,
    lvl:0,cp:'idle',ct:0,fx:0.5,fy:0.6,drag:0,tt:0,ripples:[],drops:[],shadow:null,hold:false,target:null,bugs:[]};
  var F=FISHING; newTarget(F);
  show('<h1>Fly fishing</h1><p class="sub">'+WATERNAME[F.where]+' · <span id="fcreel">'+creelText()+'</span> · '+DF().n+'</p>'+
    '<p class="hint" style="margin:2px 0 6px">'+WATERTIP[F.where]+(F.where==='river'||F.where==='lake'?' <b style="color:#e8c26a">'+HATCHSAY[F.hatch]+'</b>':'')+'</p>'+
    '<div class="flybox" id="flybox"></div>'+
    '<canvas id="fcv" class="scene" width="480" height="240"></canvas>'+
    '<p class="say" id="fsay"></p>'+
    '<div class="fbtns"><button class="btn" id="fbtn"></button><button class="btn alt" id="fbtn2" style="display:none"></button></div>'+
    '<button class="btn alt" id="fleave">Back to the wood</button>'+
    (DESKTOP?'<p class="hint">Space or E works the rod · Enter or F for the second button</p>':''));
  var b=document.getElementById('fbtn'), b2=document.getElementById('fbtn2');
  b.addEventListener('pointerdown',function(ev){ ev.preventDefault(); fishPress(); });
  ['pointerup','pointerleave','pointercancel'].forEach(function(t){ b.addEventListener(t,function(){ fishRelease(); }); });
  b2.addEventListener('pointerdown',function(ev){ ev.preventDefault(); fishPress2(); });
  document.getElementById('fleave').onclick=function(){ FISHING=null; menuClose(); };
  fishUI(F,'Pick a fly from your box, then cast. Back… wait for the line to straighten… forward!');
  fishLoop(F.tok);
}
function creelText(){ var n=fishTotal(); return n?'creel: '+n+' fish':'creel: empty'; }
function newTarget(F){
  // where a fish is: a rise on the surface, a deep run, a cruising shadow. Nearer or further out.
  var lvl=1+((Math.random()*3)|0);
  F.target={lvl:lvl,x:0.42+Math.random()*0.3,y:lvlY(lvl)};
}
function lvlY(l){ return [0.86,0.74,0.56,0.38][l]; }
function flyBoxHtml(F){
  var lock=!(F.stage==='ready'||F.stage==='landed'||F.stage==='lost'||F.stage==='empty');
  return FLY_ORDER.map(function(k){ var L=FLIES[k], e=flyEff(k,F.where,F.hatch), kn=flyKnown(k,F.where);
    return '<button class="fly'+(WILD.fly===k?' on':'')+(lock?' locked':'')+'" data-fly="'+k+'"'+(lock&&WILD.fly!==k?' disabled':'')+'>'+
      '<span class="fi" style="background:'+L.col+';box-shadow:inset -5px -3px 0 '+L.wing+'"></span>'+
      '<b>'+L.n+'</b><small>'+L.style+'</small><em>'+(kn?'★★★'.slice(0,e)+'☆☆☆'.slice(0,3-e):'? ? ?')+'</em></button>'; }).join('');
}
/* the words and buttons for wherever we are */
function fishUI(F,say){
  var box=document.getElementById('flybox'); if(!box) return;
  box.innerHTML=flyBoxHtml(F);
  var fl=box.querySelectorAll('[data-fly]');
  for(var i=0;i<fl.length;i++) fl[i].onclick=function(){ var k=this.getAttribute('data-fly'); var G0=FISHING; if(!G0||this.disabled) return;
    WILD.fly=k; sfx('click'); fishUI(G0,'<b>'+FLIES[k].n+'</b>: '+FLIES[k].d); };
  if(say!==undefined){ var s=document.getElementById('fsay'); if(s) s.innerHTML=say; }
  var b=document.getElementById('fbtn'), b2=document.getElementById('fbtn2'), st=FLIES[WILD.fly].style, lab='', gold=false, lab2='';
  switch(F.stage){
    case 'ready': case 'landed': case 'lost': case 'empty': lab='Back cast'; break;
    case 'casting': lab=F.cp==='back'?'Forward!':'Back cast'; gold=F.cp==='back'&&F.ct>=CAST_DUR*FD().early; if(F.cp==='hang'||F.cp==='fwd') lab2='Lay it down'; break;
    case 'drift': lab='Pick up and recast'; if(F.where==='river') lab2='Mend the line'; break;
    case 'strip': lab='Strip!'; break;
    case 'take': lab=st==='streamer'?'STRIP-SET!':'SET THE HOOK!'; gold=true; break;
    case 'fight': lab=F.hold?'Stripping in… (let go when it runs!)':'HOLD to strip in'; gold=F.hold; break;
  }
  if(b){ b.textContent=lab; b.className='btn'+(gold?' strike':''); }
  if(b2){ b2.style.display=lab2?'':'none'; b2.textContent=lab2; }
}
function fishSay(t){ var e=document.getElementById('fsay'); if(e) e.innerHTML=t; }

/* ---------- the main button: whatever the moment needs ---------- */
function fishPress(){
  var F=FISHING; if(!F) return;
  var st=FLIES[WILD.fly].style;
  if(F.stage==='ready'||F.stage==='landed'||F.stage==='lost'||F.stage==='empty'||F.stage==='drift'){
    if(F.stage!=='drift'){ F.lvl=0; if(F.stage!=='ready') newTarget(F); }
    else { F.lvl=0; ripple(F,F.fx,F.fy,0.4); }                       // pick the line up off the water
    F.stage='casting'; F.cp='back'; F.ct=0; F.shadow=null; F.catchK=null; sfx('cast');
    fishUI(F,'Back cast… let the line straighten out behind you…');
  } else if(F.stage==='casting'){
    if(F.cp==='back'){
      if(F.ct<CAST_DUR*FD().early){ F.lvl=Math.max(1,F.lvl); fishUI(F,'<b>Crack!</b> Too soon: the line snapped like a whip. Wait until it\'s straight behind you.'); }
      else { F.lvl=Math.min(3,F.lvl+1); fishUI(F,F.lvl>=F.target.lvl?'Good loop! The line is out far enough: <b>lay it down</b>, or false cast again.':'Good loop! Each false cast carries it further. Back again!'); }
      F.cp='fwd'; F.ct=0; sfx('cast');
    } else if(F.cp==='hang'||F.cp==='fwd'){ F.cp='back'; F.ct=0; sfx('cast'); fishUI(F,'Back cast… wait for it…'); }
  } else if(F.stage==='strip'){
    F.strips++; sfx('reel');
    F.fy=Math.min(0.9,F.fy+0.07); F.fx+=(0.35-F.fx)*0.18; ripple(F,F.fx,F.fy,0.25);
    if(F.took&&F.strips>=F.takeStrip){ fishTake(F); return; }
    if(F.fy>=0.88){ flyLearn(WILD.fly,F.where,false); F.stage='empty'; fishUI(F,fishEmptySay(F)); }
  } else if(F.stage==='take'){
    hookFish(F);
  } else if(F.stage==='fight'){ F.hold=true; fishUI(F); }
}
function fishRelease(){ var F=FISHING; if(F&&F.stage==='fight'&&F.hold){ F.hold=false; fishUI(F); } }
function fishPress2(){
  var F=FISHING; if(!F) return;
  if(F.stage==='casting'&&(F.cp==='hang'||F.cp==='fwd')) present(F);
  else if(F.stage==='drift'&&F.where==='river'){
    F.drag=0; F.mends=(F.mends||0)+1; sfx('cast'); ripple(F,(F.fx+0.19)/2,(F.fy+0.13)/2+0.1,0.3);
    fishUI(F,'You flick the line upstream. The fly drifts free again.');
  }
}
/* the line lands on the water */
function present(F){
  var fly=WILD.fly, st=FLIES[fly].style, eff=flyEff(fly,F.where,F.hatch), off=F.lvl-F.target.lvl;
  // a dry fly landing on top of the fish spooks it; short of it, it may not see it
  var acc=off===0?1:(off>0?(st==='dry'?0.25:0.7):(off===-1?0.5:0.2));
  var p=[0,0.4,0.68,0.9][eff]*acc;
  F.took=Math.random()<p; F.eff=eff; F.acc=acc;
  F.fy=lvlY(F.lvl); F.fx=st==='streamer'?F.target.x:(F.where==='river'?F.target.x-0.16:F.target.x); F.drag=0; F.tt=0; F.t=0; F.mends=0;
  F.cp='idle'; ripple(F,F.fx,F.fy,st==='dry'?0.4:0.8); sfx(st==='dry'?'click':'splash',undefined,undefined,0.4);
  var say=off>0&&st==='dry'?'Too far! The line slapped down right on the fish. ':(off<0?'A bit short of the fish. ':'Right on the spot! ');
  if(st==='streamer'){ F.stage='strip'; F.strips=0; F.takeStrip=2+((Math.random()*4)|0);
    fishUI(F,say+'Now <b>strip</b> it back in little pulls, like a fleeing fish.'); }
  else { F.stage='drift'; F.dur=F.where==='river'?7:10; F.takeAt=1+Math.random()*(F.dur-2.5);
    fishUI(F,say+(st==='dry'?'Watch your fly…':'The nymph sinks. Watch the indicator…')+(F.where==='river'?' The current will drag the line: mend it!':'')); }
}
function fishTake(F){
  var st=FLIES[WILD.fly].style;
  F.stage='take'; F.t=0; F.window=(st==='nymph'?0.95:(st==='streamer'?0.9:1.25))+FD().win;
  F.catchK=pickFish(F.where,WILD.fly);
  if(st==='dry'){ ripple(F,F.fx,F.fy,1.3); sfx('splash'); fishUI(F,'<b>A fish rises to your fly! Set the hook!</b>'); }
  else if(st==='nymph'){ ripple(F,F.fx,F.fy,0.5); fishUI(F,'<b>The indicator dips! Set the hook!</b>'); }
  else { ripple(F,F.fx,F.fy,1.0); sfx('splash'); fishUI(F,'<b>Thump! Strip-set!</b> Pull the line, don\'t lift the rod.'); }
}
function hookFish(F){
  var k=F.catchK, D=FISH[k];
  F.stage='fight'; F.t=0; F.dist=1; F.T=0.3; F.slack=0; F.run=0; F.runIn=0.6+Math.random()*1.2; F.hold=false;
  F.cm=Math.round(D.cm[0]+Math.pow(Math.random(),1.6)*(D.cm[1]-D.cm[0]));
  F.size=(F.cm-D.cm[0])/(D.cm[1]-D.cm[0]); F.P=D.pw*(0.8+F.size*0.4)*FD().run;
  flyLearn(WILD.fly,F.where,true); sfx('reel');
  fishUI(F,'Fish on! <b>Hold</b> to strip line in. When it runs, <b>let go</b>, or the tippet will snap.');
}
function fishEmptySay(F){
  var fly=WILD.fly, e=F.eff;
  if(e===0) return 'Nothing even looked at it. That fly isn\'t right for '+(F.where==='sea'||F.where==='isle'?'salt water':'here')+': try another from your box.';
  if(FLIES[fly].style==='dry'&&F.hatch!==FLIES[fly].hatch&&F.hatch!=='none') return 'A fish came up, looked, and turned away. They\'re eating something else: match the hatch!';
  if(F.acc<1) return 'No take. Put the fly right where the fish is: count your false casts.';
  return 'No take this time. Cast again!';
}
function fishLand(F){
  var k=F.catchK, D=FISH[k], p=G.player;
  F.stage='landed'; F.t=0;
  WILD.fish[k]=(WILD.fish[k]||0)+1; WILD.caught=(WILD.caught||0)+1;
  if(!WILD.fishBest) WILD.fishBest={}; var pb=F.cm>(WILD.fishBest[k]|0); if(pb) WILD.fishBest[k]=F.cm;
  sfx(D.tier>=4?'levelup':'pickup');
  var xp=Math.round((10+D.tier*8)*FD().pay); gainXp(xp,p.x,p.y+2.6,p.z,'+'+xp+' XP: a '+D.n.toLowerCase());
  logLine('Caught: a '+F.cm+' cm '+D.n.toLowerCase(),'#9fd8ff');
  fishUI(F,'You landed a <b style="color:'+D.col+'">'+F.cm+' cm '+D.n.toLowerCase()+'</b>'+(pb&&WILD.caught>1?', your biggest yet!':'!')+
    (D.tier>=4?' A rare one: it shines like a coin.':'')+(HOME.kitty?' '+esc(HOME.kitty.name)+' would love this.':' Bram buys fish for '+D.sell+' ◉.'));
  var c=document.getElementById('fcreel'); if(c) c.textContent=creelText();
  setTimeout(saveGame,40);
}
function fishLost(F,why){ F.stage='lost'; F.t=0; F.hold=false; sfx('splash'); fishUI(F,why); }
function ripple(F,x,y,s){ F.ripples.push({x:x,y:y,r:0,s:s||1}); for(var i=0;i<Math.round(8*(s||1));i++) F.drops.push({x:x,y:y,vx:(Math.random()-0.5)*0.5,vy:-0.4-Math.random()*0.5,t:0}); }

/* ---------- time passing ---------- */
function fishTick(F,dt){
  F.t+=dt; var st=FLIES[WILD.fly].style, FX0=FD();
  if(F.stage==='casting'){
    F.ct+=dt;
    if(F.cp==='back'){
      if(F.ct>=CAST_DUR*FX0.early&&!F.cue){ F.cue=1; fishUI(F); }
      if(F.ct>CAST_DUR*FX0.late){ F.cp='idle'; F.cue=0; F.stage='ready'; F.lvl=0; sfx('thunk');
        fishUI(F,'Too late! The line fell on the grass behind you. Come forward as soon as it\'s straight.'); }
    } else { F.cue=0; }
    if(F.cp==='fwd'&&F.ct>0.45){ F.cp='hang'; F.ct=0; fishUI(F); }
    else if(F.cp==='hang'&&F.ct>1.6) present(F);                     // it drops onto the water by itself
  } else if(F.stage==='drift'){
    if(F.where==='river'){ F.fx+=0.045*dt; F.drag+=(st==='dry'?0.24:0.19)*dt; }
    else F.fx+=Math.sin(F.t*0.7)*0.004*dt;
    if(F.drag>=1&&!F.dragSaid){ F.dragSaid=1; fishSay('<b>Drag!</b> The line is pulling the fly across the current. Fish won\'t touch it: <b>mend</b>!'); }
    if(F.drag<1){ F.dragSaid=0; F.tt+=dt; if(F.took&&F.tt>=F.takeAt){ fishTake(F); return; } }
    if(Math.random()<dt*0.5) ripple(F,F.fx,F.fy,0.12);
    if(F.t>F.dur){ flyLearn(WILD.fly,F.where,false); F.stage='empty'; fishUI(F,F.drag>=1?'The drift dragged the whole way. Mend your line so the fly floats free.':fishEmptySay(F)); }
  } else if(F.stage==='take'){
    if(F.t>F.window){ F.stage='empty'; fishUI(F,st==='streamer'?'It let go. Strip-set as soon as you feel the thump!':'Missed it! It spat the fly. Set the hook the moment you see the take.'); }
  } else if(F.stage==='fight'){
    // the fish runs now and then; strip in between runs
    if(F.run>0){ F.run-=dt; if(F.run<=0){ F.runIn=1.6+Math.random()*2.4; fishUI(F); } }
    else { F.runIn-=dt; if(F.runIn<=0){ F.run=0.7+Math.random()*0.9*(0.6+F.size); sfx('reel'); ripple(F,F.fx,F.fy,0.9); } }
    var run=F.run>0?1:0, want=F.hold?0.55+run*F.P*0.6:0;
    F.T+=(want-F.T)*Math.min(1,dt*2.4);
    F.dist+=(F.hold?(run?-0.01:-0.15/(0.7+F.size*0.6)):(run?0.11*F.P:0))*dt;
    if(!F.hold&&F.T<0.1) F.slack+=dt; else F.slack=Math.max(0,F.slack-dt*2);
    F.fx=0.3+F.dist*0.3+Math.sin(F.t*5)*0.02*(1+run); F.fy=0.88-F.dist*0.4;
    if(F.T>FX0.snap){ fishLost(F,'<b>Snap!</b> Too much pressure while it was running. Let go when the fish pulls!'); return; }
    if(F.slack>FX0.slack){ fishLost(F,'The line went slack and it shook the hook. Keep a little tension on it.'); return; }
    if(F.dist>1.45){ fishLost(F,'It ran and ran, and took the fly with it. Strip in between its runs.'); return; }
    if(F.dist<=0){ fishLand(F); return; }
  }
  // a few bugs over the water when something is hatching
  if((F.where==='river'||F.where==='lake')&&F.hatch!=='none'){ if(F.bugs.length<7&&Math.random()<dt*3) F.bugs.push({x:Math.random(),y:0.3+Math.random()*0.5,t:0,s:Math.random()*9});
    for(var bi=F.bugs.length-1;bi>=0;bi--){ var bg=F.bugs[bi]; bg.t+=dt; bg.x+=Math.sin(bg.t*3+bg.s)*0.05*dt+(F.where==='river'?0.03*dt:0); if(bg.t>4) F.bugs.splice(bi,1); } }
  // fish rising at the target before you cast, so you know where to put the fly
  if((F.stage==='ready'||F.stage==='casting'||F.stage==='empty')&&Math.random()<dt*0.7) ripple(F,F.target.x+(Math.random()-0.5)*0.03,F.target.y,0.35);
  for(var i=F.ripples.length-1;i>=0;i--){ var R=F.ripples[i]; R.r+=dt*0.12*R.s+dt*0.05; if(R.r>0.16*R.s+0.05) F.ripples.splice(i,1); }
  for(var j=F.drops.length-1;j>=0;j--){ var d=F.drops[j]; d.t+=dt; d.x+=d.vx*dt; d.y+=d.vy*dt; d.vy+=1.6*dt; if(d.t>0.6) F.drops.splice(j,1); }
}
function fishLoop(tok){
  var last=performance.now();
  function step(now){
    var F=FISHING, cv=document.getElementById('fcv');
    if(!F||F.tok!==tok||!cv||G.state!=='talk') return;
    var dt=Math.min(0.05,(now-last)/1000); last=now;
    fishTick(F,dt); if(FISHING===F) fishDraw(cv,F);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- the little scene ---------- */
function fishDraw(cv,F){
  var c=cv.getContext('2d'), W=cv.width, Hh=cv.height, wtop=Hh*0.2, t=performance.now()/1000;
  var isle=F.where==='isle', sea=F.where==='sea', lake=F.where==='lake', fly=FLIES[WILD.fly];
  function X(u){ return u*W; } function Y(v){ return v*Hh; }
  c.fillStyle=isle?'#6b4a22':(sea?'#8fb0b8':'#2f4a26'); c.fillRect(0,0,W,wtop);
  if(!sea){ c.fillStyle=isle?'#a2501c':(lake?'#28452a':'#203a1c');
    for(var i=0;i<14;i++){ var x=i*W/13, h=18+((i*37)%23); c.beginPath(); c.moveTo(x-22,wtop); c.lineTo(x,wtop-h-10); c.lineTo(x+22,wtop); c.fill(); } }
  var g=c.createLinearGradient(0,wtop,0,Hh);
  g.addColorStop(0,isle?'#7a6a52':(sea?'#3d7f95':(lake?'#4a7a7a':'#3a6a74'))); g.addColorStop(1,isle?'#2e3a40':(sea?'#173c52':(lake?'#1c3a3a':'#1a3540')));
  c.fillStyle=g; c.fillRect(0,wtop,W,Hh-wtop);
  c.strokeStyle='rgba(255,255,255,.08)'; c.lineWidth=2;
  for(var k=0;k<7;k++){ var yy=wtop+20+k*28, ox;
    if(F.where==='river') ox=((t*30+k*90)%(W+120))-60; else ox=(k*97)%W+Math.sin(t*0.6+k)*12;
    c.beginPath(); c.moveTo(ox,yy+(sea||isle?Math.sin(t*1.5+k)*3:0)); c.lineTo(ox+50,yy+(sea||isle?Math.sin(t*1.5+k+1)*3:0)); c.stroke(); }
  if(F.where==='river'){ c.fillStyle='rgba(255,255,255,.35)'; c.font='12px Georgia,serif'; c.textAlign='left'; c.fillText('current →',8,wtop+16); }
  // hatching bugs
  c.fillStyle='rgba(240,230,200,.8)'; F.bugs.forEach(function(b){ var bx=X(b.x), by=Y(b.y)-Math.abs(Math.sin(b.t*6+b.s))*8; c.fillRect(bx-1.5,by-1,3,2); c.fillRect(bx-3,by-2+Math.sin(b.t*30)*1.5,2,1); c.fillRect(bx+1,by-2-Math.sin(b.t*30)*1.5,2,1); });
  // fish shadows: the one you're after, and the one on your line
  if(F.target&&(F.stage==='ready'||F.stage==='casting'||F.stage==='empty'||F.stage==='lost'||F.stage==='landed')&&F.stage!=='landed'){
    c.save(); c.globalAlpha=0.28; c.fillStyle='#0b1a1e'; c.beginPath(); c.ellipse(X(F.target.x),Y(F.target.y)+6,22,7,Math.sin(t)*0.15,0,6.283); c.fill(); c.restore();
    c.strokeStyle='rgba(255,215,106,.55)'; c.setLineDash([4,4]); c.lineWidth=1; c.beginPath(); c.moveTo(X(0.04),Y(F.target.y)); c.lineTo(X(0.96),Y(F.target.y)); c.stroke(); c.setLineDash([]);
    c.fillStyle='rgba(255,215,106,.8)'; c.font='12px Georgia,serif'; c.textAlign='right'; c.fillText('fish here',X(0.97),Y(F.target.y)-4);
  }
  if(F.stage==='strip'&&F.took&&F.strips>=1){ c.save(); c.globalAlpha=0.4; c.fillStyle='#0b1a1e'; c.beginPath(); c.ellipse(X(F.fx)+Math.sin(t*4)*4,Y(F.fy)-14,24,8,0.2,0,6.283); c.fill(); c.restore(); }
  if(F.stage==='take'||F.stage==='fight'){ c.save(); c.globalAlpha=0.5; c.fillStyle='#0b1a1e'; c.beginPath(); c.ellipse(X(F.fx),Y(F.fy)+4,30*(0.8+(F.size||0.5)*0.6),10,Math.sin(t*7)*0.3,0,6.283); c.fill(); c.restore(); }
  // ripples and splash
  c.strokeStyle='rgba(230,245,255,.55)'; c.lineWidth=1.5;
  F.ripples.forEach(function(R){ c.globalAlpha=Math.max(0,1-R.r/(0.16*R.s+0.05)); c.beginPath(); c.ellipse(X(R.x),Y(R.y),R.r*W,R.r*W*0.35,0,0,6.283); c.stroke(); });
  c.globalAlpha=1; c.fillStyle='#e8f6ff'; F.drops.forEach(function(d){ c.fillRect(X(d.x)-1.5,Y(d.y)-1.5,3,3); });
  // the rod: tipped back on the back cast, forward on the forward cast
  var back=F.stage==='casting'&&F.cp==='back', tipX=X(back?0.07:0.21), tipY=Y(back?0.02:0.14);
  if(F.stage==='fight'){ tipX=X(0.17)+Math.sin(t*14)*2*(F.run>0?2:1); tipY=Y(0.1)+F.T*22; }
  var butX=X(0.03), butY=Hh+6;
  c.strokeStyle='#5a3a1c'; c.lineWidth=5; c.beginPath(); c.moveTo(butX,butY); c.lineTo(tipX,tipY); c.stroke();
  c.strokeStyle='#c9a46a'; c.lineWidth=7; c.beginPath(); c.moveTo(butX,butY); c.lineTo(butX+(tipX-butX)*0.12,butY+(tipY-butY)*0.12); c.stroke();   // the cork grip
  c.strokeStyle='rgba(250,240,190,.9)'; c.lineWidth=1.6;
  if(F.stage==='casting'){
    // the line in the air: a loop unrolling behind you, then out over the water
    var reach=0.25+F.lvl*0.2;
    if(F.cp==='back'){ var u=Math.min(1,F.ct/CAST_DUR), ex=X(0.2)-u*X(reach)*0.9, ey=Y(0.07)-u*4;
      c.beginPath(); c.moveTo(tipX,tipY); c.quadraticCurveTo((tipX+ex)/2,tipY-10+(1-u)*30,ex,ey+(1-u)*26); c.stroke();
      if(u<1){ c.beginPath(); c.ellipse(ex,ey+(1-u)*13,4+(1-u)*8,(1-u)*13,0,0,6.283); c.stroke(); }
      // the timing bar: come forward in the green
      var bx=X(0.3), bw=X(0.4), by=6; c.fillStyle='rgba(10,8,4,.7)'; c.fillRect(bx-3,by-3,bw+6,14);
      c.fillStyle='#7a2c22'; c.fillRect(bx,by,bw,8); var FDd=FD(); c.fillStyle='#62c24c'; c.fillRect(bx+bw*FDd.early/FDd.late,by,bw*(1-FDd.early/FDd.late),8);
      c.fillStyle='#fff6d8'; c.fillRect(bx+bw*Math.min(1,F.ct/CAST_DUR/FDd.late)-2,by-3,4,14);
      c.fillStyle='#fff3c4'; c.font='600 12px Georgia,serif'; c.textAlign='center'; c.fillText(F.ct>=CAST_DUR*FDd.early?'NOW!':'wait…',bx+bw/2,by+24);
    } else { var v=F.cp==='fwd'?Math.min(1,F.ct/0.45):1, fx2=X(0.21)+v*X(reach)*1.4, fy2=Y(0.14)+v*Y(lvlY(F.lvl)-0.34)*0.6;
      c.beginPath(); c.moveTo(tipX,tipY); c.quadraticCurveTo((tipX+fx2)/2,tipY-14,fx2,fy2); c.stroke();
      if(F.cp==='hang'){ c.fillStyle='rgba(255,215,106,.9)'; c.font='12px Georgia,serif'; c.textAlign='left'; c.fillText(['','near','middle','far'][F.lvl],fx2+6,fy2); } }
  } else if(F.stage!=='ready'&&F.stage!=='landed'){
    var flx=X(F.fx), fly2=Y(F.fy), sag=F.stage==='fight'||F.stage==='take'?3:(F.where==='river'?14+F.drag*36:22);
    c.beginPath(); c.moveTo(tipX,tipY); c.quadraticCurveTo((tipX+flx)/2+(F.where==='river'&&F.stage==='drift'?F.drag*60:0),(tipY+fly2)/2+sag,flx,fly2); c.stroke();
    if(F.stage==='drift'||F.stage==='strip'){
      var st=fly.style;
      if(st==='dry'){ var skate=F.drag>=1?Math.sin(t*20)*2:0; c.fillStyle=fly.col; c.beginPath(); c.arc(flx+skate,fly2,4,0,6.283); c.fill(); c.fillStyle=fly.wing; c.fillRect(flx+skate-1.5,fly2-9,3,6);
        if(F.drag>=1){ c.strokeStyle='rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(flx-14,fly2+3); c.lineTo(flx,fly2+2); c.stroke(); } }
      else if(st==='nymph'){ var dip=F.stage==='drift'?0:0; c.fillStyle='#ff8a2a'; c.beginPath(); c.arc(flx,fly2+dip+Math.sin(t*2.5)*1.2,5,0,6.283); c.fill();
        c.strokeStyle='rgba(250,240,190,.35)'; c.beginPath(); c.moveTo(flx,fly2+4); c.lineTo(flx-6,fly2+28); c.stroke(); c.fillStyle=fly.col; c.fillRect(flx-8,fly2+27,4,4); }
      else { c.fillStyle=fly.col; c.save(); c.globalAlpha=0.85; c.beginPath(); c.ellipse(flx,fly2+5,8,3,-0.3,0,6.283); c.fill(); c.fillStyle=fly.wing; c.fillRect(flx+4,fly2+3,7,3); c.restore(); }
    }
    if(F.stage==='take'){ c.fillStyle='#fff3c4'; c.font='700 30px Georgia,serif'; c.textAlign='center'; c.fillText('!',flx,fly2-18);
      if(fly.style==='nymph'){ c.fillStyle='#ff8a2a'; c.beginPath(); c.arc(flx,fly2+6,4,0,6.283); c.fill(); } }
  }
  // drag meter while drifting on the river
  if(F.stage==='drift'&&F.where==='river'){ var dx=X(0.04), dy=Hh-22, dw=X(0.28);
    c.fillStyle='rgba(10,8,4,.7)'; c.fillRect(dx-3,dy-3,dw+6,14); c.fillStyle=F.drag>=1?'#d6584a':(F.drag>0.7?'#e0a040':'#62c24c'); c.fillRect(dx,dy,dw*Math.min(1,F.drag),8);
    c.fillStyle='#fff3c4'; c.font='12px Georgia,serif'; c.textAlign='left'; c.fillText(F.drag>=1?'DRAG! mend':'drag',dx+dw+8,dy+8); }
  // the fight: line tension and how much line is out
  if(F.stage==='fight'){
    var bx2=X(0.1), bw2=X(0.8), by2=Hh-34;
    c.fillStyle='rgba(10,8,4,.75)'; c.fillRect(bx2-4,by2-18,bw2+8,40);
    c.fillStyle='#2a3a2a'; c.fillRect(bx2,by2,bw2,10);
    var snp=Math.min(1,FD().snap); c.fillStyle='#62c24c'; c.fillRect(bx2+bw2*0.2,by2,bw2*(snp-0.35),10); c.fillStyle='#d6584a'; c.fillRect(bx2+bw2*(snp-0.15),by2,bw2*(1.0-snp+0.15),10);
    c.fillStyle='#fff6d8'; c.fillRect(bx2+bw2*Math.min(1,F.T)-2.5,by2-4,5,18);
    c.fillStyle='#fff3c4'; c.font='600 12px Georgia,serif'; c.textAlign='left'; c.fillText('line tension',bx2,by2-6);
    c.textAlign='right'; c.fillText(F.run>0?'IT\'S RUNNING!':'line out: '+Math.round(Math.max(0,F.dist)*25)+' m',bx2+bw2,by2-6);
  }
  // the catch, held up
  if(F.stage==='landed'&&F.catchK){
    var D=FISH[F.catchK], cx=W*0.6, cy=Hh*0.5+Math.sin(F.t*6)*4*Math.max(0,1-F.t), wig=Math.sin(F.t*10)*0.12*Math.max(0,1-F.t*0.5), sc=0.8+(F.size||0.5)*0.4;
    c.save(); c.translate(cx,cy); c.rotate(wig); c.scale(sc,sc);
    c.fillStyle=D.col; c.beginPath(); c.ellipse(0,0,58,20,0,0,6.283); c.fill();
    c.beginPath(); c.moveTo(48,0); c.lineTo(84,-20); c.lineTo(78,0); c.lineTo(84,20); c.fill();
    c.fillStyle=D.spot; for(var sp=0;sp<7;sp++){ c.beginPath(); c.arc(-20+sp*9,-6+((sp*7)%11)-3,2.6,0,6.283); c.fill(); }
    c.fillStyle='rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-6,8,40,6,0,0,6.283); c.fill();
    c.fillStyle='#111'; c.beginPath(); c.arc(-40,-4,3.4,0,6.283); c.fill();
    c.restore();
    if(D.tier>=4){ c.fillStyle='rgba(255,230,140,'+(0.5+0.5*Math.sin(t*6))+')'; for(var s2=0;s2<5;s2++){ var a=t*1.5+s2*1.25; c.fillRect(cx+Math.cos(a)*90-2,cy+Math.sin(a)*40-2,4,4); } }
    c.fillStyle='#fff3c4'; c.font='600 17px Georgia,serif'; c.textAlign='center'; c.fillText(F.cm+' cm '+D.n.toLowerCase(),cx,Hh-18);
  }
}
/* keys: Space or E is the rod hand, Enter or F the second button; hold Space to strip in */
addEventListener('keydown',function(e){
  if(!FISHING||G.state!=='talk'||!document.getElementById('fbtn')) return;
  if(e.target&&e.target.tagName==='INPUT') return;
  if(e.key===' '||e.key==='e'||e.key==='E'){ e.preventDefault(); if(!e.repeat) fishPress(); }
  else if(e.key==='Enter'||e.key==='f'||e.key==='F'){ e.preventDefault(); if(!e.repeat) fishPress2(); }
});
addEventListener('keyup',function(e){ if(FISHING&&(e.key===' '||e.key==='e'||e.key==='E')) fishRelease(); });
/* Bram buys the lot */
function sellFish(){ var v=fishValue(); if(!v) return 0; WILD.fish={}; G.player.coins+=v; return v; }
