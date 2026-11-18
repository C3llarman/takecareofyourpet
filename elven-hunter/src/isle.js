/* ================= the Emberleaf Isle =================
   The next land: an island across the sea from the Sunlit Shore, where the
   leaves never stopped turning. The Sylvani traded here in their white boats;
   one of them is moored at the jetty again, and it sails you over.

   Like the Glimmer Cave, the isle lies far off the map (everything with x past
   ISLE.x0): sailing carries you and your company there, and the sky, fog and
   light change over. It is a harder hunt than the wood: everything that lives
   there is tougher, hits harder and pays better.

   Loaded after legends.js; nothing here runs until the game calls it. */

var ISLE={x:900,z:0,x0:600,R:110,
  tough:1.6,          // foe health on the isle, on top of the difficulty
  bite:1.35,          // foe damage on the isle
  pay:1.6,            // coins from isle kills
  level:12,           // the level the isle is meant for
  flats:[]};
ISLE.land={x:ISLE.x-ISLE.R*0.66,z:ISLE.z+4};        // the landing, on the west shore, facing home
ISLE.spire={x:ISLE.x+20,z:ISLE.z-16};               // the Sunken Spire, on the island's one real hill
ISLE.flats.push({x:ISLE.land.x,z:ISLE.land.z,r:10,h:0.9},{x:ISLE.spire.x,z:ISLE.spire.z,r:11,h:null});
var ISLE_FOG=[0.55,0.47,0.40], ISLE_TINT=[1.18,0.86,0.74];

function inIsle(x,z){ return x>ISLE.x0; }
function offMap(x,z){ return inCave(x,z)||inIsle(x,z); }

/* ---------- the ground ---------- */
function isleRaw(x,z){
  var lx=x-ISLE.x, lz=z-ISLE.z, d=Math.hypot(lx,lz)/ISLE.R+(vnoise(x*0.025+11,z*0.025-7)-0.5)*0.16;
  var h=(fbm(x*0.7+300,z*0.7,4,0.02)*2-1)*8+(fbm(x+40,z+90,3,0.05)*2-1)*2.2+4.0;
  h+=9*Math.exp(-Math.pow(Math.hypot(x-ISLE.spire.x,z-ISLE.spire.z)/34,2));    // the spire's hill
  var beach=smooth01((d-0.70)/0.12), sea=smooth01((d-0.86)/0.08);
  h=h*(1-beach)+0.4*beach;                       // a ring of sand
  return h*(1-sea)+(-7)*sea;                     // and the sea floor drops away
}
function isleH(x,z){
  var h=isleRaw(x,z);
  for(var i=0;i<ISLE.flats.length;i++){ var F=ISLE.flats[i], dt=Math.hypot(x-F.x,z-F.z);
    if(dt>F.r*2.2) continue;
    if(F.h===null) F.h=isleRaw(F.x,F.z);
    var w=Math.exp(-Math.pow(dt/F.r,4)); h=h*(1-w)+F.h*w; }
  return h;
}
/* the trodden path from the landing up to the spire */
function islePathD(x,z){ return Math.min(segDist(x,z,ISLE.land.x+6,ISLE.land.z,ISLE.spire.x-9,ISLE.spire.z+3),
  segDist(x,z,ISLE.land.x+6,ISLE.land.z+2,CASTLE.gate.x-3,CASTLE.gate.z)); }       // and on to the castle gate
function isleClear(x,z,pad){
  pad=pad||0;
  return Math.hypot(x-ISLE.land.x,z-ISLE.land.z)<15+pad||Math.hypot(x-ISLE.spire.x,z-ISLE.spire.z)<14+pad||inCastle(x,z,8+pad)||islePathD(x,z)<3+pad;
}
var C_RUST=[0.50,0.29,0.12], C_AMBER=[0.62,0.45,0.17], C_OLIVE=[0.42,0.38,0.17];
function isleCol(x,z,y){
  var sl=Hn(x,z), g=fbm(x+77,z-13,2,0.05);
  var col=mix3(C_RUST,C_AMBER,g);
  col=mix3(col,C_OLIVE,smooth01((fbm(x-50,z+20,2,0.018)-0.52)/0.12)*0.8);       // patches of late green
  col=mix3(col,C_PATH,(1-smooth01((islePathD(x,z)-0.9)/1.3))*(0.85+g*0.3));
  col=mix3(col,C_PATH,(1-smooth01((Math.hypot(x-ISLE.land.x,z-ISLE.land.z)-5)/3))*0.8);
  col=mix3(col,[0.52,0.50,0.46],(1-smooth01((Math.hypot(x-ISLE.spire.x,z-ISLE.spire.z)-8)/2))*0.7);   // old paving
  if(inCastle(x,z,1)) col=mix3(col,[0.48,0.45,0.40],0.75);                                                 // the courtyard's flags
  col=mix3(col,C_DIRT,smooth01((sl-0.26)/0.16));
  col=mix3(col,C_ROCK,smooth01((sl-0.48)/0.14));
  var d=Math.hypot(x-ISLE.x,z-ISLE.z)/ISLE.R;
  col=mix3(col,[0.76,0.66,0.48],smooth01((d-0.66)/0.08)*smooth01((2.2-y)/1.2));   // pale sand
  return mix3(col,C_SAND,smooth01((WATER+0.9-y)/0.6));
}

