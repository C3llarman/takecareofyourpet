/* ---------- noise / terrain ---------- */
var WSIZE=300, WHALF=WSIZE/2, WATER=-1.6;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
var RNG=mulberry(1337);
var GRAD=[];
(function(){var r=mulberry(99);for(var i=0;i<512;i++)GRAD.push(r());})();
function vnoise(x,z){
  var xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi;
  function g(a,b){return GRAD[(((a*73856093)^(b*19349663))>>>0)%512];}
  var u=xf*xf*(3-2*xf), v=zf*zf*(3-2*zf);
  var a=g(xi,zi),b=g(xi+1,zi),c=g(xi,zi+1),d=g(xi+1,zi+1);
  return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;
}
function fbm(x,z,oct,sc){
  var s=0,amp=1,fr=sc,norm=0;
  for(var i=0;i<oct;i++){ s+=vnoise(x*fr,z*fr)*amp; norm+=amp; amp*=0.5; fr*=2.07; }
  return s/norm;
}
/* the tavern sits on a level yard at the end of a dirt path from the glade */
var TAVERN={x:0,z:-34,ry:0.5,yard:19,flat:15,h:null};
/* the old cottage, out past the tavern on a quiet rise (see home.js) */
var HOUSE={x:35,z:-60,ry:-0.9,yard:17,flat:14,h:null};
var FLATS=[TAVERN,HOUSE];
/* the Dragon's Crag: a sheer-sided plateau north of the tavern, one ramp up, a
   cave in its western face. The dragon sleeps on top. */
var CRAG={x:-16,z:-106,r:14,top:null,rd:[0.15,0.989],rl:28,rw:2.7,endH:null,
  box:[-36,6,-126,-60]};          // the high-detail ground patch (aligned to the 3-unit terrain grid)
CRAG.mouth={x:CRAG.x-CRAG.r-3.6,z:CRAG.z+0.6};
CRAG.lair={x:CRAG.x+2,z:CRAG.z-3};
/* the Glimmer Cave lies far off the map: walking into the mouth carries you there */
var CAVE={x:0,z:420,y:2,z0:330,w:3.1,
  rooms:[[0,-40,7],[10,-22,9],[-8,-6,11],[14,10,9],[-4,24,12],[14,38,8]],
  links:[[0,1],[1,2],[2,3],[1,3],[3,4],[4,5]]};
CAVE.exit={x:CAVE.x-1.5,z:CAVE.z-44};
CAVE.chest={x:CAVE.x+15,z:CAVE.z+41};
/* bouncy toadstools: a fairy ring by the glade and a few strays in the meadows */
var BOUNCE=[];
(function(){
  var cx=-18,cz=19;
  for(var i=0;i<6;i++){ var a=i/6*6.283; BOUNCE.push({x:cx+Math.cos(a)*4.6,z:cz+Math.sin(a)*4.6}); }
  [[24,-12],[-52,-30],[58,22],[-110,8],[100,-20],[-40,96],[30,-100]].forEach(function(p){ BOUNCE.push({x:p[0],z:p[1]}); });
})();
var FAIRYRING={x:-18,z:19};
/* waystones: old carved stones with something written on them (see legends.js) */
var WAYSTONES=[{id:'way1',x:10,z:-12},{id:'way2',x:-2,z:-58},{id:'way3',x:52,z:-40},{id:'way4',x:0,z:76},{id:'way5',x:-47,z:-26}];
/* clearings kept free of trees: landmark grounds and the paths */
var CLEAR=[[0,-34,20],[-72,48,15],[86,-56,15],[-88,-78,11],[35,-60,20],[-18,19,8]];
BOUNCE.forEach(function(b){ CLEAR.push([b.x,b.z,2.6]); });
WAYSTONES.forEach(function(w){ CLEAR.push([w.x,w.z,3]); });
function pathDist(x,z){            // distance to the nearest path: glade -> tavern door, tavern -> cottage
  var t=clamp01((z-4)/(-29-4)), px=0+1.4*t*t, pz=4+(-29-4)*t;
  return Math.min(Math.hypot(x-px,z-pz), segDist(x,z,7,-29,30.5,-54.5));
}
function segDist(x,z,ax,az,bx,bz){
  var dx=bx-ax, dz=bz-az, t=clamp01(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz));
  return Math.hypot(x-ax-dx*t, z-az-dz*t);
}
function clamp01(v){ return v<0?0:(v>1?1:v); }
function inClearing(x,z,pad){
  for(var i=0;i<CLEAR.length;i++){ var c=CLEAR[i]; if(Math.hypot(x-c[0],z-c[1])<c[2]+(pad||0)) return true; }
  if(cragZone(x,z)<4+(pad||0)) return true;
  if(Math.hypot(x-CRAG.mouth.x,z-CRAG.mouth.z)<6) return true;
  return pathDist(x,z)<3.2+(pad||0);
}
/* how far a point is outside the crag (its plateau and its ramp); negative inside */
function cragZone(x,z){
  var dx=x-CRAG.x, dz=z-CRAG.z, d=Math.hypot(dx,dz)-CRAG.r-3;
  var along=dx*CRAG.rd[0]+dz*CRAG.rd[1], lat=Math.abs(-dx*CRAG.rd[1]+dz*CRAG.rd[0]);
  if(along>0&&along<CRAG.r+CRAG.rl) d=Math.min(d,lat-CRAG.rw-1.6);
  return d;
}
/* world height */
function H(x,z){
  if(z>CAVE.z0) return caveH(x,z);
  var h=Hraw(x,z);
  // level the tavern yard and the cottage's plot
  for(var i=0;i<FLATS.length;i++){ var F=FLATS[i], dt=Math.hypot(x-F.x,z-F.z);
    if(dt<F.flat*2.2){
      if(F.h===null) F.h=Hraw(F.x,F.z);
      var w=Math.exp(-Math.pow(dt/F.flat,4));
      h=h*(1-w)+F.h*w;
    }
  }
  return cragH(x,z,h);
}
/* the crag: a level top with a sheer edge, and a ramp down one side */
function cragH(x,z,h){
  var dx=x-CRAG.x, dz=z-CRAG.z, d=Math.hypot(dx,dz);
  if(d>CRAG.r+CRAG.rl+8) return h;
  if(CRAG.top===null){ CRAG.top=Hraw(CRAG.x,CRAG.z)+13;
    CRAG.endH=Hraw(CRAG.x+CRAG.rd[0]*(CRAG.r+CRAG.rl),CRAG.z+CRAG.rd[1]*(CRAG.r+CRAG.rl)); }
  var T=CRAG.top, w=1-smooth01((d-CRAG.r)/2.6);
  var rough=(vnoise(x*0.6,z*0.6)-0.5)*1.4*(1-w)*w*4;     // a broken, rocky lip
  var out=h*(1-w)+T*w+rough;
  var along=dx*CRAG.rd[0]+dz*CRAG.rd[1], lat=Math.abs(-dx*CRAG.rd[1]+dz*CRAG.rd[0]);
  if(along>CRAG.r-3&&along<CRAG.r+CRAG.rl+1&&lat<CRAG.rw+2){
    var t=clamp01((along-CRAG.r)/CRAG.rl), rh=T+(CRAG.endH-T)*t*t*(3-2*t)*0.6+(CRAG.endH-T)*t*0.4;
    var lw=1-smooth01((lat-CRAG.rw)/1.8);
    if(rh>out) out+=(rh-out)*lw;
  }
  return out;
}
function onCrag(x,z,y){ return CRAG.top!==null&&Math.hypot(x-CRAG.x,z-CRAG.z)<CRAG.r+1&&y>CRAG.top-2.5; }

/* ---------- the Glimmer Cave ----------
   A set of chambers joined by tunnels, as a signed distance: negative inside.
   The floor is gently lumpy, the walls climb steeply into the dark. */
