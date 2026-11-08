/* ================= legends: the wood's story, its champions and its mini-bosses =================
   A journal that fills as you explore (landmarks, waystones, Bram's tales, the
   things you kill); five named mini-bosses with their own tricks; and golden
   "champion" monsters that turn up in packs on Normal and Hard.
   Loaded before game.js; nothing here runs until the game calls it. */

/* ---------- the journal ---------- */
var LORE=[
  {id:'wood',sec:'The wood',t:"The Elderwood",
   x:"Before the tavern, before the road, the Elderwood belonged to the Sylvani — your kin, the elves of the leaf. They sang the trees tall and kept the dark things small. Then came the Long Weaving: a winter when the spiders rose from the Hollow and strung the singers up in silk, one by one. Most of the Sylvani are gone. Some are only sleeping, hung in the trees. That is why you are here."},
  {id:'weaving',sec:'The wood',t:"The Woven Ones",h:"Cut someone out of a cocoon.",
   x:"The cocoons are not graves. Spider-silk sleeps whoever it binds; cut it and they wake stiff, hungry and furious, and glad to follow anyone who smells of the leaf."},
  {id:'fairies',sec:'The wood',t:"The Last Lights",h:"Catch a fairy.",
   x:"The fairies are what is left of the Sylvani's songs: little knots of music that never finished. Catch one and it lends you a verse — speed, wrath, a ward, a bloom — and then it is gone."},
  {id:'champions',sec:'The wood',t:"Champions",h:"Slay a golden champion.",
   x:"Sometimes a beast drinks from the glimmer-springs, or eats a fairy, or is simply born angry. It comes out bigger, golden, and much harder to kill — and it carries things it has taken."},
  {id:'gnomes',sec:'The wood',t:"The Gnomes",h:"Find a lost gnome.",
   x:"Bram's late wife, Marigold, kept garden gnomes. Seven of them. The winter she died, a fairy crashed into the garden, and in the morning the gnomes were gone — and talking."},
  {id:'marigold',sec:'The wood',t:"Marigold's Garden",h:"Find all seven gnomes.",
   x:"All seven home. Bram set them back along the garden path and sat with them a long while. “She'd have laughed,” he said. “She always said they had opinions.”"},

  {id:'wren',sec:'Folk of the wood',t:"Wren",h:"Someone camps by the fairy ring, west of the glade.",
   x:"Wren was Hesper's apprentice for six summers and still talks to her pots the way Hesper did. She camps by the fairy ring because, she says, it is the only place in the wood that hums in the right key. She is probably right."},
  {id:'tobin',sec:'Folk of the wood',t:"Tobin Cogsworth",h:"A broken cart on the east road.",
   x:"A dwarf tinker who has walked every road in three kingdoms and broken a wheel on most of them. He can mend anything except, apparently, his own cart. He keeps a list of everyone who owes him money. Bram is on it."},
  {id:'aertheldor',sec:'Folk of the wood',t:"Ærtheldor",h:"Far in the south, past the river, a pillar of rock.",
   x:"The Great Eagle of the South is older than the tavern, older than the Burning, perhaps older than the stones. The Sylvani called the eagles the wood's eyes; Ærtheldor is the last who remembers being asked to look. He speaks rarely, and only to people who look up."},
  {id:'aelfrend',sec:'Folk of the wood',t:"Aelfrend",h:"Help Ærtheldor, all the way.",
   x:"Hatched in a nest you mended, warmed by a scale you stole from a dragon. Aelfrend is loud, curious and certain that you are his. He will dive on anything that threatens you — and when you call, he carries you home."},
  {id:'hesper',sec:'Folk of the wood',t:"Hesper's Last Note",h:"Hesper's satchel lies somewhere in the dark.",
   x:"“The singing stone is real. It is deeper than the mine, under the Matron's den, and it hums the waking-song — the one that cuts silk without a blade. I need more light, and more time, and somebody to tell Bram I was right. If you find this, tell Wren she was the best of my jars.”"},
  {id:'tavern',sec:'Places',t:"The Greenleaf Tavern",h:"Follow the path north from the glade.",
   x:"Bram built the Greenleaf on the ruins of a Sylvani waystation — the hearthstone is elf-cut, and on cold nights it still hums. He says he came for the dragon's gold, forty years ago, and stayed for the stew. He does not say what happened on the crag."},
  {id:'hive',sec:'Places',t:"The Wasp Hive",h:"Somewhere south-west, something buzzes.",
   x:"The wasps came after the Burning, the summer Cinderwing first flew. They nested in the dead oak the fire left behind and have been furious about it ever since. Their honey is black and tastes faintly of smoke."},
  {id:'hollow',sec:'Places',t:"The Queen's Hollow",h:"Far to the east, the webs grow thick.",
   x:"The Long Weaving began here. The old Spider Queen spun her court in this sunken ring, and the Sylvani bound her with song beneath the standing stones' gaze. She died bound. Her daughter did not."},
  {id:'stones',sec:'Places',t:"The Stillstones",h:"Six stones stand in the far north-west.",
   x:"Six stones, raised by the first Sylvani to keep the mountain's heart asleep. They drink in what dies near them; when they have drunk enough the runes wake, and the Warden rises to ask whoever touches the altar a single question with its fists: are you strong enough to keep the wood? It does not hate you. It is checking."},
  {id:'cottage',sec:'Places',t:"Hesper's Cottage",h:"A quiet rise past the tavern.",
   x:"The cottage belonged to Hesper, the herb-wife, who made Bram's potions before he learned. One spring she walked toward the crag with a basket and a lantern and did not come back. The notice on the post is in Bram's hand."},
  {id:'crag',sec:'Places',t:"The Dragon's Crag",h:"The cliff north of the tavern. Climb the ramp, if you dare.",
   x:"Once it was Aelthir's Seat, where the elf-kings were crowned under open sky. Now it is Cinderwing's bed. The gold he sleeps on was Aelthir's treasury; the bones are the knights who came to take it back."},
  {id:'cave',sec:'Places',t:"The Glimmer Cave",h:"A crack in the crag's western face. Bring a light.",
   x:"Under the Seat the Sylvani cut glimmerstone — crystal that holds light like a cupped hand. The dragon came for its warmth. The spiders came for the dark. The mine has been quiet for a hundred years, except for the skittering."},
  {id:'hoard',sec:'Places',t:"The Glimmer Hoard",h:"Deep in the cave, something glitters.",
   x:"The miners' strongbox, crusted with crystal. The cave seems to refill it: coins drift in on the damp, from where nobody can say. Bram thinks the glimmerstone is generous. Bram thinks a lot of things."},

  {id:'queen',sec:'Foes of note',t:"Vessa, Queen of the Hollow",h:"She rules the Queen's Hollow.",
   x:"Daughter of the bound Queen, born the night her mother died. Vessa never learned the old songs; she only learned to spin. Every cocoon in the wood is her work, or her children's. She spits silk to slow you, and calls her brood when pressed."},
  {id:'mother',sec:'Foes of note',t:"The Hive Mother",h:"She never leaves the hive.",
   x:"Big as a pony and twice as loud. She has not left her nest since the Burning; her daughters bring her everything, and her daughters are very many. She fires her stings in fans of five."},
  {id:'coil',sec:'Foes of note',t:"Old Coil, the River Adder",h:"He lies in the reeds on the far bank of the river.",
   x:"The river adder was old when Bram was young. Fishermen named him, then stopped fishing. He lies in the reeds like a fallen log until something warm walks close, then strikes from a long way off. His bite burns for a while after."},
  {id:'puffcap',sec:'Foes of note',t:"King Puffcap",h:"His court is a meadow west of the glade.",
   x:"The grumps believe the meadow is a kingdom and that Puffcap is its king. He believes it too. His crown is a bottle cap. He puffs out clouds of stinging spores. Do not, under any circumstances, laugh."},
  {id:'matron',sec:'Foes of note',t:"The Pale Matron",h:"In the deepest den of the Glimmer Cave.",
   x:"In the deep chambers of the mine lives a spider so old she has gone white and blind. She was there before the Weaving. Vessa calls her grandmother and leaves her offerings. Nobody knows what she wants."},
  {id:'warden',sec:'Foes of note',t:"Mossback, the Stone Warden",h:"Wake the standing stones, and break what answers.",
   x:"Mossback is the stones' oldest thought, given a body of boulders. It has been broken many times. It always comes back — with a little more moss and, Bram swears, a few more flowers."},
  {id:'cinderwing',sec:'Foes of note',t:"Cinderwing",h:"Wake whatever sleeps on the crag.",
   x:"He came from the north in the Burning summer, a cinder blown off some greater fire. He ate the king's knights, slept on the king's gold, and has been asleep, mostly, ever since. He is vain about his wings. Do not mention the snoring."},
  {id:'dragonslayer',sec:'Foes of note',t:"Dragonslayer",h:"Slay Cinderwing.",
   x:"You did it. Bram will tell the story for years, and get it wrong every time. But the glimmerstone under the Seat remembers his heat, and the bards say a dragon that dies on gold is never quite done dying. Mind the crag."},

  {id:'bram1',sec:"Bram's tales",t:"The Ramp",h:"Ask Bram for a story.",
   x:"“I went up that ramp once. Forty years ago, new sword, terrible moustache. He didn't even get up. He just opened one eye, and I came down a great deal faster than I went up.”"},
  {id:'bram2',sec:"Bram's tales",t:"The Song",h:"Ask Bram for another.",
   x:"“My gran was half Sylvani. She hummed a tune that made the kettle boil early. When the cocoons first went up she walked into the wood humming it. We found her basket at the Hollow. I still have the basket.”"},
  {id:'bram3',sec:"Bram's tales",t:"The Warden",h:"Ask Bram for another.",
   x:"“The Warden came up once when I was a lad. It stood in the stones and looked at the whole village, and the village looked back, and then it sat down and let the moss grow over it. Some days I think it was only lonely.”"},
  {id:'bram4',sec:"Bram's tales",t:"Hesper",h:"Ask Bram for another.",
   x:"“Hesper said she'd found glimmerstone that sang. Wanted to brew something to wake the woven ones all at once. I told her the cave was madness. I'd give a lot to have been right for a worse reason.”"},

  {id:'way1',sec:'Waystones',t:"The Glade Stone",h:"A carved stone near the glade where you woke.",
   x:"THIS WOOD WAS SUNG. IT WILL BE SUNG AGAIN. — old Sylvani letters, worn almost smooth by hands."},
  {id:'way2',sec:'Waystones',t:"The North Road Stone",h:"At the foot of the crag's ramp.",
   x:"TO AELTHIR'S SEAT, WHERE KINGS STAND UNDER SKY. Scratched beneath it, much more recently: “and dragons sit on them.”"},
  {id:'way3',sec:'Waystones',t:"The East Path Stone",h:"On the high ground toward the Hollow.",
   x:"WHERE THE QUEEN WAS BOUND, WALK SOFTLY. A spider has spun a web across the words, very neatly, like a correction."},
  {id:'way4',sec:'Waystones',t:"The River Stone",h:"On the far bank of the river, due south.",
   x:"THE RIVER REMEMBERS. Underneath, in charcoal: “so does the snake.”"},
  {id:'way5',sec:'Waystones',t:"The Meadow Stone",h:"In the meadow west of the glade.",
   x:"HERE THE LAST SINGER DANCED. The grass round the stone grows in a perfect ring, and the grumps will not step inside it."}
];
var LORE_BY={}; LORE.forEach(function(l){ LORE_BY[l.id]=l; });
function loreCount(){ var n=0; for(var k in WILD.lore) if(WILD.lore[k]&&LORE_BY[k]) n++; return n; }
function loreGet(id,quiet){
  if(!LORE_BY[id]||WILD.lore[id]) return false;
  WILD.lore[id]=1;
  if(!quiet){ var p=G.player; if(p) msg('✎ Journal: '+LORE_BY[id].t,'#d8c9ff',p.x,p.y+3.2,p.z,15); sfx('pickup'); G.loreNew=(G.loreNew||0)+1; }
  setTimeout(saveGame,60);
  return true;
}
function journalScreen(back){
  var from=G.state;
  if(G.state==='play') menuOpen('skills');
  G.loreNew=0;
  var secs=[], by={};
  LORE.forEach(function(l){ if(!by[l.sec]){ by[l.sec]=[]; secs.push(l.sec); } by[l.sec].push(l); });
  var html='<h1>Journal</h1><p class="sub">'+loreCount()+' of '+LORE.length+' pages written</p>'+(typeof questLogHtml==='function'?questLogHtml():'');
  secs.forEach(function(sname){
    html+='<h3>'+sname+'</h3><div class="lore">';
    by[sname].forEach(function(l){
      if(WILD.lore[l.id]) html+='<div class="lp"><b>'+l.t+'</b><p>'+l.x+'</p></div>';
      else html+='<div class="lp off"><b>— an empty page —</b><p>'+(l.h||'')+'</p></div>';
    });
    html+='</div>';
  });
  html+='<button class="btn" id="jclose">'+(back?'Back':'Back to the wood')+'</button>';
  show(html);
  document.getElementById('jclose').onclick=function(){ if(back) back(); else menuClose(); };
}
/* Bram's stories, one at a time */
function bramStory(){
  for(var i=1;i<=4;i++){ var id='bram'+i; if(!WILD.lore[id]){ loreGet(id,true); return LORE_BY[id].x; } }
  var any=['bram1','bram2','bram3','bram4'][(Math.random()*4)|0];
  return 'You\'ve heard all mine. Here — my favourite again. '+LORE_BY[any].x;
}
/* the carved waystones */
function waystoneScreen(w){
  menuOpen('talk'); sfx('click');
  var l=LORE_BY[w.id], fresh=loreGet(w.id,true);
  if(fresh) gainXp(40,w.x,(w.y||0)+3,w.z,'+40 XP — a waystone');
  show('<h1>'+l.t+'</h1><p class="sub">A standing slab, carved and mossy</p><p class="say">'+l.x+'</p>'+
    (fresh?'<p class="sub">✎ Written in your journal.</p>':'')+'<button class="btn" id="leave">Walk on</button>');
  document.getElementById('leave').onclick=menuClose;
}
var LANDLORE={eyrie:'aertheldor',tavern:'tavern',hive:'hive',hollow:'hollow',stones:'stones',cottage:'cottage',crag:'crag',cave:'cave'};