/* ---------- building it ---------- */
var ISLE3=null;
function isleMesh(){
  var m=new MB(), S=3, e=0.8, E=Math.ceil(ISLE.R*1.06/S)*S, X0=ISLE.x-E, Z0=ISLE.z-E, N=Math.round(E*2/S);
  var P=[], NN=[], CC=[];
  for(var i=0;i<=N;i++) for(var j=0;j<=N;j++){
    var x=X0+i*S, z=Z0+j*S, y=H(x,z);
    P.push([x,y,z]); NN.push(nrm([H(x-e,z)-H(x+e,z),2*e,H(x,z-e)-H(x,z+e)]));
    var c=isleCol(x,z,y), t=(RNG()-0.5)*0.03;
    CC.push([Math.max(0,c[0]+t),Math.max(0,c[1]+t),Math.max(0,c[2]+t)]);
  }
  function id(a,b){ return a*(N+1)+b; }
  for(var a=0;a<N;a++) for(var b=0;b<N;b++){
    var A=id(a,b), B=id(a+1,b), C=id(a+1,b+1), D=id(a,b+1);
    if(P[A][1]<-6.5&&P[B][1]<-6.5&&P[C][1]<-6.5&&P[D][1]<-6.5) continue;      // open sea floor: hidden under the water anyway
    m.triV(P[A],P[C],P[B],NN[A],NN[C],NN[B],CC[A],CC[C],CC[B]);
    m.triV(P[A],P[D],P[C],NN[A],NN[D],NN[C],CC[A],CC[D],CC[C]);
  }
  var WE=260, n=26, s2=WE*2/n;                    // the sea, out to the horizon
  for(var i2=0;i2<n;i2++) for(var j2=0;j2<n;j2++){ var wx=ISLE.x-WE+i2*s2, wz=ISLE.z-WE+j2*s2;
    m.quad([wx,WATER,wz],[wx,WATER,wz+s2],[wx+s2,WATER,wz+s2],[wx+s2,WATER,wz],C_WATER,1); }
  return m;
}
/* a white Sylvani boat, moored: a long hull, a mast and a furled sail */
function buildBoat(m,x,z,ry){
  var c=Math.cos(ry), s=Math.sin(ry);
  addMesh(m,blobMesh([0.88,0.86,0.80],0,2),x,WATER+0.05,z,ry,1.25,0.75,3.6);
  addMesh(m,blobMesh([0.52,0.40,0.26],0,1),x,WATER+0.42,z,ry,1.0,0.12,3.0);              // the deck
  addMesh(m,blobMesh([0.80,0.62,0.22],0,1),x+s*3.3,WATER+0.75,z+c*3.3,ry,0.18,0.45,0.5);  // a gilded prow
  addMesh(m,boxMesh([0.40,0.30,0.20]),x,WATER+0.4,z,ry,0.16,6.2,0.16);                   // mast
  addMesh(m,boxMesh([0.92,0.90,0.84]),x+s*0.5,WATER+2.2,z+c*0.5,ry,0.35,3.4,0.35);        // the furled sail
  addMesh(m,boxMesh([0.40,0.30,0.20]),x+s*0.5,WATER+2.0,z+c*0.5,ry,0.1,0.1,2.6);          // boom
}
/* a jetty from (x,z) running along angle a for len units, planks at WATER+0.9 */
function buildJetty(m,x,z,a,len){
  var ux=Math.cos(a), uz=Math.sin(a), tx=-uz, tz=ux, plank=[0.55,0.42,0.28], post=[0.32,0.24,0.16], n=Math.round(len/1.6);
  for(var i=0;i<n;i++){ var px=x+ux*i*1.6, pz=z+uz*i*1.6;
    addMesh(m,boxMesh(plank),px,WATER+0.9,pz,a+Math.PI/2,2.2,0.15,1.5);
    if(i%2===0) for(var sd=-1;sd<=1;sd+=2) addMesh(m,boxMesh(post),px+tx*sd,WATER-2.5,pz+tz*sd,0,0.22,3.6,0.22); }
}
/* the home end: a white boat tied up beside Bram's cousin's jetty */
function buildHomeBoat(m){
  if(!SHORE.at) return;
  var a=-0.05, ux=Math.cos(a), uz=Math.sin(a), d=WHALF*0.6;
  while(d<WHALF*0.95&&H(ux*d,uz*d)>WATER+0.4) d+=0.5;
  var sx=ux*d, sz=uz*d;
  SHORE.pier={x:sx-ux*1.5,z:sz-uz*1.5};
  SHORE.boat={x:sx+ux*3.5-uz*2.6,z:sz+uz*3.5+ux*2.6};
  buildBoat(m,SHORE.boat.x,SHORE.boat.z,Math.PI/2+a);
  addMesh(m,boxMesh([0.32,0.24,0.16]),SHORE.pier.x-uz*1.5,H(SHORE.pier.x,SHORE.pier.z)-0.1,SHORE.pier.z+ux*1.5,0,0.16,1.6,0.16);   // a mooring post
}
/* the landing: a jetty out into the sea, the boat, a lantern post, crates, a signpost */
function buildLanding(m){
  var L=ISLE.land, d=0;
  while(d<40&&H(L.x-d,L.z)>WATER+0.4) d+=0.5;                    // walk west to the water's edge
  var ex=L.x-d;
  ISLE.pier={x:ex+1.5,z:L.z}; ISLE.boat={x:ex-3.5,z:L.z-2.6};
  buildJetty(m,ex+3,L.z,Math.PI,12);
  buildBoat(m,ISLE.boat.x,ISLE.boat.z,-Math.PI/2);
  var y=H(L.x,L.z), wood=[0.40,0.28,0.16];
  addMesh(m,boxMesh(wood),L.x-3,y-0.1,L.z+4.5,0,0.2,3.2,0.2);                              // lantern post
  addMesh(m,boxMesh(wood),L.x-2.6,y+3.0,L.z+4.5,0,0.9,0.1,0.1);
  addMesh(m,boxMesh([1.0,0.80,0.40]),L.x-2.2,y+2.4,L.z+4.5,0,0.35,0.5,0.35);
  collCircle(L.x-3,L.z+4.5,0.3);
  [[2.5,-4.5,0.3],[3.4,-3.6,0.9],[2.8,-5.6,0.6]].forEach(function(c,i){
    addMesh(m,boxMesh([0.52,0.40,0.24]),L.x+c[0],y-0.05,L.z+c[1],c[2],0.9-i*0.1,0.9-i*0.1,0.9-i*0.1); if(i===0) collCircle(L.x+c[0],L.z+c[1],0.6); });
  addMesh(m,boxMesh(wood),L.x+5.5,y-0.1,L.z+2.2,0,0.18,2.4,0.18); collCircle(L.x+5.5,L.z+2.2,0.25);   // signpost to the spire
  addMesh(m,boxMesh([0.60,0.46,0.30]),L.x+5.9,y+1.8,L.z+1.9,-0.35,1.1,0.32,0.08);
  LANDMARKS.push({x:L.x,z:L.z,r:10,name:'Emberleaf Landing',kind:'landing',isle:1});
}
/* the Sunken Spire: the stump of a Sylvani watchtower in a ring of broken pillars */
function buildSpire(m){
  var S=ISLE.spire, y=H(S.x,S.z), stone=[0.66,0.62,0.56], dark=[0.50,0.47,0.43], ivy=[0.62,0.20,0.10];
  addMesh(m,coneMesh(stone,14,0.5,0.47),S.x,y-0.4,S.z,0,7.4,6.5,7.4);
  addMesh(m,coneMesh(dark,14,0.5,0.46,true),S.x+0.3,y+6.0,S.z-0.2,0.3,6.6,3.0,6.6);
  for(var k=0;k<9;k++){ var ka=k/9*6.283, kh=0.8+((k*37)%10)/10*3.2;                      // the broken crown
    addMesh(m,boxMesh(stone,0.8),S.x+0.3+Math.cos(ka)*2.9,y+8.8,S.z-0.2+Math.sin(ka)*2.9,-ka,1.3,kh,0.7); }
  for(var v=0;v<14;v++){ var va=v*0.9+0.4, vh=0.5+((v*53)%10)/10*5.5;                      // red ivy up the walls
    addMesh(m,boxMesh(ivy),S.x+Math.cos(va)*3.62,y+vh,S.z+Math.sin(va)*3.62,-va,0.9,1.2+((v*7)%3)*0.5,0.12); }
  addMesh(m,boxMesh([0.20,0.16,0.12]),S.x+Math.cos(2.6)*3.4,y-0.05,S.z+Math.sin(2.6)*3.4,-2.6+Math.PI/2,1.6,2.6,0.6);   // a dark doorway
  collCircle(S.x,S.z,3.7);
  for(var i=0;i<10;i++){ var a=i/10*6.283+0.15, px=S.x+Math.cos(a)*9.5, pz=S.z+Math.sin(a)*9.5, ph=i%3===0?5.2:(1.2+((i*29)%10)/10*2.6);
    if(i===7) continue;                                                                   // the way in
    addMesh(m,boxMesh(stone,0.85),px,H(px,pz)-0.3,pz,a,1.2,ph,1.2); collCircle(px,pz,0.7);
    if(i%3===0) addMesh(m,boxMesh(dark),px,H(px,pz)+ph-0.3,pz,a,1.6,0.35,1.6); }
  for(var f=0;f<3;f++){ var fa=f*2.1+1.0, fx=S.x+Math.cos(fa)*13, fz=S.z+Math.sin(fa)*13;    // fallen pillars
    addMesh(m,boxMesh(dark),fx,H(fx,fz)-0.25,fz,fa+1.2,1.0,0.95,4.2); collBox(fx,fz,0.5,2.1,fa+1.2); }
  for(var r=0;r<12;r++){ var ra=r*0.53, rd=4.6+(r%4)*1.1, rx=S.x+Math.cos(ra)*rd, rz=S.z+Math.sin(ra)*rd;
    addMesh(m,ROCK,rx,H(rx,rz)-0.1,rz,r,0.35+(r%3)*0.15,0.25+(r%2)*0.15,0.4); }
  var B={x:S.x+Math.cos(2.3)*6.4,z:S.z+Math.sin(2.3)*6.4}, by=H(B.x,B.z);                   // an ember brazier that never goes out
  addMesh(m,coneMesh([0.24,0.22,0.22],8,0.3,0.55),B.x,by,B.z,0,1.3,1.1,1.3);
  addMesh(m,blobMesh([1.0,0.52,0.14],0.1,1),B.x,by+1.15,B.z,0,0.55,0.35,0.55);
  collCircle(B.x,B.z,0.6); ISLE.brazier=B;
  LANDMARKS.push({x:S.x,z:S.z,r:12,name:'The Sunken Spire',kind:'spire',isle:1});
}
/* autumn props: Quaternius trees with their green swapped for rust, red and gold */
var LEAF=[[0.80,0.38,0.10],[0.70,0.17,0.08],[0.85,0.63,0.16],[0.76,0.50,0.12]];
function isleProp(name,x,y,z,ry,h,wk,leaf){
  var C=chunkAt(x,z), P=NAT[name];
  function put(ch,Q){ var b=ch.nv; addPropTo(ch,Q,x,y,z,ry,h,wk,null); if(!leaf) return;
    for(var v=b;v<ch.nv;v++){ var r=ch.c[v*3], g=ch.c[v*3+1], bl=ch.c[v*3+2];
      if(g>r*1.12&&g>bl*1.05){ var k=(r+g+bl)/0.9; ch.c[v*3]=leaf[0]*k; ch.c[v*3+1]=leaf[1]*k; ch.c[v*3+2]=leaf[2]*k; } } }
  put(C.hi,P); put(C.lo,P.lo);
  PROPTRIS+=P.i.length/3; PROPN[name]=(PROPN[name]||0)+1;
}
function scatterIsle(){
  if(!NAT) return;
  var r=mulberry(2024), TG={}, TMIN=4.4;
  function room(x,z){ var ix=Math.floor(x/6), iz=Math.floor(z/6);
    for(var i=ix-1;i<=ix+1;i++) for(var j=iz-1;j<=iz+1;j++){ var L=TG[i+','+j]; if(!L) continue;
      for(var n=0;n<L.length;n++) if(Math.hypot(L[n][0]-x,L[n][1]-z)<TMIN) return false; }
    return true; }
  function mark(x,z){ var k=Math.floor(x/6)+','+Math.floor(z/6); (TG[k]||(TG[k]=[])).push([x,z]); }
  for(var t=0;t<3400;t++){
    var x=ISLE.x+(r()*2-1)*ISLE.R, z=ISLE.z+(r()*2-1)*ISLE.R, y=H(x,z), k=r();
    if(y<WATER+0.9||Hn(x,z)>0.7) continue;
    if(isleClear(x,z,k<0.5?1.5:0)) continue;
    var sandy=Math.hypot(x-ISLE.x,z-ISLE.z)/ISLE.R>0.7;
    if(k<0.5){                                                     // trees, in open stands
      if(sandy||!room(x,z)||(fbm(x+800,z,2,0.03)>0.58&&r()<0.85)) continue;
      mark(x,z);
      var kind=r(), hh=5.4+r()*3.4, leaf=LEAF[(r()*LEAF.length)|0];
      if(kind<0.12){ collCircle(x,z,0.32); isleProp(pick(r,['pine1','pine2','pine3']),x,y-0.1,z,r()*6.28,hh*1.15,1,[0.75,0.85,0.7]); }
      else if(kind<0.30){ collCircle(x,z,0.32); isleProp('dead1',x,y-0.1,z,r()*6.28,hh*0.9,1,null); }
      else if(kind<0.62){ collCircle(x,z,0.4); isleProp(pick(r,['oak1','oak2','oak3']),x,y-0.1,z,r()*6.28,hh,0.9+r()*0.25,leaf); }
      else { collCircle(x,z,0.32); isleProp(pick(r,['birch1','birch2']),x,y-0.1,z,r()*6.28,hh,0.9+r()*0.2,LEAF[2]); }
    } else if(k<0.64){                                             // rocks
      var s=0.8+r()*2.4; if(s>1.3) collCircle(x,z,0.4*s,0.55*s);
      var rn=pick(r,['rock1','rock2','rock3','rock4']); isleProp(rn,x,y-0.12*s,z,r()*6.28,s*1.25/NAT[rn].w*(0.8+r()*0.5),1,[0.50,0.40,0.20]);   // the moss has gone dry
    } else if(k<0.70){                                             // stumps and logs
      if(sandy) continue; collCircle(x,z,0.5,0.9);
      isleProp(r()<0.5?'stump':'log',x,y-0.06,z,r()*6.28,0.9+r()*0.4,1,null);
    } else if(!sandy){                                             // undergrowth, gone red
      var u=r(), un=u<0.35?pick(r,['fern1','fern2']):(u<0.8?pick(r,['bush1','bush2']):'berry');
      isleProp(un,x,y-0.05,z,r()*6.28,0.8+r()*0.6,1,LEAF[(r()*LEAF.length)|0]);
    }
  }
}
function buildIsle(homeMesh){
  buildHomeBoat(homeMesh);
  var m=isleMesh();
  buildLanding(m); buildSpire(m); buildCastle(m); scatterIsle();
  ISLE3=new THREE.Mesh(toGeom(m),WORLDMAT); ISLE3.frustumCulled=false;
  ISLE3.castShadow=true; ISLE3.receiveShadow=true; ISLE3.visible=false;
  SCENE.add(ISLE3);
  return m.count()/3;
}

