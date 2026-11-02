/* ================= sound =================
   Every effect is synthesised with Web Audio (oscillators, filtered noise and
   envelopes), so effects cost no download at all. The one recording is the music
   loop, "Peaceful Forest" by Samza (CC0), carried as MUSIC_DATA.

   Browsers only allow audio after a click or tap, so sndWake() is called from
   the first input; until then everything is silently skipped. */

var SND={ctx:null, out:null, fx:null, mus:null, noise:null, musicSrc:null, musicBuf:null,
  fxOn:true, musicOn:true, last:{}, voices:0};
(function(){ try{ var s=JSON.parse(localStorage.getItem('eh3_audio')||'{}');
  if(s.fx===0) SND.fxOn=false; if(s.music===0) SND.musicOn=false; }catch(e){} })();
function sndSave(){ try{ localStorage.setItem('eh3_audio',JSON.stringify({fx:SND.fxOn?1:0,music:SND.musicOn?1:0})); }catch(e){} }

function sndWake(){
  if(SND.ctx){ if(SND.ctx.state==='suspended') try{ SND.ctx.resume(); }catch(e){} return; }
  var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
  try{ SND.ctx=new AC(); }catch(e){ return; }
  var c=SND.ctx;
  SND.out=c.createDynamicsCompressor();          // keeps a pile-up of hits from clipping
  SND.out.threshold.value=-14; SND.out.ratio.value=4; SND.out.connect(c.destination);
  SND.fx=c.createGain(); SND.fx.gain.value=SND.fxOn?0.55:0; SND.fx.connect(SND.out);
  SND.mus=c.createGain(); SND.mus.gain.value=0; SND.mus.connect(c.destination);
  // one second of white noise, reused by every whoosh, thud and hiss
  var n=c.createBuffer(1,c.sampleRate,c.sampleRate), d=n.getChannelData(0);
  for(var i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  SND.noise=n;
  if(typeof MUSIC_DATA!=='undefined'){
    var bin=atob(MUSIC_DATA), u=new Uint8Array(bin.length);
    for(var j=0;j<bin.length;j++) u[j]=bin.charCodeAt(j);
    var ok=function(buf){ SND.musicBuf=buf; musicStart(); };
    try{ var pr=c.decodeAudioData(u.buffer,ok,function(){}); if(pr&&pr.catch) pr.catch(function(){}); }catch(e){}
  }
}
/* the loop: MP3 pads the start and end with silence, so loop between the first
   and last audible samples to keep the seam seamless */
function musicStart(){
  var c=SND.ctx, b=SND.musicBuf; if(!c||!b||SND.musicSrc) return;
  var d=b.getChannelData(0), a=0, z=d.length-1;
  while(a<d.length&&Math.abs(d[a])<2e-4) a++;
  while(z>a&&Math.abs(d[z])<2e-4) z--;
  var s=c.createBufferSource(); s.buffer=b; s.loop=true;
  s.loopStart=a/b.sampleRate; s.loopEnd=z/b.sampleRate;
  s.connect(SND.mus); s.start(c.currentTime+0.05,s.loopStart);
  SND.musicSrc=s;
  musicLevel(2.5);
}
function musicLevel(fade){
  if(!SND.ctx) return;
  var t=SND.ctx.currentTime, g=SND.mus.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value,t);
  g.linearRampToValueAtTime(SND.musicOn?0.30:0,t+(fade||0.4));
}
/* M on a laptop (or the title-screen button): all on -> music off -> silent -> all on */
function sndCycle(){
  if(SND.fxOn&&SND.musicOn) SND.musicOn=false;
  else if(SND.fxOn){ SND.fxOn=false; }
  else { SND.fxOn=true; SND.musicOn=true; }
  if(SND.fx) SND.fx.gain.value=SND.fxOn?0.55:0;
  musicLevel(0.4); sndSave();
  return sndLabel();
}
function sndLabel(){ return SND.fxOn&&SND.musicOn?'Sound: on':(SND.fxOn?'Sound: effects only':'Sound: off'); }

