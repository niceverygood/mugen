import type {
  DXFEntity, DXFData, Bounds, Preset, GenSettings,
  HAxis, VAxis, Axes, Extents, GeneratedLayers, Opening,
} from '@mugen/shared';
import { getBounds } from '@mugen/shared';

function extents(hAxes: HAxis[], vAxes: VAxis[]): Extents {
  return {
    xMin: Math.min(...vAxes.map(a => a.x)),
    xMax: Math.max(...vAxes.map(a => a.x)),
    yMin: Math.min(...hAxes.map(a => a.y)),
    yMax: Math.max(...hAxes.map(a => a.y)),
  };
}

// ---- Layer filtering ----
const EXCLUDE_KW = ['寸法','DIM','TEXT','注記','HATCH','家具','FURNITURE','設備','PLUMBING','ELECTRIC','ANNO','VIEWPORT','DEFPOINTS','TITLE'];
const WALL_KW = ['壁','WALL','外壁','内壁','通り芯','軸','AXIS','CENTER','柱','COLUMN','GRID','STRUCT'];

function isStructural(layer: string) {
  const u = layer.toUpperCase();
  return !EXCLUDE_KW.some(k => u.includes(k));
}
function isWallLayer(layer: string) {
  const u = layer.toUpperCase();
  return WALL_KW.some(k => u.includes(k));
}

// ---- Opening detection ----
const OPEN_KW = ['窓','WINDOW','ドア','DOOR','建具','開口','WIN','DR'];

function detectOpenings(entities: DXFEntity[], hAxes: HAxis[], vAxes: VAxis[], tol = 300) {
  const hO = new Map<number, Opening[]>();
  const vO = new Map<number, Opening[]>();

  // Arcs = door swings
  entities.forEach((e: any) => {
    if (e.type === 'ARC' && e.r > 200 && e.r < 1500) {
      hAxes.forEach((a, i) => {
        if (Math.abs(e.y - a.y) < tol && e.x >= a.x0 - tol && e.x <= a.x1 + tol) {
          if (!hO.has(i)) hO.set(i, []);
          hO.get(i)!.push({ pos: e.x, width: e.r, type: 'door' });
        }
      });
      vAxes.forEach((a, i) => {
        if (Math.abs(e.x - a.x) < tol && e.y >= a.y0 - tol && e.y <= a.y1 + tol) {
          if (!vO.has(i)) vO.set(i, []);
          vO.get(i)!.push({ pos: e.y, width: e.r, type: 'door' });
        }
      });
    }
  });

  // Entities on opening layers
  entities.filter((e: any) => OPEN_KW.some(k => (e.layer||'').toUpperCase().includes(k))).forEach((e: any) => {
    let cx: number, cy: number, w: number;
    if (e.type === 'LINE') {
      cx = ((e.x1||0)+(e.x2||0))/2; cy = ((e.y1||0)+(e.y2||0))/2;
      w = Math.hypot((e.x2||0)-(e.x1||0),(e.y2||0)-(e.y1||0));
    } else if (e.vertices?.length >= 2) {
      const xs = e.vertices.map((v:any)=>v.x), ys = e.vertices.map((v:any)=>v.y);
      cx = (Math.min(...xs)+Math.max(...xs))/2; cy = (Math.min(...ys)+Math.max(...ys))/2;
      w = Math.max(Math.max(...xs)-Math.min(...xs), Math.max(...ys)-Math.min(...ys));
    } else return;
    if (w < 300 || w > 3000) return;
    hAxes.forEach((a,i) => { if (Math.abs(cy-a.y)<tol) { if(!hO.has(i))hO.set(i,[]); hO.get(i)!.push({pos:cx,width:w,type:'window'}); }});
    vAxes.forEach((a,i) => { if (Math.abs(cx-a.x)<tol) { if(!vO.has(i))vO.set(i,[]); vO.get(i)!.push({pos:cy,width:w,type:'window'}); }});
  });

  // Dedup overlapping openings
  const dd = (arr: Opening[]) => {
    if (arr.length < 2) return arr;
    arr.sort((a,b) => a.pos-b.pos);
    const r = [arr[0]];
    for (let i=1;i<arr.length;i++) {
      const p = r[r.length-1];
      if (arr[i].pos - p.pos < p.width) { if (arr[i].width > p.width) r[r.length-1] = arr[i]; }
      else r.push(arr[i]);
    }
    return r;
  };
  hO.forEach((v,k) => hO.set(k, dd(v)));
  vO.forEach((v,k) => vO.set(k, dd(v)));
  return { hOpenings: hO, vOpenings: vO };
}

