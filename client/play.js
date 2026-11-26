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
  const rolling=host.sound&&host.sound('art/rolling.mp3',true),impact=host.sound&&host.sound('art/impact.mp3',false);
  let audible=false;
  function sound(speed){
    if(!rolling)return;
    rolling.volume=Math.min(.36,speed*.022);
    if(speed>.6&&!audible){audible=true;rolling.play();}
    else if(speed<=.6&&audible){audible=false;rolling.pause();}
  }
  const account=host.createAccount(host.storage,catalog), ranking=host.ranking;
  let session=account.snapshot(),page='home',race=null,state=null,receipt=null;
  const slot=0;
  let sidebarReturn=false,paused=false,remainder=0,unsettled=null;
  function syncRank(){if(ranking)ranking.update(session).catch(()=>{});}
  let selected=0,pageIndex=0,toast='',toastUntil=0,buttons=[],pressed=null,stick=null;
  let vx=0,vz=0,keys=new Set(),dirty=true,status='',lastHud=0,previous=0,lastInput=0;
  const modeName=mode=>mode==='endless'?'无尽模式':'快速对局';
  const errorNames={insufficient_balance:'积分不足',already_owned:'已经拥有这件装扮',not_owned:'请先购买装扮',invalid_item:'没有这件装扮'};
  function note(message,ms=2200){toast=message;toastUntil=Date.now()+ms;dirty=true;}
  function go(next){
    page=next;pressed=null;buttons=[];dirty=true;
    if(next==='rank'&&ranking)ranking.own();
    if(next==='shop'){selected=session?session.equipped:0;pageIndex=0;}
  }
  function request(op,fields={}){
    try{
      const oldBalance=session.balance;
      if(op==='signin'){session=account.signin();note('签到成功　+'+(session.balance-oldBalance)+' 积分');}
      if(op==='buy'){session=account.purchase(fields.item);note('已收入衣橱，可以装备了');}
      if(op==='equip'){session=account.equip(fields.item);syncRank();note('已换好装扮');}
    }catch(e){note(errorNames[e.message]||'未能保存，请重试');}
    dirty=true;
  }
  function openMatch(mode,tutorial=false){
    receipt=null;unsettled=null;remainder=0;zero();
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
    zero();sound(0);race=null;state=null;receipt=null;unsettled=null;
    if(ranking)ranking.end();scene.reset();session=account.snapshot();go('home');openArrival();
  }
  function finish(reason){
    if(!race)return;
    unsettled=reason;
    try{receipt=account.settle(race.settlement(reason));session=receipt.account;}
    catch(e){sound(0);go('saveError');return;}
    unsettled=null;syncRank();dirty=true;
    if(reason!=='leave'&&state.mode==='endless'){
      note((reason==='win'?'夺下冰雕':'本轮结束')+'　+'+receipt.awarded+' 积分');
      race.nextSegment();scene.reset();state=race.snapshot();go('playing');
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
      if(winner===0||winner===1){
        state=race.snapshot();
        finish(winner===0?'win':state.mode==='endless'?'segment_end':'defeat');
      }
    }
    if(!race||page!=='playing')return;
    state=race.snapshot();
    if(state.contacts>contacts){if(impact)impact.play();note('雪球碰撞',900);}
    sound(state.balls[0][3]);
    if(ranking)ranking.face(state.balls[1][2]);
  }
  function sendInput(dodge=false){
    if(!race||page!=='playing'||paused)return;
    const x=vx+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const z=vz+Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
    const length=Math.max(1,Math.hypot(x,z));race.input(x/length,z/length,dodge);
  }
  if(host.keyboard)host.keyboard((key,down)=>{
    if(down)keys.add(key);else keys.delete(key);
    if(down&&key==='Enter'&&page==='home')openMatch('quick');
    sendInput(down&&key==='Space');
  });
  function hit(b,x,y){return x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height;}
  host.pointer((kind,id,px,py)=>{
    const x=(px-area.left)/scale,y=(py-area.top)/scale;
    if(kind==='down'){
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
  host.onHide(()=>{zero();sendInput();paused=true;pressed=null;sound(0);});
  host.onShow(sidebar=>{paused=false;previous=0;remainder=0;syncRank();if(sidebar){sidebarReturn=true;openArrival();}});
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
  function panel(x,y,width,height){fill(x,y,width,height,16,'rgba(24,48,69,.91)','#94adba');}
  function text(label,x,y,size,color='#fff5dc',align='left',bold=false){
    ctx.fillStyle=color;ctx.font=(bold?'bold ':'')+size+'px sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(label),x,y);
  }
  function button(id,label,x,y,width,height,action,primary=false,disabled=false){
    buttons.push({id,x,y,width,height,action,disabled});
    const down=pressed&&pressed.key===id&&pressed.over,dy=down?2:0;
    const paint=ctx.createLinearGradient(0,y,0,y+height);
    paint.addColorStop(0,disabled?'#586978':primary?'#ffdf98':down?'#395977':'#526e81');
    paint.addColorStop(1,disabled?'#425563':primary?'#e9a254':down?'#324e67':'#2c495e');
    fill(x,y+3,width,height,12,'rgba(17,32,53,.64)');
    fill(x+(down?1:0),y+dy,width-(down?2:0),height,12,paint,disabled?'#6f8190':primary?'#fff0c0':'#dfbf84');
    if(height>=32&&!disabled){
      rounded(x+3,y+dy+2,width-6,height-5,10);ctx.strokeStyle=primary?'rgba(255,245,196,.62)':'rgba(194,225,241,.22)';ctx.stroke();
    }
    if(label)text(label,x+width/2,y+height/2+dy,Math.min(17,height*.47,(width-12)/label.length),primary&&!disabled?'#52361f':'#f3f6ee','center',true);
  }
  function circle(x,y,r,color,border){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(border){ctx.lineWidth=2;ctx.strokeStyle=border;ctx.stroke();}}
  function joystick(){
    const x=stick?stick.x:68,y=stick?stick.y:h-63;
    circle(x,y,39,'rgba(30,56,79,.50)','#aacae0');circle(x+vx*25,y+vz*25,16,'#d7e8eb','#fff3cf');
  }
  function renderMenu(){
    const right=w*.61,wide=w*.34;
    text('雪球滚滚',w*.062,h*.145,40,'#173351','left',true);
    text('雪球滚滚',w*.062,h*.145-2,40,'#fff4d8','left',true);
    if(host.sidebarAvailable&&host.sidebarAvailable()){
      button('sidebar','抖音侧边栏',w*.045,h-98,109,33,()=>{
        host.openSidebar().catch(()=>note('侧边栏暂不可用'));
      });
    }
    panel(right-12,h*.18-12,wide+24,h*.52+24);
    const btnH=h*.145;
    button('quick','快速对局',right,h*.18,wide,btnH,()=>openMatch('quick'),true);
    button('endless','无尽模式',right,h*.365,wide,btnH,()=>openMatch('endless'));
    button('rank','排行榜',right,h*.55,wide,btnH,()=>go('rank'));
    const gap=8,bw=(w*.58-2*gap)/3;
    for(const [i,key,label] of [[0,'shop','换装商城'],[1,'tasks','任务'],[2,'checkin','签到']]){
      button(key,label,w*.035+i*(bw+gap),h-51,bw,38,()=>go(key));
    }
    text('积分　'+session.balance,right+wide/2,h-33,16,'#18324a','center',true);
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
    const title=state&&state.phase==='ended'?(state.winner===slot?'你夺下了大冰雕！':'对手夺下了大冰雕'):'已离开雪场';
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
    if(page==='home')renderMenu();
    if(page==='rank')renderRank();
    if(page==='saveError'){
      panel(w/2-140,h/2-54,280,108);
      text('本局进度暂未保存',w/2,h/2-24,17,'#ffe6bd','center');
      button('retry','重新保存',w/2-75,h/2+5,150,34,()=>finish(unsettled),true);
    }
    if(['shop','tasks','checkin'].includes(page)){
      if(page==='shop')fill(w*.021,h-130,w*.314,67,12,'rgba(25,48,67,.82)');
      host.drawCollection({w,h,headerRight,button,text,panel,back:home,action:(op,item)=>request(op,{item}),preview:()=>{}},
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
        fill(mx-33,my-9,66,18,8,'rgba(25,51,73,.77)');
        text((!ranking||!ranking.canvas?'训练 ':'对手 ')+m.distance+'m',mx,my,11,'#ffe2a3','center');
      }
      joystick();
      const cooling=ball[5]<99.9;
      button('dodge',cooling?'闪避 '+Math.ceil((100-ball[5])*3/100)+'s':'闪避',w-99,h-86,79,58,()=>sendInput(true),true,cooling);
      if(state.tutorial){
        function hint(label,x,y){
          const width=label.length*14+20;
          fill(x-width/2,y-12,width,24,12,'rgba(22,44,62,.9)');
          text(label,x,y,13,'#fff4d9','center');
        }
        if(elapsed<14||ball[4]<16){
          hint('拖动左侧摇杆移动',82,h-123);hint('点右侧闪避',w-63,h-105);
        }
        if(ball[4]<state.goal)hint('撞物品变大，躲开比你大的雪球',w/2,h-29);
        if(ball[4]>=state.goal)hint('长到目标重量，撞碎大冰雕',w/2,h-29);
      }
    }
    if(page==='ended'||page==='result')renderResult();
    if(now<toastUntil){
      const tw=Math.min(w-32,Math.max(90,toast.length*15+22));fill((w-tw)/2,h*.73,tw,29,12,'rgba(24,42,61,.94)');
      text(toast,w/2,h*.73+15,14,'#fff1cd','center');
    }
    const desc=[page,'local',state?slot:'',state?state.mode:'',state?state.present.filter(Boolean).length:'',session?session.equipped:'',session?session.balance:''].join('|');
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
    if(page==='rank'||(page==='playing'&&!state.tutorial))scene.drawRankLabel(page==='rank');
    scene.renderer.autoClear=true;host.frame(frame);
  }
  syncRank();
  if(!session.tutorial_done)openMatch('quick',true);
  host.frame(frame);
}
if(typeof module!=='undefined')module.exports=playSnow;
