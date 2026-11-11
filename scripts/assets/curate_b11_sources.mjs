// ONE intentional authoring pass. Normal build only reads its frozen pose boards/maps.
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const SOURCE=path.join(ROOT,"art/production/b11");
const matrixPath=path.join(ROOT,"art/animation-v2/source-matrix.json");
const matrix=JSON.parse(await readFile(matrixPath,"utf8"));
const curated=JSON.parse(await readFile(path.join(SOURCE,"licensed-selection.json"),"utf8"));
const curation=JSON.parse(await readFile(path.join(SOURCE,"curation.json"),"utf8"));
const states=Object.keys(curation.clips), counts={idle:6,move:8,attack:8,cast:12,hit:4,defeat:8};
const hash=(bytes)=>createHash("sha256").update(bytes).digest("hex");
const relative=(file)=>path.relative(ROOT,file).replaceAll("\\","/");
const chosen=process.argv.find(a=>a.startsWith("--asset="))?.slice(8);
const originalEntries=matrix.entries.filter(e=>!e.productionFor);
const draftById=new Map(curation.drafts.map(d=>[d.id,d]));
const ids=[...new Set([...Object.keys(curated.selections),...draftById.keys()])];

function bounds(data,w,h) {
  let left=w,top=h,right=-1,bottom=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)throw new Error("Empty drawing");
  return {left,top,width:right-left+1,height:bottom-top+1};
}
function keepBody(pixels,size,componentCount=1) {
  const visited=new Uint8Array(size*size),components=[];
  for(let start=0;start<visited.length;start++){
    if(visited[start]||!pixels[start*4+3])continue;
    const component=[start];visited[start]=1;
    for(let i=0;i<component.length;i++){
      const x=component[i]%size,y=Math.floor(component[i]/size);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy,next=ny*size+nx;
        if(nx<0||ny<0||nx>=size||ny>=size||visited[next]||!pixels[next*4+3])continue;
        visited[next]=1;component.push(next);
      }
    }
    components.push(component);
  }
  components.sort((a,b)=>b.length-a.length);
  const selected=new Uint8Array(size*size);for(const body of components.slice(0,componentCount))for(const i of body)selected[i]=1;
  for(let i=0;i<selected.length;i++)if(!selected[i])pixels.fill(0,i*4,i*4+4);
}
async function frame(pixels,w,h,scale,anchorX) {
  const b=bounds(pixels,w,h),width=Math.max(1,Math.round(b.width*scale)),height=Math.max(1,Math.round(b.height*scale));
  const png=await sharp(pixels,{raw:{width:w,height:h,channels:4}}).extract(b).resize(width,height,{kernel:sharp.kernel.nearest}).png().toBuffer();
  const left=64-Math.round((anchorX-b.left)*scale),top=116-height;
  if(left<0||top<0||left+width>128||top+height>128)throw new Error(`Drawing exceeds cell (${width}x${height} at ${left},${top})`);
  return sharp({create:{width:128,height:128,channels:4,background:"#00000000"}}).composite([{input:png,left,top}]).png().toBuffer();
}
async function draftFrames(spec,heightOverride) {
  const size=curation.draftGrid.cellSize;
  const input=await sharp(path.join(SOURCE,spec.id,"draft.png")).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(input.info.width!==size*6||input.info.height!==size*6)throw new Error(`${spec.id}: unexpected draft grid`);
  const poses=[];
  for(let i=0;i<36;i++){
    const pixels=Buffer.alloc(size*size*4),ox=i%6*size,oy=Math.floor(i/6)*size;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const from=((oy+y)*input.info.width+ox+x)*4,to=(y*size+x)*4;
      if(input.data[from+3]>=curation.alphaCutoff){input.data.copy(pixels,to,from,from+3);pixels[to+3]=255;}
    }
    keepBody(pixels,size,spec.keepComponents??1);poses.push(pixels);
  }
  let scale=(heightOverride??spec.masterHeight)/bounds(poses[spec.masterPose],size,size).height;
  // A single scale per identity, including long weapons/arms. Never clip/re-scale one frame.
  for(const pixels of poses){const b=bounds(pixels,size,size);scale=Math.min(scale,112/b.height,62/Math.max(1,spec.sourceAnchorX-b.left),62/Math.max(1,b.left+b.width-spec.sourceAnchorX));}
  const pngs=await Promise.all(poses.map(async(pixels,index)=>{
    const png=await frame(pixels,size,size,scale,spec.sourceAnchorX);
    return spec.mirrorPoses?.includes(index)?sharp(png).flop().png().toBuffer():png;
  }));
  const board=await sharp({create:{width:768,height:768,channels:4,background:"#00000000"}}).composite(pngs.map((input,i)=>({input,left:i%6*128,top:Math.floor(i/6)*128}))).png({palette:true,colours:curation.paletteColours,dither:0}).toBuffer();
  await writeFile(path.join(SOURCE,spec.id,"curated-draft-poses.png"),board);
  const frozen=[];for(let i=0;i<36;i++)frozen.push(await sharp(board).extract({left:i%6*128,top:Math.floor(i/6)*128,width:128,height:128}).png().toBuffer());
  return {frames:Object.fromEntries(states.map(state=>[state,curation.clips[state].map(i=>({png:frozen[i],source:{draftPose:i}}))])),scale};
}
async function licensedFrames(id,selection) {
  const inspection=JSON.parse(await readFile(path.join(ROOT,"tmp/b11-source-inspection",id,"candidates.json"),"utf8"));
  const source=await sharp(path.join(ROOT,inspection.source.localPath)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const candidates=new Map(inspection.candidates.map(c=>[c.index,c]));
  const raw=new Map();
  for(const index of new Set(Object.values(selection).flat())){
    const candidate=candidates.get(index);if(!candidate)throw new Error(`${id}: unknown explicit candidate ${index}`);
    const r=candidate.sourceRect,pixels=Buffer.alloc(r.width*r.height*4);
    for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){
      const from=((r.y+y)*source.info.width+r.x+x)*4,to=(y*r.width+x)*4;
      if(source.data[from]===inspection.backgroundRgb[0]&&source.data[from+1]===inspection.backgroundRgb[1]&&source.data[from+2]===inspection.backgroundRgb[2])continue;
      source.data.copy(pixels,to,from,from+4);
    }
    const b=bounds(pixels,r.width,r.height),feet=[];
    for(let y=b.top+b.height-3;y<b.top+b.height;y++)for(let x=b.left;x<b.left+b.width;x++)if(pixels[(y*r.width+x)*4+3])feet.push(x);
    feet.sort((a,b)=>a-b);
    const anchor=selection.defeat?.includes(index)?b.left+b.width/2:feet[Math.floor(feet.length/2)];
    raw.set(index,{pixels,r,b,anchor});
  }
  const base=raw.get(selection.idle[0]);
  const large=new Set(["franky","brook","ivankov","jinbe","kuma","blackbeard","whitebeard","magellan","hody-jones"]);
  const target=Math.min(base.b.height,large.has(id)?100:88);
  let scale=target/base.b.height;
  for(const {b,anchor} of raw.values())scale=Math.min(scale,112/b.height,62/Math.max(1,anchor-b.left),62/Math.max(1,b.left+b.width-anchor));
  const pngs=new Map();for(const [i,{pixels,r,anchor}]of raw)pngs.set(i,await frame(pixels,r.width,r.height,scale,anchor));
  const frames=Object.fromEntries(Object.entries(selection).map(([state,indices])=>[state,indices.map(index=>({png:pngs.get(index),source:{candidate:index,sourceRect:candidates.get(index).sourceRect}}))]));
  return {frames,scale,masterHeight:Math.round(base.b.height*scale),source:inspection.source};
}
const production=[];
for(const id of ids.filter(id=>!chosen||id===chosen)){
  const directory=path.join(SOURCE,id);await mkdir(directory,{recursive:true});
  const existing=await access(path.join(directory,"body-poses.png")).then(()=>true,()=>false);
  if(existing&&!process.argv.includes("--replace-authoring-source"))throw new Error(`${id}: frozen source exists; explicit --replace-authoring-source needed`);
  const licensed=curated.selections[id]?await licensedFrames(id,curated.selections[id]):null;
  const draft=draftById.get(id);
  const result=draft?await draftFrames(draft,licensed?.masterHeight):licensed;
  if(!result)throw new Error(`No source: ${id}`);
  const frames={...licensed?.frames};
  for(const state of states)if(!licensed||draft?.supplementalStates?.includes(state))frames[state]=result.frames[state];
  const layers=[],mapping=[],selections={};
  for(const [row,state]of states.entries()){
    const poses=frames[state];if(!poses?.length)throw new Error(`${id}: missing semantic ${state}`);
    selections[state]=poses.map(p=>p.source);
    for(let i=0;i<counts[state];i++){
      const pose=poses[Math.min(poses.length-1,Math.floor(i*poses.length/counts[state]))],x=i*128,y=row*128;
      layers.push({input:pose.png,left:x,top:y});
      mapping.push({state,poseId:`${state}-${JSON.stringify(pose.source)}`,sourceRect:{x,y,width:128,height:128},sourcePivot:{x:x+64,y:y+116}});
    }
  }
  const board=await sharp({create:{width:1536,height:768,channels:4,background:"#00000000"}}).composite(layers).png({palette:true,colours:256,dither:0}).toBuffer();
  await writeFile(path.join(directory,"body-poses.png"),board);
  await sharp(board).extract({left:0,top:0,width:128,height:128}).png().toFile(path.join(directory,"master.png"));
  await sharp({create:{width:1536,height:768,channels:4,background:"#00000000"}}).png().toFile(path.join(directory,"fx-poses.png"));
  const map=Buffer.from(JSON.stringify({schemaVersion:1,frames:mapping},null,2)+"\n");
  await writeFile(path.join(directory,"frame-map.json"),map);
  const original=originalEntries.find(e=>e.id===(draft?.baseId??id));
  const luffy= draft?.baseId === "luffy"
    ? JSON.parse(await readFile(path.join(ROOT,"scripts/licensed/luffy-v2-map.json"),"utf8")) : null;
  const record={id,kind:original?.kind??"pve",baseId:draft?.baseId??id,formId:draft?.baseId&&draft.baseId!==id?id:undefined,
    sourceType:licensed&&draft?"licensed-original-with-missing-clip-supplement":licensed?"licensed-original-curation":"AI-assisted-body-poses",
    scale:licensed?.scale??result.scale,bodyClass:draft?.bodyClass??(licensed.masterHeight<57?"small":licensed.masterHeight>88?"large":"normal"),
    originalSource:licensed?.source??original?.source??(luffy?{localPath:luffy.source,sha256:luffy.sourceSha256,creditRecord:"ASSET_PROVENANCE.md; earlier owner-attested Luffy source"}:null),
    permission:original?.permission??(luffy?{status:"confirmed",note:"Project-owner attestation covers the archived earlier Luffy source and derivatives (ASSET_LICENSE.md). New form poses are frozen AI-assisted derivatives of that existing identity, not original game rips."}:{status:"project-owned",note:"Existing project-authored PvE design; new local articulated pose drawings. No external sheet used."}),
    reference:draft?.reference,accessoryComponents:draft?.keepComponents??1,tool:draft?"built-in image_gen; exact model/seed/settings not exposed":null,
    preservedStates:licensed?states.filter(state=>!draft?.supplementalStates?.includes(state)):[],supplementalStates:draft?.supplementalStates??null,selections};
  await writeFile(path.join(directory,"selection.json"),JSON.stringify(record,null,2)+"\n");
  const sourceEntry={id:`${id}-b11`,productionFor:id,kind:record.kind,outputAssetKey:`${id}-b11-v2`,fallbackAssetKey:`${record.baseId}-v2`,editableSource:"authored-pose-board",
    source:{strategy:"authored-frame-map",localPath:relative(path.join(directory,"body-poses.png")),sha256:hash(board),dimensions:{width:1536,height:768},gameUrl:record.originalSource?.gameUrl??null,sheetUrl:record.originalSource?.sheetUrl??null,contributor:licensed&&!draft?record.originalSource.contributor:"Project-authored B11 curation; original source credits and supplementation in art/production/b11/provenance.json",frameMap:relative(path.join(directory,"frame-map.json")),frameMapSha256:hash(map)},
    pivot:{x:64,y:116},processing:["frozen semantic pose board; no runtime/build heuristic selection","faithful original drawings retained; only explicitly missing clips supplemented","one fixed scale per source identity, hard alpha, body/FX separate","46-slot legacy v2 timing contract unchanged"],permission:record.permission};
  production.push(sourceEntry);
  console.log(`Frozen B11 ${id}: ${record.sourceType}`);
}
const oldProduction=matrix.entries.filter(e=>e.productionFor&&!production.some(p=>p.productionFor===e.productionFor));
matrix.entries=[...originalEntries,...oldProduction,...production].sort((a,b)=>originalEntries.includes(a)&&originalEntries.includes(b)?originalEntries.indexOf(a)-originalEntries.indexOf(b):originalEntries.includes(a)?-1:originalEntries.includes(b)?1:a.id.localeCompare(b.id));
await writeFile(matrixPath,JSON.stringify(matrix,null,2)+"\n");
