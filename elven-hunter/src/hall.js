/* ================= the Greenleaf Tavern =================
   Outside: a two-storey inn of stone and timber, with an old oak growing up
   through its roof. Inside: a great hall far bigger than the house looks (it is
   an elf-built waystation, after all), reached by walking through the door.

   The hall lies off the map, like the Glimmer Cave: walking in at the door
   carries you (and your company) there, walking out the far door brings you back
   to the yard. It has its own floor, walls, light and folk:

   - a stone hearth with a cauldron over the fire, armchairs and a rug;
   - Bram behind a long bar, shelves of glowing bottles, kegs and a gallery above;
   - round tables with candles, a feasting table on a raised dais under tall
     green windows, and a wheel of candles hung from the trusses;
   - the hall's heart: an old tree growing up through the floor, roots across the
     flagstones, branches along the ceiling and vines hanging down;
   - patrons who wander between the tables.

   Light is baked into the vertex colours (pools of warm light round every
   candle, the fire and the windows), so the room costs one draw for the solid
   parts and one for the things that glow. */

/* HALL, inHall() and hallH() live in world.js, beside the cave, since H() needs them */
/* the ceiling over a point: the roof slopes from the side walls up to the ridge */
function hallCeil(lx){ return HALL.ridge-(HALL.ridge-HALL.wall)*Math.abs(lx)/HALL.W; }
/* the camera stays inside the room */
function hallCamBlocked(x,y,z){
  var lx=x-HALL.x, lz=z-HALL.z;
  return Math.abs(lx)>HALL.W-0.7||Math.abs(lz)>HALL.D-0.7||y>hallCeil(lx)-0.8||y<hallH(x,z)+0.6;
}