function caveSD(x,z){
  var lx=x-CAVE.x, lz=z-CAVE.z, d=1e9, R=CAVE.rooms;
  for(var i=0;i<R.length;i++){ var q=Math.hypot(lx-R[i][0],lz-R[i][1])-R[i][2]; if(q<d) d=q; }
  for(var j=0;j<CAVE.links.length;j++){ var a=R[CAVE.links[j][0]], b=R[CAVE.links[j][1]];
    var q2=segDist(lx,lz,a[0],a[1],b[0],b[1])-CAVE.w; if(q2<d) d=q2; }
  return d+(vnoise(x*0.35,z*0.35)-0.5)*1.2;
}
function inCave(x,z){ return z>CAVE.z0; }
function caveH(x,z){
  var sd=caveSD(x,z), n=vnoise(x*0.5+40,z*0.5);
  if(sd<0) return CAVE.y+n*0.35;
  return CAVE.y+n*0.35+Math.min(12,sd*2.4+sd*sd*0.6);
}
/* push a body back out of the cave walls */
function caveCollide(o,rad){
  var sd=caveSD(o.x,o.z); if(sd<-rad) return false;
  var e=0.25, gx=caveSD(o.x+e,o.z)-caveSD(o.x-e,o.z), gz=caveSD(o.x,o.z+e)-caveSD(o.x,o.z-e), gl=Math.hypot(gx,gz)||1;
  var push=sd+rad; o.x-=gx/gl*push; o.z-=gz/gl*push;
  return true;
}
function Hraw(x,z){
  var d=Math.hypot(x,z)/WHALF;
  var base=fbm(x,z,4,0.012)*2-1;
  var hills=fbm(x+120,z-80,3,0.03)*2-1;
  var h=base*12.5 + hills*5.2 + 3.0;
  // a winding river, kept well clear of the starting glade
  var rz=z-58+Math.sin(x*0.035)*16;
  h-=Math.exp(-Math.pow(rz/13,2))*8.5;
  // mountain rim so the wood feels bounded
  h+=Math.min(34,Math.pow(Math.max(0,d-0.70)/0.30,2)*30);
  // flatten the glade you wake up in
  var g=Math.exp(-Math.pow(Math.hypot(x,z)/19,2));
  h=h*(1-g)+1.4*g;
  return h;
}
function Hn(x,z){ // normal-ish slope 0..1
  var e=1.2, hl=H(x-e,z),hr=H(x+e,z),hd=H(x,z-e),hu=H(x,z+e);
  return Math.min(1,Math.hypot(hr-hl,hu-hd)/(2*e)*0.9);
}
var C_GRASS=[0.30,0.47,0.22], C_GRASS2=[0.22,0.37,0.18], C_DIRT=[0.36,0.27,0.17],
    C_ROCK=[0.38,0.38,0.40], C_SAND=[0.56,0.50,0.33], C_WATER=[0.16,0.33,0.42],
    C_PATH=[0.45,0.36,0.24];

/* ground colour at a point: drifts smoothly (no checkerboard) and blends
   grass -> dirt -> rock with slope, sand near the water */
function groundCol(x,z,y){
  var sl=Hn(x,z), g=fbm(x+311,z-97,2,0.045);
  var col=mix3(C_GRASS2,C_GRASS,g);
  // a worn dirt path to the tavern door, and a trodden yard in front of it
  var pd=pathDist(x,z), yd=Math.hypot(x-TAVERN.x-2.2,z-TAVERN.z-6.5);
  col=mix3(col,C_PATH,Math.max(1-smooth01((pd-1.0)/1.4),(1-smooth01((yd-5.5)/3.5))*0.8)*(0.85+g*0.3));
  col=mix3(col,C_DIRT,smooth01((sl-0.26)/0.16));
  col=mix3(col,C_ROCK,smooth01((sl-0.48)/0.14));
  return mix3(col,C_SAND,smooth01((WATER+0.9-y)/0.6));
}
function terrainMesh(){
  var m=new MB(), N=100, S=WSIZE/N, e=0.8;
  // shared grid of heights, smooth normals and colours, so hills roll instead of facet
  var P=[], NN=[], CC=[];
  for(var i=0;i<=N;i++) for(var j=0;j<=N;j++){
    var x=-WHALF+i*S, z=-WHALF+j*S, y=H(x,z);
    P.push([x,y,z]);
    NN.push(nrm([H(x-e,z)-H(x+e,z),2*e,H(x,z-e)-H(x,z+e)]));
    var c=groundCol(x,z,y), t=(RNG()-0.5)*0.025;
    CC.push([Math.max(0,c[0]+t),Math.max(0,c[1]+t),Math.max(0,c[2]+t)]);
  }
  function id(i,j){ return i*(N+1)+j; }
  var B=CRAG.box;
  for(var i2=0;i2<N;i2++) for(var j2=0;j2<N;j2++){
    var qx=-WHALF+(i2+0.5)*S, qz=-WHALF+(j2+0.5)*S;
    if(qx>B[0]&&qx<B[1]&&qz>B[2]&&qz<B[3]) continue;       // the crag gets its own finer patch
    var a=id(i2,j2), b=id(i2+1,j2), c2=id(i2+1,j2+1), d=id(i2,j2+1);
    m.triV(P[a],P[c2],P[b],NN[a],NN[c2],NN[b],CC[a],CC[c2],CC[b]);
    m.triV(P[a],P[d],P[c2],NN[a],NN[d],NN[c2],CC[a],CC[d],CC[c2]);
  }
  cragPatch(m,S);
  // water plane
  var wc=C_WATER;
  for(var i2=0;i2<22;i2++) for(var j2=0;j2<22;j2++){
    var a=-WHALF+i2*(WSIZE/22), b=-WHALF+j2*(WSIZE/22), s2=WSIZE/22;
    m.quad([a,WATER,b],[a,WATER,b+s2],[a+s2,WATER,b+s2],[a+s2,WATER,b],wc,1);
  }
  return m;
}

/* the crag's ground at 1-unit spacing, so its sheer edge and ramp read crisply.
   Vertices on the patch's rim follow the coarse grid's edges exactly, so no cracks. */
function cragPatch(m,S){
  var B=CRAG.box, nx=Math.round(B[1]-B[0]), nz=Math.round(B[3]-B[2]), e=0.5, P=[], NN=[], CC=[];
  function coarse(x,z){        // the coarse mesh's height along its grid lines
    var fx=(x+WHALF)/S, fz=(z+WHALF)/S, ix=Math.floor(fx+1e-6), iz=Math.floor(fz+1e-6), tx=fx-ix, tz=fz-iz;
    if(tx<1e-4) return H(-WHALF+ix*S,-WHALF+iz*S)*(1-tz)+H(-WHALF+ix*S,-WHALF+(iz+1)*S)*tz;
    return H(-WHALF+ix*S,-WHALF+iz*S)*(1-tx)+H(-WHALF+(ix+1)*S,-WHALF+iz*S)*tx;
  }
  for(var i=0;i<=nx;i++) for(var j=0;j<=nz;j++){
    var x=B[0]+i, z=B[2]+j, rim=(i===0||j===0||i===nx||j===nz), y=rim?coarse(x,z):H(x,z);
    P.push([x,y,z]); NN.push(nrm([H(x-e,z)-H(x+e,z),2*e,H(x,z-e)-H(x,z+e)]));
    var c=groundCol(x,z,y);
    var top=CRAG.top!==null&&y>CRAG.top-1.5&&Math.hypot(x-CRAG.x,z-CRAG.z)<CRAG.r;
    if(top) c=mix3(c,[0.34,0.30,0.26],0.55);                 // scorched, trampled ground up top
    var t=(RNG()-0.5)*0.03; CC.push([Math.max(0,c[0]+t),Math.max(0,c[1]+t),Math.max(0,c[2]+t)]);
  }
  function id(i,j){ return i*(nz+1)+j; }
  for(var a=0;a<nx;a++) for(var b=0;b<nz;b++){
    var A=id(a,b), Bq=id(a+1,b), C=id(a+1,b+1), D=id(a,b+1);
    m.triV(P[A],P[C],P[Bq],NN[A],NN[C],NN[Bq],CC[A],CC[C],CC[Bq]);
    m.triV(P[A],P[D],P[C],NN[A],NN[D],NN[C],CC[A],CC[D],CC[C]);
  }
}

