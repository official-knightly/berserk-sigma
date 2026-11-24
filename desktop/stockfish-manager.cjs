const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const os = require("node:os");
const extract = require("extract-zip");
const { pipeline } = require("node:stream/promises");

const RELEASES_API = "https://api.github.com/repos/official-stockfish/Stockfish/releases/latest";
const WINDOWS_BUILDS = {
  x64: ["x86-64-universal", "x86-64"],
  arm64: ["arm64-universal", "armv8"]
};

function pickWindowsAsset(assets, arch = process.arch) {
  for (const build of WINDOWS_BUILDS[arch] || []) {
    const asset = assets.find((item) => item.name === `stockfish-windows-${build}.zip`);
    if (asset?.browser_download_url) return asset.browser_download_url;
  }
  return null;
}

function getResponse(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    if (target.protocol !== "https:") return reject(new Error("Stockfish downloads must use HTTPS."));
    const request = https.get(target, { headers: { "User-Agent": "Chess-Topper/1.0" } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.destroy();
        if (!redirects) return reject(new Error("Too many redirects while downloading Stockfish."));
        return resolve(getResponse(new URL(response.headers.location, target).toString(), redirects - 1));
      }
      if (response.statusCode !== 200) {
        response.destroy();
        return reject(new Error(`GitHub returned HTTP ${response.statusCode} while downloading Stockfish.`));
      }
      resolve(response);
    });
    request.on("error", reject);
    request.setTimeout(30000, () => request.destroy(new Error("Stockfish download timed out.")));
  });
}

async function httpsJson(url) {
  const response = await getResponse(url);
  response.setEncoding("utf8");
  let body = "";
  for await (const chunk of response) body += chunk;
  return JSON.parse(body);
}

async function download(url, destination, onProgress) {
  const response = await getResponse(url);
  const total = Number(response.headers["content-length"]);
  let received = 0;
  let lastProgress = -1;
  response.on("data", (chunk) => {
    received += chunk.length;
    if (!total) return;
    const percent = Math.floor(received * 100 / total);
    if (percent !== lastProgress) onProgress?.(percent);
    lastProgress = percent;
  });
  await pipeline(response, fs.createWriteStream(destination));
}

function readWindowsExecutableArch(file) {
  const fd = fs.openSync(file, "r");
  try {
    const stub = Buffer.alloc(64);
    if (fs.readSync(fd, stub, 0, stub.length, 0) !== stub.length || stub.toString("ascii", 0, 2) !== "MZ") return null;
    const pe = Buffer.alloc(6);
    const offset = stub.readUInt32LE(0x3c);
    if (fs.readSync(fd, pe, 0, pe.length, offset) !== pe.length || pe.readUInt32LE(0) !== 0x00004550) return null;
    return ({ 0x8664: "x64", 0xaa64: "arm64" })[pe.readUInt16LE(4)] ?? null;
  } finally {
    fs.closeSync(fd);
  }
}

function findExe(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = findExe(full);
      if (found) return found;
    } else if (/stockfish.*\.exe$/i.test(entry.name)) {
      return full;
    }
  }
  return null;
}

async function ensureStockfish(userDataDir, onStatus) {
  if (process.platform !== "win32") {
    throw new Error("Native Stockfish download is currently enabled on Windows. macOS and Linux continue to use the built-in Stockfish WASM engine.");
  }

  const destination = path.join(userDataDir, "stockfish.exe");
  const versionFile = path.join(userDataDir, "stockfish-version.json");
  const release = await httpsJson(RELEASES_API);
  const currentArch = process.arch;
  let installedTag = "";
  try {
    installedTag = JSON.parse(fs.readFileSync(versionFile, "utf8")).tag_name || "";
  } catch {}

  if (fs.existsSync(destination) && readWindowsExecutableArch(destination) === currentArch && installedTag === release.tag_name) {
    return destination;
  }

  onStatus?.({ status: "downloading", message: "Stockfish: connecting to the official release…" });
  const url = pickWindowsAsset(release.assets || [], currentArch);
  if (!url) throw new Error(`No official Windows Stockfish build was found for ${currentArch}.`);

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "chess-topper-stockfish-"));
  try {
    const archive = path.join(temporaryDirectory, "stockfish.zip");
    await download(url, archive, (percent) => onStatus?.({ status: "downloading", percent, message: `Stockfish download: ${percent}%` }));
    const extracted = path.join(temporaryDirectory, "extracted");
    await extract(archive, { dir: extracted });
    const executable = findExe(extracted);
    if (!executable || readWindowsExecutableArch(executable) !== currentArch) {
      throw new Error("The official Stockfish archive did not contain a compatible Windows executable.");
    }
    fs.mkdirSync(userDataDir, { recursive: true });
    const staged = destination + ".new";
    fs.copyFileSync(executable, staged);
    fs.renameSync(staged, destination);
    fs.writeFileSync(versionFile, JSON.stringify({ tag_name: release.tag_name, name: release.name, installed_at: new Date().toISOString() }, null, 2));
    onStatus?.({ status: "ready", message: `Stockfish ${release.name || release.tag_name} is ready.` });
    return destination;
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

module.exports = { pickWindowsAsset, readWindowsExecutableArch, ensureStockfish };
