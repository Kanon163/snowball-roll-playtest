/* Independently implemented layout/rules based on observed scale and documented client behaviour. */
const SnowVillage={radius:216,duration:270,spawnRadius:194,palace:{x:0,z:0},
 respawn:{gift:[7.5,12.5],snowman:[7.5,12.5],fence:[9,15],lamp:[9.75,16.25],reindeer:[12,20],tree:[14.25,23.75],nutcracker:[15,25],house:[19.5,32.5],tower:[22.5,37.5]},
 houses:Array.from({length:12},(_,i)=>{const inner=i<8,n=inner?i:i-8,count=inner?8:4,a=(n+.5)/count*Math.PI*2+Math.sin(i*2.3)*.095,r=(inner?67:130)+Math.sin(i*4.7)*9;return {x:Math.sin(a)*r,z:Math.cos(a)*r};}),
 rawHeight(x,z){const r=Math.hypot(x,z),t=Math.max(0,Math.min(1,(60-r)/42)),hill=12*t*t*(3-2*t);
 const lane=Math.min(Math.abs(x),Math.abs(z),Math.abs(r-88),Math.abs(r-142)),shoulder=Math.min(1,lane/9);
 const swell=2.7*Math.sin(x*.041+Math.sin(z*.022))*Math.cos(z*.036)+1.3*Math.sin(z*.081+x*.029);
 const channel=x-45-Math.sin(z*.025)*20,gully=-3.7*Math.exp(-channel*channel/50)*Math.pow(Math.sin(z*.018),2);
 const drift=.85*Math.sin(x*.16+z*.055)*Math.sin(z*.095)+.35*Math.sin(z*.31+x*.13);
 return hill+(swell+gully+drift*shoulder)*(.32+.68*shoulder)*(1-t)-.06;
 },
 height(x,z){let h=this.rawHeight(x,z);for(const p of this.houses){const d=Math.hypot(x-p.x,z-p.z);if(d<11){const t=Math.max(0,Math.min(1,(d-5.8)/5.2)),blend=t*t*(3-2*t);h=this.rawHeight(p.x,p.z)*(1-blend)+h*blend;}}return h;},
 delay(type,id){const span=this.respawn[type];if(!span)return Infinity;const k=((Math.imul(id+7,2654435761)>>>0)%1000)/999;return span[0]+(span[1]-span[0])*k;},
 clamp(x,z,r=0){const d=Math.hypot(x,z),limit=this.radius-r;return d>limit?{x:x/d*limit,z:z/d*limit}:{x,z};}
};

SnowVillage.layout=function(){
 let seed=3824;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const range=(a,b)=>a+(b-a)*random();
 const items=[],cells=new Map();
 const specData={palace:[11,12000],house:[4.2,1500],tower:[2.9,4000],lamp:[.5,30],tree:[1.3,300],
  reindeer:[1.1,150],nutcracker:[1.1,600],fence:[1.3,30],snowman:[.65,12],gift:[.55,12]};
 const specs=Object.fromEntries(Object.entries(specData).map(([key,[r,req]])=>[key,{r,req}]));
 const cell=(x,z)=>Math.floor(x/16)+','+Math.floor(z/16);
 function neighbors(x,z){
   const out=[];
   for(let i=Math.floor(x/16)-1;i<=Math.floor(x/16)+1;i++)for(let j=Math.floor(z/16)-1;j<=Math.floor(z/16)+1;j++){
     const list=cells.get(i+','+j);if(list)out.push(...list);
   }
   return out;
 }
 function makeProp(type,x,z){
   const o={type,x,z,...specs[type],g:{rotation:{y:0}},color:0};
   if(type==='house')random();
   if(type==='gift')o.color=Math.floor(random()*3);
   items.push(o);const k=cell(x,z);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(o);return o;
 }
 function polar(r,a){return [Math.sin(a)*r,Math.cos(a)*r];}
 function scatter(type,count,inner,outer){let placed=0;for(let attempt=0;placed<count&&attempt<count*30;attempt++){const r=Math.sqrt(range(inner*inner,outer*outer)),a=range(0,Math.PI*2),[x,z]=polar(r,a);if(Math.min(Math.abs(x),Math.abs(z))<3.4)continue;if(neighbors(x,z).some(o=>Math.hypot(o.x-x,o.z-z)<(o.r+specs[type].r)*.85))continue;if(neighbors(x,z).some(o=>o.req>=150&&Math.hypot(o.x-x,o.z-z)<o.r+specs[type].r+1.5))continue;const o=makeProp(type,x,z);o.g.rotation.y=range(-Math.PI,Math.PI);placed++;}}
 makeProp('palace',0,0);
 for(const p of SnowVillage.houses){const o=makeProp('house',p.x,p.z);o.g.rotation.y=Math.atan2(-p.x,-p.z)+range(-.18,.18);}
 for(let i=0;i<4;i++){const [x,z]=polar(108,(i+.3)/4*Math.PI*2);makeProp('tower',x,z);}
 for(let i=0;i<4;i++){const a=i*Math.PI/2;for(let r of [27,45,72,104,126,160,186]){const [x,z]=polar(r,a),[ox,oz]=polar(5,a+Math.PI/2);makeProp('lamp',x+ox,z+oz);}}
 for(const radius of [88,142])for(let i=0;i<16;i++){const [x,z]=polar(radius+range(-4,4),(i+.5+range(-.18,.18))/16*Math.PI*2);makeProp('lamp',x,z);}
 scatter('tree',58,75,200);scatter('reindeer',44,90,192);scatter('nutcracker',18,48,130);scatter('fence',100,82,145);
 scatter('snowman',1250,148,205);scatter('gift',1000,145,205);
 scatter('gift',240,80,136);scatter('snowman',280,80,136);scatter('gift',70,40,78);
 for(let i=0;i<45;i++){const a=i*2.399963,r=4+Math.sqrt(i)*1.35;makeProp(i%2?'gift':'snowman',Math.cos(a)*r,194+Math.sin(a)*r);}

 return items.map(o=>[o.type==='reindeer'?'deer':o.type,o.x,o.z,o.g.rotation.y,o.color]);
};
if(typeof module!=='undefined')module.exports=SnowVillage;