function mix3(a,b,t){ t=t<0?0:(t>1?1:t); return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }
function smooth01(t){ t=t<0?0:(t>1?1:t); return t*t*(3-2*t); }

/* ---------- solid props ----------
   Trunks, rocks and buildings are baked into the world mesh, so they also get a
   record here: circles and rotated boxes in a coarse grid, used to stop the
   hunter and the creatures walking through them. */
var COLL=[], CGRID={}, CCELL=8;
function cKey(ix,iz){ return ix*1000+iz; }
function addColl(c){
  var r=c.r||Math.hypot(c.hx,c.hz);
  var i0=Math.floor((c.x-r)/CCELL), i1=Math.floor((c.x+r)/CCELL);
  var j0=Math.floor((c.z-r)/CCELL), j1=Math.floor((c.z+r)/CCELL);
  for(var i=i0;i<=i1;i++) for(var j=j0;j<=j1;j++){
    var k=cKey(i,j); (CGRID[k]||(CGRID[k]=[])).push(c);
  }
  COLL.push(c);
}
function collCircle(x,z,r,h){ addColl({x:x,z:z,r:r,h:h||99}); }
function collBox(x,z,hx,hz,ry){ addColl({x:x,z:z,hx:hx,hz:hz,c:Math.cos(ry),s:Math.sin(ry),box:1,h:99}); }
/* is the point (x, height above ground hy, z) inside something solid? arrows stick there */
function solidAt(x,z,hy){
  var L=CGRID[cKey(Math.floor(x/CCELL),Math.floor(z/CCELL))]; if(!L) return false;
  for(var n=0;n<L.length;n++){ var c=L[n]; if(hy>c.h) continue;
    var dx=x-c.x, dz=z-c.z;
    if(!c.box){ if(dx*dx+dz*dz<c.r*c.r) return true; }
    else { var lx=dx*c.c-dz*c.s, lz=dx*c.s+dz*c.c; if(Math.abs(lx)<c.hx&&Math.abs(lz)<c.hz) return true; }
  }
  return false;
}
/* push a circle of radius rad at (o.x,o.z) out of every solid it overlaps */
function collide(o,rad){
  var hitAny=false;
  var ix=Math.floor(o.x/CCELL), iz=Math.floor(o.z/CCELL);
  for(var i=ix-1;i<=ix+1;i++) for(var j=iz-1;j<=iz+1;j++){
    var L=CGRID[cKey(i,j)]; if(!L) continue;
    for(var n=0;n<L.length;n++){
      var c=L[n], dx=o.x-c.x, dz=o.z-c.z;
      if(!c.box){
        var R=c.r+rad, d2=dx*dx+dz*dz;
        if(d2<R*R){ var d=Math.sqrt(d2)||0.001; o.x=c.x+dx/d*R; o.z=c.z+dz/d*R; hitAny=true; }
      } else {
        // into box space (inverse of addMesh's rotation)
        var lx=dx*c.c-dz*c.s, lz=dx*c.s+dz*c.c;
        var qx=Math.max(-c.hx,Math.min(c.hx,lx)), qz=Math.max(-c.hz,Math.min(c.hz,lz));
        var ex=lx-qx, ez=lz-qz, e2=ex*ex+ez*ez;
        if(e2<rad*rad){
          if(e2>1e-6){ var e=Math.sqrt(e2); lx=qx+ex/e*rad; lz=qz+ez/e*rad; }
          else { // centre is inside: leave by the nearest face
            var px=c.hx-Math.abs(lx), pz=c.hz-Math.abs(lz);
            if(px<pz) lx=(lx<0?-1:1)*(c.hx+rad); else lz=(lz<0?-1:1)*(c.hz+rad);
          }
          o.x=c.x+lx*c.c+lz*c.s; o.z=c.z-lx*c.s+lz*c.c; hitAny=true;
        }
      }
    }
  }
  if(o.z>CAVE.z0&&caveCollide(o,rad)) hitAny=true;
  return hitAny;
}

/* ---------- props ---------- */
function addMesh(dst,src,tx,ty,tz,ry,sx,sy,sz,tint){
  var c=Math.cos(ry),s=Math.sin(ry);
  for(var i=0;i<src.p.length;i+=3){
    var x=src.p[i]*sx, y=src.p[i+1]*sy, z=src.p[i+2]*sz;
    dst.p.push(x*c+z*s+tx, y+ty, -x*s+z*c+tz);
    var nx=src.n[i]/sx, ny=src.n[i+1]/sy, nz=src.n[i+2]/sz;
    var l=Math.hypot(nx,ny,nz)||1; nx/=l;ny/=l;nz/=l;
    dst.n.push(nx*c+nz*s, ny, -nx*s+nz*c);
    if(tint){ dst.c.push(src.c[i]*tint[0],src.c[i+1]*tint[1],src.c[i+2]*tint[2]); }
    else dst.c.push(src.c[i],src.c[i+1],src.c[i+2]);
    dst.f.push(src.f[i]===1?1:2);   // 2 = prop: may be cut away when it hides the hunter
  }
}
var PINE_A=null,PINE_B=null,OAK_A=null,TRUNK=null,ROCK=null,SHROOM=null,FERN=null,STUMP=null;
function initProps(){
  // round, smooth-shaded props (trunks were square boxes, canopies were facets)
  TRUNK=coneMesh([0.26,0.19,0.13],7,0.5,0.36,true);
  PINE_A=coneMesh([0.17,0.33,0.19],9,0.5,0,true);
  PINE_B=coneMesh([0.21,0.40,0.22],9,0.5,0,true);
  OAK_A=blobMesh([0.24,0.42,0.20],0.14,1);
  ROCK=blobMesh([0.40,0.40,0.42],0.18,1);
  SHROOM=blobMesh([0.62,0.24,0.20],0,0);
  FERN=coneMesh([0.25,0.46,0.22],7,0.5,0.1,true);
  STUMP=coneMesh([0.30,0.22,0.15],8,0.5,0.42);
  initNature();
}

/* ---------- Quaternius nature props (tools/nature.mjs) ----------
   Each prop arrives as 16-bit positions, 16-bit indices and one palette colour per
   triangle, scaled so it stands 1 unit tall. Smooth ones share corners and get
   averaged normals; faceted ones (rocks, wood) are split per face. */
