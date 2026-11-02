/* ================= animated character models =================
   KayKit Adventurers (CC0, Kay Lousberg). The five characters share one
   skeleton, so one set of clips (anims.glb) drives all of them.

   The nearest humanoids get a real skinned, animated model ("actor"); the rest
   keep the cheap instanced primitive rig from chars.js, which is also what
   draws them while the models are still loading.

   The monsters are Quaternius's animated spider, snake and wasp (CC0), each on its
   own rig with its own clips, sharing the same actor pool. */

var MODELS={}, CLIPS={}, MODELS_READY=false;
var MODEL_H=1.95;                 // the hunter's height in world units
var ACTOR_MAX=16, ACTOR_RANGE=42;
/* how big each monster stands at scale 1: measured across (x) or up (y) */
var CREATURES={
  spider:{axis:'x',size:3.1,walk:'Walk',idle:'Idle',flinch:'Jump',tint:true},
  snake: {axis:'y',size:1.45,walk:'Walk',idle:'Idle',flinch:'Jump'},
  wasp:  {axis:'x',size:1.75,walk:'Flying',idle:'Flying',center:true}     // hangs centred on its hover height
};

function b64buf(s){
  var bin=atob(s), n=bin.length, u=new Uint8Array(n);
  for(var i=0;i<n;i++) u[i]=bin.charCodeAt(i);
  return u.buffer;
}
function loadModels(done){
  if(typeof MODEL_DATA==='undefined'){ done(); return; }
  var loader=new THREE.GLTFLoader(), names=Object.keys(MODEL_DATA), left=names.length, raw={};
  if(THREE.MeshoptDecoder) loader.setMeshoptDecoder(THREE.MeshoptDecoder);
  names.forEach(function(n){
    loader.parse(b64buf(MODEL_DATA[n]),'',function(g){
      raw[n]=g; if(--left===0){ prepModels(raw); done(); }
    },function(err){
      console.error('model '+n+' failed',err); if(--left===0){ prepModels(raw); done(); }
    });
  });
}

/* the upper body: what an attack animation owns while the legs keep running */
var UPPER={chest:1,head:1,'upperarm.l':1,'upperarm.r':1,'lowerarm.l':1,'lowerarm.r':1,
  'wrist.l':1,'wrist.r':1,'hand.l':1,'hand.r':1,'handslot.l':1,'handslot.r':1};
function maskClip(clip,upper,suffix){
  var tr=clip.tracks.filter(function(t){ return !!UPPER[t.name.split('.')[0]]===upper; });
  return new THREE.AnimationClip(clip.name+suffix,clip.duration,tr);
}

