import fs from 'node:fs';
import path from 'node:path';
import { createInitialSeedState, DEFAULT_ADMIN_PASS_HASH, type DatabaseState } from './seedData';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let memoryState: DatabaseState | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDb(): DatabaseState {
  if (memoryState) return memoryState;
  ensureDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      memoryState = JSON.parse(raw) as DatabaseState;
      const adminUser = memoryState.users.find((u) => u.role === 'ADMIN');
      if (adminUser && adminUser.passwordVersion !== 2) {
        adminUser.passwordHash = DEFAULT_ADMIN_PASS_HASH;
        adminUser.passwordVersion = 2;
        saveDb(memoryState);
      }
      return memoryState;
    } catch {
      // Fallback to clean seed if corrupted
    }
  }
  memoryState = createInitialSeedState();
  saveDb(memoryState);
  return memoryState;
}

export function saveDb(state: DatabaseState): void {
  memoryState = state;
  ensureDir();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}
