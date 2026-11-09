/* ================= gear: slots, loot, the bag and the character sheet =================
   Five slots (weapon, head, shoulders, chest, trinket) and five rarities, each a
   step up. Made for young players: there are no stats to compare, only tiers. Loot
   drops as a glowing bag you walk over; anything better than what you wear goes on
   at once (the old piece goes in your bag), anything else waits in the bag to equip
   or sell. Bram's cousin sells up to rare; epic and legendary pieces only come off
   the wood's fiercest beasts. Each slot shows on your hunter (see models.js). */

var RARITY=[null,
  {n:'Common',   c:'#e6e2d8', rgb:[0.90,0.88,0.84]},
  {n:'Uncommon', c:'#62d862', rgb:[0.38,0.85,0.38]},
  {n:'Rare',     c:'#5aa6ff', rgb:[0.35,0.62,1.0]},
  {n:'Epic',     c:'#c07aff', rgb:[0.72,0.45,1.0]},
  {n:'Legendary',c:'#ffa33a', rgb:[1.0,0.62,0.20]}];
var SLOTS=['weapon','head','shoulders','chest','trinket'];
var SLOTNAME={weapon:'Weapon',head:'Head',shoulders:'Shoulders',chest:'Chest',trinket:'Trinket'};
var LEGEND={weapon:{warrior:"Cinderwing's Fang",rogue:"Aelthir's Whisper",wizard:'Staff of the Last Light'},
  head:'Crown of Aelthir', shoulders:"Mossback's Mantle", chest:'Heartwood Plate', trinket:"Marigold's Locket"};
var PREFIX=['','Sturdy','Honed','Masterwork','Elvensteel',''];
function baseName(slot,tier){
  var cls=G.build.cls;
  if(slot==='weapon') return cls==='warrior'?'Axe':(cls==='wizard'?'Staff':'Blade');
  if(slot==='head') return tier<2?'Cap':(tier<4?'Helm':'Circlet');
  if(slot==='shoulders') return 'Pauldrons';
  if(slot==='chest') return tier<2?'Jerkin':'Breastplate';
  return ['Charm','Pendant','Lucky Acorn','Rune Stone'][(Math.random()*4)|0];
}
function makeItem(slot,tier){
  tier=clamp(tier|0,1,5);
  var nm=tier===5?(slot==='weapon'?LEGEND.weapon[G.build.cls]:LEGEND[slot]):(PREFIX[tier]+' '+baseName(slot,tier)).trim();
  return {id:(Math.random()*1e9|0).toString(36),slot:slot,tier:tier,n:nm,cls:slot==='weapon'?G.build.cls:undefined};
}
function itemStat(it){
  var t=it.tier;
  if(it.slot==='weapon') return '+'+(t*15)+'% damage';
  if(it.slot==='trinket') return '+'+(t*8)+' health, +'+(t*3)+'% damage';
  return '+'+(t*7)+' health, '+(t*2)+'% less harm';
}
function equipped(slot){ return (G.build.items||{})[slot]||null; }
function tierOf(slot){ var it=equipped(slot); return it?it.tier:0; }
function isBetter(it){ return it.tier>tierOf(it.slot)&&(it.slot!=='weapon'||!it.cls||it.cls===G.build.cls); }
/* the old two-number gear (and anything still reading it) is kept in step */
function gearSync(){
  var h=tierOf('head'), s=tierOf('shoulders'), c=tierOf('chest');
  G.build.gear={w:tierOf('weapon'),a:Math.max(h,s,c,tierOf('trinket')),h:h,s:s,c:c};
}
/* what your gear adds, folded into the hunter by recalc */
function gearStats(S){
  var w=tierOf('weapon'), tr=tierOf('trinket'), arm=tierOf('head')+tierOf('shoulders')+tierOf('chest');
  S.maxHp+=arm*7+tr*8;
  S.melee*=(1+0.15*w)*(1+0.03*tr); S.ranged*=(1+0.15*w)*(1+0.03*tr);
  S.armor*=Math.pow(0.98,arm);
}
function equip(it){
  var old=equipped(it.slot);
  G.build.items[it.slot]=it;
  var i=G.build.bag.indexOf(it); if(i>=0) G.build.bag.splice(i,1);
  if(old) G.build.bag.push(old);
  gearSync(); recalc();
}
function sellPrice(it){ return it.tier*it.tier*6+4; }
function sell(it){ var i=G.build.bag.indexOf(it); if(i<0) return 0; G.build.bag.splice(i,1); var c=sellPrice(it); G.player.coins+=c; return c; }
/* for a new hunter, or one from before items existed */
function gearInit(sv){
  G.build.items={}; G.build.bag=[];
  if(sv&&sv.items){ G.build.items=sv.items; G.build.bag=sv.bag||[]; }
  else if(sv&&sv.gear){                     // an old save: its two gear tiers become pieces
    if(sv.gear.w) G.build.items.weapon=makeItem('weapon',sv.gear.w);
    if(sv.gear.a) ['head','shoulders','chest'].forEach(function(s){ G.build.items[s]=makeItem(s,sv.gear.a); });
  }
  gearSync();
}
/* for the tests and the shop: wear a whole set of one tier */
function equipTiers(t){
  G.build.items={}; if(t>0) SLOTS.forEach(function(s){ if(s!=='trinket') G.build.items[s]=makeItem(s,t); });
  gearSync(); recalc();
}