/* ---------- the light out there: a long amber afternoon ---------- */
var ISLEENV=null;
function setIsleEnv(on){
  if(ISLEENV===on) return; ISLEENV=on; WILD.inIsle=on;
  if(WILD.inCave) return;                        // the cave sets its own light
  var c=on?ISLE_FOG:SKYCOL;
  R3.setClearColor(new THREE.Color(c[0],c[1],c[2]),1);
  SCENE.fog.color.setRGB(c[0],c[1],c[2]); SCENE.fog.near=on?30:38; SCENE.fog.far=on?118:133;
  WORLD.visible=!on; if(HOUSE3) HOUSE3.visible=!on; if(ISLE3) ISLE3.visible=on;
  if(SKY) SKY.material.color.setRGB(on?ISLE_TINT[0]:1,on?ISLE_TINT[1]:1,on?ISLE_TINT[2]:1);
  if(SUN) SUN.color.setRGB(1.0,on?0.80:0.95,on?0.58:0.80);
  if(HEMI) HEMI.color.setRGB(on?0.50:0.42,on?0.44:0.48,on?0.36:0.40);
}

/* ---------- getting there ---------- */
function sailScreen(out){
  menuOpen('talk'); sfx('click');
  var p=G.player, html;
  if(out){
    var low=p.level<ISLE.level;
    html='<h1>The White Boat</h1><p class="sub">Tied up at the end of the jetty</p>'+
      '<p class="say">One of the old Sylvani boats, pale as a shell, with a gilded prow. It wasn\'t here last week. Out past the surf the mist has thinned, and for the first time anyone can remember there is land on the horizon: a low island, burning red and gold.</p>'+
      '<div class="stat"><span>Across the water</span><b>the Emberleaf Isle</b></div>'+
      '<div class="stat"><span>A hunt for</span><b>level '+ISLE.level+' or so — you are '+p.level+'</b></div>'+
      '<p class="sub">Everything over there is tougher than in the wood, and pays better for it.'+(low?' You may want a few more levels first.':'')+'</p>'+
      '<div class="opts"><button class="opt gold" data-o="go"><b>Cast off</b><small>Sail east to Emberleaf Landing'+(G.ents.some(function(e){ return e.kind==='ally'; })?', with your company':'')+'.</small></button></div>'+
      '<button class="btn" id="leave">Not today</button>';
  } else {
    html='<h1>The White Boat</h1><p class="sub">Emberleaf Landing</p>'+
      '<p class="say">The boat rocks at the jetty, patient. West, past the haze, a dark line of trees: the Elderwood.</p>'+
      '<div class="opts"><button class="opt gold" data-o="go"><b>Sail home</b><small>Back to the Sunlit Shore.</small></button></div>'+
      '<button class="btn" id="leave">Stay a while</button>';
  }
  show(html);
  ui.querySelector('.opt[data-o="go"]').onclick=function(){ menuClose(); G.talk=null; sail(out); };
  document.getElementById('leave').onclick=menuClose;
}
function sail(out){
  var p=G.player;
  if(out){
    var L=ISLE.land; moveParty(L.x+2,L.z,Math.PI/2);
    sfx('discover'); tip('The boat noses into the jetty. The air smells of woodsmoke and apples.');
    if(!G.found['The Emberleaf Isle']){ G.found['The Emberleaf Isle']=1; loreGet('isle'); gainXp(120,p.x,p.y+3,p.z,'+120 XP — a new land'); }
  } else {
    var A=SHORE.pier||SHORE.at; moveParty(A.x-5,A.z,-Math.PI/2);
    sfx('discover'); tip('Home again. The wood smells green after the isle.');
  }
  setTimeout(saveGame,60);
}
function isleTalk(p,list){
  if(WILD.inCave) return;
  princessTalk(p,list);
  if(!WILD.inIsle){
    var Q=SHORE.pier; if(Q&&Math.hypot(Q.x-p.x,Q.z-p.z)<4.5)
      list.push({x:SHORE.boat.x,y:WATER+1,z:SHORE.boat.z,lift:2.6,label:'the white boat',tap:'SAIL',open:function(){ sailScreen(true); }});
  } else {
    var R=ISLE.pier; if(R&&Math.hypot(R.x-p.x,R.z-p.z)<4.5)
      list.push({x:ISLE.boat.x,y:WATER+1,z:ISLE.boat.z,lift:2.6,label:'sail home',tap:'SAIL',open:function(){ sailScreen(false); }});
  }
}
/* the landing is safe ground, like the tavern yard: foes break off and you mend */
function isleSafe(p){ return WILD.inIsle&&Math.hypot(p.x-ISLE.land.x,p.z-ISLE.land.z)<12; }
function isleUpdate(dt){
  var p=G.player;
  setIsleEnv(inIsle(p.x,p.z));
  castleTick(dt);
  if(!WILD.inIsle) return;
  if(isleSafe(p)&&!p.dead&&p.hp<p.maxHp) p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.06*dt);
  var B=ISLE.brazier;                            // the brazier's embers
  if(B&&Math.random()<0.5&&Math.hypot(B.x-p.x,B.z-p.z)<60)
    burst(B.x+(Math.random()-0.5)*0.6,H(B.x,B.z)+1.4,B.z+(Math.random()-0.5)*0.6,1,Math.random()<0.5?[1.0,0.62,0.18]:[1.0,0.38,0.10],{up:2,spread:0.3,size:0.09,life:0.8,grav:-2});
}

