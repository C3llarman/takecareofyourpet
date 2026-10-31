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
var C_GRASS=[0.29,0.45,0.22], C_GRASS2=[0.26,0.41,0.20], C_DIRT=[0.36,0.27,0.17],
    C_ROCK=[0.38,0.38,0.40], C_SAND=[0.56,0.50,0.33], C_WATER=[0.16,0.33,0.42];

function terrainMesh(){
  var m=new MB(), N=92, S=WSIZE/N;
  for(var i=0;i<N;i++) for(var j=0;j<N;j++){
    var x0=-WHALF+i*S, z0=-WHALF+j*S, x1=x0+S, z1=z0+S;
    var y00=H(x0,z0),y10=H(x1,z0),y11=H(x1,z1),y01=H(x0,z1);
    var my=(y00+y10+y11+y01)/4, sl=Hn(x0+S/2,z0+S/2);
    var col;
    if(my<WATER+0.5) col=C_SAND;
    else if(sl>0.55) col=C_ROCK;
    else if(sl>0.34) col=C_DIRT;
    else col=(((i+j)&1)?C_GRASS:C_GRASS2);
    var t=(RNG()-0.5)*0.10;
    col=[Math.max(0,col[0]+t),Math.max(0,col[1]+t),Math.max(0,col[2]+t)];
    m.tri(x0,y00,z0, x1,y11,z1, x1,y10,z0, col);
    m.tri(x0,y00,z0, x0,y01,z1, x1,y11,z1, col);
  }
  // water plane
  var wc=C_WATER;
  for(var i2=0;i2<22;i2++) for(var j2=0;j2<22;j2++){
    var a=-WHALF+i2*(WSIZE/22), b=-WHALF+j2*(WSIZE/22), s2=WSIZE/22;
    m.quad([a,WATER,b],[a,WATER,b+s2],[a+s2,WATER,b+s2],[a+s2,WATER,b],wc,1);
  }
  return m;
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
    dst.f.push(src.f[i]);
  }
}
var PINE_A=null,PINE_B=null,OAK_A=null,TRUNK=null,ROCK=null,SHROOM=null,FERN=null,STUMP=null;
function initProps(){
  TRUNK=boxMesh([0.26,0.19,0.13],0.75);
  PINE_A=coneMesh([0.17,0.33,0.19],6);
  PINE_B=coneMesh([0.21,0.40,0.22],6);
  OAK_A=blobMesh([0.24,0.42,0.20],0.22);
  ROCK=blobMesh([0.40,0.40,0.42],0.35);
  SHROOM=coneMesh([0.62,0.24,0.20],6);
  FERN=coneMesh([0.25,0.46,0.22],5,0.5,0.1);
  STUMP=coneMesh([0.30,0.22,0.15],7,0.5,0.42);
}
function scatterWorld(m){
  var r=mulberry(7);
  var tries=3600;
  for(var i=0;i<tries;i++){
    var x=(r()*2-1)*WHALF*0.94, z=(r()*2-1)*WHALF*0.94;
    var y=H(x,z), sl=Hn(x,z), d=Math.hypot(x,z);
    if(y<WATER+0.6) continue;
    if(sl>0.7) { if(r()<0.86) continue; }
    if(d<7 && r()<0.8) continue;            // keep a small clearing at the spawn
    var k=r();
    if(k<0.42){ // pine
      var hh=3.6+r()*4.2, rr=0.9+r()*0.5, ry=r()*6.28;
      addMesh(m,TRUNK,x,y,z,ry,0.5*rr,hh*0.42,0.5*rr);
      var p=(r()<0.5)?PINE_A:PINE_B;
      addMesh(m,p,x,y+hh*0.26,z,ry,2.5*rr,hh*0.52,2.5*rr);
      addMesh(m,p,x,y+hh*0.58,z,ry+0.7,1.9*rr,hh*0.46,1.9*rr);
      addMesh(m,p,x,y+hh*0.86,z,ry+1.4,1.3*rr,hh*0.40,1.3*rr);
    } else if(k<0.62){ // broadleaf
      var hh2=3.0+r()*3.0, rr2=1.0+r()*0.6, ry2=r()*6.28;
      addMesh(m,TRUNK,x,y,z,ry2,0.62*rr2,hh2*0.72,0.62*rr2);
      addMesh(m,OAK_A,x,y+hh2*0.58,z,ry2,3.5*rr2,3.2*rr2,3.5*rr2);
      if(r()<0.5) addMesh(m,OAK_A,x+rr2,y+hh2*0.75,z-rr2*0.6,ry2+1,2.3*rr2,2.1*rr2,2.3*rr2);
    } else if(k<0.74){ // rock
      var s=0.8+r()*2.6;
      addMesh(m,ROCK,x,y-0.18*s,z,r()*6.28,s,s*(0.6+r()*0.5),s);
    } else if(k<0.82){ // stump / log
      addMesh(m,STUMP,x,y,z,r()*6.28,1.1,0.8+r()*0.6,1.1);
    } else if(k<0.93){ // fern tuft
      var n=2+((r()*3)|0);
      for(var q=0;q<n;q++){
        var ax=x+(r()-0.5)*2.4, az=z+(r()-0.5)*2.4;
        addMesh(m,FERN,ax,H(ax,az)-0.05,az,r()*6.28,1.5+r()*0.8,1.1+r()*0.7,1.5+r()*0.8);
      }
    } else { // mushrooms
      var n2=2+((r()*4)|0);
      for(var q2=0;q2<n2;q2++){
        var bx=x+(r()-0.5)*1.8, bz=z+(r()-0.5)*1.8, by=H(bx,bz);
        addMesh(m,TRUNK,bx,by,bz,0,0.12,0.30,0.12,[1.6,1.6,1.5]);
        addMesh(m,SHROOM,bx,by+0.26,bz,r()*6.28,0.55,0.34,0.55);
      }
    }
  }
}