/* ---------- building blocks ---------- */
function sndOK(name,gap){
  if(!SND.ctx||!SND.fxOn||SND.ctx.state!=='running') return false;
  var t=SND.ctx.currentTime;
  if(SND.last[name]&&t-SND.last[name]<(gap||0.03)) return false;   // no machine-gunning
  if(SND.voices>28) return false;
  SND.last[name]=t; return true;
}
/* where a sound sits: quieter with distance, panned by where it is on screen */
function sndPlace(x,z){
  if(x===undefined||!G.player) return {g:1,pan:0};
  var c=G.cam, dx=x-c.x, dz=z-c.z, d=Math.hypot(x-G.player.x,z-G.player.z);
  var g=Math.max(0,1-d/46); g*=g;
  var rx=-Math.cos(c.yaw), rz=Math.sin(c.yaw), dl=Math.hypot(dx,dz)||1;
  return {g:g, pan:clamp((dx*rx+dz*rz)/dl,-1,1)*0.8};
}
function sndBus(gain,pan,dur){
  var c=SND.ctx, g=c.createGain(); g.gain.value=gain;
  var node=g;
  if(c.createStereoPanner&&pan){ var p=c.createStereoPanner(); p.pan.value=pan; g.connect(p); p.connect(SND.fx); }
  else g.connect(SND.fx);
  SND.voices++; setTimeout(function(){ SND.voices--; },(dur+0.1)*1000);
  return node;
}
function env(param,t,a,peak,hold,rel){
  param.setValueAtTime(0.0001,t);
  param.linearRampToValueAtTime(peak,t+a);
  param.setValueAtTime(peak,t+a+hold);
  param.exponentialRampToValueAtTime(0.0001,t+a+hold+rel);
}
function tone(dst,type,f0,f1,t,dur,vol,a){
  var c=SND.ctx, o=c.createOscillator(), g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(f0,t);
  if(f1&&f1!==f0) o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  env(g.gain,t,a||0.004,vol,0,dur);
  o.connect(g); g.connect(dst); o.start(t); o.stop(t+dur+0.05);
}
function hiss(dst,ftype,f0,f1,q,t,dur,vol,a){
  var c=SND.ctx, s=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain();
  s.buffer=SND.noise; s.playbackRate.value=0.7+Math.random()*0.6;
  f.type=ftype; f.Q.value=q||1; f.frequency.setValueAtTime(f0,t);
  if(f1&&f1!==f0) f.frequency.exponentialRampToValueAtTime(f1,t+dur);
  env(g.gain,t,a||0.003,vol,0,dur);
  s.connect(f); f.connect(g); g.connect(dst);
  s.start(t,Math.random()*0.5); s.stop(t+dur+0.05);
}