/* ---------- loot ---------- */
function rollTier(base,upChance){ return Math.min(5,base+(Math.random()<upChance?1:0)); }
function rollSlot(){ var r=Math.random()*5.2; return r<1.2?'weapon':SLOTS[1+Math.min(3,((r-1.2)|0))]; }
function lootFor(e){
  if(e.kind==='dragon') return [makeItem(rollSlot(),rollTier(4,0.5)),makeItem(rollSlot(),3)];
  if(e.kind==='golem') return [makeItem(rollSlot(),rollTier(4,0.3))];
  if(e.mini) return [makeItem(rollSlot(),rollTier(3,0.35))];
  if(e.elite) return Math.random()<0.4?[makeItem(rollSlot(),rollTier(2,0.3))]:[];
  return Math.random()<0.025?[makeItem(rollSlot(),rollTier(1,0.25))]:[];
}
function dropLoot(e){
  lootFor(e).forEach(function(it,i){ var a=Math.random()*6.28, x=e.x+Math.cos(a)*(1+i), z=e.z+Math.sin(a)*(1+i);
    G.ents.push({kind:'loot',item:it,x:x,y:H(x,z),z:z,t:0,yaw:a,scale:1}); });
}
function takeItem(it){
  var p=G.player, R=RARITY[it.tier];
  if(isBetter(it)){ var old=equipped(it.slot); equip(it);
    msg('▲ '+it.n,R.c,p.x,p.y+2.8,p.z,17); logLine('Equipped: '+it.n+' ('+R.n+') ▲',R.c); sfx('levelup');
    if(it.tier>=4) tip(R.n+'! '+it.n);
  } else { G.build.bag.push(it); msg('+ '+it.n,R.c,p.x,p.y+2.6,p.z,14); logLine('In your bag: '+it.n+' ('+R.n+')',R.c); sfx('pickup'); }
  setTimeout(saveGame,40);
}
function updateLoot(e,dt,pd){
  e.t+=dt;
  if(pd<1.9&&!G.player.dead&&e.t>0.4){ takeItem(e.item); var i=G.ents.indexOf(e); if(i>=0) G.ents.splice(i,1);
    burst(e.x,e.y+0.8,e.z,18,RARITY[e.item.tier].rgb,{up:3,spread:2,size:0.1,life:0.9,grav:-1}); }
}
function lootRig(out,e,t){
  var c=RARITY[e.item.tier].rgb, b=Math.sin(t*3+e.yaw)*0.08;
  out.push(['blobR',0,b,0,0,e.yaw+t*0.5,0,0.7,0.6,0.6,[0.55,0.40,0.24]]);
  out.push(['tube',0,0.5+b,0,0,0,0,0.3,0.14,0.3,[0.40,0.28,0.16]]);
  out.push(['blob',0,0.62+b,0,0,0,0,0.16,0.16,0.16,c]);
  // a beam of its rarity's colour, taller the rarer
  out.push(['box',0,0,0,0,t*0.8,0,0.08,1.2+e.item.tier*0.8,0.08,c]);
  if(!(typeof LOD!=='undefined'&&LOD)) for(var i=0;i<3;i++){ var a=t*2+i*2.09;
    out.push(['box',Math.cos(a)*0.6,0.7+Math.sin(t*3+i)*0.3,Math.sin(a)*0.6,a,a,0,0.07,0.07,0.07,c]); }
}

/* ---------- Bram's cousin's forge: up to rare ---------- */
var SHOP_PRICE={weapon:[40,85,150],head:[20,45,80],shoulders:[20,45,80],chest:[25,55,95]};
function shopScreen(say){
  var p=G.player, html='<h1>The forge</h1><p class="sub">Bram\'s cousin works it out back · ◉ '+p.coins+'</p>'+
    '<p class="say">'+(say||'“I can make you anything up to a good blue. The purple and the gold? Those you\'ll have to take off something that bites.”')+'</p><div class="opts">';
  ['weapon','head','shoulders','chest'].forEach(function(s){
    var t=tierOf(s), next=t+1, cur=equipped(s);
    if(next>3){ html+='<button class="opt off" disabled><b>'+SLOTNAME[s]+': '+(cur?cur.n:'—')+'</b><small>Beyond the forge: hunt for better</small></button>'; return; }
    var price=SHOP_PRICE[s][next-1], off=p.coins<price, R=RARITY[next];
    html+='<button class="opt'+(off?' off':'')+'" data-g="'+s+'"'+(off?' disabled':'')+'><b>'+SLOTNAME[s]+': <span style="color:'+R.c+'">'+R.n+'</span> — '+price+' ◉</b><small>'+
      (cur?'Now: '+cur.n+' · ':'')+itemStat({slot:s,tier:next})+(off?' · not enough coin':'')+'</small></button>';
  });
  html+='</div><button class="btn alt" id="gsheet">Your gear and bag</button><button class="btn alt" id="gback">Back to the counter</button>';
  show(html);
  var els=ui.querySelectorAll('.opt[data-g]');
  for(var i=0;i<els.length;i++) els[i].onclick=function(){ var s=this.getAttribute('data-g'), next=tierOf(s)+1, price=SHOP_PRICE[s][next-1];
    if(next>3||p.coins<price) return; p.coins-=price; equip(makeItem(s,next)); sfx('freed'); saveGame();
    shopScreen(s==='weapon'?'“Feel the balance on that. Sharp as winter.”':'“That\'ll turn a fang or two.”'); };
  document.getElementById('gsheet').onclick=function(){ gearSheet(function(){ shopScreen(); }); };
  document.getElementById('gback').onclick=function(){ keeperScreen(); };
}

