#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const SEMVER_RE = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
const MERGE_POLL_INTERVAL_MS = 20_000;
const MERGE_POLL_ATTEMPTS = 60;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const output = execSync(`git log ${range} --pretty=format:"%s"`, { encoding: "utf-8" }).trim();
  return output ? output.split("\n") : [];
}

function groupCommits(commits) {
  const groups = { feat: [], fix: [], other: [] };
  for (const message of commits) {
    if (message.startsWith("chore(release)")) continue;
    if (message.startsWith("feat")) groups.feat.push(message);
    else if (message.startsWith("fix")) groups.fix.push(message);
    else groups.other.push(message);
  }
  return groups;
}

function buildChangelogEntry(version, commits) {
  const date = new Date().toISOString().slice(0, 10);
  const groups = groupCommits(commits);
  let body = `## [${version}] - ${date}\n\n`;
  if (groups.feat.length) body += `### Added\n\n${groups.feat.map((m) => `- ${m}`).join("\n")}\n\n`;
  if (groups.fix.length) body += `### Fixed\n\n${groups.fix.map((m) => `- ${m}`).join("\n")}\n\n`;
  if (groups.other.length)
    body += `### Changed\n\n${groups.other.map((m) => `- ${m}`).join("\n")}\n\n`;
  return body;
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function run(command) {
  execSync(command, { stdio: "inherit" });
}

function mergeReleasePullRequest(branch, version) {
  for (let attempt = 0; attempt < MERGE_POLL_ATTEMPTS; attempt++) {
    const result = spawnSync("gh", ["pr", "merge", branch, "--squash", "--delete-branch"], {
      stdio: "inherit",
    });
    if (result.status === 0) return;
    const state = execSync(`gh pr view ${branch} --json state --jq .state`, {
      encoding: "utf-8",
    }).trim();
    if (state === "MERGED") return;
    sleep(MERGE_POLL_INTERVAL_MS);
  }
  console.error(
    `Timed out waiting to merge the release PR. Merge it manually, then run:\n` +
      `git checkout master && git pull --ff-only && git tag -a v${version} -m "v${version}" && git push origin v${version}`,
  );
  process.exit(1);
}

function main() {
  const version = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");

  if (!version || !SEMVER_RE.test(version)) {
    console.error("Usage: pnpm release <semver> [--dry-run]");
    process.exit(1);
  }

  const rootDir = resolve(import.meta.dirname, "..");
  const rootPkgPath = resolve(rootDir, "package.json");
  const desktopPkgPath = resolve(rootDir, "packages/desktop/package.json");
  const changelogPath = resolve(rootDir, "CHANGELOG.md");

  const rootPkg = readJson(rootPkgPath);
  const desktopPkg = readJson(desktopPkgPath);

  rootPkg.version = version;
  desktopPkg.version = version;

  const previousTag = execSync("git tag --list --sort=-version:refname | head -1", {
    encoding: "utf-8",
  }).trim();
  const commits = getCommitsSince(previousTag || undefined);

  if (!commits.length) {
    console.error("No commits since last tag; nothing to release.");
    process.exit(1);
  }

  const entry = buildChangelogEntry(version, commits);
  console.log("Generated CHANGELOG entry:\n");
  console.log(entry);

  if (dryRun) {
    console.log("Dry run complete.");
    return;
  }

  writeJson(rootPkgPath, rootPkg);
  writeJson(desktopPkgPath, desktopPkg);

  let changelog = "";
  try {
    changelog = readFileSync(changelogPath, "utf-8");
  } catch {
    // create new changelog
  }
  writeFileSync(
    changelogPath,
    `# Changelog\n\n${entry}${changelog.replace(/^# Changelog\n\n/, "")}`,
  );

  const branch = `chore/release-v${version}`;
  run(`git checkout -b ${branch}`);
  run("git add package.json packages/desktop/package.json CHANGELOG.md");
  run(`git commit -m "chore(release): v${version}"`);
  run(`git push -u origin ${branch}`);
  run(
    `gh pr create --title "chore(release): v${version}" --body "Release commit for v${version}. Squash-merged automatically; the script tags the merged commit on master and pushes the tag to trigger the release workflow."`,
  );

  mergeReleasePullRequest(branch, version);

  run("git checkout master");
  run("git pull --ff-only");
  run(`git branch -D ${branch}`);
  run(`git tag -a v${version} -m "v${version}"`);
  run(`git push origin v${version}`);

  console.log(`Released v${version}. CI will build the artifacts.`);
}

main();
