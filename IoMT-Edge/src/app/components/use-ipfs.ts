import { useState, useCallback, useRef, useEffect } from "react";
import type { ECGDataPoint } from "./use-serial";

export interface PatientFolder {
    Name: string;
    Type: number; // 0 = file, 1 = directory
    Size: number;
    Hash: string;
}

export interface UploadResult {
    success: boolean;
    filePath: string;
    cid?: string;
    error?: string;
}

export function useIPFS() {
    const [patients, setPatients] = useState<string[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
    const [isLoadingPatients, setIsLoadingPatients] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

    const fetchPatients = useCallback(async () => {
        setIsLoadingPatients(true);
        setError(null);

        try {
            const response = await fetch(
                "/api/v0/files/ls?arg=/openemr/patients&long=true",
                { method: "POST" }
            );

            if (!response.ok) {
                if (response.status === 500) {
                    // Directory might not exist yet
                    throw new Error("Patient directory not found. Ensure /openemr/patients exists on the IPFS node.");
                }
                throw new Error(`Failed to list patients: ${response.status}`);
            }

            const data = await response.json();
            const entries: PatientFolder[] = data.Entries || [];

            // Only show directories (Type === 1) — IPFS uses PascalCase
            const folders = entries
                .filter((e) => e.Type === 1)
                .map((e) => e.Name)
                .sort();

            setPatients(folders);

            // If previously selected patient no longer exists, clear selection
            if (selectedPatient && !folders.includes(selectedPatient)) {
                setSelectedPatient(null);
            }
        } catch (err: any) {
            console.error("Failed to fetch patients from IPFS:", err);
            setError(err.message || "Failed to fetch patients");
            setPatients([]);
        } finally {
            setIsLoadingPatients(false);
        }
    }, [selectedPatient]);

    // Fetch patients on mount
    const didFetchRef = useRef(false);
    useEffect(() => {
        if (!didFetchRef.current) {
            didFetchRef.current = true;
            fetchPatients();
        }
    }, [fetchPatients]);

    const uploadECG = useCallback(
        async (data: ECGDataPoint[]): Promise<UploadResult> => {
            if (!selectedPatient) {
                const result: UploadResult = {
                    success: false,
                    filePath: "",
                    error: "No patient selected",
                };
                setUploadResult(result);
                return result;
            }

            setIsUploading(true);
            setUploadResult(null);

            const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, "-")
                .slice(0, 19);
            const fileName = `ecg_${timestamp}.json`;
            const mfsPath = `/openemr/patients/${selectedPatient}/${fileName}`;

            try {
                // Use /files/write to write directly into MFS (shows in Web UI)
                const formData = new FormData();
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                });
                formData.append("file", blob, fileName);

                const writeUrl = `/api/v0/files/write?arg=${encodeURIComponent(mfsPath)}&create=true&parents=true&truncate=true`;

                const response = await fetch(writeUrl, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(
                        `Upload failed (${response.status}): ${text || response.statusText}`
                    );
                }

                // Get the CID of the written file using files/stat
                let cid = "";
                try {
                    const statResponse = await fetch(
                        `/api/v0/files/stat?arg=${encodeURIComponent(mfsPath)}`,
                        { method: "POST" }
                    );
                    if (statResponse.ok) {
                        const statData = await statResponse.json();
                        cid = statData.Hash || "";
                    }
                } catch {
                    // stat failed, not critical
                }

                const result: UploadResult = {
                    success: true,
                    filePath: mfsPath,
                    ...(cid ? { cid } : {}),
                };

                console.log("IPFS Upload successful:", mfsPath, cid ? `CID: ${cid}` : "");
                setUploadResult(result);
                return result;
            } catch (err: any) {
                console.error("Failed to upload to IPFS:", err);
                const result: UploadResult = {
                    success: false,
                    filePath: mfsPath,
                    error: err.message || "Upload failed",
                };
                setUploadResult(result);
                return result;
            } finally {
                setIsUploading(false);
            }
        },
        [selectedPatient]
    );

    const clearUploadResult = useCallback(() => {
        setUploadResult(null);
    }, []);

    return {
        patients,
        selectedPatient,
        setSelectedPatient,
        isLoadingPatients,
        isUploading,
        error,
        uploadResult,
        fetchPatients,
        uploadECG,
        clearUploadResult,
    };
}
