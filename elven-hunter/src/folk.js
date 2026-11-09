/* ================= folk: quest givers, gathering, crafting and the eagles =================
   Wren the hedge-witch (gathering and her mentor's lost satchel), Tobin the tinker
   (lost parts, a delivery, a repair), and Ærtheldor the Great Eagle in his eyrie in
   the far south, whose quests end with an eaglet, Aelfrend, who follows you, dives at
   your foes and flies you back to the quest givers.
   Things to gather lie about the wood (and drop from monsters); Wren's bench (and
   your cottage, once you own it) turns them into potions, tonics and charms.
   Loaded before game.js; nothing here runs until the game calls it. */

/* ---------- resources ---------- */
var RES={
  herb:   {n:'Silverleaf',  col:[0.70,0.88,0.72]},
  wood:   {n:'Wood',        col:[0.55,0.38,0.22]},
  ore:    {n:'Iron ore',    col:[0.62,0.40,0.30]},
  silk:   {n:'Spider silk', col:[0.92,0.92,0.95]},
  honey:  {n:'Honeycomb',   col:[0.96,0.74,0.22]},
  glowcap:{n:'Glowcap',     col:[0.40,0.90,1.0]}
};
var RES_ORDER=['herb','wood','ore','silk','honey','glowcap'];
var NODE_REGROW=150;
function inv(k){ return (WILD.inv&&WILD.inv[k])||0; }
function addRes(k,n,x,y,z){
  WILD.inv[k]=inv(k)+n; logLine('+'+n+' '+RES[k].n.toLowerCase(),'#cfe8c0');
  if(x!==undefined) msg('+'+n+' '+RES[k].n.toLowerCase()+' ('+inv(k)+')','#cfe8c0',x,y,z,13);
}
/* a dry spot near (x,z), out of the water and out of anything solid */
function dryNear(x,z,minH){
  if(!inBounds(x,z,3)&&!inCave(x,z)){ var k=(WHALF*PLAY_R-3)/Math.hypot(x,z); x*=k; z*=k; }   // never past the edge of the map
  for(var r=0;r<14;r+=1.5) for(var a=0;a<6.28;a+=0.7){ var px=x+Math.cos(a)*r, pz=z+Math.sin(a)*r;
    if(H(px,pz)>(minH===undefined?WATER+0.6:minH)&&!solidAt(px,pz,0.5)&&(inCave(px,pz)||(inBounds(px,pz,2)&&Hn(px,pz)<0.6))) return {x:px,z:pz}; }
  return {x:x,z:z};
}
function spawnNodes(){
  var r=mulberry(5150);
  function put(res,x,z){ G.ents.push({kind:'node',res:res,x:x,y:H(x,z),z:z,t:0,yaw:r()*6.28,seed:r()*9,scale:1}); }
  function scatter(res,n,test){ n=Math.round(n*WS*WS); for(var i=0,k=0;i<n&&k<n*30;k++){ var q=randIn(r), x=q.x, z=q.z;
    if(H(x,z)<WATER+0.6||solidAt(x,z,0.5)||Hn(x,z)>0.6||nearTavern(x,z,12)||cragZone(x,z)<1||(test&&!test(x,z))) continue; put(res,x,z); i++; } }
  scatter('herb',26,function(x,z){ return fbm(x+500,z-300,2,0.022)>0.42; });     // silverleaf likes the open
  scatter('wood',24);
  scatter('ore',16,function(x,z){ return H(x,z)>4.5; });                        // ore in the high ground
  for(var h=0;h<5;h++){ var a=h/5*6.28+0.3, q=dryNear(LM.hive.x+Math.cos(a)*6,LM.hive.z+Math.sin(a)*6); put('honey',q.x,q.z); }
  for(var s=0;s<6;s++){ var b=s/6*6.28, q2=dryNear(LM.hollow.x+Math.cos(b)*9,LM.hollow.z+Math.sin(b)*9); put('silk',q2.x,q2.z); }
  for(var o=0;o<5;o++){ var c=o/5*6.28, q3=dryNear(CRAG.x+Math.cos(c)*24,CRAG.z+Math.sin(c)*24); put('ore',q3.x,q3.z); }
  for(var g=0;g<10;g++){ var sp=caveSpawnSpot(0); if(sp) put('glowcap',sp.x,sp.z); }
}
function updateNode(e,dt,pd){
  if(e.t>0){ e.t-=dt; return; }
  if(pd<1.7&&!G.player.dead){
    var n=e.res==='wood'||e.res==='herb'?1+((Math.random()*1.6)|0):1;
    addRes(e.res,n,e.x,e.y+1.6,e.z); e.t=NODE_REGROW; sfx('pickup',e.x,e.z);
    burst(e.x,e.y+0.5,e.z,10,RES[e.res].col,{up:2.5,spread:1.5,size:0.09,life:0.7,grav:2});
  }
}
/* what monsters leave behind besides coin */
var DROPS={spider:['silk',0.35],wasp:['honey',0.32],shroom:['glowcap',0.2]};
function monsterDrop(e){
  var d=DROPS[e.kind]; if(!d||Math.random()>d[1]*(e.elite?2.5:1)) return;
  addRes(d[0],e.elite?2:1,e.x,e.y+2.2,e.z);
}

