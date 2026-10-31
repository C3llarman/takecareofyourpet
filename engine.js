/* ---------- tiny math ---------- */
function m4(){return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);}
function m4mul(o,a,b){
  var a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],
      a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
  for(var i=0;i<4;i++){
    var b0=b[i*4],b1=b[i*4+1],b2=b[i*4+2],b3=b[i*4+3];
    o[i*4]  =b0*a00+b1*a10+b2*a20+b3*a30;
    o[i*4+1]=b0*a01+b1*a11+b2*a21+b3*a31;
    o[i*4+2]=b0*a02+b1*a12+b2*a22+b3*a32;
    o[i*4+3]=b0*a03+b1*a13+b2*a23+b3*a33;
  }
  return o;
}
function m4persp(o,fovy,asp,n,f){
  var t=1/Math.tan(fovy/2);
  o[0]=t/asp;o[1]=0;o[2]=0;o[3]=0;
  o[4]=0;o[5]=t;o[6]=0;o[7]=0;
  o[8]=0;o[9]=0;o[10]=(f+n)/(n-f);o[11]=-1;
  o[12]=0;o[13]=0;o[14]=2*f*n/(n-f);o[15]=0;return o;
}
function m4look(o,ex,ey,ez,cx,cy,cz){
  var zx=ex-cx,zy=ey-cy,zz=ez-cz,l=Math.hypot(zx,zy,zz)||1; zx/=l;zy/=l;zz/=l;
  var ux=0,uy=1,uz=0; // up
  var sx=uy*zz-uz*zy, sy=uz*zx-ux*zz, sz=ux*zy-uy*zx;
  l=Math.hypot(sx,sy,sz)||1; sx/=l;sy/=l;sz/=l;
  var tx=zy*sz-zz*sy, ty=zz*sx-zx*sz, tz=zx*sy-zy*sx;
  o[0]=sx;o[1]=tx;o[2]=zx;o[3]=0;
  o[4]=sy;o[5]=ty;o[6]=zy;o[7]=0;
  o[8]=sz;o[9]=tz;o[10]=zz;o[11]=0;
  o[12]=-(sx*ex+sy*ey+sz*ez);
  o[13]=-(tx*ex+ty*ey+tz*ez);
  o[14]=-(zx*ex+zy*ey+zz*ez);
  o[15]=1;return o;
}
/* TRS matrix: translate(t) * rotY(ry) * rotX(rx) * rotZ(rz) * scale(s) */
function m4trs(o,tx,ty,tz,rx,ry,rz,sx,sy,sz){
  var cx=Math.cos(rx),sxx=Math.sin(rx),cy=Math.cos(ry),syy=Math.sin(ry),cz=Math.cos(rz),szz=Math.sin(rz);
  var r00=cy*cz+syy*sxx*szz, r01=cx*szz, r02=-syy*cz+cy*sxx*szz;
  var r10=-cy*szz+syy*sxx*cz, r11=cx*cz, r12=syy*szz+cy*sxx*cz;
  var r20=syy*cx, r21=-sxx, r22=cy*cx;
  o[0]=r00*sx;o[1]=r10*sx;o[2]=r20*sx;o[3]=0;
  o[4]=r01*sy;o[5]=r11*sy;o[6]=r21*sy;o[7]=0;
  o[8]=r02*sz;o[9]=r12*sz;o[10]=r22*sz;o[11]=0;
  o[12]=tx;o[13]=ty;o[14]=tz;o[15]=1;
  return o;
}
function m4id(o){o[0]=1;o[1]=0;o[2]=0;o[3]=0;o[4]=0;o[5]=1;o[6]=0;o[7]=0;o[8]=0;o[9]=0;o[10]=1;o[11]=0;o[12]=0;o[13]=0;o[14]=0;o[15]=1;return o;}