/* ---------- mini-bosses ----------
   Named monsters with a home they guard and a trick of their own. Beaten, they
   come back after eight minutes. They wear the same models as their kin, scaled up. */
var MINI_RESPAWN=480;
var MINIS=[
  {id:'queen', kind:'spider', name:'Vessa, Queen of the Hollow', at:function(){ return {x:LM.hollow.x,z:LM.hollow.z}; }, scale:2.2, hp:720, dmg:15, tint:[0.30,0.08,0.30], tricks:['brood','web']},
  {id:'mother',kind:'wasp',   name:'The Hive Mother',            at:function(){ return {x:LM.hive.x+3,z:LM.hive.z-2}; }, scale:2.0, hp:520, dmg:11, tricks:['volley','swarm']},
  {id:'coil',  kind:'snake',  name:'Old Coil, the River Adder',  at:function(){ return dryNear(40*WS,61*WS); },  scale:2.6, hp:650, dmg:19, tricks:['lunge']},
  {id:'puffcap',kind:'shroom',name:'King Puffcap',               at:function(){ return dryNear(-56*WS,-34*WS); }, scale:2.6, hp:560, dmg:13, cap:[0.70,0.20,0.62], tricks:['spores','court']},
  {id:'matron',kind:'spider', name:'The Pale Matron',            at:function(){ return {x:CAVE.x-4,z:CAVE.z+24}; }, scale:2.3, hp:860, dmg:17, tint:[0.82,0.82,0.86], cave:1, tricks:['brood','web']}
];
var MINI_BY={}; MINIS.forEach(function(m){ MINI_BY[m.id]=m; });
function spawnMini(def){
  var q=def.at();
  if(def.kind==='spider') spawnSpider(q.x,q.z,false);
  else if(def.kind==='snake') spawnSnake(q.x,q.z);
  else if(def.kind==='wasp') spawnWasp(q.x,q.z);
  else spawnShroom(q.x,q.z);
  var e=G.ents[G.ents.length-1];
  e.mini=def.id; e.name=def.name; e.scale=def.scale;
  e.hp=e.maxHp=def.hp*bossLevel()*DF().hp; e.dmg=lvlDmg(def.dmg); e.aggro=19;
  e.home={x:q.x,z:q.z}; e.abT=3; e.ab2=6; e.tricks=def.tricks;
  if(def.tint) e.look.body=def.tint.slice();
  if(def.cap){ e.look.cap=def.cap; e.crown=1; }
  if(def.cave){ e.cave=1; e.look.eye=[0.6,0.9,1.0]; }
  if(def.kind==='wasp') e.hover=1.25;
  return e;
}
function miniAlive(id){ for(var i=0;i<G.ents.length;i++) if(G.ents[i].mini===id) return true; return false; }
function spawnMinis(){ MINIS.forEach(function(d){ if(!(WILD.minis[d.id]>0)&&!miniAlive(d.id)) spawnMini(d); }); }
function minisTick(dt){
  var p=G.player;
  MINIS.forEach(function(d){ if(!(WILD.minis[d.id]>0)) return;
    WILD.minis[d.id]-=dt;
    if(WILD.minis[d.id]<=0&&!miniAlive(d.id)){ var q=d.at();
      if(Math.hypot(q.x-p.x,q.z-p.z)>55) spawnMini(d); else WILD.minis[d.id]=5; }   // not in front of you
  });
}
function minionCount(id){ var n=0; for(var i=0;i<G.ents.length;i++) if(G.ents[i].minion===id) n++; return n; }
/* the tricks: called each frame while the mini-boss is fighting you.
   Returns true when it has taken over movement this frame (a lunge). */
