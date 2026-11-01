/* Build a House — game logic.
   Needs three.js r128 + OrbitControls loaded first (see index.html). */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const HALF=16, MAXY=24, DOOR_OPEN=-Math.PI*0.48;
const fineMQ=matchMedia('(hover:hover) and (pointer:fine)');
const wideMQ=matchMedia('(min-width:900px)');
const isLaptop=()=>fineMQ.matches;

/* ---------- pixel textures (drawn in code, 16x16) ---------- */
let seed=11; const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
function T(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);return c;}
function fill(g,w,h,c){g.fillStyle=c;g.fillRect(0,0,w,h);}
function speck(g,w,h,cols,p){for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(rnd()<p){g.fillStyle=cols[(rnd()*cols.length)|0];g.fillRect(x,y,1,1);}}
const C={};
C.dirt=T(16,16,(g,w,h)=>{fill(g,w,h,'#7a5232');speck(g,w,h,['#6a4528','#8b6040','#5c3b22','#946a46'],.55);});
C.grassTop=T(16,16,(g,w,h)=>{fill(g,w,h,'#5aa83a');speck(g,w,h,['#4e9632','#6bbd46','#3f8a2a','#74c450'],.55);});
C.grassSide=T(16,16,(g,w,h)=>{g.drawImage(C.dirt,0,0);for(let x=0;x<w;x++){const d=3+(rnd()<.45?1:0)+(rnd()<.2?1:0);for(let y=0;y<d;y++){g.fillStyle=['#5aa83a','#4e9632','#6bbd46'][(rnd()*3)|0];g.fillRect(x,y,1,1);}}});
C.stone=T(16,16,(g,w,h)=>{fill(g,w,h,'#8b8e92');speck(g,w,h,['#7b7e82','#9a9da1','#6e7175','#a4a7ab'],.6);g.fillStyle='#62656a';[[3,4],[4,4],[5,5],[11,10],[12,10],[12,11],[7,13]].forEach(p=>g.fillRect(p[0],p[1],1,1));});
C.sand=T(16,16,(g,w,h)=>{fill(g,w,h,'#e2cd92');speck(g,w,h,['#d8c287','#ecd9a2','#cdb57a'],.5);});
C.clay=T(16,16,(g,w,h)=>{fill(g,w,h,'#9fa3b3');speck(g,w,h,['#9296a7','#acb0bf','#8a8e9f'],.45);});
C.log=T(16,16,(g,w,h)=>{for(let x=0;x<w;x++){const c=['#5e3f22','#6f4b2a','#7a5531','#664526'][(rnd()*4)|0];g.fillStyle=c;g.fillRect(x,0,1,h);}speck(g,w,h,['#4e331b','#83603a'],.18);});
C.logTop=T(16,16,(g)=>{fill(g,16,16,'#6f4b2a');[['#b98a52',1],['#a87a45',3],['#c49a62',5],['#9c6f3e',7]].forEach(([c,i])=>{g.fillStyle=c;g.fillRect(i,i,16-2*i,16-2*i);});});
C.leaves=T(16,16,(g,w,h)=>{fill(g,w,h,'#3b7d2f');speck(g,w,h,['#2f6a26','#4c9a3c','#5aab47','#275a20'],.7);});
C.planks=T(16,16,(g,w,h)=>{fill(g,w,h,'#c08b4a');speck(g,w,h,['#b27f42','#cc9856','#b9864a'],.35);g.fillStyle='#8a5f2c';for(let r=0;r<4;r++){g.fillRect(0,r*4+3,w,1);g.fillRect(r%2?4:12,r*4,1,3);}});
C.glass=T(16,16,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='rgba(190,230,255,0.28)';g.fillRect(0,0,w,h);g.fillStyle='#e9f8ff';g.fillRect(0,0,w,1);g.fillRect(0,h-1,w,1);g.fillRect(0,0,1,h);g.fillRect(w-1,0,1,h);g.fillStyle='rgba(255,255,255,.85)';[[3,4],[4,3],[4,5],[5,4],[5,6],[6,5],[10,3],[11,4]].forEach(p=>g.fillRect(p[0],p[1],1,1));});
C.brick=T(16,16,(g,w,h)=>{fill(g,w,h,'#cdc3b2');for(let r=0;r<4;r++){const off=r%2?4:0;for(let bx=-8;bx<w;bx+=8){g.fillStyle=['#a8442e','#b24f36','#9a3b28'][(rnd()*3)|0];g.fillRect(bx+off,r*4,7,3);}}for(let i=0;i<20;i++){const x=(rnd()*16)|0,y=(rnd()*16)|0;if(y%4!==3){g.fillStyle='rgba(60,15,5,.25)';g.fillRect(x,y,1,1);}}});
C.concrete=T(16,16,(g,w,h)=>{fill(g,w,h,'#bcbdb8');speck(g,w,h,['#b0b1ac','#c7c8c3'],.3);g.fillStyle='#8f908b';[[2,3],[9,6],[13,12],[5,11]].forEach(p=>g.fillRect(p[0],p[1],1,1));});
C.roof=T(16,16,(g,w,h)=>{fill(g,w,h,'#7d2f16');for(let r=0;r<4;r++){const off=r%2?2:0;for(let x=-4;x<w;x+=4){g.fillStyle='#c05a2b';g.fillRect(x+off,r*4,3,3);g.fillStyle='#d97a45';g.fillRect(x+off,r*4,3,1);}}});
C.marble=T(16,16,(g,w,h)=>{fill(g,w,h,'#eeece6');speck(g,w,h,['#e4e2dc','#f6f5f1'],.4);for(let v=0;v<2;v++){let x=(rnd()*16)|0;for(let y=0;y<h;y++){g.fillStyle=v?'#b8b6b0':'#9d9b95';g.fillRect(x,y,1,1);x=(x+(rnd()<.5?-1:1)+16)%16;}}});
C.bookshelf=T(16,16,(g)=>{g.drawImage(C.planks,0,0);const cols=['#a83232','#2f5fa8','#2f8a4a','#c9a227','#6b3fa0','#2a2a2e','#d0662a'];[1,9].forEach(y0=>{g.fillStyle='#4b3018';g.fillRect(1,y0,14,6);let x=1;while(x<15){const bw=1+((rnd()*2)|0),bh=4+((rnd()*3)|0);g.fillStyle=cols[(rnd()*cols.length)|0];g.fillRect(x,y0+6-bh,Math.min(bw,15-x),bh);x+=bw;}});});
C.window=T(16,16,(g,w,h)=>{g.drawImage(C.glass,0,0);g.fillStyle='#a0703a';g.fillRect(0,0,w,2);g.fillRect(0,h-2,w,2);g.fillRect(0,0,2,h);g.fillRect(w-2,0,2,h);g.fillRect(7,0,2,h);g.fillRect(0,7,w,2);});
C.door=T(16,32,(g,w,h)=>{fill(g,w,h,'#9a6533');speck(g,w,h,['#8d5b2c','#a66f3a'],.25);g.fillStyle='#6e4520';g.fillRect(0,0,w,1);g.fillRect(0,0,1,h);g.fillRect(w-1,0,1,h);[[3,3],[3,17]].forEach(([x,y])=>{g.fillStyle='#6e4520';g.fillRect(x,y,10,12);g.fillStyle='#b07a42';g.fillRect(x+1,y+1,8,10);});g.fillStyle='#f2c14e';g.fillRect(12,16,2,2);});

