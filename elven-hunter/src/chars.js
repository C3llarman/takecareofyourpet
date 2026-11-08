var PARTS={};
function initParts(){
  function reg(k,mb){ PARTS[k]={geom:toGeom(mb),mb:mb,n:mb.count()}; }
  reg('box',boxMesh([1,1,1]));
  // limbs and torsos are rounded tubes, not boxes
  reg('limb',tubeMesh([1,1,1],0.8,0,-1));
  reg('limbT',tubeMesh([1,1,1],0.62,0,-1));
  reg('torso',tubeMesh([1,1,1],1.22,0,1,12));
  reg('torsoT',tubeMesh([1,1,1],0.72,0,1,12));
  reg('blob',blobMesh([1,1,1],0,2));
  reg('blobR',blobMesh([1,1,1],0.12,2));
  reg('cone',coneMesh([1,1,1],10));
  reg('cone8',coneMesh([1,1,1],12));
  reg('tube',coneMesh([1,1,1],10,0.5,0.42));
  reg('disc',discMesh(14));
  reg('wingIn',wingMesh(0));
  reg('wingOut',wingMesh(1));
  reg('sky',skyMesh([0.62,0.70,0.68],[0.30,0.45,0.52],[0.20,0.25,0.22],20));
}

/* palettes */
var SKIN={human:[0.80,0.62,0.48],elf:[0.86,0.74,0.62],dwarf:[0.78,0.58,0.44],goblin:[0.38,0.52,0.28]};
var HAIR={blonde:[0.84,0.70,0.34],brown:[0.36,0.24,0.14],white:[0.86,0.86,0.82],black:[0.16,0.14,0.14],red:[0.58,0.28,0.14]};

/* A rig is built each frame into the draw list.
   push(meshKey, x,y,z, rx,ry,rz, sx,sy,sz, color) in character-local space;
   the caller multiplies by the root matrix. */
