import { useEffect, useState } from "react";
import { X, Check, Copy, ExternalLink } from "lucide-react";

interface UploadToastProps {
    result: {
        success: boolean;
        filePath: string;
        cid?: string;
        error?: string;
    };
    onClose: () => void;
    gatewayBaseUrl?: string;
}

export function UploadToast({
    result,
    onClose,
    gatewayBaseUrl = "http://10.211.171.140:8080",
}: UploadToastProps) {
    const [copied, setCopied] = useState<string | null>(null);

    // Auto-dismiss after 15s
    useEffect(() => {
        const timer = setTimeout(onClose, 15000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(label);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const isSuccess = result.success;

    return (
        <div
            className="fixed bottom-6 right-6 z-50 rounded-xl p-4 shadow-2xl"
            style={{
                background: "rgba(15, 23, 42, 0.97)",
                border: `1px solid ${isSuccess ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)"}`,
                backdropFilter: "blur(20px)",
                minWidth: 360,
                maxWidth: 480,
                animation: "slideUp 0.3s ease-out",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{
                            background: isSuccess
                                ? "rgba(0,255,136,0.15)"
                                : "rgba(255,68,68,0.15)",
                        }}
                    >
                        {isSuccess ? (
                            <Check className="w-3.5 h-3.5" style={{ color: "#00ff88" }} />
                        ) : (
                            <X className="w-3.5 h-3.5" style={{ color: "#ff4444" }} />
                        )}
                    </div>
                    <span
                        style={{
                            color: isSuccess ? "#00ff88" : "#ff4444",
                            fontSize: "12px",
                            fontFamily: "JetBrains Mono, monospace",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                        }}
                    >
                        {isSuccess ? "UPLOAD SUCCESSFUL" : "UPLOAD FAILED"}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-lg p-1 transition-all"
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    <X
                        className="w-4 h-4"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                    />
                </button>
            </div>

            {/* Content */}
            {isSuccess ? (
                <div className="space-y-2">
                    {/* File path */}
                    <CopyRow
                        label="MFS Path"
                        value={result.filePath}
                        onCopy={() => copyToClipboard(result.filePath, "path")}
                        isCopied={copied === "path"}
                    />

                    {/* CID */}
                    {result.cid && (
                        <CopyRow
                            label="CID"
                            value={result.cid}
                            onCopy={() => copyToClipboard(result.cid!, "cid")}
                            isCopied={copied === "cid"}
                        />
                    )}

                    {/* Gateway link */}
                    {result.cid && (
                        <div className="flex items-center gap-2 mt-2">
                            <a
                                href={`${gatewayBaseUrl}/ipfs/${result.cid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                                style={{
                                    background: "rgba(0,200,255,0.1)",
                                    border: "1px solid rgba(0,200,255,0.2)",
                                    color: "#00c8ff",
                                    fontSize: "10px",
                                    fontFamily: "JetBrains Mono, monospace",
                                    textDecoration: "none",
                                }}
                            >
                                <ExternalLink className="w-3 h-3" />
                                View on Gateway
                            </a>
                            <a
                                href="https://ipfs.snbhowmik.dev/webui/#/files"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                                style={{
                                    background: "rgba(170,85,255,0.1)",
                                    border: "1px solid rgba(170,85,255,0.2)",
                                    color: "#aa55ff",
                                    fontSize: "10px",
                                    fontFamily: "JetBrains Mono, monospace",
                                    textDecoration: "none",
                                }}
                            >
                                <ExternalLink className="w-3 h-3" />
                                Open Web UI
                            </a>
                        </div>
                    )}
                </div>
            ) : (
                <p
                    style={{
                        color: "#ff6666",
                        fontSize: "11px",
                        fontFamily: "JetBrains Mono, monospace",
                        margin: 0,
                        lineHeight: 1.5,
                    }}
                >
                    {result.error || "An unknown error occurred"}
                </p>
            )}

            {/* Slide-up animation */}
            <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
}

function CopyRow({
    label,
    value,
    onCopy,
    isCopied,
}: {
    label: string;
    value: string;
    onCopy: () => void;
    isCopied: boolean;
}) {
    return (
        <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "rgba(255,255,255,0.03)" }}
        >
            <span
                style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "10px",
                    fontFamily: "JetBrains Mono, monospace",
                    minWidth: 55,
                }}
            >
                {label}
            </span>
            <span
                className="flex-1 truncate"
                style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "11px",
                    fontFamily: "JetBrains Mono, monospace",
                    userSelect: "all",
                }}
                title={value}
            >
                {value}
            </span>
            <button
                onClick={onCopy}
                className="flex items-center gap-1 px-2 py-1 rounded transition-all"
                style={{
                    background: isCopied
                        ? "rgba(0,255,136,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isCopied ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.1)"}`,
                    color: isCopied ? "#00ff88" : "rgba(255,255,255,0.5)",
                    fontSize: "9px",
                    fontFamily: "JetBrains Mono, monospace",
                    cursor: "pointer",
                }}
            >
                {isCopied ? (
                    <>
                        <Check className="w-2.5 h-2.5" /> Copied
                    </>
                ) : (
                    <>
                        <Copy className="w-2.5 h-2.5" /> Copy
                    </>
                )}
            </button>
        </div>
    );
}