/* ---------- materials & recipes ---------- */
const MATS={
  grass:{name:'Grass',sw:C.grassSide},dirt:{name:'Dirt',sw:C.dirt},stone:{name:'Stone',sw:C.stone},sand:{name:'Sand',sw:C.sand},
  clay:{name:'Clay',sw:C.clay},log:{name:'Oak Log',sw:C.log},leaves:{name:'Leaves',sw:C.leaves},planks:{name:'Planks',sw:C.planks},
  door:{name:'Door',sw:C.door},glass:{name:'Glass',sw:null},brick:{name:'Brick',sw:C.brick},concrete:{name:'Concrete',sw:C.concrete},
  roof:{name:'Roof Tile',sw:C.roof},marble:{name:'Marble',sw:C.marble},window:{name:'Window',sw:C.window},bookshelf:{name:'Bookshelf',sw:C.bookshelf}
};
MATS.glass.sw=T(16,16,(g)=>{fill(g,16,16,'#dff3ff');g.drawImage(C.glass,0,0);});
const ORDER=Object.keys(MATS);
for(const k of ORDER) MATS[k].img=MATS[k].sw.toDataURL();
const START=['grass','dirt','stone','sand','clay','log','leaves','planks','door'];
const RECIPES=[
  {out:'planks',a:'log',b:'log',how:'Saw the log into boards'},
  {out:'door',a:'planks',b:'planks',how:'Hinge boards together'},
  {out:'glass',a:'sand',b:'sand',how:'Melt sand in a hot furnace'},
  {out:'brick',a:'clay',b:'clay',how:'Bake clay in a kiln'},
  {out:'concrete',a:'stone',b:'sand',how:'Mix gravel, sand and water'},
  {out:'roof',a:'clay',b:'stone',how:'Shape clay into tiles'},
  {out:'marble',a:'stone',b:'stone',how:'Cut and polish the stone'},
  {out:'window',a:'glass',b:'planks',how:'Frame the glass with wood'},
  {out:'bookshelf',a:'planks',b:'leaves',how:'Paper is made from plants'}
];
const rk=(a,b)=>[a,b].sort().join('+');
const recipeFor=(a,b)=>a&&b?RECIPES.find(r=>rk(r.a,r.b)===rk(a,b)):null;

/* ---------- three.js scene ---------- */
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x8fc6ef);
scene.fog=new THREE.Fog(0x8fc6ef,45,95);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('#game').appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(50,1,0.1,250);
camera.position.set(13,12,17);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.target.set(0,1,0);controls.enableDamping=true;controls.dampingFactor=.12;
controls.maxPolarAngle=Math.PI/2-0.06;controls.minDistance=4;controls.maxDistance=60;
controls.zoomSpeed=1.2;controls.screenSpacePanning=false;
controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};

scene.add(new THREE.HemisphereLight(0xe4f3ff,0x5d7a3a,0.72));
const sun=new THREE.DirectionalLight(0xfff1d6,0.85);
sun.position.set(14,26,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:70});sun.shadow.bias=-0.0006;
scene.add(sun);scene.add(new THREE.AmbientLight(0xffffff,0.18));