/* ---------- crafting ---------- */
var RECIPES=[
  {id:'potion', n:'Healing potion',     cost:{herb:2,honey:1}, d:'Heals 45%. Bram sells these for 15.'},
  {id:'cake',   n:'Honey cake',         cost:{honey:2},        d:'Keep it for later: you mend for 40 s.'},
  {id:'torch',  n:'Torch',              cost:{wood:2,silk:1},  d:'For the Glimmer Cave.', ok:function(){ return !WILD.torch; }},
  {id:'tonic',  n:'Wardleaf tonic',     cost:{herb:2,glowcap:1}, d:'Keep it for later: half damage for 45 s.'},
  {id:'glimmer',n:'Glimmer charm',      cost:{ore:3,glowcap:2}, d:'+8% damage, for good.', once:1},
  {id:'mantle', n:'Silkweave mantle',   cost:{silk:6,herb:2},   d:'+25 health, for good.', once:1},
  {id:'boots',  n:'Featherlight boots', cost:{wood:4,honey:2,silk:2}, d:'+8% speed, for good.', once:1}
];
var RECIPE_BY={}; RECIPES.forEach(function(r){ RECIPE_BY[r.id]=r; });
function canPay(cost){ for(var k in cost) if(inv(k)<cost[k]) return false; return true; }
function pay(cost){ for(var k in cost) WILD.inv[k]-=cost[k]; }
function costText(cost){ return Object.keys(cost).map(function(k){ var c=inv(k)>=cost[k]?'#bfe8a0':'#e8a090';
  return '<span style="color:'+c+'">'+cost[k]+' '+RES[k].n.toLowerCase()+' ('+inv(k)+')</span>'; }).join(', '); }
function satchelHtml(){
  return '<div class="stat"><span>Your satchel</span><b>'+RES_ORDER.map(function(k){ return RES[k].n+' '+inv(k); }).join(' · ')+
    (inv('cake')||inv('tonic')?' · Honey cakes '+inv('cake')+' · Tonics '+inv('tonic'):'')+'</b></div>';
}
function craftScreen(back,say){
  var known=RECIPES.filter(function(r){ return WILD.recipes[r.id]; }), p=G.player;
  var html='<h1>The workbench</h1><p class="sub">Mortar, pestle, a pot on the boil, and a great many jars</p>'+(say?'<p class="say">'+say+'</p>':'')+satchelHtml()+'<div class="opts">';
  if(!known.length) html+='<button class="opt off" disabled><b>You don\'t know any recipes yet</b><small>Wren will teach you.</small></button>';
  known.forEach(function(r){
    var made=r.once&&WILD.charms[r.id], ok=!made&&canPay(r.cost)&&(!r.ok||r.ok());
    html+='<button class="opt'+(ok?'':' off')+'" data-r="'+r.id+'"'+(ok?'':' disabled')+'><b>'+r.n+(made?' — made':'')+'</b><small>'+r.d+(made?'':' · '+costText(r.cost))+'</small></button>';
  });
  html+='</div><button class="btn alt" id="cback">'+(back?'Back':'Back to the wood')+'</button>';
  show(html);
  var els=ui.querySelectorAll('.opt[data-r]');
  for(var i=0;i<els.length;i++) els[i].onclick=function(){ var r=RECIPE_BY[this.getAttribute('data-r')];
    if(!canPay(r.cost)||(r.once&&WILD.charms[r.id])||(r.ok&&!r.ok())) return;
    pay(r.cost); var line=craftDo(r); sfx('freed'); setTimeout(saveGame,30); craftScreen(back,line); };
  document.getElementById('cback').onclick=function(){ if(back) back(); else menuClose(); };
}
function craftDo(r){
  var p=G.player;
  switch(r.id){
    case 'potion': p.potions++; return 'A potion, green and faintly fizzing.';
    case 'cake': WILD.inv.cake=inv('cake')+1; return 'A honey cake, wrapped in a leaf. Eat it when you need mending'+(DESKTOP?' (key 5).':'.');
    case 'torch': WILD.torch=true; return 'Pitch-soaked silk on a stout stick. It\'ll burn for days.';
    case 'tonic': WILD.inv.tonic=inv('tonic')+1; return 'A stoppered bottle of wardleaf tonic. Drink it before a hard fight'+(DESKTOP?' (key 6).':'.');
    default: WILD.charms[r.id]=1; recalc(); return r.n+' — yours for good.';
  }
}
/* permanent charms, folded into the hunter's stats by recalc */
function charmStats(S){
  var c=WILD.charms||{};
  if(c.glimmer){ S.melee*=1.08; S.ranged*=1.08; }
  if(c.whet){ S.melee*=1.05; S.ranged*=1.05; }
  if(c.mantle) S.maxHp+=25;
  if(c.boots) S.move*=1.08;
}

/* ---------- the folk ---------- */
var FOLK={
  wren: {name:'Wren',role:'hedge-witch, once Hesper\'s apprentice',x:FOLKSITE.wren.x+1.5,z:FOLKSITE.wren.z+2.5,
         greet:'Mind the toadstools!',icon:'wren'},
  tobin:{name:'Tobin Cogsworth',role:'travelling tinker',x:FOLKSITE.tobin.x-2.2,z:FOLKSITE.tobin.z+2.0,greet:'Careful — that root bites!',icon:'tobin'},
  eagle:{name:'Ærtheldor',role:'the Great Eagle of the South',x:FOLKSITE.eyrie.x,z:FOLKSITE.eyrie.z,icon:'eagle'}
};
function spawnFolk(){
  [['wren','rogue',[0.80,1.0,0.78],1.0,false],['tobin','barbarian',[0.92,0.86,1.0],0.86,true]].forEach(function(d){
    var F=FOLK[d[0]], y=H(F.x,F.z);
    G.ents.push({kind:'npc',npcId:d[0],name:F.name,x:F.x,y:y,z:F.z,yaw:0,home:Math.atan2(FOLKSITE[d[0]].x-F.x,FOLKSITE[d[0]].z-F.z)+Math.PI,
      scale:d[3],speed:0,walkPhase:0,onGround:true,hp:1,maxHp:1,cheer:0,greeted:false,model:d[1],tint:d[2],beard:d[4],
      look:look('human','rogue',{tunic:d[2],sleeve:d[2],cloak:null,weapon:null,hair:HAIR.brown,beard:d[4]?1:0})});
    if(!G['coll_'+d[0]]){ collCircle(F.x,F.z,0.5); G['coll_'+d[0]]=1; }
  });
  var E=FOLK.eagle;
  G.ents.push({kind:'eagle',sub:'great',name:'Ærtheldor',x:E.x,y:FOLKSITE.eyrie.top,z:E.z+0.6,yaw:Math.PI*0.9,scale:2.6,t:0,perch:1,flapT:0});
  if(WILD.eagle) spawnPet();
}
function folkEnt(id){ for(var i=0;i<G.ents.length;i++) if(G.ents[i].npcId===id) return G.ents[i]; return null; }