/* ---------- who lives there ----------
   The wood's monsters, gone autumn-coloured and mean: ember spiders, ash
   snakes, amber wasps and rust-capped grumps. */
function isleFoe(x,z){
  var r=Math.random(), e;
  if(r<0.45){ spawnSpider(x,z,Math.random()<0.14); e=G.ents[G.ents.length-1];
    e.look.body=e.big?[0.50,0.14,0.05]:[0.42,0.17,0.07]; e.look.eye=[1.0,0.62,0.15]; }
  else if(r<0.68){ spawnSnake(x,z); e=G.ents[G.ents.length-1]; e.look.body=[0.32,0.27,0.24]; e.look.belly=[0.75,0.45,0.18]; }
  else if(r<0.84){ spawnWasp(x,z); e=G.ents[G.ents.length-1]; e.look.stripe=[0.95,0.45,0.10]; }
  else { spawnShroom(x,z); e=G.ents[G.ents.length-1]; e.look.cap=[0.78,0.36,0.10]; }
  isleToughen(e);
  return e;
}
function isleToughen(e){ e.isle=1; e.hp*=ISLE.tough; e.maxHp*=ISLE.tough; e.dmg*=ISLE.bite; e.aggro*=1.1; }
function isleSpawnSpot(far){
  var p=G.player;
  for(var k=0;k<16;k++){ var a=Math.random()*6.283, d=Math.sqrt(Math.random())*ISLE.R*0.7, x=ISLE.x+Math.cos(a)*d, z=ISLE.z+Math.sin(a)*d;
    if(H(x,z)<WATER+0.8||solidAt(x,z,0.5)) continue;
    if(Math.hypot(x-ISLE.land.x,z-ISLE.land.z)<26||inCastle(x,z,10)) continue;
    if(far&&Math.hypot(x-p.x,z-p.z)<far) continue;
    return {x:x,z:z}; }
  return null;
}
function isleSpawnPack(far){
  var s=isleSpawnSpot(far); if(!s) return;
  var n=2+((Math.random()*(DF()===DIFFS.easy?1.6:3))|0);
  for(var i=0;i<n;i++){ var e=isleFoe(s.x+(Math.random()-0.5)*5,s.z+(Math.random()-0.5)*5);
    if(i===0&&Math.random()<DF().champ*1.5) makeChampion(e); }
}
function populateIsle(){
  var D=DF(), packs=Math.round(11*D.pop);
  if(WILD.sister.t<=0) spawnSister();
  spawnPrincess();
  for(var i=0;i<packs;i++) isleSpawnPack(0);
  var r=mulberry(616);
  for(var c=0;c<6;c++){ var a=r()*6.283, d=16+r()*14, x=ISLE.spire.x+Math.cos(a)*d, z=ISLE.spire.z+Math.sin(a)*d;   // kin, strung up round the spire
    if(H(x,z)>WATER+0.6&&!solidAt(x,z,0.5)) spawnCocoon(x,z); }
  var LC=[[0.98,0.55,0.15],[0.95,0.80,0.25],[0.85,0.30,0.20],[0.98,0.92,0.80]];
  for(var b=0;b<26;b++){ var q=isleSpawnSpot(0); if(!q) continue;                       // butterflies in the colours of the leaves
    G.ents.push({kind:'critter',sub:'fly',x:q.x,y:H(q.x,q.z),z:q.z,home:{x:q.x,z:q.z},yaw:0,seed:r()*9,t:r()*20,col:LC[b%4],speed:0,scale:1}); }
  var L=ISLE.land;
  for(var g=0;g<4;g++) G.ents.push({kind:'critter',sub:'gull',x:L.x,y:10,z:L.z,home:{x:L.x-14-r()*10,z:L.z+(r()-0.5)*30},
    yaw:0,seed:r()*9,t:r()*20,rr:6+r()*8,spd:(r()<0.5?-1:1)*(0.25+r()*0.2),scale:0.42,speed:0});
}
/* where foes stand on the isle (for the respawn pressure in game.js) */
function isleRespawn(){
  var n=0; for(var i=0;i<G.ents.length;i++){ var e=G.ents[i]; if(e.isle&&FOE[e.kind]) n++; }
  if(n<Math.round(30*DF().pop)) isleSpawnPack(40);
}