function tex(c,rx=1,ry=1){const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;if(rx!==1||ry!==1){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);}return t;}
const lam=(c,o={})=>new THREE.MeshLambertMaterial(Object.assign({map:tex(c)},o));
const matCache={};
function blockMat(type){
  if(matCache[type]) return matCache[type];
  let m;
  if(type==='grass'){const s=lam(C.grassSide);m=[s,s,lam(C.grassTop),lam(C.dirt),s,s];}
  else if(type==='log'){const s=lam(C.log),t=lam(C.logTop);m=[s,s,t,t,s,s];}
  else if(type==='glass'||type==='window'){m=lam(C[type],{transparent:true,side:THREE.DoubleSide});}
  else m=lam(C[type]);
  return matCache[type]=m;
}
const boxGeo=new THREE.BoxGeometry(1,1,1);
const doorGeo=new THREE.BoxGeometry(1,2,0.14);doorGeo.translate(0.5,1,0);
const doorSide=lam(C.planks),doorFace=lam(C.door);
const doorMats=[doorSide,doorSide,doorSide,doorSide,doorFace,doorFace];

// the island everything sits on
const S=HALF*2;
const islandSide=new THREE.MeshLambertMaterial({map:tex(C.grassSide,S,2)});
const island=new THREE.Mesh(new THREE.BoxGeometry(S,2,S),[islandSide,islandSide,new THREE.MeshLambertMaterial({map:tex(C.grassTop,S,S)}),new THREE.MeshLambertMaterial({map:tex(C.dirt,S,S)}),islandSide,islandSide]);
island.position.y=-1;island.receiveShadow=true;scene.add(island);
const grid=new THREE.GridHelper(S,S,0x2d5a1e,0x2d5a1e);grid.material.transparent=true;grid.material.opacity=.16;grid.position.y=.005;scene.add(grid);

const blockGroup=new THREE.Group();scene.add(blockGroup);
const charRoot=new THREE.Group();charRoot.userData.isChar=true;scene.add(charRoot);

// outline that follows the mouse
const ghost=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02,1.02,1.02)),new THREE.LineBasicMaterial({color:0xffffff}));
ghost.visible=false;scene.add(ghost);

/* ---------- world state ---------- */
const occ=new Map(), blocks=new Map(); let nextId=1;
const K=(x,y,z)=>x+','+y+','+z;
const inBounds=(x,y,z)=>x>=-HALF&&x<HALF&&z>=-HALF&&z<HALF&&y>=0&&y<MAXY;
const anims=[];
function placeBlock(type,x,y,z,o={}){
  const cells=[[x,y,z]];if(type==='door')cells.push([x,y+1,z]);
  for(const c of cells) if(!inBounds(...c)||occ.has(K(...c))) return null;
  const id=nextId++;let obj,hinge=null;
  if(type==='door'){
    obj=new THREE.Group();obj.position.set(x+.5,y,z+.5);obj.rotation.y=o.rot||0;
    hinge=new THREE.Group();hinge.position.set(-.5,0,0);obj.add(hinge);
    const m=new THREE.Mesh(doorGeo,doorMats);m.castShadow=m.receiveShadow=true;m.userData.blockId=id;hinge.add(m);
    if(o.open) hinge.rotation.y=DOOR_OPEN;
  }else{
    obj=new THREE.Mesh(boxGeo,blockMat(type));obj.position.set(x+.5,y+.5,z+.5);
    obj.castShadow=!(type==='glass'||type==='window');obj.receiveShadow=true;obj.userData.blockId=id;
  }
  blockGroup.add(obj);
  const b={id,type,x,y,z,obj,hinge,cells,rot:o.rot||0,open:!!o.open};
  blocks.set(id,b);cells.forEach(c=>occ.set(K(...c),id));
  if(o.anim){obj.scale.setScalar(.4);anims.push({obj,t:0,dur:.18,kind:'pop'});}
  return b;
}
function removeBlock(id){
  const b=blocks.get(id);if(!b)return;
  b.cells.forEach(c=>occ.delete(K(...c)));blocks.delete(id);
  anims.push({obj:b.obj,t:0,dur:.12,kind:'shrink'});
}
function toggleDoor(id){const b=blocks.get(id);b.open=!b.open;blip(b.open?330:260,.12,'triangle',.07);save();}