/* ---------- quests ---------- */
var QUESTS=[
  {id:'w_leaf',giver:'wren',t:'Silverleaf for the Pot',short:'Silverleaf',goal:{type:'gather',item:'herb',n:5},
   say:'You\'re the one cutting folk out of cocoons? Then you\'ll be needing potions, and I\'ll be needing silverleaf. It grows low and pale in the open grass. Five sprigs, and I\'ll show you how to brew your own.',
   done:'Lovely. The bench is yours whenever you like. Two leaves and a bit of honeycomb makes a potion — Bram charges you fifteen coins for the same thing, the old robber.',
   reward:{coins:40,xp:80,recipes:['potion','cake','torch']}},
  {id:'w_glow',giver:'wren',need:'w_leaf',t:'Glowcaps from the Dark',short:'Glowcaps',goal:{type:'gather',item:'glowcap',n:3},
   say:'Hesper swore by glowcaps. They grow down in the Glimmer Cave, and the grumps sometimes carry one. Bring me three and I\'ll teach you her tonic.',
   done:'Ooh, still warm. Hesper wasn\'t mad, you know. Whatever Bram says.',
   reward:{coins:70,xp:140,recipes:['tonic','glimmer']}},
  {id:'w_satchel',giver:'wren',need:'w_glow',t:'Hesper\'s Satchel',short:'Hesper\'s satchel',goal:{type:'find',items:[
     {id:'satchel',n:'Hesper\'s satchel',shape:'satchel',at:function(){ return {x:CAVE.x+14,z:CAVE.z+12}; }}]},
   say:'Hesper went into that cave and never came out. If her satchel is still down there, I want it back. Her notes. Her… everything.',
   done:'…She got so close. Thank you. Truly. Take her mantle pattern — she\'d want it worn by someone who goes places.',
   reward:{coins:120,xp:220,recipes:['mantle'],lore:'hesper'}},
  {id:'t_parts',giver:'tobin',t:'Bits and Bobs',short:'Tobin\'s parts',goal:{type:'find',items:[
     {id:'cog',n:'a brass cog',shape:'cog',at:function(){ return dryNear(LM.hollow.x-3,LM.hollow.z+6); }},
     {id:'spring',n:'a coiled spring',shape:'spring',at:function(){ return dryNear(34*WS,63*WS); }},
     {id:'bell',n:'a brass bell',shape:'bell',at:function(){ return dryNear(LM.hive.x+6,LM.hive.z-6); }},
     {id:'lens',n:'Tobin\'s good lens',shape:'lens',at:function(){ return {x:CRAG.lair.x+3.5,z:CRAG.lair.z+4.5}; }}]},
   say:'My cart hit a root, the root won, and my best bits went flying — and then things carried them off. A cog, a spring, a brass bell and my good lens. Find \'em and I\'ll make it worth your while.',
   done:'My lens! Not a scratch. Here — I had a spare compass needle and nothing to point it at. Now it points at whatever you\'re after.',
   reward:{coins:90,xp:180,compass:1}},
  {id:'t_parcel',giver:'tobin',need:'t_parts',t:'A Parcel for Bram',short:'Parcel for Bram',goal:{type:'deliver',to:'bram'},
   say:'Bram ordered a new tap for his barrel a year ago. Take it up to the Greenleaf, would you? And don\'t let him tell you it\'s late. It is late. But don\'t let him tell you.',
   done:'He paid? He actually paid? Take this whetstone — it\'s the good one. Your blade will thank you.',
   reward:{coins:40,xp:80,charm:'whet'}},
  {id:'t_wheel',giver:'tobin',need:'t_parcel',t:'Wood for the Wheel',short:'Cart repairs',goal:{type:'bring',cost:{wood:8,ore:4}},
   say:'Last job, then I\'m off down the road. A new wheel wants eight good lengths of wood and four lumps of iron ore for the rim.',
   done:'She rolls! And while I waited I worked out a lighter boot sole. The plans are yours.',
   reward:{coins:150,xp:240,recipes:['boots']}},
  {id:'e_feathers',giver:'eagle',t:'Feathers on the Wind',short:'Golden feathers',goal:{type:'find',items:[
     {id:'f1',n:'a golden feather',shape:'feather',at:function(){ return dryNear(-60*WS,-60*WS); }},
     {id:'f2',n:'a golden feather',shape:'feather',at:function(){ return dryNear(62*WS,12*WS); }},
     {id:'f3',n:'a golden feather',shape:'feather',at:function(){ return dryNear(-104*WS,40*WS); }},
     {id:'f4',n:'a golden feather',shape:'feather',at:function(){ return dryNear(100*WS,30*WS); }},
     {id:'f5',n:'a golden feather',shape:'feather',at:function(){ return dryNear(28*WS,-82*WS); }},
     {id:'f6',n:'a golden feather',shape:'feather',at:function(){ return dryNear(-40*WS,100*WS); }}]},
   say:'Small hunter. The storm took my feathers and scattered them across the wood: gold, and still warm from the sky. Bring me six, and we will speak further.',
   done:'Good. You look up when others look down. That is rare.',
   reward:{coins:60,xp:180}},
  {id:'e_egg',giver:'eagle',need:'e_feathers',t:'The Stolen Egg',short:'The eagle\'s egg',goal:{type:'find',items:[
     {id:'egg',n:'Ærtheldor\'s egg',shape:'egg',at:function(){ return dryNear(LM.hollow.x+2,LM.hollow.z-2); }}]},
   say:'My last egg was taken. The spinners of the Hollow carried it off in their silk. Bring it home to me.',
   done:'It is cold, but it lives. It needs a warmth that is not mine — and a nest that is whole.',
   reward:{coins:100,xp:240}},
  {id:'e_scale',giver:'eagle',need:'e_egg',t:'Fire for the Egg',short:'A dragon\'s scale',goal:{type:'find',items:[
     {id:'scale',n:'a shed dragon scale',shape:'scale',sneak:1,at:function(){ return {x:CRAG.lair.x-2.5,z:CRAG.lair.z+4.5}; }}]},
   say:'The egg needs fire that does not die. Cinderwing sheds his scales as he sleeps, and they stay warm for a hundred years. Take one. Do not wake him.',
   done:'You walked past the dragon\'s teeth for a stranger\'s child. I will remember it.',
   reward:{coins:120,xp:280}},
  {id:'e_nest',giver:'eagle',need:'e_scale',t:'Mend the Eyrie',short:'Mend the nest',goal:{type:'bring',cost:{wood:6,silk:4,ore:2}},
   say:'The storm broke my nest. Bring wood to rebuild it, silk to bind it and iron to anchor it to the rock, and the egg will have a home.',
   done:'Listen… It cracks. Small hunter, meet Aelfrend. He has chosen you. He will fly with you — and when you call him, he will carry you home to me, or wherever your work lies.',
   reward:{coins:150,xp:320,eagle:1}}
];
var QUEST_BY={}; QUESTS.forEach(function(q){ QUEST_BY[q.id]=q; });
function qState(id){ return WILD.q[id]; }
function qActive(id){ var s=WILD.q[id]; return s&&s.s==='on'; }
function qDone(id){ var s=WILD.q[id]; return s&&s.s==='done'; }
function qProgress(q){
  var g=q.goal, s=WILD.q[q.id]||{};
  if(g.type==='gather') return {have:Math.min(inv(g.item),g.n),need:g.n};
  if(g.type==='find') return {have:(s.got||[]).length,need:g.items.length};
  if(g.type==='deliver') return {have:(s.got||[]).length,need:1};
  var have=0,need=0; for(var k in g.cost){ need+=g.cost[k]; have+=Math.min(inv(k),g.cost[k]); } return {have:have,need:need};
}
function qReady(q){ var pr=qProgress(q); return qActive(q.id)&&pr.have>=pr.need; }
function qProgressText(q){
  var g=q.goal, pr=qProgress(q);
  if(g.type==='gather') return RES[g.item].n+' '+pr.have+' / '+pr.need;
  if(g.type==='find') return pr.have+' of '+pr.need+' found';
  if(g.type==='deliver') return pr.have?'Delivered — go back to '+FOLK[q.giver].name:'Take it to Bram at the Greenleaf';
  return costText(g.cost);
}
/* the quest a giver has for you now: the first not done, if its prerequisite is */
function giverQuest(gid){
  for(var i=0;i<QUESTS.length;i++){ var q=QUESTS[i]; if(q.giver!==gid||qDone(q.id)) continue;
    if(q.need&&!qDone(q.need)) return null; return q; }
  return null;
}
function acceptQuest(q){
  WILD.q[q.id]={s:'on',got:[]}; sfx('pickup'); spawnQuestItems();
  tip('New quest: '+q.t); setTimeout(saveGame,30);
}
function finishQuest(q){
  var g=q.goal, R=q.reward, p=G.player, F=FOLK[q.giver];
  if(g.type==='gather') WILD.inv[g.item]-=g.n;
  if(g.type==='bring') pay(g.cost);
  WILD.q[q.id].s='done';
  var c=Math.round((R.coins||0)*DF().pay); p.coins+=c;
  if(R.xp) gainXp(R.xp,p.x,p.y+2.8,p.z,'+'+R.xp+' XP — '+q.t);
  (R.recipes||[]).forEach(function(r){ WILD.recipes[r]=1; });
  if(R.charm){ WILD.charms[R.charm]=1; recalc(); }
  if(R.compass) WILD.compass=1;
  if(R.lore) loreGet(R.lore,true);
  if(R.eagle){ WILD.eagle=1; spawnPet(); loreGet('aelfrend',true); layoutButtons(); }
  msg('+'+c+' ◉','#ffe08a',p.x,p.y+2.4,p.z,16); sfx('levelup');
  for(var i=G.ents.length-1;i>=0;i--) if(G.ents[i].kind==='qitem'&&G.ents[i].qid===q.id) G.ents.splice(i,1);
  setTimeout(saveGame,60);
}
/* quest items lie in the world while their quest is open */
function spawnQuestItems(){
  QUESTS.forEach(function(q){
    if(!qActive(q.id)||q.goal.type!=='find') return;
    var got=WILD.q[q.id].got||[];
    q.goal.items.forEach(function(it){
      if(got.indexOf(it.id)>=0) return;
      for(var i=0;i<G.ents.length;i++) if(G.ents[i].kind==='qitem'&&G.ents[i].iid===it.id) return;
      var at=it.at(); G.ents.push({kind:'qitem',qid:q.id,iid:it.id,n:it.n,shape:it.shape,sneak:it.sneak,x:at.x,y:H(at.x,at.z),z:at.z,yaw:Math.random()*6.28,t:Math.random()*5,scale:1});
    });
  });
}
function updateQItem(e,dt,pd){
  e.t+=dt;
  if(pd<1.8&&!G.player.dead){
    var s=WILD.q[e.qid]; if(!s) return;
    s.got=s.got||[]; s.got.push(e.iid);
    var q=QUEST_BY[e.qid], pr=qProgress(q);
    msg('Found '+e.n+(pr.need>1?' ('+pr.have+'/'+pr.need+')':''),'#ffe6a0',e.x,e.y+1.8,e.z,15); sfx('discover');
    burst(e.x,e.y+0.8,e.z,22,[1.0,0.86,0.45],{up:3,spread:2,size:0.1,life:1,grav:-1});
    if(pr.have>=pr.need) tip(q.t+': done — go back to '+FOLK[q.giver].name);
    if(e.iid==='satchel') loreGet('hesper');
    if(e.sneak){ var d=findKind('dragon');
      if(d&&d.state==='sleep'&&Math.random()<0.45){ d.state='wake'; d.stT=0; sfx('roar',d.x,d.z); shake(0.7); tip('Cinderwing stirs! Run!'); loreGet('cinderwing'); }
      else if(d&&d.state==='sleep') msg('…he snorts in his sleep…','#d9d2ff',d.x,d.y+4,d.z,15); }
    var i=G.ents.indexOf(e); if(i>=0) G.ents.splice(i,1);
    setTimeout(saveGame,30);
  }
}

