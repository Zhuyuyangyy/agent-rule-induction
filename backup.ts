import fs from "fs";
import path from "path";

const PROJECT_ROOT = ".";
const BACKUP_ROOT = "backups/p0_vs_backup_20260614";

// Collect all files
function walkDir(dir: string, base: string = ""): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = path.join(base, entry.name);
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "backups") continue;
      files.push(...walkDir(fullPath, relPath));
    } else {
      files.push(relPath);
    }
  }
  return files;
}

const allFiles = walkDir(PROJECT_ROOT);
console.log(`Found ${allFiles.length} files to backup`);

// Create backup directory
fs.mkdirSync(BACKUP_ROOT, { recursive: true });

// Copy files
const manifest: { path: string; size: number; modified: string; status: string }[] = [];
for (const relPath of allFiles) {
  const srcPath = path.join(PROJECT_ROOT, relPath);
  const dstPath = path.join(BACKUP_ROOT, relPath);
  const dstDir = path.dirname(dstPath);
  fs.mkdirSync(dstDir, { recursive: true });

  try {
    const stat = fs.statSync(srcPath);
    fs.copyFileSync(srcPath, dstPath);

    let status = "ok";
    if (stat.size === 0) status = "empty";
    if (relPath.endsWith(".jsonl")) {
      const content = fs.readFileSync(srcPath, "utf-8");
      const lines = content.split("\n").filter(l => l.trim());
      if (lines.length === 0) status = "empty_jsonl";
      else if (lines.length < 50) status = `partial_jsonl_${lines.length}_of_50`;
      else status = `complete_jsonl_${lines.length}`;
    }

    manifest.push({
      path: relPath,
      size: stat.size,
      modified: stat.mtime.toISOString(),
      status,
    });
  } catch (e: any) {
    manifest.push({ path: relPath, size: 0, modified: "", status: `error: ${e.message}` });
  }
}

// Write manifest
fs.writeFileSync(
  path.join(BACKUP_ROOT, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf-8"
);

console.log(`\nBackup complete: ${manifest.length} files`);
console.log(`Manifest written to ${path.join(BACKUP_ROOT, "manifest.json")}`);

// Summary
const byStatus: Record<string, number> = {};
for (const m of manifest) {
  const key = m.status.includes("complete_jsonl") ? "complete_jsonl" :
              m.status.includes("partial_jsonl") ? "partial_jsonl" :
              m.status.includes("empty") ? "empty" :
              m.status.startsWith("error") ? "error" : "ok";
  byStatus[key] = (byStatus[key] || 0) + 1;
}
console.log("\nStatus summary:");
for (const [k, v] of Object.entries(byStatus)) {
  console.log(`  ${k}: ${v}`);
}
