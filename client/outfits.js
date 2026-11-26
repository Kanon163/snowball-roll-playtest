/* 单个雪球的一套可替换配件。所有几何均挂在角色上，与预览和比赛共用。 */
function makeSnowOutfit(T, item, layer) {
  const group=new T.Group(), materials=[], geometries=[];
  const shape=item.style, main=item.color, trim=item.accent;
  function material(color,metal=0) {
    const m=new T.MeshStandardMaterial({color,roughness:metal ? .34 : .86,metalness:metal});
    materials.push(m);return m;
  }
  const cloth=material(main), accent=material(trim), brass=material('#dda75b',.5);
  const swatch=layer();
  swatch.width=96;swatch.height=64;
  const c=swatch.getContext('2d');
  c.fillStyle=main;c.fillRect(0,0,96,64);
  c.fillStyle=trim;c.fillRect(0,0,12,64);c.fillRect(18,0,4,64);
  c.lineWidth=1.4;c.strokeStyle='rgba(255,255,255,.32)';
  for(let y=-2;y<66;y+=6)for(let x=-3;x<96;x+=6){
    c.beginPath();c.moveTo(x,y);c.lineTo(x+3,y+4);c.lineTo(x+5,y);c.stroke();
  }
  const textile=new T.CanvasTexture(swatch);
  textile.colorSpace=T.SRGBColorSpace;textile.wrapS=T.RepeatWrapping;textile.repeat.x=5;
  const knit=material('#ffffff');knit.map=textile;
  function mesh(geo,mat,x,y,z,sx=1,sy=sx,sz=sx){
    geometries.push(geo);const o=new T.Mesh(geo,mat);
    o.position.set(x,y,z);o.scale.set(sx,sy,sz);group.add(o);return o;
  }
  function oval(m,x,y,z,a,b,d){return mesh(new T.SphereGeometry(1,20,12),m,x,y,z,a,b,d);}
  function ring(m,y,r,t){const o=mesh(new T.TorusGeometry(r,t,12,48),m,0,y,0);o.rotation.x=Math.PI/2;return o;}
  function branch(ax,ay,az,bx,by,bz,r,m){
    const a=new T.Vector3(ax,ay,az),b=new T.Vector3(bx,by,bz),v=b.clone().sub(a);
    const o=mesh(new T.CylinderGeometry(r*.7,r,v.length(),8),m,(ax+bx)/2,(ay+by)/2,(az+bz)/2);
    o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;
  }
  let flutter=null;
  if(shape==='scarf'||shape==='cape'){
    ring(knit,.04,.955,.105);ring(knit,-.05,.966,.105);
    flutter=oval(knit,-.92,-.14,-.23,.40,.11,.16);flutter.rotation.z=.39;
    const loose=oval(knit,-.92,-.06,-.35,.30,.10,.14);loose.rotation.z=-.23;
    if(shape==='cape'){
      const cape=mesh(new T.ConeGeometry(1,1,40,1,true,1.1,4.0),cloth,0,-.11,0,1.09,.87,1.09);
      cape.material.side=T.DoubleSide;oval(brass,0,.06,1,.12,.12,.04);
    }
  } else if(shape==='beanie'||shape==='hat'){
    if(shape==='beanie'){
      oval(knit,0,.81,0,.68,.45,.66);ring(knit,.72,.66,.09);oval(accent,.05,1.3,-.02,.19,.19,.19);
    }else{
      mesh(new T.CylinderGeometry(.83,.83,.08,36),cloth,0,.78,0);
      mesh(new T.CylinderGeometry(.46,.52,.59,28),cloth,0,1.09,0);
      mesh(new T.CylinderGeometry(.51,.52,.12,28),accent,0,.93,0);
    }
  }else if(shape==='earmuffs'){
    const hoop=mesh(new T.TorusGeometry(.93,.053,8,36,Math.PI),accent,0,.07,0);
    hoop.rotation.y=.06;
    for(const side of [-1,1])oval(knit,side*.94,.07,0,.16,.33,.31);
  }else if(shape==='bow'){
    ring(cloth,-.10,.96,.055);
    for(const side of [-1,1]){const loop=oval(cloth,side*.23,-.07,.98,.27,.20,.095);loop.rotation.z=side*.36;}
    oval(accent,0,-.07,1.03,.095,.13,.085);
  }else if(shape==='wreath'||shape==='crown'){
    ring(shape==='crown'?brass:cloth,.74,.66,.065);
    for(let i=0;i<9;i++){
      const a=i*Math.PI*2/9,x=.65*Math.cos(a),z=.65*Math.sin(a);
      if(shape==='crown'){
        mesh(new T.ConeGeometry(.12,.35,4),cloth,x,.89,z);
        oval(accent,x,1.07,z,.055,.07,.055);
      }else{
        for(let k=0;k<5;k++){const t=k*Math.PI*.4;oval(cloth,x+Math.cos(t)*.075,.80+Math.sin(t)*.075,z,.075,.08,.062);}
        oval(accent,x,.8,z+.045,.061,.066,.061);
      }
    }
  }else if(shape==='antlers'){
    for(const side of [-1,1]){
      branch(side*.44,.71,0,side*.83,1.42,-.10,.095,cloth);
      branch(side*.65,1.06,-.05,side*.98,1.19,0,.07,cloth);
      branch(side*.72,1.19,-.07,side*.58,1.43,.01,.06,accent);
      oval(accent,side*.83,1.42,-.10,.06,.075,.06);
    }
  }else if(shape==='wings'){
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const feather=oval(i%2?accent:cloth,side*(.62+i*.105),.04+i*.12,-.43,.15,.42-i*.029,.095);
      feather.rotation.z=-side*(.6+i*.10);
    }
    ring(brass,.10,.98,.045);
  }
  group.userData.flutter=flutter;
  group.userData.dispose=()=>{for(const g of geometries)g.dispose();for(const m of materials)m.dispose();textile.dispose();};
  return group;
}
if(typeof module!=='undefined')module.exports=makeSnowOutfit;