function prepModels(raw){
  if(raw.anims){
    raw.anims.animations.forEach(function(c){
      CLIPS[c.name]=c;
      CLIPS[c.name+'@up']=maskClip(c,true,'@up');
      CLIPS[c.name+'@low']=maskClip(c,false,'@low');
    });
  }
  for(var n in raw){
    if(n==='anims') continue;
    if(CREATURES[n]){ prepCreature(n,raw[n]); continue; }
    var scene=raw[n].scene, skinned=[], rigid=[];
    scene.traverse(function(o){
      if(!o.isMesh) return;
      // display the atlas colours as authored, like the rest of the palette
      var tex=o.material&&o.material.map;
      if(tex) tex.colorSpace=THREE.NoColorSpace;
      o.material=new THREE.MeshLambertMaterial({map:tex||null});
      o.castShadow=true; o.receiveShadow=true;
      if(o.isSkinnedMesh) skinned.push(o); else rigid.push(o);
    });
    // six body parts share one skeleton and material: merge them into one draw call
    if(skinned.length>1){
      var merged=THREE.mergeGeometries(skinned.map(function(m){ return m.geometry; }));
      if(merged){
        var keep=skinned[0];
        keep.geometry=merged; keep.name='Body';
        for(var i=1;i<skinned.length;i++) skinned[i].parent.remove(skinned[i]);
      }
    }
    scene.updateMatrixWorld(true);
    var box=new THREE.Box3().setFromObject(scene);
    MODELS[n]={scene:scene, k:MODEL_H/Math.max(0.01,box.max.y-box.min.y), lift:-box.min.y,
      weapons:rigid.filter(function(o){ return o.parent&&/handslot/.test(o.parent.name); }).map(function(o){ return o.name; })};
  }
  MODELS_READY=!!(MODELS.rogue&&CLIPS.Idle);
}
var CREATURE_CLIPS={};
var SPIDER_CLIPS=CREATURE_CLIPS.spider={};
function prepCreature(name,g){
  var C=CREATURES[name], clips=CREATURE_CLIPS[name]||(CREATURE_CLIPS[name]={});
  g.animations.forEach(function(c){ clips[c.name]=c; });
  var scene=g.scene;
  scene.traverse(function(o){
    if(!o.isMesh) return;
    var mats=Array.isArray(o.material)?o.material:[o.material];
    var lm=mats.map(function(m){
      if(C.tint)        // the spider's body takes each spider's colour; the eyes stay a hot red
        return new THREE.MeshLambertMaterial({color:m.name==='marking'?new THREE.Color(0.95,0.22,0.15):new THREE.Color(0.2,0.13,0.12),name:m.name});
      // the others keep their colours, shown as authored (the game's output is not colour managed)
      var c=m.color, f=function(v){ return Math.pow(v,1/2.2); };
      return new THREE.MeshLambertMaterial({color:new THREE.Color(f(c.r),f(c.g),f(c.b)),name:m.name});
    });
    o.material=Array.isArray(o.material)?lm:lm[0];
    o.castShadow=true; o.receiveShadow=true; o.frustumCulled=false;
  });
  // measure the moving pose, not the bind pose, so the size is what you see
  var mix=new THREE.AnimationMixer(scene);
  if(clips[C.walk]){ mix.clipAction(clips[C.walk]).play(); mix.update(0.3); }
  scene.updateMatrixWorld(true);
  var box=new THREE.Box3().setFromObject(scene,true);
  mix.stopAllAction(); mix.uncacheRoot(scene);
  var ext=C.axis==='y'?box.max.y-box.min.y:box.max.x-box.min.x;
  MODELS[name]={scene:scene, k:C.size/Math.max(0.01,ext), lift:C.center?-(box.min.y+box.max.y)/2:-box.min.y,
    weapons:[], creature:name};
}

/* which model, tint, weapons and extras an entity wears */
function actorSpec(e){
  if(e.kind==='player'){
    var cls=G.build.cls, race=G.build.race;
    var m=cls==='warrior'?'barbarian':(cls==='wizard'?'mage':'rogue_hooded');
    var w=cls==='warrior'?['1H_Axe']:(cls==='wizard'?['2H_Staff']:['1H_Crossbow','Knife_Offhand']);
    // the rogue carries a crossbow but draws the knife to strike
    var mw=cls==='rogue'?['Knife','Knife_Offhand']:null;
    return {model:m, weapons:w, melee:mw, ears:race==='elf', beard:race==='dwarf', tint:null};
  }
  if(e.kind==='npc')                  // the innkeeper: a barbarian with a mug, in warm tones
    return {model:'barbarian', weapons:['Mug'], beard:true, tint:[1.0,0.88,0.74], key:'keeper'};
  var ck=e.kind==='corpse'?e.of:e.kind;
  if(ck==='spider') return {model:'spider', weapons:[], tint:e.look&&e.look.body, key:e.big?'bigspider':'spider'};
  if(ck==='snake'||ck==='wasp') return {model:ck, weapons:[], key:ck};
  var K=ALLYKIND[e.ak]||ALLYKIND[0];
  switch(K.k){
    case 'ranger': return {model:'rogue_hooded', weapons:['1H_Crossbow'], ears:!!e.look.ears};
    case 'blade':  return {model:'rogue', weapons:['Knife','Knife_Offhand'], ears:!!e.look.ears};
    case 'knight': return {model:'knight', weapons:['1H_Sword','Round_Shield']};
    case 'mage':   return {model:'mage', weapons:['2H_Staff']};
    case 'druid':  return {model:'mage', weapons:['1H_Wand','Spellbook_open'], tint:[0.78,1.0,0.74], key:'druid'};
    default:       return {model:'barbarian', weapons:['1H_Axe','Barbarian_Round_Shield'], beard:true};
  }
}