function miniAct(e,dt,tgt,tdist){
  var p=G.player, D=DF(), T=e.tricks||[];
  e.abT-=dt; e.ab2-=dt;
  if(e.lungeT>0){                                    // Old Coil's strike from a long way off
    e.lungeT-=dt; var sp=20*D.spd; e.x+=Math.sin(e.lungeDir)*sp*dt; e.z+=Math.cos(e.lungeDir)*sp*dt; e.speed=sp; e.walkPhase+=dt*sp;
    collide(e,bodyR(e)); e.y=H(e.x,e.z);
    if(!e.lungeHit&&Math.hypot(p.x-e.x,p.z-e.z)<2.2+e.scale){ e.lungeHit=1; hurtPlayer(e.dmg*1.3,e.name); p.poisonT=Math.max(p.poisonT||0,4); sfx('bite',e.x,e.z); }
    if(e.lungeT<=0) e.speed=0;
    return true;
  }
  if(T.indexOf('lunge')>=0&&e.abT<=0&&tdist>4.5&&tdist<13&&tgt===p){
    e.abT=4.5*D.cd; e.lungeT=0.5; e.lungeHit=0; e.lungeDir=Math.atan2(p.x-e.x,p.z-e.z); e.yaw=e.lungeDir; sfx('rattle',e.x,e.z);
    msg('!','#ff7a5a',e.x,e.y+3*e.scale,e.z,24); return true;
  }
  if(T.indexOf('web')>=0&&e.abT<=0&&tdist>4&&tdist<20){       // a gob of silk that slows you
    e.abT=5*D.cd; var wy=e.y+1.2*e.scale, gx=p.x-e.x, gz=p.z-e.z, gy=p.y+1-wy, gl=Math.hypot(gx,gy,gz)||1;
    G.ents.push({kind:'eshot',x:e.x+gx/gl*2,y:wy,z:e.z+gz/gl*2,proj:'web',vx:gx/gl*17,vy:gy/gl*17,vz:gz/gl*17,life:2.5,aimed:1,dmg:e.dmg*0.4,slow:2.6,src:e.name});
    sfx('hissup',e.x,e.z);
  }
  if(T.indexOf('brood')>=0&&e.ab2<=0&&minionCount(e.mini)<6){  // her children come running
    e.ab2=8*D.cd; msg('Children!','#d9a0ff',e.x,e.y+3*e.scale,e.z,16);
    for(var b=0;b<2+(D===DIFFS.hard?1:0);b++){ var a=Math.random()*6.28;
      spawnSpider(e.x+Math.cos(a)*3,e.z+Math.sin(a)*3,false); var s=G.ents[G.ents.length-1];
      s.scale=0.5; s.hp=s.maxHp=lvlHp(10)*D.hp; s.minion=e.mini; s.aggro=30; if(e.cave){ s.cave=1; s.look.body=[0.62,0.62,0.68]; } }
  }
  if(T.indexOf('volley')>=0&&e.abT<=0&&tdist<24){              // a fan of five stings
    e.abT=4.2*D.cd; e.atkT=0.4; e.atkDur=0.4; sfx('sting',e.x,e.z);
    var wy2=e.y+aimH(e)-0.25, base=Math.atan2(tgt.x-e.x,tgt.z-e.z), hd=tdist||1, dy=((tgt.y+1.1)-wy2)/hd;
    for(var k=-2;k<=2;k++){ var yaw=base+k*0.16, vx=Math.sin(yaw), vz=Math.cos(yaw), l=Math.hypot(vx,dy,vz);
      G.ents.push({kind:'eshot',x:e.x+vx*1.5,y:wy2,z:e.z+vz*1.5,proj:'sting',vx:vx/l*21,vy:dy/l*21,vz:vz/l*21,life:2.4,aimed:1,dmg:e.dmg*0.8,src:e.name}); }
  }
  if(T.indexOf('swarm')>=0&&e.ab2<=0&&minionCount(e.mini)<5){
    e.ab2=11*D.cd; for(var w=0;w<2;w++){ spawnWasp(e.x+(Math.random()-0.5)*4,e.z+(Math.random()-0.5)*4); var ws=G.ents[G.ents.length-1]; ws.minion=e.mini; ws.aggro=34; }
    sfx('waspdie',e.x,e.z); msg('The hive answers!','#ffd36a',e.x,e.y+3*e.scale,e.z,16);
  }
  if(T.indexOf('spores')>=0){                                  // puffs up, then bursts a stinging cloud
    if(e.puffT>0){ e.puffT-=dt; e.speed=0;
      if(Math.random()<dt*20) burst(e.x,e.y+1.5*e.scale,e.z,2,[0.95,0.60,0.90],{up:1,spread:1,size:0.2,life:0.5,grav:-1});
      if(e.puffT<=0){ var R=5.5; shake(0.25); sfx('boom',e.x,e.z);
        burst(e.x,e.y+1,e.z,40,[0.92,0.55,0.86],{up:2.5,spread:6,size:0.35,life:1.4,grav:-0.6});
        if(Math.hypot(p.x-e.x,p.z-e.z)<R){ hurtPlayer(e.dmg*0.9,e.name+'\'s spores'); p.poisonT=Math.max(p.poisonT||0,4); }
        for(var ai=0;ai<G.ents.length;ai++){ var al=G.ents[ai]; if(al.kind==='ally'&&Math.hypot(al.x-e.x,al.z-e.z)<R) al.hp-=e.dmg*0.6*D.dmg; } }
      return true;
    }
    if(e.abT<=0&&tdist<9){ e.abT=6*D.cd; e.puffT=0.9; e.wind=0; e.windFull=0.9; msg('*puff*','#ffc0f0',e.x,e.y+3*e.scale,e.z,16); }
  }
  if(T.indexOf('court')>=0&&e.ab2<=0&&minionCount(e.mini)<6){
    e.ab2=10*D.cd; for(var c=0;c<2;c++){ spawnShroom(e.x+(Math.random()-0.5)*5,e.z+(Math.random()-0.5)*5); var g=G.ents[G.ents.length-1]; g.minion=e.mini; g.aggro=30; }
    msg('To the King!','#ffb0e0',e.x,e.y+3*e.scale,e.z,16);
  }
  return false;
}
function miniDown(e){
  var p=G.player, pay=DF().pay, c=Math.round(110*pay);
  p.coins+=c; p.potions++; WILD.minis[e.mini]=MINI_RESPAWN; WILD.trophies=(WILD.trophies||0)+1;
  gainXp(300,e.x,e.y+3,e.z,'+300 XP — '+e.name.split(',')[0]+' slain');
  msg('+'+c+' ◉  +1 potion','#ffe08a',e.x,e.y+2.4,e.z,17);
  tip(e.name+' is slain!'); sfx('levelup'); shake(0.4);
  burst(e.x,e.y+1.5,e.z,40,[1.0,0.86,0.42],{up:5,spread:4,size:0.16,life:1.3,grav:-1});
  loreGet(e.mini);
  if(e.mini==='queen'||e.mini==='matron') for(var i=G.ents.length-1;i>=0;i--) if(G.ents[i].minion===e.mini) G.ents[i].aggro=8;
  setTimeout(saveGame,80);
}