function humanoidRig(out,e,t){
  var P=e.look, s=e.scale||1;
  if(typeof LOD!=='undefined'&&LOD){
    var mvL=Math.min(1,(e.speed||0)/4.4), swL=Math.sin(e.walkPhase||0)*0.7*mvL;
    out.push(['limb',-0.17*s,0.86*s,0, swL,0,0, 0.24*s,0.86*s,0.24*s,P.pants]);
    out.push(['limb', 0.17*s,0.86*s,0,-swL,0,0, 0.24*s,0.86*s,0.24*s,P.pants]);
    out.push(['torsoT',0,0.86*s,0, 0,0,0, 0.52*s,0.62*s,0.34*s,P.cloak||P.tunic]);
    out.push(['blob',0,1.46*s,0, 0,0,0, 0.32*s,0.34*s,0.32*s,P.skin]);
    out.push(['blob',0,1.62*s,-0.02*s, 0,0,0, 0.35*s,0.22*s,0.35*s,P.hair]);
    return;
  }
  var P=e.look2||e.look, sc=e.scale||1;
  var walk=e.walkPhase||0, mv=Math.min(1,(e.speed||0)/4.4);
  var sw=Math.sin(walk)*0.80*mv, sw2=Math.cos(walk)*0.22*mv;
  var bob=Math.abs(Math.sin(walk))*0.05*mv;
  var hurt=(e.hurtT>0)?Math.min(1,e.hurtT/0.3):0;
  var atk=(e.atkT>0&&e.atkDur)?(1-e.atkT/e.atkDur):-1;
  var air=(e.onGround===false)?1:0;
  var tilt=mv*0.09+hurt*0.40;
  var HIP=0.90*sc, TOR=0.64*sc, SH=HIP+TOR, HEAD=SH+0.04*sc;
  function push(k,x,y,z,rx,ry,rz,sx,sy,sz,c){ out.push([k,x,y+bob,z,rx,ry,rz,sx,sy,sz,c]); }

  // legs (tapered) + boots
  var lrx=sw+air*0.65, rrx=-sw+air*0.35;
  push('limbT',-0.17*sc,HIP,0, lrx,0,0, 0.30*sc,HIP,0.30*sc, P.pants);
  push('limbT', 0.17*sc,HIP,0, rrx,0,0, 0.30*sc,HIP,0.30*sc, P.pants);
  push('blob',-0.17*sc, HIP-Math.cos(lrx)*HIP-0.06*sc, Math.sin(lrx)*HIP+0.05*sc, lrx*0.3,0,0, 0.26*sc,0.20*sc,0.40*sc, P.boot);
  push('blob', 0.17*sc, HIP-Math.cos(rrx)*HIP-0.06*sc, Math.sin(rrx)*HIP+0.05*sc, rrx*0.3,0,0, 0.26*sc,0.20*sc,0.40*sc, P.boot);
  // torso: broad at the shoulders, narrow at the waist
  push('torso',0,HIP-0.02*sc,0, tilt*0.5,sw2*0.18,0, 0.46*sc,TOR+0.02*sc,0.32*sc, P.tunic);
  push('tube', 0,HIP+TOR*0.26,0, tilt*0.5,sw2*0.18,0, 0.50*sc,0.10*sc,0.35*sc, P.belt);
  // shoulders
  push('blob',-0.27*sc,SH-0.10*sc,0, 0,0,0, 0.24*sc,0.22*sc,0.26*sc, P.pauldron||P.tunic);
  push('blob', 0.27*sc,SH-0.10*sc,0, 0,0,0, 0.24*sc,0.22*sc,0.26*sc, P.pauldron||P.tunic);
  // head
  var hy=HEAD;
  push('blob',0,hy,0, tilt*0.5,sw2*0.3,0, 0.30*sc,0.32*sc,0.30*sc, P.skin);
  if(!P.hood){
    push('blob',0,hy+0.12*sc,-0.02*sc, tilt*0.5,sw2*0.3,0, 0.33*sc,0.24*sc,0.33*sc, P.hair);
    if(P.ears){
      push('cone',-0.16*sc,hy+0.14*sc,0, 0,0, 2.1, 0.09*sc,0.26*sc,0.09*sc, P.skin);
      push('cone', 0.16*sc,hy+0.14*sc,0, 0,0,-2.1, 0.09*sc,0.26*sc,0.09*sc, P.skin);
    }
  } else {
    push('cone8',0,hy-0.06*sc,-0.02*sc, tilt*0.5,sw2*0.3,0, 0.44*sc,0.46*sc,0.46*sc, P.cloak||P.tunic);
  }
  if(P.beard) push('blob',0,hy-0.06*sc,0.10*sc, 0,0,0, 0.26*sc,0.26*sc,0.16*sc, P.hair);
  if(P.helm) push('cone8',0,hy+0.10*sc,0, 0,0,0, 0.36*sc,0.30*sc,0.36*sc, P.metal);
  // arms
  var shY=SH-0.06*sc, shX=0.29*sc, aL=0.62*sc;
  var laRx=-sw*0.75, raRx=sw*0.75, laRz=0.14, raRz=-0.14;
  if(atk>=0){
    if(e.atkKind==='bow'){ laRx=-1.45; raRx=-1.15+atk*0.25; }
    else { raRx=-2.25+atk*3.5; raRz=-0.55+atk*0.55; }
  }
  push('limbT',-shX,shY,0, laRx,0, laRz, 0.19*sc,aL,0.19*sc, P.sleeve);
  push('limbT', shX,shY,0, raRx,0, raRz, 0.19*sc,aL,0.19*sc, P.sleeve);
  push('blob',-shX+Math.sin(laRx)*aL*0.98, shY-Math.cos(laRx)*aL, 0,0,0,0, 0.17*sc,0.17*sc,0.17*sc, P.skin);
  push('blob', shX+Math.sin(raRx)*aL*0.98, shY-Math.cos(raRx)*aL, 0,0,0,0, 0.17*sc,0.17*sc,0.17*sc, P.skin);
  // cloak: wide, long, flaring with speed
  if(P.cloak){
    var fl=0.20+mv*0.55+Math.sin(walk*2)*0.05*mv;
    push('limbT',0,SH+0.01*sc,-0.24*sc, fl,0,0, 0.48*sc,(SH-0.34*sc),0.09*sc, P.cloak);
    push('blob', 0,SH-0.03*sc,-0.15*sc, 0,0,0, 0.54*sc,0.16*sc,0.24*sc, P.cloak);
  }
  // weapon
  var wx=shX+Math.sin(raRx)*aL, wy=shY-Math.cos(raRx)*aL;
  var WR=raRx+3.14-0.5;                       // carry on past the hand, angled forward
  function tipAt(len){ return [wx+Math.sin(WR)*len, wy-Math.cos(WR)*len]; }
  if(P.weapon==='sword'){
    push('box',wx,wy,0, WR,0,raRz*0.5, 0.08*sc,0.98*sc,0.14*sc, P.metal);
    var g=tipAt(0.10*sc);
    push('box',g[0],g[1],0, WR,0,raRz*0.5, 0.30*sc,0.09*sc,0.11*sc, P.belt);
  } else if(P.weapon==='axe'){
    push('box',wx,wy,0, WR,0,raRz*0.5, 0.09*sc,0.88*sc,0.09*sc, P.belt);
    var h2=tipAt(0.74*sc);
    push('box',h2[0],h2[1],0, WR,0,raRz*0.5, 0.36*sc,0.34*sc,0.10*sc, P.metal);
  } else if(P.weapon==='staff'){
    push('box',wx+Math.sin(WR)*(-0.45*sc),wy-Math.cos(WR)*(-0.45*sc),0, WR,0,raRz*0.5, 0.08*sc,1.60*sc,0.08*sc, P.belt);
    var t3=tipAt(-0.52*sc);
    push('blob',t3[0],t3[1],0,0,0,0, 0.28*sc,0.28*sc,0.28*sc, P.gem);
  } else if(P.weapon==='bow'){
    var bx=-shX+Math.sin(laRx)*aL, by=shY-Math.cos(laRx)*aL;
    push('tube',bx,by+0.58*sc,0, 0,0,0.20, 0.11*sc,1.16*sc,0.11*sc, P.belt);
  } else if(P.weapon==='spear'){
    push('box',wx+Math.sin(WR)*(-0.55*sc),wy-Math.cos(WR)*(-0.55*sc),0, WR,0,raRz*0.5, 0.07*sc,1.85*sc,0.07*sc, P.belt);
    var t4=tipAt(1.25*sc);
    push('cone',t4[0],t4[1],0, WR,0,raRz*0.5, 0.16*sc,0.38*sc,0.16*sc, P.metal);
  }
  if(P.quiver){
    push('limbT',0.10*sc,SH-0.06*sc,-0.19*sc, -0.25,0,0.26, 0.15*sc,0.48*sc,0.15*sc, P.belt);
  }
}