/* ================= Ashwing's castle =================
   On the isle's north shore stands Caer Aelfhaven, the old Sylvani castle.
   Cinderwing's sister Ashwing took it when the mist came, and keeps the last
   princess of the isle, Elowen, locked in a gilded cage in the courtyard
   (she likes shiny things). Slay Ashwing and Elowen is free. */
var CASTLE={x:ISLE.x+6,z:ISLE.z+44,A:18};            // A: half the courtyard's width, to the walls
CASTLE.gate={x:CASTLE.x-CASTLE.A,z:CASTLE.z};
CASTLE.lair={x:CASTLE.x+5,z:CASTLE.z-5};
CASTLE.cage={x:CASTLE.x+10,z:CASTLE.z+9};
CASTLE.nest={x:CASTLE.x,z:CASTLE.z,r:16,lair:CASTLE.lair,top:null,yaw:-Math.PI/2,
  wake:'WHO DARES WALK IN MY CASTLE?',rage:'YOU KILLED NOTHING OF MINE YET!'};
ISLE.flats.push({x:CASTLE.x,z:CASTLE.z,r:30,h:null});
var SISTER_RESPAWN=720;
function inCastle(x,z,pad){ return Math.abs(x-CASTLE.x)<CASTLE.A+(pad||0)&&Math.abs(z-CASTLE.z)<CASTLE.A+(pad||0); }