/* ---------- champions: golden elites that turn up on Normal and Hard ---------- */
var CHAMPNAME={spider:'Champion Spider',snake:'Champion Snake',wasp:'Champion Wasp',shroom:'Champion Grump'};
function makeChampion(e){
  if(!e||e.mini||e.elite||!CHAMPNAME[e.kind]) return;
  e.elite=1; e.name=CHAMPNAME[e.kind]; e.scale=(e.scale||1)*1.4;
  e.hp*=3.2; e.maxHp*=3.2; e.dmg*=1.6; e.aggro*=1.3;
  if(e.kind==='spider'){ e.look.body=[0.55,0.40,0.12]; e.look.eye=[1.0,0.85,0.3]; }
  if(e.kind==='shroom') e.look.cap=[0.95,0.75,0.20];
}
function championDown(e){
  var p=G.player, c=Math.round(25*DF().pay);
  p.coins+=c; if(Math.random()<0.5) p.potions++;
  gainXp(100,e.x,e.y+2.6,e.z,'+100 XP — a champion');
  msg('+'+c+' ◉','#ffe08a',e.x+0.6,e.y+1.8,e.z,14);
  loreGet('champions');
}
function seedChampions(){
  var n=DF().elites, foes=G.ents.filter(function(e){ return FOE[e.kind]&&!e.mini&&!e.boss&&!e.cave&&!e.elite&&CHAMPNAME[e.kind]; });
  for(var i=0;i<n&&foes.length;i++){ var k=(Math.random()*foes.length)|0; makeChampion(foes[k]); foes.splice(k,1); }
}
/* the glint that marks a champion or mini-boss */
function eliteGlow(e,dt){
  if((e.elite||e.mini)&&Math.random()<dt*(e.mini?5:3))
    burst(e.x+(Math.random()-0.5)*e.scale,e.y+0.3+Math.random()*e.scale*1.2,e.z+(Math.random()-0.5)*e.scale,1,e.mini?[0.90,0.70,1.0]:[1.0,0.84,0.38],{up:1.2,spread:0.2,size:0.08,life:0.9,grav:-1});
}

/* ---------- what you can walk up to ---------- */
function legendTalk(p,list){
  if(WILD.inCave) return;
  for(var i=0;i<WAYSTONES.length;i++){ var w=WAYSTONES[i];
    if(Math.hypot(w.x-p.x,w.z-p.z)<2.8) list.push({x:w.x,y:w.y||H(w.x,w.z),z:w.z,lift:3.0,label:WILD.lore[w.id]?'read the waystone again':'read the waystone',tap:'READ',
      open:(function(ww){ return function(){ waystoneScreen(ww); }; })(w)}); }
}