/* ---------- talking to the folk ---------- */
function folkScreen(gid,say){
  if(G.state==='play'){ menuOpen('talk'); sfx('click'); }
  var F=FOLK[gid], q=giverQuest(gid), p=G.player, opts=[];
  loreGet(gid==='eagle'?'aertheldor':gid,true);
  var line=say;
  if(!line){
    if(q&&qReady(q)) line='Well? Have you got it?';
    else if(q&&qActive(q.id)) line=gid==='eagle'?'The wind tells me you are not finished.':'Any luck?';
    else if(q) line=q.say;
    else line=gid==='eagle'?(WILD.eagle?'Aelfrend grows strong. Fly well, small hunter.':'The sky is quiet today.'):(gid==='wren'?'The ring\'s been humming all morning. Can you hear it?':'Nothing that needs mending. For once.');
  }
  if(q){
    if(qReady(q)) opts.push({id:'turn',t:'Hand over: '+q.t,d:'Done — '+qProgressText(q),gold:true});
    else if(qActive(q.id)) opts.push({id:'none',t:q.t,d:qProgressText(q),off:true});
    else opts.push({id:'accept',t:'Accept: '+q.t,d:q.short,gold:true});
  }
  if(gid==='wren'&&qDone('w_leaf')) opts.push({id:'craft',t:'Use the workbench',d:'Brew potions and tonics, make charms'});
  if(gid==='eagle'&&WILD.eagle) opts.push({id:'fly',t:'Fly with Aelfrend',d:'Anywhere your work lies'});
  var html='<h1>'+F.name+'</h1><p class="sub">'+F.role+'</p><p class="say">“'+line+'”</p>';
  if(gid!=='eagle') html+=satchelHtml();
  html+='<div class="opts">';
  opts.forEach(function(o){ html+='<button class="opt'+(o.off?' off':'')+(o.gold?' gold':'')+'" data-o="'+o.id+'"'+(o.off?' disabled':'')+'><b>'+o.t+'</b><small>'+o.d+'</small></button>'; });
  html+='</div><button class="btn" id="leave">Back to the wood</button>';
  show(html);
  var els=ui.querySelectorAll('.opt[data-o]');
  for(var i=0;i<els.length;i++) els[i].onclick=function(){ var id=this.getAttribute('data-o');
    if(id==='accept'){ acceptQuest(q); folkScreen(gid,q.say); }
    else if(id==='turn'){ finishQuest(q); folkScreen(gid,q.done); }
    else if(id==='craft') craftScreen(function(){ folkScreen(gid); });
    else if(id==='fly') flyScreen(); };
  document.getElementById('leave').onclick=menuClose;
}
function folkTalk(p,list){
  if(WILD.inCave) return;
  ['wren','tobin'].forEach(function(id){ var e=folkEnt(id);
    if(e&&Math.hypot(e.x-p.x,e.z-p.z)<3.6) list.push({x:e.x,y:e.y,z:e.z,lift:2.5,label:'talk to '+FOLK[id].name.split(' ')[0],tap:'TALK',open:function(){ folkScreen(id); }}); });
  var E=FOLKSITE.eyrie;
  if(Math.hypot(E.x-p.x,E.z-p.z)<6.5) list.push({x:E.x,y:E.top-3,z:E.z,lift:4,label:'speak with Ærtheldor',tap:'SPEAK',open:function(){ folkScreen('eagle'); }});
}
/* Bram's side of Tobin's delivery */
function bramParcel(opts){ if(qActive('t_parcel')&&!(WILD.q.t_parcel.got||[]).length) opts.push({id:'parcel',t:'Hand over Tobin\'s parcel',d:'A new tap for the ale barrel. A year late.',gold:true}); }
function bramParcelDo(){
  WILD.q.t_parcel.got=['parcel']; sfx('coin'); setTimeout(saveGame,30);
  return 'A year! A whole year I\'ve been drinking from a barrel with a cork in it. …Tell him thank you. Don\'t tell him I said so.';
}

