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
/* the dragon: long neck, wings that fold on the ground and beat in the air */
function dragonRig(out,e,t){
  var s=e.scale||1, L=e.look, ph=(e.walkPhase||0), mv=Math.min(1,(e.speed||0)/4), fly=e.flyK||0;
  var sleep=e.state==='sleep'?1:0;
  var bob=fly?Math.sin(t*3.2)*0.25*s:0;
  var by=(1.7-sleep*0.7)*s+bob;
  var breath=e.breathT>0||e.wind>0&&e.windKind==='breath';
  var jaw=breath?0.55:(e.wind>0?0.35:0.05);
  // body and belly
  out.push(['blobR',0,by,0, fly*0.12,0,0, 2.4*s,2.0*s,4.2*s,L.body]);
  out.push(['blob',0,by-0.45*s,0.3*s, fly*0.12,0,0, 1.9*s,1.3*s,3.4*s,L.belly]);
  // legs (tucked up in flight)
  for(var lg=0;lg<4;lg++){ var sd=(lg&1)?1:-1, fz=(lg<2?1.2:-1.2)*s, sw=Math.sin(ph+lg*1.6)*0.5*mv*(1-fly);
    out.push(['limbT',sd*1.0*s,by-0.2*s,fz, sw-fly*1.1,0,sd*0.25, 0.55*s,(1.4-sleep*0.6)*s,0.55*s,L.body]);
    if(!(typeof LOD!=='undefined'&&LOD)) out.push(['blob',sd*1.05*s,by-(1.5-sleep*0.6)*s+fly*1.0*s,fz+0.25*s+fly*0.6*s,0,0,0,0.6*s,0.35*s,0.8*s,L.dark]); }
  // neck: a chain of blobs rising forward to the head
  var sway=Math.sin(t*1.3)*0.3*(1-sleep), nk=5, hx=0, hy=by, hz=0;
  var look=e.headLift||0;
  for(var i=1;i<=nk;i++){ var k=i/nk;
    hx=Math.sin(sway*k)*0.6*s*k; hy=by+(0.5+k*(1.7-sleep*1.9+look))*s; hz=(1.9+k*2.2)*s;
    out.push(['blobR',hx,hy,hz,0,0,0,(1.15-k*0.35)*s,(1.15-k*0.35)*s,(1.25-k*0.35)*s,i&1?L.body:L.dark]); }
  // head, snout, jaw, horns, eyes
  var hz2=hz+0.9*s;
  out.push(['blobR',hx,hy+0.2*s,hz2,0,0,0,1.1*s,0.85*s,1.5*s,L.body]);
  out.push(['box',hx,hy+0.05*s,hz2+0.9*s,-0.08,0,0,0.75*s,0.45*s,1.2*s,L.body]);
  out.push(['box',hx,hy-0.30*s,hz2+0.6*s,jaw,0,0,0.65*s,0.20*s,1.1*s,L.dark]);
  out.push(['cone',hx-0.35*s,hy+0.55*s,hz2-0.3*s,-1.0,0,0.25,0.22*s,1.0*s,0.22*s,L.horn]);
  out.push(['cone',hx+0.35*s,hy+0.55*s,hz2-0.3*s,-1.0,0,-0.25,0.22*s,1.0*s,0.22*s,L.horn]);
  var eye=sleep?L.dark:L.eye;
  out.push(['box',hx-0.36*s,hy+0.38*s,hz2+0.45*s,0,0,0,0.18*s,0.12*s,0.25*s,eye]);
  out.push(['box',hx+0.36*s,hy+0.38*s,hz2+0.45*s,0,0,0,0.18*s,0.12*s,0.25*s,eye]);
  e.mouth={x:hx,y:hy,z:hz2+1.5*s};
  // tail: a tapering chain that swishes
  var tx=0, ty=by, tz=-2.0*s;
  for(var j=1;j<=7;j++){ var q=j/7, sw2=Math.sin(t*1.8-q*2.4)*0.9*q*s;
    tx=sw2; ty=by-q*1.1*s+fly*q*0.6*s; tz=(-2.0-q*5.2)*s;
    out.push(['blobR',tx,ty,tz,0,0,0,(0.95-q*0.7)*s,(0.85-q*0.6)*s,(1.1-q*0.6)*s,j&1?L.body:L.dark]);
    if(j<6&&!(typeof LOD!=='undefined'&&LOD)) out.push(['cone',tx,ty+(0.4-q*0.3)*s,tz,0,0,0,0.25*s,(0.6-q*0.4)*s,0.25*s,L.horn]); }
  out.push(['cone',tx,ty,tz-0.5*s,-1.57,0,0,0.7*s,0.9*s,0.12*s,L.horn]);
  // spines along the back
  for(var b=0;b<5;b++) out.push(['cone',0,by+0.95*s,(1.4-b*0.75)*s,0,0,0,0.30*s,0.7*s,0.30*s,L.horn]);
  // wings: two panels and a bony leading edge each; folded over the back on the
  // ground, beating in the air. (A box turned by -sd*al about z points along
  // (sd*cos al, sin al), so al is how far the wing is raised.)
  var flap=fly?Math.sin(t*(e.state==='takeoff'?9:5.5))*0.7:0, fold=fly?0:1;
  for(var sd2=-1;sd2<=1;sd2+=2){
    var al=fold?0.45:(0.2+flap), span=(fold?2.3:4.8)*s, sx=sd2*0.9*s, wy=by+0.9*s;
    var cxw=sx+sd2*Math.cos(al)*span*0.5, cyw=wy+Math.sin(al)*span*0.5;
    out.push(['box',cxw,cyw,-0.4*s, 0,0,-sd2*al, span,0.10*s,(fold?1.7:3.6)*s, L.wing]);
    out.push(['box',cxw,cyw,1.25*s, 0,0,-sd2*al, span,0.26*s,0.26*s, L.dark]);
    var al2=fold?al+0.55:al+flap*0.5-0.1, ex=sx+sd2*Math.cos(al)*span, ey=wy+Math.sin(al)*span;
    var ox=ex+sd2*Math.cos(al2)*span*0.42, oy=ey+Math.sin(al2)*span*0.42;
    out.push(['box',ox,oy,-0.7*s, 0,0,-sd2*al2, span*0.84,0.08*s,(fold?1.3:2.8)*s, L.wing]);
    out.push(['box',ox,oy,0.85*s, 0,0,-sd2*al2, span*0.84,0.22*s,0.22*s, L.dark]);
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
