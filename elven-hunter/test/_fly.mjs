import { chromium } from 'playwright';
const SP='/tmp/claude-0/-home-user-takecareofyourpet/39fe5577-7807-5783-baea-e0b4acea85d9/scratchpad/';
const VP = JSON.parse(process.argv[2]||'{"width":1280,"height":720}'), TAG=process.argv[3]||'l';
const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport:VP, deviceScaleFactor:1, hasTouch: VP.width<900, isMobile: VP.width<900 });
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('file://'+process.cwd()+'/index.html');
await page.waitForFunction('window.__ready===true',{timeout:60000});
await page.evaluate(()=>{ startRun(); WILD.rod=true; const p=G.player; p.x=-116; p.z=82; p.y=H(p.x,p.z); p.yaw=1; FISHSPOT=fishSpot(p); G.state='play'; fishScreen(); FISHING.tok+=1000;
  window.__step=(sec)=>{ const F=FISHING; for(let i=0;i<Math.round(sec/0.016);i++){ fishTick(F,0.016); if(FISHING!==F) return; ropeTick(F,0.016);} for(let k=0;k<14;k++){ if(F.view) F.view.t-=100; fishDraw(document.getElementById('fcv'),F);} };
  WILD.fly='caddis'; FISHING.target.lvl=3; __step(0.5); FISHING.view=null; });
const seq=[
 ['0ready', ()=>{}],
 ['1back_early', ()=>{ fishPress(); __step(0.18); }],
 ['2back_loop', ()=>{ __step(0.2); }],
 ['3back_straight', ()=>{ __step(0.18); }],
 ['4fwd_loop', ()=>{ fishPress(); __step(0.2); }],
 ['5hang', ()=>{ __step(0.35); }],
 ['6back2', ()=>{ fishPress(); __step(0.35); }],
 ['7fwd2', ()=>{ __step(0.2); fishPress(); __step(0.22); }],
 ['8laydown', ()=>{ __step(0.3); fishPress(); __step(0.5); fishPress(); __step(0.3); fishPress2(); FISHING.took=false; __step(1.2); }],
 ['9drag', ()=>{ __step(4.0); }],
 ['10mend', ()=>{ fishPress2(); __step(0.5); }],
 ['11fight', ()=>{ fishTake(FISHING); fishPress(); FISHING.hold=true; __step(1.0); }],
 ['12landed', ()=>{ FISHING.dist=0.001; FISHING.run=0; FISHING.runIn=99; __step(0.3); }],
];
for (const [n,fn] of seq){ await page.evaluate(fn); await page.screenshot({path:SP+'q'+TAG+'_'+n+'.png'}); }
console.log(await page.evaluate(()=>({stage:FISHING.stage, lvl:FISHING.lvl, L:FISHING.rope.L})), errs);
await b.close();