/* ---------- where the quests point: minimap marks, and Tobin's compass ---------- */
function questTargets(){
  var out=[], p=G.player, inCv=WILD.inCave;
  // the cave lies off the map: from outside, a target in it is reached through the
  // mouth; from inside, a target outside is reached through the way out
  function add(x,z,label){
    var tc=inCave(x,z);
    if(tc&&!inCv){ x=CRAG.mouth.x; z=CRAG.mouth.z; label='Glimmer Cave'+(WILD.torch?'':' (bring a torch)')+' — '+label; }
    else if(!tc&&inCv){ x=CAVE.exit.x; z=CAVE.exit.z; label='Way out — '+label; }
    for(var i=0;i<out.length;i++) if(Math.abs(out[i].x-x)<0.5&&Math.abs(out[i].z-z)<0.5) return;
    out.push({x:x,z:z,l:label}); }
  QUESTS.forEach(function(q){
    if(!qActive(q.id)) return;
    var F=FOLK[q.giver];
    if(qReady(q)){ add(F.x,F.z,'Back to '+F.name); return; }
    var g=q.goal;
    if(g.type==='find') for(var i=0;i<G.ents.length;i++){ var e=G.ents[i]; if(e.kind==='qitem'&&e.qid===q.id) add(e.x,e.z,q.short); }
    if(g.type==='deliver'){ var k=keeper(); if(k) add(k.x,k.z,'Bram'); }
    var want=g.type==='gather'?[g.item]:(g.type==='bring'?Object.keys(g.cost).filter(function(r){ return inv(r)<g.cost[r]; }):[]);
    if(want.length){ var best=null,bd=1e9;
      for(var j=0;j<G.ents.length;j++){ var n=G.ents[j]; if(n.kind!=='node'||n.t>0||want.indexOf(n.res)<0) continue;
        var d=Math.hypot(n.x-p.x,n.z-p.z)+(inCave(n.x,n.z)===inCv?0:1e5); if(d<bd){ bd=d; best=n; } }
      if(best) add(best.x,best.z,RES[best.res].n); }
  });
  return out;
}
function giverMark(gid){ var q=giverQuest(gid); if(!q) return null; if(qReady(q)) return '?'; if(!qActive(q.id)) return '!'; return null; }
function drawCompass(){
  if(!WILD.compass||G.state!=='play') return;
  var p=G.player, T=questTargets(); if(!T.length) return;
  var best=null,bd=1e9; T.forEach(function(t){ var d=Math.hypot(t.x-p.x,t.z-p.z); if(d<bd){ bd=d; best=t; } });
  if(bd<3) return;
  var dx=best.x-p.x, dz=best.z-p.z, r=rotPt(dx,dz,G.cam.yaw), a=Math.atan2(r.x,-r.y);
  var cx=W/2, cy=DESKTOP?72:Math.max(SAFET+70,82);
  hx.save(); hx.translate(cx,cy); hx.rotate(a);
  hx.fillStyle='rgba(8,11,8,.6)'; hx.beginPath(); hx.arc(0,0,15,0,6.3); hx.fill();
  hx.fillStyle='#ffd76a'; hx.beginPath(); hx.moveTo(0,-12); hx.lineTo(7,6); hx.lineTo(0,2); hx.lineTo(-7,6); hx.closePath(); hx.fill();
  hx.restore();
  hx.textAlign='center'; hx.font='600 12px Georgia,serif';
  var lbl=best.l+' · '+Math.round(bd)+'m';
  hx.fillStyle='rgba(0,0,0,.6)'; hx.fillText(lbl,cx+1,cy+30); hx.fillStyle='#ffe6a0'; hx.fillText(lbl,cx,cy+29);
}

