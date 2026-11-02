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
/* world height */
function H(x,z){
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
    C_ROCK=[0.38,0.38,0.40], C_SAND=[0.56,0.50,0.33], C_WATER=[0.16,0.33,0.42];

/* ground colour at a point: drifts smoothly (no checkerboard) and blends
   grass -> dirt -> rock with slope, sand near the water */
function groundCol(x,z,y){
  var sl=Hn(x,z), g=fbm(x+311,z-97,2,0.045);
  var col=mix3(C_GRASS2,C_GRASS,g);
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
  for(var i2=0;i2<N;i2++) for(var j2=0;j2<N;j2++){
    var a=id(i2,j2), b=id(i2+1,j2), c2=id(i2+1,j2+1), d=id(i2,j2+1);
    m.triV(P[a],P[c2],P[b],NN[a],NN[c2],NN[b],CC[a],CC[c2],CC[b]);
    m.triV(P[a],P[d],P[c2],NN[a],NN[d],NN[c2],CC[a],CC[d],CC[c2]);
  }
  // water plane
  var wc=C_WATER;
  for(var i2=0;i2<22;i2++) for(var j2=0;j2<22;j2++){
    var a=-WHALF+i2*(WSIZE/22), b=-WHALF+j2*(WSIZE/22), s2=WSIZE/22;
    m.quad([a,WATER,b],[a,WATER,b+s2],[a+s2,WATER,b+s2],[a+s2,WATER,b],wc,1);
  }
  return m;
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
  var tries=3600, Q=!!NAT;
  for(var i=0;i<tries;i++){
    var x=(r()*2-1)*WHALF*0.94, z=(r()*2-1)*WHALF*0.94;
    var y=H(x,z), sl=Hn(x,z), d=Math.hypot(x,z);
    if(y<WATER+0.6) continue;
    if(sl>0.7) { if(r()<0.86) continue; }
    if(d<7 && r()<0.8) continue;            // keep a small clearing at the spawn
    var k=r();
    if(k<0.42){ // pine
      var hh=3.6+r()*4.2, rr=0.9+r()*0.5, ry=r()*6.28;
      collCircle(x,z,0.30*rr);
      if(Q){ var tn=0.92+r()*0.16; addProp(pick(r,['pine1','pine2','pine3']),x,y-0.1,z,ry,hh*1.18,0.95+r()*0.2,[tn,tn+r()*0.06,tn]); continue; }
      addMeshCh(TRUNK,x,y,z,ry,0.5*rr,hh*0.42,0.5*rr);
      var p=(r()<0.5)?PINE_A:PINE_B;
      addMeshCh(p,x,y+hh*0.26,z,ry,2.5*rr,hh*0.52,2.5*rr);
      addMeshCh(p,x,y+hh*0.58,z,ry+0.7,1.9*rr,hh*0.46,1.9*rr);
      addMeshCh(p,x,y+hh*0.86,z,ry+1.4,1.3*rr,hh*0.40,1.3*rr);
    } else if(k<0.62){ // broadleaf
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
    } else if(k<0.74){ // rock
      var s=0.8+r()*2.6;
      if(s>1.3) collCircle(x,z,0.40*s,0.55*s);
      if(Q){ var rn=pick(r,['rock1','rock2','rock3','rock4']), wd=s*1.25;    // footprint wd wide
        addProp(rn,x,y-0.12*s,z,r()*6.28,wd/NAT[rn].w*(0.8+r()*0.5),1,null); continue; }
      addMeshCh(ROCK,x,y-0.18*s,z,r()*6.28,s,s*(0.6+r()*0.5),s);
    } else if(k<0.82){ // stump / log
      collCircle(x,z,0.50,0.9);
      if(Q){ if(r()<0.55) addProp('stump',x,y-0.05,z,r()*6.28,0.9+r()*0.5,1,null);
             else addProp('log',x,y-0.08,z,r()*6.28,0.85+r()*0.3,1,null); continue; }
      addMeshCh(STUMP,x,y,z,r()*6.28,1.1,0.8+r()*0.6,1.1);
    } else if(k<0.93){ // undergrowth: ferns, bushes, flowers
      var n=2+((r()*3)|0);
      for(var q=0;q<n;q++){
        var ax=x+(r()-0.5)*2.4, az=z+(r()-0.5)*2.4, ay=H(ax,az)-0.05;
        if(Q){ var u=r(), un=u<0.45?pick(r,['fern1','fern2']):(u<0.8?pick(r,['bush1','bush2']):(u<0.9?'berry':'flower'));
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
  var y=H(x,z);
  var wall=[0.44,0.33,0.22], roof=[0.33,0.17,0.14], warm=[0.95,0.72,0.35];
  addMesh(m,boxMesh(wall),x,y-0.2,z,0.5,9,4.2,7);
  collBox(x,z,4.5,3.5,0.5);
  addMesh(m,coneMesh(roof,4),x,y+3.9,z,0.5+Math.PI/4,9.6,3.2,8.0);
  addMesh(m,boxMesh([0.30,0.22,0.15]),x+3.2,y+2.6,z-2.2,0.5,1.0,2.4,1.0); // chimney
  // glowing windows
  for(var i=-1;i<=1;i+=2){
    addMesh(m,boxMesh(warm),x+i*2.2,y+1.3,z+3.1,0.5,1.2,1.3,0.3);
    addMesh(m,boxMesh(warm),x+3.3,y+1.3,z+i*2.0,0.5,0.3,1.3,1.2);
  }
  addMesh(m,boxMesh([0.24,0.17,0.11]),x-0.2,y-0.1,z+3.3,0.5,1.6,2.4,0.4); // door
  // lantern posts
  for(var k=-1;k<=1;k+=2){
    addMesh(m,boxMesh([0.25,0.18,0.12]),x+k*5.2,y,z+5.0,0,0.25,2.6,0.25);
    collCircle(x+k*5.2,z+5.0,0.25);
    addMesh(m,boxMesh(warm),x+k*5.2,y+2.6,z+5.0,0,0.5,0.6,0.5);
  }
  LANDMARKS.push({x:x,z:z,r:11,name:'The Greenleaf Tavern',kind:'tavern'});
}
function buildCamp(m,x,z){
  var y=H(x,z);
  var hide=[0.33,0.31,0.20], wood=[0.28,0.20,0.13], fire=[0.95,0.55,0.20];
  for(var i=0;i<4;i++){
    var a=i/4*6.28+0.4, tx=x+Math.cos(a)*6.5, tz=z+Math.sin(a)*6.5, ty=H(tx,tz);
    addMesh(m,coneMesh(hide,5),tx,ty,tz,a,3.4,2.8,3.4);
    collCircle(tx,tz,1.4);
  }
  addMesh(m,coneMesh(fire,6),x,y+0.1,z,0,1.5,1.4,1.5);
  for(var k=0;k<6;k++){
    var a2=k/6*6.28, rx=x+Math.cos(a2)*1.5, rz=z+Math.sin(a2)*1.5;
    addMesh(m,ROCK,rx,H(rx,rz),rz,a2,0.7,0.5,0.7);
  }
  for(var p=0;p<3;p++){ // spikes
    var a3=p/3*6.28+1.1, sx=x+Math.cos(a3)*9, sz=z+Math.sin(a3)*9;
    addMesh(m,coneMesh(wood,5,0.5,0.05),sx,H(sx,sz),sz,0,0.7,3.4,0.7);
    collCircle(sx,sz,0.35);
  }
  LANDMARKS.push({x:x,z:z,r:13,name:'Goblin Camp',kind:'camp'});
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
  LANDMARKS.push({x:x,z:z,r:9,name:'The Standing Stones',kind:'stones'});
}
