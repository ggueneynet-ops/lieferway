#!/usr/bin/env node
/**
 * Resolve the Vercel Preview URL for a commit and wait until it is ready.
 *
 * Resolution order:
 *   1. `--url` / `PREVIEW_URL`                       — explicit override
 *   2. GitHub Deployments API (needs `GITHUB_TOKEN`) — Vercel's Git integration
 *      creates a `Preview` deployment per commit with an `environment_url`
 *   3. Vercel REST API (needs `VERCEL_TOKEN` + `VERCEL_PROJECT_ID`)
 *
 * Strategy 2 needs no extra secret, so the PR gate works out of the box as long
 * as the Vercel GitHub integration is connected. See docs/qa/release-gate.md.
 *
 * Writes `preview_url` to `$GITHUB_OUTPUT` and `PREVIEW_URL` to `$GITHUB_ENV`
 * when running inside GitHub Actions.
 */

import { appendFileSync } from "node:fs";

const args = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...rest] = a.replace(/^--/, "").split("=");
      return [k, rest.join("=") || "true"];
    }),
);

const timeoutMs = Number(args.get("timeout-ms") ?? process.env.QA_PREVIEW_TIMEOUT_MS ?? 900_000);
const intervalMs = Number(args.get("interval-ms") ?? process.env.QA_PREVIEW_INTERVAL_MS ?? 15_000);
const sha = (args.get("sha") ?? process.env.QA_PREVIEW_SHA ?? process.env.GITHUB_SHA ?? "").trim();
const repo = (process.env.GITHUB_REPOSITORY ?? "").trim();
const githubToken = (process.env.GITHUB_TOKEN ?? "").trim();
const vercelToken = (process.env.VERCEL_TOKEN ?? "").trim();
const vercelProject = (process.env.VERCEL_PROJECT_ID ?? "").trim();
const vercelTeam = (process.env.VERCEL_TEAM_ID ?? process.env.VERCEL_ORG_ID ?? "").trim();

const deadline = Date.now() + timeoutMs;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normalize = (url) => url.trim().replace(/\/$/, "");

function emit(url) {
  console.log(url);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `preview_url=${url}\n`);
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `PREVIEW_URL=${url}\n`);
}

function fail(message) {
  console.error(`[preview-url] ${message}`);
  process.exit(1);
}

async function api(url, headers) {
  const res = await fetch(url, { headers: { accept: "application/json", ...headers } });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url.replace(/(\?|&)(token|teamId)=[^&]*/g, "$1$2=***")}`);
  }
  return res.json();
}

/** Vercel GitHub integration → Deployments API. `environment` is e.g. `Preview` or `Preview – lieferway`. */
async function fromGitHubDeployments() {
  const headers = {
    authorization: `Bearer ${githubToken}`,
    "x-github-api-version": "2022-11-28",
  };
  const deployments = await api(
    `https://api.github.com/repos/${repo}/deployments?sha=${encodeURIComponent(sha)}&per_page=50`,
    headers,
  );
  const previews = deployments.filter((d) => /preview/i.test(String(d.environment ?? "")));
  const candidates = previews.length > 0 ? previews : deployments;
  for (const deployment of candidates) {
    const statuses = await api(
      `https://api.github.com/repos/${repo}/deployments/${deployment.id}/statuses?per_page=50`,
      headers,
    );
    for (const status of statuses) {
      const url = status.environment_url || status.target_url;
      if (status.state === "success" && url) return { url: normalize(url), state: "ready" };
      if (status.state === "failure" || status.state === "error") {
        return { url: null, state: "failed", reason: `deployment ${deployment.id} reported ${status.state}` };
      }
    }
  }
  return { url: null, state: "pending" };
}

async function fromVercelApi() {
  const query = new URLSearchParams({
    projectId: vercelProject,
    "meta-githubCommitSha": sha,
    limit: "20",
    target: "preview",
  });
  if (vercelTeam) query.set("teamId", vercelTeam);
  const data = await api(`https://api.vercel.com/v6/deployments?${query}`, {
    authorization: `Bearer ${vercelToken}`,
  });
  const deployments = data.deployments ?? [];
  for (const deployment of deployments) {
    const state = deployment.readyState ?? deployment.state;
    if (state === "READY") return { url: normalize(`https://${deployment.url}`), state: "ready" };
    if (state === "ERROR" || state === "CANCELED") {
      return { url: null, state: "failed", reason: `vercel deployment ${deployment.uid} is ${state}` };
    }
  }
  return { url: null, state: "pending" };
}

const override = args.get("url") ?? process.env.PREVIEW_URL ?? "";
if (override && override !== "true") {
  emit(normalize(override));
  process.exit(0);
}

if (!sha) fail("no commit sha (pass --sha or set GITHUB_SHA)");

const strategies = [];
if (githubToken && repo) strategies.push({ name: "github-deployments", run: fromGitHubDeployments });
if (vercelToken && vercelProject) strategies.push({ name: "vercel-api", run: fromVercelApi });

if (strategies.length === 0) {
  fail(
    "no way to resolve the preview URL — provide PREVIEW_URL, or GITHUB_TOKEN + GITHUB_REPOSITORY, " +
      "or VERCEL_TOKEN + VERCEL_PROJECT_ID (see docs/qa/release-gate.md)",
  );
}

console.error(
  `[preview-url] waiting for a ready preview of ${sha.slice(0, 8)} via ${strategies
    .map((s) => s.name)
    .join(", ")} (timeout ${Math.round(timeoutMs / 1000)}s)`,
);

let attempt = 0;
while (Date.now() < deadline) {
  attempt += 1;
  for (const strategy of strategies) {
    try {
      const result = await strategy.run();
      if (result.state === "ready" && result.url) {
        console.error(`[preview-url] ready via ${strategy.name} after ${attempt} check(s)`);
        emit(result.url);
        process.exit(0);
      }
      if (result.state === "failed") fail(`${strategy.name}: ${result.reason}`);
    } catch (error) {
      console.error(`[preview-url] ${strategy.name} check failed: ${error instanceof Error ? error.message : error}`);
    }
  }
  console.error(`[preview-url] not ready yet (check ${attempt}) — retrying in ${Math.round(intervalMs / 1000)}s`);
  await sleep(intervalMs);
}

fail(`timed out after ${Math.round(timeoutMs / 1000)}s waiting for a Preview deployment of ${sha}`);
