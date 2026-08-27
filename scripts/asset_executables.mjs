import { access } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function pathNames(names) {
  if (process.platform !== "win32") return names;
  const extensions = (process.env.PATHEXT ?? ".EXE;.CMD;.BAT")
    .split(";")
    .filter(Boolean);
  return names.flatMap((name) =>
    path.extname(name) ? [name] : extensions.map((extension) => `${name}${extension}`),
  );
}

export async function resolveExecutable({
  label,
  environmentVariable,
  projectRoot,
  localCandidates,
  pathCandidates,
}) {
  const configured = process.env[environmentVariable];
  const absoluteCandidates = [
    ...(configured ? [path.resolve(configured)] : []),
    ...localCandidates.map((candidate) => path.resolve(projectRoot, candidate)),
  ];
  for (const candidate of absoluteCandidates) {
    if (await exists(candidate)) return candidate;
  }

  const searchDirectories = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean);
  for (const directory of searchDirectories) {
    for (const name of pathNames(pathCandidates)) {
      const candidate = path.join(directory, name);
      if (await exists(candidate)) return candidate;
    }
  }
  throw new Error(
    `${label} was not found. Set ${environmentVariable}, install it on PATH, or place it in the documented project-local tool directory.`,
  );
}

export function run(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${path.basename(executable)} exited with ${signal ? `signal ${signal}` : `code ${code ?? "unknown"}`}.`,
        ),
      );
    });
  });
}