/* ---------- small mesh helpers ---------- */
function sub3(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
function cross3(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
function dot3(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
/* a quad whose face points along `out`, whatever order its corners came in */
function quadOut(m,a,b,c,d,out,col,flag){
  var n=cross3(sub3(b,a),sub3(c,a));
  if(dot3(n,out)<0) m.quad(a,d,c,b,col,flag); else m.quad(a,b,c,d,col,flag);
}
/* a squared timber from point a to point b, w wide and t thick */
function beamTo(m,a,b,w,t,col,flag){
  var d=sub3(b,a), u=nrm(d), up=[0,1,0];
  if(Math.abs(u[1])>0.95) up=[1,0,0];
  var s=nrm(cross3(u,up)), v=nrm(cross3(s,u));
  function P(o,i,j){ return [o[0]+s[0]*i*w/2+v[0]*j*t/2, o[1]+s[1]*i*w/2+v[1]*j*t/2, o[2]+s[2]*i*w/2+v[2]*j*t/2]; }
  var A=[P(a,-1,-1),P(a,1,-1),P(a,1,1),P(a,-1,1)], B=[P(b,-1,-1),P(b,1,-1),P(b,1,1),P(b,-1,1)];
  var dk=[col[0]*0.82,col[1]*0.82,col[2]*0.82];
  var outs=[[-v[0],-v[1],-v[2]],s,v,[-s[0],-s[1],-s[2]]];
  for(var k=0;k<4;k++){ var k2=(k+1)%4; quadOut(m,A[k],A[k2],B[k2],B[k],outs[k],k%2?col:dk,flag); }
  quadOut(m,A[0],A[1],A[2],A[3],[-u[0],-u[1],-u[2]],dk,flag);
  quadOut(m,B[0],B[1],B[2],B[3],u,dk,flag);
}
/* a flat convex shape standing upright: points (u across, y up) in the plane that
   faces yaw ry, set `off` in front of (ox,oz). Both sides drawn. */
function flatPoly(m,ox,y0,oz,ry,off,pts,col,flag,oneSided){
  var c=Math.cos(ry), s=Math.sin(ry), out=[s,0,c], back=[-s,0,-c], P=[];
  for(var i=0;i<pts.length;i++){ var u=pts[i][0]; P.push([ox+u*c+off*s, y0+pts[i][1], oz-u*s+off*c]); }
  for(var j=1;j<pts.length-1;j++){
    var n=cross3(sub3(P[j],P[0]),sub3(P[j+1],P[0])), f=dot3(n,out)>=0;
    var a=P[0], b=f?P[j]:P[j+1], d=f?P[j+1]:P[j];
    m.tri(a[0],a[1],a[2],b[0],b[1],b[2],d[0],d[1],d[2],col,flag);
    if(!oneSided) m.tri(a[0],a[1],a[2],d[0],d[1],d[2],b[0],b[1],b[2],[col[0]*0.7,col[1]*0.7,col[2]*0.7],flag);
  }
}
/* a lathe: rings of (radius, height), faceted, for barrels, trunks and candles */
function latheMesh(prof,seg,col,jit,seed){
  var m=new MB(), r=mulberry(seed||7);
  for(var i=0;i<prof.length-1;i++){
    var r0=prof[i][0], y0=prof[i][1], r1=prof[i+1][0], y1=prof[i+1][1], cc=prof[i][2]||col;
    for(var k=0;k<seg;k++){
      var a=k/seg*6.2832, b=(k+1)/seg*6.2832, t=jit?(r()-0.5)*jit:0;
      var A=[Math.cos(a)*r0,y0,Math.sin(a)*r0], B=[Math.cos(b)*r0,y0,Math.sin(b)*r0], C=[Math.cos(b)*r1,y1,Math.sin(b)*r1], D=[Math.cos(a)*r1,y1,Math.sin(a)*r1];
      var h=(a+b)/2, kc=[cc[0]*(1+t),cc[1]*(1+t),cc[2]*(1+t)];
      quadOut(m,A,B,C,D,[Math.cos(h),0,Math.sin(h)],kc);
    }
  }
  var top=prof[prof.length-1];
  if(top[0]>0.01) for(var q=0;q<seg;q++){ var a2=q/seg*6.2832, b2=(q+1)/seg*6.2832;
    var tc=prof[prof.length-1][2]||col;
    m.tri(0,top[1],0, Math.cos(b2)*top[0],top[1],Math.sin(b2)*top[0], Math.cos(a2)*top[0],top[1],Math.sin(a2)*top[0], [tc[0]*0.85,tc[1]*0.85,tc[2]*0.85]); }
  return m;
}
/* lay an upright mesh on its side, along x */
function layDown(src){
  var m=new MB();
  for(var i=0;i<src.p.length;i+=3){
    m.p.push(src.p[i+1]-0.5,-src.p[i],src.p[i+2]); m.n.push(src.n[i+1],-src.n[i],src.n[i+2]);
    m.c.push(src.c[i],src.c[i+1],src.c[i+2]); m.f.push(src.f[i/3]||0);
  }
  return m;
}
var BXC={};
function BX(col){ var k=col.join(','); return BXC[k]||(BXC[k]=boxMesh(col)); }
/* add a mesh, then mark what was added: flag 0 is solid (never cut away), 2 is a
   prop the camera may see through when it hides the hunter */
function putM(m,src,x,y,z,ry,sx,sy,sz,flag,tint){
  var n=m.f.length; addMesh(m,src,x,y,z,ry||0,sx,sy,sz,tint);
  if(flag!==2) for(var i=n;i<m.f.length;i++) m.f[i]=flag||0;
}
function jit(r,c,a){ var t=(r()-0.5)*a; return [c[0]*(1+t),c[1]*(1+t),c[2]*(1+t)]; }

/* ---------- baked light ----------
   Each vertex gets the light that would fall on it: a little everywhere, warm pools
   round the candles and the fire, a green cast under the lanterns, cool light under
   the windows. */
function bakeLight(m,lights,amb){
  for(var i=0;i<m.p.length;i+=3){
    var x=m.p[i], y=m.p[i+1], z=m.p[i+2], nx=m.n[i], ny=m.n[i+1], nz=m.n[i+2];
    var R=amb[0], G2=amb[1], B=amb[2];
    for(var k=0;k<lights.length;k++){ var L=lights[k];
      var dx=L[0]-x, dy=L[1]-y, dz=L[2]-z, d=Math.sqrt(dx*dx+dy*dy+dz*dz)||0.01;
      if(d>L[3]*2.6) continue;
      var face=(dx*nx+dy*ny+dz*nz)/d, att=L[4]/(1+Math.pow(d/L[3],2.2));
      att*=0.35+0.65*Math.max(0,face);
      R+=L[5][0]*att; G2+=L[5][1]*att; B+=L[5][2]*att;
    }
    m.c[i]*=Math.min(1.9,R); m.c[i+1]*=Math.min(1.8,G2); m.c[i+2]*=Math.min(1.7,B);
  }
}

/* ---------- the hall ---------- */
var HALL3=null, HALLGLOW=null, HALLSHAFT=null, HALLSIGN=null, HALLLIGHTS=[], HALLCANDLES=[];
function buildHall(){
  var m=new MB(), g=new MB(), sh=new MB(), r=mulberry(5150), X=HALL.x, Z=HALL.z, Y=HALL.y, W=HALL.W, D=HALL.D, WT=HALL.wall;
  var L=HALLLIGHTS; L.length=0; HALLCANDLES.length=0;
  var C={wood:[0.44,0.28,0.15], woodD:[0.30,0.19,0.11], woodL:[0.58,0.40,0.22], plank:[0.40,0.26,0.15],
    stone:[0.44,0.41,0.38], stoneD:[0.30,0.28,0.26], floor:[0.40,0.36,0.32], grout:[0.13,0.11,0.10],
    green:[0.12,0.33,0.19], greenD:[0.08,0.22,0.13], gold:[0.88,0.68,0.28], iron:[0.17,0.17,0.19], pewter:[0.58,0.59,0.62],
    wax:[0.96,0.90,0.74], bark:[0.36,0.27,0.19], barkD:[0.26,0.19,0.13], leaf:[0.24,0.44,0.20], leafD:[0.16,0.33,0.15], moss:[0.26,0.40,0.18],
    fur:[0.72,0.64,0.54], rug:[0.14,0.30,0.20], bone:[0.88,0.84,0.74]};
  function wx(lx){ return X+lx; } function wz(lz){ return Z+lz; }
  function box(col,lx,y,lz,sx,sy,sz,ry,flag){ putM(m,BX(col),wx(lx),Y+y,wz(lz),ry||0,sx,sy,sz,flag); }
  function gbox(col,lx,y,lz,sx,sy,sz,ry){ addMesh(g,BX(col),wx(lx),Y+y,wz(lz),ry||0,sx,sy,sz); }
  function beam(a,b,w,t,col,flag){ beamTo(m,[wx(a[0]),Y+a[1],wz(a[2])],[wx(b[0]),Y+b[1],wz(b[2])],w,t,col,flag||0); }
  function light(lx,y,lz,rad,I,col){ L.push([wx(lx),Y+y,wz(lz),rad,I,col]); }
  // a candle: wax, a flame that glows, and a pool of light round it
  function candle(lx,y,lz,h,lit){
    h=h||0.32; putM(m,coneMesh(C.wax,7,0.5,0.46),wx(lx),Y+y,wz(lz),0,0.13,h,0.13,2);
    addMesh(g,coneMesh([1.0,0.86,0.42],6,0.5,0),wx(lx),Y+y+h+0.02,wz(lz),0,0.09,0.2,0.09);
    addMesh(g,blobMesh([1.0,0.95,0.70],0,1),wx(lx),Y+y+h+0.02,wz(lz),0,0.06,0.09,0.06);
    HALLCANDLES.push([wx(lx),Y+y+h+0.12,wz(lz)]);
    if(lit!==false) light(lx,y+h+0.3,lz,1.7,0.55,[1.0,0.68,0.34]);
  }
  // a hanging lantern of green glass
  function lantern(lx,y,lz,chainTo){
    if(chainTo) beam([lx,y+0.75,lz],[lx,chainTo,lz],0.05,0.05,C.iron);
    addMesh(g,boxMesh([0.48,0.95,0.40]),wx(lx),Y+y,wz(lz),0.4,0.42,0.6,0.42);
    addMesh(g,blobMesh([0.85,1.0,0.65],0,1),wx(lx),Y+y+0.15,wz(lz),0,0.18,0.28,0.18);
    for(var q=0;q<4;q++){ var a=q/4*6.283+0.4+Math.PI/4;
      box(C.iron,lx+Math.sin(a)*0.3,y-0.05,lz+Math.cos(a)*0.3,0.06,0.72,0.06,0.4,2); }
    putM(m,coneMesh(C.iron,4,0.5,0.1),wx(lx),Y+y+0.6,wz(lz),0.4+Math.PI/4,0.62,0.22,0.62,2);
    putM(m,BX(C.iron),wx(lx),Y+y-0.08,wz(lz),0.4,0.5,0.08,0.5,2);
    light(lx,y+0.3,lz,3.2,0.85,[0.55,1.0,0.45]);
  }
  // a green banner with a gold leaf, hanging flat against something that faces ry
  function banner(lx,lz,y0,ry,w,h,off){
    var o=off||0.06, gx=wx(lx), gz=wz(lz);
    flatPoly(m,gx,Y+y0,gz,ry,o,[[-w/2,0.6*h/6+h*0.0],[0,0],[w/2,0.6*h/6],[w/2,h],[-w/2,h]],C.green,2);
    flatPoly(m,gx,Y+y0,gz,ry,o+0.012,[[-w/2+0.08,0.6*h/6+0.12],[0,0.1],[w/2-0.08,0.6*h/6+0.12],[w/2-0.08,0.2*h+0.14],[-w/2+0.08,0.2*h+0.14]],C.greenD,2,true);
    // gold edging and the rod it hangs from
    var c=Math.cos(ry), s=Math.sin(ry);
    putM(m,BX(C.gold),gx+s*o,Y+y0+h,gz+c*o,ry,w+0.3,0.08,0.08,2);
    for(var e=-1;e<=1;e+=2) putM(m,BX(C.gold),gx+e*(w/2-0.03)*c+s*(o+0.014),Y+y0+0.6*h/6,gz-e*(w/2-0.03)*s+c*(o+0.014),ry,0.06,h-0.6*h/6,0.02,2);
    // the leaf: a pointed oval, a stem and a midrib
    var lw=w*0.30, lh=h*0.34, ly=h*0.50, pts=[];
    for(var k=0;k<=10;k++){ var t=k/10*Math.PI; pts.push([Math.sin(t)*lw*(k<5?1:0.95),ly+lh*(-Math.cos(t))]); }
    for(var k2=9;k2>=1;k2--){ var t2=k2/10*Math.PI; pts.push([-Math.sin(t2)*lw,ly+lh*(-Math.cos(t2))]); }
    flatPoly(m,gx,Y+y0,gz,ry,o+0.02,pts,C.gold,2,true);
    putM(m,BX([0.55,0.40,0.15]),gx+s*(o+0.03),Y+y0+ly-lh-0.25,gz+c*(o+0.03),ry,0.05,lh*2+0.15,0.02,2);
  }
  // a round table with a candle, mugs and chairs
  function table(lx,lz,n,rot){
    putM(m,coneMesh(C.woodL,12,0.5,0.5),wx(lx),Y+0.78,wz(lz),0,2.3,0.12,2.3,2);
    putM(m,coneMesh(C.woodD,12,0.5,0.5,true),wx(lx),Y+0.70,wz(lz),0,2.2,0.08,2.2,2);
    putM(m,coneMesh(C.woodD,8,0.5,0.35),wx(lx),Y,wz(lz),0,0.35,0.75,0.35,2);
    for(var f=0;f<2;f++) box(C.woodD,lx,0,lz,1.3,0.14,0.18,f*Math.PI/2+0.3,2);
    // a runner across it
    box(C.green,lx,0.905,lz,0.62,0.012,2.36,rot||0,2);
    candle(lx,0.9,lz,0.34);
    putM(m,coneMesh(C.pewter,8,0.5,0.46),wx(lx+0.55),Y+0.9,wz(lz+0.25),0,0.2,0.26,0.2,2);
    if(r()<0.6) putM(m,coneMesh(C.pewter,8,0.5,0.46),wx(lx-0.4),Y+0.9,wz(lz-0.5),0,0.2,0.26,0.2,2);
    if(r()<0.5){ putM(m,coneMesh([0.16,0.36,0.16],8,0.5,0.32),wx(lx-0.5),Y+0.9,wz(lz+0.35),0,0.2,0.42,0.2,2);
      putM(m,coneMesh([0.16,0.36,0.16],6,0.5,0.4),wx(lx-0.5),Y+1.31,wz(lz+0.35),0,0.07,0.18,0.07,2); }
    for(var c=0;c<n;c++){ var a=(rot||0)+c/n*6.283+0.3; chair(lx+Math.sin(a)*1.6,lz+Math.cos(a)*1.6,a+Math.PI); }
    collCircle(wx(lx),wz(lz),1.75,1.2);
  }
  // a chair facing yaw f (its back is behind it)
  function chair(lx,lz,f){
    var c=Math.cos(f), s=Math.sin(f);
    function at(u,v){ return [lx+u*c+v*s, lz-u*s+v*c]; }
    var p=at(0,0); box(C.wood,p[0],0.44,p[1],0.56,0.08,0.56,f,2);
    for(var i=-1;i<=1;i+=2) for(var j=-1;j<=1;j+=2){ var q=at(i*0.23,j*0.23); box(C.woodD,q[0],0,q[1],0.07,0.44,0.07,f,2); }
    var b=at(0,-0.26); box(C.woodD,b[0],0.44,b[1],0.56,0.06,0.07,f,2);
    for(var k=-1;k<=1;k++){ var bk=at(k*0.21,-0.26); box(C.wood,bk[0],0.5,bk[1],0.08,0.6,0.06,f,2); }
    var bt=at(0,-0.27); box(C.woodL,bt[0],1.08,bt[1],0.62,0.12,0.08,f,2);
  }
  // a barrel standing up, or on its side
  var BARREL=latheMesh([[0.42,0,[0.42,0.28,0.15]],[0.5,0.25],[0.53,0.5],[0.5,0.75],[0.42,1.0]],12,[0.46,0.31,0.17],0.18,3);
  var HOOP=coneMesh([0.24,0.24,0.27],12,0.5,0.5,true);
  function barrel(lx,lz,s,y){
    y=y||0; putM(m,BARREL,wx(lx),Y+y,wz(lz),r()*3,s,s*1.15,s,2);
    for(var h=0;h<3;h++){ var hy=[0.12,0.5,0.88][h], hr=[0.92,1.07,0.92][h];
      putM(m,HOOP,wx(lx),Y+y+s*1.15*hy-0.04,wz(lz),0,s*hr,0.08,s*hr,2); }
    if(!y) collCircle(wx(lx),wz(lz),s*0.5,s*1.15);
  }
  var LBARREL=layDown(BARREL), LHOOP=layDown(HOOP);
  function keg(lx,y,lz,ry,s){
    putM(m,LBARREL,wx(lx),Y+y,wz(lz),ry,s*1.3,s,s,2);
    var c=Math.cos(ry), sn=Math.sin(ry);
    for(var h=0;h<3;h++){ var hx=([0.12,0.5,0.88][h]-0.5)*s*1.3, hr=[0.92,1.07,0.92][h];
      putM(m,LHOOP,wx(lx)+hx*c,Y+y,wz(lz)-hx*sn,ry,0.08,s*hr,s*hr,2); }
    // a tap and a leaf burned into the head
    var ex=wx(lx)+c*s*0.66, ez=wz(lz)-sn*s*0.66;
    putM(m,BX([0.78,0.60,0.25]),ex,Y+y-0.05,ez,ry,0.22,0.12,0.12,2);
    flatPoly(m,ex-c*0.02,Y+y-s*0.2,ez+sn*0.02,ry+Math.PI/2,0,[[0,0],[s*0.16,s*0.2],[0,s*0.42],[-s*0.16,s*0.2]],C.gold,2,true);
    // the cradle
    for(var e=-1;e<=1;e+=2){ var cx=wx(lx)+e*s*0.35*c, cz=wz(lz)-e*s*0.35*sn;
      putM(m,BX(C.woodD),cx,Y+y-s*0.5-0.05,cz,ry,0.14,s*0.4,s*1.05,2); }
  }

  /* --- floor: flagstones in running courses, mossy round the tree --- */
  var T=HALL.tree, Dd=HALL.dais;
  quadOut(m,[wx(-W),Y-0.02,wz(-D)],[wx(W),Y-0.02,wz(-D)],[wx(W),Y-0.02,wz(D)],[wx(-W),Y-0.02,wz(D)],[0,1,0],[0.22,0.19,0.16],0);
  for(var row=0,zz=-D;zz<D-0.01;row++){
    var dz=Math.min(1.45,D-zz), xx=-W-(row%2?0.7:0);
    while(xx<W-0.01){ var dx=1.2+r()*1.1, x0=Math.max(-W,xx), x1=Math.min(W,xx+dx); xx+=dx;
      if(x1-x0<0.2) continue;
      if((x0+x1)/2<Dd.x1&&zz+dz/2<Dd.z1+1.2) continue;
      var dt=Math.hypot((x0+x1)/2-T.x,zz+dz/2-T.z), base=C.floor;
      if(dt<6&&r()<1-dt/6) base=mix3(C.floor,C.moss,0.5*(1-dt/6)+0.2);
      var col=jit(r,base,0.22), e=0.025;
      quadOut(m,[wx(x0+e),Y,wz(zz+e)],[wx(x1-e),Y,wz(zz+e)],[wx(x1-e),Y,wz(zz+dz-e)],[wx(x0+e),Y,wz(zz+dz-e)],[0,1,0],col,0);
    }
    zz+=dz;
  }
  /* --- the walls: a stone footing, then upright planks between timber posts --- */
  function wallRun(side){
    // side: 0 north (z=-D, faces +z), 1 south (z=+D, faces -z), 2 west (x=-W, faces +x), 3 east (x=+W, faces -x)
    var alongX=side<2, len=alongX?2*W:2*D, s0=alongX?-W:-D;
    function P(t,y,o){ o=o||0; if(side===0) return [wx(t),Y+y,wz(-D+o)]; if(side===1) return [wx(t),Y+y,wz(D-o)]; if(side===2) return [wx(-W+o),Y+y,wz(t)]; return [wx(W-o),Y+y,wz(t)]; }
    var out=side===0?[0,0,1]:side===1?[0,0,-1]:side===2?[1,0,0]:[-1,0,0];
    var top=WT;
    // planks
    for(var t=s0;t<s0+len-0.01;){ var w=0.42+r()*0.2, t1=Math.min(s0+len,t+w);
      quadOut(m,P(t,1.5),P(t1,1.5),P(t1,top),P(t,top),out,jit(r,C.plank,0.25),0); t=t1; }
    // the gable above the side wall's height, on the end walls
    if(alongX){ for(var t3=s0;t3<s0+len-0.01;){ var w3=0.5+r()*0.2, t4=Math.min(s0+len,t3+w3), y3=hallCeil(t3), y4=hallCeil(t4);
        var a=P(t3,top), b=P(t4,top), c=P(t4,y4), d=P(t3,y3);
        quadOut(m,a,b,c,d,out,jit(r,C.plank,0.25),0); t3=t4; } }
    // stone footing: blocks in two courses
    for(var cr=0;cr<2;cr++){ for(var t5=s0+(cr?0.45:0);t5<s0+len-0.01;){ var bw=0.7+r()*0.6, t6=Math.min(s0+len,t5+bw), y0=cr*0.75, mid=(t5+t6)/2, pp=P(mid,0,0.12);
        putM(m,BX(jit(r,C.stone,0.25)),pp[0],pp[1]+y0,pp[2],alongX?0:Math.PI/2,(t6-t5-0.06),0.72,0.3,0); t5=t6; } }
    // posts, a rail on the footing and a plate at the top
    var a0=P(s0,1.5,0.14), a1=P(s0+len,1.5,0.14); beamTo(m,a0,a1,0.22,0.16,C.woodD,0);
    var b0=P(s0,top-0.2,0.18), b1=P(s0+len,top-0.2,0.18); beamTo(m,b0,b1,0.4,0.35,C.woodD,0);
    var np=Math.round(len/4.7);
    for(var k=1;k<np;k++){ var tp=s0+len*k/np, q0=P(tp,0,0.2), q1=P(tp,top,0.2);
      beamTo(m,q0,q1,0.5,0.4,C.wood,0); }
  }
  for(var sd=0;sd<4;sd++) wallRun(sd);
  /* --- the roof: planked slopes up to the ridge, arched trusses across --- */
  for(var sg=-1;sg<=1;sg+=2) for(var zz2=-D;zz2<D-0.01;){ var w2=0.55+r()*0.25, z2=Math.min(D,zz2+w2);
      var A=[wx(sg*W),Y+WT,wz(zz2)], B=[wx(0),Y+HALL.ridge,wz(zz2)], Cc=[wx(0),Y+HALL.ridge,wz(z2)], Dq=[wx(sg*W),Y+WT,wz(z2)];
      quadOut(m,A,B,Cc,Dq,[-sg*0.3,-1,0],jit(r,C.plank,0.3),0); zz2=z2; }
  beamTo(m,[wx(0),Y+HALL.ridge-0.25,wz(-D)],[wx(0),Y+HALL.ridge-0.25,wz(D)],0.5,0.5,C.woodD,0);
  for(var sg2=-1;sg2<=1;sg2+=2) for(var pz=-D;pz<=D;pz+=7) beamTo(m,[wx(sg2*W*0.5),Y+hallCeil(W*0.5)-0.2,wz(-D)],[wx(sg2*W*0.5),Y+hallCeil(W*0.5)-0.2,wz(D)],0.35,0.35,C.woodD,0);
  var NT=6;
  for(var k=1;k<NT;k++){ var tz=-D+2*D*k/NT;
    for(var s2=-1;s2<=1;s2+=2){
      // the rafter under the slope
      beam([s2*(W-0.3),WT-0.25,tz],[0,HALL.ridge-0.45,tz],0.45,0.4,C.wood);
      // a curved brace from the post down the wall, sweeping up under the rafter
      var prev=null;
      for(var q=0;q<=7;q++){ var t=q/7, ang=t*Math.PI/2, ax=s2*(W-0.3-Math.sin(ang)*6.2), ay=WT-3.6+(1-Math.cos(ang))*3.0+Math.sin(ang)*0.9;
        var pt=[ax,ay,tz]; if(prev) beam(prev,pt,0.42,0.38,C.wood); prev=pt; }
      // a post on the wall to carry it
      beam([s2*(W-0.25),0,tz],[s2*(W-0.25),WT,tz],0.55,0.5,C.woodD);
    }
    // a collar tie and a king post
    beam([-6.4,10.2,tz],[6.4,10.2,tz],0.4,0.4,C.woodD);
    beam([0,10.2,tz],[0,HALL.ridge-0.4,tz],0.35,0.35,C.woodD);
  }

  /* --- the hearth on the west wall --- */
  var hz=HALL.hearth.z, hx=-W;
  // chimney breast: solid jambs and a lintel, faced with dressed stones in courses
  var FX=hx+2.6, OW=1.9, OH=3.2;                    // front face, half the opening, its height
  box(C.stoneD,hx+1.3,0,hz-(OW+4)/2,2.6,WT,4-OW,0,0); box(C.stoneD,hx+1.3,0,hz+(OW+4)/2,2.6,WT,4-OW,0,0);
  box(C.stoneD,hx+1.3,OH,hz,2.6,WT-OH,2*OW,0,0);
  for(var cy=0,ci=0;cy<WT-0.01;ci++){ var chh=0.55+r()*0.25; chh=Math.min(chh,WT-cy);
    for(var cz=hz-4+(ci%2?0.35:0);cz<hz+4-0.01;){ var cw=0.7+r()*0.6, cz1=Math.min(hz+4,cz+cw);
      var inOpen=cy<OH-0.1&&cz1>hz-OW+0.05&&cz<hz+OW-0.05;
      if(!inOpen) box(jit(r,C.stone,0.3),FX+0.05,cy+0.03,(cz+cz1)/2,0.14,chh-0.06,cz1-cz-0.06,0,0);
      cz=cz1; }
    cy+=chh; }
  // the firebox: a sooty back and sides
  box([0.09,0.07,0.06],hx+0.5,0,hz,0.3,OH,2*OW,0,0);
  for(var vs=0;vs<9;vs++){ var va=vs/8*Math.PI, vzz=hz-Math.cos(va)*(OW+0.1), vy=OH-0.55+Math.sin(va)*0.55;
    box(jit(r,[0.36,0.33,0.30],0.15),FX+0.1,vy,vzz,0.22,0.5,0.55,0,0); }
  // the hearthstone, the mantle and its candles
  box(jit(r,C.stoneD,0.1),hx+2.9,0,hz,1.2,0.22,6.4,0,0);
  box(C.woodD,hx+2.85,3.45,hz,0.75,0.3,7.2,0,0);
  for(var mc=-3;mc<=3;mc++) if(mc) candle(hx+2.9,3.75,hz+mc*0.95,0.2+r()*0.3);
  // the fire: logs, flames, and the cauldron on its chain
  var LOG=layDown(coneMesh([0.34,0.22,0.13],7,0.5,0.5));
  for(var lg=0;lg<3;lg++) putM(m,LOG,wx(hx+1.6),Y+0.25+(lg===2?0.3:0),wz(hz+(lg-1)*0.5),lg*0.4-0.4+Math.PI/2,0.3,2.4,0.3,0);
  addMesh(g,coneMesh([1.0,0.55,0.16],7,0.5,0),wx(hx+1.6),Y+0.35,wz(hz),0,1.8,1.6,1.4);
  addMesh(g,coneMesh([1.0,0.80,0.30],6,0.5,0),wx(hx+1.65),Y+0.35,wz(hz-0.4),0.7,1.0,1.25,0.9);
  addMesh(g,coneMesh([1.0,0.92,0.55],6,0.5,0),wx(hx+1.7),Y+0.35,wz(hz+0.45),0.3,0.7,0.95,0.7);
  addMesh(g,blobMesh([1.0,0.45,0.12],0.2,1),wx(hx+1.6),Y+0.1,wz(hz),0,2.4,0.35,2.6);
  beam([hx+1.75,1.95,hz],[hx+1.75,3.3,hz],0.06,0.06,C.iron);
  putM(m,blobMesh([0.14,0.13,0.13],0,2),wx(hx+1.75),Y+1.05,wz(hz),0,1.2,0.95,1.2,0);
  putM(m,coneMesh([0.10,0.10,0.10],10,0.5,0.5),wx(hx+1.75),Y+1.78,wz(hz),0,0.95,0.08,0.95,0);
  addMesh(g,coneMesh([0.55,0.68,0.30],10,0.5,0.5),wx(hx+1.75),Y+1.80,wz(hz),0,0.82,0.02,0.82);
  light(hx+2.4,1.2,hz,4.0,1.7,[1.0,0.58,0.26]); light(hx+5.5,2.4,hz,7,0.55,[1.0,0.66,0.36]);
  collBox(wx(hx+1.6),wz(hz),1.95,3.6,0);
  // above the mantle: a banner with an old elk skull and its antlers
  banner(hx+2.62,hz,4.15,Math.PI/2,2.1,2.7);
  putM(m,blobMesh(C.bone,0.05,1),wx(hx+2.75),Y+6.6,wz(hz),0,0.55,0.75,0.45,0);
  for(var ad=-1;ad<=1;ad+=2){ var a0=[hx+2.8,7.1,hz+ad*0.2], a1=[hx+3.0,7.7,hz+ad*0.9], a2=[hx+2.9,8.2,hz+ad*1.55];
    beam(a0,a1,0.12,0.12,C.bone); beam(a1,a2,0.1,0.1,C.bone);
    beam(a1,[hx+3.05,8.05,hz+ad*0.75],0.08,0.08,C.bone); beam(a2,[hx+2.9,8.7,hz+ad*1.4],0.07,0.07,C.bone); beam(a2,[hx+2.95,8.2,hz+ad*2.0],0.07,0.07,C.bone); }
  // firewood and a kettle
  for(var fw=0;fw<9;fw++){ var fr=fw<4?0:(fw<7?1:2), fi=fw-(fr===0?0:(fr===1?4:7));
    putM(m,layDown(coneMesh(jit(r,[0.46,0.32,0.18],0.2),7,0.5,0.5)),wx(hx+1.2+fi*0.42+fr*0.2),Y+0.2+fr*0.36,wz(hz+4.7),Math.PI/2,0.38,1.6,0.38,2); }
  collBox(wx(hx+2.0),wz(hz+4.7),1.3,0.9,0);
  // the rug, two armchairs with a fur, and a footstool
  box(C.gold,-12.4,0.005,hz,5.6,0.02,6.6,0,0); box(C.rug,-12.4,0.012,hz,5.3,0.02,6.3,0,0);
  for(var rk=0;rk<4;rk++){ var ra=rk/4*6.283+0.785, rrx=-12.4+Math.cos(ra)*1.6, rrz=hz+Math.sin(ra)*2.0;
    putM(m,blobMesh(C.gold,0,1),wx(rrx),Y+0.02,wz(rrz),ra,0.7,0.02,0.32,0); }
  putM(m,blobMesh([0.95,0.78,0.34],0,1),wx(-12.4),Y+0.02,wz(hz),0,1.4,0.02,0.7,0);
  function armchair(lx,lz,f){
    var c=Math.cos(f), s=Math.sin(f); function at(u,v){ return [lx+u*c+v*s, lz-u*s+v*c]; }
    var p=at(0,0); box([0.34,0.18,0.12],p[0],0.2,p[1],1.05,0.38,1.0,f,2);
    var b=at(0,-0.45); box([0.30,0.15,0.10],b[0],0.2,b[1],1.1,1.35,0.24,f,2);
    for(var i=-1;i<=1;i+=2){ var q=at(i*0.5,0); box(C.woodD,q[0],0.2,q[1],0.18,0.72,1.0,f,2); }
    var cu=at(0,0.02); box([0.42,0.22,0.14],cu[0],0.58,cu[1],0.82,0.12,0.8,f,2);
    collCircle(wx(lx),wz(lz),0.75,1.2);
  }
  armchair(-12.3,hz-3.2,0.75*Math.PI/2+0.25); armchair(-12.3,hz+3.2,Math.PI/2+0.55);
  var fu=[-12.4,hz+3.35]; putM(m,blobMesh(C.fur,0.18,1),wx(fu[0]-0.2),Y+1.05,wz(fu[1]),0.6,0.5,0.6,1.0,2);
  putM(m,blobMesh(C.fur,0.2,1),wx(-12.25),Y+0.62,wz(hz+3.2),0.6,0.9,0.12,0.9,2);
  putM(m,coneMesh([0.40,0.22,0.14],8,0.5,0.45),wx(-11),Y,wz(hz),0,0.7,0.42,0.7,2);

  /* --- the bar on the east side, with a gallery over it --- */
  var bx=HALL.bar.x, bz0=HALL.bar.z0, bz1=HALL.bar.z1;
  box(C.woodD,bx,0,(bz0+bz1)/2,1.0,1.12,bz1-bz0,0,0);
  box([0.26,0.15,0.08],bx-0.05,1.12,(bz0+bz1)/2,1.45,0.14,bz1-bz0+0.3,0,0);
  for(var pz2=bz0;pz2<=bz1+0.01;pz2+=1.6) box(C.wood,bx-0.52,0,pz2,0.14,1.12,0.18,0,0);
  box(C.woodD,(bx+15)/2,0,bz1+0.5,15-bx+0.5,1.12,1.0,0,0);
  box([0.26,0.15,0.08],(bx+15)/2-0.1,1.12,bz1+0.5,15-bx+0.9,0.14,1.45,0,0);
  collBox(wx(bx),wz((bz0+bz1)/2),0.6,(bz1-bz0)/2,0);
  collBox(wx((bx+15)/2),wz(bz1+0.5),(15-bx)/2+0.3,0.6,0);
  banner(bx-0.6,-6.0,0.1,-Math.PI/2,1.0,1.0,0.0); banner(bx-0.6,2.2,0.1,-Math.PI/2,1.0,1.0,0.0);
  // on the bar: mugs, a bottle or two and candles
  for(var bm=0;bm<8;bm++){ var mz=bz0+0.8+bm*1.85+(r()-0.5)*0.6;
    if(bm%3===1) candle(bx-0.1,1.26,mz,0.26);
    else if(bm%3===2){ putM(m,coneMesh([0.20,0.42,0.18],8,0.5,0.32),wx(bx),Y+1.26,wz(mz),0,0.22,0.45,0.22,2);
      putM(m,coneMesh([0.20,0.42,0.18],6,0.5,0.4),wx(bx),Y+1.7,wz(mz),0,0.07,0.2,0.07,2); }
    else putM(m,coneMesh(C.pewter,8,0.5,0.46),wx(bx-0.2),Y+1.26,wz(mz),0,0.22,0.3,0.22,2); }
  // stools along the bar
  for(var st=0;st<6;st++){ var sz=bz0+1.0+st*2.6;
    putM(m,coneMesh(C.woodL,10,0.5,0.5),wx(bx-1.35),Y+0.78,wz(sz),0,0.6,0.1,0.6,2);
    for(var sl=0;sl<3;sl++){ var sa=sl/3*6.283; box(C.woodD,bx-1.35+Math.cos(sa)*0.2,0,sz+Math.sin(sa)*0.2,0.07,0.8,0.07,sa,2); }
    collCircle(wx(bx-1.35),wz(sz),0.3,0.8); }
  // the back bar: a cabinet and three shelves of bottles, some aglow
  box(C.woodD,W-0.5,0,(bz0+bz1)/2,1.0,1.15,bz1-bz0+1,0,0);
  for(var sh2=0;sh2<3;sh2++){ var shy=2.0+sh2*0.95;
    box(C.wood,W-0.45,shy,(bz0+bz1)/2,0.85,0.1,bz1-bz0+1,0,0);
    for(var bt=bz0;bt<bz1+0.3;bt+=0.38+r()*0.12){ var kind=r(), bcol=kind<0.45?[0.30,0.72,0.26]:(kind<0.75?[0.80,0.50,0.16]:[0.55,0.85,0.40]), bh=0.42+r()*0.25;
      addMesh(g,coneMesh(jit(r,bcol,0.4),7,0.5,0.34),wx(W-0.45+(r()-0.5)*0.3),Y+shy+0.1,wz(bt),0,0.2,bh,0.2);
      putM(m,coneMesh([0.16,0.12,0.08],6,0.5,0.4),wx(W-0.45),Y+shy+0.1+bh,wz(bt),0,0.07,0.14,0.07,2); }
    light(W-1.0,shy+0.4,-6,2.2,0.35,[0.55,1.0,0.45]); light(W-1.0,shy+0.4,2,2.2,0.35,[0.55,1.0,0.45]);
  }
  for(var bb=bz0;bb<bz1;bb+=2.1) box(jit(r,[0.70,0.50,0.22],0.1),W-0.5,1.15,bb,0.6,0.12,0.6,0,0);
  // big kegs in the corner behind the bar
  keg(15.8,1.05,-11.2,Math.PI,1.6); keg(17.6,1.05,-11.2,Math.PI,1.6); keg(16.7,2.65,-11.2,Math.PI,1.4);
  collBox(wx(16.7),wz(-11.4),2.4,1.4,0);
  barrel(17.5,9.2,1.1); barrel(16.3,10.3,1.0); barrel(17.8,10.6,0.95); barrel(17.0,9.6,0.9,1.27);
  // the gallery: floor, a railing on posts, doors to the rooms upstairs
  var GY=5.0, gx0=11.2;
  box(C.woodD,(gx0+W)/2,GY-0.35,(-D+9.5)/2,W-gx0,0.4,D+9.5,0,0);
  for(var jo=-D+0.6;jo<9.5;jo+=1.5) box(C.wood,(gx0+W)/2,GY-0.55,jo,W-gx0,0.2,0.22,0,0);
  beamTo(m,[wx(gx0),Y+GY+1.05,wz(-D)],[wx(gx0),Y+GY+1.05,wz(9.5)],0.18,0.14,C.woodL,0);
  beamTo(m,[wx(gx0),Y+GY+0.1,wz(-D)],[wx(gx0),Y+GY+0.1,wz(9.5)],0.16,0.14,C.woodD,0);
  for(var bl=-D+0.4;bl<9.5;bl+=0.45) box(C.wood,gx0,GY+0.1,bl,0.09,0.95,0.09,0,0);
  beamTo(m,[wx(gx0),Y+GY+0.05,wz(9.5)],[wx(W),Y+GY+0.05,wz(9.5)],0.2,0.2,C.woodD,0);
  var GP=[-9.9,-3.8,2.6,9.3];
  for(var gp=0;gp<GP.length;gp++){ beam([gx0+0.15,0,GP[gp]],[gx0+0.15,GY+1.2,GP[gp]],0.42,0.42,C.wood);
    collCircle(wx(gx0+0.15),wz(GP[gp]),0.32);
    for(var bs=-1;bs<=1;bs+=2){ if((gp===0&&bs<0)||(gp===GP.length-1&&bs>0)) continue;
      beam([gx0+0.15,GY-2.0,GP[gp]],[gx0+0.15,GY-0.5,GP[gp]+bs*1.5],0.3,0.3,C.wood); } }
  for(var dr=0;dr<3;dr++){ var dz2=-8+dr*6;
    quadOut(m,[wx(W-0.05),Y+GY,wz(dz2-0.8)],[wx(W-0.05),Y+GY,wz(dz2+0.8)],[wx(W-0.05),Y+GY+2.4,wz(dz2+0.8)],[wx(W-0.05),Y+GY+2.4,wz(dz2-0.8)],[-1,0,0],[0.22,0.13,0.07],0);
    box(C.woodD,W-0.1,GY+2.4,dz2,0.2,0.2,1.9,0,0); }
  for(var gl=0;gl<4;gl++) lantern(gx0-0.1,GY-1.3,-11+gl*6.2,GY-0.4);
  banner(gx0-0.12,-6.9,GY-1.5,-Math.PI/2,1.2,2.4); banner(gx0-0.12,5.8,GY-1.5,-Math.PI/2,1.2,2.4);
  // the sign on the gallery front
  box([0.24,0.14,0.08],gx0-0.25,GY-0.1,-0.6,0.18,1.9,5.0,0,0);
  box(C.gold,gx0-0.3,GY-0.02,-0.6,0.12,1.74,4.84,0,0);
  box(C.greenD,gx0-0.34,GY+0.05,-0.6,0.12,1.6,4.7,0,0);
  HALLSIGN={x:wx(gx0-0.42),y:Y+GY+0.85,z:wz(-0.6),w:4.6,h:1.55,ry:-Math.PI/2};
  // the stag over the sign
  stag(gx0-0.3,GY+2.55,-0.6,-Math.PI/2);
  // the stairs up, along the north wall
  var sx0=4.9, steps=12;
  for(var sp=0;sp<steps;sp++){ var sx=sx0+sp*(gx0-sx0)/steps, sy=(sp+1)*GY/steps;
    box(jit(r,C.wood,0.15),sx+0.27,0,-D+1.25,0.54,sy,2.3,0,0); }
  beamTo(m,[wx(sx0),Y+1.0,wz(-D+2.45)],[wx(gx0),Y+GY+1.0,wz(-D+2.45)],0.14,0.14,C.woodL,0);
  for(var sb=0;sb<steps;sb+=2){ var sbx=sx0+sb*(gx0-sx0)/steps+0.3; box(C.wood,sbx,(sb+1)*GY/steps,-D+2.45,0.08,1.0,0.08,0,0); }
  collBox(wx((sx0+gx0)/2),wz(-D+1.25),(gx0-sx0)/2,1.25,0);
  function stag(lx,y,lz,f){
    var c=Math.cos(f), s=Math.sin(f); function at(u,v){ return [lx+u*c+v*s, lz-u*s+v*c]; }
    var pl=at(0,0); box(C.woodD,pl[0],y-0.7,pl[1],1.0,1.3,0.14,f,0);
    var nk=at(0,0.35); putM(m,blobMesh([0.46,0.32,0.20],0.08,1),wx(nk[0]),Y+y-0.6,wz(nk[1]),f,0.75,1.1,0.75,0);
    var hd=at(0,0.75); putM(m,blobMesh([0.50,0.35,0.22],0.05,1),wx(hd[0]),Y+y+0.05,wz(hd[1]),f,0.5,0.6,0.9,0);
    var mz2=at(0,1.15); putM(m,blobMesh([0.36,0.25,0.16],0,1),wx(mz2[0]),Y+y-0.05,wz(mz2[1]),f,0.32,0.36,0.4,0);
    for(var e=-1;e<=1;e+=2){ var er=at(e*0.32,0.6); putM(m,blobMesh([0.42,0.30,0.20],0,1),wx(er[0]),Y+y+0.3,wz(er[1]),f,0.35,0.16,0.14,0);
      var b0=at(e*0.18,0.65), b1=at(e*0.6,0.55), b2=at(e*1.0,0.35), b3=at(e*1.25,0.2);
      beamTo(m,[wx(b0[0]),Y+y+0.3,wz(b0[1])],[wx(b1[0]),Y+y+0.95,wz(b1[1])],0.09,0.09,C.bone,0);
      beamTo(m,[wx(b1[0]),Y+y+0.95,wz(b1[1])],[wx(b2[0]),Y+y+1.5,wz(b2[1])],0.08,0.08,C.bone,0);
      beamTo(m,[wx(b2[0]),Y+y+1.5,wz(b2[1])],[wx(b3[0]),Y+y+2.0,wz(b3[1])],0.07,0.07,C.bone,0);
      var t1=at(e*0.75,0.75), t2=at(e*1.3,0.55);
      beamTo(m,[wx(b1[0]),Y+y+0.95,wz(b1[1])],[wx(t1[0]),Y+y+1.4,wz(t1[1])],0.06,0.06,C.bone,0);
      beamTo(m,[wx(b2[0]),Y+y+1.5,wz(b2[1])],[wx(t2[0]),Y+y+1.75,wz(t2[1])],0.06,0.06,C.bone,0); }
  }

  /* --- the dais in the north-west, under tall windows --- */
  var dh=Dd.h;
  box(C.woodD,(-W+Dd.x1)/2,0,(-D+Dd.z1)/2,W+Dd.x1,dh-0.04,Dd.z1+D,0,0);
  for(var pk=-D;pk<Dd.z1-0.01;pk+=0.55) box(jit(r,C.woodL,0.2),(-W+Dd.x1)/2,dh-0.06,pk+0.275,W+Dd.x1,0.06,0.52,0,0);
  box(C.stone,(-W+Dd.x1)/2,0,Dd.z1+0.2,W+Dd.x1,0.6,0.4,0,0);
  box(C.stone,(-W+Dd.x1)/2,0,Dd.z1+0.6,W+Dd.x1,0.3,0.4,0,0);
  box(C.woodL,(-W+Dd.x1)/2,dh-0.08,Dd.z1-0.05,W+Dd.x1,0.1,0.18,0,0);
  // a balustrade down its east side
  beamTo(m,[wx(Dd.x1-0.1),Y+dh+0.95,wz(-D+2.5)],[wx(Dd.x1-0.1),Y+dh+0.95,wz(Dd.z1)],0.14,0.14,C.woodL,0);
  for(var bu=-D+2.6;bu<Dd.z1;bu+=0.45) box(C.wood,Dd.x1-0.1,dh,bu,0.09,0.95,0.09,0,0);
  collBox(wx(Dd.x1-0.1),wz((-D+2.5+Dd.z1)/2),0.15,(Dd.z1+D-2.5)/2,0);
  // the long feasting table with benches
  var ftz=-11.4, ftx=-7;
  box(C.woodL,ftx,dh+0.78,ftz,9.0,0.14,1.5,0,2);
  for(var fl=-1;fl<=1;fl+=2){ box(C.woodD,ftx+fl*3.8,dh,ftz,0.2,0.78,1.2,0,2);
    box(C.wood,ftx,dh+0.44,ftz+fl*1.15,8.4,0.1,0.45,0,2); box(C.woodD,ftx,dh,ftz+fl*1.15,7.8,0.44,0.12,0,2); }
  box(C.green,ftx,dh+0.925,ftz,8.6,0.012,0.6,0,2);
  for(var fc=-3;fc<=3;fc+=2) candle(ftx+fc*1.2,dh+0.92,ftz,0.3+r()*0.2);
  for(var fm=0;fm<6;fm++) putM(m,coneMesh(C.pewter,8,0.5,0.46),wx(ftx-3.6+fm*1.45),Y+dh+0.92,wz(ftz+(fm%2?0.45:-0.45)),0,0.2,0.26,0.2,2);
  collBox(wx(ftx),wz(ftz),4.6,1.5,0);
  // tall green windows in the north wall, with leading, and the light falling through them
  function gothic(lx,y0,w,h,ry,wallOff){
    var c=Math.cos(ry), s=Math.sin(ry), pts=[[-w/2,0],[w/2,0],[w/2,h*0.72]];
    for(var a=1;a<6;a++){ var t=a/6; pts.push([w/2*Math.cos(t*Math.PI/2)*(1-t*0.15),h*0.72+h*0.28*Math.sin(t*Math.PI/2)]); }
    pts.push([0,h]);
    for(var a2=5;a2>=1;a2--){ var t2=a2/6; pts.push([-w/2*Math.cos(t2*Math.PI/2)*(1-t2*0.15),h*0.72+h*0.28*Math.sin(t2*Math.PI/2)]); }
    pts.push([-w/2,h*0.72]);
    var ox=wx(lx), oz=wz(wallOff);
    // a cool forest glow, brighter at the top
    flatPoly(g,ox,Y+y0,oz,ry,0.02,pts,[0.50,0.82,0.74],0,true);
    flatPoly(g,ox,Y+y0+h*0.45,oz,ry,0.03,pts.map(function(p){ return [p[0]*0.7,p[1]*0.55]; }),[0.70,0.95,0.85],0,true);
    // leading: a cross of mullions and transoms, and a deep stone frame
    for(var mu=-1;mu<=1;mu++) putM(m,BX(C.iron),ox+mu*w/3*c+0.06*s,Y+y0,oz-mu*w/3*s+0.06*c,ry,0.06,h*0.95,0.04,0);
    for(var tr=1;tr<5;tr++) putM(m,BX(C.iron),ox+0.06*s,Y+y0+h*tr/5,oz+0.06*c,ry,w,0.05,0.04,0);
    for(var fs=-1;fs<=1;fs+=2) putM(m,BX(C.stoneD),ox+fs*(w/2+0.18)*c+0.1*s,Y+y0-0.2,oz-fs*(w/2+0.18)*s+0.1*c,ry,0.36,h*0.8,0.3,0);
    putM(m,BX(C.stoneD),ox+0.15*s,Y+y0-0.25,oz+0.15*c,ry,w+0.8,0.25,0.5,0);
    return {x:ox,z:oz,c:c,s:s};
  }
  var winN=[-11.5,-3.0];
  for(var wn=0;wn<winN.length;wn++){ var wo=gothic(winN[wn],dh+1.6,2.6,5.0,0,-D+0.02);
    light(winN[wn],dh+3.5,-D+2.0,4.5,0.8,[0.55,0.85,0.80]);
    // a shaft of light down onto the dais
    var sx2=wx(winN[wn]), sy2=Y+dh+1.6, sz2=wz(-D+0.1);
    var A2=[sx2-1.2,sy2+4.2,sz2], B2=[sx2+1.2,sy2+4.2,sz2], C2=[sx2+1.3,Y+dh+0.02,sz2+5.8], D2=[sx2-1.3,Y+dh+0.02,sz2+5.8], E2=[sx2-1.2,sy2+0.4,sz2], F2=[sx2+1.2,sy2+0.4,sz2], G2=[sx2+1.3,Y+dh+0.02,sz2+3.0], H2=[sx2-1.3,Y+dh+0.02,sz2+3.0];
    var sc=[0.75,0.95,0.80];
    sh.quad(A2,B2,C2,D2,sc); sh.quad(E2,F2,G2,H2,sc); sh.quad(A2,E2,H2,D2,sc); sh.quad(B2,F2,G2,C2,sc); }
  // a round window high in the north gable
  var rw=[]; for(var ro=0;ro<16;ro++){ var ra2=ro/16*6.283; rw.push([Math.cos(ra2)*1.3,Math.sin(ra2)*1.3]); }
  flatPoly(g,wx(0),Y+9.6,wz(-D+0.02),0,0.02,rw,[0.55,0.85,0.75],0,true);
  for(var rs=0;rs<4;rs++) putM(m,BX(C.iron),wx(0),Y+8.3,wz(-D+0.08),rs*Math.PI/4,0.05,2.6,0.04,0);
  // south windows either side of the door
  for(var sw=-1;sw<=1;sw+=2){ gothic(sw*9.5,1.7,2.4,4.2,Math.PI,D-0.02); light(sw*9.5,3.5,D-1.8,4.0,0.6,[0.55,0.85,0.80]); }
  // the door out: a pair of great doors standing open on daylight
  flatPoly(g,wx(0),Y,wz(D-0.03),Math.PI,0,[[-1.7,0],[1.7,0],[1.7,3.4],[1.1,4.2],[0,4.5],[-1.1,4.2],[-1.7,3.4]],[0.85,0.95,0.80],0,true);
  for(var dd=-1;dd<=1;dd+=2){ var dx3=dd*2.1;
    box([0.30,0.18,0.10],dx3+dd*0.35,0,D-1.0,0.12,3.6,1.6,0,0);
    for(var db=0;db<3;db++) box(C.iron,dx3+dd*0.35-dd*0.08,0.5+db*1.2,D-1.0,0.04,0.12,1.5,0,0); }
  for(var df=-1;df<=1;df+=2) box(C.woodD,df*1.85,0,D-0.15,0.4,4.6,0.4,0,0);
  box(C.woodD,0,4.5,D-0.15,4.1,0.4,0.4,0,0);
  light(0,2.0,D-1.5,5.0,0.9,[0.75,0.90,0.70]);
  addMesh(g,discMesh(16),wx(0),Y+0.015,wz(D-1.6),0,3.4,1,3.2,[0.38,0.42,0.32]);
  // the stag over the door, and banners on the south wall
  stag(0,6.5,D-0.1,Math.PI);
  banner(-5.0,D-0.02,2.2,Math.PI,1.4,3.4); banner(5.0,D-0.02,2.2,Math.PI,1.4,3.4);
  banner(-W+0.02,-9.5,2.6,Math.PI/2,1.4,3.4); banner(-W+0.02,8.5,2.6,Math.PI/2,1.4,3.4);
  banner(-7.2,-D+0.02,dh+2.4,0,1.3,3.4);
  // candle sconces round the walls
  function sconce(lx,lz,ry){ var c=Math.cos(ry), s=Math.sin(ry);
    putM(m,BX(C.iron),wx(lx)+s*0.15,Y+2.6,wz(lz)+c*0.15,ry,0.12,0.12,0.36,0);
    putM(m,coneMesh(C.iron,8,0.3,0.5),wx(lx)+s*0.32,Y+2.62,wz(lz)+c*0.32,0,0.32,0.1,0.32,0);
    candle(lx+s*0.32,2.72,lz+c*0.32,0.28); }
  sconce(-W,-6.4,Math.PI/2); sconce(-W,5.0,Math.PI/2); sconce(-W,11.5,Math.PI/2);
  sconce(-6.5,D,Math.PI); sconce(6.5,D,Math.PI); sconce(-14.5,D,Math.PI); sconce(13.5,D,Math.PI);
  sconce(-W+0.05,-12,Math.PI/2); sconce(1.5,-D,0);

  /* --- the heart of the hall: the old tree --- */
  var tx=T.x, tz=T.z;
  var TR=latheMesh([[2.3,0,C.barkD],[1.75,0.5],[1.42,1.3],[1.3,2.5],[1.22,4.5],[1.12,6.5],[1.05,8.5],[1.0,10.5],[0.98,13]],14,C.bark,0.35,11);
  putM(m,TR,wx(tx),Y-0.1,wz(tz),0.3,1,1,1,2);
  // ridges of bark up the trunk
  for(var rb=0;rb<9;rb++){ var ba=rb/9*6.283+0.2;
    beam([tx+Math.cos(ba)*1.55,0.2,tz+Math.sin(ba)*1.55],[tx+Math.cos(ba+0.15)*1.05,7.5,tz+Math.sin(ba+0.15)*1.05],0.28,0.24,C.barkD,2); }
  collCircle(wx(tx),wz(tz),1.7);
  // roots across the flagstones
  for(var rt=0;rt<8;rt++){ var ra3=rt/8*6.283+0.35+(r()-0.5)*0.4, rl2=4.2+r()*3.0, px=tx+Math.cos(ra3)*1.4, pzz=tz+Math.sin(ra3)*1.4, wid=0.75;
    for(var seg=0;seg<6;seg++){ var t3=(seg+1)/6, bend=Math.sin(t3*3+rt)*0.25, a3=ra3+bend;
      var nx2=tx+Math.cos(a3)*(1.4+rl2*t3), nz2=tz+Math.sin(a3)*(1.4+rl2*t3);
      if(nx2<Dd.x1&&nz2<Dd.z1+1.3) break;
      var mxp=(px+nx2)/2, mzp=(pzz+nz2)/2, len=Math.hypot(nx2-px,nz2-pzz), ang=Math.atan2(nz2-pzz,nx2-px);
      putM(m,blobMesh(jit(r,C.bark,0.15),0.1,1),wx(mxp),Y-0.12,wz(mzp),-ang,len*1.25,0.55*(1-t3*0.6),wid*(1-t3*0.55),2);
      px=nx2; pzz=nz2; } }
  // moss, glowing caps and little blue flowers round the base
  for(var mo=0;mo<16;mo++){ var ma=r()*6.283, md=2.0+r()*3.2;
    putM(m,blobMesh(jit(r,C.moss,0.3),0.2,1),wx(tx+Math.cos(ma)*md),Y-0.08,wz(tz+Math.sin(ma)*md),ma,1.0+r()*1.2,0.12,0.7+r()*0.8,0); }
  for(var gc=0;gc<26;gc++){ var ga=r()*6.283, gd=1.6+r()*2.6, gxx=tx+Math.cos(ga)*gd, gzz=tz+Math.sin(ga)*gd;
    if(gc%2){ addMesh(g,blobMesh([0.45,0.85,1.0],0,1),wx(gxx),Y+0.12,wz(gzz),0,0.22,0.12,0.22);
      putM(m,coneMesh([0.80,0.82,0.74],5,0.5,0.4),wx(gxx),Y,wz(gzz),0,0.07,0.14,0.07,2); }
    else addMesh(g,blobMesh(gc%4?[0.60,0.70,1.0]:[0.95,0.80,0.95],0,1),wx(gxx),Y+0.05,wz(gzz),0,0.12,0.08,0.12); }
  light(tx,0.6,tz,3.0,0.45,[0.45,0.80,1.0]);
  // branches along the ceiling, leaves gathered under the roof, vines hanging down
  var BR=[[0.4,9.0],[1.9,8.4],[3.3,9.4],[4.6,8.8],[5.7,9.2]];
  for(var br=0;br<BR.length;br++){ var bang=BR[br][0], by0=BR[br][1], blen=7+r()*3;
    var ex=tx+Math.cos(bang)*blen, ez=tz+Math.sin(bang)*blen; ex=Math.max(-W+1,Math.min(W-1,ex)); ez=Math.max(-D+1,Math.min(D-1,ez));
    var ey=Math.min(hallCeil(ex)-0.5,by0+2.2);
    var midx=tx+Math.cos(bang)*blen*0.5, midz=tz+Math.sin(bang)*blen*0.5, midy=Math.min(hallCeil(midx)-0.6,by0+1.4);
    beam([tx+Math.cos(bang)*0.6,by0-1.2,tz+Math.sin(bang)*0.6],[midx,midy,midz],0.7,0.6,C.bark,2);
    beam([midx,midy,midz],[ex,ey,ez],0.45,0.4,C.bark,2);
    for(var lf=0;lf<5;lf++){ var lt=0.35+lf*0.16, lxx=tx+(ex-tx)*lt+(r()-0.5)*1.6, lzz=tz+(ez-tz)*lt+(r()-0.5)*1.6, lyy=Math.min(hallCeil(lxx)-0.9,by0+1.0+lt*1.6);
      putM(m,blobMesh(jit(r,lf%2?C.leaf:C.leafD,0.25),0.22,1),wx(lxx),Y+lyy,wz(lzz),r()*6,2.4+r()*1.6,1.1+r()*0.6,2.0+r()*1.4,2); }
    for(var vn=0;vn<4;vn++){ var vt=0.3+vn*0.18, vx=tx+(ex-tx)*vt, vz=tz+(ez-tz)*vt, vtop=Math.min(hallCeil(vx)-0.8,by0+0.8+vt*1.6), vlen=2.2+r()*2.8;
      beam([vx,vtop,vz],[vx+(r()-0.5)*0.3,vtop-vlen,vz+(r()-0.5)*0.3],0.05,0.05,C.leafD,2);
      for(var vl=0;vl<4;vl++){ var vy2=vtop-vlen*(vl+0.5)/4;
        putM(m,blobMesh(jit(r,C.leaf,0.3),0,1),wx(vx+(r()-0.5)*0.25),Y+vy2,wz(vz+(r()-0.5)*0.25),r()*6,0.32,0.22,0.24,2); } } }
  // vines along the trusses and down the posts too
  for(var vv=0;vv<14;vv++){ var vxx=(r()-0.5)*2*(W-3), vzz=-D+2*D*((1+(vv%5))/6), vtop2=hallCeil(vxx)-0.4, vlen2=1.2+r()*2.6;
    beam([vxx,vtop2,vzz],[vxx,vtop2-vlen2,vzz],0.04,0.04,C.leafD,2);
    for(var v2=0;v2<3;v2++) putM(m,blobMesh(jit(r,C.leaf,0.3),0,1),wx(vxx+(r()-0.5)*0.2),Y+vtop2-vlen2*(v2+0.5)/3,wz(vzz),r()*6,0.3,0.2,0.24,2); }

  /* --- the chandelier: a wheel of candles on chains --- */
  var chx=-1.5, chz=6.0, chy=6.3, chr=2.0, prv=null;
  for(var cw=0;cw<=12;cw++){ var ca=cw/12*6.283, cp=[chx+Math.cos(ca)*chr,chy,chz+Math.sin(ca)*chr];
    if(prv) beam(prv,cp,0.3,0.24,C.woodD,2); prv=cp; }
  for(var sp2=0;sp2<4;sp2++){ var sa2=sp2/4*6.283; beam([chx,chy,chz],[chx+Math.cos(sa2)*chr,chy,chz+Math.sin(sa2)*chr],0.14,0.14,C.woodD,2);
    beam([chx+Math.cos(sa2)*chr*0.95,chy+0.1,chz+Math.sin(sa2)*chr*0.95],[chx,hallCeil(chx)-0.3,chz],0.05,0.05,C.iron,2); }
  for(var cc=0;cc<8;cc++){ var ca2=cc/8*6.283+0.2; candle(chx+Math.cos(ca2)*chr,chy+0.12,chz+Math.sin(ca2)*chr,0.3,false); }
  light(chx,chy+0.5,chz,6.5,1.25,[1.0,0.72,0.40]);
  // green lanterns hung from the trusses
  var LN=[[-9,-6.5],[7,-7.5],[-11,9.5],[5.5,11],[-4,1.5]];
  for(var ln=0;ln<LN.length;ln++){ var lx2=LN[ln][0], lz2=LN[ln][1], lh=5.4+r()*0.8; lantern(lx2,lh,lz2,hallCeil(lx2)-0.3); }

  /* --- the tables, a few barrels and crates --- */
  table(-9.5,7.5,4,0.3); table(-3.0,10.0,3,1.2); table(4.0,8.0,4,0.6); table(5.6,-1.2,4,0.1); table(-7.6,2.6,3,0.9);
  barrel(-17.8,12.6,1.05); barrel(-16.6,12.9,0.95); barrel(-17.4,11.4,0.9,1.21);
  for(var cr4=0;cr4<3;cr4++){ var crx=-17.6+(cr4%2)*1.05, crz=-12.6, cry=cr4===2?1.0:0;
    box(jit(r,[0.50,0.36,0.20],0.15),crx,cry+(cry?0:dh),crz-(cr4===2?0.5:0),1.0,1.0,1.0,0.1*cr4,2);
    if(cr4<2) collCircle(wx(crx),wz(crz),0.6,1.0); }
  // the walls hold the room in
  collBox(wx(0),wz(-D-1),W+2,1,0); collBox(wx(0),wz(D+1),W+2,1,0);
  collBox(wx(-W-1),wz(0),1,D+2,0); collBox(wx(W-0.5),wz((bz0+bz1)/2),0.9,(bz1-bz0)/2+0.5,0);
  collBox(wx(W+1),wz(0),1,D+2,0);

  // light it, and hand it to three.js
  bakeLight(m,L,[0.30,0.25,0.21]);
  HALL3=new THREE.Mesh(toGeom(m),WORLDMAT); HALL3.frustumCulled=false; HALL3.receiveShadow=true; HALL3.visible=false;
  HALLGLOW=new THREE.Mesh(toGeom(g),new THREE.MeshBasicMaterial({vertexColors:true})); HALLGLOW.frustumCulled=false; HALLGLOW.visible=false;
  HALLSHAFT=new THREE.Mesh(toGeom(sh),new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:0.07,depthWrite:false,side:THREE.DoubleSide}));
  HALLSHAFT.frustumCulled=false; HALLSHAFT.visible=false; HALLSHAFT.renderOrder=2;
  SCENE.add(HALL3); SCENE.add(HALLGLOW); SCENE.add(HALLSHAFT);
  var S=HALLSIGN; S.mesh=signMesh(S,'Bram’s','Greenleaf Tavern'); S.mesh.visible=false; SCENE.add(S.mesh);
  // where Bram stands, and the way in and out
  TAVERN.keeper={x:wx(11.25),z:wz(-0.8),yaw:-Math.PI/2};
  HALL.inAt={x:wx(0.4),z:wz(D-4.6),yaw:Math.PI};
  return m.count()/3+g.count()/3;
}

/* a painted board: words on a canvas, on a quad that faces yaw ry */
function signTexture(top,bottom){
  var cv=document.createElement('canvas'); cv.width=512; cv.height=176;
  var x=cv.getContext('2d');
  x.fillStyle='#173822'; x.fillRect(0,0,512,176);
  x.strokeStyle='#d8ae4a'; x.lineWidth=6; x.strokeRect(10,10,492,156);
  x.strokeStyle='rgba(216,174,74,.5)'; x.lineWidth=2; x.strokeRect(20,20,472,136);
  x.fillStyle='#f1e2b4'; x.textAlign='center'; x.textBaseline='middle';
  x.font='bold 54px Georgia, "Times New Roman", serif'; x.fillText(top,256,60);
  x.font='bold 46px Georgia, "Times New Roman", serif'; x.fillText(bottom,256,122);
  // a little gold leaf either side
  x.fillStyle='#d8ae4a';
  [[60,60],[452,60]].forEach(function(p){ x.beginPath(); x.ellipse(p[0],p[1],10,20,0.5,0,6.283); x.fill(); });
  var t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.NoColorSpace; t.anisotropy=4;
  return t;
}
function signMesh(S,top,bottom){
  var c=Math.cos(S.ry), s=Math.sin(S.ry), w=S.w/2, h=S.h/2;
  function P(u,v){ return [S.x+u*c, S.y+v, S.z-u*s]; }
  var a=P(-w,-h), b=P(w,-h), cc=P(w,h), d=P(-w,h), geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute([].concat(a,b,cc,a,cc,d),3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,0,1,1,0,1],2));
  return new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:signTexture(top,bottom),side:THREE.DoubleSide}));
}