// ---- Axis extraction (layer-aware) ----
export function extractAxes(entities: DXFEntity[]): Axes {
  const bounds = getBounds(entities);
  const bW = bounds.x1-bounds.x0, bH = bounds.y1-bounds.y0;
  const scale = Math.max(bW, bH);
  const minLen = Math.max(2000, scale*0.25);
  const merge = Math.max(500, scale*0.03);

  const proc = (ents: DXFEntity[], hC: HAxis[], vC: VAxis[]) => {
    ents.forEach((e:any) => {
      const lines: [number,number,number,number][] = [];
      if (e.type==='LINE') lines.push([e.x1,e.y1,e.x2,e.y2]);
      else if ((e.type==='LWPOLYLINE'||e.type==='POLYLINE')&&e.vertices)
        for (let i=0;i<e.vertices.length-1;i++) lines.push([e.vertices[i].x,e.vertices[i].y,e.vertices[i+1].x,e.vertices[i+1].y]);
      lines.forEach(([x1,y1,x2,y2]) => {
        const len = Math.hypot(x2-x1,y2-y1);
        if (len<minLen) return;
        const dx=Math.abs(x2-x1), dy=Math.abs(y2-y1);
        if (dy/len<0.08) hC.push({y:(y1+y2)/2,x0:Math.min(x1,x2),x1:Math.max(x1,x2),len});
        else if (dx/len<0.08) vC.push({x:(x1+x2)/2,y0:Math.min(y1,y2),y1:Math.max(y1,y2),len});
      });
    });
  };

  const dedup = <T extends {len:number}>(arr:T[],key:keyof T,m:number):T[] => {
    if(!arr.length)return[];
    const s=[...arr].sort((a,b)=>(a[key] as number)-(b[key] as number));
    const r=[s[0]];
    s.slice(1).forEach(l=>{const p=r[r.length-1];if(Math.abs((l[key] as number)-(p[key] as number))>m)r.push(l);else if(l.len>p.len)r[r.length-1]=l;});
    return r;
  };

  // Try wall layers first, then structural, then all
  for (const filter of [
    (e:any) => isWallLayer(e.layer||''),
    (e:any) => isStructural(e.layer||''),
    () => true,
  ]) {
    const hC:HAxis[]=[], vC:VAxis[]=[];
    proc(entities.filter(filter), hC, vC);
    let h = dedup(hC,'y',merge), v = dedup(vC,'x',merge);
    if (h.length>=2 && v.length>=2) {
      if(h.length>10){h.sort((a,b)=>b.len-a.len);h=h.slice(0,8);h.sort((a,b)=>a.y-b.y);}
      if(v.length>10){v.sort((a,b)=>b.len-a.len);v=v.slice(0,8);v.sort((a,b)=>a.x-b.x);}
      h[0].isExterior=true; h[h.length-1].isExterior=true;
      v[0].isExterior=true; v[v.length-1].isExterior=true;
      return {hAxes:h, vAxes:v};
    }
  }
  return {hAxes:[], vAxes:[]};
}

