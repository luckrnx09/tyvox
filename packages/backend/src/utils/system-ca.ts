import { spawn } from "node:child_process";
import { platform } from "node:os";
import { rootCertificates } from "node:tls";
import { Agent, setGlobalDispatcher } from "undici";
import { getLogger } from "./logger.js";

const logger = getLogger("system");

const MAC_SECURITY_COMMAND = "security";
const MAC_SECURITY_ARGS = ["find-certificate", "-a", "-p", "/Library/Keychains/System.keychain"];
const WINDOWS_POWERSHELL_COMMAND = "powershell";
const WINDOWS_POWERSHELL_ARGS = [
  "-NoProfile",
  "-Command",
  "Get-ChildItem Cert:\\LocalMachine\\Root | ForEach-Object { '-----BEGIN CERTIFICATE-----'; [Convert]::ToBase64String($_.RawData, 'InsertLineBreaks'); '-----END CERTIFICATE-----' }",
];
const COMMAND_TIMEOUT_MS = 10_000;
const PEM_MARKER = "-----BEGIN CERTIFICATE-----";

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ["ignore", "pipe", "ignore"] });
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`${command} timed out`));
    }, COMMAND_TIMEOUT_MS);
    let stdout = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export async function installSystemCaCertificates(): Promise<void> {
  try {
    let pem = "";
    if (platform() === "darwin") {
      pem = await run(MAC_SECURITY_COMMAND, MAC_SECURITY_ARGS);
    } else if (platform() === "win32") {
      pem = await run(WINDOWS_POWERSHELL_COMMAND, WINDOWS_POWERSHELL_ARGS);
    } else {
      return;
    }
    if (!pem.includes(PEM_MARKER)) {
      return;
    }
    setGlobalDispatcher(new Agent({ connect: { ca: [...rootCertificates, pem] } }));
    logger.info({ bytes: pem.length }, "System CA certificates installed");
  } catch (error) {
    logger.warn({ error: String(error) }, "Failed to load system CA certificates, using defaults");
  }
}
