async function playSnow(T,host,makeScene){
  const catalog=await host.catalog(), scene=await makeScene(T,host,catalog);
  const area=host.safe&&host.safe.right<=host.w&&host.safe.bottom<=host.h&&host.safe.right>host.safe.left&&host.safe.bottom>host.safe.top
    ? host.safe : {left:0,top:0,right:host.w,bottom:host.h};
  let ratio=Math.min(host.ratio,1.6);
  const scale=Math.min((area.right-area.left)/700,(area.bottom-area.top)/335);
  const w=(area.right-area.left)/scale,h=(area.bottom-area.top)/scale, overlay=host.layer();
  const headerRight=host.menu&&host.menu.left>host.w*.5?Math.min(w,(host.menu.left-area.left)/scale-12):host.touch?w-98:w;
  overlay.width=Math.round(host.w*ratio);overlay.height=Math.round(host.h*ratio);
  const ctx=overlay.getContext('2d'),texture=new T.CanvasTexture(overlay);
  texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
  const hudScene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.01,4);
  camera.position.z=1;
  hudScene.add(new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false})));
  const audio=host.makeAudio(host),displayFont=await host.loadTypeface().catch(()=>null);
  const sound=speed=>audio.roll(speed,state&&state.balls[0][4]||12);
  const account=host.createAccount(host.storage,catalog), ranking=host.ranking;
  let session=account.snapshot(),page='home',race=null,state=null,receipt=null;
  const [emblem,icons]=await Promise.all(['art/snow-title.png','art/outfit-icons.png'].map(path=>host.image(path).catch(()=>null)));
  const slot=0;
  let rankNames=[];
  let guidePage=0,ad=null,adSequence=0,adOrigin='',lastCollected=new Set();
  const names=['你','棉花糖','小北极','雪球队长','松果','极光','奶油泡芙','冬眠熊','薄荷','雪松','铃铛','糖霜','北风','小鹿','霜花','暖灯'];
  function enterAfterGuide(){
    if(++guidePage<host.guide.count){go('guide');return;}
    host.pref.set('guide-complete',true);openMatch('quick',!session.tutorial_done);
  }
  let sidebarReturn=false,paused=false,remainder=0,unsettled=null;
  function syncRank(){if(ranking)ranking.update(session).catch(()=>{});}
  let selected=0,pageIndex=0,toast='',toastUntil=0,buttons=[],pressed=null,stick=null;
  let vx=0,vz=0,keys=new Set(),dirty=true,status='',lastHud=0,previous=0,lastInput=0;
  const modeName=mode=>mode==='endless'?'无尽模式':'快速对局';
  const errorNames={insufficient_balance:'积分不足',already_owned:'已经拥有这件装扮',not_owned:'请先购买装扮',invalid_item:'没有这件装扮'};
  function note(message,ms=2200){toast=message;toastUntil=Date.now()+ms;dirty=true;}
  function go(next){
    page=next;pressed=null;buttons=[];dirty=true;
    if(next==='checkin'||next==='shop')session=account.snapshot();
    if(next==='rank'&&ranking)ranking.own();
    if(next==='shop'){selected=session?session.equipped:0;pageIndex=0;}
  }
  function request(op,fields={}){
    if(op==='reward_ad'||op==='makeup_signin'){watch(op,fields.item);return;}
    try{
      const oldBalance=session.balance;
      if(op==='signin'){session=account.signin();note('签到成功　+'+(session.balance-oldBalance)+' 积分');}
      if(op==='buy'){session=account.purchase(fields.item);note('已收入衣橱，可以装备了');}
      if(op==='equip'){session=account.equip(fields.item);syncRank();note('已换好装扮');}
    }catch(e){note(errorNames[e.message]||'未能保存，请重试');}
    dirty=true;
  }
  const benefit={revive:'本局复活一次',makeup_signin:'补签昨天',reward_ad:'获得 20 积分'};
  function watch(op,target){
    if(ad)return;
    if(!host.watchReward&&!host.previewRewards){note('广告暂未开放');return;}
    if(op==='revive'&&(!state||!state.canRevive))return;
    ad={op,target,claim:'v-'+Date.now().toString(36)+'-'+(++adSequence)+'-'+Math.random().toString(36).slice(2),
      run:race,shopPage:pageIndex,defeat:state&&state.defeatId};
    adOrigin=page;audio.suspend(true);zero();const pending=ad;
    if(host.previewRewards){go('webAd');return;}
    dirty=true;Promise.resolve().then(()=>host.watchReward()).then(ok=>resolveAd(pending,ok),
      ()=>resolveAd(pending,false,'广告暂不可用，请稍后再试'));
  }
  function resolveAd(pending,completed,err){
    if(!pending||ad!==pending)return;
    ad=null;go(adOrigin);if(adOrigin==='shop'){selected=pending.target;pageIndex=pending.shopPage;}audio.suspend(paused);
    if(!completed){note(err||'已关闭，奖励未领取');return;}
    try{
      if(pending.op==='revive'){
        if(race!==pending.run||!race.revive(pending.defeat))return;
        state=race.snapshot();zero();remainder=0;previous=0;scene.reset();go('playing');note('已复活 · 短暂无敌');
      }else if(pending.op==='makeup_signin'){
        session=account.makeupSignin(pending.target,pending.claim);note('补签成功');
      }else{
        session=account.rewardAd(pending.target,pending.claim);selected=pending.target;
        note('已获得 20 积分');
      }
    }catch(_){note('奖励条件已变化，请重新查看');}
  }
  function openMatch(mode,tutorial=false){
    receipt=null;unsettled=null;remainder=0;lastCollected.clear();zero();
    race=host.createRace(mode,tutorial,session.equipped);
    if(ranking)ranking.begin(tutorial);
    scene.reset();scene.setLevel(race.props);state=race.snapshot();go('playing');
  }
  function openArrival(){
    if(sidebarReturn&&page==='home'&&session.tutorial_done){
      sidebarReturn=false;go('checkin');
    }
  }
  function zero(){keys.clear();stick=null;vx=vz=0;}
  function home(){
    zero();sound(0);race=null;state=null;receipt=null;unsettled=null;toastUntil=0;
    if(ranking)ranking.end();scene.reset();session=account.snapshot();go('home');openArrival();
  }
  function finish(reason){
    if(!race)return;
    unsettled=reason;
    try{receipt=account.settle(race.settlement(reason));session=receipt.account;}
    catch(e){sound(0);go('saveError');return;}
    unsettled=null;syncRank();dirty=true;
    if((reason==='win'||reason==='segment_end')&&state.mode==='endless'){
      note((reason==='win'?'夺下冰雕':'本轮结束')+'　+'+receipt.awarded+' 积分');
      race.nextSegment();lastCollected.clear();scene.reset();state=race.snapshot();go('playing');
    }else{
      if(reason==='leave'){race=null;state=null;scene.reset();}
      sound(0);zero();go(state?'ended':'result');
    }
  }
  function leave(){if(page==='playing')finish('leave');else home();}
  function advance(dt){
    if(!race||page!=='playing'||paused)return;
    remainder+=dt;
    const contacts=state.contacts;
    while(remainder>=1/30&&page==='playing'){
      remainder-=1/30;
      const winner=race.step(1/30);
      if(Number.isInteger(winner)&&winner>=0){
        state=race.snapshot();
        if(state.defeatedByCrush){audio.hit('contact');zero();sound(0);go('crushed');break;}
        audio.hit(winner===0?'win':'palace');
        finish(winner===0?'win':state.mode==='endless'?'segment_end':'defeat');
      }
    }
    if(!race||page!=='playing')return;
    state=race.snapshot();
    if(state.contacts>contacts){audio.hit('contact');if(state.crushes)note('被碾压 '+state.crushes+' / 2',900);}
    sound(state.balls[0][3]);
    const hidden=new Set(state.hidden),player=state.balls[0];
    for(const id of hidden)if(!lastCollected.has(id)){
      const [type,x,z]=race.props[id];if(Math.hypot(x-player[0],z-player[1])<.8*Math.cbrt(player[4]/12)+12)audio.hit(type);
    }
    lastCollected=hidden;
    if(ranking)ranking.face(state.balls);
  }
  function sendInput(dodge=false){
    if(!race||page!=='playing'||paused)return;
    const x=vx+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const z=vz+Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
    if(dodge&&state.balls[0][5]>=99.9)audio.hit('dodge');
    const length=Math.max(1,Math.hypot(x,z));race.input(x/length,z/length,dodge);
  }
  if(host.keyboard)host.keyboard((key,down)=>{
    if(down)audio.wake();
    if(down&&page==='guide'&&key==='Enter'){enterAfterGuide();return;}
    if(down)keys.add(key);else keys.delete(key);
    if(down&&key==='Enter'&&page==='home')openMatch('quick');
    sendInput(down&&key==='Space');
  });
  function hit(b,x,y){return x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height;}
  host.pointer((kind,id,px,py)=>{
    const x=(px-area.left)/scale,y=(py-area.top)/scale;
    if(kind==='down'){
      audio.wake();if(ad&&!host.previewRewards)return;
      const target=buttons.slice().reverse().find(b=>hit(b,x,y));
      if(target){if(!target.disabled){pressed={id,key:target.id,over:true};dirty=true;}return;}
      if((page==='playing')&&!stick&&x<w*.5&&y>h*.4){
        stick={id,x,y};vx=vz=0;dirty=true;
      }
      return;
    }
    if(pressed&&pressed.id===id){
      const b=buttons.find(b=>b.id===pressed.key),over=b&&hit(b,x,y);
      pressed.over=over;dirty=true;
      if(kind==='up'||kind==='cancel'){
        pressed=null;if(kind==='up'&&over&&!b.disabled)b.action();
      }
      return;
    }
    if(!stick||stick.id!==id)return;
    if(kind==='up'||kind==='cancel'){stick=null;vx=vz=0;}
    else{const dx=(x-stick.x)/34,dz=(y-stick.y)/34,len=Math.max(1,Math.hypot(dx,dz));vx=dx/len;vz=dz/len;}
    sendInput();dirty=true;
  });
  host.onHide(()=>{audio.suspend(true);zero();sendInput();paused=true;pressed=null;sound(0);});
  host.onShow(sidebar=>{paused=false;session=account.snapshot();audio.suspend(!!ad);previous=0;remainder=0;syncRank();if(sidebar){sidebarReturn=true;openArrival();}});
  function rounded(x,y,width,height,r){
    r=Math.min(r,height/2,width/2);
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+width,y,x+width,y+height,r);
    ctx.arcTo(x+width,y+height,x,y+height,r);ctx.arcTo(x,y+height,x,y,r);
    ctx.arcTo(x,y,x+width,y,r);ctx.closePath();
  }
  function fill(x,y,width,height,r,color,border){
    rounded(x,y,width,height,r);ctx.fillStyle=color;ctx.fill();
    if(border){ctx.strokeStyle=border;ctx.lineWidth=1;ctx.stroke();}
  }
  const display=displayFont?'"'+displayFont+'", sans-serif':'"Microsoft YaHei", sans-serif';
  function text(label,x,y,size,color='#fff5dc',align='left',bold=false){
    ctx.save();ctx.fillStyle=color;ctx.font=(bold?'bold ':'')+size+'px '+(bold?display:'"PingFang SC","Microsoft YaHei",sans-serif');
    ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(label),x,y);ctx.restore();
  }
  function gradient(y,height,stops){
    const g=ctx.createLinearGradient(0,y,0,y+height);
    stops.forEach(([t,c])=>g.addColorStop(t,c));return g;
  }
  function panel(x,y,width,height){
    fill(x,y+3,width,height,15,'rgba(30,18,23,.44)');
    fill(x,y,width,height,15,gradient(y,height,[[0,'#704329'],[.1,'#bf8853'],[.55,'#835335'],[1,'#523525']]),'#e2b374');
    fill(x+3,y+3,width-6,height-6,12,gradient(y,height,[[0,'#24454c'],[.5,'#193a40'],[1,'#102b30']]),'#cea779');
  }
  function snowcap(x,y,width,depth){
    ctx.beginPath();ctx.moveTo(x,y+depth);ctx.quadraticCurveTo(x+width*.07,y-depth*.35,x+width*.22,y+.7);
    ctx.bezierCurveTo(x+width*.32,y+depth*.55,x+width*.38,y-depth*.4,x+width*.53,y);
    ctx.bezierCurveTo(x+width*.71,y+depth*.5,x+width*.80,y-depth*.35,x+width*.91,y+1);
    ctx.quadraticCurveTo(x+width,y+1,x+width,y+depth*.9);
    ctx.quadraticCurveTo(x+width*.92,y+depth*.5,x+width*.83,y+depth);
    ctx.quadraticCurveTo(x+width*.62,y+depth*.25,x+width*.53,y+depth*.88);
    ctx.quadraticCurveTo(x+width*.36,y+depth*.42,x+width*.23,y+depth*1.14);
    ctx.quadraticCurveTo(x+width*.12,y+depth*.52,x,y+depth);ctx.closePath();
    ctx.fillStyle=gradient(y,depth*1.3,[[0,'#fffdf1'],[.45,'#f4f9ff'],[1,'#adb9d6']]);ctx.fill();
  }
  function plaque(x,y,bw,bh,gold,down=false,disabled=false,snowTop=false){
    const r=Math.min(bh*.48,22),dy=down?2:0;y+=dy;
    fill(x,y+3,bw,bh,r,'#553a30');
    fill(x,y,bw,bh,r,gradient(y,bh,[[0,'#fff2c2'],[.28,'#c99044'],[.6,'#9d632e'],[1,'#f8cc82']]),'#71482b');
    const colors=disabled?['#788782','#485b5c','#35474c']:gold?['#ffe090','#ffb02c','#e8850f']:['#366a6a','#194b51','#10363b'];
    fill(x+2.6,y+2.5,bw-5.2,bh-5.1,r-2,gradient(y,bh,[[0,colors[0]],[.54,colors[1]],[1,colors[2]]]),gold?'#ffebaf':'#c2a370');
    if(bw>=82&&bh>=29){for(const rx of [x+9,x+bw-9]){
      circle(rx,y+bh*.59,2.25,'#916136');circle(rx,y+bh*.56,1.8,'#f5c781');circle(rx-.45,y+bh*.54,.7,'#fff3b7');
    }}
    if(snowTop)snowcap(x+bw*.08,y-2,bw*.84,Math.min(8,bh*.14));
  }
  function menuIcon(id,x,y){
    ctx.save();ctx.translate(x,y);ctx.rotate(-.13);
    if(id==='shop'){
      fill(-9,-4,6,14,2,'#eec999');fill(-7,0,6,9,2,'#ae412f');
      fill(-9,-7,21,10,4,'#bb4a36','#f9cba1');for(const dx of [-4,3])fill(dx,-7,3,10,1,'#ffdfaf');
    }else{
      fill(-8,-9,17,20,3,'#ad7847');fill(-7,-10,15,18,2,'#fff0c9','#c69b62');
      if(id==='tasks'){ctx.strokeStyle='#39716c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(-2,1);ctx.lineTo(3,-5);ctx.stroke();fill(-4,4,8,1,1,'#a97d50');}
      else{fill(-7,-10,15,5,2,'#c95540');text('7',0,1,11,'#795135','center',true);}
    }
    ctx.restore();
  }
  function button(id,label,x,y,width,height,action,primary=false,disabled=false){
    buttons.push({id,x,y,width,height,action,disabled});
    const down=pressed&&pressed.key===id&&pressed.over;
    plaque(x,y,width,height,primary,down,disabled,['quick','endless','shop','tasks','checkin','start-final'].includes(id));
    if(!label)return;
    const nav=['shop','tasks','checkin'].includes(id);
    if(nav)menuIcon(id,x+19,y+height*.52+(down?2:0));
    const labelX=x+width/2+(nav?9:0);
    const size=Math.min(primary&&height>45?29:19,height*.5,(width-(width>80?22:9))/Math.max(1,label.length));
    text(label,labelX,y+height*.53+(down?2:0)+1,size,primary?'#fdd47d':'#0a2328','center',true);
    text(label,labelX,y+height*.53+(down?2:0),size,disabled?'#c0c9c9':primary?'#69350e':'#fff3d8','center',true);
  }
  function circle(x,y,r,color,border){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(border){ctx.lineWidth=2;ctx.strokeStyle=border;ctx.stroke();}}
  function joystick(){
    const x=stick?stick.x:68,y=stick?stick.y:h-63;
    circle(x,y,39,'rgba(30,56,79,.50)','#aacae0');circle(x+vx*25,y+vz*25,16,'#d7e8eb','#fff3cf');
  }
  function renderMenu(){
    const x=w*.029,y=h*.055;
    if(emblem)ctx.drawImage(emblem,x,y-7,190,190*emblem.height/emblem.width);
    else{plaque(x,y,187,54,false,false,false,true);text('雪球滚滚',x+93,y+27,37,'#fff5e1','center',true);}
    const navY=h-50;
    button('shop','衣橱',x,navY,77,36,()=>go('shop'));
    button('tasks','任务',x+84,navY,77,36,()=>go('tasks'));
    button('checkin','签到',x+168,navY,77,36,()=>go('checkin'));
    const right=w-204;
    button('quick','快速对局  ›',right,h-69,184,52,()=>openMatch('quick'),true);
    button('endless','无尽模式',right+45,h-113,139,32,()=>openMatch('endless'));
    const end=Math.min(w-15,headerRight);
    button('rank','排行榜',end-82,14,82,33,()=>go('rank'));
    plaque(end-184,14,94,33,false);text('❄ '+session.balance,end-137,31,16,'#ffdda0','center',true);
    button('sound',audio.enabled()?'声音 开':'声音 关',x, y+86,72,26,()=>{audio.toggle();dirty=true;});
    button('replay-guide','玩法指引',x,y+118,72,26,()=>{guidePage=0;go('guide');});
    if(host.sidebarAvailable&&host.sidebarAvailable())button('sidebar','侧边栏',x,y+150,72,26,()=>host.openSidebar().catch(()=>note('侧边栏暂不可用')));
  }
  function renderRank(){
    const x=w/2-196,y=h/2-115;panel(x,y,392,230);
    text('雪球重量榜',w/2,y+29,23,'#ffda96','center',true);
    text('个人最高　'+Math.floor(session.best_peak_kg)+' kg',w/2,y+60,16,'#f1f8fa','center');
    if(!ranking){
      text('网页版仅记录本机成绩。',w/2,y+102,16,'#dcebf0','center');
      text('玩家总榜和真实玩家装扮可在抖音版查看。',w/2,y+131,14,'#dcebf0','center');
      button('rank-back','返回',x+130,y+182,132,32,home);return;
    }
    text('公开名片后，你的雪球将由 AI 代打。',w/2,y+87,14,'#dcebf0','center');
    text('对局只展示你的游戏 ID 和已穿戴的装扮。',w/2,y+108,14,'#dcebf0','center');
    button('rank-consent',ranking&&ranking.sharing()?'收起公开名片':'公开我的挑战名片',x+21,y+132,170,37,()=>{
      if(!ranking)return note('请在抖音内使用');
      const enabled=!ranking.sharing();
      ranking.share(enabled,session).then(()=>note(enabled?(session.best_peak_kg?'已公开挑战名片':'完成有效对局后公开'):'已收起名片')).catch(()=>note('已保存设置，联网后更新'));
      dirty=true;
    });
    button('rank-show','查看总榜',x+201,y+132,170,37,()=>{
      if(!ranking)return note('请在抖音内查看');
      ranking.update(session).catch(()=>{});ranking.show().catch(()=>note('暂时无法打开，请确认已登录抖音'));
    },true);
    button('rank-back','返回',x+130,y+182,132,32,home);
  }
  function renderResult(){
    const rw=330,rh=216,x=(w-rw)/2,y=(h-rh)/2;
    panel(x,y,rw,rh);
    const title=state&&state.defeatedByCrush?'雪球被碾碎了':state&&state.phase==='ended'?(state.winner===slot?'你夺下了大冰雕！':'对手夺下了大冰雕'):'已离开雪场';
    text(state&&state.tutorial?'首局结束':title,w/2,y+33,23,'#ffdb98','center',true);
    if(state&&state.tutorial){
      text(title,w/2,y+88,20,'#f1f8f8','center',true);
    }else if(receipt){
      const gained=receipt.run_awarded+receipt.run_task_awarded;
      text('本次共得 '+gained+' 积分　·　末段 '+receipt.peak+' kg',w/2,y+77,17,'#f1f8f8','center');
      text('参与 +'+receipt.participation_points+'　重量 +'+receipt.weight_points,w/2,y+109,14,'#d6e9ef','center');
      const tasks=(receipt.task_awards||[]).reduce((sum,a)=>sum+a.reward,0);
      text((tasks?'本段任务 +'+tasks+'　':'')+'当前积分 '+session.balance,w/2,y+136,14,'#edcc99','center');
    }else{text('正在接收结算…',w/2,y+94,16,'#e1eef2','center');}
    button('return','返回大厅',x+55,y+157,rw-110,42,state?leave:home,true);
  }
  function hud(now){
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,overlay.width,overlay.height);
    ctx.setTransform(ratio*scale,0,0,ratio*scale,ratio*area.left,ratio*area.top);buttons=[];
    rankNames=[];
    if(page==='home')renderMenu();
    if(page==='guide')host.guide.draw({w,h,button,text,panel,circle,fill},guidePage,enterAfterGuide);
    if(page==='crushed'||page==='webAd'){
      const bw=348,bh=191,x=(w-bw)/2,y=(h-bh)/2;panel(x,y,bw,bh);
      if(page==='webAd'){
        text('网页试玩 · 模拟广告',w/2,y+38,23,'#ffe3a9','center',true);
        text('完成后'+benefit[ad.op],w/2,y+80,16,'#f5efdc','center');
        button('skip-ad','放弃奖励',x+20,y+122,132,43,()=>resolveAd(ad,false));
        button('complete-ad','模拟看完',x+168,y+122,159,43,()=>resolveAd(ad,true),true);
      }else{
        text('雪球被碾碎了',w/2,y+36,25,'#ffe5ad','center',true);
        text('本条命已被碾压两次',w/2,y+73,15,'#f6eddc','center');
        text('本局剩余复活 '+Math.max(0,2-state.revives)+' 次',w/2,y+97,15,'#ffd994','center');
        button('finish-crush','结束本局',x+21,y+128,130,41,()=>finish('defeat'),false,!!ad);
        button('revive','看广告复活',x+164,y+128,163,41,()=>watch('revive'),true,!!ad||!state.canRevive);
      }
    }
    if(page==='rank')renderRank();
    if(page==='saveError'){
      panel(w/2-140,h/2-54,280,108);
      text('本局进度暂未保存',w/2,h/2-24,17,'#ffe6bd','center');
      button('retry','重新保存',w/2-75,h/2+5,150,34,()=>finish(unsettled),true);
    }
    if(['shop','tasks','checkin'].includes(page)){
      if(page==='shop')fill(w*.021,h-130,w*.314,67,12,'rgba(25,48,67,.82)');
      host.drawCollection({w,h,headerRight,button,text,panel,icon:(id,x,y,size)=>{if(icons)ctx.drawImage(icons,((id-1)%8)*96,Math.floor((id-1)/8)*96,96,96,x-size/2,y-size/2,size,size);},
        back:home,action:(op,item)=>request(op,{item}),preview:()=>{}},
        {page,account:session,catalog,selected,pageIndex,setSelected:id=>{selected=id;dirty=true;},setPageIndex:n=>{pageIndex=n;dirty=true;}});
    }
    if(page==='playing'){
      const ball=state.balls[slot],elapsed=Math.floor(state.time);
      panel(12,10,172,63);text(Math.floor(ball[4])+' kg',25,30,23,'#ffdb98','left',true);
      text(modeName(state.mode)+'　'+Math.floor(elapsed/60)+'分'+elapsed%60+'秒',25,57,13);
      const label=state.mode==='endless'?'第 '+(state.segment+1)+' 座大冰雕':'争夺大冰雕';
      const goal=label+'　'+state.goal+' kg';
      fill(w/2-97,14,194,29,14,'rgba(25,51,73,.88)');text(goal,w/2,29,14,'#ffe4b0','center',true);
      if(ball[4]>=state.goal&&!state.hidden.includes(0)){
        const mark=scene.goalMarker(slot);
        const mx=mark.edge?w/2:(mark.x-area.left)/scale,my=mark.edge?60:Math.max(62,(mark.y-area.top)/scale);
        fill(mx-53,my-12,106,24,10,'rgba(78,53,39,.94)');
        const arrow=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(mark.angle/(Math.PI/4))+8)%8];
        text((mark.edge?arrow+' ':'')+'冰雕 '+mark.distance+' m',mx,my,13,'#ffe5a4','center',true);
      }
      if(!state.tutorial)button('leave',state.mode==='endless'?'结算离场':'离场',14,82,state.mode==='endless'?78:58,30,leave);
      if(state.present[1-slot]){
        const m=scene.opponentMarker(slot);
        const mx=(m.x-area.left)/scale,my=(m.y-area.top)/scale;
        if(mx<w-167||my>180){fill(mx-33,my-9,66,18,8,'rgba(25,51,73,.77)');
        text((!ranking||!ranking.canvas?'训练 ':'对手 ')+m.distance+'m',mx,my,11,'#ffe2a3','center');}
      }
      joystick();
      const cooling=ball[5]<99.9;
      button('dodge',cooling?'闪避 '+Math.ceil((100-ball[5])*3/100)+'s':'闪避',w-99,h-86,79,58,()=>sendInput(true),true,cooling);
      const ordered=state.ranking||[];
      const rows=ordered.slice(0,5),own=ordered.find(e=>e.slot===slot);
      if(own&&own.rank>5)rows.push(own);
      const bw=142,rh=16,rx=w-bw-10,ry=50;
      fill(rx,ry,bw,26+rows.length*rh,11,'rgba(15,43,50,.86)','#d7ad73');
      text('雪场排行',rx+10,ry+13,13,'#ffe2a9','left',true);
      rows.forEach((entry,i)=>{
        const you=entry.slot===0,yy=ry+32+i*rh;
        if(you)fill(rx+3,yy-7,bw-6,15,6,'#5f542f');
        text(entry.rank,rx+9,yy,11,'#f2d296');
        if(!you&&ranking&&ranking.canvas&&!state.tutorial){
          rankNames.push({slot:entry.slot,x:area.left+(rx+60)*scale,y:area.top+yy*scale,w:62*scale,h:13*scale});
        }else text(names[entry.slot],rx+29,yy,11,you?'#fff3b0':'#e8f1ec');
        text(Math.floor(entry.mass)+' kg',rx+bw-8,yy,11,'#fff1d0','right');
      });
    }
    if(page==='ended'||page==='result')renderResult();
    if(now<toastUntil){
      const tw=Math.min(w-32,Math.max(90,toast.length*15+22));fill((w-tw)/2,h*.73,tw,29,12,'rgba(24,42,61,.94)');
      text(toast,w/2,h*.73+15,14,'#fff1cd','center');
    }
    const desc=[page,'local',state?slot:'',state?state.mode:'',state?state.present.filter(Boolean).length:'',session?session.equipped:'',session?session.balance:'',page==='guide'?guidePage+1:''].join('|');
    if(desc!==status){status=desc;host.status(desc);}
    texture.needsUpdate=true;dirty=false;
  }
  function frame(time){
    const now=Date.now(),dt=Math.min(.10,Math.max(.001,(time-previous)/1000||.016));previous=time;
    const density=page==='shop'?scene.menuRatio:Math.min(host.ratio,1.6);
    if(ratio!==density){
      ratio=density;texture.dispose();
      overlay.width=Math.round(host.w*ratio);overlay.height=Math.round(host.h*ratio);dirty=true;
    }
    if(now-lastInput>=100){sendInput();lastInput=now;}
    advance(dt);
    scene.draw(state,slot,dt,{page,itemId:page==='shop'?selected:session?session.equipped:0});
    if(dirty||time-lastHud>=65){hud(now);lastHud=time;}
    scene.renderer.autoClear=false;scene.renderer.render(hudScene,camera);
    if(page==='rank'||(page==='playing'&&!state.tutorial))scene.drawRankLabel(page==='rank',rankNames);
    scene.renderer.autoClear=true;host.frame(frame);
  }
  syncRank();
  if(!session.tutorial_done){
    if(host.pref.get('guide-complete'))openMatch('quick',true);else go('guide');
  }
  host.frame(frame);
}
if(typeof module!=='undefined')module.exports=playSnow;
