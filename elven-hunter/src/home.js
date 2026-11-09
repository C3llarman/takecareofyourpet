/* ================= home: the old cottage, its farm, and saving =================
   An abandoned cottage stands out past the tavern. From level 10 you can buy it,
   then fix it up a job at a time: roof, door and windows, the yard, a vegetable
   patch, a well, a wider patch, a bed and hearth. Crops grow while you play and
   sell for coin. Everything you own is saved in the browser. */

var HOME={owned:false, up:{}, plots:[], playT:0};
var HOUSE_PRICE=600, HOUSE_LEVEL=10;
var HOME_UP=[
  {id:'roof',   n:'Mend the roof',                cost:120, d:'Keeps the rain out. The first job.'},
  {id:'door',   n:'New door and windows',         cost:100, d:'Light in the windows again.'},
  {id:'yard',   n:'Clear the weeds, mend the fence', cost:80, d:'A tidy yard. Monsters keep their distance.'},
  {id:'patch',  n:'Dig a vegetable patch',        cost:90,  d:'Four plots to grow crops for coin.', need:['yard']},
  {id:'well',   n:'Dig a well',                   cost:140, d:'Crops grow 40% faster.', need:['patch']},
  {id:'patch2', n:'Widen the patch',              cost:160, d:'Four more plots.', need:['patch']},
  {id:'hearth', n:'A bed and a hearth',           cost:120, d:'Rest here, and wake here if the wood takes you.', need:['roof','door']}
];
var CROPS={
  wheat:  {n:'Wheat',    seed:4,  grow:90,  sell:14},
  corn:   {n:'Corn',     seed:8,  grow:150, sell:28},
  pumpkin:{n:'Pumpkins', seed:15, grow:240, sell:58}
};
function homeReset(){ HOME={owned:false, up:{}, plots:[], playT:0}; for(var i=0;i<8;i++) HOME.plots.push({c:null,t:0}); }
homeReset();

/* cottage-local (lx across the front, lz out of the door) -> world */
function HT(lx,lz){ var c=Math.cos(HOUSE.ry), s=Math.sin(HOUSE.ry); return {x:HOUSE.x+lx*c+lz*s, z:HOUSE.z-lx*s+lz*c}; }
function plotsOpen(){ return (HOME.up.patch?4:0)+(HOME.up.patch2?4:0); }
function plotPos(i){ return HT(6.9+(i>>2)*2.7, -2.7+(i&3)*1.8); }
function growTime(c){ return CROPS[c].grow*(HOME.up.well?0.6:1); }
function cropReady(pl){ return pl.c&&HOME.playT-pl.t>=growTime(pl.c); }
function homeSafe(x,z,r){ return Math.hypot(x-HOUSE.x,z-HOUSE.z)<r; }

/* ---------- the site: baked once (ground, collision, the landmark) ---------- */
function cottageSite(m){
  var y=H(HOUSE.x,HOUSE.z);
  collBox(HOUSE.x,HOUSE.z,3.6,3.1,HOUSE.ry);
  // the stone foundation never changes
  addMesh(m,boxMesh([0.40,0.39,0.38]),HOUSE.x,y-0.35,HOUSE.z,HOUSE.ry,7.6,0.6,6.6);
  LANDMARKS.push({x:HOUSE.x,z:HOUSE.z,r:10,name:'The Old Cottage',kind:'cottage'});
}

/* a Quaternius prop as a plain triangle mesh, 1 unit tall, for addMesh */
function natMB(name){
  var P=NAT&&NAT[name]; if(!P) return null; if(P.mb) return P.mb;
  var m=new MB();
  for(var j=0;j<P.i.length;j++){ var v=P.i[j];
    m.p.push(P.p[v*3],P.p[v*3+1],P.p[v*3+2]); m.n.push(P.n[v*3],P.n[v*3+1],P.n[v*3+2]);
    m.c.push(P.c[v*3],P.c[v*3+1],P.c[v*3+2]); m.f.push(2); }
  return (P.mb=m);
}