/* ---------- the eagles ---------- */
function spawnPet(){
  if(findPet()) return;
  var p=G.player, E=FOLKSITE.eyrie;
  G.ents.push({kind:'eagle',sub:'pet',name:'Aelfrend',x:p?p.x:E.x,y:(p?p.y:H(E.x,E.z))+6,z:p?p.z:E.z,yaw:0,scale:0.9,t:0,orb:0,state:'follow',cd:3,vx:0,vz:0});
}
function findPet(){ for(var i=0;i<G.ents.length;i++){ var e=G.ents[i]; if(e.kind==='eagle'&&e.sub==='pet') return e; } return null; }
function updateEagle(e,dt){
  e.t+=dt;
  if(e.sub==='great'){                              // Ærtheldor on his eyrie: preens, watches, now and then spreads his wings
    var p0=G.player, pd=Math.hypot(p0.x-e.x,p0.z-e.z);
    e.yaw+=wrapA((pd<40?Math.atan2(p0.x-e.x,p0.z-e.z):Math.PI*0.9)-e.yaw)*Math.min(1,dt*1.5);
    e.flapT-=dt; if(e.flapT<-6-Math.random()*6){ e.flapT=1.6; if(pd<50) sfx('wings',e.x,e.z); }
    return;
  }
  var p=G.player;
  if(G.flight){ e.state='carry'; e.x=p.x; e.z=p.z; e.y=p.y+2.6; e.yaw=p.yaw; return; }
  if(e.state==='carry') e.state='follow';
  var tx,ty,tz,spd;
  if(e.state==='dive'&&e.tgt&&G.ents.indexOf(e.tgt)>=0&&e.tgt.hp>0){
    var T=e.tgt; tx=T.x; tz=T.z; ty=T.y+aimH(T); spd=24;
    if(Math.hypot(tx-e.x,tz-e.z)<1.6&&Math.abs(ty-e.y)<2){
      var dmg=(14+p.level*2.6)*(1+0.15*((G.build.gear||{}).w||0));
      impact(T,Math.sin(e.yaw),Math.cos(e.yaw)); hurtEnemy(T,dmg); sfx('hit',e.x,e.z);
      msg('Aelfrend!','#ffe6a0',e.x,e.y+1,e.z,13);
      e.state='rise'; e.riseT=0.9; e.cd=4.5; e.tgt=null;
    }
  } else {
    if(e.state==='dive') e.state='follow';
    if(e.state==='rise'){ e.riseT-=dt; if(e.riseT<=0) e.state='follow'; }
    e.orb+=dt*0.9; tx=p.x+Math.cos(e.orb)*5; tz=p.z+Math.sin(e.orb)*5; ty=p.y+(WILD.inCave?4:7)+Math.sin(e.t*1.3)*0.6; spd=e.state==='rise'?14:12;
    e.cd-=dt;
    if(e.cd<=0&&!p.dead&&!p.safe){ var best=null,bd=17;
      for(var i=0;i<G.ents.length;i++){ var f=G.ents[i]; if(!FOE[f.kind]||f.boss&&f.state==='sleep'||f.riseT>0) continue;
        var d=Math.hypot(f.x-p.x,f.z-p.z); if(d<bd){ bd=d; best=f; } }
      if(best){ e.state='dive'; e.tgt=best; sfx('wings',e.x,e.z); } else e.cd=1; }
  }
  var dx=tx-e.x, dy=ty-e.y, dz=tz-e.z, L=Math.hypot(dx,dy,dz);
  if(L>40){ e.x=tx; e.y=ty; e.z=tz; }               // catch up after a teleport
  else if(L>0.01){ var m=Math.min(spd,L*3)*dt; e.x+=dx/L*m; e.y+=dy/L*m; e.z+=dz/L*m;
    e.yaw+=wrapA(Math.atan2(dx,dz)-e.yaw)*Math.min(1,dt*5); }
  e.dive=e.state==='dive'?1:0;
}
/* where Aelfrend can carry you */
function flyDests(){
  var d=[{id:'eyrie',n:'Ærtheldor\'s Eyrie',x:FOLKSITE.eyrie.x-7,z:FOLKSITE.eyrie.z-6},
    {id:'tavern',n:'The Greenleaf Tavern',x:TAVERN.door.x+Math.sin(TAVERN.ry)*5,z:TAVERN.door.z+Math.cos(TAVERN.ry)*5},
    {id:'wren',n:'Wren\'s camp',x:FOLK.wren.x+2.5,z:FOLK.wren.z+2},
    {id:'tobin',n:'Tobin\'s cart',x:FOLK.tobin.x-2,z:FOLK.tobin.z+3}];
  if(HOME.owned){ var h=HT(0,5.5); d.push({id:'home',n:'Your cottage',x:h.x,z:h.z}); }
  if(G.found['The Standing Stones']) d.push({id:'stones',n:'The Standing Stones',x:STONES.x+6,z:STONES.z+6});
  return d;
}
function flyScreen(){
  if(!WILD.eagle) return;
  if(G.state==='play') menuOpen('talk');
  var html='<h1>Fly with Aelfrend</h1>';
  if(WILD.inCave){ html+='<p class="say">Aelfrend looks at the rock above you, then at you, and does not say anything. Get outside first.</p><button class="btn" id="leave">All right</button>';
    show(html); document.getElementById('leave').onclick=menuClose; return; }
  html+='<p class="sub">He shrieks, and the wind comes up under his wings. Where to?</p><div class="opts">';
  var p=G.player;
  flyDests().forEach(function(d){ html+='<button class="opt" data-d="'+d.id+'"><b>'+d.n+'</b><small>'+Math.round(Math.hypot(d.x-p.x,d.z-p.z))+'m away</small></button>'; });
  html+='</div><button class="btn alt" id="leave">Stay on the ground</button>';
  show(html);
  var els=ui.querySelectorAll('.opt[data-d]');
  for(var i=0;i<els.length;i++) els[i].onclick=function(){ var id=this.getAttribute('data-d'), D=null;
    flyDests().forEach(function(d){ if(d.id===id) D=d; }); menuClose(); startFlight(D); };
  document.getElementById('leave').onclick=menuClose;
}
function startFlight(D){
  var p=G.player; if(!D) return;
  var dist=Math.hypot(D.x-p.x,D.z-p.z);
  G.flight={sx:p.x,sz:p.z,sy:p.y,tx:D.x,tz:D.z,t:0,dur:clamp(dist/38,2.6,6),name:D.n};
  sfx('wings',p.x,p.z); tip('Aelfrend carries you to '+D.n);
}
function flightUpdate(dt){
  var F=G.flight, p=G.player;
  F.t+=dt/F.dur; var k=Math.min(1,F.t), e=k*k*(3-2*k);
  var x=F.sx+(F.tx-F.sx)*e, z=F.sz+(F.tz-F.sz)*e, base=F.sy+(H(F.tx,F.tz)-F.sy)*e;
  var y=Math.max(base+Math.sin(k*Math.PI)*32, H(x,z)+1.5);
  p.yaw=Math.atan2(F.tx-F.sx,F.tz-F.sz); p.x=x; p.z=z; p.y=y; p.vy=0; p.onGround=false; p.speed=0; p.inv=Math.max(p.inv,0.5);
  if(Math.random()<dt*10) burst(p.x,p.y+2.5,p.z,1,[1,1,1],{up:-1,spread:0.8,size:0.12,life:0.6,grav:0});
  if(k>=1){
    G.flight=null; p.y=H(x,z); p.onGround=true; MREFset=false;
    var n=0; for(var i=0;i<G.ents.length;i++){ var a=G.ents[i]; if(a.kind!=='ally') continue;
      a.x=x+Math.cos(n*2.1)*2.4; a.z=z+Math.sin(n*2.1)*2.4; a.y=H(a.x,a.z); collide(a,0.42); n++; }
    tip('Aelfrend sets you down at '+F.name); sfx('land',0,0,1); setTimeout(saveGame,30);
  }
}

