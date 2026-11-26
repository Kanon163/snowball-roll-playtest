const screenEl=document.querySelector('canvas'), loadEl=document.querySelector('#load');
const stage=document.querySelector('#stage');
const assetRoot=new URL('../client/',document.currentScript.src);
const asset=path=>new URL(path,assetRoot).href;
const host={
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
    const a=new Audio(asset(path));a.loop=loop;
    return {set volume(n){a.volume=n;},play(){if(!loop)a.currentTime=0;a.play().catch(()=>{});},pause(){a.pause();}};
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
