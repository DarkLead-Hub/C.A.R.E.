import { useState, useCallback, useRef, useEffect } from "react";
import type { ECGDataPoint } from "./use-serial";

// Ganache wallet addresses for patient selection
const GANACHE_PATIENTS: { name: string; wallet: string }[] = [
    { name: "Patient A", wallet: "0x27CBc2C8d76b435dE587502b637806Be98171553" },
    { name: "Patient B", wallet: "0xbc27b202d9235886e25A875D23B734F5Bca20b4C" },
];

// Patient Portal Key DB URL
const KEY_DB_URL = "http://localhost:3001/api/keys";

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
    const [patients, setPatients] = useState<string[]>(
        GANACHE_PATIENTS.map((p) => `${p.name} (${p.wallet.slice(0, 6)}...${p.wallet.slice(-4)})`)
    );
    const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
    const [isLoadingPatients, setIsLoadingPatients] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

    // Get the wallet address for the currently selected patient
    const getSelectedWallet = useCallback((): string | null => {
        if (!selectedPatient) return null;
        const patient = GANACHE_PATIENTS.find(
            (p) => `${p.name} (${p.wallet.slice(0, 6)}...${p.wallet.slice(-4)})` === selectedPatient
        );
        return patient?.wallet || null;
    }, [selectedPatient]);

    const fetchPatients = useCallback(async () => {
        // Patients are loaded from the hardcoded Ganache accounts
        setIsLoadingPatients(true);
        setPatients(
            GANACHE_PATIENTS.map((p) => `${p.name} (${p.wallet.slice(0, 6)}...${p.wallet.slice(-4)})`)
        );
        setIsLoadingPatients(false);
    }, []);

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
            const fileName = `ecg_${timestamp}.csv.enc`;
            const walletAddr = getSelectedWallet();
            const mfsPath = `/openemr/patients/${walletAddr}/${fileName}`;

            try {
                // 1. Buffer to CSV
                const csvRows = ['timestamp,value,leadOff'];
                for (const point of data) {
                    csvRows.push(`${point.timestamp},${point.value},${point.leadOff}`);
                }
                const csvString = csvRows.join('\n');

                // 2. Generate AES-256 Key
                const key = await window.crypto.subtle.generateKey(
                    { name: 'AES-GCM', length: 256 },
                    true,
                    ['encrypt', 'decrypt']
                );

                // 3. Encrypt the CSV
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const encoder = new TextEncoder();
                const encodedData = encoder.encode(csvString);
                const encryptedBuffer = await window.crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv },
                    key,
                    encodedData
                );

                // Prepend IV to encrypted data
                const encryptedDataArray = new Uint8Array(encryptedBuffer);
                const combinedData = new Uint8Array(iv.length + encryptedDataArray.length);
                combinedData.set(iv);
                combinedData.set(encryptedDataArray, iv.length);

                const blob = new Blob([combinedData], { type: 'application/octet-stream' });

                // Export key for database storage
                const exportedKey = await window.crypto.subtle.exportKey('raw', key);
                const keyHex = Array.from(new Uint8Array(exportedKey)).map(b => b.toString(16).padStart(2, '0')).join('');

                // 4. Upload to IPFS MFS
                const formData = new FormData();
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
                console.log("Generated AES Key (Hex):", keyHex);

                // 5. Register the encryption key in the Patient Portal Key DB
                if (cid) {
                    try {
                        const keyDbRes = await fetch(KEY_DB_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                walletAddress: walletAddr || selectedPatient,
                                ipfsCid: cid,
                                aesKeyHex: keyHex,
                                dataType: "ECG_CSV",
                            }),
                        });
                        if (keyDbRes.ok) {
                            console.log("Key registered in Patient Portal DB");
                        } else {
                            console.warn("Key registration failed:", await keyDbRes.text());
                        }
                    } catch (keyErr) {
                        console.warn("Could not reach Patient Portal Key DB:", keyErr);
                    }
                }

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
        [selectedPatient, getSelectedWallet]
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