/* ---------- the house in the yard ---------- */
var TAVGLOW=null, TAVSIGN=null, TAVSMOKE=null, CAMBOX=[];
function buildTavern(m,x,z){
  var y=H(x,z), R=TAVERN.ry, c=Math.cos(R), sn=Math.sin(R), r=mulberry(808), g=new MB();
  // tavern-local (lx across the front, lz out of the door) -> world
  function T(lx,lz){ return {x:x+lx*c+lz*sn, z:z-lx*sn+lz*c}; }
  function P3(lx,ly,lz){ var q=T(lx,lz); return [q.x,y+ly,q.z]; }
  function box(col,lx,ly,lz,sx,sy,sz,flag,ry){ var q=T(lx,lz); putM(m,BX(col),q.x,y+ly,q.z,R+(ry||0),sx,sy,sz,flag===undefined?0:flag); }
  function gbox(col,lx,ly,lz,sx,sy,sz){ var q=T(lx,lz); addMesh(g,BX(col),q.x,y+ly,q.z,R,sx,sy,sz); }
  function beam(a,b,w,t,col,flag){ beamTo(m,P3(a[0],a[1],a[2]),P3(b[0],b[1],b[2]),w,t,col,flag||0); }
  var stone=[0.52,0.49,0.45], stoneD=[0.38,0.36,0.33], plaster=[0.84,0.78,0.64], timber=[0.30,0.20,0.12], roof=[0.32,0.24,0.20], moss=[0.30,0.42,0.22],
      warm=[1.0,0.80,0.45], wood=[0.40,0.27,0.15], dark=[0.20,0.13,0.08], green=[0.13,0.34,0.19], gold=[0.88,0.68,0.28];
  var X0=-8, X1=8, F=3.6, B=-8.4, H1=4.4, H2=7.6, RG=12.4;     // footprint, storey heights and the ridge
  // the ground floor: stone, with a course of bigger blocks at the foot and the corners
  box(stone,0,-0.3,(F+B)/2,X1-X0,H1+0.3,F-B);
  for(var cs=0;cs<2;cs++) for(var t=X0;t<X1-0.01;){ var w=0.8+r()*0.9, t1=Math.min(X1,t+w);
    box(jit(r,stoneD,0.2),(t+t1)/2,-0.3+cs*0.7,F+0.06,t1-t-0.08,0.68,0.2); t=t1; }
  for(var sd=-1;sd<=1;sd+=2) for(var q=0;q<6;q++) box(jit(r,stoneD,0.2),sd*(X1+0.06),q*0.75-0.3,F-0.3-(q%2)*0.35,0.2,0.72,0.9-(q%2)*0.3);
  // the upper storey, jettied out over the street: plaster between dark timbers
  var J=0.45;
  box(timber,0,H1-0.05,(F+B)/2,X1-X0+2*J,0.35,F-B+2*J);
  box(plaster,0,H1+0.3,(F+B)/2,X1-X0+2*J-0.1,H2-H1-0.3,F-B+2*J-0.1);
  var fz=F+J+0.02;
  for(var vp=X0-J;vp<=X1+J+0.01;vp+=2.0) beam([vp,H1+0.3,fz],[vp,H2,fz],0.26,0.12,timber);
  beam([X0-J,H2-0.1,fz],[X1+J,H2-0.1,fz],0.26,0.14,timber); beam([X0-J,H1+0.35,fz],[X1+J,H1+0.35,fz],0.26,0.14,timber);
  for(var dg=X0-J;dg<X1+J-0.1;dg+=4.0) beam([dg,H1+0.35,fz],[dg+2.0,H2-0.1,fz],0.2,0.1,timber);
  for(var sd2=-1;sd2<=1;sd2+=2){ var sx=sd2*(X1+J+0.02);
    for(var vp2=B-J;vp2<=F+J+0.01;vp2+=2.1) beam([sx,H1+0.3,vp2],[sx,H2,vp2],0.26,0.12,timber);
    beam([sx,H2-0.1,B-J],[sx,H2-0.1,F+J],0.26,0.14,timber);
    for(var dg2=B-J;dg2<F+J-0.1;dg2+=4.2) beam([sx,H1+0.35,dg2],[sx,H2-0.1,dg2+2.1],0.2,0.1,timber); }
  // the gables, plastered, with a king post
  var RX=X1+J+0.4;
  for(var gs2=-1;gs2<=1;gs2+=2){
    var gq=T(gs2*(X1+J-0.05),(F+B)/2), hw=(F-B)/2+J;
    flatPoly(m,gq.x,y+H2,gq.z,R+gs2*Math.PI/2,0.0,[[-hw,0],[hw,0],[0,RG-H2-0.3]],plaster,0);
    beam([gs2*(X1+J+0.05),H2,(F+B)/2],[gs2*(X1+J+0.05),RG-0.4,(F+B)/2],0.26,0.12,timber);
    beam([gs2*(X1+J+0.05),H2,F+J-0.2],[gs2*(X1+J+0.05),RG-0.4,(F+B)/2],0.24,0.12,timber);
    beam([gs2*(X1+J+0.05),H2,B-J+0.2],[gs2*(X1+J+0.05),RG-0.4,(F+B)/2],0.24,0.12,timber); }
  // the roof: two steep slopes of dark shingle, mossy at the eaves
  var MZ=(F+B)/2, eaveF=F+J+1.1, eaveB=B-J-1.1, EY=H2-0.55;
  for(var side=-1;side<=1;side+=2){ var ez=side>0?eaveF:eaveB;
    beam([0,EY,ez],[0,RG,MZ],2*RX,0.35,roof);
    for(var row=0;row<9;row++){ var t2=row/9, t3=(row+0.5)/9, rz=ez+(MZ-ez)*t2, ry2=EY+(RG-EY)*t2, rz2=ez+(MZ-ez)*t3, ry3=EY+(RG-EY)*t3;
      var col=row<2?mix3(roof,moss,0.45-row*0.15):jit(r,roof,0.18);
      beamTo(m,P3(0,ry2+0.2,rz),P3(0,ry3+0.2,rz2),2*RX+0.1,0.14,col,0); } }
  beam([-RX-0.1,RG+0.12,MZ],[RX+0.1,RG+0.12,MZ],0.5,0.4,timber);
  // dormers on the front slope
  for(var dm=-1;dm<=1;dm+=2){ var dx=dm*4.2, dzz=F-1.4, dy=H2+0.9;
    box(plaster,dx,dy-0.6,dzz,2.2,2.1,2.4);
    var dg3=T(dx,dzz+1.21); addMesh(g,BX(warm),dg3.x,y+dy-0.2,dg3.z,R,1.1,1.1,0.06);
    box(timber,dx,dy-0.25,dzz+1.24,1.4,0.12,0.08); box(timber,dx,dy+0.35,dzz+1.24,0.1,1.25,0.08,0,0);
    for(var ds=-1;ds<=1;ds+=2) beam([dx+ds*1.4,dy+1.45,dzz+1.4],[dx,dy+2.6,dzz+1.4],0.35,2.8,roof); }
  // windows: warm light behind small panes, shutters, window boxes of flowers
  function win(lx,ly,lz,w,h,side){
    var q=T(lx,lz), ry=R+(side?side*Math.PI/2:0);
    addMesh(g,BX(warm),q.x,y+ly,q.z,ry,side?0.06:w,h,side?w:0.06);
    var cx=Math.cos(ry), sx2=Math.sin(ry), o=0.05;
    putM(m,BX(timber),q.x+sx2*o,y+ly+h/2-0.04,q.z+cx*o,ry,w,0.08,0.06,0);
    putM(m,BX(timber),q.x+sx2*o,y+ly,q.z+cx*o,ry,0.08,h,0.06,0);
    putM(m,BX(timber),q.x+sx2*o,y+ly-0.08,q.z+cx*o,ry,w+0.3,0.12,0.18,0);
    putM(m,BX(timber),q.x+sx2*o,y+ly+h,q.z+cx*o,ry,w+0.3,0.14,0.14,0);
    for(var e=-1;e<=1;e+=2) putM(m,BX(green),q.x+e*(w/2+0.32)*cx+sx2*0.08,y+ly,q.z-e*(w/2+0.32)*sx2+cx*0.08,ry,0.55,h,0.06,0);
    if(ly<3){ putM(m,BX(wood),q.x+sx2*0.3,y+ly-0.45,q.z+cx*0.3,ry,w+0.2,0.35,0.4,0);
      for(var fl=0;fl<5;fl++){ var fu=(fl/4-0.5)*w; putM(m,blobMesh(fl%2?[0.85,0.35,0.45]:[0.95,0.80,0.35],0,1),q.x+fu*cx+sx2*0.32,y+ly-0.1,q.z-fu*sx2+cx*0.32,0,0.28,0.24,0.28,0); }
      putM(m,blobMesh(moss,0.2,1),q.x+sx2*0.32,y+ly-0.18,q.z+cx*0.32,R,w,0.25,0.35,0); }
  }
  win(-5.2,1.3,F+0.04,1.9,1.7,0); win(5.2,1.3,F+0.04,1.9,1.7,0);
  for(var uw=-1;uw<=1;uw+=2) for(var uk=0;uk<2;uk++) win(uw*(2.2+uk*4.3),H1+1.2,F+J+0.06,1.2,1.4,0);
  for(var sw=-1;sw<=1;sw+=2){ win(sw*(X1+0.04),1.3,-0.8,1.6,1.6,sw); win(sw*(X1+0.04),1.3,-5.6,1.6,1.6,sw); win(sw*(X1+J+0.06),H1+1.2,-2.4,1.3,1.4,sw); }
  // the door: a pair in an arch, iron-banded, with a porch over it
  var dq=T(0,F+0.05);
  flatPoly(m,dq.x,y,dq.z,R,0.0,[[-1.3,0],[1.3,0],[1.3,2.6],[0.8,3.2],[0,3.4],[-0.8,3.2],[-1.3,2.6]],dark,0,true);
  for(var db=-1;db<=1;db+=2) for(var bd=0;bd<3;bd++) box([0.16,0.16,0.18],db*0.62,0.4+bd*0.95,F+0.09,1.1,0.1,0.04);
  box(timber,0,0,F+0.12,0.08,3.1,0.06);
  addMesh(g,BX([1.0,0.78,0.40]),T(0,F+0.1).x,y+0.02,T(0,F+0.1).z,R,0.08,3.0,0.02);
  for(var ar=0;ar<9;ar++){ var aa=ar/8*Math.PI; box(jit(r,stoneD,0.15),-Math.cos(aa)*1.5,2.6+Math.sin(aa)*0.9,F+0.12,0.38,0.42,0.22); }
  box(stoneD,0,-0.25,F+0.7,3.2,0.35,1.2);
  for(var pp=-1;pp<=1;pp+=2){ beam([pp*1.95,0,F+2.0],[pp*1.95,3.9,F+2.0],0.28,0.28,timber); var pq=T(pp*1.95,F+2.0); collCircle(pq.x,pq.z,0.25);
    beam([pp*1.95,3.2,F+2.0],[pp*1.95,3.85,F+1.3],0.18,0.18,timber); }
  beam([-2.3,3.9,F+2.0],[2.3,3.9,F+2.0],0.24,0.24,timber);
  for(var ps=-1;ps<=1;ps+=2) beamTo(m,P3(ps*1.4,3.9,F+2.4),P3(0,5.0,F+2.4),0.2,0.2,roof,0);
  beam([0,3.9,F+2.6],[0,4.6,F],2.1*2.4,0.22,roof);
  // the sign over the porch, painted, and lanterns either side of the door
  box(timber,0,4.55,F+2.25,3.9,1.25,0.16);
  box(gold,0,4.62,F+2.33,3.7,1.11,0.04);
  var sq=T(0,F+2.38); TAVSIGN={x:sq.x,y:y+5.18,z:sq.z,w:3.5,h:1.0,ry:R};
  for(var lt=-1;lt<=1;lt+=2){ var lq=T(lt*1.75,F+0.35); addMesh(g,BX([1.0,0.86,0.50]),lq.x,y+2.2,lq.z,R,0.32,0.45,0.32);
    putM(m,BX(dark),lq.x,y+2.65,lq.z,R,0.42,0.1,0.42,0); putM(m,BX(dark),lq.x,y+2.1,lq.z,R,0.42,0.08,0.42,0); }
  // banners either side of the door
  for(var bn=-1;bn<=1;bn+=2){ var bq=T(bn*3.0,F+0.04); flatPoly(m,bq.x,y+1.2,bq.z,R,0.0,[[-0.5,0.3],[0,0],[0.5,0.3],[0.5,2.4],[-0.5,2.4]],green,0,true);
    flatPoly(m,bq.x,y+1.2,bq.z,R,0.02,[[0,1.0],[0.22,1.4],[0,1.95],[-0.22,1.4]],gold,0,true);
    box(gold,bn*3.0,3.6,F+0.08,1.3,0.08,0.08); }
  // the chimney: stone up the west gable, smoking
  var CX=X0-1.1, CZ=-3.0;
  box(stone,CX,-0.3,CZ,2.0,15.3,2.4);
  for(var cq=0;cq<14;cq++) box(jit(r,stoneD,0.2),CX-1.02,cq*1.05-0.2,CZ+(cq%2?0.4:-0.4),0.08,0.9,1.2);
  box(stoneD,CX,15.0,CZ,2.4,0.35,2.8);
  TAVERN.smoke=P3(CX,15.6,CZ);
  // the old oak, growing up through the back of the roof
  var OX=-3.0, OZ=-5.0;
  putM(m,latheMesh([[1.3,0,[0.36,0.27,0.19]],[1.15,2],[1.0,4]],10,[0.36,0.27,0.19],0.3,5),T(OX,OZ).x,y+RG-3.5,T(OX,OZ).z,0,1,1.4,1,0);
  for(var ob=0;ob<5;ob++){ var oa=ob/5*6.283+0.5; beam([OX,RG+1.5,OZ],[OX+Math.cos(oa)*4,RG+4.5+r()*1.5,OZ+Math.sin(oa)*4],0.55,0.5,[0.36,0.27,0.19]); }
  var OAKC=[[0,7.6,0,6.5],[3.2,6.6,0.6,4.6],[-3.4,6.8,-0.5,4.8],[0.4,6.4,3.0,4.4],[-0.5,6.7,-3.4,4.6],[2.0,9.0,-1.6,4.0],[-1.8,9.2,1.6,3.8]];
  for(var oc=0;oc<OAKC.length;oc++){ var o=OAKC[oc], oq=T(OX+o[0],OZ+o[2]);
    putM(m,blobMesh(jit(r,oc%2?[0.24,0.44,0.20]:[0.20,0.38,0.18],0.15),0.16,1),oq.x,y+RG+o[1]-o[3]*0.4,oq.z,r()*6,o[3],o[3]*0.72,o[3],2); }
  // ivy up the corners and over the porch
  for(var iv=0;iv<26;iv++){ var corner=iv%3, ix=corner===0?X0+0.1:(corner===1?X1-0.1:(r()-0.5)*4.4), iz=corner<2?F+0.1:F+2.2, iy=corner<2?r()*5.5:3.8+r()*0.4;
    var iq=T(ix,iz); putM(m,blobMesh(jit(r,moss,0.3),0.2,1),iq.x,y+iy,iq.z,r()*6,0.7+r()*0.5,0.6+r()*0.4,0.4,2); }
  // barrels along the east wall, crates, a bench by the door
  var bar=[[9.0,-1.5],[9.1,-2.7],[8.95,-4.0],[9.05,-2.1,1]];
  for(var b2=0;b2<bar.length;b2++){ var bp=T(bar[b2][0],bar[b2][1]), up=bar[b2][2]?1.05:0;
    addMesh(m,coneMesh([0.42,0.30,0.18],10,0.5,0.46),bp.x,y+up,bp.z,0,0.95,1.05,0.95);
    addMesh(m,coneMesh([0.30,0.30,0.32],10,0.5,0.5,true),bp.x,y+up+0.18,bp.z,0,0.99,0.08,0.99);
    addMesh(m,coneMesh([0.30,0.30,0.32],10,0.5,0.5,true),bp.x,y+up+0.80,bp.z,0,0.97,0.08,0.97);
    if(!up) collCircle(bp.x,bp.z,0.5); }
  for(var cr=0;cr<2;cr++){ var cq2=T(9.0,0.2+cr*1.1); putM(m,BX([0.50,0.36,0.20]),cq2.x,y,cq2.z,R+cr*0.3,0.95,0.95,0.95,2); collCircle(cq2.x,cq2.z,0.55); }
  box(wood,4.0,0.45,F+0.5,2.4,0.1,0.45,2); box(dark,4.0,0,F+0.5,2.1,0.45,0.12,2);
  // a table with benches in the yard
  var tb=T(-4.6,8.0);
  addMesh(m,boxMesh(wood),tb.x,y+0.78,tb.z,R,2.6,0.14,1.2);
  for(var lg=-1;lg<=1;lg+=2){ var lgp=T(-4.6+lg*1.05,8.0); addMesh(m,boxMesh(dark),lgp.x,y,lgp.z,R,0.16,0.8,1.0); }
  for(var bn2=-1;bn2<=1;bn2+=2){ var bnp=T(-4.6,8.0+bn2*1.15); addMesh(m,boxMesh(wood),bnp.x,y+0.42,bnp.z,R,2.4,0.1,0.42);
    addMesh(m,boxMesh(dark),bnp.x,y,bnp.z,R,2.1,0.42,0.12); }
  collBox(tb.x,tb.z,1.3,1.5,R);
  var mug=T(-5.0,7.8); addMesh(m,coneMesh([0.80,0.62,0.30],8,0.5,0.5),mug.x,y+0.85,mug.z,0,0.18,0.24,0.18);
  // lantern posts at the yard's mouth
  for(var k=-1;k<=1;k+=2){ var lp=T(k*5.6,9.5);
    addMesh(m,boxMesh(wood),lp.x,H(lp.x,lp.z),lp.z,R,0.25,2.6,0.25); collCircle(lp.x,lp.z,0.25);
    addMesh(g,boxMesh(warm),lp.x,H(lp.x,lp.z)+2.6,lp.z,R,0.5,0.6,0.5); }
  // a fire pit to gather at
  var fp=T(1.5,12.5), fy=H(fp.x,fp.z);
  for(var qq=0;qq<8;qq++){ var qa=qq/8*6.283, qx=fp.x+Math.cos(qa)*1.25, qz=fp.z+Math.sin(qa)*1.25;
    addMesh(m,ROCK,qx,fy-0.05,qz,qa,0.55,0.4,0.55); }
  addMesh(g,coneMesh([0.98,0.62,0.22],7),fp.x,fy+0.05,fp.z,0,1.1,1.25,1.1);
  addMesh(g,coneMesh([1.0,0.86,0.40],6),fp.x,fy+0.05,fp.z,0.6,0.6,0.85,0.6);
  collCircle(fp.x,fp.z,1.3);
  for(var lgs=0;lgs<2;lgs++){ var la=lgs*2.2+0.6, lx=fp.x+Math.cos(la)*3.0, lz=fp.z+Math.sin(la)*3.0;
    addMesh(m,tubeLog(),lx,H(lx,lz)+0.28,lz,la+Math.PI/2,0.55,2.4,0.55); }
  // solid: the house, its chimney; the camera stops short of both
  var hc=T(0,(F+B)/2), cc2=T(CX,CZ);
  collBox(hc.x,hc.z,(X1-X0)/2,(F-B)/2,R); collBox(cc2.x,cc2.z,1.0,1.2,R);
  CAMBOX=[{x:hc.x,z:hc.z,hx:(X1-X0)/2+J+0.3,hz:(F-B)/2+J+0.3,c:Math.cos(R),s:Math.sin(R),top:y+RG+1},
          {x:cc2.x,z:cc2.z,hx:1.3,hz:1.5,c:Math.cos(R),s:Math.sin(R),top:y+15.4}];
  LANDMARKS.push({x:x,z:z,r:13,name:'The Greenleaf Tavern',kind:'tavern'});
  var door=T(0,F+0.05), keep=T(1.6,F+1.8);
  TAVERN.door=door; TAVERN.fire=fp;
  if(!TAVERN.keeper) TAVERN.keeper={x:keep.x,z:keep.z,yaw:R};
  TAVERN.enter=T(0,F+0.85); TAVERN.outAt=T(0,F+3.0);
  TAVGLOW=g;
}
/* the glowing bits outside (windows, lanterns, the fire pit) and the painted sign:
   added once the scene exists */