/* ---------- character ---------- */
const SKIN=['#f5d0b5','#e8b48f','#c68863','#a46a43','#7a4a2c','#4e2f1d'];
const HAIR=['#2b1d14','#5a3a22','#c9a05a','#a9442a','#d9d4cc','#141414'];
const COLORS=['#e0412f','#f08a24','#f5c518','#2fa35a','#2f6fde','#7b4fd6','#f2f2f2','#2a2a2e','#e85d9b','#20b2aa'];
const BOTTOMS=['#2c3e66','#4a6fa5','#1f1f22','#8a7a5c','#5b6b3a','#c9c2b0','#9a2f2f'];
const SHOES=['#f2f2f2','#1f1f22','#e0412f','#2f6fde','#f5c518','#7a4a2c'];
let charCfg={skin:'#c68863',hair:'#5a3a22',top:'tshirt',topColor:'#2f6fde',bottom:'jeans',bottomColor:'#2c3e66',shoes:'#f2f2f2',hat:'cap',hatColor:'#e0412f',glasses:'none',extras:{backpack:false,headphones:false,watch:true,scarf:false,chain:false}};
let charPos={x:-1,y:0,z:3,rot:0};
let P={};
const cmat={};const cm=c=>cmat[c]||(cmat[c]=new THREE.MeshLambertMaterial({color:c}));
function shade(hex,f){const c=new THREE.Color(hex);c.r=Math.min(1,c.r*f);c.g=Math.min(1,c.g*f);c.b=Math.min(1,c.b*f);return '#'+c.getHexString();}
function bx(w,h,d,color,x,y,z,parent){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),cm(color));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function buildChar(){
  charRoot.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  while(charRoot.children.length) charRoot.remove(charRoot.children[0]);
  const c=charCfg,E=c.extras,g=new THREE.Group();charRoot.add(g);P={body:g};
  const skin=c.skin,top=c.topColor,pants=c.bottomColor;
  for(const s of [-1,1]){
    const leg=new THREE.Group();leg.position.set(s*.15,.8,0);g.add(leg);
    bx(.26,.14,.34,c.shoes,0,-.73,.03,leg);
    bx(.27,.04,.35,c.shoes==='#f2f2f2'?'#a9a9a9':'#efefef',0,-.78,.03,leg);
    bx(.24,.33,.24,c.bottom==='shorts'?skin:pants,0,-.5,0,leg);
    bx(.24,.34,.24,pants,0,-.17,0,leg);
    if(c.bottom==='sweats') bx(.25,.06,.25,shade(pants,1.3),0,-.63,0,leg);
    P[s<0?'legL':'legR']=leg;
  }
  bx(.6,.72,.32,top,0,1.16,0,g);
  if(c.bottom!=='sweats') bx(.61,.06,.33,'#3a2a1e',0,.83,0,g);
  if(c.top==='hoodie'){bx(.36,.16,.02,shade(top,.82),0,.97,.165,g);bx(.02,.14,.02,'#f2f2f2',-.07,1.4,.165,g);bx(.02,.14,.02,'#f2f2f2',.07,1.4,.165,g);}
  if(c.top==='jacket'){bx(.14,.66,.02,'#f2f2f2',0,1.17,.162,g);bx(.62,.07,.34,shade(top,.8),0,1.49,0,g);}
  for(const s of [-1,1]){
    const arm=new THREE.Group();arm.position.set(s*.41,1.48,0);g.add(arm);
    const sleeve=c.top==='tank'?skin:top;
    bx(.2,.34,.22,sleeve,0,-.17,0,arm);
    bx(.2,.3,.22,(c.top==='tshirt'||c.top==='tank')?skin:top,0,-.49,0,arm);
    bx(.18,.12,.2,skin,0,-.69,0,arm);
    if(s<0&&E.watch){bx(.22,.07,.24,'#1f1f22',0,-.58,0,arm);bx(.06,.05,.03,'#f2c14e',0,-.58,.12,arm);}
    P[s<0?'armL':'armR']=arm;
  }
  if(E.backpack){bx(.46,.52,.2,'#2e7d4f',0,1.16,-.26,g);bx(.3,.18,.04,'#256640',0,1.0,-.38,g);bx(.07,.62,.02,'#1f5236',-.17,1.18,.163,g);bx(.07,.62,.02,'#1f5236',.17,1.18,.163,g);}
  if(E.scarf){bx(.5,.1,.36,'#c0392b',0,1.53,0,g);bx(.12,.3,.05,'#c0392b',.12,1.36,.19,g);bx(.12,.04,.06,'#f2c14e',.12,1.3,.19,g);}
  if(E.chain){bx(.26,.03,.02,'#f2c14e',0,1.43,.165,g);bx(.07,.07,.02,'#f2c14e',0,1.37,.168,g);}
  const head=new THREE.Group();head.position.set(0,1.52,0);g.add(head);P.head=head;
  bx(.46,.46,.46,skin,0,.24,0,head);
  if(c.top==='hoodie') bx(.44,.3,.12,top,0,.15,-.27,head);
  bx(.48,.1,.48,c.hair,0,.5,0,head);bx(.48,.32,.1,c.hair,0,.33,-.2,head);bx(.08,.18,.48,c.hair,-.22,.38,0,head);bx(.08,.18,.48,c.hair,.22,.38,0,head);
  bx(.07,.07,.02,'#1b1b1b',-.1,.28,.235,head);bx(.07,.07,.02,'#1b1b1b',.1,.28,.235,head);
  bx(.16,.03,.02,'#6b3a2e',0,.13,.235,head);
  if(c.glasses==='sun'){bx(.42,.1,.03,'#111111',0,.29,.245,head);bx(.02,.04,.44,'#111111',-.235,.3,.02,head);bx(.02,.04,.44,'#111111',.235,.3,.02,head);}
  if(c.glasses==='reading'){bx(.14,.11,.02,'#cfe8ff',-.11,.28,.245,head);bx(.14,.11,.02,'#cfe8ff',.11,.28,.245,head);bx(.36,.02,.03,'#2a2a2e',0,.34,.25,head);bx(.02,.04,.44,'#2a2a2e',-.235,.31,.02,head);bx(.02,.04,.44,'#2a2a2e',.235,.31,.02,head);}
  const hc=c.hatColor;
  if(c.hat==='cap'){bx(.5,.16,.5,hc,0,.55,0,head);bx(.46,.04,.26,shade(hc,.8),0,.49,.34,head);bx(.06,.04,.06,'#f2f2f2',0,.645,0,head);}
  if(c.hat==='beanie'){bx(.5,.22,.5,hc,0,.57,0,head);bx(.52,.08,.52,shade(hc,.8),0,.47,0,head);bx(.13,.13,.13,'#f2f2f2',0,.74,0,head);}
  if(c.hat==='cowboy'){bx(.84,.04,.84,'#8b5a2b',0,.5,0,head);bx(.46,.24,.46,'#8b5a2b',0,.64,0,head);bx(.47,.05,.47,'#3a2414',0,.55,0,head);}
  if(c.hat==='hard'){bx(.52,.18,.54,'#f5c518',0,.57,0,head);bx(.62,.04,.64,'#e0b210',0,.48,.02,head);bx(.08,.06,.54,'#e0b210',0,.68,0,head);}
  if(E.headphones){bx(.56,.05,.1,'#1f1f22',0,c.hat==='none'?.57:(c.hat==='cowboy'?.53:.62),0,head);bx(.07,.18,.18,'#1f1f22',-.27,.27,0,head);bx(.07,.18,.18,'#1f1f22',.27,.27,0,head);bx(.02,.1,.1,'#e0412f',-.31,.27,0,head);bx(.02,.1,.1,'#e0412f',.31,.27,0,head);}
  placeChar();
}
function placeChar(){
  for(const [k,v] of [...occ]) if(v==='char') occ.delete(k);
  occ.set(K(charPos.x,charPos.y,charPos.z),'char');occ.set(K(charPos.x,charPos.y+1,charPos.z),'char');
  charRoot.position.set(charPos.x+.5,charPos.y,charPos.z+.5);charRoot.rotation.y=charPos.rot;
}
function moveChar(x,y,z){
  for(const c of [[x,y,z],[x,y+1,z]]){if(!inBounds(...c))return false;const o=occ.get(K(...c));if(o!==undefined&&o!=='char')return false;}
  charPos={x,y,z,rot:snapAz()};placeChar();save();return true;
}
const snapAz=()=>Math.round(controls.getAzimuthalAngle()/(Math.PI/2))*(Math.PI/2);

