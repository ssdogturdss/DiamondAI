import { Router, type IRouter } from "express";
import { readFile } from "fs/promises";
import { join } from "path";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? "/home/runner/workspace";

async function readJson(path: string): Promise<Record<string, unknown> | null> {
  try {
    const text = await readFile(path, "utf-8");
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

function extractGitRemote(gitConfig: string): string | null {
  const match = gitConfig.match(/\[remote "origin"\][^[]*url\s*=\s*([^\n]+)/);
  if (!match) return null;
  const url = match[1].trim();
  // Convert SSH to HTTPS form for display
  const sshMatch = url.match(/git@github\.com:(.+?)(?:\.git)?$/);
  if (sshMatch) return `https://github.com/${sshMatch[1]}`;
  const httpsMatch = url.match(/https:\/\/github\.com\/(.+?)(?:\.git)?$/);
  if (httpsMatch) return `https://github.com/${httpsMatch[1]}`;
  return null;
}

function extractGitOwnerRepo(remoteUrl: string | null): { owner: string; repo: string } | null {
  if (!remoteUrl) return null;
  const match = remoteUrl.match(/github\.com\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

router.get("/meta", async (_req, res) => {
  try {
    // Try workspace root package.json first, then fall back to common artifact locations
    const candidates = [
      join(WORKSPACE_ROOT, "package.json"),
      join(WORKSPACE_ROOT, "artifacts/pwa/package.json"),
      join(WORKSPACE_ROOT, "artifacts/api-server/package.json"),
    ];

    let pkg: Record<string, unknown> | null = null;
    for (const c of candidates) {
      pkg = await readJson(c);
      if (pkg && pkg.name && pkg.name !== "workspace") break;
    }

    const gitConfig = await readText(join(WORKSPACE_ROOT, ".git/config"));
    const remoteUrl = gitConfig ? extractGitRemote(gitConfig) : null;
    const ownerRepo = extractGitOwnerRepo(remoteUrl);

    const rawName = (pkg?.name as string | undefined) ?? null;
    // Strip npm scope (e.g. "@workspace/pwa" → "pwa")
    const name = rawName ? rawName.replace(/^@[^/]+\//, "") : null;
    const description = (pkg?.description as string | undefined) ?? null;

    res.json({
      name: name && name !== "workspace" ? name : null,
      description,
      remoteUrl,
      gitOwner: ownerRepo?.owner ?? null,
      gitRepo: ownerRepo?.repo ?? name ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Meta fetch failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