function spiderRig(out,e,t){
  var s=e.scale||1, c=e.look.body, cb=e.look.dark, ce=e.look.eye;
  if(typeof LOD!=='undefined'&&LOD){
    out.push(['blobR',0,0.60*s,-0.42*s,0,0,0, 1.45*s,1.15*s,1.55*s,c]);
    out.push(['blobR',0,0.55*s, 0.45*s,0,0,0, 0.95*s,0.78*s,0.95*s,cb]);
    for(var li=0;li<2;li++) for(var sdl=-1;sdl<=1;sdl+=2)
      out.push(['limbT',sdl*0.30*s,0.66*s,(0.3-li*0.5)*s, 0,sdl*0.5,sdl*2.2, 0.12*s,0.9*s,0.12*s,cb]);
    return;
  }
  var ph=(e.walkPhase||0), mv=Math.min(1,(e.speed||0)/3), bob=Math.sin(ph*2)*0.035*mv;
  var bodyY=(0.62+bob)*s;
  // abdomen (back) + cephalothorax (front)
  out.push(['blobR',0,bodyY*0.92,-0.42*s,0,0,0, 1.45*s,1.15*s,1.55*s,c]);
  out.push(['blobR',0,bodyY*0.88,0.45*s,0,0,0, 0.95*s,0.78*s,0.95*s,cb]);
  // eight legs: upper segment out+up, lower segment down to the ground
  for(var i=0;i<4;i++){
    for(var sd=-1;sd<=1;sd+=2){
      var swing=Math.sin(ph*2.2+i*1.5+(sd>0?0:Math.PI))*0.30*mv;
      var fan=(0.85-i*0.52)+swing*0.55;          // front legs forward, back legs back
      var ry=sd>0?fan:-fan;
      var up=2.22+Math.sin(ph*2.2+i*1.5+(sd>0?0:Math.PI))*0.14*mv;
      var rz=sd*up;
      var sx=sd*0.30*s, sy=bodyY+0.06*s, sz=(0.42-i*0.30)*s;
      var L1=0.80*s;
      out.push(['limbT',sx,sy,sz, 0,ry,rz, 0.11*s,L1,0.11*s,cb]);
      // knee = shoulder + R*(0,-L1,0)
      var kx=sx+L1*Math.sin(rz)*Math.cos(ry);
      var ky=sy-L1*Math.cos(rz);
      var kz=sz-L1*Math.sin(rz)*Math.sin(ry);
      var rz2=sd*(0.40+swing*0.5), L2=(ky-0)*1.02+0.18*s;
      if(L2<0.3*s) L2=0.3*s;
      out.push(['limbT',kx,ky,kz, 0,ry,rz2, 0.09*s,L2,0.09*s,cb]);
    }
  }
  // eyes + fangs on the front of the cephalothorax
  var ey=bodyY+0.10*s, fz=0.92*s;
  out.push(['box',-0.15*s,ey,fz,0,0,0,0.13*s,0.13*s,0.10*s,ce]);
  out.push(['box', 0.15*s,ey,fz,0,0,0,0.13*s,0.13*s,0.10*s,ce]);
  out.push(['box',-0.30*s,ey-0.10*s,fz-0.06*s,0,0,0,0.09*s,0.09*s,0.09*s,ce]);
  out.push(['box', 0.30*s,ey-0.10*s,fz-0.06*s,0,0,0,0.09*s,0.09*s,0.09*s,ce]);
  out.push(['limbT',-0.13*s,bodyY*0.78,fz,0.5,0,0.25,0.10*s,0.40*s,0.10*s,cb]);
  out.push(['limbT', 0.13*s,bodyY*0.78,fz,0.5,0,-0.25,0.10*s,0.40*s,0.10*s,cb]);
}
/* far-away stand-ins for the monster models (and what draws them while loading) */
function snakeRig(out,e,t){
  var s=e.scale||1, c=e.look.body, cb=e.look.belly, ph=(e.walkPhase||0)*1.6;
  var n=(typeof LOD!=='undefined'&&LOD)?4:7;
  for(var i=0;i<n;i++){                       // body: a wriggling chain from the tail up to the neck
    var k=i/(n-1), z=(-1.1+k*1.3)*s, x=Math.sin(ph-k*3.2)*0.28*s*(1-k*0.6), r=(0.20+0.08*Math.sin(k*3.1))*s;
    out.push(['blobR',x,r*0.9,z,0,0,0, r*1.1,r*0.9,r*1.3,(i&1)?c:cb]);
  }
  // reared neck and head
  out.push(['limbT',0,0.30*s,0.25*s, -0.5,0,0, 0.30*s,0.75*s,0.30*s,c]);
  out.push(['blobR',0,0.95*s,0.55*s,0,0,0, 0.32*s,0.24*s,0.42*s,c]);
  out.push(['box',-0.11*s,1.02*s,0.80*s,0,0,0,0.07*s,0.07*s,0.05*s,e.look.eye]);
  out.push(['box', 0.11*s,1.02*s,0.80*s,0,0,0,0.07*s,0.07*s,0.05*s,e.look.eye]);
}
function waspRig(out,e,t){
  var s=e.scale||1, L=e.look, hy=(e.hover||1.25)*s, flap=Math.sin(t*38+(e.walkPhase||0))*0.5;
  out.push(['blobR',0,hy,0.10*s,0,0,0, 0.34*s,0.30*s,0.36*s,L.body]);              // thorax
  out.push(['blobR',0,hy-0.10*s,-0.42*s,0.35,0,0, 0.30*s,0.30*s,0.48*s,L.stripe]); // abdomen
  out.push(['blobR',0,hy-0.16*s,-0.62*s,0.35,0,0, 0.22*s,0.22*s,0.30*s,L.body]);
  out.push(['blobR',0,hy+0.05*s,0.48*s,0,0,0, 0.24*s,0.22*s,0.22*s,L.stripe]);    // head
  if(typeof LOD!=='undefined'&&LOD) return;
  for(var sd=-1;sd<=1;sd+=2)                                                      // wings, a blur
    out.push(['blobR',sd*0.42*s,hy+0.28*s,0,0,0,sd*(0.3+flap), 0.50*s,0.04*s,0.22*s,L.wing]);
}
function cocoonRig(out,e,t){
  var s=e.scale||1, sway=Math.sin(t*1.1+(e.seed||0))*0.08;
  var web=[0.84,0.86,0.84];
  if(e.anchor>0){ // silk line up to a branch
    out.push(['box',0,1.5*s,0,0,0,0, 0.05,e.anchor,0.05, web]);
  }
  out.push(['blobR',0,0.25*s,0,sway,0,sway*0.5, 0.95*s,2.0*s,0.95*s, web]);
  out.push(['blobR',0,0.55*s,0,sway,0,sway*0.5, 0.78*s,1.3*s,0.78*s, [0.74,0.77,0.74]]);
}