export function syntheticAxes(bounds: Bounds, floors=2): Axes {
  const{x0,y0,x1,y1}=bounds;
  const cx=(x0+x1)/2,cy=(y0+y1)/2,W=(x1-x0)*0.78,H=(y1-y0)*0.78;
  return {
    hAxes:[
      {y:cy-H/2,x0:cx-W/2,x1:cx+W/2,len:W,isExterior:true},
      ...(floors>=2?[{y:cy,x0:cx-W/2,x1:cx+W/2,len:W}]:[]),
      {y:cy+H/2,x0:cx-W/2,x1:cx+W/2,len:W,isExterior:true},
    ],
    vAxes:[
      {x:cx-W/2,y0:cy-H/2,y1:cy+H/2,len:H,isExterior:true},
      {x:cx-W/6,y0:cy-H/2,y1:cy+H/2,len:H},
      {x:cx+W/6,y0:cy-H/2,y1:cy+H/2,len:H},
      {x:cx+W/2,y0:cy-H/2,y1:cy+H/2,len:H,isExterior:true},
    ],
  };
}

// ---- 기초 (Foundation) ----
function gen基礎(hAxes: HAxis[], vAxes: VAxis[], preset: Preset): DXFEntity[] {
  const{xMin,xMax,yMin,yMax}=extents(hAxes,vAxes);
  const ov=450, ft=preset.wallType==='Wood'?200:175;
  const fs=preset.wallType==='Wood'?400:preset.wallType==='LGS'?350:500;
  const el:any[]=[];

  el.push({type:'LWPOLYLINE',layer:'기초_외주',flags:1,color:30,
    vertices:[{x:xMin-ov,y:yMin-ov},{x:xMax+ov,y:yMin-ov},{x:xMax+ov,y:yMax+ov},{x:xMin-ov,y:yMax+ov}]});
  el.push({type:'LWPOLYLINE',layer:'기초_내부',flags:1,color:30,
    vertices:[{x:xMin-ov+fs,y:yMin-ov+fs},{x:xMax+ov-fs,y:yMin-ov+fs},{x:xMax+ov-fs,y:yMax+ov-fs},{x:xMin-ov+fs,y:yMax+ov-fs}]});

  // Exterior: triple beam, Interior: single center
  hAxes.forEach(a=>{
    if(a.isExterior){
      el.push({type:'LINE',layer:'기초_보',color:30,x1:xMin-ov,y1:a.y,x2:xMax+ov,y2:a.y});
      el.push({type:'LINE',layer:'기초_보',color:30,x1:xMin-ov,y1:a.y-ft,x2:xMax+ov,y2:a.y-ft});
      el.push({type:'LINE',layer:'기초_보',color:30,x1:xMin-ov,y1:a.y+ft,x2:xMax+ov,y2:a.y+ft});
    } else {
      el.push({type:'LINE',layer:'기초_내부보',color:8,x1:xMin,y1:a.y,x2:xMax,y2:a.y});
    }
  });
  vAxes.forEach(a=>{
    if(a.isExterior){
      el.push({type:'LINE',layer:'기초_보',color:30,x1:a.x,y1:yMin-ov,x2:a.x,y2:yMax+ov});
      el.push({type:'LINE',layer:'기초_보',color:30,x1:a.x-ft,y1:yMin-ov,x2:a.x-ft,y2:yMax+ov});
      el.push({type:'LINE',layer:'기초_보',color:30,x1:a.x+ft,y1:yMin-ov,x2:a.x+ft,y2:yMax+ov});
    } else {
      el.push({type:'LINE',layer:'기초_내부보',color:8,x1:a.x,y1:yMin,x2:a.x,y2:yMax});
    }
  });

  // Footings at exterior intersections
  hAxes.forEach(h=>vAxes.forEach(v=>{
    if(!h.isExterior&&!v.isExterior) return;
    const s=fs/2;
    el.push({type:'LWPOLYLINE',layer:'기초_독립기초',flags:1,color:10,
      vertices:[{x:v.x-s,y:h.y-s},{x:v.x+s,y:h.y-s},{x:v.x+s,y:h.y+s},{x:v.x-s,y:h.y+s}]});
    el.push({type:'LINE',layer:'기초_독립기초',color:10,x1:v.x-s,y1:h.y-s,x2:v.x+s,y2:h.y+s});
    el.push({type:'LINE',layer:'기초_독립기초',color:10,x1:v.x+s,y1:h.y-s,x2:v.x-s,y2:h.y+s});
  }));
  return el;
}