/* ---------- saving (this browser only) ---------- */
const KEY='buildahouse.v1', OLD_KEY='blockbuilder.v1';let saveT;
let unlocked=new Set(START), selected='planks', mode='build', movingChar=false;
function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify({b:[...blocks.values()].map(b=>[b.type,b.x,b.y,b.z,+b.rot.toFixed(4),b.open?1:0]),c:charCfg,p:charPos,u:[...unlocked],s:selected}));}catch(e){}},300);}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY)||'null');}catch(e){return null;}}
function store(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function recall(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function starter(){
  const tx=-7,tz=-5;
  for(let y=0;y<4;y++)placeBlock('log',tx,y,tz);
  for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)for(let y=3;y<=4;y++){if(Math.abs(x)===2&&Math.abs(z)===2)continue;placeBlock('leaves',tx+x,y,tz+z);}
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)placeBlock('leaves',tx+x,5,tz+z);
  for(let x=1;x<=5;x++)for(let z=-3;z<=0;z++){
    const edge=x===1||x===5||z===-3||z===0;if(!edge)continue;
    const corner=(x===1||x===5)&&(z===-3||z===0);
    for(let y=0;y<2;y++){
      if(z===0&&x===3)continue;
      const win=y===1&&!corner&&(x===2||x===4)&&z===0;
      placeBlock(corner?'log':(win?'glass':'planks'),x,y,z);
    }
  }
  placeBlock('door',3,0,0,{rot:0});
  for(let x=1;x<=5;x++)for(let z=-3;z<=0;z++)placeBlock('planks',x,2,z);
  [[7,0,2],[8,0,2],[7,0,3]].forEach(c=>placeBlock('sand',...c));
}

/* ---------- clicking & tapping ---------- */
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function pick(cx,cy){
  const r=renderer.domElement.getBoundingClientRect();
  ndc.set(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1);
  ray.setFromCamera(ndc,camera);
  const hits=ray.intersectObjects([island,blockGroup,charRoot],true);
  for(const h of hits){const id=hitId(h);if(typeof id==='number'&&!blocks.has(id))continue;return h;}
  return null;
}
function hitId(h){let o=h.object;while(o){if(o.userData.blockId!=null)return o.userData.blockId;if(o.userData.isChar)return 'char';o=o.parent;}return null;}
function cellFor(h,id){
  if(typeof id==='number'){const b=blocks.get(id);if(b.type==='door')return null;const n=h.face.normal;return [b.x+Math.round(n.x),b.y+Math.round(n.y),b.z+Math.round(n.z)];}
  if(id===null){if(h.face.normal.y<.5)return null;return [Math.floor(h.point.x),0,Math.floor(h.point.z)];}
  return null;
}
function tap(cx,cy,forceBreak){
  const h=pick(cx,cy);if(!h)return;
  const id=hitId(h);
  if(movingChar){const c=cellFor(h,id);if(c&&moveChar(...c)){movingChar=false;blip(520,.1,'triangle');toast('Moved!');updateHint();}else toast("You can't stand there. Try another spot.");return;}
  if(forceBreak||mode==='break'){if(typeof id==='number'){removeBlock(id);blip(140,.1,'sawtooth',.05);save();}return;}
  if(id==='char'){openSheet('char');return;}
  if(typeof id==='number'&&blocks.get(id).type==='door'){toggleDoor(id);return;}
  const c=cellFor(h,id);if(!c)return;
  const b=placeBlock(selected,...c,{anim:true,rot:selected==='door'?snapAz():0});
  if(b){blip(selected==='glass'||selected==='window'?660:240,.08,'square',.045);save();}
  else toast(selected==='door'?'A door needs 2 empty spaces stacked up.':'That spot is taken.');
}
let down=null;
const cv=renderer.domElement;
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:performance.now(),n:(down&&down.n||0)+1,btn:e.button};});
cv.addEventListener('pointerup',e=>{
  if(!down)return;
  const d=Math.hypot(e.clientX-down.x,e.clientY-down.y);
  if(d<8&&performance.now()-down.t<600&&down.n===1&&down.btn!==1) tap(e.clientX,e.clientY,down.btn===2||e.shiftKey);
  down=null;
});
cv.addEventListener('pointercancel',()=>{down=null;});
let lastMouse=null;
function updateGhost(){
  if(!lastMouse){ghost.visible=false;return;}
  const e=lastMouse;
  const h=pick(e.x,e.y);if(!h){ghost.visible=false;return;}
  const id=hitId(h);
  const breaking=(mode==='break'||e.shift)&&!movingChar;
  if(breaking||(typeof id==='number'&&blocks.get(id).type==='door'&&!movingChar)){
    if(typeof id==='number'){const b=blocks.get(id);const tall=b.type==='door';ghost.scale.set(1,tall?2:1,1);ghost.position.set(b.x+.5,b.y+(tall?1:.5),b.z+.5);ghost.material.color.set(breaking?0xff6b5b:0xffb627);ghost.visible=true;}
    else ghost.visible=false;
    return;
  }
  if(id==='char'&&!movingChar){ghost.visible=false;return;}
  const c=cellFor(h,id);if(!c||!inBounds(...c)){ghost.visible=false;return;}
  const tall=selected==='door'||movingChar;ghost.scale.set(1,tall?2:1,1);ghost.position.set(c[0]+.5,c[1]+(tall?1:.5),c[2]+.5);ghost.material.color.set(0xffffff);ghost.visible=true;
}
cv.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'||e.buttons){lastMouse=null;ghost.visible=false;return;}
  lastMouse={x:e.clientX,y:e.clientY,shift:e.shiftKey};updateGhost();
});
cv.addEventListener('pointerleave',()=>{lastMouse=null;ghost.visible=false;});