var ACTORS=[], EARGEO=null, BEARDGEO=null;
function makeActor(spec){
  var T=MODELS[spec.model];
  var root=THREE.cloneSkinned(T.scene);
  var mats=[], held={};
  root.traverse(function(o){
    if(!o.isMesh) return;
    if(Array.isArray(o.material)){             // the spider: body and eyes
      o.material=o.material.map(function(m){ var c=m.clone();
        if(spec.tint&&m.name!=='marking') c.color.setRGB(spec.tint[0],spec.tint[1],spec.tint[2]);
        mats.push(c); return c; });
      return;
    }
    o.material=o.material.clone();           // per-actor, so a hit can flash just this one
    if(spec.tint) o.material.color.setRGB(spec.tint[0],spec.tint[1],spec.tint[2]);
    mats.push(o.material);
    if(T.weapons.indexOf(o.name)>=0){ held[o.name]=o; o.visible=spec.weapons.indexOf(o.name)>=0; }
  });
  var head=root.getObjectByName('head');
  if(head&&(spec.ears||spec.beard)){
    if(!EARGEO){ EARGEO=toGeom(coneMesh([1,1,1],8)); BEARDGEO=toGeom(blobMesh([1,1,1],0,2)); }
    var inv=1/T.k;                          // bone space is model space; size things in world units
    var skin=new THREE.MeshLambertMaterial({vertexColors:true,color:new THREE.Color(0.95,0.78,0.64)});
    if(spec.tint) skin.color.setRGB(0.5,0.72,0.36);
    if(spec.ears) for(var sd=-1;sd<=1;sd+=2){
      var ear=new THREE.Mesh(EARGEO,skin);
      ear.position.set(sd*0.33*inv,0.36*inv,-0.02*inv); ear.rotation.z=-sd*1.95;
      ear.scale.set(0.09*inv,0.30*inv,0.06*inv); ear.castShadow=true; head.add(ear); mats.push(skin);
    }
    if(spec.beard){
      var beard=new THREE.Mesh(BEARDGEO,new THREE.MeshLambertMaterial({vertexColors:true,color:new THREE.Color(0.58,0.28,0.14)}));
      beard.position.set(0,0.02*inv,0.20*inv); beard.scale.set(0.34*inv,0.34*inv,0.18*inv);
      beard.castShadow=true; head.add(beard); mats.push(beard.material);
    }
  }
  var group=new THREE.Group(); group.add(root);
  root.scale.setScalar(T.k); root.position.y=T.lift*T.k;
  var a={creature:T.creature||null, held:held, wNorm:spec.weapons, wMelee:spec.melee||null, wCur:spec.weapons, key:spec.key||spec.model, group:group, root:root, mats:mats, mixer:new THREE.AnimationMixer(root),
    acts:{}, ent:null, used:false, ov:null, ovT:0, lastAtk:0, base:null, dead:false};
  SCENE.add(group);
  ACTORS.push(a);
  return a;
}
function act(a,name){
  var x=a.acts[name];
  if(!x){
    var c=(a.creature?CREATURE_CLIPS[a.creature]:CLIPS)[name]; if(!c) return null;
    x=a.acts[name]=a.mixer.clipAction(c);
    x.weight=0; x.enabled=true; x.play(); x.tw=0;
  }
  return x;
}
function releaseActor(a){ a.ent=null; a.group.visible=false; a.dead=false; a.ov=null; a.ovT=0; }