// ---- 토대 (Sill Plate) ----
function gen토대(hAxes: HAxis[], vAxes: VAxis[], preset: Preset): DXFEntity[] {
  const{xMin,xMax,yMin,yMax}=extents(hAxes,vAxes);
  const wt=preset.wallType==='Wood'?105:75;
  const el:any[]=[];
  const box=(x1:number,y1:number,x2:number,y2:number,layer:string,color:number)=>
    el.push({type:'LWPOLYLINE',layer,flags:1,color,vertices:[{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}]});

  box(xMin-wt,yMin-wt,xMax+wt,yMax+wt,'토대_외주',40);
  box(xMin,yMin,xMax,yMax,'토대_내선',40);

  hAxes.slice(1,-1).forEach(a=>{
    el.push({type:'LINE',layer:'토대_내부',color:40,x1:xMin,y1:a.y-wt/2,x2:xMax,y2:a.y-wt/2});
    el.push({type:'LINE',layer:'토대_내부',color:40,x1:xMin,y1:a.y+wt/2,x2:xMax,y2:a.y+wt/2});
  });
  vAxes.slice(1,-1).forEach(a=>{
    el.push({type:'LINE',layer:'토대_내부',color:40,x1:a.x-wt/2,y1:yMin,x2:a.x-wt/2,y2:yMax});
    el.push({type:'LINE',layer:'토대_내부',color:40,x1:a.x+wt/2,y1:yMin,x2:a.x+wt/2,y2:yMax});
  });

  const ab=1820;
  for(let x=xMin+ab/2;x<xMax;x+=ab){
    el.push({type:'CIRCLE',layer:'토대_앙카볼트',color:40,x,y:yMin,r:50});
    el.push({type:'CIRCLE',layer:'토대_앙카볼트',color:40,x,y:yMax,r:50});
  }
  for(let y=yMin+ab/2;y<yMax;y+=ab){
    el.push({type:'CIRCLE',layer:'토대_앙카볼트',color:40,x:xMin,y,r:50});
    el.push({type:'CIRCLE',layer:'토대_앙카볼트',color:40,x:xMax,y,r:50});
  }
  return el;
}

