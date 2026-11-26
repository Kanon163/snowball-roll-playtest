const screenEl=document.querySelector('canvas'), loadEl=document.querySelector('#load');
const stage=document.querySelector('#stage');
const assetRoot=new URL('../client/',document.currentScript.src);
const asset=path=>new URL(path+'?v=yuletide4',assetRoot).href;
let audioCtx=null;
function context(){
  const C=window.AudioContext||window.webkitAudioContext;
  if(C&&!audioCtx)audioCtx=new C();
  return audioCtx;
}
const host={
  progress:window.snowBoot,previewRewards:true,preparePack:()=>Promise.resolve(),guide:createSnowGuide(),makeAudio:createSnowSoundscape,
  pref:{get:k=>JSON.parse(localStorage.getItem('snow-'+k)||'null'),set:(k,v)=>localStorage.setItem('snow-'+k,JSON.stringify(v))},
  async loadTypeface(){
    const f=new FontFace('SnowDisplay','url("'+asset('art/snow-display.ttf')+'")');
    await f.load();document.fonts.add(f);return 'SnowDisplay';
  },
  wakeAudio(){const a=context();if(a&&a.state!=='running')a.resume().catch(()=>{});},
  screen:screenEl,w:stage.clientWidth,h:stage.clientHeight,ratio:devicePixelRatio,touch:navigator.maxTouchPoints>0,
  village:SnowVillage,winter:WinterVillageVisuals,
  outfit:makeSnowOutfit,drawCollection:drawSnowCollection,
  catalog:()=>fetch(asset('catalog.json')).then(r=>r.json()),
  image:path=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=asset(path);}),
  createAccount:createLocalAccount,createRace:createSnowRace,
  storage:{load:()=>localStorage.getItem('snow-account-v1'),save:data=>localStorage.setItem('snow-account-v1',JSON.stringify(data))},
  onShow(fn){addEventListener('focus',()=>fn(false));document.addEventListener('visibilitychange',()=>{if(!document.hidden)fn(false);});},
  layer:()=>document.createElement('canvas'),frame:cb=>requestAnimationFrame(cb),
  sound(path,loop){
    let source=null,level=1,wanted=0,offset=0,started=0,rate=1;
    const audio=context();if(!audio)return null;
    const gain=audio.createGain();gain.connect(audio.destination);
    const buffer=fetch(asset(path)).then(r=>{if(!r.ok)throw Error(path);return r.arrayBuffer();}).then(b=>audio.decodeAudioData(b)).catch(()=>null);
    function stop(remember){if(source){if(remember)offset+=(audio.currentTime-started)*rate;
      source.onended=null;try{source.stop();}catch(_){}source.disconnect();source=null;}}
    return {
      set volume(v){level=v;gain.gain.setTargetAtTime(v,audio.currentTime,.04);},
      set playbackRate(v){rate=v;if(source)source.playbackRate.value=v;},
      play(){const id=++wanted;buffer.then(b=>{if(!b||id!==wanted)return;stop(false);
        source=audio.createBufferSource();source.buffer=b;source.loop=loop;source.playbackRate.value=rate;source.connect(gain);
        gain.gain.value=level;started=audio.currentTime;source.start(0,loop?offset%b.duration:0);
        source.onended=()=>{if(source){source.disconnect();source=null;}};
      });},
      pause(){wanted++;stop(loop);}
    };
  },
  read:async path=>{
    const r=await fetch(asset(path));
    if(!r.ok)throw Error('模型加载失败');
    return r.arrayBuffer();
  },
  pointer(fn){
    function event(e,kind){
      const bounds=screenEl.getBoundingClientRect();
      const x=(e.clientX-bounds.left)/bounds.width,y=(e.clientY-bounds.top)/bounds.height;
      const rotated=matchMedia('(orientation:portrait)').matches;
      fn(kind,e.pointerId,(rotated?y:x)*host.w,(rotated?1-x:y)*host.h);
    }
    screenEl.onpointerdown=e=>{screenEl.setPointerCapture(e.pointerId);event(e,'down');};
    screenEl.onpointermove=e=>event(e,'move');
    screenEl.onpointerup=e=>event(e,'up');screenEl.onpointercancel=e=>event(e,'cancel');
  },
  keyboard(fn){
    for(const type of ['keydown','keyup'])addEventListener(type,e=>{
      if(['Space','Enter','ArrowRight','ArrowLeft','ArrowDown','ArrowUp','KeyW','KeyS','KeyA','KeyD'].includes(e.code)){
        e.preventDefault();if(!e.repeat)fn(e.code,type==='keydown');
      }
    });
  },
  onHide:fn=>{addEventListener('blur',fn);document.addEventListener('visibilitychange',()=>{if(document.hidden)fn();});},
  status(value){screenEl.dataset.status=value;loadEl.hidden=true;}
};
playSnow(THREE,host,createSnowScene).catch(e=>{loadEl.textContent='雪场加载失败：'+e.message;console.error(e);});