/* ---------- the effects ---------- */
function sfx(name,x,z,v){
  if(!sndOK(name,name==='step'?0.02:0.035)) return;
  var P=sndPlace(x,z); if(P.g<0.02) return;
  var c=SND.ctx, t=c.currentTime+0.005, k=v||1, r=0.9+Math.random()*0.2;
  var b;
  switch(name){
    case 'swing':                         // blade through air
      b=sndBus(0.8*P.g,P.pan,0.25); hiss(b,'bandpass',900*r,3200*r,1.4,t,0.16,0.5,0.02); break;
    case 'hit':                           // blade into something
      b=sndBus(0.9*P.g*k,P.pan,0.3);
      tone(b,'sine',150*r,55,t,0.14,0.8); hiss(b,'lowpass',2600,500,0.7,t,0.07,0.6); break;
    case 'squish':                        // spider: wet crunch
      b=sndBus(0.8*P.g,P.pan,0.3);
      hiss(b,'bandpass',1400*r,500,3,t,0.12,0.8); tone(b,'square',90*r,50,t,0.08,0.18); break;
    case 'bow':                           // string release
      b=sndBus(0.7*P.g,P.pan,0.4);
      tone(b,'triangle',330*r,240*r,t,0.22,0.35); hiss(b,'highpass',3000,6000,0.7,t,0.05,0.25); break;
    case 'zap':                           // wizard bolt
      b=sndBus(0.6*P.g,P.pan,0.4);
      tone(b,'sawtooth',300*r,1300*r,t,0.18,0.18); tone(b,'sine',900*r,2200*r,t,0.2,0.2); break;
    case 'throw':                         // axe leaves the hand
      b=sndBus(0.8*P.g,P.pan,0.35); hiss(b,'bandpass',500*r,1600,1.2,t,0.24,0.5,0.03); break;
    case 'thunk':                         // arrow into wood or earth
      b=sndBus(0.6*P.g,P.pan,0.25);
      tone(b,'triangle',220*r,110,t,0.09,0.4); hiss(b,'lowpass',1800,400,0.8,t,0.05,0.35); break;
    case 'ehit':                          // shot lands on a foe
      b=sndBus(0.6*P.g,P.pan,0.2); hiss(b,'bandpass',2000*r,900,2,t,0.06,0.6); tone(b,'sine',260*r,120,t,0.07,0.4); break;
    case 'hurt':                          // the hunter takes a blow
      b=sndBus(1.0,0,0.4);
      tone(b,'sawtooth',190*r,85,t,0.2,0.3); hiss(b,'lowpass',900,200,0.8,t,0.14,0.5); break;
    case 'hissup':                        // a spider rears to bite: the warning
      b=sndBus(0.7*P.g,P.pan,0.5); hiss(b,'highpass',2400,5200,0.8,t,0.34,0.35,0.15); break;
    case 'spiderdie':
      b=sndBus(0.9*P.g,P.pan,0.6);
      tone(b,'sawtooth',900*r,140,t,0.42,0.2); hiss(b,'bandpass',3000,700,2,t,0.35,0.35); break;
    case 'snakedie':                      // a long hiss that trails away
      b=sndBus(0.8*P.g,P.pan,0.7); hiss(b,'highpass',3600,1400,0.8,t,0.5,0.4,0.02); tone(b,'sine',300*r,120,t,0.3,0.12); break;
    case 'waspdie':                       // the buzz drops out of the air
      b=sndBus(0.8*P.g,P.pan,0.6); tone(b,'sawtooth',230*r,70,t,0.45,0.16); tone(b,'square',236*r,72,t,0.45,0.06); break;
    case 'rattle':                        // a snake coils to strike: the warning
      b=sndBus(0.7*P.g,P.pan,0.5);
      for(var ri=0;ri<5;ri++) hiss(b,'bandpass',4200,3800,3,t+ri*0.055,0.04,0.45);
      break;
    case 'sting':                         // a wasp fires a stinger
      b=sndBus(0.6*P.g,P.pan,0.35); tone(b,'sawtooth',420*r,900*r,t,0.12,0.12); hiss(b,'highpass',4000,7000,0.7,t,0.06,0.2); break;
    case 'jump':
      b=sndBus(0.35,0,0.2); hiss(b,'bandpass',400,1100,1,t,0.12,0.4,0.02); break;
    case 'land':
      b=sndBus(0.5*k,0,0.25); tone(b,'sine',110,55,t,0.12,0.6); hiss(b,'lowpass',700,200,0.7,t,0.08,0.5); break;
    case 'step':
      b=sndBus(0.16*k,0,0.1); hiss(b,'lowpass',1000*r,300,0.6,t,0.05,0.6); break;
    case 'dash':
      b=sndBus(0.7,0,0.4); hiss(b,'bandpass',300,3000,1,t,0.26,0.6,0.02); tone(b,'sine',200,600,t,0.2,0.15); break;
    case 'coin':
      b=sndBus(0.5,0,0.4); tone(b,'square',1320,1320,t,0.06,0.12); tone(b,'square',1760,1760,t+0.07,0.12,0.12); break;
    case 'potion':                        // gulp and a bright ring
      b=sndBus(0.7,0,0.7);
      for(var gi=0;gi<3;gi++) tone(b,'sine',280+gi*60,180,t+gi*0.09,0.08,0.4);
      tone(b,'triangle',880,880,t+0.3,0.35,0.18); tone(b,'triangle',1320,1320,t+0.36,0.4,0.12); break;
    case 'pickup':
      b=sndBus(0.5,0,0.4); tone(b,'triangle',988,988,t,0.1,0.25); tone(b,'triangle',1480,1480,t+0.08,0.2,0.2); break;
    case 'levelup':                       // a rising major arpeggio
      b=sndBus(0.7,0,1.4);
      [523,659,784,1047,1319].forEach(function(f,i){ tone(b,'triangle',f,f,t+i*0.085,0.55,0.26); tone(b,'sine',f*2,f*2,t+i*0.085,0.3,0.06); });
      break;
    case 'fairy':
      b=sndBus(0.6,0,1.2);
      [1568,1976,2349,2637,3136].forEach(function(f,i){ tone(b,'sine',f,f,t+i*0.06,0.4,0.15); }); break;
    case 'freed':                         // silk tears, then a chime
      b=sndBus(0.8*P.g,P.pan,1.2);
      hiss(b,'bandpass',1800,600,1.5,t,0.25,0.6);
      [659,880,1175].forEach(function(f,i){ tone(b,'triangle',f,f,t+0.25+i*0.1,0.5,0.22); }); break;
    case 'discover':
      b=sndBus(0.6,0,1.6); tone(b,'triangle',784,784,t,0.8,0.25); tone(b,'triangle',1175,1175,t+0.18,1.0,0.22); break;
    case 'death':
      b=sndBus(0.9,0,1.8);
      [392,330,262,196].forEach(function(f,i){ tone(b,'triangle',f,f*0.98,t+i*0.22,0.6,0.25); }); break;
    case 'click':
      b=sndBus(0.35,0,0.1); tone(b,'square',1200,900,t,0.03,0.15); break;
  }
}
