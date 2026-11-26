/* ================= the Fairy Fountain =================
   Deep in the west wood, past Wren's fairy ring, the Sylvani built a fountain
   round a spring that never freezes. Drink from it and you (and your company)
   are healed to full, poison, webs and all. The glade is safe ground, like the
   tavern yard.
   Over a mossy dais beside it lives the Grand Fairy, Lumenne, the greatest of
   the fairies. Visit her for a fairy blessing: pick one of the four fairy gifts
   and it lasts three minutes instead of half a minute. Then she needs a while
   to gather her light again.
   FOUNTAIN (where it is, how big) lives in world.js; the tuning is GRAND. */

var GRAND={time:180, rest:240, safe:15};
var GRAND_SAY=[
  'Little hunter. The wood is loud with your doings. Come, let me lend you a verse of the old song.',
  'You smell of spider-silk and river water. Good. That means you have been busy. Choose, and I will sing it into you.',
  'Every fairy in the wood is a note I let go. Choose one, and I will sing it to you longer than they can.',
  'Drink first, if you are hurt. The spring asks nothing. Then come to me.'];
function fairyDais(){ return {x:FOUNTAIN.x+FOUNTAIN.dais, z:FOUNTAIN.z}; }
function fountainSafe(x,z,r){ return Math.hypot(x-FOUNTAIN.x,z-FOUNTAIN.z)<(r===undefined?GRAND.safe:r); }