/* ---------- landmarks ---------- */
var LANDMARKS=[];
function buildTavern(m,x,z){
  var y=H(x,z);
  var wall=[0.44,0.33,0.22], roof=[0.33,0.17,0.14], warm=[0.95,0.72,0.35];
  addMesh(m,boxMesh(wall),x,y-0.2,z,0.5,9,4.2,7);
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
  }
  addMesh(m,coneMesh(fire,6),x,y+0.1,z,0,1.5,1.4,1.5);
  for(var k=0;k<6;k++){
    var a2=k/6*6.28, rx=x+Math.cos(a2)*1.5, rz=z+Math.sin(a2)*1.5;
    addMesh(m,ROCK,rx,H(rx,rz),rz,a2,0.7,0.5,0.7);
  }
  for(var p=0;p<3;p++){ // spikes
    var a3=p/3*6.28+1.1, sx=x+Math.cos(a3)*9, sz=z+Math.sin(a3)*9;
    addMesh(m,coneMesh(wood,5,0.5,0.05),sx,H(sx,sz),sz,0,0.7,3.4,0.7);
  }
  LANDMARKS.push({x:x,z:z,r:13,name:'Goblin Camp',kind:'camp'});
}
function buildHollow(m,x,z){
  var y=H(x,z);
  var web=[0.80,0.84,0.86], stone=[0.34,0.34,0.37];
  for(var i=0;i<7;i++){
    var a=i/7*6.28, px=x+Math.cos(a)*(7+i%3), pz=z+Math.sin(a)*(7+i%3);
    addMesh(m,boxMesh(stone,0.6),px,H(px,pz),pz,a,1.4,4.5+((i*7)%3),1.4);
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
  }
  addMesh(m,boxMesh([0.46,0.46,0.49],0.9),x,H(x,z),z,0,2.4,0.6,2.4);
  LANDMARKS.push({x:x,z:z,r:9,name:'The Standing Stones',kind:'stones'});
}
