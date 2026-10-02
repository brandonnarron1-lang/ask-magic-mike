import { spawnSync } from "node:child_process";

function commandError(command, args, result) {
  const detail = String(result.stderr || result.stdout || "command_failed")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 500);
  return new Error(`${command}_failed:${args[0] ?? "unknown"}:${detail}`);
}

export function runJsonCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) throw commandError(command, args, result);
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${command}_invalid_json:${args[0] ?? "unknown"}`);
  }
}

export function runTextCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) throw commandError(command, args, result);
  return result.stdout;
}

export function ghApi(path, { method = "GET", headers = [], fields = [] } = {}) {
  const args = ["api", path, "-X", method];
  for (const header of headers) args.push("-H", header);
  for (const [key, value] of fields) args.push("-f", `${key}=${value}`);
  return runJsonCommand("gh", args);
}

export function vercelApi(path, scope) {
  return runJsonCommand("vercel", [
    "api",
    path,
    "--scope",
    scope,
    "--raw",
    "--no-color",
  ]);
}

export function extractVercelDeploymentId(targetUrl, expected = {}) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error("vercel_status_target_url_invalid");
  }
  if (parsed.hostname !== "vercel.com") throw new Error("vercel_status_target_host_invalid");
  const parts = parsed.pathname.split("/").filter(Boolean);
  const suffix = parts.at(-1);
  if (!suffix || !/^[A-Za-z0-9]+$/.test(suffix)) {
    throw new Error("vercel_status_deployment_id_invalid");
  }
  if (expected.team && parts[0] !== expected.team) {
    throw new Error("vercel_status_team_mismatch");
  }
  if (expected.project && parts[1] !== expected.project) {
    throw new Error("vercel_status_project_mismatch");
  }
  return `dpl_${suffix}`;
}

export function findSuccessfulVercelStatus(combinedStatus, expected = {}) {
  const status = combinedStatus?.statuses?.find(
    (entry) => entry.context === "Vercel" && entry.state === "success",
  );
  if (!status) throw new Error("vercel_success_status_missing");
  return {
    sha: combinedStatus.sha,
    deploymentId: extractVercelDeploymentId(status.target_url, expected),
    targetUrl: status.target_url,
    description: status.description,
  };
}

export async function fetchStatus(url, { timeoutMs = 12_000 } = {}) {
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "User-Agent": "AskMagicMike-ReleaseAuthority/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: response.status, headers: response.headers };
}