/* attack clip for whatever the entity just did */
function attackClip(e){
  if(e.kind==='player'){
    if(e.atkKind==='bow') return '1H_Ranged_Shoot';
    if(e.atkKind==='cast') return 'Spellcast_Shoot';
    if(e.atkKind==='throw') return 'Throw';
    return G.S&&G.S.whirl?'2H_Melee_Attack_Spin':'1H_Melee_Attack_Chop';
  }
  var K=ALLYKIND[e.ak]||{};
  if(K.k==='ranger') return '1H_Ranged_Shoot';
  if(K.k==='mage'||K.k==='druid') return 'Spellcast_Shoot';
  return '1H_Melee_Attack_Chop';
}

/* which way the legs go: forward run, strafe left/right, or backpedal, relative to
   where the body faces (only the hunter strafes, and only with the mouse captured) */
function moveClip(e){
  if(!e.strafe||e.mvx===undefined||!CLIPS.Running_Strafe_Left) return 'Running_A';
  var fy=e.yaw||0, f=e.mvx*Math.sin(fy)+e.mvz*Math.cos(fy), r=-e.mvx*Math.cos(fy)+e.mvz*Math.sin(fy);
  if(f>0.55) return 'Running_A';
  if(f<-0.55) return 'Walking_Backwards';
  return r>0?'Running_Strafe_Right':'Running_Strafe_Left';
}
/* Per frame: pick a looping base (idle / run / jump / cheer / death), and lay a
   one-shot over the upper body for attacks and hits, so you can run and shoot. */