/* ---------- sound + toast ---------- */
let actx=null;
function blip(f=220,dur=.08,type='square',vol=.05){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.55,t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(actx.destination);o.start(t);o.stop(t+dur+.02);}catch(e){}}
let toastT;function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),2400);}

/* ---------- hotbar & mode ---------- */
const available=()=>ORDER.filter(k=>unlocked.has(k));
function selectBlock(k){selected=k;setMode('build');renderHotbar();save();}
function renderHotbar(){
  const hb=$('#hotbar');hb.innerHTML='';
  available().forEach((k,i)=>{
    const b=document.createElement('button');b.type='button';b.className='hb';b.setAttribute('role','option');
    b.setAttribute('aria-selected',String(k===selected));b.setAttribute('aria-label',MATS[k].name);
    const num=i<10?String((i+1)%10):'';
    b.title=MATS[k].name+(num&&isLaptop()?'  ('+num+')':'');
    b.innerHTML=`<img class="px" alt="" src="${MATS[k].img}">`+(num&&isLaptop()?`<span class="num">${num}</span>`:'');
    b.onclick=()=>selectBlock(k);
    hb.appendChild(b);
  });
  const sel=hb.querySelector('[aria-selected="true"]');if(sel)sel.scrollIntoView({inline:'nearest',block:'nearest'});
  updateHint();
}
function setMode(m){mode=m;movingChar=false;$('#mBuild').setAttribute('aria-pressed',String(m==='build'));$('#mBreak').setAttribute('aria-pressed',String(m==='break'));updateHint();updateGhost();}
function updateHint(){
  const L=isLaptop();
  $('#hint').textContent=movingChar?(L?'Click a spot to stand there · Esc to cancel':'Tap a spot to stand there')
    :mode==='break'?(L?'Click a block to remove it':'Tap a block to remove it')
    :(L?`Placing ${MATS[selected].name} · click to place, right-click to break`:`Placing ${MATS[selected].name} · tap a spot`);
}
$('#mBuild').onclick=()=>setMode('build');
$('#mBreak').onclick=()=>setMode('break');

/* ---------- panels ---------- */
let openName=null,offsetPx=0;
function applyOffset(px){
  offsetPx=px||0;const w=innerWidth,h=innerHeight;
  if(!offsetPx)camera.clearViewOffset();
  else if(wideMQ.matches)camera.setViewOffset(w,h,offsetPx/2,0,w,h);
  else camera.setViewOffset(w,h,0,offsetPx/2,w,h);
}
function sheetSize(el){return wideMQ.matches?el.offsetWidth:el.offsetHeight;}
function openSheet(which){
  closeSheets();
  const el=which==='craft'?$('#sheetCraft'):$('#sheetChar');
  if(which==='craft')renderCraft();else{renderCharOpts();focusChar();}
  el.hidden=false;$('#dock').hidden=true;openName=which;ghost.visible=false;
  if(which==='char')requestAnimationFrame(()=>applyOffset(sheetSize(el)));
}
function closeSheets(){$('#sheetCraft').hidden=true;$('#sheetChar').hidden=true;$('#dock').hidden=false;openName=null;applyOffset(0);}
function toggleSheet(which){if(openName===which)closeSheets();else openSheet(which);}
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeSheets());
$('#btnCraft').onclick=()=>toggleSheet('craft');
$('#btnChar').onclick=()=>toggleSheet('char');
function startMove(){closeSheets();setMode('build');movingChar=true;updateHint();toast(isLaptop()?'Click the ground or a block top to stand there.':'Tap the ground or a block top to stand there.');}
$('#btnMove').onclick=startMove;

function setHelp(show){$('#help').hidden=!show;$('#btnHelp').setAttribute('aria-expanded',String(show));if(!show)store('buildahouse.helpSeen','1');}
$('#btnHelp').onclick=()=>setHelp($('#help').hidden);
$('#helpClose').onclick=()=>setHelp(false);

let camTween=null;
function focusChar(){
  const t=charRoot.position.clone().add(new THREE.Vector3(0,1.1,0));
  const r=charPos.rot;
  const p=t.clone().add(new THREE.Vector3(Math.sin(r)*4.6,1.1,Math.cos(r)*4.6));
  camTween={t:0,ft:controls.target.clone(),tt:t,fp:camera.position.clone(),tp:p};
}