/* ---------- the cottage itself: rebuilt whenever something is fixed ---------- */
var HOUSE3=null;
function cottageMesh(){
  var m=new MB(), y=H(HOUSE.x,HOUSE.z), R=HOUSE.ry, U=HOME.up;
  function put(src,lx,ly,lz,ry,sx,sy,sz){ var p=HT(lx,lz); addMesh(m,src,p.x,y+ly,p.z,R+(ry||0),sx,sy,sz); }
  var wood=[0.36,0.25,0.15], dark=[0.16,0.12,0.09], warm=[0.95,0.72,0.35];
  var wall=U.roof&&U.door?[0.80,0.74,0.60]:[0.58,0.53,0.45];       // whitewash once it's lived in
  put(boxMesh(wall),0,-0.05,0,0,7,3.0,6);
  // timber frame
  var beam=[0.30,0.21,0.13];
  for(var bx=-1;bx<=1;bx+=2) for(var bz=-1;bz<=1;bz+=2) put(boxMesh(beam),bx*3.45,-0.05,bz*2.95,0,0.3,3.1,0.3);
  put(boxMesh(beam),0,2.85,3.02,0,7.1,0.25,0.12); put(boxMesh(beam),0,2.85,-3.02,0,7.1,0.25,0.12);
  // the roof: whole and red once mended; until then sagging, grey and holed
  if(U.roof){
    put(coneMesh([0.58,0.24,0.17],4),0,2.95,0,Math.PI/4,7.8,2.9,6.8);
  } else {
    put(coneMesh([0.36,0.31,0.26],4),0,2.95,0,Math.PI/4+0.06,7.6,2.3,6.6);
    put(boxMesh(dark),1.3,3.4,1.2,0.3,1.6,0.5,1.4);                  // the hole
    put(boxMesh(dark),-1.8,3.6,-1.0,-0.2,1.1,0.4,1.0);
    put(boxMesh(wood),3.6,0,4.6,0.9,0.35,0.12,2.6);                  // fallen boards
    put(boxMesh(wood),-4.4,0,2.8,-0.4,0.35,0.12,2.2);
  }
  // door and windows
  if(U.door){
    put(boxMesh([0.42,0.28,0.16]),0,-0.05,3.06,0,1.3,2.2,0.12);
    put(boxMesh(warm),-2.1,1.1,3.04,0,1.0,1.0,0.1); put(boxMesh(warm),2.1,1.1,3.04,0,1.0,1.0,0.1);
    put(boxMesh(warm),3.54,1.1,0,0,0.1,1.0,1.0); put(boxMesh(warm),-3.54,1.1,0,0,0.1,1.0,1.0);
  } else {
    put(boxMesh(dark),0,-0.05,3.04,0,1.3,2.2,0.1);                   // a gaping doorway
    put(boxMesh(wood),0.75,-0.05,3.6,0.9,0.12,2.1,1.2);               // the door, off its hinges
    for(var wi=-1;wi<=1;wi+=2){ put(boxMesh(dark),wi*2.1,1.1,3.04,0,1.0,1.0,0.1);
      put(boxMesh(wood),wi*2.1,1.55,3.12,0,1.3,0.16,0.06); put(boxMesh(wood),wi*2.1,1.15,3.12,0,1.3,0.16,0.06); }
  }
  // the yard: weeds and broken fence until it's cleared, then a fence and a gate
  if(U.yard){
    var pts=[], x0=-8.5, x1=12.5, z0=-5.2, z1=6.6;
    for(var fx=x0;fx<=x1+0.01;fx+=2.1){ pts.push([fx,z0]); if(Math.abs(fx)>1.4) pts.push([fx,z1]); }
    for(var fz=z0+2.1;fz<z1-0.5;fz+=2.1){ pts.push([x0,fz]); pts.push([x1,fz]); }
    for(var pi=0;pi<pts.length;pi++) put(boxMesh(wood),pts[pi][0],-0.1,pts[pi][1],0,0.2,1.2,0.2);
    put(boxMesh(wood),(x0+x1)/2,0.75,z0,0,x1-x0,0.12,0.08);
    put(boxMesh(wood),(x0-1.4)/2,0.75,z1,0,-1.4-x0,0.12,0.08); put(boxMesh(wood),(x1+1.4)/2,0.75,z1,0,x1-1.4,0.12,0.08);
    put(boxMesh(wood),x0,0.75,(z0+z1)/2,0,0.08,0.12,z1-z0); put(boxMesh(wood),x1,0.75,(z0+z1)/2,0,0.08,0.12,z1-z0);
    // a little flower bed by the door
    var fl=natMB('flower'); if(fl){ put(fl,-2.2,0,3.9,0,0.55,0.5,0.55); put(fl,2.3,0,3.9,1.2,0.5,0.45,0.5); }
  } else {
    var r=mulberry(77), weeds=['bush1','bush2','fern1','fern2'];
    for(var w=0;w<16;w++){ var wx=-7+r()*18, wz=-4.5+r()*10.5; if(Math.abs(wx)<4.2&&Math.abs(wz)<3.8) continue;
      var wm=natMB(weeds[(r()*4)|0]); if(wm) put(wm,wx,-0.05,wz,r()*6,0.9+r()*0.7,0.8+r()*0.6,0.9+r()*0.7); }
    for(var bf=0;bf<5;bf++){ var bxp=-8+bf*4.6; put(boxMesh(wood),bxp,-0.2,6.4,0.5+bf,0.2,0.9-bf*0.1,0.2); }
  }
  // the vegetable patch
  for(var i=0;i<plotsOpen();i++){
    var pp=plotPos(i), py=H(pp.x,pp.z);
    addMesh(m,boxMesh([0.27,0.19,0.12]),pp.x,py-0.2,pp.z,R,2.2,0.32,1.5);
    addMesh(m,boxMesh([0.36,0.26,0.16]),pp.x,py-0.25,pp.z,R,2.45,0.3,1.75);
  }
  // the well
  if(U.well){
    var stone=[0.46,0.46,0.48];
    put(coneMesh(stone,12,0.5,0.5),-6.2,-0.1,3.2,0,1.9,0.9,1.9);
    put(coneMesh([0.10,0.18,0.24],12,0.5,0.5),-6.2,0.75,3.2,0,1.5,0.05,1.5);
    put(boxMesh(wood),-7.0,0,3.2,0,0.18,2.2,0.18); put(boxMesh(wood),-5.4,0,3.2,0,0.18,2.2,0.18);
    put(coneMesh([0.50,0.22,0.16],4),-6.2,2.15,3.2,Math.PI/4,2.4,0.7,1.6);
  }
  // the hearth: a chimney (it smokes, see homeUpdate)
  if(U.hearth) put(boxMesh([0.42,0.40,0.38]),-2.4,2.6,-1.6,0,0.9,2.6,0.9);
  // the deed, nailed to a post, until the place is yours
  if(!HOME.owned){
    put(boxMesh(wood),1.9,-0.1,4.7,0,0.16,1.9,0.16);
    put(boxMesh([0.86,0.80,0.62]),1.9,1.35,4.75,0,1.1,0.7,0.06);
    put(boxMesh([0.60,0.14,0.12]),1.9,1.55,4.79,0,0.8,0.12,0.02);
  }
  return m;
}
function buildCottage(){
  if(!SCENE||!WORLDMAT) return;
  var g=toGeom(cottageMesh());
  if(HOUSE3){ HOUSE3.geometry.dispose(); HOUSE3.geometry=g; }
  else { HOUSE3=new THREE.Mesh(g,WORLDMAT); HOUSE3.castShadow=true; HOUSE3.receiveShadow=true; SCENE.add(HOUSE3); }
  if(HOME.up.well&&!HOME.wellColl){ var wp=HT(-6.2,3.2); collCircle(wp.x,wp.z,1.0); HOME.wellColl=1; }
}
/* the crop models drawn as instanced parts, so they can grow every frame */
function initCropParts(){
  if(typeof PARTS==='undefined'||!NAT) return;
  ['wheat','corn'].forEach(function(k){ var mb=natMB(k); if(mb&&!PARTS['n_'+k]) PARTS['n_'+k]={geom:toGeom(mb),mb:mb,n:mb.count()}; });
}