/* ---------- drawing the things of this file ---------- */
function eagleLook(e){
  if(e.sub==='gull') return {body:[0.92,0.92,0.94],dark:[0.55,0.56,0.60],head:[0.97,0.97,0.98],beak:[0.98,0.80,0.25],eye:[0.1,0.1,0.1],tail:[0.95,0.95,0.97]};
  return e.sub==='great'?{body:[0.40,0.27,0.13],dark:[0.26,0.17,0.09],head:[0.96,0.95,0.90],beak:[0.98,0.78,0.22],eye:[0.95,0.70,0.15],tail:[0.92,0.90,0.84]}
    :{body:[0.55,0.40,0.22],dark:[0.36,0.25,0.13],head:[0.85,0.80,0.66],beak:[0.92,0.72,0.25],eye:[0.95,0.70,0.15],tail:[0.55,0.40,0.22]};
}
function nodeRig(out,e,t){
  if(e.t>0) return;
  var c=RES[e.res].col, gl=0.85+0.15*Math.sin(t*3+e.seed);
  switch(e.res){
    case 'herb': for(var i=0;i<5;i++){ var a=i/5*6.283+e.seed;
        out.push(['cone',Math.cos(a)*0.18,0,Math.sin(a)*0.18,Math.cos(a)*0.4,0,Math.sin(a)*-0.4,0.16,0.55,0.08,[0.36,0.58,0.38]]);
        out.push(['blob',Math.cos(a)*0.28,0.5,Math.sin(a)*0.28,0,0,0,0.1,0.08,0.1,[0.85*gl,0.95*gl,0.90*gl]]); } break;
    case 'wood': out.push(['box',0,0.1,0,0,0.4,1.57,0.28,1.3,0.28,[0.45,0.30,0.17]]);
      out.push(['box',0.15,0.3,0,0,-0.6,1.57,0.22,1.1,0.22,[0.52,0.36,0.20]]);
      out.push(['blob',-0.2,0.35,0.2,0,0,0,0.25,0.12,0.25,[0.30,0.48,0.25]]); break;
    case 'ore': out.push(['blobR',0,0,0,0,e.yaw,0,1.0,0.7,0.9,[0.40,0.40,0.42]]);
      for(var k=0;k<4;k++){ var b=k*1.6+e.seed; out.push(['box',Math.cos(b)*0.35,0.25+k*0.08,Math.sin(b)*0.35,0.3,b,0.4,0.16,0.12,0.12,[0.78*gl,0.46*gl,0.30*gl]]); } break;
    case 'silk': out.push(['blobR',0,0,0,0,0,0,0.6,0.5,0.6,c]); out.push(['blobR',0.3,0.3,-0.1,0,0,0,0.35,0.35,0.35,c]); break;
    case 'honey': out.push(['cone',0,0,0,0,e.yaw,0,0.8,0.5,0.8,[0.95*gl,0.72*gl,0.22]]); out.push(['cone',0.25,0.1,0.2,0,0,0,0.5,0.35,0.5,[0.85,0.62,0.18]]); break;
    case 'glowcap': out.push(['tube',0,0,0,0,0,0,0.12,0.35,0.12,[0.80,0.85,0.80]]); out.push(['blob',0,0.3,0,0,0,0,0.45*gl,0.22,0.45*gl,c]);
      out.push(['tube',0.3,0,0.15,0,0,0,0.08,0.22,0.08,[0.80,0.85,0.80]]); out.push(['blob',0.3,0.2,0.15,0,0,0,0.28,0.14,0.28,c]); break;
  }
}
function qitemRig(out,e,t){
  var b=0.55+Math.sin(t*2+e.t)*0.12, gl=0.85+0.15*Math.sin(t*5);
  // a beacon of light so you can spot it from afar
  out.push(['cone',0,0.02,0,0,0,0,0.5,0.04,0.5,[1.0*gl,0.86*gl,0.45*gl]]);
  switch(e.shape){
    case 'feather': out.push(['cone',0,b,0,0.5,e.t*1.5,0.3,0.22,0.95,0.06,[1.0*gl,0.82*gl,0.30]]); out.push(['box',0,b-0.15,0,0.5,e.t*1.5,0.3,0.03,0.4,0.03,[0.95,0.90,0.75]]); break;
    case 'egg': out.push(['blob',0,0.1,0,0.1,0,0.1,0.75,1.0,0.75,[0.88,0.92,0.98]]); out.push(['blobR',0,0,0,0,0,0,1.1,0.4,1.1,[0.92,0.92,0.95]]); break;
    case 'scale': out.push(['blob',0,b-0.3,0,1.0,e.t,0,0.6,0.08,0.7,[0.22*gl+0.2,0.08,0.06]]); out.push(['blob',0,b-0.28,0,1.0,e.t,0,0.4,0.06,0.45,[1.0*gl,0.55*gl,0.15]]); break;
    case 'satchel': out.push(['box',0,0,0,0,e.yaw,0,0.7,0.45,0.35,[0.45,0.30,0.16]]); out.push(['box',0,0.42,0,0,e.yaw,0,0.72,0.1,0.37,[0.36,0.24,0.12]]); break;
    case 'cog': out.push(['tube',0,b,0,1.57,e.t*2,0,0.5,0.12,0.5,[0.88*gl,0.70*gl,0.30]]);
      for(var i=0;i<8;i++){ var a=i/8*6.283; out.push(['box',Math.cos(a)*0.28,b+Math.sin(a)*0.28,0,0,e.t*2,a,0.1,0.12,0.1,[0.85,0.68,0.28]]); } break;
    case 'spring': for(var j=0;j<5;j++) out.push(['tube',0,b-0.25+j*0.11,0,0.2,e.t+j,0,0.36,0.05,0.36,[0.75*gl,0.75*gl,0.80]]); break;
    case 'bell': out.push(['cone8',0,b-0.2,0,0,e.t,0,0.55,0.6,0.55,[0.95*gl,0.78*gl,0.30]]); out.push(['blob',0,b-0.25,0,0,0,0,0.14,0.14,0.14,[0.6,0.45,0.2]]); break;
    case 'lens': out.push(['tube',0,b,0,1.57,e.t*1.5,0,0.45,0.08,0.45,[0.85,0.70,0.30]]); out.push(['blob',0,b-0.2,0,1.57,e.t*1.5,0,0.38,0.05,0.38,[0.70*gl,0.92*gl,1.0]]); break;
  }
}
function drawFolkMarks(){
  // a gold "!" over a quest giver with work for you, a "?" when you're done
  ['wren','tobin','eagle'].forEach(function(gid){ var m=giverMark(gid); if(!m) return;
    var e=gid==='eagle'?{x:FOLKSITE.eyrie.x,y:FOLKSITE.eyrie.top+3.2,z:FOLKSITE.eyrie.z}:folkEnt(gid); if(!e) return;
    var s=project(e.x,(gid==='eagle'?e.y:e.y+2.9),e.z); if(!s||s.d>70) return;
    hx.textAlign='center'; hx.font='700 '+Math.round(Math.max(16,30-s.d*0.2))+'px Georgia,serif';
    hx.fillStyle='rgba(0,0,0,.6)'; hx.fillText(m,s.x+1.5,s.y+1.5); hx.fillStyle=m==='?'?'#9ff07a':'#ffd76a'; hx.fillText(m,s.x,s.y); });
}
/* the quest page that heads the journal */
function questLogHtml(){
  var act=QUESTS.filter(function(q){ return qActive(q.id); }), done=QUESTS.filter(function(q){ return qDone(q.id); }).length;
  var html='<h3>Quests ('+done+' of '+QUESTS.length+' done)</h3><div class="lore">';
  if(!act.length) html+='<div class="lp qp off"><b>— no open quests —</b><p>Wren camps by the fairy ring west of the glade; Tobin\'s cart is stuck on the east road; and far in the south, past the river, something great nests on a pillar of rock.</p></div>';
  act.forEach(function(q){ html+='<div class="lp qp"><b>'+q.t+' <small style="color:#a89873">— '+FOLK[q.giver].name+'</small></b><p>'+q.say+'</p><p style="color:#ffe6a0;margin-top:4px">'+qProgressText(q)+'</p></div>'; });
  html+='</div>'+satchelHtml();
  return html;
}