/* ---------- crafting ---------- */
let slots=[null,null];
function img(k,cls='px'){return `<img class="${cls}" alt="" src="${MATS[k].img}">`;}
function renderCraft(){
  ['#slotA','#slotB'].forEach((s,i)=>{const el=$(s);const k=slots[i];el.classList.toggle('filled',!!k);el.innerHTML=k?img(k):'+';el.setAttribute('aria-label',k?MATS[k].name+', tap to clear':'Empty slot');});
  const r=recipeFor(slots[0],slots[1]);
  $('#slotR').innerHTML=r?img(r.out):'?';
  $('#btnMake').disabled=!r;
  $('#btnMake').textContent=r?`Craft ${MATS[r.out].name}`:'Craft it';
  $('#craftNote').textContent=r?r.how+'.':(slots[0]&&slots[1]?"Those don't make anything. Try another mix.":'Pick two materials to mix.');
  const mats=$('#mats');mats.innerHTML='';
  available().forEach(k=>{const b=document.createElement('button');b.type='button';b.className='mat';b.innerHTML=img(k)+`<span>${MATS[k].name}</span>`;
    b.onclick=()=>{if(!slots[0])slots[0]=k;else if(!slots[1])slots[1]=k;else slots=[slots[1],k];blip(400,.05,'triangle',.04);renderCraft();};mats.appendChild(b);});
  const book=$('#book');book.innerHTML='';
  RECIPES.forEach(r=>{const done=unlocked.has(r.out);const b=document.createElement('button');b.type='button';b.className='rec';
    b.innerHTML=`${img(r.out)}<span><b>${MATS[r.out].name}</b><small>${MATS[r.a].name} + ${MATS[r.b].name}</small></span><span class="tag ${done?'done':''}">${done?'Made':'New'}</span>`;
    b.onclick=()=>{slots=[r.a,r.b];renderCraft();$('#sheetCraft').scrollTo({top:0,behavior:'smooth'});};book.appendChild(b);});
}
$('#slotA').onclick=()=>{slots[0]=null;renderCraft();};
$('#slotB').onclick=()=>{slots[1]=null;renderCraft();};
$('#btnMake').onclick=()=>{
  const r=recipeFor(slots[0],slots[1]);if(!r)return;
  const fresh=!unlocked.has(r.out);unlocked.add(r.out);selected=r.out;
  [523,659,784].forEach((f,i)=>setTimeout(()=>blip(f,.12,'triangle',.06),i*90));
  toast(fresh?`You made ${MATS[r.out].name}! It's in your blocks.`:`${MATS[r.out].name} is ready in your blocks.`);
  slots=[null,null];setMode('build');renderHotbar();renderCraft();save();
};

/* ---------- character options ---------- */
const CHAR_UI=[
  {label:'Skin',dots:SKIN,key:'skin'},
  {label:'Hair',dots:HAIR,key:'hair'},
  {label:'Top',key:'top',chips:[['tshirt','T-shirt'],['hoodie','Hoodie'],['jacket','Jacket'],['tank','Tank top']],dots:COLORS,dotKey:'topColor'},
  {label:'Bottoms',key:'bottom',chips:[['jeans','Jeans'],['shorts','Shorts'],['sweats','Sweatpants']],dots:BOTTOMS,dotKey:'bottomColor'},
  {label:'Sneakers',dots:SHOES,key:'shoes'},
  {label:'Hat',key:'hat',chips:[['none','None'],['cap','Baseball cap'],['beanie','Beanie'],['cowboy','Cowboy hat'],['hard','Hard hat']],dots:COLORS,dotKey:'hatColor'},
  {label:'Glasses',key:'glasses',chips:[['none','None'],['sun','Sunglasses'],['reading','Glasses']]},
  {label:'Accessories',extras:[['backpack','Backpack'],['headphones','Headphones'],['watch','Watch'],['scarf','Scarf'],['chain','Gold chain']]}
];
function renderCharOpts(){
  const wrap=$('#charOpts');wrap.innerHTML='';
  CHAR_UI.forEach(sec=>{
    const d=document.createElement('div');d.innerHTML=`<p class="label">${sec.label}</p>`;
    if(sec.chips||sec.extras){const row=document.createElement('div');row.className='opts';
      (sec.chips||sec.extras).forEach(([v,name])=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=name;
        const on=sec.extras?!!charCfg.extras[v]:charCfg[sec.key]===v;b.setAttribute('aria-pressed',String(on));
        b.onclick=()=>{if(sec.extras)charCfg.extras[v]=!charCfg.extras[v];else charCfg[sec.key]=v;changed();};row.appendChild(b);});
      d.appendChild(row);}
    const dk=sec.dotKey||(!sec.chips&&sec.dots?sec.key:null);
    if(sec.dots&&!(sec.key==='hat'&&(charCfg.hat==='none'||charCfg.hat==='cowboy'||charCfg.hat==='hard'))){
      const row=document.createElement('div');row.className='dots';if(!sec.chips)row.style.marginTop='0';
      sec.dots.forEach(col=>{const b=document.createElement('button');b.type='button';b.className='dot';b.style.background=col;b.setAttribute('aria-label',sec.label+' color');
        b.setAttribute('aria-pressed',String(charCfg[dk]===col));b.onclick=()=>{charCfg[dk]=col;changed();};row.appendChild(b);});
      d.appendChild(row);}
    wrap.appendChild(d);
  });
}
function changed(){buildChar();renderCharOpts();blip(600,.05,'triangle',.04);save();}