/* ---------- per frame ---------- */
var HOMESMOKE=0;
function homeUpdate(dt){
  HOME.playT+=dt;
  var p=G.player, d=Math.hypot(p.x-HOUSE.x,p.z-HOUSE.z);
  p.atHome=HOME.owned&&d<HOUSE.yard;
  if(p.atHome&&HOME.up.hearth&&p.hp<p.maxHp) p.hp=Math.min(p.maxHp,p.hp+p.maxHp*0.10*dt);
  if(HOME.up.hearth&&d<70){ HOMESMOKE-=dt; if(HOMESMOKE<=0){ HOMESMOKE=0.4; var c=HT(-2.4,-1.6);
    burst(c.x,H(HOUSE.x,HOUSE.z)+5.4,c.z,1,[0.62,0.62,0.62],{up:0.8,spread:0.4,size:0.35,life:3.2,grav:-0.5}); } }
}
function drawFarm(){
  if(!plotsOpen()) return;
  var c=G.cam; if(Math.hypot(HOUSE.x-c.x,HOUSE.z-c.z)>70) return;
  for(var i=0;i<plotsOpen();i++){ var pl=HOME.plots[i]; if(!pl.c) continue;
    var pp=plotPos(i), py=H(pp.x,pp.z)+0.12, g=clamp((HOME.playT-pl.t)/growTime(pl.c),0.08,1), ripe=g>=1;
    for(var k=0;k<4;k++){
      var ox=((k&1)-0.5)*1.1, oz=((k>>1)-0.5)*0.7, cs=Math.cos(HOUSE.ry), sn=Math.sin(HOUSE.ry);
      var x=pp.x+ox*cs+oz*sn, z=pp.z-ox*sn+oz*cs, m=mat();
      if(pl.c==='wheat'){ m4trs(m,x,py,z,0,k*1.7,0,1.3*g+0.1,1.5*g+0.1,1.3*g+0.1);
        DRAW.push(['n_wheat',m,ripe?[1.15,1.0,0.55]:[0.75,1.05,0.6]]); }
      else if(pl.c==='corn'){ m4trs(m,x,py,z,0,k*2.1,0,0.9*g+0.1,2.3*g+0.1,0.9*g+0.1);
        DRAW.push(['n_corn',m,ripe?[1.05,1.0,0.75]:[0.8,1.05,0.7]]); }
      else { var s=0.55*g+0.08;                    // pumpkins swell on the vine
        m4trs(m,x,py+s*0.32,z,0,k,0,s,s*0.62,s); DRAW.push(['blobR',m,ripe?[0.95,0.52,0.14]:[0.55+0.4*g,0.62,0.2]]);
        var st=mat(); m4trs(st,x,py+s*0.6,z,0,0,0,0.05,0.18,0.05); DRAW.push(['box',st,[0.30,0.42,0.18]]); }
    }
    if(ripe){ var sp=mat(), bob=Math.sin(G.t*3+i)*0.12;      // a gold glint: ready to pick
      m4trs(sp,pp.x,py+1.9+bob,pp.z,0,G.t*2,0,0.16,0.16,0.16); DRAW.push(['blob',sp,[1.0,0.86,0.35]]); }
  }
}
function readyCrops(){ var n=0,v=0; for(var i=0;i<plotsOpen();i++){ var pl=HOME.plots[i]; if(cropReady(pl)){ n++; v+=CROPS[pl.c].sell; } } return {n:n,v:v}; }