/* ---------- mesh building (flat shaded, non-indexed) ---------- */
function MB(){ this.p=[]; this.n=[]; this.c=[]; this.f=[]; }
MB.prototype.tri=function(ax,ay,az,bx,by,bz,cx,cy,cz,col,flag){
  var ux=bx-ax,uy=by-ay,uz=bz-az, vx=cx-ax,vy=cy-ay,vz=cz-az;
  var nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
  var l=Math.hypot(nx,ny,nz)||1; nx/=l;ny/=l;nz/=l;
  this.p.push(ax,ay,az,bx,by,bz,cx,cy,cz);
  this.n.push(nx,ny,nz,nx,ny,nz,nx,ny,nz);
  var r=col[0],g=col[1],b=col[2];
  this.c.push(r,g,b,r,g,b,r,g,b);
  var fl=flag||0; this.f.push(fl,fl,fl);
};
MB.prototype.quad=function(a,b,c,d,col,flag){
  this.tri(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2],col,flag);
  this.tri(a[0],a[1],a[2],c[0],c[1],c[2],d[0],d[1],d[2],col,flag);
};
MB.prototype.count=function(){return this.p.length/3;};

/* unit box centered x/z, y from 0..1 */
function boxMesh(col,taper){
  var m=new MB(), t=(taper===undefined)?1:taper;
  var h=0.5, ht=h*t;
  var A=[-h,0,-h],B=[h,0,-h],C=[h,0,h],D=[-h,0,h];
  var E=[-ht,1,-ht],F=[ht,1,-ht],G=[ht,1,ht],H=[-ht,1,ht];
  var d=[col[0]*0.86,col[1]*0.86,col[2]*0.86];
  m.quad(E,F,G,H,col);        // top
  m.quad(D,C,B,A,d);          // bottom
  m.quad(A,B,F,E,col);
  m.quad(B,C,G,F,d);
  m.quad(C,D,H,G,col);
  m.quad(D,A,E,H,d);
  return m;
}
/* cone: radius 0.5 at y=0, apex y=1 */
function coneMesh(col,seg,r0,r1){
  var m=new MB(); seg=seg||7; r0=(r0===undefined)?0.5:r0; r1=(r1===undefined)?0:r1;
  for(var i=0;i<seg;i++){
    var a=i/seg*Math.PI*2, b=(i+1)/seg*Math.PI*2;
    var x0=Math.cos(a)*r0,z0=Math.sin(a)*r0,x1=Math.cos(b)*r0,z1=Math.sin(b)*r0;
    var X0=Math.cos(a)*r1,Z0=Math.sin(a)*r1,X1=Math.cos(b)*r1,Z1=Math.sin(b)*r1;
    var sh=0.88+0.12*Math.cos(a);
    var cc=[col[0]*sh,col[1]*sh,col[2]*sh];
    if(r1<=0.001) m.tri(x0,0,z0,x1,0,z1,0,1,0,cc);
    else m.quad([x0,0,z0],[x1,0,z1],[X1,1,Z1],[X0,1,Z0],cc);
    m.tri(0,0,0,x1,0,z1,x0,0,z0,[col[0]*0.7,col[1]*0.7,col[2]*0.7]);
  }
  return m;
}
/* faceted sphere-ish blob (octahedron subdivided once) */
function blobMesh(col,jitter){
  var m=new MB(), J=jitter||0;
  var v=[[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]];
  var faces=[[0,4,2],[0,2,5],[0,5,3],[0,3,4],[1,2,4],[1,5,2],[1,3,5],[1,4,3]];
  function mid(a,b){var x=(a[0]+b[0])/2,y=(a[1]+b[1])/2,z=(a[2]+b[2])/2,l=Math.hypot(x,y,z)||1;return [x/l,y/l,z/l];}
  var rs=[];
  for(var f=0;f<faces.length;f++){
    var A=v[faces[f][0]],B=v[faces[f][1]],C=v[faces[f][2]];
    var AB=mid(A,B),BC=mid(B,C),CA=mid(C,A);
    rs.push([A,AB,CA],[AB,B,BC],[CA,BC,C],[AB,BC,CA]);
  }
  for(var i=0;i<rs.length;i++){
    var t=rs[i], p=[];
    for(var k=0;k<3;k++){
      var q=t[k], s=1+ (J? (Math.sin(q[0]*9.1+q[1]*4.7+q[2]*7.3)*J):0);
      p.push([q[0]*0.5*s,q[1]*0.5*s+0.5,q[2]*0.5*s]);
    }
    var sh=0.85+0.15*(p[0][1]);
    m.tri(p[0][0],p[0][1],p[0][2],p[1][0],p[1][1],p[1][2],p[2][0],p[2][1],p[2][2],[col[0]*sh,col[1]*sh,col[2]*sh]);
  }
  return m;
}

