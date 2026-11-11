// Reproducible export of frozen B11 drawings. No scanner, provider or network.
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { resolveExecutable, run } from "../asset_executables.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const SOURCE=path.join(ROOT,"art/production/b11"),QA=path.join(ROOT,"art/qa/b11");
const matrix=JSON.parse(await readFile(path.join(ROOT,"art/animation-v2/source-matrix.json"),"utf8"));
const entries=matrix.entries.filter(e=>e.productionFor);
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const relative=file=>path.relative(ROOT,file).replaceAll("\\","/");
const editable=process.argv.includes("--editable");
const resume=process.argv.includes("--resume");
if(editable&&process.platform==="win32"){
  process.env.APPDATA=path.join(ROOT,".codex-local/b11-editor");await mkdir(process.env.APPDATA,{recursive:true});
}
const editor=editable?await resolveExecutable({label:"LibreSprite",environmentVariable:"LIBRESPRITE_PATH",projectRoot:ROOT,localCandidates:[".codex-local/tools/LibreSprite-v1.1/libresprite.exe"],pathCandidates:["libresprite","aseprite"]}):null;
const outputs=[],identities=[],anchors=[];
const selected=process.argv.find(a=>a.startsWith("--asset="))?.slice(8);
async function record(file){const bytes=await readFile(file);outputs.push({path:relative(file),bytes:bytes.length,sha256:hash(bytes)});}
async function fit(input,width,height,maxWidth,maxHeight){
  const crop=await sharp(input).ensureAlpha().trim({background:"#00000000"}).toBuffer();
  const resized=await sharp(crop).resize({width:maxWidth,height:maxHeight,fit:"inside",kernel:sharp.kernel.nearest}).png().toBuffer({resolveWithObject:true});
  return sharp({create:{width,height,channels:4,background:"#00000000"}}).composite([{input:resized.data,left:Math.floor((width-resized.info.width)/2),top:height-resized.info.height}]).png({palette:true,colours:256,dither:0}).toBuffer();
}
async function pixelSvg(input,size,title){
  const {data,info}=await sharp(input).resize(48,48,{kernel:sharp.kernel.nearest}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const colours=new Map();
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;){
    const start=x,offset=(y*info.width+x)*4,pixel=data.subarray(offset,offset+4);x++;
    while(x<info.width&&data.subarray((y*info.width+x)*4,(y*info.width+x)*4+4).equals(pixel))x++;
    if(pixel[3]){const colour=pixel.subarray(0,3).toString("hex"),runs=colours.get(colour)??[];runs.push(`M${start} ${y}h${x-start}v1h-${x-start}z`);colours.set(colour,runs);}
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48" shape-rendering="crispEdges"><title>${title}</title>${[...colours].map(([c,r])=>`<path fill="#${c}" d="${r.join("")}"/>`).join("")}</svg>\n`;
}
const variants={"cp9-elite":["cp9-elite-laser","cp9-elite-tidal"],"donquixote-officer":["donquixote-officer-vanguard","donquixote-officer-assault","donquixote-officer-artillery"],"beast-pirate":["beast-pirate-vanguard","beast-pirate-assault","beast-pirate-artillery"]};
await mkdir(QA,{recursive:true});
for(const entry of entries.filter(e=>!selected||e.productionFor===selected)){
  const id=entry.productionFor,dir=path.join(SOURCE,id),out=path.join(ROOT,"public/assets/animations",entry.outputAssetKey),qa=path.join(QA,id);
  const selection=JSON.parse(await readFile(path.join(dir,"selection.json"),"utf8"));
  await mkdir(out,{recursive:true});await mkdir(qa,{recursive:true});
  const gif=path.join(qa,"all-clips.gif");
  const filesExist=resume&&await Promise.all([path.join(out,`${entry.outputAssetKey}.png`),path.join(out,`${entry.outputAssetKey}.json`),gif,...(editable?[path.join(dir,"body.aseprite")]:[])].map(file=>access(file).then(()=>true,()=>false))).then(found=>found.every(Boolean));
  const prior=filesExist?JSON.parse(await readFile(path.join(out,`${entry.outputAssetKey}.json`),"utf8")):null;
  const pinnedMap=await readFile(path.join(ROOT,entry.source.frameMap));
  const mapFrames=JSON.parse(pinnedMap.toString()).frames;
  const completed=prior?.sourceSha256===entry.source.sha256&&hash(pinnedMap)===entry.source.frameMapSha256
    &&mapFrames.length===prior.frames.length&&mapFrames.every((frame,index)=>["state","sourceRect","sourcePivot"].every(key=>JSON.stringify(frame[key])===JSON.stringify(prior.frames[index][key]))&&(!frame.durationMs||frame.durationMs===prior.frames[index].durationMs));
  if(!completed){
    await run(process.execPath,[path.join(ROOT,"scripts/assets/build_v2_animation.mjs"),"--asset",entry.id,"--strict","--sheet",path.join(out,`${entry.outputAssetKey}.png`),"--metadata",path.join(out,`${entry.outputAssetKey}.json`),"--frames-dir",path.join(ROOT,"tmp/b11-export",id),"--gif",gif],{cwd:ROOT});
    if(editable)await run(editor,["-b",gif,"--save-as",path.join(dir,"body.aseprite")],{cwd:ROOT});
  }
  const metadata=JSON.parse(await readFile(path.join(out,`${entry.outputAssetKey}.json`),"utf8"));
  anchors.push([id,{idleVisualTopPx:metadata.frame.idleVisualTopPx,...(selection.formId?{formBaseId:selection.baseId}:{})}]);
  const master=await readFile(path.join(dir,"master.png"));
  if(selection.formId){
    const form=path.join(ROOT,"public/assets/forms",selection.formId);await mkdir(form,{recursive:true});
    for(const [name,size]of [["portrait",320],["token",160]]){
      const svg=await pixelSvg(master,size,id);await writeFile(path.join(dir,`${name}.svg`),svg);await writeFile(path.join(form,`${name}.svg`),svg);await record(path.join(form,`${name}.svg`));
    }
  }else{
    for(const contentId of [id,...(variants[id]??[])])for(const [name,size,maxW,maxH]of [["portraits",320,270,300],["tokens",160,128,146]]){
      const file=path.join(ROOT,"public/assets",name,`${contentId}.png`);await writeFile(file,await fit(master,size,size,maxW,maxH));await record(file);
    }
  }
  const board=await readFile(path.join(dir,"body-poses.png"));
  const layers=[];
  for(const [row,state]of ["idle","move","attack","cast","hit","defeat"].entries()){
    const title=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="24"><text x="8" y="17" fill="#f3e5be" font-family="monospace" font-size="14">${id} / ${state}</text></svg>`);
    layers.push({input:title,left:0,top:row*152});
    layers.push({input:await sharp(board).extract({left:0,top:row*128,width:1536,height:128}).png().toBuffer(),left:0,top:row*152+24});
  }
  await sharp({create:{width:1536,height:912,channels:4,background:"#1c2e3c"}}).composite(layers).png().toFile(path.join(qa,"clips.png"));
  const legacyId=selection.baseId;
  const before=await sharp(path.join(ROOT,"public/assets/animations",`${legacyId}-v2`,`${legacyId}-v2.png`)).extract({left:0,top:0,width:128,height:128}).png().toBuffer();
  await sharp({create:{width:256,height:128,channels:4,background:"#1c2e3c"}}).composite([{input:before,left:0,top:0},{input:master,left:128,top:0}]).png().toFile(path.join(qa,"before-after.png"));
  for(const file of [path.join(out,`${entry.outputAssetKey}.png`),path.join(out,`${entry.outputAssetKey}.json`),path.join(dir,"body-poses.png"),path.join(dir,"frame-map.json"),path.join(dir,"master.png"),path.join(dir,"fx-poses.png"),path.join(dir,"selection.json"),gif,path.join(qa,"clips.png"),path.join(qa,"before-after.png")])await record(file);
  const extra=selection.tool?["draft.png","prompt.txt","curated-draft-poses.png"]:[...(selection.sourceType==="project-authored-vector"?["native-poses.png"]:[])];
  for(const name of extra)await record(path.join(dir,name));
  if(editable)await record(path.join(dir,"body.aseprite"));
  identities.push({...selection,sourceSha256:entry.source.sha256,frameMapSha256:entry.source.frameMapSha256});
  console.log(`Exported ${id} (source preserved, atlas/static/QA${editable?"/editable":""})`);
}
if(!selected){
  const retained=[
    {id:"koala",master:"art/production/b10/koala/master.png"},
    {id:"kaido",master:"art/production/b10/kaido/master.png"},
    {id:"luffy",atlas:"luffy-v2"},
  ];
  for(const item of retained){
    const master=item.master?await readFile(path.join(ROOT,item.master)):await sharp(path.join(ROOT,"public/assets/animations",item.atlas,`${item.atlas}.png`)).extract({left:0,top:0,width:128,height:128}).png().toBuffer();
    for(const [name,size,maxW,maxH]of [["portraits",320,270,300],["tokens",160,128,146]]){
      const file=path.join(ROOT,"public/assets",name,`${item.id}.png`);await writeFile(file,await fit(master,size,size,maxW,maxH));await record(file);
    }
  }
  const overview=[];
  const masters=[...entries.map(e=>({id:e.productionFor,file:path.join(SOURCE,e.productionFor,"master.png")})),
    ...retained.filter(i=>i.master).map(i=>({id:i.id,file:path.join(ROOT,i.master)})),
    {id:"robin-demonio-fleur",file:path.join(ROOT,"art/production/b10/robin-demonio-fleur/master.png")},
    {id:"luffy",atlas:"luffy-v2"}];
  for(const [index,master]of masters.entries()){
    const x=index%8*160,y=Math.floor(index/8)*152;
    const png=master.file?await readFile(master.file):await sharp(path.join(ROOT,"public/assets/animations/luffy-v2/luffy-v2.png")).extract({left:0,top:0,width:128,height:128}).png().toBuffer();
    overview.push({input:png,left:x+16,top:y});
    overview.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="24"><text x="80" y="16" text-anchor="middle" fill="#f3e5be" font-family="monospace" font-size="10">${master.id}</text></svg>`),left:x,top:y+128});
  }
  await sharp({create:{width:1280,height:Math.ceil(masters.length/8)*152,channels:4,background:"#1c2e3c"}}).composite(overview).png().toFile(path.join(QA,"all-identities.png"));
  // Runtime anchor data is measured from the exported idle frames, not guessed.
  await writeFile(path.join(ROOT,"components/b11AnimationSources.ts"),`// Generated by scripts/assets/build_b11_assets.mjs from frozen B11 metadata.\nexport const B11_ANIMATION_SOURCES: Readonly<Record<string, { idleVisualTopPx: number; formBaseId?: string }>> = ${JSON.stringify(Object.fromEntries(anchors),null,2)};\n`);
  const references=[];
  for(const input of JSON.parse(await readFile(path.join(SOURCE,"references/inputs.json"),"utf8"))){
    const original=matrix.entries.find(e=>e.id===input.id);references.push({...input,sha256:hash(await readFile(path.join(ROOT,input.path))),originalSource:original?.source,permission:original?.permission});
  }
  await writeFile(path.join(SOURCE,"provenance.json"),JSON.stringify({schemaVersion:1,date:"2026-11-11",baseCommit:"45556741eb512454e7f420a42c835ad6e3847c5d",toolLimitations:"PixelLab tools unavailable. Built-in image_gen drafts are frozen; actual provider model/seed/settings were not exposed. Reproducibility means pinned local export, not identical AI regeneration. No provider, scanner or network at runtime/build/CI.",permissionBasis:"Existing archived licensed-reference owner attestations remain in ASSET_LICENSE.md/source-matrix. New supplemental poses are AI-assisted derivatives, never claimed as original game rips. The eleven vector-origin PvE designs keep their original P7/P12 palettes, faction marks and equipment; new bodies use the same frozen pixel-draft process as the other five cutouts. No new downstream asset licence is granted.",reviewStatus:"source-curated; owner-approved B11 verification results are recorded in PROJECT_STATE.md and the PR",retained:["luffy-v2 (explicit licensed map, pivot 40/116)","koala-b10-v2","kaido-b10-v2 (SpriteDatabase 21137, Megadoomer)","robin-demonio-fleur-b10-v2"],references,identities},null,2)+"\n");
  await writeFile(path.join(SOURCE,"outputs.json"),JSON.stringify({schemaVersion:1,outputs},null,2)+"\n");
  const marker="<!-- B11 authored character completion -->";
  const provenance=await readFile(path.join(ROOT,"ASSET_PROVENANCE.md"),"utf8");
  const rows=entries.map(entry=>`| \`${entry.outputAssetKey}\` | \`${entry.source.localPath}\` | \`${entry.source.sha256}\` | \`${outputs.find(output=>output.path===`public/assets/animations/${entry.outputAssetKey}/${entry.outputAssetKey}.png`).sha256}\` | \`art/production/b11/${entry.productionFor}/body.aseprite\` |`);
  await writeFile(path.join(ROOT,"ASSET_PROVENANCE.md"),provenance.split(marker)[0].trimEnd()+`\n\n${marker}\n## B11 character, form and PvE completion — 2026-11-11\n\n58 preferred local packages supplement the 4 retained B10/Luffy masters (62 visual identities, 67 content bindings). The earlier source sheets, v1/v2 atlases and historic evidence remain unchanged. Thirty-three complete original sheets are explicitly curated; Garp/Capone Bege/Arlong keep their good original clips and supplement only missing clips. Killer/Caesar/Pica, three forms and all sixteen project-owned PvE cutouts use frozen AI-assisted drawings with articulated head/torso/arm/leg/weapon poses. The eleven vector-origin designs retain their original palette, faction marks and equipment; flat vector motion drafts were discarded at source curation. Original contributors/pages/permission records and reference/draft/map/output hashes: \`art/production/b11/provenance.json\`, \`selection.json\`, \`outputs.json\` and the source matrix. New poses are derivatives, not original game rips. PixelLab was unavailable; provider model/seed were not exposed. Build/CI/runtime use no provider or scanner; pinned local export is reproducible. Body and FX remain separate. No downstream asset licence is granted.\n\n| Runtime package | Frozen source | Source SHA-256 | Atlas SHA-256 | Editable body |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}\n\nSource limitations, retained good drawings and verification status: \`docs/B11_CHARACTER_ANIMATION_COMPLETION.md\`. Existing Luffy pivot 40/116, other bodies 64/116; all six clip timings and gameplay remain unchanged.\n`);
}