function animateCreature(a,e,dt){
  var C=CREATURES[a.creature], clips=CREATURE_CLIPS[a.creature];
  var dead=(e.kind==='corpse');
  var spd=e.speed||0;
  var base=dead?(clips.Death?'Death':C.idle):(spd>0.4?C.walk:C.idle);
  if(!dead&&e.wind>0&&!a.ov){
    // a bite is telegraphed: it starts with the wind-up, so it lands as the ring closes
    var c=clips.Attack, full=(e.big?0.55:0.38)+0.3;
    if(c){ a.ov='Attack'; var x=act(a,'Attack'); x.reset(); x.setLoop(THREE.LoopOnce,1); x.clampWhenFinished=true;
      x.timeScale=c.duration/full; a.ovT=full; }
  } else if(!dead&&e.atkT>0&&e.atkT>=a.lastAtk+1e-4&&clips.Attack){
    // a wasp fires its stinger
    a.ov='Attack'; var xs=act(a,'Attack'); xs.reset(); xs.setLoop(THREE.LoopOnce,1); xs.clampWhenFinished=true;
    xs.timeScale=1.4; a.ovT=clips.Attack.duration/1.4;
  } else if(!dead&&e.hurtT>0.15&&!a.ov&&C.flinch&&clips[C.flinch]){
    a.ov=C.flinch; var h=act(a,C.flinch); h.reset(); h.setLoop(THREE.LoopOnce,1); h.clampWhenFinished=true;
    h.timeScale=2.4; a.ovT=clips[C.flinch].duration/2.4*0.5;   // a quick flinch
  }
  a.lastAtk=e.atkT||0;
  a.ovT-=dt; if(a.ovT<=0) a.ov=null;
  for(var k in a.acts) a.acts[k].tw=0;
  act(a,(a.ov&&!dead)?a.ov:base).tw=1;
  if(dead&&!a.dead){ a.dead=true; if(clips.Death){ var d=act(a,'Death'); d.reset(); d.setLoop(THREE.LoopOnce,1); d.clampWhenFinished=true; } }
  var w=a.acts[C.walk]; if(w&&C.walk!==C.idle) w.timeScale=clamp(spd/3.4,0.6,1.8);
  var rate=Math.min(1,dt*14);
  for(var k2 in a.acts){ var x2=a.acts[k2]; x2.weight+=(x2.tw-x2.weight)*rate; if(x2.weight<0.002&&x2.tw===0) x2.weight=0; x2.setEffectiveWeight(x2.weight); }
  a.mixer.update(dead&&!clips.Death?0:dt);
  var hy=(a.creature==='wasp')?(dead?Math.max(0,(e.hover||1.25)*(1-e.t/0.5)):(e.hover||1.25))*(e.scale||1):0;
  a.group.position.set(e.x,e.y+hy,e.z);
  // a snake has no death clip: it rolls over instead
  a.group.rotation.set(0,e.yaw||0,(dead&&!clips.Death)?Math.min(1,e.t/0.4)*1.6:0);
  a.group.scale.setScalar(e.scale||1);
  var flash=e.hurtT>0?Math.min(1,e.hurtT/0.18)*0.6:0;
  for(var i=0;i<a.mats.length;i++) a.mats[i].emissive.setRGB(flash,flash*0.15,flash*0.1);
  a.group.visible=true;
}
function animateActor(a,e,dt){
  if(a.creature){ animateCreature(a,e,dt); return; }
  var dead=(e.kind==='corpse')||(e.dead===true);
  var air=e.onGround===false;
  var spd=e.speed||0;
  var base=dead?'Death_A':(air?'Jump_Idle':(e.cheer>0?'Cheer':(spd>0.6?moveClip(e):'Idle')));
  var dodge=!dead&&e.dodgeT>0&&e.dodge&&CLIPS[e.dodge];
  if(dodge){
    base=e.dodge;
    if(a.dodgeN!==e.dodgeN){ a.dodgeN=e.dodgeN; var dx=act(a,base); dx.reset(); dx.setLoop(THREE.LoopOnce,1); dx.clampWhenFinished=true;
      dx.timeScale=CLIPS[base].duration/0.5; dx.weight=1; }
  }
  // a fresh attack starts the overlay; let the whole swing play out
  if(e.atkT>0&&e.atkDur&&e.atkT>=a.lastAtk+1e-4&&!dead){
    var cn=attackClip(e), c=CLIPS[cn+'@up'];
    if(c){
      a.ov=cn; var x=act(a,cn+'@up');
      x.reset(); x.setLoop(THREE.LoopOnce,1); x.clampWhenFinished=true;
      x.timeScale=Math.max(1,c.duration/Math.max(0.35,e.atkDur*1.7));
      a.ovT=c.duration/x.timeScale;
    }
  } else if(e.hurtT>0.25&&!a.ov&&!dead&&a.ovT<=0){
    a.ov='Hit_A'; var h=act(a,'Hit_A@up'); h.reset(); h.setLoop(THREE.LoopOnce,1); h.clampWhenFinished=true;
    h.timeScale=1.6; a.ovT=CLIPS['Hit_A@up'].duration/1.6;
  }
  a.lastAtk=e.atkT||0;
  if(a.wMelee){                     // swap to the melee weapon for the length of a strike
    var want=(a.ov&&/Melee/.test(a.ov))?a.wMelee:a.wNorm;
    if(want!==a.wCur){ for(var wn in a.held) a.held[wn].visible=want.indexOf(wn)>=0; a.wCur=want; }
  }
  a.ovT-=dt; if(a.ovT<=0) a.ov=null;
  var layered=!!a.ov&&!dead&&!air&&!dodge;
  // targets: everything fades to 0 except what is wanted now
  for(var k in a.acts) a.acts[k].tw=0;
  if(layered){ act(a,base+'@low').tw=1; act(a,a.ov+'@up').tw=1; }
  else act(a,base).tw=1;
  if(dead&&!a.dead){
    a.dead=true; var d=act(a,'Death_A'); d.reset(); d.setLoop(THREE.LoopOnce,1); d.clampWhenFinished=true;
  }
  var ts=clamp(spd/5.6,0.6,1.6);
  ['Running_A','Running_Strafe_Left','Running_Strafe_Right'].forEach(function(n){
    if(a.acts[n]) a.acts[n].timeScale=ts; if(a.acts[n+'@low']) a.acts[n+'@low'].timeScale=ts; });
  var bts=clamp(spd/3.0,0.7,1.8);
  if(a.acts.Walking_Backwards) a.acts.Walking_Backwards.timeScale=bts;
  if(a.acts['Walking_Backwards@low']) a.acts['Walking_Backwards@low'].timeScale=bts;
  var rate=Math.min(1,dt*12);
  for(var k2 in a.acts){ var x2=a.acts[k2]; x2.weight+=(x2.tw-x2.weight)*rate; if(x2.weight<0.002&&x2.tw===0) x2.weight=0; x2.setEffectiveWeight(x2.weight); }
  a.mixer.update(dt);
  // place it
  a.group.position.set(e.x,e.y,e.z);
  a.group.rotation.set(0,e.yaw||0,0);
  var s=e.scale||1; a.group.scale.setScalar(s);
  var flash=e.hurtT>0?Math.min(1,e.hurtT/0.18)*0.55:0;
  for(var i=0;i<a.mats.length;i++) a.mats[i].emissive.setRGB(flash,flash*0.15,flash*0.1);
  a.group.visible=true;
}