/* ---------- the site: baked once into the world mesh ---------- */
/* still, clear water: no swell (the world's water swell is bigger than the basin is deep) */
function waterDisc(col){
  var m=new MB(), up=[0,1,0], rim=[col[0]*0.85,col[1]*0.9,col[2]*0.95];       // a flat disc, radius 0.5, facing the sky
  for(var i=0;i<24;i++){ var a=i/24*6.2832, b=(i+1)/24*6.2832;
    m.triV([0,0,0],[Math.cos(b)*0.5,0,Math.sin(b)*0.5],[Math.cos(a)*0.5,0,Math.sin(a)*0.5],up,up,up,col,rim,rim); }
  return m;
}
function buildFountain(m){
  var X=FOUNTAIN.x, Z=FOUNTAIN.z, y=H(X,Z), R=FOUNTAIN.r;
  var stone=[0.80,0.80,0.84], stoneD=[0.62,0.63,0.68], moss=[0.34,0.52,0.30], water=[0.50,0.86,0.98], waterL=[0.66,0.93,1.0];
  // flagstones, and a ring of pale flowers round them
  addMesh(m,coneMesh([0.66,0.66,0.62],24,0.5,0.5),X,y-0.18,Z,0,R*2+5,0.26,R*2+5);
  for(var f=0;f<28;f++){ var fa=f/28*6.283, fr=R+3.4+(f%2)*0.5, fx=X+Math.cos(fa)*fr, fz=Z+Math.sin(fa)*fr;
    addMesh(m,blobMesh([[0.95,0.80,0.95],[0.80,0.90,1.0],[1.0,0.95,0.75]][f%3],0,1),fx,H(fx,fz)+0.02,fz,0,0.32,0.22,0.32); }
  // the basin: a stone drum, a rim of dressed blocks, water just under the rim
  addMesh(m,coneMesh(stoneD,22,0.5,0.5),X,y-0.3,Z,0,R*2,0.75,R*2);
  var nb=18;
  for(var b=0;b<nb;b++){ var ba=(b+0.5)/nb*6.283;
    addMesh(m,boxMesh(b%3?stone:[0.74,0.76,0.78],0.9),X+Math.cos(ba)*(R-0.15),y+0.55,Z+Math.sin(ba)*(R-0.15),-ba,0.55,0.5,R*6.283/nb*0.98); }
  addMesh(m,waterDisc(water),X,y+0.6,Z,0,R*2-0.5,0.04,R*2-0.5);
  collCircle(X,Z,R+0.15);
  // lily pads
  for(var l=0;l<5;l++){ var la=l*1.9+0.4, lr=1.4+(l%2)*0.9;
    addMesh(m,waterDisc([0.36,0.66,0.32]),X+Math.cos(la)*lr,y+0.63,Z+Math.sin(la)*lr,la,0.8,1,0.8);
    if(l%2) addMesh(m,blobMesh([1.0,0.82,0.92],0,1),X+Math.cos(la)*lr,y+0.66,Z+Math.sin(la)*lr,0,0.22,0.14,0.22); }
  // the column and its two bowls, one above the other
  addMesh(m,coneMesh(stone,12,0.5,0.36),X,y+0.6,Z,0,1.3,2.1,1.3);
  addMesh(m,coneMesh(stoneD,14,0.22,0.5),X,y+2.5,Z,0,2.6,0.55,2.6);
  addMesh(m,waterDisc(waterL),X,y+2.98,Z,0,2.2,0.02,2.2);
  addMesh(m,coneMesh(stone,10,0.5,0.36),X,y+2.9,Z,0,0.55,1.2,0.55);
  addMesh(m,coneMesh(stoneD,12,0.22,0.5),X,y+4.0,Z,0,1.3,0.35,1.3);
  // ivy up the column
  for(var v=0;v<7;v++){ var va=v*2.4; addMesh(m,blobMesh(moss,0.2,1),X+Math.cos(va)*0.6,y+0.9+v*0.3,Z+Math.sin(va)*0.6,va,0.32,0.26,0.32); }
  // white pillars round the glade, a few of them broken, ivy on the rest; the east side open
  for(var k=0;k<8;k++){ var ka=k/8*6.283+0.39; if(Math.cos(ka)>0.8||Math.cos(ka)<-0.8) continue;
    var px=X+Math.cos(ka)*(R+6.6), pz=Z+Math.sin(ka)*(R+6.6), ph=H(px,pz), tall=(k%3===1)?2.0:4.2;
    addMesh(m,coneMesh(stone,10,0.5,0.46),px,ph-0.2,pz,0,0.9,tall,0.9);
    if(tall>3) addMesh(m,boxMesh(stoneD),px,ph+tall-0.2,pz,ka,1.2,0.3,1.2);
    else addMesh(m,boxMesh(stone,0.7),px+0.9,ph-0.1,pz+0.4,ka,0.7,0.5,1.6);       // the broken top, fallen in the grass
    addMesh(m,blobMesh(moss,0.2,1),px,ph+tall*0.4,pz,ka,0.98,tall*0.22,0.98);
    collCircle(px,pz,0.5); }
  // the Grand Fairy's dais on the west side: a round step, a moss cushion, and an arch of living willow over it
  var D=fairyDais(), dy=H(D.x,D.z);
  addMesh(m,coneMesh(stone,16,0.5,0.5),D.x,dy-0.1,D.z,0,3.6,0.45,3.6);
  addMesh(m,blobMesh(moss,0.12,2),D.x,dy+0.3,D.z,0,2.6,0.25,2.6);
  for(var s=-1;s<=1;s+=2){ var ax=D.x-1.4, az=D.z+s*2.6;
    addMesh(m,coneMesh([0.42,0.33,0.22],8,0.5,0.4),ax,dy,az,0,0.45,4.4,0.45); collCircle(ax,az,0.3); }
  for(var t=0;t<13;t++){ var ta=t/12*3.1416, tz=D.z-Math.cos(ta)*2.6, ty=dy+4.2+Math.sin(ta)*1.3;
    addMesh(m,blobMesh(t%2?[0.98,0.84,0.94]:[0.44,0.68,0.38],0.15,1),D.x-1.4,ty,tz,t,t%2?0.5:0.75,t%2?0.5:0.6,t%2?0.5:0.75); }
  // glowing toadstools about the edges
  for(var g=0;g<9;g++){ var ga=g*0.7+2.2, gr=R+2.4+(g%3)*1.1, gx=X+Math.cos(ga)*gr, gz=Z+Math.sin(ga)*gr, gh=H(gx,gz);
    addMesh(m,coneMesh([0.92,0.90,0.86],6,0.5,0.4),gx,gh-0.05,gz,0,0.18,0.45,0.18);
    addMesh(m,blobMesh([0.75,0.95,1.0],0,1),gx,gh+0.42,gz,0,0.5,0.22,0.5); }
  LANDMARKS.push({x:X,z:Z,r:12,name:'The Fairy Fountain',kind:'fountain'});
}