/* ---------- the cottage menu ---------- */
function cottageScreen(say){
  if(G.state==='play'){ menuOpen('talk'); sfx('click'); }
  else if(G.state!=='talk') return;
  var p=G.player, html='', opts=[];
  if(!HOME.owned){
    var lvlOK=p.level>=HOUSE_LEVEL, cashOK=p.coins>=HOUSE_PRICE;
    html='<h1>The Old Cottage</h1><p class="sub">Ivy through the windows, half a roof, and a notice nailed to the post.</p>'+
      '<p class="say">“FOR SALE — '+HOUSE_PRICE+' coins. A home for a hunter of standing.”</p>'+
      '<div class="stat"><span>Your level</span><b>'+p.level+' / '+HOUSE_LEVEL+'</b></div>'+
      '<div class="stat"><span>Your purse</span><b>◉ '+p.coins+' / '+HOUSE_PRICE+'</b></div>';
    opts.push({id:'buy',t:'Buy the cottage — '+HOUSE_PRICE+' ◉',d:!lvlOK?'Only a hunter of level '+HOUSE_LEVEL+' may buy it':(!cashOK?'Not enough coin yet':'It\'s yours to fix up'),off:!lvlOK||!cashOK,gold:lvlOK&&cashOK});
  } else {
    var built=0; HOME_UP.forEach(function(u){ if(HOME.up[u.id]) built++; });
    html='<h1>Your Cottage</h1><p class="sub">'+(built===HOME_UP.length?'Every job done. It\'s home.':built+' of '+HOME_UP.length+' jobs done')+' · ◉ '+p.coins+'</p>'+
      (say?'<p class="say">'+say+'</p>':'');
    if(Object.keys(WILD.recipes||{}).length) opts.push({id:'craft',t:'Your workbench',d:'Brew and make from what you\'ve gathered',off:false});
    if(HOME.up.hearth) opts.push({id:'rest',t:'Rest by the hearth',d:p.hp>=p.maxHp-0.5?'You are already rested':'Mend you and your company',off:false});
    if(plotsOpen()){
      var rc=readyCrops(), empty=0, growing=[];
      for(var i=0;i<plotsOpen();i++){ var pl=HOME.plots[i]; if(!pl.c) empty++; else if(!cropReady(pl)) growing.push(Math.ceil(growTime(pl.c)-(HOME.playT-pl.t))); }
      html+='<div class="stat"><span>Vegetable patch</span><b>'+plotsOpen()+' plots · '+rc.n+' ready · '+growing.length+' growing · '+empty+' empty</b></div>';
      if(growing.length) html+='<div class="stat"><span>Next crop ready</span><b>'+fmtTime(Math.min.apply(null,growing))+'</b></div>';
      opts.push({id:'harvest',t:'Harvest '+(rc.n?rc.n+' ready crop'+(rc.n>1?'s':'')+' — +'+rc.v+' ◉':'(nothing ready)'),d:'Sold at the Greenleaf',off:!rc.n,gold:rc.n>0});
      for(var c in CROPS){ var C=CROPS[c];
        opts.push({id:'plant:'+c,t:'Plant '+C.n.toLowerCase()+' — '+C.seed+' ◉ a plot',
          d:'Ready in '+fmtTime(growTime(c))+', sells for '+C.sell+' ◉'+(empty?' · '+empty+' empty plot'+(empty>1?'s':''):' · no empty plots'),
          off:!empty||p.coins<C.seed}); }
    }
    HOME_UP.forEach(function(u){ if(HOME.up[u.id]) return;
      var need=(u.need||[]).filter(function(n){ return !HOME.up[n]; });
      var needN=need.map(function(n){ for(var j=0;j<HOME_UP.length;j++) if(HOME_UP[j].id===n) return HOME_UP[j].n.toLowerCase(); });
      opts.push({id:'up:'+u.id,t:u.n+' — '+u.cost+' ◉',d:need.length?'First: '+needN.join(', '):(p.coins<u.cost?u.d+' · not enough coin':u.d),off:need.length>0||p.coins<u.cost});
    });
  }
  html+='<div class="opts">';
  for(var k=0;k<opts.length;k++){ var o=opts[k];
    html+='<button class="opt'+(o.off?' off':'')+(o.gold?' gold':'')+'" data-o="'+o.id+'"'+(o.off?' disabled':'')+'><b>'+o.t+'</b><small>'+o.d+'</small></button>'; }
  html+='</div><button class="btn" id="leave">Back to the wood</button>';
  show(html);
  var els=ui.querySelectorAll('.opt');
  for(var e=0;e<els.length;e++) els[e].onclick=function(){ cottageDo(this.getAttribute('data-o')); };
  document.getElementById('leave').onclick=menuClose;
}
function fmtTime(s){ s=Math.max(0,Math.round(s)); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); }
function cottageDo(id){
  var p=G.player;
  if(id==='buy'){
    if(p.level<HOUSE_LEVEL||p.coins<HOUSE_PRICE) return;
    p.coins-=HOUSE_PRICE; HOME.owned=true; buildCottage(); sfx('levelup'); saveGame();
    cottageScreen('“The key turns, stiff with rust. It\'s yours — every leaky inch of it.”');
  } else if(id.indexOf('up:')===0){
    var u=null; for(var i=0;i<HOME_UP.length;i++) if(HOME_UP[i].id===id.slice(3)) u=HOME_UP[i];
    if(!u||HOME.up[u.id]||p.coins<u.cost) return;
    p.coins-=u.cost; HOME.up[u.id]=1; buildCottage(); sfx('freed'); saveGame();
    cottageScreen('Done: '+u.n.toLowerCase()+'.');
  } else if(id.indexOf('plant:')===0){
    var c=id.slice(6), C=CROPS[c], n=0;
    for(var j=0;j<plotsOpen();j++){ var pl=HOME.plots[j]; if(!pl.c&&p.coins>=C.seed){ p.coins-=C.seed; pl.c=c; pl.t=HOME.playT; n++; } }
    if(n){ sfx('pickup'); saveGame(); }
    cottageScreen(n?'Planted '+n+' plot'+(n>1?'s':'')+' of '+C.n.toLowerCase()+'.':'');
  } else if(id==='harvest'){
    var rc=readyCrops();
    for(var k=0;k<plotsOpen();k++){ var q=HOME.plots[k]; if(cropReady(q)){ q.c=null; q.t=0; } }
    if(rc.n){ p.coins+=rc.v; sfx('coin'); var hp=HT(8,0); burst(hp.x,H(hp.x,hp.z)+1,hp.z,20,[1.0,0.85,0.4],{up:3,spread:3,size:0.12,life:1}); saveGame(); }
    cottageScreen(rc.n?'A good harvest: +'+rc.v+' coins.':'');
  } else if(id==='craft'){ craftScreen(function(){ cottageScreen(); });
  } else if(id==='rest'){
    p.hp=p.maxHp; for(var a=0;a<G.ents.length;a++) if(G.ents[a].kind==='ally') G.ents[a].hp=G.ents[a].maxHp;
    sfx('potion'); cottageScreen('You doze by the fire. Much better.');
  }
}