// ---- 스터드 (Studs) — exterior/interior + opening detection ----
function gen스터드(hAxes:HAxis[],vAxes:VAxis[],preset:Preset,hO:Map<number,Opening[]>,vO:Map<number,Opening[]>,floor=1):DXFEntity[]{
  const{xMin,xMax,yMin,yMax}=extents(hAxes,vAxes);
  const sp=preset.stud, wt=preset.wallType==='Wood'?105:75;
  const color=floor===1?3:4;
  const el:any[]=[];

  const stud=(x1:number,y1:number,x2:number,y2:number,layer?:string)=>
    el.push({type:'LINE',layer:layer||`${floor}층_스터드`,color,x1,y1,x2,y2});
  const plate=(x1:number,y1:number,x2:number,y2:number)=>
    el.push({type:'LINE',layer:`${floor}층_상하판`,color,x1,y1,x2,y2});

  // Horizontal walls
  hAxes.forEach((a,idx)=>{
    const ext=!!a.isExterior;
    const lyr=ext?`${floor}층_스터드`:`${floor}층_내벽`;

    plate(xMin,a.y-wt/2,xMax,a.y-wt/2);
    plate(xMin,a.y+wt/2,xMax,a.y+wt/2);
    if(ext) plate(xMin,a.y-wt/2+3,xMax,a.y-wt/2+3); // double top plate

    stud(xMin,a.y-wt/2,xMin,a.y+wt/2,lyr);
    stud(xMax,a.y-wt/2,xMax,a.y+wt/2,lyr);

    const openings=hO.get(idx)||[];
    for(let x=xMin+sp;x<xMax;x+=sp){
      if(!openings.some(o=>x>o.pos-o.width/2&&x<o.pos+o.width/2))
        stud(x,a.y-wt/2,x,a.y+wt/2,lyr);
    }

    // Opening details
    openings.forEach(o=>{
      const L=o.pos-o.width/2, R=o.pos+o.width/2;
      stud(L,a.y-wt/2,L,a.y+wt/2,`${floor}층_개구부`);
      stud(R,a.y-wt/2,R,a.y+wt/2,`${floor}층_개구부`);
      el.push({type:'LINE',layer:`${floor}층_개구부`,color:2,x1:L,y1:a.y-wt/4,x2:R,y2:a.y-wt/4});
      el.push({type:'LINE',layer:`${floor}층_개구부`,color:2,x1:L,y1:a.y+wt/4,x2:R,y2:a.y+wt/4});
    });

    // Simulated openings (exterior only, if none detected)
    if(!openings.length&&ext){
      const gap=sp*6;
      for(let x=xMin+gap;x<xMax-900;x+=gap){
        el.push({type:'LINE',layer:`${floor}층_개구부`,color:2,x1:x,y1:a.y-wt/4,x2:x+900,y2:a.y-wt/4});
        el.push({type:'LINE',layer:`${floor}층_개구부`,color:2,x1:x,y1:a.y+wt/4,x2:x+900,y2:a.y+wt/4});
        stud(x,a.y-wt/2,x,a.y+wt/2,`${floor}층_개구부`);
        stud(x+900,a.y-wt/2,x+900,a.y+wt/2,`${floor}층_개구부`);
      }
    }

    // Bracing — exterior only
    if(ext){
      const br=sp*10;
      for(let x=xMin;x<xMax-br/2;x+=br)
        el.push({type:'LINE',layer:`${floor}층_가새`,color:6,x1:x,y1:a.y-wt/2,x2:x+br,y2:a.y+wt/2});
    }
  });

  // Vertical walls
  vAxes.forEach((a,idx)=>{
    const ext=!!a.isExterior;
    const lyr=ext?`${floor}층_스터드`:`${floor}층_내벽`;

    plate(a.x-wt/2,yMin,a.x-wt/2,yMax);
    plate(a.x+wt/2,yMin,a.x+wt/2,yMax);
    if(ext) plate(a.x-wt/2+3,yMin,a.x-wt/2+3,yMax);

    stud(a.x-wt/2,yMin,a.x+wt/2,yMin,lyr);
    stud(a.x-wt/2,yMax,a.x+wt/2,yMax,lyr);

    const openings=vO.get(idx)||[];
    for(let y=yMin+sp;y<yMax;y+=sp){
      if(!openings.some(o=>y>o.pos-o.width/2&&y<o.pos+o.width/2))
        stud(a.x-wt/2,y,a.x+wt/2,y,lyr);
    }

    openings.forEach(o=>{
      const B=o.pos-o.width/2, T=o.pos+o.width/2;
      stud(a.x-wt/2,B,a.x+wt/2,B,`${floor}층_개구부`);
      stud(a.x-wt/2,T,a.x+wt/2,T,`${floor}층_개구부`);
      el.push({type:'LINE',layer:`${floor}층_개구부`,color:2,x1:a.x-wt/4,y1:B,x2:a.x-wt/4,y2:T});
      el.push({type:'LINE',layer:`${floor}층_개구부`,color:2,x1:a.x+wt/4,y1:B,x2:a.x+wt/4,y2:T});
    });

    if(!openings.length&&ext){
      const gap=sp*6;
      for(let y=yMin+gap;y<yMax-900;y+=gap){
        el.push({type:'LINE',layer:`${floor}층_개구부`,color:2,x1:a.x-wt/4,y1:y,x2:a.x-wt/4,y2:y+900});
        el.push({type:'LINE',layer:`${floor}층_개구부`,color:2,x1:a.x+wt/4,y1:y,x2:a.x+wt/4,y2:y+900});
        stud(a.x-wt/2,y,a.x+wt/2,y,`${floor}층_개구부`);
        stud(a.x-wt/2,y+900,a.x+wt/2,y+900,`${floor}층_개구부`);
      }
    }

    if(ext){
      const br=sp*10;
      for(let y=yMin;y<yMax-br/2;y+=br)
        el.push({type:'LINE',layer:`${floor}층_가새`,color:6,x1:a.x-wt/2,y1:y,x2:a.x+wt/2,y2:y+br});
    }
  });

  // Corner studs at exterior intersections
  hAxes.filter(h=>h.isExterior).forEach(h=>{
    vAxes.filter(v=>v.isExterior).forEach(v=>{
      const s=wt/2;
      stud(v.x-s,h.y-s,v.x-s,h.y+s); stud(v.x+s,h.y-s,v.x+s,h.y+s);
      stud(v.x-s,h.y-s,v.x+s,h.y-s); stud(v.x-s,h.y+s,v.x+s,h.y+s);
    });
  });

  return el;
}

