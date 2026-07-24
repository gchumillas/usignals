// Strips trailing function parameters whose name starts with "_" from the
// generated .d.ts/.d.cts files. This lets internal-only params (e.g. used
// for testing) exist in the source code without being part of the public API.
import { existsSync } from "node:fs";
import { Project } from "ts-morph";

const files = ["dist/index.d.ts", "dist/index.d.cts"];
const project = new Project();

for (const filePath of files) {
  if (!existsSync(filePath)) continue;

  const sourceFile = project.addSourceFileAtPath(filePath);
  const nodes = sourceFile.getDescendants();

  for (const node of nodes) {
    if (node.wasForgotten() || typeof node.getParameters !== "function")
      continue;

    const params = node.getParameters();
    for (let i = params.length - 1; i >= 0; i--) {
      const param = params[i];
      if (!param.wasForgotten() && param.getName().startsWith("_")) {
        param.remove();
      } else {
        break;
      }
    }
  }

  sourceFile.saveSync();
}
