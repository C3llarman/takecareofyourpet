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
