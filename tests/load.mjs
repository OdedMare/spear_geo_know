// Loads a self-contained TypeScript module from src/lib, as PakashAgent's tests do.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const testDir = path.dirname(fileURLToPath(import.meta.url));

export async function load(relative) {
  const source = fs.readFileSync(path.join(testDir, "../src/lib", relative), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript,${encodeURIComponent(outputText)}`);
}

export const world = JSON.parse(fs.readFileSync(path.join(testDir, "../public/data/world.json"), "utf8")).countries;
export const byId = new Map(world.map((c) => [c.id, c]));