/* ---------- walking up to it ---------- */
function fountainTalk(p,list){
  if(WILD.inCave||WILD.inHall||WILD.inIsle) return;
  var X=FOUNTAIN.x, Z=FOUNTAIN.z, d=Math.hypot(p.x-X,p.z-Z);
  if(d<FOUNTAIN.r+2.2) list.push({x:X,y:H(X,Z)+1,z:Z,lift:3.6,label:'drink from the fountain',tap:'DRINK',open:fountainDrink});
  var D=fairyDais();
  if(Math.hypot(p.x-D.x,p.z-D.z)<4.2) list.push({x:D.x,y:H(D.x,D.z)+2.4,z:D.z,lift:2.4,
    label:WILD.fount.t>0?'the Grand Fairy (resting)':'visit the Grand Fairy',tap:'VISIT',open:function(){ grandFairyScreen(); }});
}
function fountainDrink(){
  var p=G.player, X=FOUNTAIN.x, Z=FOUNTAIN.z, n=0;
  p.hp=p.maxHp; p.poisonT=0; p.slowT=0;
  for(var i=0;i<G.ents.length;i++){ var a=G.ents[i]; if(a.kind==='ally'){ a.hp=a.maxHp; n++; } }
  sfx('fairy'); buzz([10,20,10]);
  msg('Healed!','#bff0ff',p.x,p.y+2.6,p.z);
  burst(p.x,p.y+1.2,p.z,26,[0.62,0.92,1.0],{up:2.4,spread:1.6,size:0.11,life:1.1,grav:-1});
  burst(X,H(X,Z)+1,Z,14,[0.80,0.96,1.0],{up:3,spread:2,size:0.1,life:0.9,grav:2});
  WILD.fount.drinks=(WILD.fount.drinks||0)+1;
  tip(n?'Cold and sweet. You and your company are healed to full.':'Cold and sweet. You are healed to full.');
  loreGet('fountain');
}

/* ---------- the Grand Fairy's blessing ---------- */
function grandFairyScreen(say){
  if(G.state==='play'){ menuOpen('talk'); sfx('fairy'); }
  else if(G.state!=='talk') return;
  var F=WILD.fount, p=G.player, first=!F.met;
  F.met=1; loreGet('grandfairy');
  var html='<h1>The Grand Fairy</h1><p class="sub">Lumenne, the last great light of the Sylvani · blessings given: '+(F.n||0)+'</p>'+
    '<p class="say">'+(say||(first?'“Oh! A hunter of the leaf, here, at my spring. It has been so long. I am Lumenne. The little lights you chase about the wood are my songs; I let them go to keep the dark small. Come to me when you need more than a little light.”':
      (F.t>0?'Lumenne is curled on her moss with her wings folded, glowing very softly. “Mm. I gave you all my light, little hunter. Let me gather it again.”':GRAND_SAY[(Math.random()*GRAND_SAY.length)|0])))+'</p>';
  if(F.t>0){
    var s=Math.ceil(F.t), mm=Math.floor(s/60), ss=s%60;
    html+='<div class="stat"><span>Her light comes back in</span><b>'+mm+':'+(ss<10?'0':'')+ss+'</b></div><div class="opts">'+
      '<button class="opt off" disabled><b>She is resting</b><small>Hunt a while and come back. The fountain still heals you, any time.</small></button>';
  } else {
    html+='<p class="hint" style="margin-top:0">Pick one fairy blessing. It lasts three minutes, and she heals you as she sings it.</p><div class="opts">';
    for(var k=0;k<4;k++){ var c=FAIRYCOL[k].map(function(v){ return Math.round(v*255); }).join(','), nm=FAIRYNAME[k].split(' — ');
      html+='<button class="opt" data-b="'+k+'" style="border-color:rgb('+c+')"><b style="color:rgb('+c+')">'+nm[0][0]+nm[0].slice(1).toLowerCase()+'</b><small>'+GRAND_DESC[k]+'</small></button>'; }
  }
  html+='<button class="opt" data-b="drink"><b>Drink from the fountain</b><small>Healed to full, you and your company'+(p.hp<p.maxHp?' (you are hurt)':'')+'</small></button>';
  html+='</div><button class="btn" id="leave">Back to the wood</button>';
  show(html);
  var els=ui.querySelectorAll('.opt[data-b]');
  for(var i=0;i<els.length;i++) els[i].onclick=function(){ grandFairyDo(this.getAttribute('data-b')); };
  document.getElementById('leave').onclick=menuClose;
}
var GRAND_DESC=['Faster attacks, and quicker on your feet','45% more damage with every blow','Monsters hurt you half as much','You mend all the time, even in a fight'];
function grandFairyDo(id){
  var p=G.player, F=WILD.fount;
  if(id==='drink'){ fountainDrink(); grandFairyScreen('You cup your hands and drink. The water tastes like mornings. Lumenne watches, pleased.'); return; }
  var k=+id; if(!(k>=0&&k<4)||F.t>0) return;
  p.buff=k; p.buffT=GRAND.time; p.buffMax=GRAND.time; p.hp=p.maxHp;
  F.t=GRAND.rest; F.n=(F.n||0)+1;
  menuClose();
  var D=fairyDais(), nm=FAIRYNAME[k].split(' — ')[0];
  sfx('fairy'); setTimeout(function(){ sfx('discover'); },250); buzz([12,30,12,30,12]);
  burst(p.x,p.y+1.4,p.z,40,FAIRYCOL[k],{up:3,spread:2.4,size:0.13,life:1.4,grav:-1.2});
  burst(D.x,H(D.x,D.z)+2.6,D.z,30,[1.0,0.95,1.0],{up:2,spread:3,size:0.1,life:1.2,grav:-1});
  msg('Blessing of '+nm[0]+nm.slice(1).toLowerCase()+'!','#ffe9ff',p.x,p.y+2.8,p.z,20);
  tip('The Grand Fairy\'s blessing: '+FAIRYNAME[k].split(' — ')[1]+', for three minutes.');
  saveGame();
}
function fountainUpdate(dt){
  var F=WILD.fount, p=G.player;
  if(F.t>0){ F.t=Math.max(0,F.t-dt); if(F.t===0&&Math.hypot(p.x-FOUNTAIN.x,p.z-FOUNTAIN.z)<60) tip('At the fountain, the Grand Fairy\'s light grows bright again.'); }
  // the glade is safe ground: you and your company mend, and foes break off
  p.atFountain=!WILD.inCave&&!WILD.inHall&&!WILD.inIsle&&fountainSafe(p.x,p.z);
  if(p.atFountain){
    if(p.hp<p.maxHp) p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.10*dt);
    for(var i=0;i<G.ents.length;i++){ var a=G.ents[i]; if(a.kind==='ally'&&a.hp<a.maxHp) a.hp=Math.min(a.maxHp,a.hp+a.maxHp*0.15*dt); }
  }
}