function tavernExtras(){
  if(TAVGLOW&&!TAVGLOW.isMesh){ var gm=new THREE.Mesh(toGeom(TAVGLOW),new THREE.MeshBasicMaterial({vertexColors:true})); gm.frustumCulled=false; SCENE.add(gm); TAVGLOW=gm; }
  if(TAVSIGN&&!TAVSIGN.mesh){ TAVSIGN.mesh=signMesh(TAVSIGN,'Bram’s','Greenleaf Tavern'); SCENE.add(TAVSIGN.mesh); }
}
/* does the camera's line run into the tavern? */
function camBlocked(x,y,z){
  if(WILD.inHall) return hallCamBlocked(x,y,z);
  for(var i=0;i<CAMBOX.length;i++){ var b=CAMBOX[i]; if(y>b.top) continue;
    var dx=x-b.x, dz=z-b.z, lx=dx*b.c-dz*b.s, lz=dx*b.s+dz*b.c;
    if(Math.abs(lx)<b.hx&&Math.abs(lz)<b.hz) return true; }
  return false;
}

/* ---------- in and out ---------- */
var HALLENV=null;
function setHallEnv(on){
  if(HALLENV===on) return; HALLENV=on; WILD.inHall=on;
  if(!HALL3) return;
  var c=on?[0.07,0.05,0.035]:SKYCOL;
  R3.setClearColor(new THREE.Color(c[0],c[1],c[2]),1);
  SCENE.fog.color.setRGB(c[0],c[1],c[2]); SCENE.fog.near=on?30:38; SCENE.fog.far=on?95:133;
  SKY.visible=!on; WORLD.visible=!on; if(HOUSE3) HOUSE3.visible=!on;
  HALL3.visible=on; HALLGLOW.visible=on; HALLSHAFT.visible=on; if(HALLSIGN.mesh) HALLSIGN.mesh.visible=on;
  if(TAVGLOW&&TAVGLOW.isMesh) TAVGLOW.visible=!on; if(TAVSIGN&&TAVSIGN.mesh) TAVSIGN.mesh.visible=!on;
  if(on){ HEMI.color.setRGB(0.95,0.80,0.62); HEMI.groundColor.setRGB(0.42,0.30,0.22); HEMI.intensity=Math.PI*0.82; SUN.intensity=0; }
  else { HEMI.color.setRGB(0.42,0.48,0.40); HEMI.groundColor.setRGB(0.20,0.24,0.20); HEMI.intensity=Math.PI; SUN.intensity=SUN.userData.base; TORCH.intensity=0; }
}
var HALL_CD=0;
function enterHall(){
  var I=HALL.inAt; moveParty(I.x,I.z,I.yaw); HALL_CD=1.0;
  sfx('click'); tip('Warmth, woodsmoke and the smell of stew');
}
function leaveHall(){
  var O=TAVERN.outAt; moveParty(O.x,O.z,TAVERN.ry); HALL_CD=1.0;
  tip('Back out into the wood');
}
function hallTalk(p,list){
  if(!WILD.inHall) return;
  var hx=HALL.x+HALL.hearth.x+3.2, hz=HALL.z+HALL.hearth.z;
  if(Math.hypot(hx-p.x,hz-p.z)<3.6) list.push({x:hx-0.8,y:HALL.y+1,z:hz,lift:2.4,label:'warm yourself by the fire',tap:'REST',open:hearthRest});
  for(var i=0;i<G.ents.length;i++){ var e=G.ents[i]; if(!e.patron) continue;
    if(Math.hypot(e.x-p.x,e.z-p.z)<2.6) list.push({x:e.x,y:e.y,z:e.z,lift:2.5,label:'talk to '+e.name,tap:'TALK',open:(function(pe){ return function(){ patronSay(pe); }; })(e)}); }
}
function hearthRest(){
  var p=G.player; p.hp=p.maxHp;
  for(var i=0;i<G.ents.length;i++){ var a=G.ents[i]; if(a.kind==='ally') a.hp=a.maxHp; }
  sfx('potion'); msg('Rested','#ffd76a',p.x,p.y+2.6,p.z); tip('The fire takes the ache out of you. Your company too.');
}
/* ---------- the regulars ---------- */
var PATRONS=[
  {name:'Moll',model:'rogue',tint:[1.0,0.86,0.78],weapons:['Mug'],route:[[8.0,-6.5],[-6.2,4.2],[-8.0,8.8],[-3.2,8.2],[3.0,6.4],[6.8,0.3],[8.0,1.8]],speed:2.2,
   say:['“Mind the roots, love. Everyone trips on the roots.”','“Stew\'s rabbit. Probably.”','“Bram\'s been telling that dragon story since before I was born.”']},
  {name:'Old Fennick',model:'barbarian',beard:1,tint:[0.82,0.86,0.95],weapons:['Mug'],route:[[-11.2,-1.0],[-10.8,1.8],[7.8,-3.4],[-11.4,-0.4]],speed:1.2,wait:9,
   say:['“Warm your bones, hunter. The wood keeps.”','“I\'ve sat by this fire forty winters. The fire\'s older.”','“That tree was here before the roof. Bram just built round it.”']},
  {name:'Sylvi',model:'mage',tint:[0.80,1.0,0.86],weapons:['Spellbook_open'],route:[[-11.5,-10.8],[-3.0,-10.6],[2.4,-6.6],[-4.2,-6.8]],speed:1.4,wait:7,
   say:['“The tree hums at night. Put your ear to it.”','“Elves built the first hall here. The windows remember.”','“I came for a song and stayed for the light.”']},
  {name:'Pip',model:'rogue_hooded',tint:[0.96,0.92,0.80],weapons:['Mug'],route:[[8.4,4.0],[8.4,-7.6],[2.5,4.0]],speed:1.7,wait:6,
   say:['“Heard a spider ate a whole cart once. Cart and all.”','“Buy me a drink and I\'ll tell you where the gnomes went. One of them.”','“Shh. I\'m hiding from Tobin. I owe him a wheel.”']}];