// ---- 2층 바닥 ----
function gen2층바닥(hAxes:HAxis[],vAxes:VAxis[],preset:Preset):DXFEntity[]{
  const{xMin,xMax,yMin,yMax}=extents(hAxes,vAxes);
  const sp=preset.stud, W=xMax-xMin, H=yMax-yMin;
  const el:any[]=[];
  ([[xMin,yMin,xMax,yMin],[xMax,yMin,xMax,yMax],[xMax,yMax,xMin,yMax],[xMin,yMax,xMin,yMin]] as number[][])
    .forEach(([x1,y1,x2,y2])=>el.push({type:'LINE',layer:'2층_바닥_주변보',color:5,x1,y1,x2,y2}));
  if(W>=H){for(let y=yMin+sp;y<yMax;y+=sp)el.push({type:'LINE',layer:'2층_바닥_장선',color:5,x1:xMin,y1:y,x2:xMax,y2:y});}
  else{for(let x=xMin+sp;x<xMax;x+=sp)el.push({type:'LINE',layer:'2층_바닥_장선',color:5,x1:x,y1:yMin,x2:x,y2:yMax});}
  hAxes.filter(a=>!a.isExterior).forEach(a=>{
    el.push({type:'LINE',layer:'2층_바닥_이중장선',color:4,x1:xMin,y1:a.y-30,x2:xMax,y2:a.y-30});
    el.push({type:'LINE',layer:'2층_바닥_이중장선',color:4,x1:xMin,y1:a.y+30,x2:xMax,y2:a.y+30});
  });
  for(let x=xMin+2730;x<xMax;x+=2730)el.push({type:'LINE',layer:'2층_바닥_가로막이',color:8,x1:x,y1:yMin,x2:x,y2:yMax});
  return el;
}

// ---- 천정 ----
function gen천정(hAxes:HAxis[],vAxes:VAxis[],preset:Preset):DXFEntity[]{
  const{xMin,xMax,yMin,yMax}=extents(hAxes,vAxes);
  const sp=preset.stud, W=xMax-xMin, H=yMax-yMin;
  const el:any[]=[];
  ([[xMin,yMin,xMax,yMin],[xMax,yMin,xMax,yMax],[xMax,yMax,xMin,yMax],[xMin,yMax,xMin,yMin]] as number[][])
    .forEach(([x1,y1,x2,y2])=>el.push({type:'LINE',layer:'천정_주변',color:6,x1,y1,x2,y2}));
  if(W<H){for(let y=yMin+sp;y<yMax;y+=sp)el.push({type:'LINE',layer:'천정_장선',color:6,x1:xMin,y1:y,x2:xMax,y2:y});}
  else{for(let x=xMin+sp;x<xMax;x+=sp)el.push({type:'LINE',layer:'천정_장선',color:6,x1:x,y1:yMin,x2:x,y2:yMax});}
  const hx=(xMin+xMax)/2,hy=(yMin+yMax)/2,hs=600;
  el.push({type:'LWPOLYLINE',layer:'천정_점검구',flags:1,color:2,vertices:[{x:hx-hs,y:hy-hs},{x:hx+hs,y:hy-hs},{x:hx+hs,y:hy+hs},{x:hx-hs,y:hy+hs}]});
  el.push({type:'LINE',layer:'천정_점검구',color:2,x1:hx-hs,y1:hy-hs,x2:hx+hs,y2:hy+hs});
  el.push({type:'LINE',layer:'천정_점검구',color:2,x1:hx+hs,y1:hy-hs,x2:hx-hs,y2:hy+hs});
  return el;
}

