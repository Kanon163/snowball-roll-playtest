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
  swatch.width=192;swatch.height=96;
  const c=swatch.getContext('2d');
  c.fillStyle=main;c.fillRect(0,0,192,96);c.fillStyle=trim;c.fillRect(0,0,32,96);c.fillRect(41,0,9,96);
  c.lineCap='round';
  for(let y=-9;y<104;y+=8)for(let x=-7;x<199;x+=9){
    c.strokeStyle='rgba(37,17,21,.38)';c.lineWidth=3.3;
    c.beginPath();c.moveTo(x-3,y);c.lineTo(x,y+5);c.lineTo(x+3.5,y);c.stroke();
    c.strokeStyle='rgba(255,244,220,.58)';c.lineWidth=1.8;
    c.beginPath();c.moveTo(x-2.5,y-.5);c.lineTo(x,y+3.5);c.stroke();
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
  }else if(item.slot==='眼镜'){
    const star=shape==='starSpecs', square=shape==='squareSpecs', wide=shape==='skiVisor'||shape==='snowGoggles';
    const lens=material(wide?main:'#b1e9e9',.16);lens.transparent=true;lens.opacity=wide?.52:.24;lens.depthWrite=false;
    for(const sign of [-1,1]){
      const x=sign*.265,y=.37,z=.963;
      const rim=mesh(new T.TorusGeometry(.183,wide?.041:.026,8,star?5:square?4:28),accent,x,y,z,wide?1.29:1,.88,.8);
      if(square)rim.rotation.z=Math.PI/4;
      oval(lens,x,y,z-.01,wide?.231:.173,.147,.021);
      branch(x+sign*.17,y,z,sign*.83,.28,.45,.029,cloth);
      if(shape==='jewelSpecs')for(let i=0;i<4;i++)oval(i%2?brass:accent,sign*(.49+i*.055),.30-.08*Math.sin(i*.8),.91-i*.08,.029,.039,.027);
      if(star)oval(brass,x+.12,y+.13,z+.02,.035,.04,.02);
    }
    branch(-.087,.385,.976,.087,.385,.976,.026,brass);
  }else if(item.slot==='手臂'){
    for(const sign of [-1,1]){
      const x=sign*1.24;
      branch(sign*.82,-.08,.04,x,.15,.17,.06,shape==='crystalArms'?accent:cloth);
      if(shape==='twigs'||shape==='crystalArms'){
        for(let k=0;k<3;k++)branch(x,.14,.17,x+sign*(.12+k*.055),.43-k*.13,.19+k*.035,.038,k===1?accent:cloth);
      }else if(shape==='candyArms'){
        branch(x,.02,.16,x,.52,.16,.066,accent);
        for(let k=0;k<3;k++)oval(cloth,x,.10+k*.14,.16,.069,.044,.069);
        const hook=mesh(new T.TorusGeometry(.10,.057,8,16,Math.PI),accent,x+sign*.10,.50,.16);
      }else{
        oval(knit,x,.18,.16,.17,shape==='cuffs'?.13:.24,.14);
        oval(accent,x-sign*.13,.20,.23,.084,.11,.08);
        oval(shape==='bellMitts'?brass:accent,x,.01,.16,.15,.07,.135);
      }
    }
  }else if(shape==='bellScarf'||shape==='ribbonScarf'||shape==='furCollar'){
    ring(knit,-.20,.967,shape==='furCollar'?.13:.086);
    for(let k=0;k<(shape==='furCollar'?16:3);k++){
      const a=shape==='furCollar'?k*Math.PI/8:(k-1)*.27;
      oval(shape==='bellScarf'?brass:accent,Math.sin(a)*.97,-.25,Math.cos(a)*.97,.11,.10,.09);
    }
    if(shape==='ribbonScarf')flutter=oval(knit,-.65,-.39,.70,.14,.35,.09);
  }else if(['shortCape','mantle','ribbonCape'].includes(shape)){
    const long=shape==='ribbonCape';
    const drape=mesh(new T.ConeGeometry(1,1,32,1,true,Math.PI*.43,Math.PI*1.14),cloth,0,-.22,-.05,1.20,long?1.22:.84,1.17);
    drape.material.side=T.DoubleSide;
    for(const sign of [-1,1]){
      const hem=oval(accent,sign*.83,-.17,-.55,.16,long?.59:.33,.16);hem.rotation.z=sign*.28;
      if(shape==='mantle')oval(knit,sign*.65,.10,-.49,.36,.14,.26);
    }
  }else if(item.slot==='嘴部装饰'){
    const x=.31,y=.02,z=.993;
    branch(.09,.105,1,x,y,z+.035,.021,brass);
    if(shape==='leafSprig'||shape==='iceRose'){
      branch(x,y,z,x+.16,y+.15,z+.04,.014,cloth);
      for(let k=0;k<(shape==='iceRose'?7:3);k++){
        const a=k*2.4;const leaf=oval(k%2?accent:cloth,x+.11+.07*Math.cos(a),y+.11+.06*Math.sin(a),z+.045+k*.006,.063,.038,.03);leaf.rotation.z=a;
      }
    }else if(shape==='candyCane'){
      branch(x,y,z,x+.14,y+.24,z,.035,accent);
      for(let k=1;k<=3;k++)oval(cloth,x+k*.035,y+k*.06,z,.04,.03,.04);
      mesh(new T.TorusGeometry(.063,.033,8,14,Math.PI),accent,x+.20,y+.24,z);
    }else if(shape==='goldWhistle'){
      oval(brass,x+.05,y,z,.13,.075,.063);oval(cloth,x+.07,y+.05,z+.049,.042,.021,.019);
    }else{
      oval(shape==='cookie'?cloth:accent,x+.07,y+.04,z+.04,.127,.126,.038);
      for(let k=0;k<5;k++){const a=k*1.26;oval(shape==='cookie'?accent:cloth,x+.07+.069*Math.cos(a),y+.04+.069*Math.sin(a),z+.076,.022,.027,.009);}
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