function buildCastle(m){
  var C=CASTLE, A=C.A, y=H(C.x,C.z), stone=[0.62,0.58,0.52], dark=[0.45,0.42,0.38], slate=[0.30,0.32,0.42], red=[0.70,0.16,0.12], gold=[0.92,0.74,0.26];
  var T=1.8, WH=7;
  function wall(x0,z0,x1,z1){                     // a straight stretch of wall with battlements
    var cx=(x0+x1)/2, cz=(z0+z1)/2, len=Math.hypot(x1-x0,z1-z0), alongX=Math.abs(x1-x0)>Math.abs(z1-z0);
    addMesh(m,boxMesh(stone),cx,y-1.5,cz,0,alongX?len:T,WH+1.5,alongX?T:len);
    collBox(cx,cz,alongX?len/2:T/2,alongX?T/2:len/2,0);
    for(var k=0;k<len/2.2-0.5;k++){ var t=(k+0.5)*2.2/len, bx=x0+(x1-x0)*t, bz=z0+(z1-z0)*t;
      addMesh(m,boxMesh(dark),bx,y+WH,bz,0,alongX?1.1:T+0.2,0.9,alongX?T+0.2:1.1); }
  }
  function tower(x,z,r,h,roof){
    addMesh(m,coneMesh(stone,12,0.5,0.47),x,H(x,z)-1.5,z,0,r*2,h+1.5,r*2); collCircle(x,z,r);
    if(roof){ addMesh(m,coneMesh(slate,12,0.5,0),x,H(x,z)+h,z,0,r*2.5,r*2.2,r*2.5);
      addMesh(m,boxMesh(red),x+0.3,H(x,z)+h+r*2.2,z,0,0.06,1.6,1.0); addMesh(m,boxMesh(dark),x,H(x,z)+h+r*2.1,z,0,0.1,2.2,0.1); }
    else for(var k=0;k<8;k++){ var a=k/8*6.283; addMesh(m,boxMesh(dark),x+Math.cos(a)*r*0.88,H(x,z)+h,z+Math.sin(a)*r*0.88,-a,1.0,0.9,0.7); }
  }
  var g=3.6;                                      // half the gate's width
  wall(C.x-A,C.z-A,C.x-A,C.z-g); wall(C.x-A,C.z+g,C.x-A,C.z+A);          // west, either side of the gate
  wall(C.x+A,C.z-A,C.x+A,C.z+A); wall(C.x-A,C.z-A,C.x+A,C.z-A); wall(C.x-A,C.z+A,C.x+A,C.z+A);
  tower(C.x-A,C.z-A,3.2,11,true); tower(C.x+A,C.z-A,3.2,11,true); tower(C.x-A,C.z+A,3.2,11,true);
  tower(C.x+A,C.z+A,3.2,9,false);                 // this one's roof is long gone: scorch marks up its side
  for(var s=0;s<5;s++) addMesh(m,boxMesh([0.16,0.13,0.12]),C.x+A+Math.cos(2.5+s*0.2)*3.25,H(C.x+A,C.z+A)+2+s*1.3,C.z+A+Math.sin(2.5+s*0.2)*3.25,-(2.5+s*0.2),1.6,1.6,0.1);
  tower(C.x-A,C.z-g-1.8,2.3,9.5,false); tower(C.x-A,C.z+g+1.8,2.3,9.5,false);                  // the gatehouse
  addMesh(m,boxMesh(stone),C.x-A,y+5.6,C.z,0,T+0.6,1.6,g*2+1.5);                               // the arch over the gate
  for(var pb=0;pb<5;pb++) addMesh(m,boxMesh([0.24,0.22,0.22]),C.x-A,y+4.7,C.z-g+0.8+pb*1.5,0,0.18,0.9,0.18);   // the portcullis, raised
  for(var bn=-1;bn<=1;bn+=2){ addMesh(m,boxMesh(red),C.x-A-T/2-0.05,y+2.4,C.z+bn*(g+3.6),0,0.08,3.2,1.3);       // banners by the gate
    addMesh(m,boxMesh(gold),C.x-A-T/2-0.08,y+3.7,C.z+bn*(g+3.6),0,0.06,0.5,0.5); }
  // the keep, leaning on the east wall: a tall round tower with a slate roof
  var K={x:C.x+A+4.5,z:C.z-4}; addMesh(m,coneMesh(stone,14,0.5,0.46),K.x,H(K.x,K.z)-2,K.z,0,10,20,10); collCircle(K.x,K.z,5);
  addMesh(m,coneMesh(slate,14,0.5,0),K.x,H(K.x,K.z)+18,K.z,0,12,7,12);
  for(var wi=0;wi<3;wi++){ var wa=Math.PI+wi*0.5-0.5; addMesh(m,boxMesh([0.95,0.78,0.40]),K.x+Math.cos(wa)*4.7,H(K.x,K.z)+9+wi*2.5,K.z+Math.sin(wa)*4.7,-wa,0.4,1.4,0.7); }
  // the courtyard: old paving, scorched round the lair, and her hoard
  for(var f=0;f<26;f++){ var fx=C.x+((f*37)%30)-15, fz=C.z+((f*53)%30)-15; if(Math.hypot(fx-C.lair.x,fz-C.lair.z)<6) continue;
    addMesh(m,boxMesh([0.50,0.48,0.44]),fx,H(fx,fz)-0.18,fz,(f*0.7)%1.5,1.6+(f%3)*0.4,0.22,1.4+(f%2)*0.5); }
  addMesh(m,coneMesh([0.18,0.15,0.14],16,0.5,0.5),C.lair.x,H(C.lair.x,C.lair.z)-0.02,C.lair.z,0,13,0.06,13);
  for(var h=0;h<24;h++){ var ha=h*0.62, hr=2.6+(h%5)*0.7, hx=C.lair.x+Math.cos(ha)*hr, hz=C.lair.z+Math.sin(ha)*hr;
    addMesh(m,blobMesh(h%4===0?[0.85,0.85,0.90]:gold,0,1),hx,H(hx,hz)-0.1,hz,h,0.7+(h%3)*0.3,0.35+(h%2)*0.2,0.7); }
  // the gilded cage, and a cushion in it
  var Q=C.cage, qy=H(Q.x,Q.z);
  addMesh(m,coneMesh(gold,16,0.5,0.5),Q.x,qy-0.05,Q.z,0,3.6,0.25,3.6);
  for(var b=0;b<14;b++){ var ba=b/14*6.283; addMesh(m,boxMesh(gold),Q.x+Math.cos(ba)*1.7,qy+0.2,Q.z+Math.sin(ba)*1.7,-ba,0.1,3.6,0.1); }
  addMesh(m,blobMesh(gold,0,2),Q.x,qy+3.8,Q.z,0,1.85,1.1,1.85);
  addMesh(m,boxMesh(gold),Q.x,qy+4.8,Q.z,0,0.12,1.2,0.12);
  addMesh(m,blobMesh([0.70,0.22,0.40],0,1),Q.x,qy+0.35,Q.z,0,0.9,0.18,0.9);
  collCircle(Q.x,Q.z,1.8);
  LANDMARKS.push({x:C.x,z:C.z,r:A+2,name:'Caer Aelfhaven',kind:'castle',isle:1});
}