/* ---------- keyboard ---------- */
const held=new Set();
const MOVE_KEYS=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE'];
addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='Shift'&&lastMouse){lastMouse.shift=true;updateGhost();}
  if(MOVE_KEYS.includes(e.code)){held.add(e.code);if(e.code.startsWith('Arrow'))e.preventDefault();camTween=null;return;}
  if(e.repeat)return;
  const k=e.key.toLowerCase();
  if(/^[0-9]$/.test(k)){const list=available();const i=k==='0'?9:+k-1;if(list[i])selectBlock(list[i]);return;}
  if(k==='['||k===']'){const list=available();let i=list.indexOf(selected);i=(i+(k===']'?1:-1)+list.length)%list.length;selectBlock(list[i]);return;}
  if(k==='b'){setMode(mode==='build'?'break':'build');return;}
  if(k==='c'){toggleSheet('craft');return;}
  if(k==='p'){toggleSheet('char');return;}
  if(k==='m'){startMove();return;}
  if(k==='h'||k==='?'){setHelp($('#help').hidden);return;}
  if(k==='escape'){
    if(openName)closeSheets();
    else if(movingChar){movingChar=false;updateHint();toast('Move cancelled.');}
    else if(!$('#help').hidden)setHelp(false);
  }
});
addEventListener('keyup',e=>{held.delete(e.code);if(e.key==='Shift'&&lastMouse){lastMouse.shift=false;updateGhost();}});
addEventListener('blur',()=>held.clear());
const fwd=new THREE.Vector3(),right=new THREE.Vector3(),mv=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),off=new THREE.Vector3();
function keyCamera(dt){
  if(!held.size)return;
  let f=0,s=0,turn=0;
  if(held.has('KeyW')||held.has('ArrowUp'))f++;
  if(held.has('KeyS')||held.has('ArrowDown'))f--;
  if(held.has('KeyD')||held.has('ArrowRight'))s++;
  if(held.has('KeyA')||held.has('ArrowLeft'))s--;
  if(held.has('KeyQ'))turn++;
  if(held.has('KeyE'))turn--;
  if(f||s){
    camera.getWorldDirection(fwd);fwd.y=0;fwd.normalize();
    right.crossVectors(fwd,UP).normalize();
    mv.copy(fwd).multiplyScalar(f).addScaledVector(right,s).normalize().multiplyScalar(dt*12);
    const t=controls.target;
    const nx=THREE.MathUtils.clamp(t.x+mv.x,-HALF-4,HALF+4),nz=THREE.MathUtils.clamp(t.z+mv.z,-HALF-4,HALF+4);
    mv.set(nx-t.x,0,nz-t.z);t.add(mv);camera.position.add(mv);
  }
  if(turn){off.copy(camera.position).sub(controls.target).applyAxisAngle(UP,turn*dt*1.8);camera.position.copy(controls.target).add(off);}
  if(lastMouse)updateGhost();
}

/* ---------- start ---------- */
const saved=load();
if(saved&&Array.isArray(saved.b)){
  saved.b.forEach(([t,x,y,z,r,o])=>{if(MATS[t])placeBlock(t,x,y,z,{rot:r,open:!!o});});
  if(saved.c)charCfg=Object.assign(charCfg,saved.c,{extras:Object.assign({},charCfg.extras,saved.c.extras||{})});
  if(saved.p)charPos=saved.p;
  if(Array.isArray(saved.u))saved.u.forEach(k=>MATS[k]&&unlocked.add(k));
  if(saved.s&&unlocked.has(saved.s))selected=saved.s;
}else starter();
buildChar();renderHotbar();
if(isLaptop()&&!recall('buildahouse.helpSeen'))setHelp(true);
setTimeout(()=>toast(isLaptop()?'Click to place a block. Drag to look around. Press H for keys.':'Tap a spot to place a block. Drag to look around.'),400);
fineMQ.addEventListener&&fineMQ.addEventListener('change',()=>renderHotbar());

function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
  if(openName==='char')applyOffset(sheetSize($('#sheetChar')));else applyOffset(offsetPx);
}
addEventListener('resize',resize);resize();

const clock=new THREE.Clock();
const easeBack=t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);};
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
  if(camTween){camTween.t=Math.min(1,camTween.t+dt/.7);const k=1-Math.pow(1-camTween.t,3);
    controls.target.lerpVectors(camTween.ft,camTween.tt,k);camera.position.lerpVectors(camTween.fp,camTween.tp,k);if(camTween.t>=1)camTween=null;}
  keyCamera(dt);
  controls.update();
  for(let i=anims.length-1;i>=0;i--){const a=anims[i];a.t+=dt;const p=Math.min(1,a.t/a.dur);
    if(a.kind==='pop')a.obj.scale.setScalar(.4+.6*easeBack(p));else a.obj.scale.setScalar(1-p);
    if(p>=1){if(a.kind==='shrink')blockGroup.remove(a.obj);else a.obj.scale.setScalar(1);anims.splice(i,1);}}
  blocks.forEach(b=>{if(b.hinge){const tg=b.open?DOOR_OPEN:0;b.hinge.rotation.y+=(tg-b.hinge.rotation.y)*Math.min(1,dt*10);}});
  if(P.armL){const s=Math.sin(t*1.6)*.12;P.armL.rotation.x=s;P.armR.rotation.x=-s;P.head.rotation.y=Math.sin(t*.6)*.3;P.body.position.y=Math.abs(Math.sin(t*1.6))*.015;}
  renderer.render(scene,camera);
}
loop();
})();
