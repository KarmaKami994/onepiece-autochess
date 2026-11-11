import { readFile } from "node:fs/promises";
import path from "node:path";

/** Existing matrix is the sole source of preferred authored body packages. */
export async function preferredV2AssetKeys(root) {
  const matrix=JSON.parse(await readFile(path.join(root,"art/animation-v2/source-matrix.json"),"utf8"));
  const preferred=new Map();
  for(const entry of matrix.entries)if(entry.pilotFor)preferred.set(entry.pilotFor,entry.outputAssetKey);
  for(const entry of matrix.entries)if(entry.productionFor)preferred.set(entry.productionFor,entry.outputAssetKey);
  return id=>preferred.get(id)??`${id}-v2`;
}