/* ---------- saving ---------- */
var SAVE_KEY='eh3_save';
function saveGame(){
  if(!G.player||G.player.dead&&G.state!=='dead') return;
  var p=G.player, b=G.build;
  var sv={v:1, t:Date.now(),
    build:{race:b.race,cls:b.cls,skills:b.skills,points:b.points,gear:b.gear||{w:0,a:0},diff:b.diff||'normal',items:b.items||{},bag:b.bag||[]},
    wild:wildSave(),
    p:{level:p.level,xp:p.xp,hp:Math.max(1,Math.round(p.hp)),coins:p.coins,potions:p.potions},
    killed:G.killed, freed:G.freed, found:G.found, bounty:G.bounty?{id:G.bounty.def.id,n:G.bounty.n,got:G.bounty.got}:null,
    bountiesDone:G.bountiesDone||0,
    allies:G.ents.filter(function(e){ return e.kind==='ally'; }).map(function(e){ return {ak:e.ak,name:e.name}; }),
    home:{owned:HOME.owned,up:HOME.up,plots:HOME.plots,playT:Math.round(HOME.playT)}};
  try{ localStorage.setItem(SAVE_KEY,JSON.stringify(sv)); }catch(e){}
}
function loadSave(){
  try{ var s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); return s&&s.v===1&&s.build&&s.p?s:null; }catch(e){ return null; }
}
function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
/* put a saved hunter back into the world (called by startRun) */
function applySave(sv){
  var p=G.player;
  p.level=sv.p.level; p.xp=sv.p.xp; p.coins=sv.p.coins; p.potions=sv.p.potions;
  recalc(); p.hp=Math.min(p.maxHp,sv.p.hp||p.maxHp);      // recalc counts the level's extra health
  G.killed=sv.killed||0; G.freed=sv.freed||0; G.found=sv.found||{}; G.bountiesDone=sv.bountiesDone||0;
  G.bounty=null;
  if(sv.bounty) for(var i=0;i<BOUNTIES.length;i++) if(BOUNTIES[i].id===sv.bounty.id) G.bounty={def:BOUNTIES[i],n:sv.bounty.n,got:sv.bounty.got};
  homeReset();
  wildLoad(sv.wild);
  if(sv.home){ HOME.owned=!!sv.home.owned; HOME.up=sv.home.up||{}; HOME.playT=sv.home.playT||0;
    if(sv.home.plots) for(var j=0;j<8&&j<sv.home.plots.length;j++) HOME.plots[j]=sv.home.plots[j]; }
  (sv.allies||[]).forEach(function(a,k){ spawnAlly(a.ak,p.x+Math.cos(k*2.1)*2,p.z+Math.sin(k*2.1)*2,a.name); });
}
/* where you wake: your own hearth once you have one, otherwise the Greenleaf's yard */
function wakeSpot(){
  if(HOME.owned&&HOME.up.hearth){ var h=HT(0,5.2); return {x:h.x,z:h.z,yaw:HOUSE.ry,home:true}; }
  var t=TAVERN.door?{x:TAVERN.door.x+Math.sin(TAVERN.ry)*4.5,z:TAVERN.door.z+Math.cos(TAVERN.ry)*4.5}:{x:0,z:-26};
  return {x:t.x,z:t.z,yaw:TAVERN.ry,home:false};
}
addEventListener('visibilitychange',function(){ if(document.hidden&&G.state==='play') saveGame(); });
addEventListener('pagehide',function(){ if(G.state==='play'||G.state==='talk'||G.state==='skills') saveGame(); });
