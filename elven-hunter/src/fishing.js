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

/* ================= the fishing screen =================
   Full screen. The scene is drawn in its own little 3D space, seen from
   downstream and a little to the side, so you can watch the line go back over
   your shoulder and out over the water:
     x runs along the water (the river flows towards +x, away from you),
     y is up (the water is y=0, the bank you stand on a little higher),
     z runs out from the bank across the water (behind you is -z).
   The fly line is a chain of points (a verlet rope). While you cast it is
   steered towards the real shape of a fly cast: a rod leg, a fly leg and the
   loop that rolls out between them, so you see the line's S-curve and loop
   unroll behind you and then in front. Once it lands it is left to physics: it
   floats, the current bellies it downstream, and a mend flips it back. */
var FISHING=null;
var CAST_DUR=0.7;                 // how long the line takes to straighten behind you
var BANK=0.45, SHORE_Z=1.2, ROD_LEN=2.7, ROPE_N=44;
var LVLZ=[5,9.5,13.5,17.5];       // how far out the fly lands after 0-3 good false casts
var LLEN=[5,8.4,12.4,16.6];       // and how much line that takes
var FARBANK={river:27,lake:48,sea:4000,isle:4000};
function fishScreen(){
  if(G.state==='play'){ menuOpen('talk'); sfx('click'); }
  else if(G.state!=='talk') return;
  var p=G.player, s=FISHSPOT||{x:p.x+Math.sin(p.yaw)*3,z:p.z+Math.cos(p.yaw)*3};
  if(!WILD.fly||!FLIES[WILD.fly]) WILD.fly='pheasant';
  var where=fishWhere(s.x,s.z);
  FISHING={stage:'ready',where:where,hatch:hatchFor(where),spot:s,t:0,tok:((FISHING&&FISHING.tok)||0)+1,
    lvl:0,cp:'idle',ct:0,fx:2,fy:LVLZ[0],drag:0,tt:0,ripples:[],drops:[],hold:false,target:null,bugs:[],streaks:[],boxOpen:false};
  var F=FISHING; newTarget(F); ropeInit(F);
  var hint=F.where==='river'||F.where==='lake'?' <b>'+HATCHSAY[F.hatch]+'</b>':'';
  show('<canvas id="fcv" class="fullscene"></canvas>'+
    '<div class="fh">'+
      '<div class="fh-top"><div class="fh-title"><b>Fly fishing</b> · '+WATERNAME[F.where]+' · <span id="fcreel">'+creelText()+'</span> · '+DF().n+'</div>'+
        '<button class="fh-x" id="fleave">✕ <span>Back to the wood</span></button></div>'+
      '<div class="fh-tip">'+WATERTIP[F.where]+hint+'<span class="fh-turn"> · Turn your phone sideways for a wider view.</span></div>'+
      '<button class="fh-fly" id="flyopen"></button>'+
      '<div class="flybox fh-box" id="flybox"></div>'+
      '<div class="fh-bottom"><p class="fh-say" id="fsay"></p>'+
        '<div class="fh-btns"><button class="btn alt" id="fbtn2" style="display:none"></button><button class="btn" id="fbtn"></button></div>'+
        (DESKTOP?'<p class="fh-keys">Space or E: the rod hand (hold to strip in) · Enter or F: the other button · B: fly box</p>':'')+
      '</div>'+
    '</div>');
  ui.classList.add('full');
  var b=document.getElementById('fbtn'), b2=document.getElementById('fbtn2');
  b.addEventListener('pointerdown',function(ev){ ev.preventDefault(); fishPress(); });
  ['pointerup','pointerleave','pointercancel'].forEach(function(t){ b.addEventListener(t,function(){ fishRelease(); }); });
  b2.addEventListener('pointerdown',function(ev){ ev.preventDefault(); fishPress2(); });
  document.getElementById('flyopen').onclick=function(){ flyBoxToggle(); };
  document.getElementById('fleave').onclick=function(){ FISHING=null; menuClose(); };
  fishResize();
  fishUI(F,'Pick a fly from your box, then cast: <b>Back</b>… wait for the line to straighten out behind you… <b>Forward!</b>');
  fishLoop(F.tok);
}
function fishResize(){
  var cv=document.getElementById('fcv'); if(!cv) return;
  var dpr=Math.min(2,window.devicePixelRatio||1), w=Math.max(1,ui.clientWidth||innerWidth), h=Math.max(1,ui.clientHeight||innerHeight);
  cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); cv.style.width=w+'px'; cv.style.height=h+'px'; cv._dpr=dpr; cv._w=w; cv._h=h;
}
addEventListener('resize',function(){ if(FISHING) fishResize(); });
function creelText(){ var n=fishTotal(); return n?'creel: '+n+' fish':'creel: empty'; }
function newTarget(F){
  // where a fish is: a rise on the surface, a deep run, a cruising shadow; near, middle or far out
  var lvl=1+((Math.random()*3)|0);
  F.target={lvl:lvl,x:1+Math.random()*4,y:LVLZ[lvl]};          // (y is how far out: world z)
}
function lvlY(l){ return LVLZ[l]; }
function flyStars(k,F){ var e=flyEff(k,F.where,F.hatch); return flyKnown(k,F.where)?'★★★'.slice(0,e)+'☆☆☆'.slice(0,3-e):'? ? ?'; }
function flyLocked(F){ return !(F.stage==='ready'||F.stage==='landed'||F.stage==='lost'||F.stage==='empty'); }
function flyBoxHtml(F){
  var lock=flyLocked(F);
  return '<div class="fh-boxhead">Your fly box <small>stars: how well it suits this water (learned by fishing it)</small></div>'+FLY_ORDER.map(function(k){ var L=FLIES[k];
    return '<button class="fly'+(WILD.fly===k?' on':'')+'" data-fly="'+k+'"'+(lock&&WILD.fly!==k?' disabled':'')+'>'+
      '<span class="fi" style="background:'+L.col+';box-shadow:inset -5px -3px 0 '+L.wing+'"></span>'+
      '<b>'+L.n+'</b><small>'+L.style+'</small><em>'+flyStars(k,F)+'</em></button>'; }).join('');
}
function flyBoxToggle(open){
  var F=FISHING; if(!F) return;
  F.boxOpen=open===undefined?!F.boxOpen:open; if(flyLocked(F)) F.boxOpen=false;
  fishUI(F);
}
/* the words and buttons for wherever we are */
function fishUI(F,say){
  var box=document.getElementById('flybox'); if(!box) return;
  if(flyLocked(F)) F.boxOpen=false;
  box.innerHTML=flyBoxHtml(F); box.classList.toggle('open',!!F.boxOpen);
  var fl=box.querySelectorAll('[data-fly]');
  for(var i=0;i<fl.length;i++) fl[i].onclick=function(){ var k=this.getAttribute('data-fly'); var G0=FISHING; if(!G0||this.disabled) return;
    WILD.fly=k; G0.boxOpen=false; sfx('click'); fishUI(G0,'<b>'+FLIES[k].n+'</b> ('+FLIES[k].style+'): '+FLIES[k].d); };
  var L=FLIES[WILD.fly], fo=document.getElementById('flyopen');
  if(fo){ fo.innerHTML='<span class="fi" style="background:'+L.col+';box-shadow:inset -5px -3px 0 '+L.wing+'"></span><b>'+L.n+'</b> <em>'+flyStars(WILD.fly,F)+'</em> <small>'+(flyLocked(F)?'':(F.boxOpen?'▴ close':'▾ change fly'))+'</small>';
    fo.disabled=flyLocked(F); }
  if(say!==undefined){ var s=document.getElementById('fsay'); if(s) s.innerHTML=say; }
  var b=document.getElementById('fbtn'), b2=document.getElementById('fbtn2'), st=L.style, lab='', gold=false, lab2='';
  switch(F.stage){
    case 'ready': case 'landed': case 'lost': case 'empty': lab='Back cast'; break;
    case 'casting': lab=F.cp==='back'?'Forward!':'Back cast'; gold=F.cp==='back'&&F.ct>=CAST_DUR*FD().early; if(F.cp==='hang'||F.cp==='fwd') lab2='Lay it down'; break;
    case 'drift': lab='Pick up and recast'; if(F.where==='river') lab2='Mend the line'; break;
    case 'strip': lab='Strip!'; break;
    case 'take': lab=st==='streamer'?'STRIP-SET!':'SET THE HOOK!'; gold=true; break;
    case 'fight': lab=F.hold?'Stripping in… let go when it runs!':'HOLD to strip in'; gold=F.hold; break;
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
    if(F.stage!=='drift'){ if(F.stage!=='ready') newTarget(F); }
    else ripple(F,F.fx,F.fy,0.4);                                      // pick the line up off the water
    F.lvl=0; F.stage='casting'; F.cp='back'; F.ct=0; F.tail=0; F.catchK=null; F.boxOpen=false; sfx('cast');
    fishUI(F,'Back cast… let the line straighten out behind you…');
  } else if(F.stage==='casting'){
    if(F.cp==='back'){
      if(F.ct<CAST_DUR*FD().early){ F.lvl=Math.max(1,F.lvl); F.tail=1; ropeCrack(F); fishUI(F,'<b>Crack!</b> Too soon: the line snapped like a whip. Wait until it\'s straight behind you.'); }
      else { F.lvl=Math.min(3,F.lvl+1); F.tail=0; fishUI(F,F.lvl>=F.target.lvl?'Good loop! The line is out far enough: <b>lay it down</b>, or false cast again.':'Good loop! Each false cast carries it further. Back again!'); }
      F.cp='fwd'; F.ct=0; sfx('cast');
    } else if(F.cp==='hang'||F.cp==='fwd'){ F.cp='back'; F.ct=0; F.tail=0; sfx('cast'); fishUI(F,'Back cast… wait for it…'); }
  } else if(F.stage==='strip'){
    F.strips++; sfx('reel'); F.stripT=0.25;
    F.fy=Math.max(2.4,F.fy-1.1); F.fx+=(1-F.fx)*0.15; ripple(F,F.fx,F.fy,0.25);
    if(F.took&&F.strips>=F.takeStrip){ fishTake(F); return; }
    if(F.fy<=2.6){ flyLearn(WILD.fly,F.where,false); F.stage='empty'; fishUI(F,fishEmptySay(F)); }
  } else if(F.stage==='take'){
    hookFish(F);
  } else if(F.stage==='fight'){ F.hold=true; fishUI(F); }
}
function fishRelease(){ var F=FISHING; if(F&&F.stage==='fight'&&F.hold){ F.hold=false; fishUI(F); } }
function fishPress2(){
  var F=FISHING; if(!F) return;
  if(F.stage==='casting'&&(F.cp==='hang'||F.cp==='fwd')) present(F);
  else if(F.stage==='drift'&&F.where==='river'){
    F.drag=0; F.mends=(F.mends||0)+1; sfx('cast'); ropeMend(F); ripple(F,F.fx*0.5,F.fy*0.55,0.3);
    fishUI(F,'You flick the belly of the line upstream. The fly drifts free again.');
  }
}
/* the line lands on the water */
function present(F){
  var fly=WILD.fly, st=FLIES[fly].style, eff=flyEff(fly,F.where,F.hatch), off=F.lvl-F.target.lvl;
  // a dry fly landing on top of the fish spooks it; short of it, it may not see it
  var acc=off===0?1:(off>0?(st==='dry'?0.25:0.7):(off===-1?0.5:0.2));
  var p=[0,0.4,0.68,0.9][eff]*acc;
  F.took=Math.random()<p; F.eff=eff; F.acc=acc;
  F.fy=LVLZ[F.lvl]; F.fx=st==='streamer'?F.target.x:(F.where==='river'?F.target.x-3.5:F.target.x+(Math.random()-0.5)); F.drag=0; F.tt=0; F.t=0; F.mends=0;
  F.cp='idle'; ripple(F,F.fx,F.fy,st==='dry'?0.4:0.8); sfx(st==='dry'?'click':'splash',undefined,undefined,0.4);
  var say=off>0&&st==='dry'?'Too far! The line slapped down right on the fish. ':(off<0?'A bit short of the fish. ':'Right on the spot! ');
  if(st==='streamer'){ F.stage='strip'; F.strips=0; F.takeStrip=2+((Math.random()*4)|0);
    fishUI(F,say+'Now <b>strip</b> it back in little pulls, like a fleeing fish.'); }
  else { F.stage='drift'; F.dur=F.where==='river'?7:10; F.takeAt=1+Math.random()*(F.dur-2.5);
    fishUI(F,say+(st==='dry'?'Watch your fly…':'The nymph sinks. Watch the orange indicator…')+(F.where==='river'?' The current will belly the line and drag the fly: mend it!':'')); }
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
  F.hookX=F.fx; F.hookZ=Math.max(5,F.fy);
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
/* a ring on the water at world (x, z), and a few drops thrown up */
function ripple(F,x,z,s){ s=s||1; F.ripples.push({x:x,z:z,r:0.05,s:s,t:0});
  for(var i=0;i<Math.round(8*s);i++){ var a=Math.random()*6.283, v=0.6+Math.random()*1.4*s;
    F.drops.push({x:x,y:0.05,z:z,vx:Math.cos(a)*v*0.5,vy:1.2+Math.random()*2*s,vz:Math.sin(a)*v*0.5,t:0}); } }

/* ---------- time passing (the game's rules; the picture keeps itself in ropeTick) ---------- */
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
    if(F.where==='river'){ F.fx+=0.75*dt; F.drag+=(st==='dry'?0.24:0.19)*dt; }
    else F.fx+=Math.sin(F.t*0.7)*0.05*dt;
    if(F.drag>=1&&!F.dragSaid){ F.dragSaid=1; fishSay('<b>Drag!</b> The belly of the line is pulling the fly across the current. Fish won\'t touch it: <b>mend</b>!'); }
    if(F.drag<1){ F.dragSaid=0; F.tt+=dt; if(F.took&&F.tt>=F.takeAt){ fishTake(F); return; } }
    if(Math.random()<dt*0.5) ripple(F,F.fx,F.fy,0.12);
    if(F.t>F.dur){ flyLearn(WILD.fly,F.where,false); F.stage='empty'; fishUI(F,F.drag>=1?'The drift dragged the whole way. Mend your line so the fly floats free.':fishEmptySay(F)); }
  } else if(F.stage==='take'){
    if(F.t>F.window){ F.stage='empty'; fishUI(F,st==='streamer'?'It let go. Strip-set as soon as you feel the thump!':'Missed it! It spat the fly. Set the hook the moment you see the take.'); }
  } else if(F.stage==='fight'){
    // the fish runs now and then; strip in between runs
    if(F.run>0){ F.run-=dt; if(F.run<=0){ F.runIn=1.6+Math.random()*2.4; fishUI(F); } }
    else { F.runIn-=dt; if(F.runIn<=0){ F.run=0.7+Math.random()*0.9*(0.6+F.size); F.leap=Math.random()<0.6?0.75:0; sfx('reel'); ripple(F,F.fx,F.fy,0.9); } }
    var run=F.run>0?1:0, want=F.hold?0.55+run*F.P*0.6:0;
    F.T+=(want-F.T)*Math.min(1,dt*2.4);
    F.dist+=(F.hold?(run?-0.01:-0.15/(0.7+F.size*0.6)):(run?0.11*F.P:0))*dt;
    if(!F.hold&&F.T<0.1) F.slack+=dt; else F.slack=Math.max(0,F.slack-dt*2);
    F.fy=2.2+Math.max(0,F.dist)*(F.hookZ-2.2); F.fx=F.hookX+Math.sin(F.t*0.9)*1.3*(1+run);
    if(F.leap>0){ F.leap-=dt; if(F.leap<=0) ripple(F,F.fx,F.fy,1.1); }
    if(F.T>FX0.snap){ fishLost(F,'<b>Snap!</b> Too much pressure while it was running. Let go when the fish pulls!'); return; }
    if(F.slack>FX0.slack){ fishLost(F,'The line went slack and it shook the hook. Keep a little tension on it.'); return; }
    if(F.dist>1.45){ fishLost(F,'It ran and ran, and took the fly with it. Strip in between its runs.'); return; }
    if(F.dist<=0){ fishLand(F); return; }
  }
  // a few bugs over the water when something is hatching
  if((F.where==='river'||F.where==='lake')&&F.hatch!=='none'){ if(F.bugs.length<12&&Math.random()<dt*4) F.bugs.push({x:-2+Math.random()*10,y:0.2+Math.random()*1.2,z:3+Math.random()*16,t:0,s:Math.random()*9});
    for(var bi=F.bugs.length-1;bi>=0;bi--){ var bg=F.bugs[bi]; bg.t+=dt; bg.x+=Math.sin(bg.t*2+bg.s)*0.4*dt+(F.where==='river'?0.4*dt:0); bg.z+=Math.cos(bg.t*1.7+bg.s)*0.3*dt; if(bg.t>5) F.bugs.splice(bi,1); } }
  // fish rising at the target before you cast, so you know where to put the fly
  if((F.stage==='ready'||F.stage==='casting'||F.stage==='empty')&&Math.random()<dt*0.7) ripple(F,F.target.x+(Math.random()-0.5)*0.4,F.target.y+(Math.random()-0.5)*0.4,0.35);
  for(var i=F.ripples.length-1;i>=0;i--){ var R=F.ripples[i]; R.t+=dt; R.r+=dt*(0.5+0.6*R.s); if(R.t>1.4) F.ripples.splice(i,1); }
  for(var j=F.drops.length-1;j>=0;j--){ var d=F.drops[j]; d.t+=dt; d.x+=d.vx*dt; d.y+=d.vy*dt; d.z+=d.vz*dt; d.vy-=9.8*dt; if(d.y<0||d.t>1) F.drops.splice(j,1); }
}
function fishLoop(tok){
  var last=performance.now();
  function step(now){
    var F=FISHING, cv=document.getElementById('fcv');
    if(!F||F.tok!==tok||!cv||G.state!=='talk') return;
    var dt=Math.min(0.05,(now-last)/1000); last=now;
    fishTick(F,dt); if(FISHING===F){ ropeTick(F,dt); fishDraw(cv,F); }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ================= the rod and the line ================= */
function rodHand(F){ return {x:0.28,y:BANK+1.28,z:0.3}; }
function rodTip(F){ var h=rodHand(F), th=F.rod.th; return {x:h.x+(F.rod.side||0),y:h.y+Math.cos(th)*ROD_LEN,z:h.z+Math.sin(th)*ROD_LEN}; }
/* where the rod points: angle from straight up, forward (towards the water) positive */
function rodAim(F){
  switch(F.stage){
    case 'casting': return F.cp==='back'?-0.52:0.42;
    case 'drift': return 1.2;
    case 'strip': return 1.08-(F.stripT>0?0.15:0);
    case 'take': return 0.9;
    case 'fight': return 0.28;
    default: return 0.95;
  }
}
function ropeInit(F){
  F.rod={th:0.95,w:0,bend:0,side:0};
  var tip=rodTip(F), R={p:[],q:[],L:LLEN[0]};
  for(var i=0;i<ROPE_N;i++){ var s=i/(ROPE_N-1)*LLEN[0], pt=s<tip.y?{x:tip.x,y:tip.y-s,z:tip.z}:{x:tip.x+(s-tip.y)*0.15,y:0,z:tip.z+(s-tip.y)};   // down to the water, then out along it
    R.p.push(pt); R.q.push({x:pt.x,y:pt.y,z:pt.z}); }
  F.rope=R;
}
/* the textbook shape of a cast: from the rod tip a straight rod leg, then a loop of radius r,
   then the fly leg coming back the other way above it (below it, if the loop is tailing).
   u is how far the loop has unrolled: 0 just formed, 1 the line straight out. */
function castShape(tip,dir,L,u,r,sgn,s){
  var n={x:0,y:dir.z<0?-dir.z:dir.z,z:dir.z<0?dir.y:-dir.y}; if(n.y<0){ n.y=-n.y; n.z=-n.z; }
  var span=Math.max(0.01,L-Math.PI*r), a=u*span;
  if(s<=a) return {x:tip.x,y:tip.y+dir.y*s,z:tip.z+dir.z*s};
  if(s<=a+Math.PI*r){ var ph=(s-a)/r, cx=tip.y+dir.y*a+n.y*r*sgn, cz=tip.z+dir.z*a+n.z*r*sgn;
    return {x:tip.x,y:cy(cx)+dir.y*r*Math.sin(ph)-n.y*r*Math.cos(ph)*sgn,z:cz+dir.z*r*Math.sin(ph)-n.z*r*Math.cos(ph)*sgn}; }
  var b=s-a-Math.PI*r;
  return {x:tip.x,y:tip.y+dir.y*a+2*n.y*r*sgn-dir.y*b,z:tip.z+dir.z*a+2*n.z*r*sgn-dir.z*b};
  function cy(v){ return v; }
}
function ropeCrack(F){                                                  // a whip-crack: the line jerks and kinks
  var R=F.rope; for(var i=ROPE_N>>1;i<ROPE_N;i++){ R.q[i].y+=(Math.random()-0.3)*0.25; R.q[i].z+=(Math.random()-0.5)*0.3; }
  sfx('click');
}
function ropeMend(F){                                                   // flip the belly upstream and up
  var R=F.rope; for(var i=1;i<ROPE_N-1;i++){ var k=Math.sin(Math.PI*i/(ROPE_N-1)); R.q[i].x+=k*0.22; R.q[i].y-=k*0.14; }
  F.rod.side=-0.6;
}
/* the river's current: a fast seam a few metres out, slower water further across. That fast water between
   you and your fly is what bellies the line downstream and drags the fly, so you mend. */
function riverCur(F,z){ if(F.where!=='river') return 0; return 0.55+1.3*Math.exp(-Math.pow((z-7)/4,2)); }
function ropeTick(F,dt){
  if(!F.rope) ropeInit(F);
  var R=F.rope, P=R.p, Q=R.q, N=ROPE_N, rod=F.rod;
  // the rod: snaps to each stop when casting, eases otherwise; it bends against the way it swings
  var aim=rodAim(F), rate=F.stage==='casting'?18:5, th0=rod.th;
  rod.th+=(aim-rod.th)*Math.min(1,dt*rate);
  var w=(rod.th-th0)/Math.max(dt,1e-3); rod.bend+=(-w*0.05-rod.bend)*Math.min(1,dt*12);
  if(F.stage==='fight') rod.bend=-(0.15+F.T*0.55);
  else if(F.stage==='drift'||F.stage==='strip') rod.bend*=0.9;
  rod.side+=(0-rod.side)*Math.min(1,dt*4);
  if(F.stripT>0) F.stripT-=dt;
  var tip=rodTip(F);
  // how much line is out
  var fly=null, st=FLIES[WILD.fly].style;
  if(F.stage==='drift'||F.stage==='strip'||F.stage==='take') fly={x:F.fx,y:st==='streamer'?-0.12:0.02,z:F.fy};
  if(F.stage==='fight') fly={x:F.fx,y:F.leap>0?Math.sin(Math.PI*(1-F.leap/0.75))*1.1:-0.1,z:F.fy};
  var Lt=R.L;
  if(F.stage==='casting') Lt=LLEN[F.lvl];
  else if(fly){ var dd=Math.hypot(fly.x-tip.x,fly.y-tip.y,fly.z-tip.z);
    Lt=F.stage==='fight'?dd*(F.hold||F.T>0.3?1.0:1.12):(F.stage==='strip'?dd*1.04:Math.max(Lt,dd*1.03)); }
  R.L+=(Lt-R.L)*Math.min(1,dt*(F.stage==='fight'?8:3));
  var seg=R.L/(N-1);
  // while casting, steer the line towards the shape of a real cast
  var guide=null;
  if(F.stage==='casting'&&(F.cp==='back'||F.cp==='fwd'||F.cp==='hang')){
    var back=F.cp==='back', dl=back?Math.hypot(0.3,1):Math.hypot(0.1,1);
    var dir=back?{y:0.3/dl,z:-1/dl}:{y:0.1/dl,z:1/dl};
    var u=F.cp==='hang'?1:clamp(F.ct/(back?CAST_DUR*0.8:0.42),0,1); u=1-Math.pow(1-u,1.5);
    var r=F.tail&&!back?0.22:0.3+0.35*(1-u), sgn=F.tail&&!back?-1:1;
    guide=[]; for(var g=0;g<N;g++){ var sp=castShape(tip,dir,R.L,u,r,sgn,g*seg);
      if(F.cp==='hang'){ var kk=g/(N-1); sp.y-=F.ct*0.9*kk*kk; }
      guide.push(sp); }
  }
  var sub=3, h=dt/sub, grav=guide?0:-7.5;
  for(var it=0;it<sub;it++){
    for(var i=1;i<N;i++){ var p=P[i], q=Q[i], vx=(p.x-q.x)*0.985, vy=(p.y-q.y)*0.985, vz=(p.z-q.z)*0.985;
      q.x=p.x; q.y=p.y; q.z=p.z; p.x+=vx; p.y+=vy+grav*h*h; p.z+=vz;
      if(guide){ var k=1-Math.exp(-h*26), G0=guide[i]; p.x+=(G0.x-p.x)*k; p.y+=(G0.y-p.y)*k; p.z+=(G0.z-p.z)*k; } }
    P[0].x=tip.x; P[0].y=tip.y; P[0].z=tip.z;
    if(fly){ var e=P[N-1]; e.x=fly.x; e.y=fly.y; e.z=fly.z; }
    for(var c=0;c<8;c++){
      for(var j=0;j<N-1;j++){ var A=P[j], B=P[j+1], dx=B.x-A.x, dy=B.y-A.y, dz=B.z-A.z, d=Math.hypot(dx,dy,dz)||1e-6, diff=(d-seg)/d;
        var wa=j===0?0:0.5, wb=(fly&&j+1===N-1)?0:(j===0?1:0.5); if(wa+wb===0) continue; var f=diff/(wa+wb);
        A.x+=dx*f*wa; A.y+=dy*f*wa; A.z+=dz*f*wa; B.x-=dx*f*wb; B.y-=dy*f*wb; B.z-=dz*f*wb; }
    }
    // the water and the grass catch it: on the water it floats and the current carries it
    for(var m=1;m<N;m++){ var pp=P[m], qq=Q[m], gy=pp.z<SHORE_Z?BANK:0;
      if(pp.y<gy&&!(fly&&m===N-1)){ pp.y=gy; qq.y=gy;
        if(gy===0){ var cur=riverCur(F,pp.z); qq.x=pp.x-((pp.x-qq.x)*0.5+cur*h*0.5); qq.z=pp.z-(pp.z-qq.z)*0.4; }
        else { qq.x=pp.x-(pp.x-qq.x)*0.3; qq.z=pp.z-(pp.z-qq.z)*0.3; } } }
  }
}

/* ================= drawing ================= */
/* a fixed camera downstream and to the side; the picture is scaled to fit any screen */
var FCAM={c:{x:-24,y:8.5,z:2.2},t:{x:2,y:2.4,z:2.8}};
function fcamBasis(){
  var c=FCAM.c, t=FCAM.t, fx=t.x-c.x, fy=t.y-c.y, fz=t.z-c.z, fl=Math.hypot(fx,fy,fz); fx/=fl; fy/=fl; fz/=fl;
  var rx=-fz, rz=fx, rl=Math.hypot(rx,rz); rx/=rl; rz/=rl;            // right = forward × up
  var ux=-rz*fy, uy=rz*fx-rx*fz, uz=rx*fy;                              // up = right × forward
  return {f:[fx,fy,fz],r:[rx,0,rz],u:[ux,uy,uz]};
}
function fishDraw(cv,F){
  var c=cv.getContext('2d'), dpr=cv._dpr||1, W=cv._w||cv.width, Hh=cv._h||cv.height, t=performance.now()/1000;
  c.setTransform(dpr,0,0,dpr,0,0);
  var B=fcamBasis(), C=FCAM.c;
  function raw(x,y,z){ var dx=x-C.x, dy=y-C.y, dz=z-C.z, zc=dx*B.f[0]+dy*B.f[1]+dz*B.f[2];
    if(zc<0.5) zc=0.5; return [(dx*B.r[0]+dz*B.r[2])/zc,-(dx*B.u[0]+dy*B.u[1]+dz*B.u[2])/zc,zc]; }
  // fit the stage (from the far end of a back cast to the far end of a forward one) into the space between the panels
  // the view follows the action: it frames you, the fish and the whole line (out behind you on a back
  // cast, out over the water on a forward one), and glides in and out as the line grows
  var top=Math.min(Hh*0.17,92), bot=Math.min(Hh*0.3,170), side=14;
  var fo=document.getElementById('flyopen'), fb=document.querySelector('.fh-bottom');      // keep clear of the floating controls
  if(fo){ var r0=fo.getBoundingClientRect(); if(r0.bottom>0) top=r0.bottom+4; }
  if(fb){ var r1=fb.getBoundingClientRect(); if(r1.height>0) bot=Hh-r1.top+4; }
  var gTop=top+10; top+=44;                                                                // room for a gauge under the controls
  var pts=[raw(0,0,-2.5),raw(0,3.4,-2.5),raw(0,0,F.target.y+2),raw(F.target.x,0,F.target.y+1.5),raw(0,0,7)];
  F.rope.p.forEach(function(q,i){ if(i%3===0||i===ROPE_N-1) pts.push(raw(q.x,Math.max(q.y,0)+0.6,q.z),raw(q.x,Math.max(0,q.y-0.6),q.z)); });
  if(F.stage==='fight'||F.stage==='take'||F.stage==='drift'||F.stage==='strip') pts.push(raw(F.fx,1.4,F.fy+1.5));
  var x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; pts.forEach(function(q){ x0=Math.min(x0,q[0]); x1=Math.max(x1,q[0]); y0=Math.min(y0,q[1]); y1=Math.max(y1,q[1]); });
  var tS=Math.min((W-2*side)/(x1-x0),(Hh-top-bot)/(y1-y0)), tox=side+((W-2*side)-(x1-x0)*tS)/2-x0*tS, toy=top+((Hh-top-bot)-(y1-y0)*tS)/2-y0*tS;
  var now=performance.now(), V=F.view;
  if(!V||V.W!==W||V.H!==Hh){ V=F.view={S:tS,ox:tox,oy:toy,W:W,H:Hh,t:now}; }
  else { var kv=1-Math.exp(-Math.min(0.1,(now-V.t)/1000)*2.2), sNew=V.S+(tS-V.S)*kv;
    // keep the zoom about the middle of the frame, so it doesn't swing about while it glides
    V.ox+=(tox-V.ox)*kv; V.oy+=(toy-V.oy)*kv; V.S=sNew; V.t=now; }
  var S=V.S, ox=V.ox, oy=V.oy;
  function P(x,y,z){ var q=raw(x,y,z); return [q[0]*S+ox,q[1]*S+oy,q[2]]; }
  var M=S/raw(0,1.5,0)[2];                       // pixels per metre where you stand
  var where=F.where, isle=where==='isle', sea=where==='sea'||isle, lake=where==='lake', far=FARBANK[where];
  // sky
  var hz=P(3000,0,2)[1];
  c.fillStyle=isle?'#8a6a3a':(sea?'#c8b88a':'#4f7a38'); c.fillRect(0,0,W,Hh);
  var sg=c.createLinearGradient(0,0,0,hz); sg.addColorStop(0,isle?'#c9874a':(sea?'#7fb4d0':'#9cc4c8')); sg.addColorStop(1,isle?'#f0c890':(sea?'#d8ecf0':'#e6efe0'));
  c.fillStyle=sg; c.fillRect(0,0,W,Math.max(0,hz)+2);
  // hills along the horizon
  if(!sea){ c.fillStyle=lake?'#7a9a8a':'#6f8f78'; c.beginPath(); c.moveTo(0,hz);
    for(var hx2=0;hx2<=W;hx2+=W/24){ c.lineTo(hx2,hz-(18+Math.sin(hx2*0.013+1)*14+Math.sin(hx2*0.041)*7)*M*0.06); } c.lineTo(W,hz); c.fill(); }
  else { c.fillStyle=isle?'rgba(120,70,40,.5)':'rgba(90,120,140,.35)'; c.beginPath(); c.ellipse(W*0.8,hz,W*0.12,8*M*0.06,0,Math.PI,0); c.fill(); }
  // the ground and the water, as big quads running away from us
  function quad(z0,z1,col,y){ y=y||0; var a=P(-21,y,z0), b=P(900,y,z0), d=P(900,y,z1), e=P(-21,y,z1);
    c.fillStyle=col; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.lineTo(d[0],d[1]); c.lineTo(e[0],e[1]); c.closePath(); c.fill(); }
  var wg=c.createLinearGradient(0,hz,0,Hh); wg.addColorStop(0,isle?'#b09070':(sea?'#6aa8c0':(lake?'#7ab0b0':'#6aa0a8'))); wg.addColorStop(1,isle?'#3a4a50':(sea?'#1c4a64':(lake?'#22504e':'#20485a')));
  quad(SHORE_Z,Math.min(far,3000),wg);
  quad(-400,SHORE_Z,isle?'#8a6a3a':(sea?'#c8b88a':'#4f7a38'),BANK);                  // your bank (sand by the sea), a step above the water
  var e1=P(-21,BANK,SHORE_Z), e2=P(900,BANK,SHORE_Z), e3=P(900,0,SHORE_Z+0.25), e4=P(-21,0,SHORE_Z+0.25);  // and its edge
  c.fillStyle=sea?'#9a8a62':'#5a4a2e'; c.beginPath(); c.moveTo(e1[0],e1[1]); c.lineTo(e2[0],e2[1]); c.lineTo(e3[0],e3[1]); c.lineTo(e4[0],e4[1]); c.closePath(); c.fill();
  if(far<3000) quad(far,700,lake?'#4a7240':'#557d3c');                              // the far bank
  // trees: behind you, and on the far bank
  function tree(x,z,hgt,col){ var b0=P(x,0,z), tp=P(x,hgt,z), wd=Math.max(2,(tp[1]-b0[1])*-0.32);
    c.fillStyle=col; c.beginPath(); c.moveTo(b0[0]-wd,b0[1]); c.lineTo(tp[0],tp[1]); c.lineTo(b0[0]+wd,b0[1]); c.fill(); }
  if(!sea){ var tr=mulberry(where==='lake'?5:3);
    var trees=[]; for(var ti=0;ti<46;ti++){ var tx=4+Math.pow(tr(),1.6)*300, side2=tr()<0.5;
      trees.push({x:tx,z:side2?-6-tr()*40:far+2+tr()*30,h:5+tr()*6,c:isle?'#a2501c':(tr()<0.5?'#28452a':'#305a30')}); }
    trees.sort(function(a,b){ return b.x-a.x; }).forEach(function(T){ tree(T.x,T.z,T.h,T.c); }); }
  else if(isle){ var tr2=mulberry(9); for(var t2=0;t2<20;t2++){ var x2=8+tr2()*200; tree(x2,-8-tr2()*30,5+tr2()*5,tr2()<0.5?'#c0601c':'#d8902a'); } }
  // the current, or the swell
  var cnt=26;
  for(var s=0;s<cnt;s++){ var sx=((s*37.7)%60)-6, sz=SHORE_Z+1+((s*13.3)%Math.min(far-SHORE_Z-2,30));
    var drift=where==='river'?((t*riverCur(F,sz)*1.4+s*3.1)%12):0, wav=sea?Math.sin(t*1.2+s)*0.3:0;
    var a1=P(sx+drift,0,sz+wav), a2=P(sx+drift+(where==='river'?1.6:0.8),0,sz+wav);
    c.strokeStyle='rgba(255,255,255,'+(0.08+0.06*Math.sin(t+s))+')'; c.lineWidth=1.3; c.beginPath(); c.moveTo(a1[0],a1[1]); c.lineTo(a2[0],a2[1]); c.stroke(); }
  // the fish you're after: a dark shape under the surface, and its rises
  function fishShadow(x,z,len,alpha,ang){ var q=[]; for(var k=0;k<14;k++){ var a=k/14*6.283, lx=Math.cos(a)*len*0.5, lz=Math.sin(a)*len*0.16;
      q.push(P(x+lx*Math.cos(ang)-lz*Math.sin(ang),-0.02,z+lx*Math.sin(ang)+lz*Math.cos(ang))); }
    c.fillStyle='rgba(10,24,28,'+alpha+')'; c.beginPath(); q.forEach(function(v,k){ if(k) c.lineTo(v[0],v[1]); else c.moveTo(v[0],v[1]); }); c.closePath(); c.fill(); }
  var showT=F.stage==='ready'||F.stage==='casting'||F.stage==='empty'||F.stage==='lost';
  if(showT){ fishShadow(F.target.x+Math.sin(t*0.8)*0.3,F.target.y,1.2,0.32,Math.sin(t*0.5)*0.3);
    var lb=P(F.target.x,1.2,F.target.y), lb0=P(F.target.x,0.2,F.target.y);
    c.strokeStyle='rgba(255,220,120,.7)'; c.setLineDash([4,4]); c.lineWidth=1.2; c.beginPath(); c.moveTo(lb[0],lb[1]); c.lineTo(lb0[0],lb0[1]); c.stroke(); c.setLineDash([]);
    c.fillStyle='rgba(255,230,150,.95)'; c.font='600 '+Math.round(clamp(M*0.8,11,16))+'px Georgia,serif'; c.textAlign='center'; c.fillText('fish here · '+['','near','middle','far'][F.target.lvl],lb[0],lb[1]-4); }
  if(F.stage==='strip'&&F.took&&F.strips>=1) fishShadow(F.fx+0.9,F.fy+0.2,1.1,0.4,0.2+Math.sin(t*5)*0.2);
  if(F.stage==='take'||(F.stage==='fight'&&!(F.leap>0))) fishShadow(F.fx,F.fy,0.8+(F.size||0.5)*0.9,0.5,Math.sin(t*7)*0.5);
  // rings and splashes
  c.lineWidth=1.4;
  F.ripples.forEach(function(Rg){ var al=Math.max(0,1-Rg.t/1.4); c.strokeStyle='rgba(235,248,255,'+(0.6*al)+')'; c.beginPath();
    for(var k=0;k<=16;k++){ var a=k/16*6.283, v=P(Rg.x+Math.cos(a)*Rg.r,0.01,Rg.z+Math.sin(a)*Rg.r); if(k) c.lineTo(v[0],v[1]); else c.moveTo(v[0],v[1]); } c.stroke(); });
  c.fillStyle='#eef8ff'; F.drops.forEach(function(d){ var v=P(d.x,d.y,d.z); c.fillRect(v[0]-1.5,v[1]-1.5,3,3); });
  // hatching bugs dancing over the water
  c.fillStyle='rgba(250,240,210,.85)'; F.bugs.forEach(function(b){ var v=P(b.x,b.y+Math.abs(Math.sin(b.t*5+b.s))*0.3,b.z), fl=Math.sin(b.t*40)*1.5; c.fillRect(v[0]-1.2,v[1]-0.8,2.4,1.6); c.fillRect(v[0]-3,v[1]-1.5+fl,1.6,1); c.fillRect(v[0]+1.4,v[1]-1.5-fl,1.6,1); });
  // the leaping fish
  if(F.stage==='fight'&&F.leap>0&&F.catchK){ var D0=FISH[F.catchK], k2=1-F.leap/0.75, ly=Math.sin(Math.PI*k2)*1.1, len=0.35+(F.size||0.5)*0.5;
    var hd=P(F.fx+len*0.5,ly+0.1,F.fy), tl=P(F.fx-len*0.5,ly-0.1+Math.sin(t*30)*0.05,F.fy), mid=P(F.fx,ly+0.06,F.fy);
    c.strokeStyle=D0.col; c.lineCap='round'; c.lineWidth=Math.max(3,len*M*0.45); c.beginPath(); c.moveTo(tl[0],tl[1]); c.quadraticCurveTo(mid[0],mid[1]-3,hd[0],hd[1]); c.stroke(); c.lineCap='butt'; }
  // the hunter on the bank
  var hand=rodHand(F), tip=rodTip(F);
  function seg2(a,b,wd,col){ var A=P(a[0],a[1],a[2]), Bq=P(b[0],b[1],b[2]); c.strokeStyle=col; c.lineWidth=wd; c.lineCap='round'; c.beginPath(); c.moveTo(A[0],A[1]); c.lineTo(Bq[0],Bq[1]); c.stroke(); c.lineCap='butt'; }
  var sc0=Math.max(1.5,M*0.1), cloak='#2f6a3a', skin='#e8c8a8';
  seg2([0,BANK,-0.1],[0,BANK+0.85,0],sc0*1.6,'#4a3420'); seg2([0.12,BANK,0.1],[0,BANK+0.85,0],sc0*1.6,'#3e2c1a');
  seg2([0,BANK+0.85,0],[0,BANK+1.55,0.02],sc0*3.2,cloak);
  var arm=[hand.x,hand.y,hand.z]; seg2([0.05,BANK+1.5,0.05],arm,sc0*1.1,cloak);
  var hd2=P(0,BANK+1.78,0.04); c.fillStyle=skin; c.beginPath(); c.arc(hd2[0],hd2[1],sc0*1.15,0,6.283); c.fill();
  c.fillStyle=cloak; c.beginPath(); c.arc(hd2[0],hd2[1]-sc0*0.25,sc0*1.25,Math.PI*1.05,Math.PI*2.1); c.fill();
  // the rod: cork grip, then a blank that bends against its swing (and under a fish)
  var Hq=P(hand.x,hand.y,hand.z), Tq=P(tip.x,tip.y,tip.z), mx=(Hq[0]+Tq[0])/2, my=(Hq[1]+Tq[1])/2, len2=Math.hypot(Tq[0]-Hq[0],Tq[1]-Hq[1])||1;
  var nx=-(Tq[1]-Hq[1])/len2, ny=(Tq[0]-Hq[0])/len2, bd=F.rod.bend*len2*0.6;
  if(F.stage==='fight'){ var fpos=P(F.fx,0,F.fy); var toward=(fpos[1]>Tq[1])?1:-1; nx=Math.abs(nx)*0+0; ny=toward; bd=Math.abs(F.rod.bend)*len2*0.45; }
  c.strokeStyle='#4a2e14'; c.lineWidth=Math.max(2,M*0.035); c.beginPath(); c.moveTo(Hq[0],Hq[1]); c.quadraticCurveTo(mx+nx*bd,my+ny*bd,Tq[0],Tq[1]); c.stroke();
  c.strokeStyle='#d8b880'; c.lineWidth=Math.max(3,M*0.06); c.beginPath(); c.moveTo(Hq[0],Hq[1]); var gk=0.12; c.lineTo(Hq[0]+(Tq[0]-Hq[0])*gk,Hq[1]+(Tq[1]-Hq[1])*gk); c.stroke();
  // the fly line, from the rod tip to the leader and the fly
  var R=F.rope, Pp=R.p.map(function(q){ return P(q.x,q.y,q.z); });
  Pp[0]=[Tq[0],Tq[1]];
  var nLead=Math.round(ROPE_N*0.82);
  c.lineJoin='round'; c.strokeStyle='#f4ec9a'; c.lineWidth=Math.max(1.8,M*0.022);
  c.beginPath(); c.moveTo(Pp[0][0],Pp[0][1]); for(var li=1;li<=nLead;li++) c.lineTo(Pp[li][0],Pp[li][1]); c.stroke();
  c.strokeStyle='rgba(235,240,235,.75)'; c.lineWidth=Math.max(1,M*0.01);
  c.beginPath(); c.moveTo(Pp[nLead][0],Pp[nLead][1]); for(var lj=nLead+1;lj<ROPE_N;lj++) c.lineTo(Pp[lj][0],Pp[lj][1]); c.stroke();
  // the fly itself
  var E=Pp[ROPE_N-1], fl2=FLIES[WILD.fly], fr=Math.max(3,M*0.07);
  if(F.stage!=='landed'&&F.stage!=='fight'){
    if(fl2.style==='nymph'&&(F.stage==='drift'||F.stage==='take')){ var ind=Pp[Math.round(ROPE_N*0.86)], dip=F.stage==='take'?fr*1.2:Math.sin(t*2.5)*1.2;
      c.fillStyle='#ff8a2a'; c.beginPath(); c.arc(ind[0],ind[1]+dip,fr*1.1,0,6.283); c.fill(); }
    else { c.fillStyle=fl2.col; c.beginPath(); c.arc(E[0],E[1],fr*0.8,0,6.283); c.fill();
      if(fl2.style==='dry'){ c.fillStyle=fl2.wing; c.fillRect(E[0]-fr*0.25,E[1]-fr*1.8,fr*0.5,fr*1.2); } }
    if(F.stage==='drift'&&F.drag>=1&&fl2.style==='dry'){ c.strokeStyle='rgba(255,255,255,.7)'; c.lineWidth=1.2; var wk=P(F.fx-1.2,0,F.fy); c.beginPath(); c.moveTo(wk[0],wk[1]); c.lineTo(E[0],E[1]); c.stroke(); }
  }
  if(F.stage==='take'){ c.fillStyle='#fff3c4'; c.font='700 '+Math.round(clamp(M*2.2,26,48))+'px Georgia,serif'; c.textAlign='center'; c.fillText('!',E[0],E[1]-fr*3); }

  // ---- gauges, drawn over the scene ----
  var gw=Math.min(W*0.6,420), gx=(W-gw)/2, gy=gTop+12;
  if(F.stage==='casting'&&F.cp==='back'){
    var FDd=FD(); c.fillStyle='rgba(10,8,4,.7)'; roundRect2(c,gx-8,gy-8,gw+16,36,8); c.fill();
    c.fillStyle='#7a2c22'; c.fillRect(gx,gy,gw,10); c.fillStyle='#62c24c'; c.fillRect(gx+gw*FDd.early/FDd.late,gy,gw*(1-FDd.early/FDd.late),10);
    c.fillStyle='#fff6d8'; c.fillRect(gx+gw*Math.min(1,F.ct/CAST_DUR/FDd.late)-2.5,gy-4,5,18);
    c.fillStyle='#fff3c4'; c.font='600 13px Georgia,serif'; c.textAlign='center'; c.fillText(F.ct>=CAST_DUR*FDd.early?'NOW! Come forward':'the line is unrolling behind you… wait…',gx+gw/2,gy+25);
  }
  if(F.stage==='drift'&&F.where==='river'){ var dw=Math.min(W*0.4,260), dx=(W-dw)/2;
    c.fillStyle='rgba(10,8,4,.7)'; roundRect2(c,dx-8,gy-8,dw+16,36,8); c.fill();
    c.fillStyle=F.drag>=1?'#d6584a':(F.drag>0.7?'#e0a040':'#62c24c'); c.fillRect(dx,gy,dw*Math.min(1,F.drag),10);
    c.strokeStyle='rgba(255,255,255,.3)'; c.strokeRect(dx,gy,dw,10);
    c.fillStyle='#fff3c4'; c.font='600 13px Georgia,serif'; c.textAlign='center'; c.fillText(F.drag>=1?'DRAG! Mend the line':'drag: the current is bellying your line',dx+dw/2,gy+25); }
  if(F.stage==='fight'){
    c.fillStyle='rgba(10,8,4,.75)'; roundRect2(c,gx-8,gy-22,gw+16,50,8); c.fill();
    var snp=Math.min(1,FD().snap); c.fillStyle='#2a3a2a'; c.fillRect(gx,gy,gw,12);
    c.fillStyle='#62c24c'; c.fillRect(gx+gw*0.2,gy,gw*(snp-0.35),12); c.fillStyle='#d6584a'; c.fillRect(gx+gw*(snp-0.15),gy,gw*(1.0-snp+0.15),12);
    c.fillStyle='#fff6d8'; c.fillRect(gx+gw*Math.min(1,F.T)-3,gy-5,6,22);
    c.fillStyle='#fff3c4'; c.font='600 13px Georgia,serif'; c.textAlign='left'; c.fillText('line tension',gx,gy-8);
    c.textAlign='right'; c.fillText(F.run>0?'IT\'S RUNNING! let go':'line out: '+Math.round(Math.max(0,F.dist)*(F.hookZ||10))+' m',gx+gw,gy-8);
  }
  // the catch, held up to the camera
  if(F.stage==='landed'&&F.catchK){
    var D=FISH[F.catchK], fs=Math.min(W,Hh)/420*(0.8+(F.size||0.5)*0.4), cx2=W/2, cy2=top+(Hh-top-bot)*0.45+Math.sin(F.t*6)*4*Math.max(0,1-F.t), wig=Math.sin(F.t*10)*0.12*Math.max(0,1-F.t*0.5);
    c.fillStyle='rgba(10,8,4,.45)'; roundRect2(c,cx2-140*fs-30,cy2-70*fs,280*fs+60,140*fs+30,16); c.fill();
    c.save(); c.translate(cx2,cy2); c.rotate(wig); c.scale(fs*1.6,fs*1.6);
    c.fillStyle=D.col; c.beginPath(); c.ellipse(0,0,58,20,0,0,6.283); c.fill();
    c.beginPath(); c.moveTo(48,0); c.lineTo(84,-20); c.lineTo(78,0); c.lineTo(84,20); c.fill();
    c.fillStyle=D.spot; for(var sp2=0;sp2<7;sp2++){ c.beginPath(); c.arc(-20+sp2*9,-6+((sp2*7)%11)-3,2.6,0,6.283); c.fill(); }
    c.fillStyle='rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-6,8,40,6,0,0,6.283); c.fill();
    c.fillStyle='#111'; c.beginPath(); c.arc(-40,-4,3.4,0,6.283); c.fill();
    c.restore();
    if(D.tier>=4){ c.fillStyle='rgba(255,230,140,'+(0.5+0.5*Math.sin(t*6))+')'; for(var s3=0;s3<6;s3++){ var a3=t*1.5+s3*1.05; c.fillRect(cx2+Math.cos(a3)*150*fs-2,cy2+Math.sin(a3)*60*fs-2,4,4); } }
    c.fillStyle='#fff3c4'; c.font='600 '+Math.round(clamp(18*fs,15,26))+'px Georgia,serif'; c.textAlign='center'; c.fillText(F.cm+' cm '+D.n.toLowerCase(),cx2,cy2+62*fs);
  }
}
function roundRect2(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r); c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r); c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath(); }
/* keys: Space or E is the rod hand, Enter or F the second button, B the fly box; hold Space to strip in */
addEventListener('keydown',function(e){
  if(!FISHING||G.state!=='talk'||!document.getElementById('fbtn')) return;
  if(e.target&&e.target.tagName==='INPUT') return;
  if(e.key===' '||e.key==='e'||e.key==='E'){ e.preventDefault(); if(!e.repeat) fishPress(); }
  else if(e.key==='Enter'||e.key==='f'||e.key==='F'){ e.preventDefault(); if(!e.repeat) fishPress2(); }
  else if((e.key==='b'||e.key==='B')&&!e.repeat) flyBoxToggle();
});
addEventListener('keyup',function(e){ if(FISHING&&(e.key===' '||e.key==='e'||e.key==='E')) fishRelease(); });
/* Bram buys the lot */
function sellFish(){ var v=fishValue(); if(!v) return 0; WILD.fish={}; G.player.coins+=v; return v; }