var NAT=null;
function natB64(s,T){ var b=atob(s), u=new Uint8Array(b.length); for(var i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new T(u.buffer); }
function initNature(){
  if(typeof NATURE_DATA==='undefined'||NAT) return;
  NAT={};
  var pal=NATURE_DATA.palette;
  for(var k in NATURE_DATA.props){
    var d=NATURE_DATA.props[k];
    NAT[k]=natDecode(d,d.s,d.smooth,pal); NAT[k].w=d.w;
    NAT[k].lo=d.lo?natDecode(d.lo,d.s,d.smooth,pal):NAT[k];
  }
}
function natDecode(d,scale,smooth,pal){
  {
    var Q=natB64(d.p,Int16Array), I=natB64(d.i,Uint16Array), C=natB64(d.c,Uint8Array);
    var u=scale/32767, nv=Q.length/3, P=new Float32Array(Q.length);
    for(var i=0;i<Q.length;i++) P[i]=Q[i]*u;
    var pos,nrmA,col,idx;
    if(smooth){
      pos=P; nrmA=new Float32Array(P.length); col=new Float32Array(P.length); idx=I;
      for(var t=0;t<I.length/3;t++){
        var a=I[t*3],b=I[t*3+1],c=I[t*3+2];
        var ux=P[b*3]-P[a*3],uy=P[b*3+1]-P[a*3+1],uz=P[b*3+2]-P[a*3+2];
        var vx=P[c*3]-P[a*3],vy=P[c*3+1]-P[a*3+1],vz=P[c*3+2]-P[a*3+2];
        var nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;      // area-weighted
        var cc=pal[C[t]];
        for(var q=0;q<3;q++){ var v=I[t*3+q]; nrmA[v*3]+=nx; nrmA[v*3+1]+=ny; nrmA[v*3+2]+=nz;
          col[v*3]=cc[0]; col[v*3+1]=cc[1]; col[v*3+2]=cc[2]; }
      }
      for(var v2=0;v2<nv;v2++){ var l=Math.hypot(nrmA[v2*3],nrmA[v2*3+1],nrmA[v2*3+2])||1;
        nrmA[v2*3]/=l; nrmA[v2*3+1]/=l; nrmA[v2*3+2]/=l;
        // a touch of self-shadow: undersides of a canopy read darker
        var sh=0.80+0.20*(0.5+0.5*nrmA[v2*3+1]); col[v2*3]*=sh; col[v2*3+1]*=sh; col[v2*3+2]*=sh; }
    } else {
      var nt=I.length/3; pos=new Float32Array(nt*9); nrmA=new Float32Array(nt*9); col=new Float32Array(nt*9); idx=new Uint16Array(nt*3);
      for(var t2=0;t2<nt;t2++){
        var a2=I[t2*3],b2=I[t2*3+1],c2=I[t2*3+2];
        var px=[P[a2*3],P[a2*3+1],P[a2*3+2],P[b2*3],P[b2*3+1],P[b2*3+2],P[c2*3],P[c2*3+1],P[c2*3+2]];
        var fn=nrm([(px[4]-px[1])*(px[8]-px[2])-(px[5]-px[2])*(px[7]-px[1]),
                    (px[5]-px[2])*(px[6]-px[0])-(px[3]-px[0])*(px[8]-px[2]),
                    (px[3]-px[0])*(px[7]-px[1])-(px[4]-px[1])*(px[6]-px[0])]);
        var cc2=pal[C[t2]];
        for(var q2=0;q2<9;q2++){ pos[t2*9+q2]=px[q2]; nrmA[t2*9+q2]=fn[q2%3]; col[t2*9+q2]=cc2[q2%3]; }
        idx[t2*3]=t2*3; idx[t2*3+1]=t2*3+1; idx[t2*3+2]=t2*3+2;
      }
    }
    return {p:pos,n:nrmA,c:col,i:idx};
  }
}

/* ---------- prop chunks ----------
   Props are baked into a grid of indexed meshes instead of one buffer, so the
   camera (and the sun's shadow pass) only draw the patches of forest they can see. */
var CHUNK=37.5, CHUNKS={}, PROPTRIS=0, PROPN={};
function chunkBuf(hi){ return {p:[],n:[],c:[],f:[],i:[],nv:0,isHi:!!hi}; }
function chunkAt(x,z){
  var ix=Math.floor((x+WHALF)/CHUNK), iz=Math.floor((z+WHALF)/CHUNK), k=ix+','+iz;
  return CHUNKS[k]||(CHUNKS[k]={hi:chunkBuf(true),lo:chunkBuf(false),cx:-WHALF+(ix+0.5)*CHUNK,cz:-WHALF+(iz+0.5)*CHUNK});
}
/* a nature prop: h = height, wk = width multiplier, ry = turn, tint = colour multiplier */
function addProp(name,x,y,z,ry,h,wk,tint){
  var C=chunkAt(x,z);
  addPropTo(C.hi,NAT[name],x,y,z,ry,h,wk,tint);
  addPropTo(C.lo,NAT[name].lo,x,y,z,ry,h,wk,tint);
  PROPTRIS+=NAT[name].i.length/3; PROPN[name]=(PROPN[name]||0)+1;
}
function addPropTo(ch,P,x,y,z,ry,h,wk,tint){
  var c=Math.cos(ry), s=Math.sin(ry), sx=h*(wk||1), sy=h, base=ch.nv;
  var tr=tint?tint[0]:1, tg=tint?tint[1]:1, tb=tint?tint[2]:1;
  for(var i=0;i<P.p.length;i+=3){
    var px=P.p[i]*sx, py=P.p[i+1]*sy, pz=P.p[i+2]*sx;
    ch.p.push(px*c+pz*s+x, py+y, -px*s+pz*c+z);
    var nx=P.n[i]/(wk||1), ny=P.n[i+1], nz=P.n[i+2]/(wk||1), l=Math.hypot(nx,ny,nz)||1;
    ch.n.push((nx*c+nz*s)/l, ny/l, (-nx*s+nz*c)/l);
    ch.c.push(P.c[i]*tr, P.c[i+1]*tg, P.c[i+2]*tb);
    ch.f.push(2);                       // a prop: may be cut away when it hides the hunter
  }
  for(var j=0;j<P.i.length;j++) ch.i.push(base+P.i[j]);
  ch.nv+=P.p.length/3;
}
/* the old primitive props (mushrooms, and the fallback) go into the same chunks */
function addMeshCh(src,tx,ty,tz,ry,sx,sy,sz,tint,nearOnly){
  var C=chunkAt(tx,tz);
  addMeshTo(C.hi,src,tx,ty,tz,ry,sx,sy,sz,tint);
  if(!nearOnly) addMeshTo(C.lo,src,tx,ty,tz,ry,sx,sy,sz,tint);
}
function addMeshTo(ch,src,tx,ty,tz,ry,sx,sy,sz,tint){
  var tmp={p:[],n:[],c:[],f:[]};
  addMesh(tmp,src,tx,ty,tz,ry,sx,sy,sz,tint);
  for(var i=0;i<tmp.p.length;i++){ ch.p.push(tmp.p[i]); ch.n.push(tmp.n[i]); ch.c.push(tmp.c[i]); }
  var nv=tmp.p.length/3;
  for(var v=0;v<nv;v++){ ch.f.push(tmp.f[v]); ch.i.push(ch.nv+v); }
  ch.nv+=nv; if(ch.isHi) PROPTRIS+=nv/3;
}
function pick(r,list){ return list[(r()*list.length)|0]; }

function scatterWorld(m){
  var r=mulberry(7);
  // fewer trees than before, and open meadows between the stands, so there is room to fight
  var tries=2700, Q=!!NAT;
  for(var i=0;i<tries;i++){
    var x=(r()*2-1)*WHALF*0.94, z=(r()*2-1)*WHALF*0.94;
    var y=H(x,z), sl=Hn(x,z), d=Math.hypot(x,z);
    if(y<WATER+0.6) continue;
    if(sl>0.7) { if(r()<0.86) continue; }
    if(d<7 && r()<0.8) continue;            // keep a small clearing at the spawn
    var k=r();
    if(inClearing(x,z,k<0.48?1.5:0)) continue;     // landmark grounds and the tavern path stay open
    if(k<0.48&&fbm(x+500,z-300,2,0.022)>0.56&&r()<0.9) continue;   // a meadow: grass and flowers, few trees
    if(k<0.30){ // pine
      var hh=3.6+r()*4.2, rr=0.9+r()*0.5, ry=r()*6.28;
      collCircle(x,z,0.30*rr);
      if(Q){ var tn=0.92+r()*0.16; addProp(pick(r,['pine1','pine2','pine3']),x,y-0.1,z,ry,hh*1.18,0.95+r()*0.2,[tn,tn+r()*0.06,tn]); continue; }
      addMeshCh(TRUNK,x,y,z,ry,0.5*rr,hh*0.42,0.5*rr);
      var p=(r()<0.5)?PINE_A:PINE_B;
      addMeshCh(p,x,y+hh*0.26,z,ry,2.5*rr,hh*0.52,2.5*rr);
      addMeshCh(p,x,y+hh*0.58,z,ry+0.7,1.9*rr,hh*0.46,1.9*rr);
      addMeshCh(p,x,y+hh*0.86,z,ry+1.4,1.3*rr,hh*0.40,1.3*rr);
    } else if(k<0.48){ // broadleaf
      var hh2=3.0+r()*3.0, rr2=1.0+r()*0.6, ry2=r()*6.28;
      collCircle(x,z,0.36*rr2);
      if(Q){
        var kind=r(), nm=kind<0.62?pick(r,['oak1','oak2','oak3']):(kind<0.93?pick(r,['birch1','birch2']):'dead1');
        var tn2=0.9+r()*0.2;
        addProp(nm,x,y-0.1,z,ry2,(hh2+2.2)*(nm==='dead1'?0.9:1),0.9+r()*0.25,[tn2*(0.95+r()*0.1),tn2,tn2*(0.9+r()*0.1)]);
        continue;
      }
      addMeshCh(TRUNK,x,y,z,ry2,0.62*rr2,hh2*0.72,0.62*rr2);
      addMeshCh(OAK_A,x,y+hh2*0.58,z,ry2,3.5*rr2,3.2*rr2,3.5*rr2);
      if(r()<0.5) addMeshCh(OAK_A,x+rr2,y+hh2*0.75,z-rr2*0.6,ry2+1,2.3*rr2,2.1*rr2,2.3*rr2);
    } else if(k<0.60){ // rock
      var s=0.8+r()*2.6;
      if(s>1.3) collCircle(x,z,0.40*s,0.55*s);
      if(Q){ var rn=pick(r,['rock1','rock2','rock3','rock4']), wd=s*1.25;    // footprint wd wide
        addProp(rn,x,y-0.12*s,z,r()*6.28,wd/NAT[rn].w*(0.8+r()*0.5),1,null); continue; }
      addMeshCh(ROCK,x,y-0.18*s,z,r()*6.28,s,s*(0.6+r()*0.5),s);
    } else if(k<0.68){ // stump / log
      collCircle(x,z,0.50,0.9);
      if(Q){ if(r()<0.55) addProp('stump',x,y-0.05,z,r()*6.28,0.9+r()*0.5,1,null);
             else addProp('log',x,y-0.08,z,r()*6.28,0.85+r()*0.3,1,null); continue; }
      addMeshCh(STUMP,x,y,z,r()*6.28,1.1,0.8+r()*0.6,1.1);
    } else if(k<0.90){ // undergrowth: ferns, bushes, flowers
      var n=2+((r()*3)|0);
      for(var q=0;q<n;q++){
        var ax=x+(r()-0.5)*2.4, az=z+(r()-0.5)*2.4, ay=H(ax,az)-0.05;
        if(inClearing(ax,az)) continue;
        if(Q){ var u=r(), un=u<0.36?pick(r,['fern1','fern2']):(u<0.62?pick(r,['bush1','bush2']):(u<0.72?'berry':'flower'));
          addProp(un,ax,ay,az,r()*6.28,un==='flower'?0.5+r()*0.3:(un.indexOf('bush')===0||un==='berry'?0.9+r()*0.6:0.8+r()*0.5),1,null); continue; }
        addMeshCh(FERN,ax,ay,az,r()*6.28,1.5+r()*0.8,1.1+r()*0.7,1.5+r()*0.8);
      }
    } else { // mushrooms
      var n2=2+((r()*4)|0);
      for(var q2=0;q2<n2;q2++){
        var bx=x+(r()-0.5)*1.8, bz=z+(r()-0.5)*1.8, by=H(bx,bz);
        addMeshCh(TRUNK,bx,by,bz,0,0.12,0.30,0.12,[1.6,1.6,1.5],true);
        addMeshCh(SHROOM,bx,by+0.12,bz,r()*6.28,0.55,0.36,0.55,null,true);
      }
    }
  }
}
/* hand the chunks to three.js as indexed meshes: a full-detail and a stand-in
   mesh per chunk, and the game shows one or the other by distance */
function chunkGeom(ch){
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(ch.p,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(ch.n,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(ch.c,3));
  g.setAttribute('flag',new THREE.Float32BufferAttribute(ch.f,1));
  g.setIndex(ch.nv>65535?new THREE.Uint32BufferAttribute(ch.i,1):new THREE.Uint16BufferAttribute(ch.i,1));
  g.computeBoundingSphere();
  ch.p=ch.n=ch.c=ch.f=ch.i=null;        // free the build arrays
  return g;
}
function chunkMeshes(mat){
  var out=[];
  for(var k in CHUNKS){ var ch=CHUNKS[k]; if(!ch.hi.nv) continue;
    var hi=new THREE.Mesh(chunkGeom(ch.hi),mat), lo=new THREE.Mesh(chunkGeom(ch.lo),mat);
    hi.castShadow=lo.castShadow=true; hi.receiveShadow=lo.receiveShadow=true;
    lo.visible=false;
    out.push({hi:hi,lo:lo,cx:ch.cx,cz:ch.cz,tris:[hi.geometry.index.count/3,lo.geometry.index.count/3]});
  }
  return out;
}

/* ---------- landmarks ---------- */
var LANDMARKS=[];
function buildTavern(m,x,z){
  var y=H(x,z), R=TAVERN.ry, c=Math.cos(R), sn=Math.sin(R);
  // tavern-local (lx across the front, lz out of the door) -> world
  function T(lx,lz){ return {x:x+lx*c+lz*sn, z:z-lx*sn+lz*c}; }
  var wall=[0.44,0.33,0.22], roof=[0.33,0.17,0.14], warm=[0.95,0.72,0.35], wood=[0.36,0.25,0.15], dark=[0.24,0.17,0.11];
  addMesh(m,boxMesh(wall),x,y-0.2,z,R,9,4.2,7);
  collBox(x,z,4.5,3.5,R);
  addMesh(m,coneMesh(roof,4),x,y+3.9,z,R+Math.PI/4,9.6,3.2,8.0);
  var ch=T(3.2,-2.2); addMesh(m,boxMesh([0.30,0.22,0.15]),ch.x,y+2.6,ch.z,R,1.0,2.4,1.0); // chimney
  // glowing windows on the front and the side
  for(var i=-1;i<=1;i+=2){
    var wf=T(i*2.4,3.52); addMesh(m,boxMesh(warm),wf.x,y+1.3,wf.z,R,1.2,1.3,0.12);
    var ws=T(4.52,i*1.6); addMesh(m,boxMesh(warm),ws.x,y+1.3,ws.z,R,0.12,1.3,1.2);
  }
  var dr=T(-0.2,3.52); addMesh(m,boxMesh(dark),dr.x,y-0.1,dr.z,R,1.6,2.4,0.14);       // door
  // a porch step and a hanging sign by the door
  var st=T(-0.2,4.1); addMesh(m,boxMesh(wood),st.x,y-0.25,st.z,R,2.4,0.4,1.0);
  var sp=T(-2.2,4.4); addMesh(m,boxMesh(wood),sp.x,y,sp.z,R,0.18,3.0,0.18);
  var sg=T(-2.2,4.4); addMesh(m,boxMesh([0.62,0.48,0.26]),sg.x,y+2.0,sg.z,R,1.3,0.75,0.12);
  var sl=T(-2.2,4.38); addMesh(m,blobMesh([0.95,0.80,0.40],0,1),sl.x,y+2.37,sl.z,R,0.22,0.22,0.06);   // a gold leaf
  collCircle(sp.x,sp.z,0.2);
  // lantern posts at the yard's mouth
  for(var k=-1;k<=1;k+=2){
    var lp=T(k*5.6,8.5);
    addMesh(m,boxMesh(wood),lp.x,H(lp.x,lp.z),lp.z,R,0.25,2.6,0.25);
    collCircle(lp.x,lp.z,0.25);
    addMesh(m,boxMesh(warm),lp.x,H(lp.x,lp.z)+2.6,lp.z,R,0.5,0.6,0.5);
  }
  // barrels stacked against the wall
  var bar=[[5.3,1.6],[5.4,0.4],[5.2,-0.8],[5.35,1.0,1]];
  for(var b2=0;b2<bar.length;b2++){ var bp=T(bar[b2][0],bar[b2][1]), up=bar[b2][2]?1.05:0;
    addMesh(m,coneMesh([0.42,0.30,0.18],10,0.5,0.46),bp.x,y+up,bp.z,0,0.95,1.05,0.95);
    addMesh(m,coneMesh([0.30,0.30,0.32],10,0.5,0.5,true),bp.x,y+up+0.18,bp.z,0,0.99,0.08,0.99);
    addMesh(m,coneMesh([0.30,0.30,0.32],10,0.5,0.5,true),bp.x,y+up+0.80,bp.z,0,0.97,0.08,0.97);
    if(!up) collCircle(bp.x,bp.z,0.5);
  }
  // a table with benches in the yard
  var tb=T(-4.2,7.0);
  addMesh(m,boxMesh(wood),tb.x,y+0.78,tb.z,R,2.6,0.14,1.2);
  for(var lg=-1;lg<=1;lg+=2){ var lgp=T(-4.2+lg*1.05,7.0); addMesh(m,boxMesh(dark),lgp.x,y,lgp.z,R,0.16,0.8,1.0); }
  for(var bn=-1;bn<=1;bn+=2){ var bnp=T(-4.2,7.0+bn*1.15); addMesh(m,boxMesh(wood),bnp.x,y+0.42,bnp.z,R,2.4,0.1,0.42);
    addMesh(m,boxMesh(dark),bnp.x,y,bnp.z,R,2.1,0.42,0.12); }
  collBox(tb.x,tb.z,1.3,1.5,R);
  var mug=T(-4.6,6.8); addMesh(m,coneMesh([0.80,0.62,0.30],8,0.5,0.5),mug.x,y+0.85,mug.z,0,0.18,0.24,0.18);
  // a fire pit to gather at
  var fp=T(1.5,12.0), fy=H(fp.x,fp.z);
  for(var q=0;q<8;q++){ var qa=q/8*6.283, qx=fp.x+Math.cos(qa)*1.25, qz=fp.z+Math.sin(qa)*1.25;
    addMesh(m,ROCK,qx,fy-0.05,qz,qa,0.55,0.4,0.55); }
  addMesh(m,coneMesh([0.98,0.62,0.22],7),fp.x,fy+0.05,fp.z,0,1.1,1.25,1.1);
  addMesh(m,coneMesh([1.0,0.86,0.40],6),fp.x,fy+0.05,fp.z,0.6,0.6,0.85,0.6);
  collCircle(fp.x,fp.z,1.3);
  for(var lgs=0;lgs<2;lgs++){ var la=lgs*2.2+0.6, lx=fp.x+Math.cos(la)*3.0, lz=fp.z+Math.sin(la)*3.0;
    addMesh(m,tubeLog(),lx,H(lx,lz)+0.28,lz,la+Math.PI/2,0.55,2.4,0.55); }
  LANDMARKS.push({x:x,z:z,r:11,name:'The Greenleaf Tavern',kind:'tavern'});
  var door=T(-0.2,3.52), keep=T(1.6,5.4);
  TAVERN.door=door; TAVERN.keeper={x:keep.x,z:keep.z,yaw:R}; TAVERN.fire=fp;
}
/* a log to sit on: a cylinder lying along x */
var LOGMESH=null;
function tubeLog(){
  if(LOGMESH) return LOGMESH;
  var src=coneMesh([0.38,0.27,0.17],8,0.5,0.5), m=new MB();
  // turn the upright cylinder on its side, centred
  for(var i=0;i<src.p.length;i+=3){
    m.p.push(src.p[i+1]-0.5, -src.p[i], src.p[i+2]);      // a quarter turn about z
    m.n.push(src.n[i+1], -src.n[i], src.n[i+2]);
    m.c.push(src.c[i],src.c[i+1],src.c[i+2]); m.f.push(src.f[i/3]||0);
  }
  return (LOGMESH=m);
}
/* the wasps' hive: a great papery nest hanging from a dead tree, broken comb
   scattered beneath it, and long grass where the snakes lie */
function buildHive(m,x,z){
  var y=H(x,z), paper=[0.78,0.66,0.44], paperD=[0.62,0.50,0.32], comb=[0.95,0.74,0.25], bark=[0.30,0.23,0.17];
  // the dead tree
  addMesh(m,coneMesh(bark,8,0.5,0.32),x,y-0.2,z,0,1.4,8.5,1.4);
  collCircle(x,z,0.75);
  for(var br=0;br<4;br++){ var ba=br/4*6.283+0.4;
    var bm=coneMesh(bark,6,0.5,0.15), bx=x+Math.cos(ba)*0.4, bz=z+Math.sin(ba)*0.4;
    // a branch leaning out: lay a narrow cone along the direction by squashing a tilted copy
    addMesh(m,bm,bx+Math.cos(ba)*1.2,y+5.4+br*0.6,bz+Math.sin(ba)*1.2,ba,0.35,2.6,0.35); }
  // the nest: stacked papery layers
  var ny=y+3.2, nx=x+1.6, nz=z+0.6;
  for(var l=0;l<5;l++){ var ls=1.0-Math.abs(l-1.6)*0.22;
    addMesh(m,blobMesh(l%2?paper:paperD,0.06,2),nx,ny+l*0.55,nz,l*0.7,1.6*ls,0.75,1.6*ls); }
  addMesh(m,blobMesh([0.16,0.12,0.08],0,1),nx+1.05,ny+0.6,nz+0.6,0,0.28,0.32,0.28);   // the entrance
  addMesh(m,boxMesh(bark),nx,ny+2.6,nz,0,0.18,1.6,0.18);                                 // hanging stalk
  // broken comb on the ground
  for(var c2=0;c2<7;c2++){ var ca=c2/7*6.283+0.9, cr=4+(c2%3)*1.8, cx=x+Math.cos(ca)*cr, cz=z+Math.sin(ca)*cr;
    addMesh(m,coneMesh(comb,6,0.5,0.5),cx,H(cx,cz)-0.1,cz,ca,1.0+(c2%2)*0.5,0.35,1.0+(c2%2)*0.5); }
  for(var k=0;k<6;k++){ var a2=k/6*6.28+0.2, rx=x+Math.cos(a2)*8.5, rz=z+Math.sin(a2)*8.5;
    addMesh(m,ROCK,rx,H(rx,rz)-0.1,rz,a2,1.0,0.7,1.0); collCircle(rx,rz,0.6,0.6); }
  LANDMARKS.push({x:x,z:z,r:13,name:'The Wasp Hive',kind:'hive'});
}
function buildHollow(m,x,z){
  var y=H(x,z);
  var web=[0.80,0.84,0.86], stone=[0.34,0.34,0.37];
  for(var i=0;i<7;i++){
    var a=i/7*6.28, px=x+Math.cos(a)*(7+i%3), pz=z+Math.sin(a)*(7+i%3);
    addMesh(m,boxMesh(stone,0.6),px,H(px,pz),pz,a,1.4,4.5+((i*7)%3),1.4);
    collCircle(px,pz,0.75);
  }
  for(var k=0;k<9;k++){ // egg sacs
    var a2=k/9*6.28+0.3, ex=x+Math.cos(a2)*(2+k%4), ez=z+Math.sin(a2)*(2+k%4);
    addMesh(m,blobMesh(web,0.18),ex,H(ex,ez),ez,a2,1.1,1.5,1.1);
  }
  LANDMARKS.push({x:x,z:z,r:13,name:"The Queen's Hollow",kind:'hollow'});
}
function buildStones(m,x,z){
  for(var i=0;i<6;i++){
    var a=i/6*6.28, px=x+Math.cos(a)*5.5, pz=z+Math.sin(a)*5.5;
    addMesh(m,boxMesh([0.42,0.42,0.45],0.8),px,H(px,pz)-0.3,pz,a,1.3,5.5+(i%2)*1.5,1.0);
    collCircle(px,pz,0.65);
  }
  addMesh(m,boxMesh([0.46,0.46,0.49],0.9),x,H(x,z),z,0,2.4,0.6,2.4);
  // the altar stone's carved spiral, and a ring of pale flowers that never seem to wilt
  addMesh(m,coneMesh([0.30,0.36,0.40],12,0.5,0.5),x,H(x,z)+0.58,z,0,1.6,0.04,1.6);
  for(var f=0;f<14;f++){ var fa=f/14*6.283+0.2, fx=x+Math.cos(fa)*3.4, fz=z+Math.sin(fa)*3.4;
    addMesh(m,blobMesh([0.86,0.84,0.95],0,1),fx,H(fx,fz)-0.05,fz,0,0.32,0.22,0.32); }
  STONES.x=x; STONES.z=z;
  for(var k=0;k<6;k++){ var ka=k/6*6.28; STONES.rune.push({x:x+Math.cos(ka)*4.85,z:z+Math.sin(ka)*4.85,a:ka,h:2.4+(k%2)*0.6}); }
  LANDMARKS.push({x:x,z:z,r:9,name:'The Standing Stones',kind:'stones'});
}
var STONES={x:0,z:0,rune:[]};

/* ---------- the Dragon's Crag ----------
   Boulders ring the cliff's foot (and its lip), so the only way up is the ramp.
   The dragon's lair on top: a ring of scorched rock, old bones and a heap of gold. */
function cragRing(m,R,step,skipRamp,yOf,big){
  var n=Math.round(6.283*R/step);
  for(var i=0;i<n;i++){
    var a=i/n*6.283, ux=Math.cos(a), uz=Math.sin(a);
    if(skipRamp&&ux*CRAG.rd[0]+uz*CRAG.rd[1]>0.93) continue;     // leave the ramp open
    if(big>1.5&&-ux>0.985) continue;                              // and the cave mouth
    var x=CRAG.x+ux*R, z=CRAG.z+uz*R, s=big*(0.85+((i*37)%10)/22);
    var nm=['rock1','rock2','rock3','rock4'][i%4];
    if(NAT&&NAT[nm]) addMesh(m,natMB(nm)||ROCK,x,yOf(x,z)-0.5*s,z,a*2.3,s/NAT[nm].w*1.6,s*1.3,s/NAT[nm].w*1.6);
    else addMesh(m,ROCK,x,yOf(x,z)-0.4*s,z,a,s*1.6,s*1.2,s*1.6);
    collCircle(x,z,big*0.75);
  }
}
function buildCrag(m){
  H(CRAG.x,CRAG.z);                       // settles CRAG.top
  var T=CRAG.top;
  // the cliff foot: big boulders, a ring you cannot squeeze through
  cragRing(m,CRAG.r+1.6,2.0,true,function(x,z){ return H(x,z)+0.6; },1.9);
  // the lip up top, so nobody wanders off the edge (except down the ramp)
  cragRing(m,CRAG.r-0.6,1.5,true,function(){ return T; },0.9);
  // rails along the ramp
  for(var t=0.08;t<1;t+=0.12) for(var sd=-1;sd<=1;sd+=2){
    var al=CRAG.r+CRAG.rl*t, lx=CRAG.x+CRAG.rd[0]*al-CRAG.rd[1]*sd*(CRAG.rw+0.7), lz=CRAG.z+CRAG.rd[1]*al+CRAG.rd[0]*sd*(CRAG.rw+0.7);
    addMesh(m,ROCK,lx,H(lx,lz)-0.25,lz,t*9,0.9,0.75,0.9); collCircle(lx,lz,0.45,1.0);
  }
  // the lair: scorched ring, ribs of something that lost, a heap of gold
  var L=CRAG.lair, ly=T;
  for(var q=0;q<10;q++){ var qa=q/10*6.283, qx=L.x+Math.cos(qa)*6.2, qz=L.z+Math.sin(qa)*6.2;
    addMesh(m,ROCK,qx,ly-0.2,qz,qa,1.2,0.6+(q%3)*0.25,1.2); }
  var bone=[0.86,0.82,0.70], gold=[0.95,0.76,0.25], goldD=[0.80,0.58,0.16];
  for(var b=0;b<5;b++){ var ba=2.2+b*0.32, bx=L.x+Math.cos(ba)*4.0, bz=L.z+Math.sin(ba)*4.0;
    addMesh(m,coneMesh(bone,6,0.5,0.25),bx,ly-0.1,bz,ba,0.25,2.0-b*0.15,0.25); }
  addMesh(m,blobMesh(bone,0.1,1),L.x+3.6,ly,L.z+1.8,0.5,1.1,0.8,1.3);                     // a skull, or near enough
  for(var g=0;g<16;g++){ var ga=g*2.4, gr=(g%5)*0.5, gx=L.x-3+Math.cos(ga)*gr, gz=L.z+2.5+Math.sin(ga)*gr;
    addMesh(m,blobMesh(g%2?gold:goldD,0.15,1),gx,ly-0.1,gz,ga,1.6-gr*0.4,0.9-gr*0.15,1.6-gr*0.4); }
  addMesh(m,boxMesh([0.42,0.28,0.16]),L.x-4.6,ly,L.z+1.2,0.6,1.4,0.9,0.9);            // a chest, lid off
  addMesh(m,boxMesh(gold),L.x-4.6,ly+0.85,L.z+1.2,0.6,1.2,0.15,0.75);
  // the cave mouth, black in the western face, with a lintel of rock
  var M=CRAG.mouth, my=H(M.x,M.z), fx=CRAG.x-CRAG.r-0.4, fz=M.z;
  addMesh(m,blobMesh([0.03,0.025,0.02],0,2),fx,my-1.2,fz,0,2.0,5.4,5.0);
  addMesh(m,blobMesh([0.07,0.06,0.05],0,2),fx-0.4,my-0.8,fz,0,1.6,4.4,4.0);
  for(var k=-2;k<=2;k++){ var kz=fz+k*1.4, ky=my+3.1-Math.abs(k)*0.55;
    addMesh(m,ROCK,fx-0.9,ky,kz,k,1.4,1.1,1.5); }
  addMesh(m,ROCK,fx-1.1,my-0.2,fz-3.0,1,1.5,2.6,1.5); addMesh(m,ROCK,fx-1.1,my-0.2,fz+3.0,2,1.5,2.6,1.5);
  collCircle(fx-0.6,fz,2.3); collCircle(fx-1.1,fz-3.0,0.9); collCircle(fx-1.1,fz+3.0,0.9);   // the dark is solid until you have a light
  LANDMARKS.push({x:CRAG.x,z:CRAG.z,r:CRAG.r+4,name:"The Dragon's Crag",kind:'crag'});
  LANDMARKS.push({x:M.x,z:M.z,r:5,name:'The Glimmer Cave',kind:'cave'});
}

function buildWaystones(m){
  for(var i=0;i<WAYSTONES.length;i++){ var w=WAYSTONES[i], y=H(w.x,w.z), ry=i*1.3;
    addMesh(m,boxMesh([0.46,0.45,0.42],0.78),w.x,y-0.3,w.z,ry,0.9,2.6,0.55);
    addMesh(m,boxMesh([0.30,0.46,0.28]),w.x,y+2.05,w.z,ry,0.75,0.25,0.5);          // moss on its shoulders
    var c=Math.cos(ry), s2=Math.sin(ry);
    addMesh(m,boxMesh([0.62,0.80,0.72]),w.x+s2*0.29,y+0.9,w.z+c*0.29,ry,0.42,0.9,0.04);   // the carved face, faintly pale
    collCircle(w.x,w.z,0.55);
    w.y=y;
  }
}
/* toadstools big enough to bounce on */
function buildBounce(m){
  for(var i=BOUNCE.length-1;i>=0;i--){ var b=BOUNCE[i], y=H(b.x,b.z);
    if(y<WATER+0.6){ BOUNCE.splice(i,1); continue; }
    var cap=(i%3===0)?[0.86,0.30,0.52]:((i%3===1)?[0.92,0.42,0.30]:[0.62,0.40,0.86]);
    addMesh(m,coneMesh([0.92,0.88,0.76],10,0.5,0.36),b.x,y-0.1,b.z,0,0.75,1.25,0.75);
    addMesh(m,blobMesh(cap,0.05,2),b.x,y+0.85,b.z,i,2.4,1.0,2.4);
    for(var s=0;s<5;s++){ var sa=s*1.3+i, sx=b.x+Math.cos(sa)*0.75, sz=b.z+Math.sin(sa)*0.75;
      addMesh(m,blobMesh([0.98,0.96,0.92],0,1),sx,y+1.62,sz,0,0.32,0.14,0.32); }
    b.y=y;
  }
}

/* ---------- the cave interior ----------
   A heightfield (floor and walls) for the world material, plus crystals and
   glowing caps for an unlit material, so they shine in the dark. */
function caveMeshes(){
  var rock=new MB(), glow=new MB(), shaft=new MB(), S=1.1, X0=CAVE.x-26, X1=CAVE.x+32, Z0=CAVE.z-52, Z1=CAVE.z+52;
  var nx=Math.round((X1-X0)/S), nz=Math.round((Z1-Z0)/S), P=[], NN=[], CC=[], FL=[], SD=[], e=0.4;
  var floorC=[0.22,0.19,0.16], wallC=[0.27,0.26,0.29], mossC=[0.18,0.26,0.16];
  for(var i=0;i<=nx;i++) for(var j=0;j<=nz;j++){
    var x=X0+i*S, z=Z0+j*S, y=caveH(x,z), sd=caveSD(x,z);
    P.push([x,y,z]); NN.push(nrm([caveH(x-e,z)-caveH(x+e,z),2*e,caveH(x,z-e)-caveH(x,z+e)]));
    var c=sd<0?mix3(floorC,mossC,clamp01(vnoise(x*0.2,z*0.2)*1.6-0.8)):mix3(floorC,wallC,clamp01(sd/1.2));
    var t=(RNG()-0.5)*0.04; CC.push([c[0]+t,c[1]+t,c[2]+t]); FL.push(sd>0.9?2:0); SD.push(sd);
  }
  function id(a,b){ return a*(nz+1)+b; }
  for(var a=0;a<nx;a++) for(var b=0;b<nz;b++){
    var A=id(a,b), B=id(a+1,b), C=id(a+1,b+1), D=id(a,b+1);
    if(SD[A]>5&&SD[B]>5&&SD[C]>5&&SD[D]>5) continue;           // solid rock: nothing to see
    var f=Math.max(FL[A],FL[B],FL[C],FL[D]);
    rock.triV(P[A],P[C],P[B],NN[A],NN[C],NN[B],CC[A],CC[C],CC[B],f);
    rock.triV(P[A],P[D],P[C],NN[A],NN[D],NN[C],CC[A],CC[D],CC[C],f);
  }
  var r=mulberry(77), cols=[[0.45,0.95,1.0],[0.75,0.55,1.0],[0.55,1.0,0.75]];
  // crystals in clusters along the walls, glow-caps on the floor, stalagmites (solid)
  for(var k=0;k<170;k++){
    var R=CAVE.rooms[(r()*CAVE.rooms.length)|0], a2=r()*6.283, rr=R[2]*(0.85+r()*0.25);
    var cx=CAVE.x+R[0]+Math.cos(a2)*rr, cz=CAVE.z+R[1]+Math.sin(a2)*rr;
    var sd2=caveSD(cx,cz); if(sd2<-0.4||sd2>1.6) continue;
    var col=cols[(r()*3)|0], cy=caveH(cx,cz);
    for(var q=0;q<3;q++){ var h=0.8+r()*1.8;
      addMesh(glow,coneMesh(col,5),cx+(r()-0.5)*0.9,cy-0.2,cz+(r()-0.5)*0.9,r()*6,0.35+r()*0.3,h,0.35+r()*0.3); }
  }
  for(var g=0;g<60;g++){
    var R2=CAVE.rooms[(r()*CAVE.rooms.length)|0], ga=r()*6.283, gr=r()*R2[2]*0.8;
    var gx=CAVE.x+R2[0]+Math.cos(ga)*gr, gz=CAVE.z+R2[1]+Math.sin(ga)*gr, gy=caveH(gx,gz);
    if(caveSD(gx,gz)>-1) continue;
    if(r()<0.6){
      addMesh(glow,blobMesh([0.40,0.85,0.95],0,1),gx,gy+0.18,gz,0,0.45,0.22,0.45);
      addMesh(rock,coneMesh([0.70,0.72,0.66],6,0.5,0.4),gx,gy-0.05,gz,0,0.12,0.28,0.12);
    } else if(Math.hypot(gx-CAVE.chest.x,gz-CAVE.chest.z)>4&&Math.hypot(gx-CAVE.exit.x,gz-CAVE.exit.z)>5){
      var sh=1.4+r()*2.2;
      addMesh(rock,coneMesh(wallC,7),gx,gy-0.2,gz,r()*6,0.9+r()*0.5,sh,0.9+r()*0.5); collCircle(gx,gz,0.45);
    }
  }
  // the way out: a shaft of daylight
  var ex=CAVE.exit, ey=caveH(ex.x,ex.z);
  addMesh(shaft,coneMesh([1.0,0.95,0.75],12,0.5,0.62,true),ex.x,ey,ex.z,0,3.0,14,3.0);
  addMesh(glow,coneMesh([0.95,0.90,0.70],12,0.5,0.5),ex.x,ey-0.02,ex.z,0,3.2,0.04,3.2);
  // the hoard chest
  var ch=CAVE.chest, chy=caveH(ch.x,ch.z);
  addMesh(rock,boxMesh([0.40,0.26,0.14]),ch.x,chy,ch.z,0.4,1.5,0.85,1.0);
  addMesh(rock,boxMesh([0.30,0.20,0.10]),ch.x,chy+0.85,ch.z,0.4,1.55,0.35,1.05);
  addMesh(rock,boxMesh([0.85,0.66,0.22]),ch.x,chy+0.4,ch.z,0.4,1.56,0.12,1.06);
  collBox(ch.x,ch.z,0.8,0.55,0.4);
  for(var gc=0;gc<9;gc++){ var ga2=gc*0.7, gx2=ch.x+Math.cos(ga2)*(1.4+gc*0.08), gz2=ch.z+Math.sin(ga2)*(1.4+gc*0.08);
    addMesh(glow,blobMesh([0.95,0.76,0.25],0,1),gx2,caveH(gx2,gz2)-0.05,gz2,0,0.5,0.22,0.5); }
  return {rock:rock,glow:glow,shaft:shaft};
}