/* Hand out actors to the nearest humanoids; everyone else falls back to the
   instanced primitive rig. Returns the set of entities that got one. */
var ACTOR_OF=new Map(), HUMANS=[];
function isHumanoid(e){ return e.kind==='player'||e.kind==='ally'||e.kind==='npc'; }
function hasModel(e){ var ck=e.kind==='corpse'?e.of:e.kind; return isHumanoid(e)||(!!CREATURES[ck]&&!!MODELS[ck]); }
function assignActors(dt){
  ACTOR_OF.clear();
  if(!MODELS_READY||!G.player){ for(var z=0;z<ACTORS.length;z++) if(ACTORS[z].ent) releaseActor(ACTORS[z]); return ACTOR_OF; }
  var p=G.player, c=G.cam;
  HUMANS.length=0;
  HUMANS.push([-1,p]);
  for(var i=0;i<G.ents.length;i++){ var e=G.ents[i];
    if(!hasModel(e)) continue;
    var d=Math.hypot(e.x-c.x,e.z-c.z); if(d<ACTOR_RANGE) HUMANS.push([d,e]); }
  HUMANS.sort(function(a,b){ return a[0]-b[0]; });
  if(HUMANS.length>ACTOR_MAX) HUMANS.length=ACTOR_MAX;
  // keep existing pairings where possible, so animations don't restart
  var want=new Set(); for(var j=0;j<HUMANS.length;j++) want.add(HUMANS[j][1]);
  for(var q=0;q<ACTORS.length;q++){ var A=ACTORS[q];
    if(A.ent&&(!want.has(A.ent)||A.spec!==specKey(A.ent))) releaseActor(A); }
  for(var h=0;h<HUMANS.length;h++){
    var en=HUMANS[h][1], sk=specKey(en), got=null;
    for(var r=0;r<ACTORS.length;r++) if(ACTORS[r].ent===en){ got=ACTORS[r]; break; }
    if(!got){
      for(var r2=0;r2<ACTORS.length;r2++){ var B=ACTORS[r2]; if(!B.ent&&B.spec===sk){ got=B; break; } }
      if(!got){ var sp=actorSpec(en); if(!MODELS[sp.model]) continue; got=makeActor(sp); got.spec=sk; }
      got.ent=en; got.dead=false; got.lastAtk=en.atkT||0;
      for(var k in got.acts){ got.acts[k].weight=0; got.acts[k].setEffectiveWeight(0); }
    }
    animateActor(got,en,dt);
    ACTOR_OF.set(en,got);
  }
  return ACTOR_OF;
}
function specKey(e){
  var s=actorSpec(e);
  return s.model+'|'+(s.key||'')+'|'+s.weapons.join(',')+'|'+(s.ears?1:0)+(s.beard?1:0);
}
