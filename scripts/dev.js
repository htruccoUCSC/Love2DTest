#!/usr/bin/env node
const { spawnSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = process.cwd();
const srcPath = path.join(root, "src");
const gameName = "SquareTest";
const gameZip = path.join(root, "game.zip");
const gameLove = path.join(root, "game.love");
const webDir = path.join(root, "web");
const webGameLove = path.join(webDir, "game.love");

function runSync(cmd, args, opts = {}) {
  console.log("> " + [cmd].concat(args || []).join(" "));
  const res = spawnSync(
    cmd,
    args || [],
    Object.assign({ stdio: "inherit" }, opts),
  );
  if (res.status !== 0) {
    throw new Error(`${cmd} exited with ${res.status}`);
  }
}

function buildOnce() {
  console.log("Building game.love from `src/` (local files)...");
  // Prefer zipping the local src/ folder so uncommitted changes are included.
  try {
    if (process.platform === "win32") {
      // Use PowerShell Compress-Archive on Windows
      const psCmd = [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path '${path.join(srcPath, "*")}' -DestinationPath '${gameZip}' -Force`,
      ];
      const moveCmd = [
        "-NoProfile",
        "-Command",
        `Move-Item -Path '${gameZip}' -Destination '${gameLove}' -Force`,
      ];
      runSync("powershell", psCmd);
      runSync("powershell", moveCmd);
    } else {
      // On Unix-like systems, run zip from the src directory so files are stored
      // at the archive root (no leading `src/` folder).
      runSync("zip", ["-r", gameLove, "."], { cwd: srcPath });
    }
  } catch (e) {
    // If zip/Compress-Archive is not available or fails, fall back to original git archive behavior.
    console.warn(
      "Creating zip from local `src/` failed, falling back to `git archive HEAD:src`:",
      e.message,
    );
    runSync("git", ["archive", "--format=zip", "-o", gameLove, "HEAD:src"]);
  }

  console.log("Building web package with love.js...");
  // Use npx to ensure local package bin is used if available
  if (process.platform === "win32") {
    runSync("powershell", [
      "npx",
      "love.js.cmd",
      "-c",
      "-t",
      gameName,
      gameLove,
      webDir,
    ]);
  } else {
    runSync("npx", ["love.js", "-c", "-t", gameName, gameLove, webDir]);
  }
  try {
    fs.mkdirSync(webDir, { recursive: true });
    fs.copyFileSync(gameLove, webGameLove);
  } catch (e) {
    console.warn("Could not copy game.love into web/ (ignored):", e.message);
  }
  console.log("Build complete.");
}

function startVite() {
  console.log("Starting Vite dev server...");
  const cmd = "npx";
  const child = spawn(cmd, ["vite"], { stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    console.log("Vite exited with", code);
    process.exit(code || 0);
  });
  return child;
}

async function main() {
  const watch = process.argv.includes("--watch");
  try {
    buildOnce();
  } catch (e) {
    console.error("Initial build failed:", e.message);
    process.exit(1);
  }

  const server = startVite();

  if (watch) {
    // lazy-load chokidar to avoid adding runtime dependency unless requested
    let chokidar;
    try {
      chokidar = require("chokidar");
    } catch (e) {
      console.error(
        "To use --watch you need to install devDependency `chokidar`. Run `npm install`.",
      );
      process.exit(1);
    }

    console.log("Watching `src/` for changes...");
    const watcher = chokidar.watch(srcPath, {
      ignoreInitial: true,
      persistent: true,
    });
    let rebuilding = false;
    const debounce = 300;
    let timer = null;
    watcher.on("all", (ev, p) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (rebuilding) return;
        rebuilding = true;
        try {
          console.log("Change detected:", ev, p);
          buildOnce();
        } catch (e) {
          console.error("Rebuild failed:", e.message);
        } finally {
          rebuilding = false;
        }
      }, debounce);
    });
  }
}

main();