/* ---------- the newer folk of the wood (all primitives) ---------- */
/* a mushroom grump: a cross toadstool that hops after you */
function shroomRig(out,e,t){
  var s=e.scale||1, L=e.look, ph=(e.walkPhase||0)*1.3, mv=Math.min(1,(e.speed||0)/3);
  var hop=Math.abs(Math.sin(ph))*0.45*mv*s, sq=1-Math.abs(Math.cos(ph))*0.12*mv;
  var w=e.wind>0?1:0;
  out.push(['tube',0,hop,0,0,0,0, 0.62*s,0.85*s*sq,0.62*s,L.stem]);
  out.push(['blobR',0,(0.70+hop/s)*s,0, w*0.25,0,0, 1.35*s,0.78*s/sq,1.35*s,L.cap]);
  var sp=[[0.22,0.18],[-0.24,0.12],[0.04,-0.28],[-0.08,0.30],[0.30,-0.12]];
  for(var i=0;i<sp.length;i++)
    out.push(['blob',sp[i][0]*s,(1.34+hop/s)*s,sp[i][1]*s,0,0,0, 0.22*s,0.12*s,0.22*s,L.spot]);
  if(e.crown){                                   // King Puffcap's crown (a bottle cap, frankly)
    out.push(['tube',0,(1.38+hop/s)*s,0,0,0,0,0.55*s,0.22*s,0.55*s,[0.95,0.78,0.25]]);
    for(var c=0;c<6;c++){ var ca=c/6*6.283; out.push(['cone',Math.sin(ca)*0.24*s,(1.58+hop/s)*s,Math.cos(ca)*0.24*s,0,0,0,0.10*s,0.20*s,0.10*s,[0.95,0.78,0.25]]); } }
  if(typeof LOD!=='undefined'&&LOD) return;
  // angry little face, and stubby feet
  out.push(['box',-0.14*s,0.52*s+hop,0.30*s,0,0, 0.35,0.12*s,0.05*s,0.04*s,[0.08,0.06,0.05]]);
  out.push(['box', 0.14*s,0.52*s+hop,0.30*s,0,0,-0.35,0.12*s,0.05*s,0.04*s,[0.08,0.06,0.05]]);
  out.push(['blob',-0.11*s,0.38*s+hop,0.30*s,0,0,0,0.07*s,0.08*s,0.05*s,[0.08,0.06,0.05]]);
  out.push(['blob', 0.11*s,0.38*s+hop,0.30*s,0,0,0,0.07*s,0.08*s,0.05*s,[0.08,0.06,0.05]]);
  out.push(['blob',-0.18*s,hop*0.5-0.04*s,0.05*s,0,0,0,0.22*s,0.14*s,0.30*s,L.stem]);
  out.push(['blob', 0.18*s,hop*0.5-0.04*s,0.05*s,0,0,0,0.22*s,0.14*s,0.30*s,L.stem]);
}
/* the Stone Warden: boulders, moss and glowing runes. Raises both fists to slam. */
function golemRig(out,e,t){
  var s=e.scale||1, L=e.look, ph=(e.walkPhase||0), mv=Math.min(1,(e.speed||0)/2.4);
  var sw=Math.sin(ph)*0.45*mv, rise=e.riseT>0?-e.riseT*1.6:0;
  var wind=e.wind>0?(1-e.wind/(e.windFull||1)):(e.atkT>0?-1:0);
  var armUp=wind>0?wind*2.6:(wind<0?-0.4:0), lean=wind>0?-wind*0.25:(wind<0?0.35:0);
  var glow=L.rune, pulse=0.75+0.25*Math.sin(t*4);
  var gl=[glow[0]*pulse,glow[1]*pulse,glow[2]*pulse];
  var y0=rise;
  // legs: stacked stones
  out.push(['blobR',-0.75*s,y0+0.55*s, sw*0.6*s, sw,0,0, 0.95*s,1.15*s,0.95*s,L.stone]);
  out.push(['blobR', 0.75*s,y0+0.55*s,-sw*0.6*s,-sw,0,0, 0.95*s,1.15*s,0.95*s,L.stone]);
  // body: a huge boulder with moss on its shoulders and runes on its chest
  out.push(['blobR',0,y0+1.35*s,0, lean,0,0, 2.5*s,2.5*s,1.9*s,L.stone]);
  out.push(['blobR',0,y0+2.55*s,-0.15*s, lean,0,0, 2.2*s,0.9*s,1.6*s,L.moss]);
  out.push(['box',-0.35*s,y0+1.95*s,0.88*s, lean,0,0.5, 0.16*s,0.55*s,0.06*s,gl]);
  out.push(['box', 0.35*s,y0+1.95*s,0.88*s, lean,0,-0.5,0.16*s,0.55*s,0.06*s,gl]);
  out.push(['box', 0,     y0+1.55*s,0.92*s, lean,0,0,   0.50*s,0.14*s,0.06*s,gl]);
  // head: a smaller stone, two glowing eyes
  out.push(['blobR',0,y0+3.05*s,0.25*s, lean,0,0, 1.0*s,0.85*s,0.9*s,L.stone]);
  out.push(['box',-0.22*s,y0+3.45*s,0.68*s,0,0,0,0.18*s,0.12*s,0.06*s,gl]);
  out.push(['box', 0.22*s,y0+3.45*s,0.68*s,0,0,0,0.18*s,0.12*s,0.06*s,gl]);
  if(typeof LOD!=='undefined'&&LOD) return;
  // arms: three stones each, swinging, or raised overhead for the slam
  for(var sd=-1;sd<=1;sd+=2){
    var rx=-armUp+(armUp?0:sd*sw*0.6), ax=sd*1.55*s, ay=y0+2.55*s;
    for(var k=0;k<3;k++){ var r=(0.55+k*0.35)*s, dd=(0.45+k*0.7)*s;
      out.push(['blobR',ax+sd*k*0.12*s,ay-Math.cos(rx)*dd-r*0.5,Math.sin(rx)*dd,0,0,0, r*1.4,r*1.4,r*1.4,k===2?L.stone:L.dark]); }
    out.push(['blob',ax,ay+0.1*s,0,0,0,0,0.9*s,0.6*s,0.9*s,L.moss]);
  }
  // a few flowers that grew on him while he slept
  out.push(['blob',-0.6*s,y0+3.0*s,-0.3*s,0,0,0,0.22*s,0.16*s,0.22*s,[0.95,0.70,0.85]]);
  out.push(['blob', 0.7*s,y0+2.95*s,-0.5*s,0,0,0,0.20*s,0.14*s,0.20*s,[0.98,0.92,0.45]]);
}
/* the dragon. A long S-necked, horned head with a jaw that opens, ember-lit belly
   seams, a spade-tipped tail, and proper bat wings (two membrane parts, built in
   wingMesh, with finger bones) that fold over his back on the ground and beat in
   the air. */
