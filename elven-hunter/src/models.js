/* ================= animated character models =================
   KayKit Adventurers (CC0, Kay Lousberg). The five characters share one
   skeleton, so one set of clips (anims.glb) drives all of them.

   The nearest humanoids get a real skinned, animated model ("actor"); the rest
   keep the cheap instanced primitive rig from chars.js, which is also what
   draws them while the models are still loading. */

var MODELS={}, CLIPS={}, MODELS_READY=false;
var MODEL_H=1.95;                 // the hunter's height in world units
var ACTOR_MAX=12, ACTOR_RANGE=42;

function b64buf(s){
  var bin=atob(s), n=bin.length, u=new Uint8Array(n);
  for(var i=0;i<n;i++) u[i]=bin.charCodeAt(i);
  return u.buffer;
}
function loadModels(done){
  if(typeof MODEL_DATA==='undefined'){ done(); return; }
  var loader=new THREE.GLTFLoader(), names=Object.keys(MODEL_DATA), left=names.length, raw={};
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
  if(e.kind==='goblin'||(e.kind==='corpse'&&e.of==='goblin'))
    return {model:'rogue', weapons:e.gk==='bow'?['1H_Crossbow']:['Knife','Knife_Offhand'], ears:true, tint:[0.62,0.86,0.48], key:'goblin'};
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
  var a={held:held, wNorm:spec.weapons, wMelee:spec.melee||null, wCur:spec.weapons, key:spec.key||spec.model, group:group, root:root, mats:mats, mixer:new THREE.AnimationMixer(root),
    acts:{}, ent:null, used:false, ov:null, ovT:0, lastAtk:0, base:null, dead:false};
  SCENE.add(group);
  ACTORS.push(a);
  return a;
}
function act(a,name){
  var x=a.acts[name];
  if(!x){
    var c=CLIPS[name]; if(!c) return null;
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
  if(e.kind==='goblin') return e.gk==='bow'?'1H_Ranged_Shoot':'1H_Melee_Attack_Slice_Diagonal';
  var K=ALLYKIND[e.ak]||{};
  if(K.k==='ranger') return '1H_Ranged_Shoot';
  if(K.k==='mage'||K.k==='druid') return 'Spellcast_Shoot';
  return '1H_Melee_Attack_Chop';
}

/* Per frame: pick a looping base (idle / run / jump / cheer / death), and lay a
   one-shot over the upper body for attacks and hits, so you can run and shoot. */
function animateActor(a,e,dt){
  var dead=(e.kind==='corpse')||(e.dead===true);
  var air=e.onGround===false;
  var spd=e.speed||0;
  var base=dead?'Death_A':(air?'Jump_Idle':(e.cheer>0?'Cheer':(spd>0.6?'Running_A':'Idle')));
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
  var layered=!!a.ov&&!dead&&!air;
  // targets: everything fades to 0 except what is wanted now
  for(var k in a.acts) a.acts[k].tw=0;
  if(layered){ act(a,base+'@low').tw=1; act(a,a.ov+'@up').tw=1; }
  else act(a,base).tw=1;
  if(dead&&!a.dead){
    a.dead=true; var d=act(a,'Death_A'); d.reset(); d.setLoop(THREE.LoopOnce,1); d.clampWhenFinished=true;
  }
  var run=a.acts.Running_A, runL=a.acts['Running_A@low'], ts=clamp(spd/5.6,0.6,1.6);
  if(run) run.timeScale=ts; if(runL) runL.timeScale=ts;
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
function isHumanoid(e){ return e.kind==='player'||e.kind==='ally'||e.kind==='goblin'||(e.kind==='corpse'&&e.of==='goblin'); }
function assignActors(dt){
  ACTOR_OF.clear();
  if(!MODELS_READY||!G.player){ for(var z=0;z<ACTORS.length;z++) if(ACTORS[z].ent) releaseActor(ACTORS[z]); return ACTOR_OF; }
  var p=G.player, c=G.cam;
  HUMANS.length=0;
  HUMANS.push([-1,p]);
  for(var i=0;i<G.ents.length;i++){ var e=G.ents[i];
    if(!isHumanoid(e)) continue;
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
