import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS PatientDataKey (
    id TEXT PRIMARY KEY,
    walletAddress TEXT NOT NULL,
    ipfsCid TEXT NOT NULL,
    aesKeyHex TEXT NOT NULL,
    dataType TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(walletAddress, ipfsCid)
  );
  CREATE INDEX IF NOT EXISTS idx_wallet ON PatientDataKey(walletAddress);
`);

export interface PatientDataKeyRow {
    id: string;
    walletAddress: string;
    ipfsCid: string;
    aesKeyHex: string;
    dataType: string;
    createdAt: string;
}

export function getKeysByWallet(wallet: string): PatientDataKeyRow[] {
    const stmt = db.prepare(
        "SELECT * FROM PatientDataKey WHERE walletAddress = ? ORDER BY createdAt DESC"
    );
    return stmt.all(wallet.toLowerCase()) as PatientDataKeyRow[];
}

export function upsertKey(
    walletAddress: string,
    ipfsCid: string,
    aesKeyHex: string,
    dataType: string
): PatientDataKeyRow {
    const id = crypto.randomUUID();
    const stmt = db.prepare(`
    INSERT INTO PatientDataKey (id, walletAddress, ipfsCid, aesKeyHex, dataType)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(walletAddress, ipfsCid) DO UPDATE SET
      aesKeyHex = excluded.aesKeyHex,
      dataType = excluded.dataType
  `);
    stmt.run(id, walletAddress.toLowerCase(), ipfsCid, aesKeyHex, dataType);

    const getStmt = db.prepare(
        "SELECT * FROM PatientDataKey WHERE walletAddress = ? AND ipfsCid = ?"
    );
    return getStmt.get(walletAddress.toLowerCase(), ipfsCid) as PatientDataKeyRow;
}

export default db;