/* ---------- GL wrapper ---------- */
function GPUMesh(gl,mb){
  this.n=mb.count();
  this.pb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,this.pb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mb.p),gl.STATIC_DRAW);
  this.nb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,this.nb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mb.n),gl.STATIC_DRAW);
  this.cb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,this.cb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mb.c),gl.STATIC_DRAW);
  this.fb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,this.fb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mb.f),gl.STATIC_DRAW);
}

var VS=[
'attribute vec3 aP; attribute vec3 aN; attribute vec3 aC; attribute float aF;',
'uniform mat4 uProj,uView,uModel; uniform float uTime; uniform vec3 uTint;',
'varying vec3 vN; varying vec3 vC; varying float vFog; varying float vY;',
'void main(){',
'  vec3 p=aP;',
'  if(aF>0.5){ p.y += sin(p.x*0.35+uTime*1.3)*0.12 + sin(p.z*0.27-uTime*0.9)*0.12; }',
'  vec4 wp=uModel*vec4(p,1.0);',
'  vec4 vp=uView*wp;',
'  gl_Position=uProj*vp;',
'  vN=normalize((uModel*vec4(aN,0.0)).xyz);',
'  vC=aC*uTint;',
'  vY=wp.y;',
'  vFog=clamp((-vp.z-38.0)/95.0,0.0,1.0);',
'}'].join('\n');

var FS=[
'precision mediump float;',
'varying vec3 vN; varying vec3 vC; varying float vFog; varying float vY;',
'uniform vec3 uFog; uniform vec3 uSun; uniform float uAlpha; uniform float uUnlit;',
'void main(){',
'  if(uUnlit>0.5){ gl_FragColor=vec4(vC,1.0); return; }',
'  vec3 n=normalize(vN);',
'  float d=max(dot(n,uSun),0.0);',
'  float sky=0.5+0.5*n.y;',
'  vec3 amb=mix(vec3(0.20,0.24,0.20),vec3(0.42,0.48,0.40),sky);',
'  vec3 col=vC*(amb+vec3(1.0,0.95,0.80)*d*0.72);',
'  col+=vec3(0.05,0.07,0.04)*max(0.0,-n.y);',
'  gl_FragColor=vec4(mix(col,uFog,vFog),uAlpha);',
'}'].join('\n');

function makeProgram(gl){
  function sh(t,src){var s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s;}
  var p=gl.createProgram();
  gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));
  gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FS));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

function discMesh(seg){
  var m=new MB(); seg=seg||12;
  for(var i=0;i<seg;i++){
    var a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;
    m.tri(0,0,0, Math.cos(b)*0.5,0,Math.sin(b)*0.5, Math.cos(a)*0.5,0,Math.sin(a)*0.5,[1,1,1]);
  }
  return m;
}

/* sky dome: horizon band fading to a deeper zenith */
function skyMesh(horizon,zenith,ground,seg){
  var m=new MB(); seg=seg||18;
  for(var i=0;i<seg;i++){
    var a=i/seg*Math.PI*2, b=(i+1)/seg*Math.PI*2;
    var x0=Math.cos(a),z0=Math.sin(a),x1=Math.cos(b),z1=Math.sin(b);
    // upper band -> zenith
    m.tri(x0,0.04,z0, x1,0.04,z1, 0,1,0, zenith);
    // horizon band
    m.tri(x0,-0.10,z0, x1,-0.10,z1, x1,0.30,z1, horizon);
    m.tri(x0,-0.10,z0, x1,0.30,z1, x0,0.30,z0, horizon);
    // below the horizon
    m.tri(x0,-0.10,z0, 0,-0.55,0, x1,-0.10,z1, ground);
  }
  return m;
}