/* ---------- Ashwing ---------- */
function spawnSister(){
  var L=CASTLE.lair, k=WILD.sister.kills, hp=3200*(1+0.4*k)*bossLevel()*DF().hp;
  G.ents.push({kind:'dragon',sister:1,isle:1,boss:1,name:k?'Ashwing, Queen of Cinders':'Ashwing, Cinderwing\'s Sister',short:'Ashwing',
    x:L.x,y:H(L.x,L.z),z:L.z,vy:0,yaw:CASTLE.nest.yaw,scale:1.18,rad:3.4,tall:5.2,
    hp:hp,maxHp:hp,dmg:34*(1+0.2*k)*bossLevel()*ISLE.bite,speed:0,walkPhase:0,onGround:true,
    // ash-pale scales, dark horns, amber wings and a molten belly: her brother in negative
    look:{body:[0.52,0.48,0.50],dark:[0.30,0.26,0.29],belly:[0.88,0.58,0.24],horn:[0.20,0.16,0.18],wing:[0.88,0.50,0.12],eye:[0.55,0.95,1.0],ember:[1.0,0.70,0.25]},
    aggro:22, atkCd:2, wind:0, hurtT:0, state:'sleep', stT:0, fly:0, flyK:0, fireCd:1.3, home:{x:L.x,z:L.z}, snore:0, nest:CASTLE.nest});
}
function sisterDown(e){
  var p=G.player, pay=DF().pay, c=Math.round((600+150*WILD.sister.kills)*pay);
  p.coins+=c; p.potions+=3; WILD.sister.kills++; WILD.sister.t=SISTER_RESPAWN; loreGet('ashwing_down');
  gainXp(2000,e.x,e.y+5,e.z,'+2000 XP — Ashwing falls');
  msg('+'+c+' ◉  +3 potions','#ffe08a',e.x,e.y+4,e.z,20);
  if(WILD.princess===0){ WILD.princess=1; tip('Ashwing falls! The cage key clatters onto the stones — go to Elowen'); }
  else tip('Ashwing falls again. Somewhere, her brother sulks.');
  burst(e.x,e.y+2,e.z,70,[1.0,0.78,0.30],{up:7,spread:7,size:0.24,life:1.6,grav:-1});
  sfx('levelup'); shake(0.8); setTimeout(saveGame,100);
}

