import { RefreshCw, FolderOpen, User, AlertCircle } from "lucide-react";

interface PatientSelectorProps {
    patients: string[];
    selectedPatient: string | null;
    onSelect: (patient: string | null) => void;
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void;
}

export function PatientSelector({
    patients,
    selectedPatient,
    onSelect,
    isLoading,
    error,
    onRefresh,
}: PatientSelectorProps) {
    return (
        <div
            className="rounded-xl p-4"
            style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: `1px solid ${selectedPatient
                        ? "rgba(0, 200, 255, 0.2)"
                        : "rgba(255,255,255,0.06)"
                    }`,
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <FolderOpen
                        className="w-3.5 h-3.5"
                        style={{ color: "#00c8ff" }}
                    />
                    <span
                        style={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "11px",
                            fontFamily: "JetBrains Mono, monospace",
                            letterSpacing: "0.15em",
                            fontWeight: 600,
                        }}
                    >
                        PATIENT
                    </span>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="rounded-lg p-1.5 transition-all"
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.5 : 1,
                    }}
                    title="Refresh patient list"
                >
                    <RefreshCw
                        className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
                        style={{ color: "rgba(255,255,255,0.4)" }}
                    />
                </button>
            </div>

            {/* Error state */}
            {error && (
                <div
                    className="rounded-lg px-3 py-2 mb-3 flex items-start gap-2"
                    style={{
                        background: "rgba(255,68,68,0.1)",
                        border: "1px solid rgba(255,68,68,0.2)",
                    }}
                >
                    <AlertCircle
                        className="w-3 h-3 mt-0.5 flex-shrink-0"
                        style={{ color: "#ff6666" }}
                    />
                    <p
                        style={{
                            color: "#ff6666",
                            fontSize: "9px",
                            fontFamily: "JetBrains Mono, monospace",
                            margin: 0,
                            lineHeight: 1.4,
                        }}
                    >
                        {error}
                    </p>
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="flex items-center justify-center py-4">
                    <RefreshCw
                        className="w-5 h-5 animate-spin"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                    />
                </div>
            )}

            {/* Patient list */}
            {!isLoading && patients.length > 0 && (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {patients.map((name) => {
                        const isSelected = selectedPatient === name;
                        return (
                            <button
                                key={name}
                                onClick={() => onSelect(isSelected ? null : name)}
                                className="flex items-center gap-2 w-full rounded-lg px-3 py-2 transition-all text-left"
                                style={{
                                    background: isSelected
                                        ? "rgba(0,200,255,0.12)"
                                        : "rgba(255,255,255,0.02)",
                                    border: `1px solid ${isSelected
                                            ? "rgba(0,200,255,0.3)"
                                            : "rgba(255,255,255,0.06)"
                                        }`,
                                    cursor: "pointer",
                                }}
                            >
                                <User
                                    className="w-3 h-3 flex-shrink-0"
                                    style={{
                                        color: isSelected ? "#00c8ff" : "rgba(255,255,255,0.25)",
                                    }}
                                />
                                <span
                                    className="truncate"
                                    style={{
                                        color: isSelected
                                            ? "#00c8ff"
                                            : "rgba(255,255,255,0.6)",
                                        fontSize: "11px",
                                        fontFamily: "JetBrains Mono, monospace",
                                        fontWeight: isSelected ? 600 : 400,
                                    }}
                                    title={name}
                                >
                                    {name}
                                </span>
                                {isSelected && (
                                    <div
                                        className="w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0"
                                        style={{
                                            background: "#00c8ff",
                                            boxShadow: "0 0 6px #00c8ff",
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && patients.length === 0 && (
                <p
                    className="text-center py-3"
                    style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: "10px",
                        fontFamily: "JetBrains Mono, monospace",
                    }}
                >
                    No patient folders found
                </p>
            )}

            {/* Selected summary */}
            {selectedPatient && (
                <div
                    className="mt-3 rounded-lg px-3 py-2"
                    style={{
                        background: "rgba(0,200,255,0.05)",
                        border: "1px solid rgba(0,200,255,0.15)",
                    }}
                >
                    <p
                        style={{
                            color: "rgba(255,255,255,0.4)",
                            fontSize: "9px",
                            fontFamily: "JetBrains Mono, monospace",
                            margin: 0,
                            marginBottom: 2,
                        }}
                    >
                        UPLOAD TARGET
                    </p>
                    <p
                        className="truncate"
                        style={{
                            color: "#00c8ff",
                            fontSize: "10px",
                            fontFamily: "JetBrains Mono, monospace",
                            margin: 0,
                            fontWeight: 600,
                        }}
                        title={`/openemr/patients/${selectedPatient}/`}
                    >
                        /openemr/patients/{selectedPatient}/
                    </p>
                </div>
            )}
        </div>
    );
}
