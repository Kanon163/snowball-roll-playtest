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
  const field=new T.Group();scene.add(field);
  const winter=new host.winter(T,field,renderer,host.layer,host.village);
  scene.background = new T.Color(0x324566);
  if(host.image){
    const sky=new T.Texture(await host.image('art/twilight.jpg'));
    sky.colorSpace=T.SRGBColorSpace;sky.offset.y=-.39;sky.needsUpdate=true;
    scene.background=sky;
  }
  scene.fog = new T.FogExp2(0x96a8cc, .014);
  const camera = new T.PerspectiveCamera(58, host.w / host.h, .12, 950);
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
  const ground=piece(scene,new T.PlaneGeometry(160,160),paint(0xe3eaf1),0,-.06,0);
  ground.rotation.x=-Math.PI/2;
  const terrain=piece(field,new T.PlaneGeometry(1,1),winter.snow,0,0,0);
  winter.ground(terrain);winter.environment();
  const playerLight=new T.PointLight(0xffdba4,14,12,2);field.add(playerLight);
  const nightFog=new T.FogExp2(0x253451,.0038),menuFog=scene.fog;
  piece(field,sphere,new T.MeshBasicMaterial({color:0xe7f1ff,fog:false}),-85,63,-190,6);
  const starPositions=[];
  for(let i=0;i<1350;i++){
    const a=i*2.39996,h=.08+.91*((i*157)%1351)/1351,r=680*Math.sqrt(1-h*h);
    starPositions.push(Math.cos(a)*r,680*h,Math.sin(a)*r);
  }
  const stars=new T.BufferGeometry();stars.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));
  field.add(new T.Points(stars,new T.PointsMaterial({color:0xf1e7d3,size:1,sizeAttenuation:false,fog:false,transparent:true,opacity:.78})));
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
  const woodBuffer=await host.read('art/chalet.mesh'),header=new DataView(woodBuffer);
  const verts=header.getUint32(0,true),indices=header.getUint32(4,true);
  const chalet=new T.BufferGeometry();
  chalet.setAttribute('position',new T.BufferAttribute(new Float32Array(woodBuffer,8,verts*3),3));
  chalet.setAttribute('normal',new T.BufferAttribute(new Float32Array(woodBuffer,8+verts*12,verts*3),3));
  chalet.setAttribute('uv',new T.BufferAttribute(new Float32Array(woodBuffer,8+verts*24,verts*2),2));
  chalet.setIndex(new T.BufferAttribute(new Uint16Array(woodBuffer,8+verts*32,indices),1));
  const siding=new T.Texture(await host.image('art/chalet.jpg'));siding.flipY=false;siding.colorSpace=T.SRGBColorSpace;
  siding.wrapS=siding.wrapT=T.RepeatWrapping;siding.needsUpdate=true;
  const houseMat=new T.MeshStandardMaterial({map:siding,roughness:.84,emissive:0xffbc75,emissiveMap:siding});
  houseMat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
    '#include <emissivemap_fragment>\n totalEmissiveRadiance*=2.5*smoothstep(.12,.35,diffuseColor.r-diffuseColor.b)*smoothstep(.04,.15,diffuseColor.g-diffuseColor.b);');};

  const iceMat=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.14,metalness:.35,envMap:winter.environmentMap,envMapIntensity:1.4,clearcoat:.7});
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
  const branches=bough(),compactEye=new T.IcosahedronGeometry(1,0);
  for(const kind of ['gift','fence','tree','snowman','house','palace','deer','tower','nutcracker','lamp']) {
    const g=new T.Group();
    shadow(g,({gift:.68,fence:1.2,tree:1.55,snowman:.58,house:5,palace:11,deer:.8,tower:3,nutcracker:.7,lamp:.4})[kind]);
    if(kind==='palace')piece(g,palace,iceMat,0,0,0);
    if(kind==='house')piece(g,chalet,houseMat,0,0,0);
    if(kind==='lamp')winter.lamp(g);
    if(kind==='nutcracker')winter.nutcracker(g);
    if(kind==='tower')winter.palace(g,false);
    if(kind==='gift') {
      piece(g,cube,pink,0,.36,0,.8,.72,.75);
      piece(g,cube,gold,0,.37,0,.15,.77,.79);
      piece(g,cube,gold,0,.37,0,.84,.78,.12);
      for(const s of [-1,1]){
        const bow=piece(g,new T.TorusGeometry(.15,.049,6,10),gold,s*.12,.81,0,1,.67,.7);bow.rotation.z=s*.35;
      }
    }
    if(kind==='deer')winter.reindeer(g);
    if(kind==='snowman') {
      piece(g,sphere,snow,0,.65,0,.65);piece(g,sphere,snow,0,1.4,0,.43);
      piece(g,cube,coal,0,1.86,0,.80,.08,.65);piece(g,cube,coal,0,2.03,0,.46,.35,.43);
      piece(g,cube,pink,0,1.10,0,.70,.17,.70);
      for(const x of [-.14,.14])piece(g,compactEye,coal,x,1.47,.37,.057);
      piece(g,cone,orange,0,1.35,.48,.08,.33,.08).rotation.x=Math.PI/2;
    }
    if(kind==='fence') {
      for(const x of [-.93,.93]) piece(g,cube,wood,x,.46,0,.19,.94,.19);
      for(const y of [.3,.7]) piece(g,cube,wood,0,y,0,2,.13,.13);
      piece(g,cube,snow,0,.8,0,2,.09,.17);
    }
    if(kind==='tree')winter.tree(g);
    templates[kind]=g;
  }
  
  const backdrop=new T.Group();
  scene.add(backdrop);
  const lodgeGroup=new T.Group();lodge(lodgeGroup);
  function cottage(parent,x,z,size,angle){
    const cabin=lodgeGroup.clone();cabin.position.set(x,0,z);cabin.scale.setScalar(size);cabin.rotation.y=angle;parent.add(cabin);
  }
  cottage(backdrop,-7.9,18,1.42,.35);
  cottage(backdrop,11,10,1.15,-.4);
  for(let i=0;i<16;i++){
    const tree=new T.Group();for(let j=0;j<5;j++){const r=1.5-j*.26;piece(tree,branches,pine,0,1+j*.57,0,r,1.2,r);piece(tree,branches,snow,0,1.16+j*.57,0,r*.94,1.19,r*.94);}tree.position.set((i%2?1:-1)*(9+(i*7)%29),0,15-(i*11)%45);
    backdrop.add(tree);
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
  batchDecor(backdrop);
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
  let layout=null,lastHidden=new Set(),lamps=[],byId=[];
  const buried=new T.Matrix4().makeScale(0,0,0);
  const compactSphere=new T.SphereGeometry(1,10,7);
  const packedMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.81});
  function packed(group){
    const pos=[],norm=[],rgb=[],v=new T.Vector3(),n=new T.Vector3();
    for(const part of group.children){
      if(!part.isMesh||part.material===contact)continue;
      part.updateMatrix();const normal=new T.Matrix3().getNormalMatrix(part.matrix);
      const geo=part.geometry===sphere?compactSphere:part.geometry;
      const a=geo.attributes.position,b=geo.attributes.normal,count=geo.index?geo.index.count:a.count;
      for(let i=0;i<count;i++){
        const j=geo.index?geo.index.getX(i):i;
        v.fromBufferAttribute(a,j).applyMatrix4(part.matrix);n.fromBufferAttribute(b,j).applyNormalMatrix(normal);
        pos.push(v.x,v.y,v.z);norm.push(n.x,n.y,n.z);rgb.push(...part.material.color.toArray());
      }
    }
    const geometry=new T.BufferGeometry();
    for(const [key,values] of [['position',pos],['normal',norm],['color',rgb]])geometry.setAttribute(key,new T.Float32BufferAttribute(values,3));
    return new T.Mesh(geometry,packedMat);
  }
  function setLevel(props){
    if(layout)return;
    layout=props;byId=props.map(()=>[]);
    const sets=new Map(),dummy=new T.Object3D(),transform=new T.Matrix4();
    props.forEach(([type,x,z,angle,color],id)=>{
      const grouped=type==='gift'||type==='snowman';
      const key=grouped?[type,color,Math.floor(x/64),Math.floor(z/64)].join('/'):type;
      if(!sets.has(key))sets.set(key,[]);
      const y=host.village.height(x,z);
      sets.get(key).push({type,id,x,y,z,angle,color});
      if(type==='house'||type==='lamp')lamps.push({type,id,x,z,alive:true,g:{rotation:{y:angle}}});
    });
    const packedProps={};
    for(const entries of sets.values()){
      const {type,color}=entries[0],group=templates[type];
      let parts=group.children;
      if(type==='snowman'||type==='gift'){
        const key=type+color;
        if(!packedProps[key]){
          if(type==='gift')group.children[1].material=[pink,mint,paint(0x4c56a0)][color];
          packedProps[key]=packed(group);
        }
        parts=[packedProps[key]];
      }
      for(const part of parts){
        let mesh=part;
        if(part.isSprite){
          mesh=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:part.material.map,color:part.material.color,
            transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
          mesh.position.copy(part.position);mesh.scale.copy(part.scale);
        }
        if(!mesh.isMesh)continue;
        mesh.updateMatrix();
        const batch=new T.InstancedMesh(mesh.geometry,mesh.material,entries.length);
        entries.forEach(({id,x,y,z,angle},i)=>{
          dummy.position.set(x,y,z);dummy.rotation.y=angle;dummy.updateMatrix();
          const m=transform.multiplyMatrices(dummy.matrix,mesh.matrix).clone();
          batch.setMatrixAt(i,m);byId[id].push({batch,i,m});
        });
        batch.computeBoundingSphere();field.add(batch);
      }
    }
  }
  function hide(ids){
    const gone=new Set(ids);
    function set(id,visible){for(const {batch,i,m} of byId[id]){
      batch.setMatrixAt(i,visible?m:buried);batch.instanceMatrix.needsUpdate=true;
    }}
    for(const id of lastHidden)if(!gone.has(id))set(id,true);
    for(const id of gone)if(!lastHidden.has(id)){
      set(id,false);
      const p=balls[0].root.position,[,x,z]=layout[id];
      if(!fresh&&Math.hypot(x-p.x,z-p.z)<22)burst(id);
    }
    if(lamps.length)for(const item of lamps)item.alive=!gone.has(item.id);
    lastHidden=gone;
  }
  const balls=[0xf08a56,0x3a93c6].map((tint,slot)=>{
    const root=new T.Group(), roll=new T.Group(), head=new T.Group();
    scene.add(root);root.add(roll);roll.add(head);
    const shell=new T.IcosahedronGeometry(1,4);
    const positions=shell.getAttribute('position'), colors=[];
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const grain=.5+.25*Math.sin(16*x+4*z)*Math.cos(12*y)+.25*Math.sin(32*z+7*y);
      const c=new T.Color(0xc6d4df).lerp(new T.Color(0xf9fbf0),grain);
      colors.push(c.r,c.g,c.b);
    }
    shell.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const frost=winter.snow.clone();frost.color.setHex(0xffffff);frost.vertexColors=true;
    frost.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 frostPos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfrostPos=position;');
      shader.fragmentShader='varying vec3 frostPos;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat crystal=fract(sin(dot(floor(frostPos*134.),vec3(43.1,29.7,64.1)))*5281.82); float strata=sin(frostPos.x*6.+frostPos.y*3.+2.7*sin(frostPos.z*3.)); diffuseColor.rgb*=mix(.77,1.08,smoothstep(-.85,.15,strata))*(.92+.14*crystal); diffuseColor.rgb+=vec3(.17)*step(.985,crystal);');
    };
    piece(roll,shell,frost,0,0,0);
    for(const x of [-.23,.23]){
      piece(head,sphere,coal,x,.38,.9,.079);
      piece(head,sphere,snow,x-.019,.404,.968,.016);
    }
    for(const x of [-.39,.39])piece(head,sphere,pink,x,.20,.9,.105,.046,.045);
    const nose=piece(head,cone,orange,0,.25,1,.10,.38,.10);
    nose.rotation.x=Math.PI/2;
    for(let j=0;j<5;j++){const x=(j-2)*.13;piece(head,sphere,coal,x,.05-x*x,.99,.035);}
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
  const axis=new T.Vector3(),camTarget=new T.Vector3(),normal=new T.Vector3(),travel=new T.Vector3(),planeNormal=new T.Vector3(0,0,1);
  const chipsCount=96,chipMesh=new T.InstancedMesh(cube,new T.MeshBasicMaterial({color:0xffffff}),chipsCount);
  const chipPose=new T.Object3D(),chipColor=new T.Color(),chips=Array.from({length:chipsCount},()=>({life:0}));
  let nextChip=0;
  chipMesh.frustumCulled=false;field.add(chipMesh);
  function burst(id){
    const [type,x,z,,variant]=layout[id],base=host.village.height(x,z);
    const count=type==='palace'?22:8;
    const color=type==='gift'?[0xad4350,0x37866e,0x4b5ba2][variant]:type==='deer'||type==='palace'?0x98dfef:0xe3eaf0;
    for(let k=0;k<count;k++){
      const i=nextChip++%chipsCount,c=chips[i],a=k*2.39996+elapsed;
      Object.assign(c,{life:.42+Math.random()*.3,x,y:base+.45,z,vx:Math.cos(a)*(1+Math.random()*3),
        vy:2+Math.random()*4,vz:Math.sin(a)*(1+Math.random()*3),size:.07+Math.random()*.12});
      chipMesh.setColorAt(i,chipColor.setHex(type==='gift'&&k%3===0?0xffcc67:color));
    }
    chipMesh.instanceColor.needsUpdate=true;
  }
  function fallChips(dt){
    for(let i=0;i<chipsCount;i++){
      const c=chips[i];if(c.life<=0)continue;
      c.life-=dt;
      if(c.life<=0)chipMesh.setMatrixAt(i,buried);
      else{
        c.x+=c.vx*dt;c.y+=c.vy*dt;c.z+=c.vz*dt;c.vy-=15*dt;
        chipPose.position.set(c.x,c.y,c.z);chipPose.rotation.set(c.life*7,i+c.life*6,0);
        chipPose.scale.setScalar(c.size*Math.min(1,c.life*5));chipPose.updateMatrix();chipMesh.setMatrixAt(i,chipPose.matrix);
      }
      chipMesh.instanceMatrix.needsUpdate=true;
    }
  }
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
      sprayData[k+1]=pos.y-r+.1;sprayData[k+2]=pos.z-r*(Math.sin(angle)-side*Math.cos(angle))*.75;
      velocity[k]=-Math.cos(angle)*1.4-Math.sin(angle)*side*3;
      velocity[k+1]=1.1+Math.random()*2.7;velocity[k+2]=-Math.sin(angle)*1.4+Math.cos(angle)*side*3;
    }
  }
  let fresh=true;
  function reset() {
    fresh=true;life.fill(0);winter.clearTracks();
    for(let i=0;i<chipsCount;i++){chips[i].life=0;chipMesh.setMatrixAt(i,buried);}
    chipMesh.instanceMatrix.needsUpdate=true;
    if(layout)hide([]);
    for(const b of balls){b.last=null;b.roll.quaternion.identity();b.head.rotation.set(0,0,0);b.root.visible=b.shade.visible=false;}
  }
  let elapsed=0;
  function draw(state,slot,dt,view) {
    const portrait=view.page==='shop';
    const targetRatio=portrait?menuRatio:matchRatio;
    if(renderer.getPixelRatio()!==targetRatio)renderer.setPixelRatio(targetRatio);
    portraitLight.visible=portrait;
    elapsed+=dt;
    backdrop.visible=ground.visible=!state;field.visible=!!state;
    scene.fog=state?nightFog:menuFog;
    renderer.toneMapping=state?T.ACESFilmicToneMapping:T.NoToneMapping;
    renderer.toneMappingExposure=1.1;
    moon.color.setHex(state?0xb7ccff:0xffdeb5);moon.intensity=state?1.35:2.2;
    cold.intensity=state?.3:1.1;
    const useCard=!!(rivalSprite&&state&&!state.tutorial);
    if(rivalSprite){
      rivalSprite.visible=useCard;balls[1].roll.visible=balls[1].head.visible=!useCard;
      if(useCard&&elapsed>=refreshAt){
        refreshAt=elapsed+.1;rivalSprite.material.map.needsUpdate=true;rankLabel.material.map.needsUpdate=true;
      }
    }
    if(state){
      hide(state.hidden);
      for(let i=0;i<2;i++){
        const [x,z,angle,speed,mass,,boost]=state.balls[i], b=balls[i], r=.8*Math.cbrt(mass/12);
        b.root.visible=b.shade.visible=state.present[i];
        if(!state.present[i]){b.last=null;continue;}
        equip(b,state.gear[i]);
        const moving=!fresh&&b.last!==null;
        const mix=moving?1-Math.exp(-22*dt):1, pos=b.root.position;
        const oldX=pos.x,oldZ=pos.z,oldGround=pos.y-b.root.scale.x;
        pos.x+=(x-pos.x)*mix; pos.z+=(z-pos.z)*mix;pos.y=r+host.village.height(pos.x,pos.z);
        b.root.scale.setScalar(r);
        const height=pos.y-r;
        normal.set((height-host.village.height(pos.x+.25,pos.z))*4,1,(height-host.village.height(pos.x,pos.z+.25))*4).normalize();
        if(moving){
          travel.set(pos.x-oldX,height-oldGround,pos.z-oldZ);
          const distance=travel.length();
          if(distance>.00001){axis.crossVectors(normal,travel).normalize();b.roll.rotateOnWorldAxis(axis,distance/r);}
        }
        b.shade.quaternion.setFromUnitVectors(planeNormal,normal);
        const tail=b.wear.userData.flutter;
        if(tail)tail.rotation.x=-.18-.4*Math.min(speed/18,1)+Math.sin(elapsed*10)*speed*.003;
        if(speed>1.2)powderTrail(pos,r,angle,speed,dt);
        b.shade.position.set(pos.x,pos.y-r+.035,pos.z);b.shade.scale.set(1.12*r,r,1);
        if(!b.last||Math.hypot(pos.x-b.last.x,pos.z-b.last.z)>.8*r){
          winter.stampTrack({x:pos.x,z:pos.z,r,name:i});b.last={x:pos.x,z:pos.z};
        }
      }
      const p=balls[slot].root.position,radius=balls[slot].root.scale.x;
      const distance=7+Math.max(0,radius-.8)*2.4;
      camTarget.set(p.x,Math.max(p.y+1.5+distance*Math.sin(.2),host.village.height(p.x,p.z+distance)+1.5),p.z+distance);
      camera.position.lerp(camTarget,fresh?1:1-Math.exp(-dt*4.8));
      camera.lookAt(p.x,p.y+.65,p.z);playerLight.position.set(p.x,p.y+radius+2,p.z+2);
      fallChips(dt);winter.update(p,lamps,elapsed);
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
    flakes.position.set(camera.position.x,state?host.village.height(camera.position.x,camera.position.z):0,camera.position.z-12);
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
    marker.set(0,host.village.height(0,0)+9,0).project(camera);
    const edge=marker.z>1||marker.z<0||Math.abs(marker.x)>.78||Math.abs(marker.y)>.70;
    return {edge,x:(marker.x+1)*host.w*.5,y:(1-marker.y)*host.h*.5,angle:Math.atan2(-pos.z,-pos.x),distance:Math.round(Math.hypot(pos.x,pos.z))};
  }
  function opponentMarker(slot){
    const own=balls[slot].root.position, enemy=balls[1-slot].root.position;
    marker.copy(enemy);marker.y+=balls[1-slot].root.scale.x+1;
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
