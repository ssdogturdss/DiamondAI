import { useState, useEffect } from "react";
import { useGithubPush, useListGithubRepos } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Github, ExternalLink, CheckCircle2, FilePlus2, FilePen, GitCommitHorizontal, ArrowUpRight, FileText, X, Search, Cpu, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function Toggle({ id, checked, onCheckedChange }: { id?: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

interface PushResult {
  repoUrl?: string;
  filesCommitted: number;
  commitSha?: string;
  isNewRepo?: boolean;
  filesAdded?: number;
  filesChanged?: number;
  detectedNodeVersion?: string;
  nodeVersionSource?: string;
  message: string;
}

const NODE_SOURCE_LABELS: Record<string, string> = {
  "package.json engines": "package.json → engines.node",
  ".nvmrc": ".nvmrc file",
  ".node-version": ".node-version file",
  "runtime": "Replit runtime (fallback)",
};

function PushSuccessCard({ result }: { result: PushResult }) {
  const { repoUrl, filesCommitted, commitSha, isNewRepo, filesAdded, filesChanged, detectedNodeVersion, nodeVersionSource } = result;
  const showDiff = !isNewRepo && (filesAdded !== undefined || filesChanged !== undefined);
  const [showSourceTooltip, setShowSourceTooltip] = useState(false);
  const sourceLabel = nodeVersionSource ? (NODE_SOURCE_LABELS[nodeVersionSource] ?? nodeVersionSource) : null;

  return (
    <div
      className={cn(
        "mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 overflow-hidden",
        "animate-in fade-in slide-in-from-bottom-2 duration-500"
      )}
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-in zoom-in duration-300" />
        <span className="text-sm font-semibold text-emerald-400">
          {isNewRepo ? "Repository created & pushed!" : "Repository updated!"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-3">
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-xs font-mono text-emerald-300">
          <FilePlus2 className="w-3 h-3" />
          {filesCommitted} file{filesCommitted !== 1 ? "s" : ""} pushed
        </span>

        {commitSha && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-xs font-mono text-emerald-300">
            <GitCommitHorizontal className="w-3 h-3" />
            {commitSha}
          </span>
        )}

        {detectedNodeVersion && (
          <span className="relative inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-xs font-mono text-emerald-300">
            <Cpu className="w-3 h-3" />
            Node {detectedNodeVersion}
            {sourceLabel && (
              <button
                type="button"
                className="ml-0.5 text-emerald-400/60 hover:text-emerald-300 transition-colors focus:outline-none"
                aria-label={`Node version source: ${sourceLabel}`}
                onMouseEnter={() => setShowSourceTooltip(true)}
                onMouseLeave={() => setShowSourceTooltip(false)}
                onFocus={() => setShowSourceTooltip(true)}
                onBlur={() => setShowSourceTooltip(false)}
              >
                <Info className="w-3 h-3" />
              </button>
            )}
            {showSourceTooltip && sourceLabel && (
              <div className="absolute bottom-full left-0 mb-1.5 z-10 w-max max-w-[200px] rounded-md bg-popover border border-border px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-md animate-in fade-in duration-150">
                Detected from {sourceLabel}
              </div>
            )}
          </span>
        )}
      </div>

      {showDiff && (
        <div className="flex gap-3 px-4 pb-3">
          {(filesAdded ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400/80 font-mono">
              <FilePlus2 className="w-3 h-3" />+{filesAdded} added
            </span>
          )}
          {(filesChanged ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-yellow-400/80 font-mono">
              <FilePen className="w-3 h-3" />~{filesChanged} changed
            </span>
          )}
        </div>
      )}

      {repoUrl && (
        <div className="px-4 pb-4">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center justify-center gap-2 w-full rounded-md px-4 py-2.5 text-sm font-semibold",
              "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white transition-colors"
            )}
          >
            <Github className="w-4 h-4" />
            Open on GitHub
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}

interface PreviewFile {
  path: string;
  content: string;
}

type PreviewState = "idle" | "loading" | "shown";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const LS_KEYS = {
  token: "gitpanel_token",
  repoName: "gitpanel_repo_name",
  description: "gitpanel_description",
  isPrivate: "gitpanel_is_private",
  generateCi: "gitpanel_generate_ci",
  includePaths: "gitpanel_include_paths",
};

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

export default function GithubSync() {
  const [token, setToken] = useState(() => lsGet(LS_KEYS.token) ?? "");
  const [showToken, setShowToken] = useState(false);
  const [repoName, setRepoName] = useState(() => {
    const v = lsGet(LS_KEYS.repoName) ?? "";
    // Clear stale scoped package names like "@workspace/pwa"
    if (v.startsWith("@") && v.includes("/")) { lsSet(LS_KEYS.repoName, ""); return ""; }
    return v;
  });
  const [description, setDescription] = useState(() => lsGet(LS_KEYS.description) ?? "");
  const [isPrivate, setIsPrivate] = useState(() => lsGet(LS_KEYS.isPrivate) !== "false");
  const [generateCi, setGenerateCi] = useState(() => lsGet(LS_KEYS.generateCi) !== "false");
  const [includePaths, setIncludePaths] = useState(() => lsGet(LS_KEYS.includePaths) ?? "");

  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);

  const { toast } = useToast();

  // Auto-detect project name/description from workspace metadata (only if not already saved)
  useEffect(() => {
    const hasName = !!lsGet(LS_KEYS.repoName);
    const hasDesc = !!lsGet(LS_KEYS.description);
    if (hasName && hasDesc) return;
    fetch("/api/meta")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { name?: string; description?: string } | null) => {
        if (!data) return;
        if (!hasName && data.name && data.name !== "workspace") {
          setRepoName(data.name);
          lsSet(LS_KEYS.repoName, data.name);
        }
        if (!hasDesc && data.description) {
          setDescription(data.description);
          lsSet(LS_KEYS.description, data.description);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveToken = (val: string) => {
    setToken(val);
    lsSet(LS_KEYS.token, val);
  };

  const handleSetRepoName = (val: string) => { setRepoName(val); lsSet(LS_KEYS.repoName, val); };
  const handleSetDescription = (val: string) => { setDescription(val); lsSet(LS_KEYS.description, val); };
  const handleSetIsPrivate = (val: boolean) => { setIsPrivate(val); lsSet(LS_KEYS.isPrivate, String(val)); };
  const handleSetGenerateCi = (val: boolean) => { setGenerateCi(val); lsSet(LS_KEYS.generateCi, String(val)); };
  const handleSetIncludePaths = (val: string) => { setIncludePaths(val); lsSet(LS_KEYS.includePaths, val); };

  const { data: repos, isLoading: loadingRepos } = useListGithubRepos(
    { token },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!token } as any }
  );

  const pushMutation = useGithubPush({
    mutation: {
      onSuccess: (res) => {
        toast({ title: "Push successful!", description: res.message });
      },
      onError: (err) => {
        toast({ title: "Push failed", description: err.data?.error ?? err.message, variant: "destructive" });
      }
    }
  });

  const fetchFiles = async (): Promise<PreviewFile[]> => {
    const url = new URL("/api/files", window.location.origin);
    const trimmed = includePaths.trim();
    if (trimmed) url.searchParams.set("include", trimmed);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { files: PreviewFile[] };
    return data.files ?? [];
  };

  const handlePreview = async () => {
    if (!token || !repoName) {
      toast({ title: "Validation Error", description: "Token and Repo Name are required", variant: "destructive" });
      return;
    }
    setPreviewState("loading");
    try {
      const files = await fetchFiles();
      setPreviewFiles(files);
      setPreviewState("shown");
    } catch {
      setPreviewState("idle");
      toast({ title: "Preview failed", description: "Could not fetch file list from the server.", variant: "destructive" });
    }
  };

  const handleConfirmPush = () => {
    setPreviewState("idle");
    pushMutation.mutate({
      data: {
        token,
        repoName,
        description,
        private: isPrivate,
        generateCi,
        generateReadme: true,
        files: previewFiles,
      }
    });
  };

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto mt-4">
      <div className="flex items-center gap-2">
        <Github className="w-6 h-6" />
        <h1 className="text-xl font-bold font-mono">GitHub Sync</h1>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Personal Access Token (PAT)</Label>
            <div className="relative">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => handleSaveToken(e.target.value)}
                placeholder="ghp_..."
                className="pr-10 bg-background min-h-[44px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Stored locally on your device.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Push Project
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repoName">Repository Name</Label>
            <Input
              id="repoName"
              value={repoName}
              onChange={(e) => handleSetRepoName(e.target.value)}
              placeholder="my-awesome-project"
              className="bg-background min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => handleSetDescription(e.target.value)}
              placeholder="Built with Replit Agent"
              className="bg-background min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="includePaths">Include paths <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="includePaths"
              value={includePaths}
              onChange={(e) => handleSetIncludePaths(e.target.value)}
              placeholder="e.g. src, lib — leave blank for all files"
              className="bg-background min-h-[44px]"
            />
            <p className="text-[10px] text-muted-foreground">
              Comma-separated dirs or files relative to workspace root. Leave blank to include all project files.
            </p>
          </div>
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="private" className="flex-1 cursor-pointer">Private Repository</Label>
            <Toggle id="private" checked={isPrivate} onCheckedChange={handleSetIsPrivate} />
          </div>
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="ci" className="flex-1 cursor-pointer">Generate CI Scaffold</Label>
            <Toggle id="ci" checked={generateCi} onCheckedChange={handleSetGenerateCi} />
          </div>

          {previewState !== "shown" && (
            <Button
              className="w-full min-h-[44px] mt-2 font-mono"
              variant="outline"
              onClick={handlePreview}
              disabled={previewState === "loading" || pushMutation.isPending || !token || !repoName}
            >
              {previewState === "loading"
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning files…</>
                : <><Search className="w-4 h-4 mr-2" />Preview files</>}
            </Button>
          )}

          {previewState === "shown" && (
            <div className="rounded-lg border border-border bg-muted/20 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {previewFiles.length} file{previewFiles.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {formatBytes(previewFiles.reduce((sum, f) => sum + new TextEncoder().encode(f.content).length, 0))}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewState("idle")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
                {previewFiles.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground text-center">No files matched the current filter.</p>
                ) : (
                  previewFiles.map((f) => (
                    <div key={f.path} className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-muted/30 transition-colors">
                      <span className="text-xs font-mono text-foreground truncate">{f.path}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {formatBytes(new TextEncoder().encode(f.content).length)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 px-3 py-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-muted-foreground"
                  onClick={() => setPreviewState("idle")}
                  disabled={pushMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 font-mono"
                  onClick={handleConfirmPush}
                  disabled={pushMutation.isPending}
                >
                  {pushMutation.isPending
                    ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Pushing…</>
                    : <>Confirm &amp; push</>}
                </Button>
              </div>
            </div>
          )}

          {pushMutation.data?.repoUrl && (
            <PushSuccessCard result={pushMutation.data} />
          )}
        </CardContent>
      </Card>

      {token && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Your Repositories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRepos ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : repos?.length ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {repos.map((r) => (
                  <div key={r.id} className="flex justify-between items-center text-sm p-2 bg-muted/20 rounded-md border border-border">
                    <span className="truncate font-mono text-xs">{r.name}</span>
                    <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-primary p-2">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No repositories found.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