/* ---------- Princess Elowen ---------- */
var PRINCESS_SAY=['“Bram says the stew is a family recipe. I\'ve met his family. I believe him.”',
  '“When the isle is quiet again, I\'ll light the beacon on the spire myself.”',
  '“You smell of smoke. Good. So does everyone worth knowing.”',
  '“Ashwing kept every shiny thing on the isle. Including me. I\'m told I\'m very shiny.”'];
function princessSpot(){
  if(WILD.princess>=2){ var t=dryNear(TAVERN.x-6,TAVERN.z+7); return {x:t.x,z:t.z,yaw:TAVERN.ry+Math.PI}; }
  return {x:CASTLE.cage.x,z:CASTLE.cage.z,yaw:-Math.PI/2};
}
function spawnPrincess(){
  var q=princessSpot(), gown=[0.86,0.52,0.74];
  G.ents.push({kind:'npc',npcId:'princess',name:'Princess Elowen',x:q.x,y:H(q.x,q.z),z:q.z,yaw:q.yaw,home:q.yaw,
    scale:0.95,speed:0,walkPhase:0,onGround:true,hp:1,maxHp:1,cheer:0,greeted:false,model:'rogue',tint:[1.0,0.80,0.92],
    greet:WILD.princess===0?'“Help! Over here — in the cage!”':(WILD.princess===1?'“You did it! Quick, the key!”':'“My rescuer!”'),
    look:look('elf','wizard',{tunic:gown,sleeve:gown,cloak:[0.95,0.85,0.55],weapon:null,hair:HAIR.blonde})});
}
function princessEnt(){ return folkEnt('princess'); }
function princessScreen(){
  menuOpen('talk'); sfx('click');
  var p=G.player, st=WILD.princess, html='<h1>Princess Elowen</h1>', btn='Farewell';
  if(st===0){
    var sis=null; G.ents.forEach(function(d){ if(d.sister) sis=d; });
    html+='<p class="sub">Locked in a gilded cage in the courtyard of Caer Aelfhaven</p>'+
      '<p class="say">“I\'m Elowen — the last of Aelfhaven\'s royal house, for what it\'s worth with no house left. When the mist came, so did <b>Ashwing</b>, Cinderwing\'s sister. She took the castle, and she took me: she collects shiny things, and apparently a princess counts. The key hangs from her horn.”</p>'+
      '<p class="say">“'+(sis&&sis.state==='sleep'?'She\'s asleep on her hoard. She won\'t be for long, once you start. ':'')+'She breathes fire on the ground, and when she takes to the air she rains it down. Fight her inside the walls — she won\'t leave her courtyard on foot.”</p>'+
      '<div class="stat"><span>A fight for</span><b>level '+(ISLE.level+3)+' or so — you are '+p.level+'</b></div>';
    btn='I\'ll be back with that key';
  } else if(st===1){
    var c=Math.round(300*DF().pay), it=makeItem('trinket',5); it.n='Elowen\'s Favour';
    p.coins+=c; takeItem(it); WILD.princess=2; loreGet('elowen');
    gainXp(800,p.x,p.y+3,p.z,'+800 XP — the princess is free');
    html+='<p class="sub">Free</p><p class="say">The key turns with a squeal. Elowen steps out, stretches, and looks down at Ashwing, sprawled across her own gold, with deep satisfaction.</p>'+
      '<p class="say">“Thank you. Truly. Take this — my mother\'s favour, from the treasury Ashwing didn\'t find. And this, for the boat. I hear there\'s a tavern on the far shore with a fire and a very loud innkeeper. I\'ll wait for you there.”</p>'+
      '<div class="stat"><span>You receive</span><b>+'+c+' ◉ &nbsp; Elowen\'s Favour (legendary trinket)</b></div>';
    btn='See you at the Greenleaf';
    var e=princessEnt(); if(e){ burst(e.x,e.y+1.2,e.z,40,[1.0,0.85,0.95],{up:4,spread:3,size:0.14,life:1.2,grav:-1}); G.ents.splice(G.ents.indexOf(e),1); }
    spawnPrincess(); sfx('freed'); sfx('levelup'); setTimeout(saveGame,60);
  } else {
    html+='<p class="sub">At the Greenleaf, by the fire</p><p class="say">'+PRINCESS_SAY[(Math.random()*PRINCESS_SAY.length)|0]+'</p>';
  }
  show(html+'<button class="btn" id="leave">'+btn+'</button>');
  document.getElementById('leave').onclick=menuClose;
}
function princessTalk(p,list){
  var e=princessEnt(); if(!e||Math.hypot(e.x-p.x,e.z-p.z)>(WILD.princess>=2?3.6:4.4)) return;
  list.push({x:e.x,y:e.y,z:e.z,lift:2.5,label:WILD.princess===1?'unlock the cage':'talk to Elowen',tap:WILD.princess===1?'FREE':'TALK',open:princessScreen});
}
function castleTick(dt){
  if(WILD.sister.t>0){ WILD.sister.t-=dt;
    if(WILD.sister.t<=0&&!G.ents.some(function(d){ return d.sister; })){
      if(WILD.inIsle&&inCastle(G.player.x,G.player.z,6)) WILD.sister.t=10; else spawnSister(); } }
}
