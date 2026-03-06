"use client";

import { useState } from "react";
import { BrowserProvider } from "ethers";

// ─── Types ─────────────────────────────────────────────
interface PatientDataKey {
  id: string;
  walletAddress: string;
  ipfsCid: string;
  aesKeyHex: string;
  dataType: string;
  createdAt: string;
}

interface DecryptedFile {
  key: PatientDataKey;
  content: string | null; // CSV text or base64 PDF
  error?: string;
}

// ─── Constants ─────────────────────────────────────────
const IPFS_GATEWAY = "https://ipfs-gateway.snbhowmik.dev/ipfs";

// ─── Main Page ─────────────────────────────────────────
export default function PatientPortal() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [keys, setKeys] = useState<PatientDataKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);

  const [decryptedFiles, setDecryptedFiles] = useState<DecryptedFile[]>([]);
  const [isDecrypting, setIsDecrypting] = useState<string | null>(null); // CID being decrypted

  const [activeTab, setActiveTab] = useState<"ecg" | "pdf">("ecg");

  // ─── Web3 Login (Ganache/MetaMask) ───────────────────
  const connectWallet = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      if (!(window as any).ethereum) {
        throw new Error("No Ethereum wallet found. Please install MetaMask and connect to your Ganache network.");
      }
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWallet(address.toLowerCase());

      // Fetch keys immediately after login
      await fetchKeys(address.toLowerCase());
    } catch (err: any) {
      setConnectError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setKeys([]);
    setDecryptedFiles([]);
  };

  // ─── Fetch Keys from DB ──────────────────────────────
  const fetchKeys = async (address: string) => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch(`/api/keys?wallet=${address}`);
      const data = await res.json();
      if (data.keys) {
        setKeys(data.keys);
      }
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  // ─── Decrypt a file from IPFS ────────────────────────
  const decryptFile = async (key: PatientDataKey) => {
    setIsDecrypting(key.ipfsCid);
    try {
      // 1. Fetch encrypted data from IPFS gateway
      const response = await fetch(`${IPFS_GATEWAY}/${key.ipfsCid}`);
      if (!response.ok) throw new Error(`IPFS fetch failed: ${response.status}`);
      const encryptedData = new Uint8Array(await response.arrayBuffer());

      // 2. Extract IV (first 12 bytes) and ciphertext
      const iv = encryptedData.slice(0, 12);
      const ciphertext = encryptedData.slice(12);

      // 3. Import AES key from hex
      const keyBytes = new Uint8Array(
        key.aesKeyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );

      // 4. Decrypt
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        ciphertext
      );

      let content: string;
      if (key.dataType === "PDF_REPORT") {
        // Convert to base64 for PDF rendering
        const bytes = new Uint8Array(decryptedBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        content = btoa(binary);
      } else {
        // CSV text
        content = new TextDecoder().decode(decryptedBuffer);
      }

      setDecryptedFiles((prev) => {
        const filtered = prev.filter((f) => f.key.ipfsCid !== key.ipfsCid);
        return [...filtered, { key, content }];
      });
    } catch (err: any) {
      console.error("Decryption failed:", err);
      setDecryptedFiles((prev) => {
        const filtered = prev.filter((f) => f.key.ipfsCid !== key.ipfsCid);
        return [...filtered, { key, content: null, error: err.message }];
      });
    } finally {
      setIsDecrypting(null);
    }
  };

  // ─── Render ──────────────────────────────────────────
  if (!wallet) {
    return <LoginScreen onConnect={connectWallet} isConnecting={isConnecting} error={connectError} />;
  }

  const ecgKeys = keys.filter((k) => k.dataType === "ECG_CSV");
  const pdfKeys = keys.filter((k) => k.dataType === "PDF_REPORT");
  const activeKeys = activeTab === "ecg" ? ecgKeys : pdfKeys;

  return (
    <div className="min-h-screen w-full" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Ambient background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,255,136,0.03), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(0,100,255,0.02), transparent)",
        }}
      />

      <div className="relative z-10 p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1
              style={{
                fontSize: "22px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              C.A.R.E.{" "}
              <span style={{ color: "var(--accent-green)" }}>Patient Portal</span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)", marginTop: 4 }}>
              Decentralized Health Records • IPFS Encrypted Storage
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="px-3 py-2 rounded-lg flex items-center gap-2"
              style={{
                background: "rgba(0,255,136,0.08)",
                border: "1px solid rgba(0,255,136,0.2)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--accent-green)", animation: "pulse-glow 1.5s infinite" }}
              />
              <span style={{ color: "var(--accent-green)", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {wallet.slice(0, 6)}...{wallet.slice(-4)}
              </span>
            </div>
            <button
              onClick={disconnectWallet}
              className="px-3 py-2 rounded-lg transition-all hover:opacity-80"
              style={{
                background: "rgba(255,68,68,0.1)",
                border: "1px solid rgba(255,68,68,0.2)",
                color: "var(--danger)",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Disconnect
            </button>
          </div>
        </header>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "ecg" as const, label: "ECG Records", count: ecgKeys.length, color: "var(--accent-green)" },
            { id: "pdf" as const, label: "PDF Reports", count: pdfKeys.length, color: "var(--accent-purple)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 rounded-xl transition-all"
              style={{
                background: activeTab === tab.id ? `${tab.color}15` : "rgba(255,255,255,0.03)",
                border: `1px solid ${activeTab === tab.id ? `${tab.color}40` : "var(--border-subtle)"}`,
                color: activeTab === tab.id ? tab.color : "var(--text-muted)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tab.label}{" "}
              <span
                style={{
                  background: activeTab === tab.id ? tab.color : "rgba(255,255,255,0.1)",
                  color: activeTab === tab.id ? "var(--bg-primary)" : "var(--text-muted)",
                  padding: "2px 8px",
                  borderRadius: "8px",
                  fontSize: "10px",
                  marginLeft: "6px",
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}

          <button
            onClick={() => wallet && fetchKeys(wallet)}
            disabled={isLoadingKeys}
            className="ml-auto px-3 py-2 rounded-lg transition-all hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              cursor: isLoadingKeys ? "wait" : "pointer",
            }}
          >
            {isLoadingKeys ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {/* Content */}
        {isLoadingKeys ? (
          <div className="glass-card p-12 text-center">
            <div style={{ color: "var(--text-muted)", fontSize: "13px", fontFamily: "var(--font-mono)" }}>
              Fetching your records...
            </div>
          </div>
        ) : activeKeys.length === 0 ? (
          <div className="glass-card p-12 text-center animate-fade-in">
            <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.3 }}>
              {activeTab === "ecg" ? "📊" : "📄"}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", fontFamily: "var(--font-mono)" }}>
              No {activeTab === "ecg" ? "ECG records" : "PDF reports"} found for this wallet.
            </p>
            <p style={{ color: "var(--text-dim)", fontSize: "11px", fontFamily: "var(--font-mono)", marginTop: 8 }}>
              Records will appear here once uploaded from IoMT Edge.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeKeys.map((key, index) => {
              const decrypted = decryptedFiles.find((f) => f.key.ipfsCid === key.ipfsCid);
              const isCurrentlyDecrypting = isDecrypting === key.ipfsCid;

              return (
                <div
                  key={key.id}
                  className="glass-card-accent animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* File Header */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{
                          background: key.dataType === "ECG_CSV" ? "rgba(0,255,136,0.1)" : "rgba(170,85,255,0.1)",
                          border: `1px solid ${key.dataType === "ECG_CSV" ? "rgba(0,255,136,0.2)" : "rgba(170,85,255,0.2)"}`,
                        }}
                      >
                        {key.dataType === "ECG_CSV" ? "📈" : "📄"}
                      </div>
                      <div>
                        <p style={{ color: "var(--text-primary)", fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          CID: {key.ipfsCid.slice(0, 14)}...{key.ipfsCid.slice(-6)}
                        </p>
                        <p style={{ color: "var(--text-dim)", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                          {new Date(key.createdAt).toLocaleString()} • {key.dataType}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => decryptFile(key)}
                      disabled={isCurrentlyDecrypting}
                      className="px-4 py-2 rounded-lg transition-all hover:opacity-80"
                      style={{
                        background: decrypted?.content
                          ? "rgba(0,255,136,0.1)"
                          : decrypted?.error
                            ? "rgba(255,68,68,0.1)"
                            : "rgba(0,200,255,0.1)",
                        border: `1px solid ${decrypted?.content
                          ? "rgba(0,255,136,0.3)"
                          : decrypted?.error
                            ? "rgba(255,68,68,0.3)"
                            : "rgba(0,200,255,0.3)"
                          }`,
                        color: decrypted?.content
                          ? "var(--accent-green)"
                          : decrypted?.error
                            ? "var(--danger)"
                            : "var(--accent-blue)",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        cursor: isCurrentlyDecrypting ? "wait" : "pointer",
                      }}
                    >
                      {isCurrentlyDecrypting ? "Decrypting..." : decrypted?.content ? "✓ Decrypted — Reload" : decrypted?.error ? "⚠ Retry" : "🔓 Decrypt & View"}
                    </button>
                  </div>

                  {/* Decrypted Content */}
                  {decrypted?.error && (
                    <div
                      className="mx-4 mb-4 p-3 rounded-lg"
                      style={{ background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.15)" }}
                    >
                      <p style={{ color: "var(--danger)", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                        Error: {decrypted.error}
                      </p>
                    </div>
                  )}

                  {decrypted?.content && key.dataType === "ECG_CSV" && (
                    <ECGViewer csvContent={decrypted.content} />
                  )}

                  {decrypted?.content && key.dataType === "PDF_REPORT" && (
                    <PDFViewer base64Content={decrypted.content} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-4 flex items-center justify-between" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <span style={{ color: "var(--text-dim)", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
            C.A.R.E. Patient Portal v1.0 • Ganache Blockchain Auth • IPFS Encrypted Storage
          </span>
          <span style={{ color: "var(--text-dim)", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
            ⚠ For educational purposes only
          </span>
        </footer>
      </div>
    </div>
  );
}

// ─── Login Screen Component ────────────────────────────
function LoginScreen({
  onConnect,
  isConnecting,
  error,
}: {
  onConnect: () => void;
  isConnecting: boolean;
  error: string | null;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ fontFamily: "var(--font-sans)" }}>
      {/* Ambient background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(0,255,136,0.05), transparent), radial-gradient(ellipse 40% 40% at 70% 70%, rgba(170,85,255,0.03), transparent)",
        }}
      />

      <div className="glass-card-accent p-8 w-full max-w-md animate-fade-in relative z-10">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,200,255,0.1))",
              border: "1px solid rgba(0,255,136,0.2)",
              fontSize: "28px",
            }}
          >
            🏥
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            C.A.R.E.{" "}
            <span style={{ color: "var(--accent-green)" }}>Portal</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "12px", fontFamily: "var(--font-mono)", marginTop: 8 }}>
            Secure Patient Data Access
          </p>
        </div>

        {/* Info box */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: "rgba(0,200,255,0.05)", border: "1px solid rgba(0,200,255,0.1)" }}
        >
          <p style={{ color: "var(--accent-blue)", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 600, marginBottom: 6 }}>
            How it works:
          </p>
          <ul style={{ color: "var(--text-muted)", fontSize: "11px", fontFamily: "var(--font-mono)", margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
            <li>Connect your Ganache wallet via MetaMask</li>
            <li>Your encrypted records are fetched from IPFS</li>
            <li>Decryption keys are retrieved from the Key DB</li>
            <li>Data is decrypted client-side in your browser</li>
          </ul>
        </div>

        {/* Connect Button */}
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="w-full py-3.5 rounded-xl transition-all font-bold"
          style={{
            background: isConnecting ? "rgba(255,255,255,0.1)" : "var(--accent-green)",
            color: isConnecting ? "var(--text-muted)" : "var(--bg-primary)",
            fontSize: "13px",
            fontFamily: "var(--font-mono)",
            border: "none",
            cursor: isConnecting ? "wait" : "pointer",
            boxShadow: isConnecting ? "none" : "0 0 20px rgba(0,255,136,0.2)",
          }}
        >
          {isConnecting ? "Connecting..." : "🔗 Connect Wallet (Ganache)"}
        </button>

        {error && (
          <div
            className="mt-4 p-3 rounded-lg"
            style={{ background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.15)" }}
          >
            <p style={{ color: "var(--danger)", fontSize: "11px", fontFamily: "var(--font-mono)", margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        <p
          className="text-center mt-6"
          style={{ color: "var(--text-dim)", fontSize: "10px", fontFamily: "var(--font-mono)" }}
        >
          Ensure MetaMask is connected to your local Ganache network (RPC: http://127.0.0.1:7545)
        </p>
      </div>
    </div>
  );
}

// ─── ECG CSV Viewer Component ──────────────────────────
function ECGViewer({ csvContent }: { csvContent: string }) {
  const lines = csvContent.split("\n").filter(Boolean);
  const header = lines[0];
  const rows = lines.slice(1, 51); // Show first 50 rows

  return (
    <div className="mx-4 mb-4">
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--border-subtle)" }}
      >
        <div className="p-3" style={{ background: "rgba(0,255,136,0.03)", borderBottom: "1px solid var(--border-subtle)" }}>
          <span style={{ color: "var(--accent-green)", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            ECG DATA — CSV PREVIEW ({lines.length - 1} rows total)
          </span>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: "300px", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {header.split(",").map((col, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      color: "var(--text-secondary)",
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      background: "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid var(--border-subtle)",
                      position: "sticky",
                      top: 0,
                    }}
                  >
                    {col.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.split(",").map((cell, j) => (
                    <td
                      key={j}
                      style={{
                        padding: "6px 12px",
                        color: "var(--text-muted)",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        borderBottom: "1px solid rgba(255,255,255,0.02)",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lines.length - 1 > 50 && (
          <div className="p-2 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
            <span style={{ color: "var(--text-dim)", fontSize: "10px", fontFamily: "var(--font-mono)" }}>
              Showing 50 of {lines.length - 1} rows
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PDF Viewer Component ──────────────────────────────
function PDFViewer({ base64Content }: { base64Content: string }) {
  const pdfUrl = `data:application/pdf;base64,${base64Content}`;

  return (
    <div className="mx-4 mb-4">
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>
        <div className="p-3" style={{ background: "rgba(170,85,255,0.03)", borderBottom: "1px solid var(--border-subtle)" }}>
          <span style={{ color: "var(--accent-purple)", fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            PDF REPORT — DECRYPTED VIEW
          </span>
        </div>
        <div style={{ height: "500px" }}>
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            style={{ border: "none", background: "#1a1a2e" }}
            title="Decrypted PDF Report"
          />
        </div>
      </div>
    </div>
  );
}
