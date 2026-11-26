// 随玩家操作解锁原工程音乐与分材质拟音，进入后台或广告时统一暂停。
function createSnowSoundscape(host) {
  let enabled=host.pref.get('muted')!==true,started=false,quiet=false,rolling=false,musicOn=false,loaded=false;
  const sounds={},recent=new Map();
  const roll=host.sound('art/rolling.mp3',true);
  const impact=host.sound('art/impact.mp3',false);
  function pause(){for(const a of [roll,impact,...Object.values(sounds)])if(a)a.pause();musicOn=rolling=false;}
  function music(){
    if(!enabled||!started||quiet||!sounds.music||musicOn)return;
    sounds.music.volume=.24;sounds.music.play();musicOn=true;
  }
  let preparing=null;
  function prepare(){
    if(preparing||loaded)return;
    preparing=host.preparePack('soundpack').then(()=>{
      for(const key of ['music','snow','wood','metal','ice1','ice2','dodge','win'])sounds[key]=host.sound('soundpack/'+key+'.mp3',key==='music');
      loaded=true;music();
    }).catch(()=>{}).finally(()=>{preparing=null;});
  }
  prepare();
  return {
    wake(){started=true;if(host.wakeAudio)host.wakeAudio();prepare();music();},
    enabled:()=>enabled,
    toggle(){enabled=!enabled;host.pref.set('muted',!enabled);if(enabled)music();else pause();return enabled;},
    suspend(value){quiet=value;if(quiet)pause();else music();},
    roll(speed,mass=12){if(!roll)return;
      if(!enabled||!started||quiet||speed<.3){if(rolling)roll.pause();rolling=false;return;}
      roll.volume=Math.min(.22,.026+speed*.009)*Math.min(1.3,.8+Math.cbrt(mass/12)*.1);
      roll.playbackRate=Math.max(.72,Math.min(1.4,.76+speed*.035-Math.log2(Math.max(1,mass/12))*.018));
      if(!rolling){roll.play();rolling=true;}
    },
    hit(type){
      if(!enabled||!started||quiet)return;
      const key=(type==='win'||type==='dodge')?type:['deer','palace','tower'].includes(type)?'ice':type==='lamp'?'metal':
        ['fence','house','tree','nutcracker'].includes(type)?'wood':type==='contact'?'impact':'snow';
      const at=Date.now();if(at-(recent.get(key)||0)<95)return;recent.set(key,at);
      const a=key==='impact'?impact:sounds[key==='ice'?(Math.random()<.5?'ice1':'ice2'):key];
      if(a){a.volume=key==='snow'?.29:.49;a.playbackRate=type==='gift'?1.25:type==='house'?.82:1;
        if(a.seek)a.seek(0);a.play();}
    }
  };
}
if(typeof module!=='undefined')module.exports=createSnowSoundscape;