// ---- 1층 지붕 ----
function gen1층지붕(hAxes:HAxis[],vAxes:VAxis[],preset:Preset):DXFEntity[]{
  const{xMin,xMax,yMin,yMax}=extents(hAxes,vAxes);
  const ov=preset.wallType==='Wood'?600:500;
  const el:any[]=[];
  el.push({type:'LWPOLYLINE',layer:'1층_지붕_처마선',flags:1,color:9,
    vertices:[{x:xMin-ov,y:yMin-ov},{x:xMax+ov,y:yMin-ov},{x:xMax+ov,y:yMax+ov},{x:xMin-ov,y:yMax+ov}]});
  el.push({type:'LWPOLYLINE',layer:'1층_지붕_외벽',flags:1,color:9,
    vertices:[{x:xMin,y:yMin},{x:xMax,y:yMin},{x:xMax,y:yMax},{x:xMin,y:yMax}]});
  [[xMin-ov,yMin-ov,xMin,yMin],[xMax+ov,yMin-ov,xMax,yMin],[xMax+ov,yMax+ov,xMax,yMax],[xMin-ov,yMax+ov,xMin,yMax]]
    .forEach(([x1,y1,x2,y2])=>el.push({type:'LINE',layer:'1층_지붕_처마',color:9,x1,y1,x2,y2}));
  return el;
}

// ---- 지붕 ----
function gen지붕(hAxes:HAxis[],vAxes:VAxis[],preset:Preset,roofType:string):DXFEntity[]{
  const{xMin,xMax,yMin,yMax}=extents(hAxes,vAxes);
  const sp=preset.stud, ov=600;
  const el:any[]=[];
  const ridgeX=(xMin+xMax)/2;
  el.push({type:'LWPOLYLINE',layer:'지붕_처마선',flags:1,color:2,
    vertices:[{x:xMin-ov,y:yMin-ov},{x:xMax+ov,y:yMin-ov},{x:xMax+ov,y:yMax+ov},{x:xMin-ov,y:yMax+ov}]});

  if(roofType==='gabled'){
    el.push({type:'LINE',layer:'지붕_용마루',color:1,x1:ridgeX,y1:yMin-ov,x2:ridgeX,y2:yMax+ov});
    for(let y=yMin-ov+sp;y<yMax+ov;y+=sp){
      el.push({type:'LINE',layer:'지붕_서까래',color:2,x1:ridgeX,y1:y,x2:xMin-ov,y2:y});
      el.push({type:'LINE',layer:'지붕_서까래',color:2,x1:ridgeX,y1:y,x2:xMax+ov,y2:y});
    }
    for(let y=yMin+sp*3;y<yMax;y+=sp*3)
      el.push({type:'LINE',layer:'지붕_칼라타이',color:8,x1:ridgeX-600,y1:y,x2:ridgeX+600,y2:y});
  } else {
    const rL=(yMax-yMin)*0.6, rY0=(yMin+yMax)/2-rL/2, rY1=(yMin+yMax)/2+rL/2;
    el.push({type:'LINE',layer:'지붕_용마루',color:1,x1:ridgeX,y1:rY0,x2:ridgeX,y2:rY1});
    ([[xMin-ov,yMin-ov],[xMax+ov,yMin-ov],[xMax+ov,yMax+ov],[xMin-ov,yMax+ov]] as number[][])
      .forEach(([cx,cy],i)=>el.push({type:'LINE',layer:'지붕_귀서까래',color:1,x1:cx,y1:cy,x2:ridgeX,y2:i<2?rY0:rY1}));
    for(let y=rY0+sp;y<rY1;y+=sp){
      el.push({type:'LINE',layer:'지붕_서까래',color:2,x1:ridgeX,y1:y,x2:xMin-ov,y2:y});
      el.push({type:'LINE',layer:'지붕_서까래',color:2,x1:ridgeX,y1:y,x2:xMax+ov,y2:y});
    }
    [rY0,rY1].forEach((ry,s)=>{
      const base=s===0?yMin-ov:yMax+ov;
      for(let x=xMin-ov+sp*2;x<xMax+ov;x+=sp*2)
        el.push({type:'LINE',layer:'지붕_서까래',color:2,x1:ridgeX,y1:ry,x2:x,y2:base});
    });
  }
  return el;
}

