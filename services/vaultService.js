import fs from "fs";
import path from "path";
import { logWA } from "./waLogger.js";

const VAULT_FILE = path.join(process.cwd(), "memory", "vault.json");

export function ambilSemuaVault() {
  try {
    if (!fs.existsSync(VAULT_FILE)) return [];
    const data = fs.readFileSync(VAULT_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    logWA.error("[ERROR READ VAULT]:", error);
    return [];
  }
}

export function simpanVault(item) {
  try {
    const memoryDir = path.dirname(VAULT_FILE);
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    const daftarVault = ambilSemuaVault();
    daftarVault.unshift(item);
    fs.writeFileSync(VAULT_FILE, JSON.stringify(daftarVault, null, 2));
  } catch (error) {
    logWA.error("[ERROR WRITE VAULT]:", error);
  }
}

export function perbaruiTimestampVault(canonicalHash) {
  try {
    const data = ambilSemuaVault();
    const index = data.findIndex((i) => i.canonical_hash === canonicalHash);
    if (index === -1) {
      return;
    }
    data[index].updated_at = new Date().toISOString();
    fs.writeFileSync(VAULT_FILE, JSON.stringify(data, null, 2));
    return data[index];
  } catch (error) {
    logWA.error("[ERROR UPDATE VAULT TIMESTAMP]:", error);
  }
  return null;
}

