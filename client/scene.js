/* 旧雪村的地标与在线对战共用一套比例。 */
async function createSnowScene(T, host, catalog) {
  const canvas = host.screen;
  const renderer = host.renderer || new T.WebGLRenderer({canvas, antialias: true, alpha: false});
  const matchRatio=Math.min(1.6,host.ratio);
  const menuRatio=Math.min(host.ratio,2.5,Math.sqrt(3200000/(host.w*host.h)));
  renderer.setPixelRatio(matchRatio);
  renderer.setSize(host.w, host.h, false);
  renderer.outputColorSpace = T.SRGBColorSpace;
  const core=Promise.all([host.image('art/twilight.jpg'),model('palace'),host.read('art/chalet.mesh'),host.image('art/chalet.jpg')]);
  const scene = new T.Scene();
  const field=new T.Group();scene.add(field);
  const winter=new host.winter(T,field,renderer,host.layer,host.village);
  scene.background = new T.Color(0x324566);
  if(host.image){
    const [panorama]=await core,tint=host.layer();
    if(host.progress)host.progress(.61,'正在铺设雪道');
    tint.width=panorama.width;tint.height=panorama.height;
    const skyPen=tint.getContext('2d');skyPen.drawImage(panorama,0,0);
    skyPen.globalCompositeOperation='color';skyPen.fillStyle='rgba(85,129,190,.63)';skyPen.fillRect(0,0,tint.width,tint.height);
    skyPen.globalCompositeOperation='source-over';
    const sky=new T.CanvasTexture(tint);sky.colorSpace=T.SRGBColorSpace;sky.offset.y=-.39;
    scene.background=sky;
  }
  scene.fog = new T.FogExp2(0x889ec2, .0058);
  const camera = new T.PerspectiveCamera(58, host.w / host.h, .12, 950);
  const skyFill=new T.HemisphereLight(0xd6e3ff,0x657190,1.34);scene.add(skyFill);
  const moon = new T.DirectionalLight(0xffdeb5, 2.2);
  moon.position.set(-28, 45, -17);
  scene.add(moon);
  const cold = new T.DirectionalLight(0x94deff, 1.1);
  cold.position.set(18, 9, 12);
  scene.add(cold);
  const portraitLight=new T.DirectionalLight(0xffdab0,3.1);
  portraitLight.position.set(-2.6,5.4,36.8);portraitLight.target.position.set(0,2,29);
  portraitLight.visible=false;scene.add(portraitLight,portraitLight.target);
  const faceBounce=new T.PointLight(0xffdfbe,18,10,2);faceBounce.position.set(.5,2.9,33.4);scene.add(faceBounce);
  const rim=new T.DirectionalLight(0xffcc8b,1.0);rim.position.set(2.4,5,25);rim.target.position.set(0,2,29);scene.add(rim,rim.target);
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
  const ridgeBackdrop=field.children[field.children.length-1].clone(true);scene.add(ridgeBackdrop);
  const villageSnow=winter.snow.clone();
  villageSnow.map=winter.snow.map.clone();villageSnow.normalMap=winter.snow.normalMap.clone();
  for(const map of [villageSnow.map,villageSnow.normalMap]){map.repeat.set(32,32);map.needsUpdate=true;}
  villageSnow.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 hallSnow;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n hallSnow=position.xy;');
    shader.fragmentShader='varying vec2 hallSnow;\n'+shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float line=hallSnow.x-1.-2.8*sin(hallSnow.y*.071);
      float road=exp(-line*line*.035);
      float rut=exp(-pow((abs(line)-1.35)*2.6,2.));
      float wind=.5+.5*sin(hallSnow.y*.52+sin(hallSnow.x*.36)*2.);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.65,.74,.89),road*.39+rut*.42);
      diffuseColor.rgb*=.82+.13*wind;
      float dusk=exp(-.07*dot(hallSnow-vec2(-5.,-25.),hallSnow-vec2(-5.,-25.)))+
                 exp(-.085*dot(hallSnow-vec2(6.,-16.),hallSnow-vec2(6.,-16.)));
      diffuseColor.rgb+=dusk*vec3(.45,.18,.025);

    `);
  };
  ground.material.dispose();ground.material=villageSnow;
  const nightFog=new T.FogExp2(0x253451,.0038),menuFog=scene.fog;
  piece(field,sphere,new T.MeshBasicMaterial({color:0xe7f1ff,fog:false}),-85,63,-190,6);
  const starPositions=[];
  for(let i=0;i<1350;i++){
    const a=i*2.39996,h=.08+.91*((i*157)%1351)/1351,r=680*Math.sqrt(1-h*h);
    starPositions.push(Math.cos(a)*r,680*h,Math.sin(a)*r);
  }
  const stars=new T.BufferGeometry();stars.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));
  field.add(new T.Points(stars,new T.PointsMaterial({color:0xf1e7d3,size:1,sizeAttenuation:false,fog:false,transparent:true,opacity:.78})));
  const shadeCanvas=host.layer();shadeCanvas.width=shadeCanvas.height=64;
  const sc=shadeCanvas.getContext('2d'),fade=sc.createRadialGradient(32,32,1,32,32,31);
  fade.addColorStop(0,'rgba(45,45,65,.94)');fade.addColorStop(.55,'rgba(66,66,91,.56)');fade.addColorStop(1,'rgba(66,66,91,0)');
  sc.fillStyle=fade;sc.fillRect(0,0,64,64);
  const contact=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadeCanvas),color:0x868599,transparent:true,opacity:.64,depthWrite:false});
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
  const [,palace,woodBuffer,sidingImage]=await core;
  const header=new DataView(woodBuffer);
  const verts=header.getUint32(0,true),indices=header.getUint32(4,true);
  const chalet=new T.BufferGeometry();
  chalet.setAttribute('position',new T.BufferAttribute(new Float32Array(woodBuffer,8,verts*3),3));
  chalet.setAttribute('normal',new T.BufferAttribute(new Float32Array(woodBuffer,8+verts*12,verts*3),3));
  chalet.setAttribute('uv',new T.BufferAttribute(new Float32Array(woodBuffer,8+verts*24,verts*2),2));
  chalet.setIndex(new T.BufferAttribute(new Uint16Array(woodBuffer,8+verts*32,indices),1));
  const siding=new T.Texture(sidingImage);siding.flipY=false;siding.colorSpace=T.SRGBColorSpace;
  siding.wrapS=siding.wrapT=T.RepeatWrapping;siding.needsUpdate=true;
  const houseMat=new T.MeshStandardMaterial({map:siding,roughness:.84,emissive:0xffbc75,emissiveMap:siding});
  houseMat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
    '#include <emissivemap_fragment>\n totalEmissiveRadiance*=2.5*smoothstep(.12,.35,diffuseColor.r-diffuseColor.b)*smoothstep(.04,.15,diffuseColor.g-diffuseColor.b);');};

  const iceMat=new T.MeshPhysicalMaterial({vertexColors:true,roughness:.14,metalness:.35,envMap:winter.environmentMap,envMapIntensity:1.4,clearcoat:.7});
  const pink=paint(0xc65265), mint=paint(0x3b9a91);
  const templates={};
  const glacier=new T.MeshStandardMaterial({color:0x9adbeb,roughness:.18,metalness:.22});
  const lamp=new T.MeshBasicMaterial({color:0xffbd69});
  const compactEye=new T.IcosahedronGeometry(1,0);
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
  const nearCabins=[];
  function cabin(x,z,scale,angle){
    const house=piece(backdrop,chalet,houseMat,x,0,z,scale);
    house.rotation.y=angle;return house;
  }
  nearCabins.push(cabin(-8,21,.86,.66),cabin(13,12,.97,-.53));
  for(const [x,z,sc,a] of [[-13,-8,.82,.4],[14,-14,.86,-.2],[-8,-32,.82,.56],[2,-41,.72,.55],[12,-42,.78,-.27]])
    cabin(x,z,sc,a);
  const palaceMat=iceMat.clone();palaceMat.color.setHex(0xd4ecff);palaceMat.emissive.setHex(0x162e53);
  palaceMat.metalness=.43;palaceMat.roughness=.20;palaceMat.color.setHex(0xa6d5f5);
  const distantPalace=piece(backdrop,palace,palaceMat,6,-.3,-78,1.1);
  for(const [x,z,sc] of [[-12,19,1.65],[-6,12,1.2],[7,7,1.55],[17,16,1.6],[21,1,1.35],
    [-6,-20,1.4],[3,-22,1.1],[-19,-10,1.7],[19,-20,1.3],[-4,-42,.85],[14,-46,1.2]]){
    const pineTree=templates.tree.clone();pineTree.position.set(x,0,z);pineTree.scale.setScalar(sc);backdrop.add(pineTree);
  }
  for(const [x,z] of [[-5,25],[6,16],[-4,-1],[4,-17],[-3,-28]]){
    const light=templates.lamp.clone();light.position.set(x,0,z);backdrop.add(light);
  }
  for(let i=0;i<10;i++){
    const fence=templates.fence.clone();fence.position.set(-5+Math.sin(i*.25),0,21-i*2.4);
    fence.rotation.y=Math.PI/2;backdrop.add(fence);
  }
  // 前景模型保留原工程的原始 UV、法线和索引，低精度版本用于资源准备期间。
  async function loadPortraitModels(){
    await host.preparePack('villagepack');
    async function geometry(name,uv){
      const bytes=await host.read('villagepack/'+name+'.mesh'),view=new DataView(bytes),vertices=view.getUint32(0,true);
      const g=new T.BufferGeometry(),indices=view.getUint32(4,true);
      g.setAttribute('position',new T.BufferAttribute(new Float32Array(bytes,8,vertices*3),3));
      g.setAttribute('normal',new T.BufferAttribute(new Float32Array(bytes,8+vertices*12,vertices*3),3));
      if(uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(bytes,8+vertices*24,vertices*2),2));
      g.setIndex(new T.BufferAttribute(new Uint16Array(bytes,8+vertices*(uv?32:24),indices),1));return g;
    }
    const [near,castle,textureImage]=await Promise.all([geometry('house',true),geometry('palace',false),host.image('villagepack/house.jpg')]);
    const map=new T.Texture(textureImage);map.flipY=false;map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;
    const material=houseMat.clone();material.map=material.emissiveMap=map;material.onBeforeCompile=houseMat.onBeforeCompile;
    nearCabins.forEach(h=>{h.geometry=near;h.material=material;});
    const heights=castle.attributes.position,colors=[];
    for(let i=0;i<heights.count;i++){
      const normal=castle.attributes.normal,y=heights.getY(i),g=Math.max(0,normal.getY(i));
      const color=new T.Color(0x5184b8).lerp(new T.Color(0xf4effa),.16+.62*g+.12*Math.abs(Math.sin(y*1.7)));
      colors.push(color.r,color.g,color.b);
    }
    castle.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    distantPalace.geometry=castle;distantPalace.material.vertexColors=true;distantPalace.material.needsUpdate=true;
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
  const scenicDetails=new T.Group();backdrop.add(scenicDetails);
  for(const actor of [...backdrop.children])if(actor!==scenicDetails&&actor!==distantPalace&&!nearCabins.includes(actor))scenicDetails.add(actor);
  batchDecor(scenicDetails);
  loadPortraitModels().catch(()=>{});
  // 同一条灯串的电线、灯珠分别合并，避免给每个灯泡添加实时光源。
  const christmasColors=[0xff7763,0xffdf88,0x6debb2,0xffc679,0x89c9ff];
  const garlandMats=[];
  function garlands(parent,strings){
    const wire=[],bulbs=[],colors=[];
    for(const [ax,ay,az,bx,by,bz,sag] of strings){
      const count=Math.max(8,Math.ceil(Math.hypot(bx-ax,bz-az)/.86));
      let previous=[ax,ay,az];
      for(let i=1;i<=count;i++){
        const t=i/count, x=ax+(bx-ax)*t,y=ay+(by-ay)*t-4*sag*t*(1-t),z=az+(bz-az)*t;
        wire.push(...previous,x,y,z);previous=[x,y,z];
        if(i%2){bulbs.push(x,y-.095,z);colors.push(...new T.Color(christmasColors[i%5]).toArray());}
      }
    }
    const line=new T.BufferGeometry();line.setAttribute('position',new T.Float32BufferAttribute(wire,3));
    parent.add(new T.LineSegments(line,new T.LineBasicMaterial({color:0x504d42})));
    const dots=new T.BufferGeometry();dots.setAttribute('position',new T.Float32BufferAttribute(bulbs,3));
    dots.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    const material=new T.PointsMaterial({size:.67,map:glowTexture,vertexColors:true,transparent:true,depthWrite:false,toneMapped:false});
    garlandMats.push(material);parent.add(new T.Points(dots,material));
  }
  const glowCanvas=host.layer();glowCanvas.width=glowCanvas.height=48;
  const gp=glowCanvas.getContext('2d'),glow=gp.createRadialGradient(24,24,0,24,24,24);
  glow.addColorStop(0,'#fff');glow.addColorStop(.30,'#fff');glow.addColorStop(.48,'rgba(255,255,255,.82)');
  glow.addColorStop(1,'rgba(255,255,255,0)');gp.fillStyle=glow;gp.fillRect(0,0,48,48);
  const glowTexture=new T.CanvasTexture(glowCanvas);
  const baubles=[];
  for(const [x,z,k] of [[-12,19,1.65],[-6,12,1.2],[7,7,1.55],[17,16,1.6],[3,-22,1.1]]){
    for(let j=0;j<29;j++){
      const t=j/29,a=t*Math.PI*7,r=(1.38-t*1.04)*k;
      baubles.push([x+Math.cos(a)*r,(1.05+t*3.07)*k,z+Math.sin(a)*r,christmasColors[j%5]]);
    }
  }
  const ornaments=new T.InstancedMesh(new T.SphereGeometry(.15,8,6),new T.MeshBasicMaterial({toneMapped:false}),baubles.length);
  baubles.forEach(([x,y,z,color],i)=>{ornaments.setMatrixAt(i,new T.Matrix4().makeTranslation(x,y,z));ornaments.setColorAt(i,new T.Color(color));});
  backdrop.add(ornaments);
  garlands(backdrop,[[-10,6.7,23,12,6.4,18,2],[-12,6.7,16,-3,4.3,0,.76],[-3,4.3,0,15,6.8,-9,1.2],[15,6.8,-9,1,6,-37,1.5]]);
  const festivalSpans=[];
  const poleGeometry=new T.CylinderGeometry(.095,.14,1,8),poleMaterial=paint(0x785545);
  for(const [cx,cz,a] of [[0,184,.08],[23,141,-.48],[-60,74,.78],[50,43,.4],[-32,-75,-.55],[62,-115,.2],[-115,-15,.9],[100,104,-.75],[0,26,.05]]){
    const dx=Math.cos(a)*11,dz=Math.sin(a)*11,ends=[];
    for(const side of [-1,1]){
      const x=cx+side*dx,z=cz+side*dz,y=host.village.height(x,z);
      piece(field,poleGeometry,poleMaterial,x,y+3.9,z,1,7.8,1);
      ends.push(x,y+7.7,z);
    }
    festivalSpans.push(ends.concat(1.75));
  }
  garlands(field,festivalSpans);
  const flakeCount=485, flakePositions=new Float32Array(flakeCount*3);
  for(let i=0;i<flakeCount;i++) {
    flakePositions[i*3]=(Math.random()-.5)*54;
    flakePositions[i*3+1]=Math.random()*23;
    flakePositions[i*3+2]=(Math.random()-.5)*48;
  }
  const flakeGeo=new T.BufferGeometry();
  flakeGeo.setAttribute('position',new T.BufferAttribute(flakePositions,3));
  const flakes=new T.Points(flakeGeo,new T.PointsMaterial({color:0xfff6e9,size:.134,map:glowTexture,transparent:true,opacity:.88,depthWrite:false}));
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
  const balls=Array.from({length:16},(_,slot)=>{
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
      piece(head,sphere,coal,x,.38,.905,.09,.106,.077);
      piece(head,sphere,snow,x-.027,.411,.979,.024);
    }

    const nose=piece(head,cone,orange,0,.31,1.04,.117,.67,.117);
    nose.rotation.x=Math.PI/2;
    for(const side of [-1,1]){
      const y=side<0?.558:.579;
      const browCurve=new T.QuadraticBezierCurve3(new T.Vector3(side*.174,y,.824),
        new T.Vector3(side*.244,y+.044,.818),new T.Vector3(side*.310,y+.008,.788));
      piece(head,new T.TubeGeometry(browCurve,8,.019,7,false),coal,0,0,0);
      for(const point of [browCurve.v0,browCurve.v2])piece(head,sphere,coal,point.x,point.y,point.z,.019);
    }
    const shade=shadow(scene,1);
    return {root,roll,head,shade,frost,wear:null,gear:null,last:null,slot};
  });
  // 两张纹理都直接绘制到游戏上屏 WebGL，不读回开放域数据。
  const shared=host.ranking&&host.ranking.canvas;
  let rankScene=null,rankCamera=null,refreshAt=0;
  const cardSprites=[],nameMeshes=[],maps=[];
  if(shared){
    const atlas=new T.Texture(shared);atlas.colorSpace=T.SRGBColorSpace;atlas.generateMipmaps=false;
    atlas.minFilter=atlas.magFilter=T.LinearFilter;
    function section(slot,label){
      const m=atlas.clone(),x=slot%4,y=Math.floor(slot/4);
      m.offset.set(x/4,(3-y)/4+(label?.203125:0));m.repeat.set(.25,label?.046875:.1875);
      m.needsUpdate=true;maps.push(m);return m;
    }
    rankScene=new T.Scene();rankCamera=new T.OrthographicCamera(0,host.w,host.h,0,.1,10);rankCamera.position.z=1;
    balls.forEach((ball,i)=>{
      const name=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:section(i,true),transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
      name.visible=false;nameMeshes.push(name);rankScene.add(name);
      if(i){const sprite=new T.Sprite(new T.SpriteMaterial({map:section(i,false),transparent:true,depthWrite:false,toneMapped:false}));
        sprite.center.set(.5,.445);sprite.scale.set(4.4,3.3,1);ball.root.add(sprite);cardSprites.push(sprite);}
    });
  }
  function drawRankLabel(showSelf,labels){
    if(!rankScene)return;
    for(const mesh of nameMeshes)mesh.visible=false;
    const unit=Math.min(host.w/700,host.h/335);
    const list=showSelf?[{slot:0,x:host.w-78*unit,y:57*unit,w:140*unit,h:25*unit}]:labels;
    for(const l of list||[]){const mesh=nameMeshes[l.slot];if(!mesh)continue;
      mesh.visible=true;mesh.position.set(l.x,host.h-l.y,0);mesh.scale.set(l.w,l.h,1);}
    renderer.render(rankScene,rankCamera);
  }
  const byOutfitId=new Map(catalog.map(item=>[item.id,item]));
  function equip(ball,look){
    const ids=Array.isArray(look)?look:look?[look]:[];
    const key=ids.join('/');
    if(ball.gear===key)return;
    if(!ball.wear)ball.wear=new Map();
    for(const [id,group] of ball.wear){
      if(!ids.includes(id)){ball.head.remove(group);group.userData.dispose();ball.wear.delete(id);}
    }
    for(const id of ids){
      if(!byOutfitId.has(id)||ball.wear.has(id))continue;
      const group=host.outfit(T,byOutfitId.get(id),host.layer);
      ball.wear.set(id,group);ball.head.add(group);
    }
    ball.gear=key;
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
    const targetRatio=!state?menuRatio:matchRatio;
    if(renderer.getPixelRatio()!==targetRatio)renderer.setPixelRatio(targetRatio);
    portraitLight.visible=faceBounce.visible=rim.visible=ridgeBackdrop.visible=!state;
    balls[0].frost.emissive.setHex(state?0x000000:0x6d5644);
    balls[0].frost.emissiveIntensity=state?0:.43;
    skyFill.groundColor.setHex(state?0x657190:0xffceaa);skyFill.intensity=state?1.34:1.78;
    elapsed+=dt;
    for(const mat of garlandMats)mat.opacity=.88+.12*Math.sin(elapsed*1.6);
    backdrop.visible=ground.visible=!state;field.visible=!!state;
    scene.fog=state?nightFog:menuFog;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.1;
    moon.color.setHex(state?0xb7ccff:0xffdeb5);moon.intensity=state?1.35:2.2;
    cold.intensity=state?.3:1.1;
    const useCard=!!(shared&&state&&!state.tutorial);
    cardSprites.forEach((sprite,i)=>{sprite.visible=useCard;balls[i+1].roll.visible=!useCard;});
    if(shared&&(useCard||view.page==='rank')&&elapsed>=refreshAt){
      refreshAt=elapsed+.15;for(const m of maps)m.needsUpdate=true;
    }
    if(state){
      hide(state.hidden);
      for(let i=0;i<state.balls.length;i++){
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
        for(const group of b.wear.values()){
          const tail=group.userData.flutter;
          if(tail)tail.rotation.x=-.18-.4*Math.min(speed/18,1)+Math.sin(elapsed*10)*speed*.003;
        }
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
      for(const other of balls.slice(1))other.root.visible=other.shade.visible=false;
      b.root.visible=b.shade.visible=true;equip(b,view.itemId||0);
      b.root.scale.setScalar(2);b.root.position.set(0,1.99+.035*Math.sin(elapsed*2.5),29);
      b.roll.rotation.set(.035*Math.sin(elapsed*1.2),0,.035*Math.sin(elapsed*1.8));
      b.head.rotation.y=(shop?.32:.49)+.13*Math.sin(elapsed*.85);
      b.shade.rotation.set(-Math.PI/2,0,0);b.shade.position.set(0,.012,29);b.shade.scale.set(2.55,2.3,1);
      const offset=(shop?.636:.38)*(host.w/host.h)*4.0;
      camera.position.set(offset,3.05,shop?37.8:37.4);camera.lookAt(offset,shop?1.48:1.65,29);
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
    const own=balls[slot].root.position;let enemy=null;
    for(const b of balls)if(b.slot!==slot&&b.root.visible&&(!enemy||own.distanceToSquared(b.root.position)<own.distanceToSquared(enemy)))enemy=b.root.position;
    if(!enemy)enemy=own;
    marker.copy(enemy);marker.y+=2.2;
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
