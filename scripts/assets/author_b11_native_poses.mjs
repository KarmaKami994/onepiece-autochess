// REJECTED AT B11 SOURCE CURATION: retained authoring evidence, not production input.
// Explicit local drawing step for the eleven EXISTING vector-authored PvE identities.
// Joint coordinates are drawings, not a runtime rig or whole-cutout transforms.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT = path.join(ROOT, "art/production/b11");
const INK = "#202332";
const specs = {
  "vice-admiral": { skin: "#b88970", coat: "#e8edf2", accent: "#66a9d8", trousers: "#173557", mark: "epaulettes", weapon: "blade", source: "scripts/assets/build_ui_icons.mjs#pveSvg" },
  "cipher-pol-agent": { skin: "#c9b69d", coat: "#222737", accent: "#d9d8d2", trousers: "#111522", mark: "mask", weapon: "fist", source: "scripts/assets/build_ui_icons.mjs#pveSvg" },
  seraphim: { skin: "#d9dde2", coat: "#31384b", accent: "#b884e2", trousers: "#31384b", mark: "wings", weapon: "blade", source: "scripts/assets/build_ui_icons.mjs#pveSvg" },
  "fish-man-raider": { skin: "#5d9bab", coat: "#244c69", accent: "#eeb367", mark: "gills", weapon: "spear" },
  "skypiea-priest": { skin: "#c89872", coat: "#eee6cf", accent: "#f2c859", mark: "halo", weapon: "staff" },
  "cp9-elite": { skin: "#c9b69d", coat: "#202a38", accent: "#f2f0e7", mark: "mask", weapon: "blade" },
  "impel-down-guard": { skin: "#ac8e7b", coat: "#3b2c45", accent: "#bb718e", mark: "horns", weapon: "trident" },
  "new-fish-man-officer": { skin: "#527c98", coat: "#253c5a", accent: "#c96081", mark: "gills", weapon: "trident" },
  "punk-hazard-guard": { skin: "#b4c1c2", coat: "#7a4278", accent: "#b8ef91", mark: "visor", weapon: "canister" },
  "donquixote-officer": { skin: "#d0a686", coat: "#ad5279", accent: "#f5c3d3", mark: "feathers", weapon: "blade" },
  "beast-pirate": { skin: "#ba967c", coat: "#485671", accent: "#e6bb73", mark: "horns", weapon: "club" },
};
// head, shoulder centre, hip centre, far elbow/hand, near elbow/hand,
// far knee/foot, near knee/foot. Every row articulates actual body parts.
const p = (head, shoulder, hip, fe, fh, ne, nh, fk, ff, nk, nf) => ({ head, shoulder, hip, fe, fh, ne, nh, fk, ff, nk, nf });
const poses = {
  idle: [
    p([33,23],[32,33],[32,46],[24,39],[26,44],[42,38],[43,44],[28,52],[26,58],[39,52],[42,58]),
    p([33,23],[32,33],[32,46],[24,38],[26,43],[42,37],[44,43],[28,52],[26,58],[39,52],[42,58]),
    p([33,22],[32,32],[32,46],[23,38],[25,43],[43,37],[44,42],[28,52],[26,58],[39,52],[42,58]),
    p([34,22],[33,32],[32,46],[24,38],[26,42],[43,36],[45,42],[28,52],[26,58],[39,52],[42,58]),
    p([34,23],[33,33],[32,46],[25,39],[27,43],[42,38],[44,44],[29,52],[26,58],[39,52],[42,58]),
    p([33,23],[32,33],[32,46],[25,39],[27,44],[41,38],[43,44],[28,52],[26,58],[39,52],[42,58]),
  ],
  move: [
    p([34,23],[33,33],[32,45],[23,37],[18,33],[43,39],[45,45],[24,49],[20,58],[41,50],[45,56]),
    p([35,22],[34,32],[33,44],[25,38],[20,37],[44,37],[47,42],[26,50],[29,57],[42,49],[44,55]),
    p([34,23],[33,33],[32,45],[27,40],[25,45],[43,36],[47,34],[31,51],[36,58],[38,50],[35,55]),
    p([34,23],[33,33],[32,45],[27,41],[29,46],[43,34],[47,31],[40,50],[45,58],[25,50],[20,56]),
    p([35,22],[34,32],[33,44],[26,39],[28,44],[43,35],[47,34],[42,49],[43,56],[26,50],[29,57]),
    p([34,23],[33,33],[32,45],[25,38],[23,41],[42,38],[44,43],[38,50],[35,55],[31,51],[36,58]),
  ],
  attack: [
    p([33,23],[32,33],[32,46],[24,39],[27,43],[41,38],[43,42],[28,52],[26,58],[39,52],[42,58]),
    p([31,24],[30,34],[31,47],[22,39],[25,44],[37,34],[33,29],[26,53],[23,58],[40,52],[44,58]),
    p([30,23],[29,33],[31,46],[21,36],[24,31],[35,33],[27,28],[25,53],[22,58],[40,52],[44,58]),
    p([36,24],[35,34],[32,46],[26,39],[28,43],[44,34],[54,34],[25,52],[22,58],[42,53],[48,58]),
    p([38,26],[37,36],[33,47],[28,40],[30,44],[46,36],[54,40],[26,53],[23,58],[44,53],[49,58]),
    p([34,24],[33,34],[32,46],[25,40],[28,44],[43,38],[47,43],[28,52],[26,58],[40,52],[43,58]),
  ],
  cast: [
    p([33,23],[32,33],[32,46],[24,39],[27,43],[42,38],[43,43],[28,52],[26,58],[39,52],[42,58]),
    p([33,24],[32,34],[32,47],[23,36],[21,29],[42,35],[44,29],[26,53],[23,58],[41,53],[45,58]),
    p([33,23],[32,33],[32,47],[22,30],[22,22],[43,30],[47,22],[26,53],[23,58],[41,53],[45,58]),
    p([34,22],[33,32],[32,46],[21,28],[25,17],[44,27],[45,16],[26,53],[23,58],[41,53],[45,58]),
    p([36,24],[35,34],[32,46],[27,33],[32,28],[44,33],[53,27],[26,53],[23,58],[41,53],[45,58]),
    p([34,23],[33,33],[32,46],[25,37],[29,39],[43,36],[48,36],[28,52],[26,58],[39,52],[42,58]),
  ],
  hit: [
    p([33,23],[32,33],[32,46],[24,38],[26,34],[42,37],[39,31],[28,52],[26,58],[39,52],[42,58]),
    p([29,24],[29,34],[32,47],[21,39],[24,33],[38,38],[35,31],[27,53],[25,58],[40,53],[44,58]),
    p([28,27],[29,37],[32,48],[22,43],[27,44],[38,42],[35,46],[26,54],[23,58],[40,54],[44,58]),
    p([31,29],[31,38],[32,48],[24,44],[27,49],[40,44],[38,49],[27,54],[24,58],[40,54],[44,58]),
    p([32,26],[31,35],[32,47],[24,41],[28,44],[41,41],[38,45],[28,53],[25,58],[39,53],[43,58]),
    p([33,24],[32,34],[32,46],[25,40],[28,43],[42,39],[42,43],[28,52],[26,58],[39,52],[42,58]),
  ],
  defeat: [
    p([31,26],[30,36],[32,47],[23,41],[27,46],[39,41],[38,47],[26,54],[23,58],[40,53],[45,58]),
    p([31,32],[31,41],[32,50],[24,46],[27,51],[40,46],[41,52],[26,56],[22,58],[40,55],[45,58]),
    p([34,37],[32,45],[29,51],[25,50],[24,57],[40,49],[44,55],[25,57],[21,58],[37,56],[43,58]),
    p([39,43],[34,49],[28,53],[29,54],[25,58],[43,52],[48,58],[23,56],[18,58],[34,57],[40,58]),
    p([44,49],[36,53],[28,54],[31,56],[27,58],[44,56],[49,58],[23,57],[18,58],[34,57],[39,58]),
    p([46,51],[37,53],[28,54],[31,56],[28,58],[43,56],[49,58],[22,56],[17,57],[34,57],[39,58]),
  ],
};
const point = (xy) => xy.join(",");
const poly = (points, fill, stroke = INK, width = 1) => `<polygon points="${points.map(point).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="miter"/>`;
const rect = (x,y,w,h,fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
function limb(points, fill, thickness = 5) {
  const pathData = `M${points.map(point).join(" L")}`;
  return `<path d="${pathData}" fill="none" stroke="${INK}" stroke-width="${thickness+2}" stroke-linejoin="miter"/><path d="${pathData}" fill="none" stroke="${fill}" stroke-width="${thickness}" stroke-linejoin="miter"/>`;
}
function weapon(s, hand, state, index) {
  if (s.weapon === "fist") return rect(hand[0]-2,hand[1]-2,4,4,s.skin);
  // Weapon follows the hand; separate angles for preparation, strike and fall.
  const angles = state === "attack" ? [-70,-115,-145,-10,30,-60] : state === "defeat" ? [-60,-45,-30,-10,0,0] : state === "cast" ? [-65,-90,-110,-90,-30,-45] : [-70,-65,-70,-65,-70,-65];
  const a = angles[index] * Math.PI / 180, len = s.weapon === "canister" ? 8 : 16;
  const end = [hand[0]+Math.round(Math.cos(a)*len),hand[1]+Math.round(Math.sin(a)*len)];
  const middle = [Math.round((hand[0]+end[0])/2),Math.round((hand[1]+end[1])/2)];
  let shape = limb([hand,end], s.weapon === "club" ? "#6b4c42" : "#a58a62", s.weapon === "club" ? 4 : 2);
  if (s.weapon === "blade") shape += limb([middle,end],"#d1dee4",3);
  if (["spear","trident"].includes(s.weapon)) shape += poly([[end[0]-2,end[1]+3],[end[0],end[1]-4],[end[0]+2,end[1]+3]],"#d1dee4");
  if (s.weapon === "trident") shape += limb([[end[0]-4,end[1]-2],[end[0]-4,end[1]+4],[end[0]+4,end[1]+4],[end[0]+4,end[1]-2]],"#b8c2c7",1);
  if (s.weapon === "staff") shape += rect(end[0]-3,end[1]-3,6,6,s.accent);
  if (s.weapon === "club") shape += limb([middle,end],"#858d99",6);
  if (s.weapon === "canister") shape += rect(end[0]-3,end[1]-4,6,9,s.accent)+rect(end[0]-3,end[1]-4,6,2,INK);
  return shape;
}
function drawing(s, q, state, index) {
  const [sx,sy]=q.shoulder,[hx,hy]=q.hip,[x,y]=q.head;
  const fall=state === "defeat" && index>=3;
  const shoulderFar=[sx-5,sy],shoulderNear=[sx+5,sy+1],hipFar=[hx-3,hy],hipNear=[hx+3,hy];
  let art="";
  if (s.mark === "wings" || s.mark === "halo") {
    const c=s.mark === "wings"?"#171b29":"#eee6cf";
    art+=poly([[sx-4,sy-2],[sx-19,sy-9+(index%3)],[sx-16,sy+4],[sx-8,sy+13]],c);
    art+=poly([[sx+4,sy],[sx+18,sy-7-(index%3)],[sx+15,sy+8],[sx+8,sy+12]],c);
  }
  art+=limb([hipFar,q.fk,q.ff],s.trousers??"#283040",5)+limb([shoulderFar,q.fe,q.fh],s.coat,5);
  art+=rect(q.ff[0]-3,q.ff[1]-2,7,3,INK);
  // Coat panels, torso and lit lapel remain independently editable vector parts.
  art+=poly([shoulderFar,shoulderNear,[hx+8,hy+5],[hx+2,hy+5],[hx,hy-2],[hx-2,hy+5],[hx-9,hy+5]],s.coat);
  art+=poly([[sx-1,sy],[sx+3,sy],[hx+4,hy],[hx-2,hy]],s.accent);
  art+=poly([[sx-5,sy],[sx-1,sy+2],[hx-4,hy-1],[hx-6,hy]],s.accent, s.accent,0);
  art+=limb([hipNear,q.nk,q.nf],s.trousers??"#283040",5)+rect(q.nf[0]-3,q.nf[1]-2,8,3,INK);
  art+=limb([shoulderNear,q.ne,q.nh],s.coat,5)+rect(q.nh[0]-2,q.nh[1]-2,4,4,s.skin);
  art+=weapon(s,q.nh,state,index);
  if (s.mark === "epaulettes") art+=rect(sx-7,sy-1,6,3,"#e4bb68")+rect(sx+3,sy,6,3,"#e4bb68");
  if (s.mark === "feathers") art+=poly([[sx-5,sy],[sx-13,sy-6],[sx-10,sy+1],[sx-14,sy+2],[sx-7,sy+5]],s.accent)+poly([[sx+4,sy],[sx+12,sy-4],[sx+10,sy+4]],s.accent);
  art+=limb([[sx,sy],[x,y+4]],s.skin,4);
  art+=poly([[x-6,y-5],[x-3,y-8],[x+4,y-8],[x+7,y-4],[x+7,y+3],[x+3,y+7],[x-4,y+6],[x-6,y+2]],s.skin);
  art+=rect(x-5,y-6,9,3,s.coat)+rect(x-4,y-7,7,1,s.accent)+rect(x-5,y-3,2,5,s.accent);
  art+=rect(x+1,y-1,2,1,INK)+rect(x+5,y-1,2,1,INK)+rect(x+3,y+4,3,1,INK);
  if (s.mark === "mask" || s.mark === "visor") art+=rect(x-4,y-2,11,5,s.mark === "mask"?"#f2f0e7":"#314d5a")+rect(x-2,y,3,1,INK)+rect(x+4,y,3,1,s.mark === "visor"?s.accent:INK);
  if (s.mark === "gills") art+=rect(x-7,y,2,1,INK)+rect(x-7,y+2,2,1,INK)+rect(x-7,y+4,2,1,INK);
  if (s.mark === "horns") art+=poly([[x-5,y-5],[x-9,y-11],[x-8,y-3]],s.accent)+poly([[x+5,y-5],[x+9,y-11],[x+8,y-3]],s.accent);
  if (s.mark === "halo" && !fall) art+=`<path d="M${x-9},${y-11}h18v3h-18z" stroke="${s.accent}" fill="none"/>`;
  if (s.mark === "wings") art+=rect(x-4,y-7,9,3,"#e8e4d9")+rect(sx,sy+8,4,4,s.accent);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64" shape-rendering="crispEdges"><title>B11 ${state} ${index}</title>${art}</svg>\n`;
}

const inventory=[];
for (const [id,s] of Object.entries(specs)) {
  const dir=path.join(OUTPUT,id,"vectors"); await mkdir(dir,{recursive:true});
  const cells=[];
  for (const [row,[state,frames]] of Object.entries(poses).entries()) for (const [index,q] of frames.entries()) {
    const svg=drawing(s,q,state,index);
    await writeFile(path.join(dir,`${state}-${index}.svg`),svg);
    cells.push({input:await sharp(Buffer.from(svg)).png().toBuffer(),left:index*128,top:row*128});
  }
  await sharp({create:{width:768,height:768,channels:4,background:"#00000000"}}).composite(cells).png({palette:true,colours:32,dither:0}).toFile(path.join(OUTPUT,id,"native-poses.png"));
  inventory.push({id,source:s.source??"scripts/assets/build_p12_pve_assets.mjs#factionSvg",kind:"project-authored-vector",bodyClass:s.mark === "horns" || s.mark === "halo"?"large":"normal"});
  console.log(`Authored six articulated clips: ${id}`);
}
await writeFile(path.join(OUTPUT,"native-sources.json"),JSON.stringify({schemaVersion:1,notes:"Existing P7/P12 vector identities, palettes, faction marks and equipment preserved. Explicit head/torso/arm/leg/weapon joint drawings; no whole-cutout bob/scale/rotation. Body only, runtime FX separate.",poses,identities:inventory},null,2)+"\n");