function spawnPatrons(){
  if(!HALL3) return;
  for(var i=0;i<PATRONS.length;i++){ var P=PATRONS[i], s=P.route[0], x=HALL.x+s[0], z=HALL.z+s[1];
    G.ents.push({kind:'npc',npcId:'patron'+i,patron:P,name:P.name,x:x,y:H(x,z),z:z,yaw:0,home:0,scale:0.98,speed:0,walkPhase:0,onGround:true,
      hp:1,maxHp:1,cheer:0,greeted:true,model:P.model,tint:P.tint,beard:!!P.beard,leg:(i*2+1)%P.route.length,wait:1+i*1.5,
      look:look(P.beard?'dwarf':'human','rogue',{tunic:P.tint,sleeve:P.tint,cloak:null,weapon:null,hair:HAIR.brown,beard:P.beard?1:0})}); }
}
function patronTick(e,dt,pd){
  var P=e.patron, p=G.player;
  if(e.cheer>0) e.cheer-=dt;
  if(e.chatT>0){ e.chatT-=dt; e.speed=0; e.yaw+=wrapA(Math.atan2(p.x-e.x,p.z-e.z)-e.yaw)*Math.min(1,dt*5); return; }
  if(e.wait>0){ e.wait-=dt; e.speed*=0.8; return; }
  var w=P.route[e.leg], tx=HALL.x+w[0], tz=HALL.z+w[1];
  if(Math.hypot(tx-e.x,tz-e.z)<0.6){ e.leg=(e.leg+1)%P.route.length; e.wait=(P.wait||4)*(0.6+Math.random()*0.8); e.speed=0; return; }
  moveCreature(e,dt,tx,tz,P.speed);
  if(e.speed<0.05){ e.stuck=(e.stuck||0)+dt; if(e.stuck>2){ e.stuck=0; e.leg=(e.leg+1)%P.route.length; } } else e.stuck=0;
}
function patronSay(e){
  var P=e.patron; e.chatT=3.5; e.cheer=1.2; e.said=((e.said===undefined?-1:e.said)+1)%P.say.length;
  msg(P.say[e.said],'#ffe08a',e.x,e.y+2.6,e.z,15); tip(e.name+': '+P.say[e.said]); sfx('click');
}
/* each frame: the door, the light, the fire */
function hallUpdate(dt){
  var p=G.player; if(!p||!HALL3) return;
  setHallEnv(inHall(p.x,p.z));
  HALL_CD=Math.max(0,HALL_CD-dt);
  var playing=G.state==='play'&&!G.cine&&!p.dead;
  if(!WILD.inHall){
    if(playing&&HALL_CD<=0&&TAVERN.enter&&Math.hypot(p.x-TAVERN.enter.x,p.z-TAVERN.enter.z)<1.5) enterHall();
    // smoke from the chimney
    if(TAVERN.smoke&&Math.random()<dt*6&&Math.hypot(p.x-TAVERN.x,p.z-TAVERN.z)<90){ var s=TAVERN.smoke;
      burst(s[0]+(Math.random()-0.5)*0.8,s[1],s[2]+(Math.random()-0.5)*0.8,1,[0.62,0.62,0.64],{up:2.4,spread:0.5,size:0.5,life:2.6,grav:-0.6}); }
    return;
  }
  var lz=p.z-HALL.z, lx=p.x-HALL.x;
  if(playing&&HALL_CD<=0&&lz>HALL.D-1.35&&Math.abs(lx)<1.9){ leaveHall(); return; }
  // the hearth lights whoever stands near it
  var fl=0.85+Math.sin(G.t*11)*0.07+Math.sin(G.t*23.7)*0.06;
  TORCH.position.set(HALL.x+HALL.hearth.x+0.6,HALL.y+1.6,HALL.z+HALL.hearth.z); TORCH.intensity=9*fl; TORCH.distance=24;
  HALLGLOW.material.color.setScalar(0.93+0.07*fl);
  if(Math.random()<dt*14){ var hx=HALL.x+HALL.hearth.x-0.8, hz=HALL.z+HALL.hearth.z+(Math.random()-0.5)*1.6;
    burst(hx+(Math.random()-0.5)*0.6,HALL.y+0.6,hz,1,Math.random()<0.5?[1.0,0.72,0.25]:[1.0,0.42,0.10],{up:1.8,spread:0.3,size:0.12,life:0.5,grav:-2}); }
  // the odd spark of light drifting off the tree
  if(Math.random()<dt*2.5){ var ta=Math.random()*6.283, td=1.8+Math.random()*3;
    burst(HALL.x+HALL.tree.x+Math.cos(ta)*td,HALL.y+0.3+Math.random()*2,HALL.z+HALL.tree.z+Math.sin(ta)*td,1,Math.random()<0.5?[0.55,0.90,1.0]:[0.80,1.0,0.55],{up:0.6,spread:0.25,size:0.07,life:1.8,grav:-0.3}); }
  // the hall is safe ground
  p.atTavern=true;
  if(p.hp<p.maxHp) p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.10*dt);
}
