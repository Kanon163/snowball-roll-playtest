/* 旧雪村的地标与在线对战共用一套比例。 */
async function createSnowScene(T, host, catalog) {
  const canvas = host.screen;
  const renderer = new T.WebGLRenderer({canvas, antialias: true, alpha: false});
  const matchRatio=Math.min(1.6,host.ratio);
  const menuRatio=Math.min(host.ratio,3,Math.sqrt(3200000/(host.w*host.h)));
  renderer.setPixelRatio(matchRatio);
  renderer.setSize(host.w, host.h, false);
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.background = new T.Color(0x324566);
  if(host.image){
    const sky=new T.Texture(await host.image('art/twilight.jpg'));
    sky.colorSpace=T.SRGBColorSpace;sky.offset.y=-.39;sky.needsUpdate=true;
    scene.background=sky;
  }
  scene.fog = new T.FogExp2(0x96a8cc, .014);
  const camera = new T.PerspectiveCamera(50, host.w / host.h, .12, 420);
  scene.add(new T.HemisphereLight(0xd6e3ff, 0x657190, 1.34));
  const moon = new T.DirectionalLight(0xffdeb5, 2.2);
  moon.position.set(-28, 45, -17);
  scene.add(moon);
  const cold = new T.DirectionalLight(0x94deff, 1.1);
  cold.position.set(18, 9, 12);
  scene.add(cold);
  const portraitLight=new T.DirectionalLight(0xffefe0,2.15);
  portraitLight.position.set(-2.5,4.2,35.5);portraitLight.target.position.set(0,2,29);
  portraitLight.visible=false;scene.add(portraitLight,portraitLight.target);
  function paint(color) { return new T.MeshStandardMaterial({color, roughness:.84}); }
  function piece(parent, geom, mat, x, y, z, sx=1, sy=sx, sz=sx) {
    const m = new T.Mesh(geom,mat);
    m.position.set(x,y,z);
    m.scale.set(sx,sy,sz);
    parent.add(m);
    return m;
  }
  const sphere = new T.SphereGeometry(1, 32, 22);
  const cube = new T.BoxGeometry(1,1,1);
  const cone = new T.ConeGeometry(1,1,8);
  const disk = new T.CircleGeometry(1,28);
  const snow = paint(0xf0f8fc), pine=paint(0x245761), wood=paint(0x63464a);
  const coal=paint(0x233342), orange=paint(0xff9843), gold=paint(0xffd177);
  const powder=paint(0xcbd6f3);
  powder.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 snowField;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsnowField=position.xy;');
    shader.fragmentShader='varying vec2 snowField;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float ridge=sin(snowField.x*.76+sin(snowField.y*.38)*1.9+snowField.y*.65);
      float ripple=sin(snowField.y*4.1+snowField.x*2.4+ridge*5.);
      vec2 cell=floor(snowField*64.);
      float grain=fract(sin(dot(cell,vec2(27.13,92.71)))*4385.32);
      diffuseColor.rgb*=.94+.032*ridge+.025*ripple+.073*(grain-.5);
      diffuseColor.rgb+=vec3(.12,.12,.17)*step(.989,grain);
    `);
  };
  const ground=piece(scene,new T.CircleGeometry(185,96),powder,0,-.06,0);
  ground.rotation.x=-Math.PI/2;
  const border = piece(scene,new T.RingGeometry(67.9,68.3,128),paint(0x6e96ac),0,-.035,0);
  border.rotation.x=-Math.PI/2;
  const contact=new T.MeshBasicMaterial({color:0x596e8b,transparent:true,opacity:.25,depthWrite:false});
  function shadow(parent,r) {
    const obj=piece(parent,disk,contact,0,.015,0,r, r,1);
    obj.rotation.x=-Math.PI/2;
    return obj;
  }
  async function model(name) {
    const buf=await host.read('art/'+name+'.mesh');
    const v=new DataView(buf), count=v.getUint32(0,true), n=v.getUint32(4,true);
    const pos=new Float32Array(count*3), col=new Float32Array(count*3);
    const ix=new Uint16Array(n);
    const color=new T.Color();
    for(let i=0;i<count*3;i++) pos[i]=v.getInt16(8+i*2,true)/1000;
    const start=8+count*6;
    for(let i=0;i<count;i++) {
      color.setRGB(v.getUint8(start+i*3)/255,v.getUint8(start+i*3+1)/255,v.getUint8(start+i*3+2)/255,T.SRGBColorSpace);
      color.toArray(col,i*3);
    }
    for(let i=0;i<n;i++) ix[i]=v.getUint16(start+count*3+i*2,true);
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(pos,3));
    g.setAttribute('color',new T.BufferAttribute(col,3));
    g.setIndex(new T.BufferAttribute(ix,1));
    g.computeVertexNormals();
    return g;
  }
  const palace=await model('palace');
  const iceMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.26,metalness:.18});
  const pink=paint(0xc65265), mint=paint(0x3b9a91);
  const templates={};
  const glacier=new T.MeshStandardMaterial({color:0x9adbeb,roughness:.18,metalness:.22});
  const lamp=new T.MeshBasicMaterial({color:0xffbd69});
  const bark=paint(0xbb8156), timber=paint(0x75503a), slate=paint(0x424961);
  const boards=host.layer();boards.width=192;boards.height=192;
  const brush=boards.getContext('2d');
  brush.fillStyle='#e1bc8d';brush.fillRect(0,0,192,192);
  for(let i=0;i<8;i++){
    const y=i*24;brush.fillStyle=i%2?'#d4ac80':'#e3bd93';brush.fillRect(0,y,192,24);
    brush.fillStyle='#86664e';brush.fillRect(0,y,192,2);
    for(let j=0;j<4;j++){
      brush.strokeStyle='rgba(90,59,45,.20)';brush.beginPath();
      for(let x=0;x<=192;x+=4){const v=y+4+j*4+1.3*Math.sin(x*.065+i*3+j);if(!x)brush.moveTo(x,v);else brush.lineTo(x,v);}brush.stroke();
    }
  }
  bark.map=new T.CanvasTexture(boards);bark.map.colorSpace=T.SRGBColorSpace;
  const facade=new T.Shape();facade.moveTo(-2.5,0);facade.lineTo(2.5,0);facade.lineTo(0,1.45);facade.closePath();
  const atticGeo=new T.ExtrudeGeometry(facade,{depth:4.64,bevelEnabled:false});
  function lodge(g){
    piece(g,cube,bark,0,1.37,0,5,2.73,4.7);
    piece(g,cube,slate,0,.16,0,5.35,.31,4.99);
    for(let i=0;i<2;i++){
      const s=i===0?-1:1;
      const roof=piece(g,cube,slate,s*1.53,3.38,0,3.57,.24,5.75);roof.rotation.z=-s*.52;
      const cap=piece(g,cube,snow,s*1.53,3.56,0,3.69,.27,5.85);cap.rotation.z=-s*.52;
      piece(g,cube,timber,s*2.3,1.37,2.39,.23,2.68,.19);
      piece(g,cube,timber,s*1.55,1.65,2.39,1.28,1.27,.18);
      piece(g,cube,lamp,s*1.55,1.67,2.50,1.05,.97,.08);
      piece(g,cube,bark,s*1.55,1.67,2.55,.09,1.03,.09);
      piece(g,cube,bark,s*1.55,1.67,2.55,1.08,.09,.09);
      piece(g,cube,snow,s*1.55,1.09,2.57,1.38,.13,.32);
      piece(g,cube,timber,s*2.51,1.65,.45,.12,1.22,1.35);
      piece(g,cube,lamp,s*2.59,1.66,.45,.08,.96,1.10);
    }
    piece(g,atticGeo,bark,0,2.71,-2.32);
    piece(g,cube,timber,0,1,2.38,.95,2.05,.18);
    piece(g,sphere,gold,.29,1.04,2.49,.067);
    for(let i=0;i<8;i++){
      const x=(i-3.5)*.76;
      piece(g,sphere,snow,x,4.40-Math.abs(x)*.57,2.89,.48,.15,.19);
    }
    piece(g,cube,slate,1.39,4.48,-1.45,.60,1.62,.62);
    piece(g,cube,snow,1.39,5.31,-1.45,.73,.15,.75);
  }
  function bough(){
    const rings=[[.08,.53],[.50,.22],[1,-.27],[.98,-.36],[.69,-.40]],pos=[],indices=[],n=40;
    for(const [r,y] of rings)for(let i=0;i<n;i++){
      const t=i*Math.PI*2/n,tip=.90+.10*Math.cos(t*9)+.045*Math.sin(t*3);
      pos.push(r*tip*Math.cos(t),y-r*.075*Math.cos(t*9),r*tip*Math.sin(t));
    }
    for(let k=0;k<rings.length-1;k++)for(let i=0;i<n;i++){
      const a=k*n+i,b=k*n+(i+1)%n;indices.push(a,b,a+n,b,b+n,a+n);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  }
  const branches=bough();
  for(const kind of ['gift','fence','tree','snowman','house','palace','deer']) {
    const g=new T.Group();
    shadow(g,({gift:.68,fence:1.2,tree:1.55,snowman:.58,house:5,palace:11,deer:.8})[kind]);
    if(kind==='palace')piece(g,palace,iceMat,0,0,0);
    if(kind==='house')lodge(g);
    if(kind==='gift') {
      piece(g,cube,pink,0,.36,0,.8,.72,.75);
      piece(g,cube,gold,0,.37,0,.15,.77,.79);
      piece(g,cube,gold,0,.37,0,.84,.78,.12);
      for(const s of [-1,1]){
        const bow=piece(g,new T.TorusGeometry(.15,.049,6,10),gold,s*.12,.81,0,1,.67,.7);bow.rotation.z=s*.35;
      }
    }
    if(kind==='deer'){
      piece(g,sphere,glacier,0,1,0,.36,.48,.68);
      piece(g,sphere,glacier,0,1.63,.47,.23,.46,.22);
      piece(g,sphere,glacier,0,1.91,.65,.22,.19,.32);
      for(const s of [-1,1]){
        for(const z of [-.36,.39])piece(g,cone,glacier,s*.23,.46,z,.105,.91,.105);
        piece(g,cube,glacier,s*.2,2.21,.47,.065,.57,.07).rotation.z=-s*.55;
        piece(g,cube,glacier,s*.29,2.30,.48,.26,.055,.07);
      }
    }
    if(kind==='snowman') {
      piece(g,sphere,snow,0,.43,0,.48); piece(g,sphere,snow,0,1.04,0,.32);
      piece(g,cube,mint,0,.84,0,.55,.12,.55);
      piece(g,cube,coal,0,1.39,0,.45,.17,.42);
    }
    if(kind==='fence') {
      for(const x of [-.93,.93]) piece(g,cube,wood,x,.46,0,.19,.94,.19);
      for(const y of [.3,.7]) piece(g,cube,wood,0,y,0,2,.13,.13);
      piece(g,cube,snow,0,.8,0,2,.09,.17);
    }
    if(kind==='tree') {
      for(let i=0;i<8;i++)piece(g,sphere,i%2?lamp:pink,Math.cos(i*2.4)*(.98-.05*i),1.4+i*.17,Math.sin(i*2.4)*(.98-.05*i),.095);
      piece(g,cube,wood,0,.6,0,.28,1.2,.28);
      for(let i=0;i<5;i++) {
        const r=1.52-i*.27;
        piece(g,branches,pine,0,1.11+i*.59,0,r,1.24,r).rotation.y=i;
        piece(g,branches,snow,0,1.28+i*.59,0,r*.94,1.21,r*.94).rotation.y=i;
      }
    }
    templates[kind]=g;
  }
  const batches=[];
  const backdrop=new T.Group();
  scene.add(backdrop);
  const lodgeGroup=new T.Group();lodge(lodgeGroup);
  function cottage(parent,x,z,size,angle){
    const cabin=lodgeGroup.clone();cabin.position.set(x,0,z);cabin.scale.setScalar(size);cabin.rotation.y=angle;parent.add(cabin);
  }
  cottage(backdrop,-7.9,18,1.42,.35);
  cottage(backdrop,11,10,1.15,-.4);
  const yard=new T.Group();scene.add(yard);
  cottage(yard,-16.5,28,1.7,.4);cottage(yard,16,12,1.3,-.38);
  for(let i=0;i<18;i++){
    const fence=templates.fence.clone();fence.position.set(i*2.06-17,0,25);yard.add(fence);
    if(i%4===0){
      piece(yard,cube,timber,i*2.06-17,1.06,25,.23,2.1,.23);
      piece(yard,cube,lamp,i*2.06-17,2.30,25,.41,.58,.41);
      piece(yard,cone,timber,i*2.06-17,2.68,25,.39,.32,.39);
    }
  }
  for(let i=0;i<16;i++){
    const tree=templates.tree.clone();tree.position.set((i%2?1:-1)*(9+(i*7)%29),0,15-(i*11)%45);
    backdrop.add(tree);const pineTree=tree.clone();pineTree.position.z+=16;yard.add(pineTree);
  }
  // 静态装饰按几何和材质合批，手机每帧不必为每块木板单独绘制。
  function batchDecor(group){
    group.updateMatrixWorld(true);
    const sets=new Map();
    group.traverse(o=>{
      if(!o.isMesh)return;
      const key=o.geometry.uuid+o.material.uuid;
      if(!sets.has(key))sets.set(key,{geometry:o.geometry,material:o.material,matrices:[]});
      sets.get(key).matrices.push(o.matrixWorld.clone());
    });
    group.clear();
    for(const {geometry,material,matrices} of sets.values()){
      const batch=new T.InstancedMesh(geometry,material,matrices.length);
      matrices.forEach((m,i)=>batch.setMatrixAt(i,m));group.add(batch);
    }
  }
  batchDecor(backdrop);batchDecor(yard);
  const flakeCount=180, flakePositions=new Float32Array(flakeCount*3);
  for(let i=0;i<flakeCount;i++) {
    flakePositions[i*3]=(Math.random()-.5)*54;
    flakePositions[i*3+1]=Math.random()*23;
    flakePositions[i*3+2]=(Math.random()-.5)*48;
  }
  const flakeGeo=new T.BufferGeometry();
  flakeGeo.setAttribute('position',new T.BufferAttribute(flakePositions,3));
  const flakes=new T.Points(flakeGeo,new T.PointsMaterial({color:0xfff6e9,size:.076,transparent:true,opacity:.78,depthWrite:false}));
  flakes.frustumCulled=false;scene.add(flakes);
  let layout=null, lastHidden='';
  function setLevel(props) {
    if(layout) return;
    layout=props;
    const matrix=new T.Matrix4(), dummy=new T.Object3D();
    for(const [kind,g] of Object.entries(templates)) {
      const entries=props.map(([type,x,z],id)=>({type,x,z,id})).filter(o=>o.type===kind);
      g.children.forEach(part=>{
        part.updateMatrix();
        const batch=new T.InstancedMesh(part.geometry,part.material,entries.length);
        batch.frustumCulled=false;
        const transforms=entries.map(({x,z,id})=>{
          dummy.position.set(x,0,z); dummy.rotation.y=id*2.39996; dummy.updateMatrix();
          return matrix.multiplyMatrices(dummy.matrix,part.matrix).clone();
        });
        transforms.forEach((m,i)=>batch.setMatrixAt(i,m));
        scene.add(batch);
        batches.push({batch,entries,transforms});
      });
    }
  }
  const buried=new T.Matrix4().makeScale(0,0,0);
  function hide(ids) {
    const key=ids.join(',');
    if(key===lastHidden) return;
    lastHidden=key;
    const gone=new Set(ids);
    for(const {batch,entries,transforms} of batches) {
      entries.forEach(({id},i)=>batch.setMatrixAt(i,gone.has(id)?buried:transforms[i]));
      batch.instanceMatrix.needsUpdate=true;
    }
  }
  const balls=[0xf08a56,0x3a93c6].map((tint,slot)=>{
    const root=new T.Group(), roll=new T.Group(), head=new T.Group();
    scene.add(root);root.add(roll,head);
    const shell=new T.IcosahedronGeometry(1,4);
    const positions=shell.getAttribute('position'), colors=[];
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const grain=.5+.25*Math.sin(16*x+4*z)*Math.cos(12*y)+.25*Math.sin(32*z+7*y);
      const c=new T.Color(0xc2d8e2).lerp(new T.Color(0xf9fbf0),grain);
      colors.push(c.r,c.g,c.b);
    }
    shell.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const frost=new T.MeshStandardMaterial({vertexColors:true,roughness:.80});
    frost.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 frostPos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfrostPos=position;');
      shader.fragmentShader='varying vec3 frostPos;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat crystal=fract(sin(dot(floor(frostPos*134.),vec3(43.1,29.7,64.1)))*5281.82); diffuseColor.rgb*=.92+.14*crystal; diffuseColor.rgb+=vec3(.17)*step(.985,crystal);');
    };
    piece(roll,shell,frost,0,0,0);
    for(const x of [-.23,.23]){
      piece(head,sphere,coal,x,.38,.9,.079);
      piece(head,sphere,snow,x-.019,.404,.968,.016);
    }
    for(const x of [-.39,.39])piece(head,sphere,pink,x,.20,.9,.105,.046,.045);
    const nose=piece(head,cone,orange,0,.25,1,.10,.38,.10);
    nose.rotation.x=Math.PI/2;
    const shade=shadow(scene,1);
    return {root,roll,head,shade,wear:null,gear:null,last:null,slot};
  });
  // 两张纹理都直接绘制到游戏上屏 WebGL，不读回开放域数据。
  const shared=host.ranking&&host.ranking.canvas;
  let rivalSprite=null,rankLabel=null,rankScene=null,rankCamera=null,refreshAt=0;
  if(shared){
    function section(offset,height){
      const map=new T.Texture(shared);
      map.colorSpace=T.SRGBColorSpace;map.generateMipmaps=false;
      map.minFilter=map.magFilter=T.LinearFilter;map.offset.y=offset;map.repeat.y=height;map.needsUpdate=true;
      return map;
    }
    rivalSprite=new T.Sprite(new T.SpriteMaterial({map:section(0,.75),transparent:true,depthWrite:false,toneMapped:false}));
    rivalSprite.center.set(.5,.445);rivalSprite.scale.set(4.4,3.3,1);
    balls[1].root.add(rivalSprite);
    rankScene=new T.Scene();rankCamera=new T.OrthographicCamera(0,host.w,host.h,0,.1,10);
    rankCamera.position.z=1;
    rankLabel=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({
      map:section(.75,.25),transparent:true,depthTest:false,depthWrite:false,toneMapped:false
    }));
    rankScene.add(rankLabel);
    const safe=host.safe||{right:host.w,top:0},unit=Math.min(host.w/700,host.h/335);
    rankLabel.scale.set(140*unit,35*unit,1);
    rankLabel.position.set(Math.min(host.w,safe.right)-80*unit,host.h-safe.top-76*unit,0);
  }
  function drawRankLabel(showSelf){
    if(!rankLabel)return;
    const unit=Math.min(host.w/700,host.h/335),safe=host.safe||{right:host.w,top:0};
    rankLabel.position.set(Math.min(host.w,safe.right)-80*unit,host.h-safe.top-(showSelf?45:76)*unit,0);
    if(showSelf&&elapsed>=refreshAt){refreshAt=elapsed+.12;rankLabel.material.map.needsUpdate=true;}
    renderer.render(rankScene,rankCamera);
  }
  const defaultItem={id:0,style:'scarf',color:'#bd4339',accent:'#f5d4a5'};
  function equip(ball,id){
    if(ball.gear===id)return;
    if(ball.wear){ball.head.remove(ball.wear);ball.wear.userData.dispose();}
    ball.wear=host.outfit(T,catalog.find(item=>item.id===id)||defaultItem,host.layer);
    ball.gear=id;ball.head.add(ball.wear);
  }
  const trackGeo=new T.CircleGeometry(1,14);
  const tracks=new T.InstancedMesh(trackGeo,new T.MeshBasicMaterial({color:0x87a7bd,opacity:.36,transparent:true,depthWrite:false}),160);
  const stamp=new T.Object3D();
  let track=0;
  for(let i=0;i<tracks.count;i++) tracks.setMatrixAt(i,buried);
  tracks.frustumCulled=false; scene.add(tracks);
  const sprayData=new Float32Array(126*3),life=new Float32Array(126),velocity=new Float32Array(126*3);
  for(let i=0;i<life.length;i++)sprayData[i*3+1]=-8;
  const sprayGeo=new T.BufferGeometry();sprayGeo.setAttribute('position',new T.BufferAttribute(sprayData,3));
  const spray=new T.Points(sprayGeo,new T.PointsMaterial({size:.105,color:0xf4f6ff,transparent:true,opacity:.86,depthWrite:false}));
  scene.add(spray);spray.frustumCulled=false;
  let particle=0;
  function powderTrail(pos,r,angle,speed,dt){
    const expected=Math.min(72,speed*3)*dt;
    const n=Math.floor(expected)+(Math.random()<expected%1?1:0);
    for(let j=0;j<n;j++){
      const i=particle++%life.length,k=i*3,side=(Math.random()-.5)*1.5;
      life[i]=.22+Math.random()*.35;
      sprayData[k]=pos.x-r*(Math.cos(angle)+side*Math.sin(angle))*.75;
      sprayData[k+1]=.09;sprayData[k+2]=pos.z-r*(Math.sin(angle)-side*Math.cos(angle))*.75;
      velocity[k]=-Math.cos(angle)*1.4-Math.sin(angle)*side*3;
      velocity[k+1]=1.1+Math.random()*2.7;velocity[k+2]=-Math.sin(angle)*1.4+Math.cos(angle)*side*3;
    }
  }
  let fresh=true;
  function reset() {
    fresh=true; lastHidden='?';
    life.fill(0);
    for(const b of balls){b.last=null;b.root.visible=false;b.shade.visible=false;}
    for(let i=0;i<tracks.count;i++) tracks.setMatrixAt(i,buried);
    tracks.instanceMatrix.needsUpdate=true;
  }
  let elapsed=0;
  function draw(state,slot,dt,view) {
    const portrait=view.page==='shop';
    const targetRatio=portrait?menuRatio:matchRatio;
    if(renderer.getPixelRatio()!==targetRatio)renderer.setPixelRatio(targetRatio);
    portraitLight.visible=portrait;
    elapsed+=dt;
    backdrop.visible=!state;
    const useCard=!!(rivalSprite&&state&&!state.tutorial);
    if(rivalSprite){
      rivalSprite.visible=useCard;balls[1].roll.visible=balls[1].head.visible=!useCard;
      if(useCard&&elapsed>=refreshAt){
        refreshAt=elapsed+.1;rivalSprite.material.map.needsUpdate=true;rankLabel.material.map.needsUpdate=true;
      }
    }
    yard.visible=!!state&&state.phase==='lobby';
    for(const entry of batches)entry.batch.visible=!!state&&!yard.visible;
    tracks.visible=!!state;
    if(state){
      hide(state.hidden);
      for(let i=0;i<2;i++){
        const [x,z,angle,speed,mass,,boost]=state.balls[i], b=balls[i], r=.8*Math.cbrt(mass/12);
        b.root.visible=b.shade.visible=state.present[i];
        if(!state.present[i]){b.last=null;continue;}
        equip(b,state.gear[i]);
        const moving=!fresh&&b.last!==null;
        const mix=moving?1-Math.exp(-22*dt):1, pos=b.root.position;
        const oldX=pos.x,oldZ=pos.z;
        pos.x+=(x-pos.x)*mix; pos.z+=(z-pos.z)*mix;pos.y=r;
        b.root.scale.setScalar(r);
        if(moving){b.roll.rotation.x+=(pos.z-oldZ)/r;b.roll.rotation.z-=(pos.x-oldX)/r;}
        const desired=Math.PI/2-angle;
        const diff=Math.atan2(Math.sin(desired-b.head.rotation.y),Math.cos(desired-b.head.rotation.y));
        b.head.rotation.y+=diff*mix;
        const tail=b.wear.userData.flutter;
        if(tail)tail.rotation.x=-.18-.4*Math.min(speed/18,1)+Math.sin(elapsed*10)*speed*.003;
        if(speed>1.2)powderTrail(pos,r,angle,speed,dt);
        b.shade.position.set(pos.x,.02,pos.z);b.shade.scale.set(1.12*r,r,1);
        if(!b.last||Math.hypot(pos.x-b.last.x,pos.z-b.last.z)>.8*r){
          stamp.position.set(pos.x,.012,pos.z); stamp.rotation.set(-Math.PI/2,0,-angle);
          stamp.scale.set(r*1.05,r*.55,1);stamp.updateMatrix();tracks.setMatrixAt(track++%tracks.count,stamp.matrix);
          tracks.instanceMatrix.needsUpdate=true;b.last={x:pos.x,z:pos.z};
        }
      }
      const p=balls[slot].root.position;
      const radius=p.y;
      camera.position.set(p.x,p.y+3.3+radius*1.05,p.z+5.8+radius*1.85);
      camera.lookAt(p.x,p.y+.35,p.z-4.8);
      if(state.phase==='lobby'){
        const live=balls.filter(b=>b.root.visible),mid=new T.Vector3();
        for(const b of live)mid.add(b.root.position);
        mid.divideScalar(Math.max(live.length,1));
        const spread=live.length===2?live[0].root.position.distanceTo(live[1].root.position):0;
        camera.position.set(mid.x,3.1+spread*.21,mid.z+7+spread*.51);
        camera.lookAt(mid.x,1.0,mid.z-2);
      }
      fresh=false;
    } else {
      const b=balls[0],shop=view.page==='shop';
      balls[1].root.visible=balls[1].shade.visible=false;
      b.root.visible=b.shade.visible=true;equip(b,view.itemId||0);
      b.root.scale.setScalar(2);b.root.position.set(0,1.99+.035*Math.sin(elapsed*2.5),29);
      b.roll.rotation.set(.035*Math.sin(elapsed*1.2),0,.035*Math.sin(elapsed*1.8));
      b.head.rotation.y=.12+.27*Math.sin(elapsed*.8);
      b.shade.position.set(0,.02,29);b.shade.scale.set(2.2,1.9,1);
      const offset=(shop ? .636 : .39)*(host.w/host.h)*4.22;
      camera.position.set(offset,3.7,38.1);camera.lookAt(offset,shop?1.4:1.9,29);
    }
    flakes.position.set(camera.position.x,0,camera.position.z-12);
    for(let i=0;i<flakeCount;i++){
      const off=i*3;
      flakePositions[off+1]-=dt*(1+i%4*.22);
      if(flakePositions[off+1]<0)flakePositions[off+1]+=23;
      flakePositions[off]+=dt*Math.sin(elapsed*.65+i)*.4;
    }
    flakeGeo.attributes.position.needsUpdate=true;
    spray.visible=!!state;
    if(state){
      for(let i=0;i<life.length;i++){
        const k=i*3;life[i]-=dt;
        if(life[i]<=0){sprayData[k+1]=-8;continue;}
        velocity[k+1]-=dt*6;
        for(let axis=0;axis<3;axis++)sprayData[k+axis]+=velocity[k+axis]*dt;
      }
      sprayGeo.attributes.position.needsUpdate=true;
    }
    renderer.render(scene,camera);
  }
  reset();
  const marker=new T.Vector3();
  function goalMarker(slot){
    const pos=balls[slot].root.position;
    marker.set(0,5.8,0).project(camera);
    const edge=marker.z>1||marker.z<0||Math.abs(marker.x)>.78||Math.abs(marker.y)>.70;
    return {edge,x:(marker.x+1)*host.w*.5,y:(1-marker.y)*host.h*.5,angle:Math.atan2(-pos.z,-pos.x),distance:Math.round(Math.hypot(pos.x,pos.z))};
  }
  function opponentMarker(slot){
    const own=balls[slot].root.position, enemy=balls[1-slot].root.position;
    marker.copy(enemy);marker.y+=enemy.y+1;
    marker.project(camera);
    const distance=Math.round(Math.hypot(enemy.x-own.x,enemy.z-own.z));
    if(marker.z>0&&marker.z<1&&Math.abs(marker.x)<.81&&Math.abs(marker.y)<.65){
      return {x:(marker.x+1)*host.w/2,y:(1-marker.y)*host.h/2,distance,edge:false};
    }
    const angle=Math.atan2(enemy.z-own.z,enemy.x-own.x);
    const dx=Math.cos(angle),dy=Math.sin(angle);
    const reach=Math.min((host.w/2-56)/Math.max(.001,Math.abs(dx)),(host.h/2-80)/Math.max(.001,Math.abs(dy)));
    return {x:host.w/2+reach*dx,y:host.h/2+reach*dy,angle,distance,edge:true};
  }
  return {renderer,menuRatio,setLevel,draw,drawRankLabel,reset,opponentMarker,goalMarker};
}
if (typeof module !== 'undefined') module.exports=createSnowScene;