/* where a local offset lands under m4trs's rotation (Ry * Rx * Rz) */
function trsv(rx,ry,rz,x,y,z){
  var cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
  var r00=cy*cz+sy*sx*sz, r01=cx*sz, r02=-sy*cz+cy*sx*sz;
  var r10=-cy*sz+sy*sx*cz, r11=cx*cz, r12=sy*sz+cy*sx*cz;
  var r20=sy*cx, r21=-sx, r22=cy*cx;
  return [r00*x+r01*y+r02*z, r10*x+r11*y+r12*z, r20*x+r21*y+r22*z];
}
/* a wing panel, flat in y=0, running out along +x, seen from both sides.
   part 0: shoulder to elbow, with the membrane back to the flank.
   part 1: elbow to tip: four fingers and a scalloped trailing edge. */
function wingMesh(part){
  var m=new MB(), MEM=[1,1,1], BONE=[0.38,0.30,0.30];
  function tri(a,b,c,col,y){
    var A=[a[0],y,a[1]],B=[b[0],y,b[1]],C=[c[0],y,c[1]], up=[0,1,0], dn=[0,-1,0];
    m.triV(A,C,B,up,up,up,col,col,col); m.triV(A,B,C,dn,dn,dn,col,col,col);
  }
  function bone(a,b,w){                  // a thin darker strip, a hair above and below the skin
    var dx=b[0]-a[0], dz=b[1]-a[1], l=Math.hypot(dx,dz)||1, nx=-dz/l*w, nz=dx/l*w;
    var p1=[a[0]+nx,a[1]+nz],p2=[b[0]+nx*0.4,b[1]+nz*0.4],p3=[b[0]-nx*0.4,b[1]-nz*0.4],p4=[a[0]-nx,a[1]-nz];
    [0.02,-0.02].forEach(function(y){ tri(p1,p2,p3,BONE,y); tri(p1,p3,p4,BONE,y); });
  }
  if(part===0){
    var c=[0.6,-0.7], pts=[[0,0.25],[2.2,0.42],[2.2,-0.25],[1.55,-1.35],[0.75,-2.15],[0,-2.45]];
    for(var i=0;i<pts.length-1;i++) tri(c,pts[i],pts[i+1],MEM,0);
    tri(c,pts[pts.length-1],pts[0],MEM,0);
    bone([0,0.25],[2.2,0.42],0.17);
  } else {
    var w=[0.35,0.1], tips=[[3.5,0.35],[3.05,-1.05],[2.15,-1.95],[0.95,-2.05],[0,-0.3]];
    for(var j=0;j<tips.length-1;j++){
      var A=tips[j], B=tips[j+1], M=[(A[0]+B[0])/2, (A[1]+B[1])/2];
      M=[M[0]+(w[0]-M[0])*0.22, M[1]+(w[1]-M[1])*0.22];          // the scallop between two fingers
      tri(w,A,M,MEM,0); tri(w,M,B,MEM,0);
    }
    tri(w,tips[tips.length-1],[0,0.2],MEM,0);
    bone([0,0.2],w,0.15);
    for(var k=0;k<4;k++) bone(w,tips[k],k===0?0.12:0.08);
  }
  return m;
}
function dragonRig(out,e,t){
  var s=e.scale||1, L=e.look, ph=(e.walkPhase||0), mv=Math.min(1,(e.speed||0)/4), fly=e.flyK||0;
  var LOW=(typeof LOD!=='undefined'&&LOD);
  var sleep=e.state==='sleep'||e.state==='settle'?1:0, hot=e.enraged?1:0;
  var breath=e.breathT>0, wind=e.wind>0?(1-e.wind/(e.windFull||1)):0, bite=e.windKind==='bite';
  var bob=fly?Math.sin(t*3.0)*0.3*s:Math.sin(t*1.4)*0.05*s;
  var by=(1.75-sleep*0.85)*s+bob+fly*0.3*s;
  var glowK=0.75+0.25*Math.sin(t*(hot?9:3)), ember=[Math.min(1,L.ember[0]*glowK*(1+hot*0.3)),L.ember[1]*glowK,L.ember[2]*glowK];
  var tiltB=fly?-0.12:0;
  function P(k,x,y,z,rx,ry,rz,sx,sy,sz,c){ out.push([k,x,y,z,rx,ry,rz,sx,sy,sz,c]); }
  // body: a deep chest and lean haunches, a pale armoured belly with glowing seams
  P('blobR',0,by-0.95*s,0.9*s, tiltB,0,0, 2.35*s,2.0*s,2.7*s,L.body);
  P('blobR',0,by-0.85*s,-1.35*s, tiltB,0,0, 2.0*s,1.75*s,2.6*s,L.body);
  P('blob',0,by-1.20*s,-0.1*s, tiltB,0,0, 1.75*s,1.05*s,3.9*s,L.belly);
  if(!LOW) for(var sd0=-1;sd0<=1;sd0+=2) for(var v=0;v<3;v++)
    P('box',sd0*0.78*s,by-0.55*s,(1.2-v*1.15)*s, 0,sd0*0.08,sd0*0.5, 0.08*s,0.55*s,0.55*s,ember);
  // spine plates from the shoulders back along the tail
  for(var b=0;b<6;b++) P('cone',0,by+0.78*s-(b>3?(b-3)*0.15*s:0),(1.7-b*0.75)*s, -0.25,0,0, 0.42*s,(0.95-b*0.08)*s,0.14*s,L.horn);
  // legs: haunch, shin, clawed foot; tucked up in flight, folded under when asleep
  for(var lg=0;lg<4;lg++){ var sd=(lg&1)?1:-1, front=lg<2, fz=(front?1.35:-1.55)*s, sw=Math.sin(ph+lg*1.6)*0.55*mv*(1-fly);
    var tuck=fly*1.2+sleep*1.1, hip=[sd*1.05*s,by-0.75*s,fz];
    P('blobR',hip[0],hip[1]-0.35*s,hip[2], 0,0,0, 0.85*s,1.15*s,1.05*s,L.body);
    var shin=(1.25-sleep*0.55)*s, srx=sw-tuck*(front?-0.6:1);
    P('limbT',hip[0],hip[1]-0.25*s,hip[2], srx,0,sd*0.1, 0.5*s,shin,0.5*s,L.dark);
    if(!LOW){ var fx=hip[0], fy=hip[1]-0.25*s-Math.cos(srx)*shin, fzz=hip[2]+Math.sin(srx)*shin;
      P('blob',fx,fy-0.12*s,fzz+0.15*s,0,0,0,0.62*s,0.32*s,0.85*s,L.dark);
      for(var cl=-1;cl<=1;cl++) P('cone',fx+cl*0.2*s,fy-0.05*s,fzz+0.55*s,-1.3,0,0,0.12*s,0.38*s,0.12*s,L.horn); }
  }
  // the neck: an S-curve from the chest up to the head. Asleep it lies along the
  // ground; winding up a breath it draws back, then thrusts the head forward.
  var sway=Math.sin(t*1.1)*0.35*(1-sleep), lift=(e.headLift===undefined?1:e.headLift);
  var draw=(e.windKind==='breath'&&e.wind>0)?wind:0, thrust=breath?1:(bite&&e.wind>0?wind:0);
  var N=8, hx=0, hy=by, hz=0, prev=null;
  for(var i=1;i<=N;i++){ var k=i/N;
    var up=(sleep?(-0.55*k):(2.1*k+Math.sin(k*Math.PI)*0.35)*(0.35+0.65*lift))-draw*0.9*k+thrust*(-0.5*k);
    hx=Math.sin(sway*k*1.5)*0.9*s*k; hy=by+0.25*s+up*s; hz=(2.15+k*(3.0+thrust*0.9-draw*0.8)+sleep*k*0.3)*s;
    var r=(1.08-k*0.48)*s;
    P('blobR',hx,hy-r*0.5,hz,0,0,0,r*1.05,r,r*1.15,L.body);
    if(!LOW&&i<N) P('cone',hx,hy+r*0.35,hz-0.1*s,-0.35,0,0,0.3*s,(0.6-k*0.25)*s,0.12*s,L.horn);
    if(!LOW) P('blob',hx,hy-r*0.85,hz+0.15*s,0,0,0,r*0.75,r*0.5,r*0.9,L.belly);
  }
  // the head: a horned skull, a long snout, a jaw that drops, teeth, burning eyes
  var hd=hz+0.55*s, hh=hy-0.15*s, look=e.headPitch||0, jaw=breath?0.75:(e.wind>0?0.25+wind*0.4:(sleep?0:0.08+Math.max(0,Math.sin(t*0.7))*0.05));
  P('blobR',hx,hh-0.45*s,hd,look,0,0,1.15*s,0.95*s,1.35*s,L.body);
  P('cone',hx,hh+0.05*s,hd+0.45*s,-1.57+look,0,0,0.95*s,1.85*s,0.6*s,L.body);              // snout
  P('cone',hx,hh-0.30*s,hd+0.35*s,-1.57-jaw+look,0,0,0.80*s,1.65*s,0.34*s,L.dark);          // jaw
  var thr=breath||e.windKind==='breath'&&e.wind>0;
  if(thr) P('blob',hx,hh-0.35*s,hd+0.55*s,0,0,0,0.6*s,0.45*s,0.9*s,[1.0,0.85,0.35]);       // the fire in his throat
  if(!LOW){
    for(var tq=0;tq<4;tq++) for(var sd2=-1;sd2<=1;sd2+=2)
      P('cone',hx+sd2*(0.32-tq*0.06)*s,hh-0.02*s,hd+(0.55+tq*0.32)*s,3.14,0,0,0.09*s,0.22*s,0.09*s,[0.96,0.94,0.86]);
    for(var sd3=-1;sd3<=1;sd3+=2){
      P('cone',hx+sd3*0.42*s,hh+0.30*s,hd-0.35*s, 1.05,0,sd3*-0.35, 0.30*s,1.75*s,0.30*s,L.horn);      // great horns, swept back
      P('cone',hx+sd3*0.58*s,hh-0.05*s,hd-0.55*s, 1.35,0,sd3*-0.9, 0.18*s,0.85*s,0.18*s,L.horn);
      P('cone',hx+sd3*0.55*s,hh-0.30*s,hd-0.10*s, 1.57,sd3*0.5,0, 0.55*s,0.75*s,0.06*s,L.wing);        // cheek frills
      P('box',hx+sd3*0.36*s,hh+0.12*s,hd+0.25*s,0.35,0,sd3*0.25,0.34*s,0.12*s,0.42*s,L.dark);          // brow ridge
    }
  }
  var eye=sleep?L.dark:(hot?[1.0,0.35,0.15]:L.eye);
  P('box',hx-0.34*s,hh+0.02*s,hd+0.30*s,0,0,0,0.20*s,0.12*s,0.22*s,eye);
  P('box',hx+0.34*s,hh+0.02*s,hd+0.30*s,0,0,0,0.20*s,0.12*s,0.22*s,eye);
  e.mouth={x:hx,y:hh-0.2*s,z:hd+2.1*s};
  e.nose={x:hx,y:hh+0.25*s,z:hd+1.9*s};
  // the tail: long, swishing, a spade at the end
  var tx=0, ty=by, tz=-2.8*s, TN=LOW?5:10;
  for(var j=1;j<=TN;j++){ var q=j/TN, sw3=Math.sin(t*(fly?2.6:1.5)-q*2.6)*1.3*q*s*(1-sleep*0.6)+sleep*q*q*2.5*s;
    tx=sw3; ty=by-0.75*s-q*(0.7-fly*0.5)*s+(sleep?-0.25*s*q:0); tz=(-2.8-q*6.4+sleep*q*q*1.5)*s;
    var rr=(0.85-q*0.62)*s;
    P('blobR',tx,ty-rr*0.5,tz,0,0,0,rr*1.1,rr,rr*1.4,j&1?L.body:L.dark);
    if(!LOW&&j%2===0) P('cone',tx,ty+rr*0.3,tz,-0.4,0,0,0.25*s,(0.5-q*0.3)*s,0.1*s,L.horn); }
  P('cone',tx,ty-0.15*s,tz-0.45*s,-1.57,0,0,0.95*s,0.9*s,0.08*s,L.horn);
  P('cone',tx,ty-0.15*s,tz-0.25*s,1.57,0,0,0.95*s,0.5*s,0.08*s,L.horn);
  // wings: roll raises them (a box turned by -sd*al about z points along (sd cos al, sin al));
  // yaw sweeps them back. The outer panel hinges at the elbow.
  var W=1.05*s, flapW=e.state==='takeoff'?8.5:(e.state==='land'?6:4.6);
  var flap=Math.sin(t*flapW), beat=fly?1:0;
  for(var sd4=-1;sd4<=1;sd4+=2){
    var al, sweep, al2, sweep2;
    if(beat){ al=0.18+flap*0.78; sweep=0.05; al2=al+flap*0.35-0.05; sweep2=0.05; }
    else if(sleep){ al=0.2; sweep=0.95; al2=al+2.75; sweep2=0.95; }
    else { var alert=e.wind>0||breath?0.4:0; al=0.95+alert+Math.sin(t*1.2)*0.04; sweep=0.55-alert*0.4; al2=al+2.25-alert*0.9; sweep2=sweep; }
    var sh=[sd4*0.95*s,by+0.55*s,1.0*s];
    P('wingIn',sh[0],sh[1],sh[2],0,-sd4*sweep,-sd4*al,sd4*W,W,W,L.wing);
    var el=trsv(0,-sd4*sweep,-sd4*al,sd4*2.2*W,0,0.42*W);
    P('wingOut',sh[0]+el[0],sh[1]+el[1],sh[2]+el[2],0,-sd4*sweep2,-sd4*al2,sd4*W,W,W,L.wing);
    if(!LOW){ var tip=trsv(0,-sd4*sweep2,-sd4*al2,sd4*3.5*W,0,0.35*W);
      P('cone',sh[0]+el[0]+tip[0],sh[1]+el[1]+tip[1],sh[2]+el[2]+tip[2],-1.2,0,0,0.16*s,0.5*s,0.16*s,L.horn);
      P('blob',sh[0]+el[0],sh[1]+el[1]-0.15*s,sh[2]+el[2],0,0,0,0.35*s,0.3*s,0.35*s,L.dark); }
  }
}
/* ambient life: butterflies, rabbits and the gnomes hiding about the wood */
function flyRig(out,e,t){
  var f=Math.sin(t*16+e.seed*5)*1.0, c=e.col, s=0.35;
  out.push(['blob',0,0,0,0,0,0,0.06,0.06,0.22,[0.15,0.12,0.10]]);
  out.push(['box',-0.12*s/0.35, 0,0, 0,0, 0.3+f, 0.36,0.02,0.30,c]);
  out.push(['box', 0.12*s/0.35, 0,0, 0,0,-0.3-f, 0.36,0.02,0.30,c]);
}
function bunnyRig(out,e,t){
  var hop=e.hopH||0, c=e.col, sit=e.speed>0.5?0:1;
  out.push(['blob',0,0.25+hop,-0.05,0,0,0,0.42,0.40,0.55,c]);
  out.push(['blob',0,0.48+hop,0.24,0,0,0,0.30,0.30,0.30,c]);
  out.push(['blob',-0.07,0.75+hop,0.22,0.15*sit,0,0.12,0.08,0.34,0.06,c]);
  out.push(['blob', 0.07,0.75+hop,0.22,0.15*sit,0,-0.12,0.08,0.34,0.06,c]);
  out.push(['blob',0,0.28+hop,-0.34,0,0,0,0.16,0.16,0.16,[0.95,0.94,0.92]]);
  if(!(typeof LOD!=='undefined'&&LOD)){
    out.push(['box',-0.08,0.53+hop,0.38,0,0,0,0.04,0.05,0.02,[0.08,0.06,0.06]]);
    out.push(['box', 0.08,0.53+hop,0.38,0,0,0,0.04,0.05,0.02,[0.08,0.06,0.06]]);
  }
}
function gnomeRig(out,e,t){
  var b=Math.abs(Math.sin(t*3+e.seed))*0.06, hat=e.hat||[0.82,0.18,0.16];
  out.push(['tube',0,b,0,0,0,0,0.42,0.42,0.38,[0.26,0.38,0.66]]);
  out.push(['blob',0,0.44+b,0,0,0,0,0.30,0.28,0.30,[0.90,0.72,0.58]]);
  out.push(['blob',0,0.38+b,0.09,0,0,0,0.26,0.26,0.16,[0.95,0.95,0.93]]);
  out.push(['blob',0,0.47+b,0.16,0,0,0,0.08,0.08,0.08,[0.92,0.55,0.48]]);
  out.push(['cone8',0,0.52+b,-0.02,-0.15+Math.sin(t*2+e.seed)*0.08,0,0,0.34,0.62,0.34,hat]);
  out.push(['blob',-0.11,b,0.06,0,0,0,0.12,0.08,0.18,[0.30,0.20,0.12]]);
  out.push(['blob', 0.11,b,0.06,0,0,0,0.12,0.08,0.18,[0.30,0.20,0.12]]);
}