/* ---------- the character sheet ---------- */
function itemHtml(it,extra){ var R=RARITY[it.tier]; return '<b style="color:'+R.c+'">'+it.n+'</b><small>'+R.n+' '+SLOTNAME[it.slot].toLowerCase()+' · '+itemStat(it)+(extra||'')+'</small>'; }
function gearSheet(back,say){
  if(G.state==='play') menuOpen('skills');
  var p=G.player, html='<h1>Your gear</h1><p class="sub">'+RACES[G.build.race].name+' '+CLASSES[G.build.cls].name+', level '+p.level+' · ◉ '+p.coins+'</p>'+(say?'<p class="say">'+say+'</p>':'')+
    '<div class="stat"><span>Health</span><b>'+G.S.maxHp+'</b></div>'+
    '<div class="stat"><span>Melee / ranged</span><b>'+Math.round(G.S.melee*100)+'% / '+Math.round(G.S.ranged*100)+'%</b></div>'+
    '<h3>Wearing</h3><div class="opts">';
  SLOTS.forEach(function(s){ var it=equipped(s);
    html+='<div class="opt slot">'+(it?itemHtml(it):'<b style="color:#8a7a5a">'+SLOTNAME[s]+': empty</b><small>'+(s==='trinket'?'Trinkets come off champions and bosses':'The forge sells these')+'</small>')+'</div>'; });
  var charms=Object.keys(WILD.charms||{}).filter(function(k){ return WILD.charms[k]&&RECIPE_BY[k]; });
  if(charms.length) html+='<div class="opt slot"><b style="color:#d8c9ff">Charms</b><small>'+charms.map(function(k){ return RECIPE_BY[k].n; }).join(' · ')+'</small></div>';
  html+='</div><h3>Your bag ('+G.build.bag.length+')</h3><div class="opts">';
  if(!G.build.bag.length) html+='<div class="opt off"><b>Empty</b><small>Loot you don\'t need goes here. Beat champions and bosses to find some.</small></div>';
  G.build.bag.slice().sort(function(a,b){ return b.tier-a.tier; }).forEach(function(it){
    var better=isBetter(it), k=G.build.bag.indexOf(it);
    html+='<div class="opt bag">'+itemHtml(it,better?' · <span style="color:#9ff07a">▲ Better!</span>':' · not better')+
      '<span class="bagbtns">'+(better?'<button class="mini" data-e="'+k+'">Equip</button>':'')+'<button class="mini alt" data-s="'+k+'">Sell '+sellPrice(it)+' ◉</button></span></div>'; });
  html+='</div>';
  var junk=G.build.bag.filter(function(it){ return !isBetter(it); });
  if(junk.length) html+='<button class="btn alt" id="selljunk">Sell everything not better (+'+junk.reduce(function(a,it){ return a+sellPrice(it); },0)+' ◉)</button>';
  html+='<button class="btn" id="gclose">'+(back?'Back':'Back to the wood')+'</button>';
  show(html);
  var e1=ui.querySelectorAll('[data-e]'); for(var i=0;i<e1.length;i++) e1[i].onclick=function(){ var it=G.build.bag[+this.getAttribute('data-e')]; if(it){ equip(it); sfx('freed'); saveGame(); gearSheet(back,'You put on the '+it.n+'.'); } };
  var e2=ui.querySelectorAll('[data-s]'); for(var j=0;j<e2.length;j++) e2[j].onclick=function(){ var it=G.build.bag[+this.getAttribute('data-s')]; if(it){ var c=sell(it); sfx('coin'); saveGame(); gearSheet(back,'Sold for '+c+' coins.'); } };
  var sj=document.getElementById('selljunk'); if(sj) sj.onclick=function(){ var c=0; junk.forEach(function(it){ c+=sell(it); }); sfx('coin'); saveGame(); gearSheet(back,'Sold for '+c+' coins.'); };
  document.getElementById('gclose').onclick=function(){ if(back) back(); else menuClose(); };
}