/* ---------- drawn every frame: the jet, and Lumenne herself ---------- */
function drawFountain(){
  var p=G.player; if(WILD.inCave||WILD.inHall||WILD.inIsle) return;
  var X=FOUNTAIN.x, Z=FOUNTAIN.z; if(Math.hypot(p.x-X,p.z-Z)>95) return;
  var y=H(X,Z), t=G.t, wc=[0.78,0.95,1.0];
  // the jet out of the top bowl, and the sheet of water falling off each bowl's lip
  for(var j=0;j<4;j++){ var m=mat(), jh=0.35+0.08*Math.sin(t*9+j*1.7);
    m4trs(m,X,y+4.35+j*0.32,Z,0,t*2+j,0,0.22-j*0.04,jh,0.22-j*0.04); DRAW.push(['blob',m,wc]); }
  // drops spilling over each bowl's lip
  for(var w=0;w<2;w++) if(Math.random()<0.6){ var la=Math.random()*6.283, lr=w?0.62:1.3, ly=w?y+4.35:y+3.05;
    burst(X+Math.cos(la)*lr,ly,Z+Math.sin(la)*lr,1,[0.70,0.92,1.0],{up:0.1,spread:0.1,size:0.07,life:w?0.45:0.6,grav:9}); }
  if(Math.random()<0.5) burst(X+(Math.random()-0.5)*0.4,y+5.2,Z+(Math.random()-0.5)*0.4,1,wc,{up:2.6,spread:1.4,size:0.07,life:0.8,grav:7});
  if(Math.random()<0.12){ var sa=Math.random()*6.283, sr=Math.random()*FOUNTAIN.r;
    burst(X+Math.cos(sa)*sr,y+0.9,Z+Math.sin(sa)*sr,1,[0.85,1.0,1.0],{up:0.8,spread:0.2,size:0.06,life:1.2,grav:-0.6}); }
  grandFairyDraw();
}
function grandFairyDraw(){
  var p=G.player, t=G.t, D=fairyDais(), resting=WILD.fount.t>0;
  var bob=resting?0.05*Math.sin(t*1.2):0.22*Math.sin(t*1.6);
  var bx=D.x, by=H(D.x,D.z)+(resting?0.5:1.5)+bob, bz=D.z;
  var yaw=Math.atan2(p.x-bx,p.z-bz), S=1.65;
  var root=mat(); m4trs(root,bx,by,bz,0,yaw,0,S,S,S);
  var glow=resting?0.7:1, skin=[1.0*glow,0.90*glow,0.86*glow], hair=[0.92,0.86,1.0], gown=[0.80*glow,0.90*glow,1.0*glow],
    gownD=[0.62*glow,0.70*glow,0.98*glow], gold=[1.0,0.86,0.40], wing=resting?[0.70,0.80,0.90]:[0.80,0.96,1.0], wingP=resting?[0.82,0.74,0.86]:[1.0,0.84,0.96];
  function P(k,x,y,z,rx,ry,rz,sx,sy,sz,c){ var lm=mat(), wm=mat(); m4trs(lm,x,y,z,rx,ry,rz,sx,sy,sz); m4mul(wm,root,lm); DRAW.push([k,wm,c]); }
  // the gown: a long bell that flutters, with a paler underskirt
  var fl=Math.sin(t*2.4)*0.04;
  P('cone',0,-0.55,0,fl,0,-fl,1.05,1.55,1.05,gown);
  P('cone',0,-0.62,0,0,0.3,0,0.95,0.5,0.95,gownD);
  P('blob',0,0.95,0,0,0,0,0.42,0.55,0.34,gown);                                    // bodice
  P('blob',0,0.70,0,0,0,0,0.46,0.12,0.38,gold);                                    // a gold sash
  // arms: one at her side, one raised with her wand (still while she rests)
  var wave=resting?0:Math.sin(t*2.2)*0.25;
  P('limb',-0.26,1.15,0,0.2,0,0.35,0.13,0.62,0.13,skin);
  P('limb',0.26,1.15,0.05,resting?0.2:-2.4+wave,0,-0.3,0.13,0.62,0.13,skin);
  if(!resting){                                     // the wand, held up, and the star on its tip
    var hy=1.15+0.62*0.74, hz=0.05+0.62*0.67, sy=hy+0.55+wave*0.2;
    P('box',0.36,hy+0.27,hz,0,0,0,0.04,0.55,0.04,[0.95,0.92,0.82]);
    P('blob',0.36,sy,hz,0,t*3,0,0.2,0.2,0.2,[1.0,0.98,0.80]);
    if(Math.random()<0.25){ var sm=mat(), gm=mat(); m4trs(sm,0.36,sy,hz,0,0,0,1,1,1); m4mul(gm,root,sm);
      burst(gm[12],gm[13],gm[14],1,FAIRYCOL[(Math.random()*4)|0],{up:0.6,spread:0.6,size:0.08,life:1.1,grav:-0.5}); } }
  // head, hair falling down her back, a little crown
  var nod=resting?0.35:0;
  P('blob',0,1.55-nod*0.1,0.03,nod,0,0,0.42,0.46,0.42,skin);
  P('blob',0,1.63-nod*0.1,-0.12,nod,0,0,0.47,0.44,0.40,hair);
  P('cone',0,0.55,-0.16,-0.08,0,0,0.5,1.15,0.32,hair);
  for(var c=0;c<5;c++){ var ca=(c-2)*0.36; P('cone',Math.sin(ca)*0.21,1.80-nod*0.1,Math.cos(ca)*0.21-0.04,0,0,0,0.07,c===2?0.24:0.15,0.07,gold); }
  if(resting){ P('box',-0.09,1.56,0.23,0,0,0,0.08,0.015,0.02,[0.3,0.25,0.35]); P('box',0.09,1.56,0.23,0,0,0,0.08,0.015,0.02,[0.3,0.25,0.35]); }
  else { P('box',-0.09,1.57,0.22,0,0,0,0.06,0.07,0.02,[0.36,0.30,0.62]); P('box',0.09,1.57,0.22,0,0,0,0.06,0.07,0.02,[0.36,0.30,0.62]);
    P('box',0,1.43,0.22,0,0,0,0.08,0.02,0.02,[0.85,0.45,0.55]); }
  // four great wings, beating slowly (folded flat while she rests)
  var beat=resting?0.15:0.45+Math.sin(t*3.2)*0.35;
  for(var s=-1;s<=1;s+=2){
    P('blob',s*0.62,1.50,-0.30,0,s*beat,s*-0.55,1.05,0.62,0.05,wing);
    P('blob',s*0.48,0.85,-0.28,0,s*beat*0.8,s*0.55,0.70,0.42,0.05,wingP); }
  // a ring of motes in the four fairy colours, slowly circling her
  if(!resting) for(var o=0;o<6;o++){ var oa=t*0.8+o/6*6.283;
    P('blob',Math.cos(oa)*1.25,0.9+Math.sin(t*1.3+o)*0.4,Math.sin(oa)*1.25,0,0,0,0.12,0.12,0.12,FAIRYCOL[o%4]); }
  if(Math.random()<(resting?0.04:0.3)) burst(bx+(Math.random()-0.5)*2,by+Math.random()*2.6,bz+(Math.random()-0.5)*2,1,[1.0,0.92,1.0],{up:0.5,spread:0.3,size:0.07,life:1.4,grav:-0.4});
}