// ---- 지붕벽 ----
function gen지붕벽(hAxes:HAxis[],vAxes:VAxis[],preset:Preset):DXFEntity[]{
  const{xMin,xMax,yMin,yMax}=extents(hAxes,vAxes);
  const sp=preset.stud, wt=preset.wallType==='Wood'?105:75;
  const el:any[]=[];
  [yMin,yMax].forEach(y=>{
    el.push({type:'LINE',layer:'지붕벽_상하판',color:3,x1:xMin,y1:y-wt/2,x2:xMax,y2:y-wt/2});
    el.push({type:'LINE',layer:'지붕벽_상하판',color:3,x1:xMin,y1:y+wt/2,x2:xMax,y2:y+wt/2});
    for(let x=xMin;x<=xMax;x+=sp)el.push({type:'LINE',layer:'지붕벽_스터드',color:3,x1:x,y1:y-wt/2,x2:x,y2:y+wt/2});
  });
  [xMin,xMax].forEach(x=>{
    el.push({type:'LINE',layer:'지붕벽_상하판',color:3,x1:x-wt/2,y1:yMin,x2:x-wt/2,y2:yMax});
    el.push({type:'LINE',layer:'지붕벽_상하판',color:3,x1:x+wt/2,y1:yMin,x2:x+wt/2,y2:yMax});
    for(let y=yMin;y<=yMax;y+=sp)el.push({type:'LINE',layer:'지붕벽_스터드',color:3,x1:x-wt/2,y1:y,x2:x+wt/2,y2:y});
  });
  return el;
}

// ============================================================
// MASTER AUTO-GENERATE
// ============================================================
export function autoGenerate(dxfData: DXFData, preset: Preset, settings: GenSettings): GeneratedLayers {
  let{hAxes,vAxes}=extractAxes(dxfData.entities);
  if(hAxes.length<2||vAxes.length<2){
    const bounds=getBounds(dxfData.entities);
    ({hAxes,vAxes}=syntheticAxes(bounds,settings.floors));
  }

  const{hOpenings,vOpenings}=detectOpenings(dxfData.entities,hAxes,vAxes);

  const layers: GeneratedLayers = {};
  layers['기초']=gen基礎(hAxes,vAxes,preset);
  layers['토대']=gen토대(hAxes,vAxes,preset);
  layers['1층_스터드']=gen스터드(hAxes,vAxes,preset,hOpenings,vOpenings,1);
  if(settings.floors>=2){
    layers['2층_바닥']=gen2층바닥(hAxes,vAxes,preset);
    layers['2층_스터드']=gen스터드(hAxes,vAxes,preset,hOpenings,vOpenings,2);
  }
  layers['1층_지붕']=gen1층지붕(hAxes,vAxes,preset);
  layers['천정']=gen천정(hAxes,vAxes,preset);
  layers['지붕벽']=gen지붕벽(hAxes,vAxes,preset);
  layers['지붕']=gen지붕(hAxes,vAxes,preset,settings.roofType);
  return layers;
}
