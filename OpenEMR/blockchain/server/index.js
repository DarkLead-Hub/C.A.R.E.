const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ─────────────────────── Config ───────────────────────
const PORT = 4200;
const JWT_SECRET = "healthwallet-blockchain-medical-ecosystem-2026";
const configDir = path.join(__dirname, "../config");

let wallets, deployment, abi;
try {
    wallets = JSON.parse(fs.readFileSync(path.join(configDir, "wallets.json"), "utf8"));
} catch (e) {
    console.warn("⚠️  wallets.json not found, using defaults");
    wallets = { roles: {}, ipfs: { apiUrl: "https://ipfs.snbhowmik.dev" } };
}
try {
    deployment = JSON.parse(fs.readFileSync(path.join(configDir, "deployment.json"), "utf8"));
} catch (e) {
    console.warn("⚠️  deployment.json not found — deploy the contract first");
    deployment = null;
}
try {
    abi = JSON.parse(fs.readFileSync(path.join(configDir, "abi.json"), "utf8"));
} catch (e) {
    console.warn("⚠️  abi.json not found — deploy the contract first");
    abi = null;
}

const IPFS_API = wallets.ipfs?.apiUrl || "https://ipfs.snbhowmik.dev";
const RPC_URL = wallets.network?.rpcUrl || "http://127.0.0.1:7545";

// ─────────────────────── IPFS Service ───────────────────────
class IpfsService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async readFile(ipfsPath) {
        const url = `${this.baseUrl}/api/v0/files/read?arg=${encodeURIComponent(ipfsPath)}`;
        const resp = await fetch(url, { method: "POST" });
        if (!resp.ok) return null;
        return await resp.text();
    }

    async listDir(ipfsPath) {
        const url = `${this.baseUrl}/api/v0/files/ls?arg=${encodeURIComponent(ipfsPath)}&long=true`;
        const resp = await fetch(url, { method: "POST" });
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.Entries || [];
    }

    async stat(ipfsPath) {
        const url = `${this.baseUrl}/api/v0/files/stat?arg=${encodeURIComponent(ipfsPath)}`;
        const resp = await fetch(url, { method: "POST" });
        return resp.ok;
    }
}

const ipfs = new IpfsService(IPFS_API);

// ─────────────────────── Web3 Service ───────────────────────
let provider, contract;

function initWeb3() {
    if (!deployment || !abi) {
        console.warn("⚠️  Blockchain not connected — deploy the contract first");
        return;
    }
    try {
        provider = new ethers.JsonRpcProvider(RPC_URL);
        contract = new ethers.Contract(deployment.contractAddress, abi, provider);
        console.log(`⛓️  Connected to contract at ${deployment.contractAddress}`);
    } catch (e) {
        console.warn("⚠️  Could not connect to Ganache:", e.message);
    }
}

// Get a signer for a specific role
function getSignerForRole(roleName) {
    const roleInfo = wallets.roles[roleName];
    if (!roleInfo) throw new Error(`Unknown role: ${roleName}`);
    const wallet = new ethers.Wallet(roleInfo.privateKey, provider);
    return contract.connect(wallet);
}

// Compute stealth reference
function computeStealthRef(patientAddress, nonce, salt) {
    return ethers.keccak256(
        ethers.solidityPacked(
            ["address", "uint256", "bytes32"],
            [patientAddress, nonce, salt]
        )
    );
}

// ─────────────────────── Express App ───────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ─── JWT Auth Middleware ───
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid token" });
    }
    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

// ─── Generate Sync Token (for QR code flow) ───
app.post("/api/auth/token", (req, res) => {
    const { patientUuid, walletAddress, role } = req.body;
    if (!patientUuid) return res.status(400).json({ error: "patientUuid required" });

    const token = jwt.sign(
        {
            sub: patientUuid,
            role: role || "patient",
            wallet: walletAddress || "",
            full_name: `Patient ${patientUuid.substring(0, 8)}`,
            email: "",
            iss: "blockchain-medical-ecosystem",
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.json({
        token,
        server_base_urls: [`http://localhost:${PORT}`],
        sync_endpoint: "/api/resources",
    });
});

// ─── Sources Endpoint (for HealthWallet sync) ───
app.get("/api/sources", authMiddleware, async (req, res) => {
    const patientUuid = req.user.sub;
    const sources = [
        {
            id: `fasten-${patientUuid}`,
            platformName: "OpenEMR",
            labelSource: `Hospital Records - ${patientUuid.substring(0, 8)}`,
            platformType: "fasten",
            logo: "",
        },
    ];
    res.json(sources);
});

// ─── FHIR Resources Endpoint (main sync for HealthWallet) ───
app.get("/api/resources", authMiddleware, async (req, res) => {
    try {
        const patientUuid = req.user.sub;
        const manifestPath = `/openemr/patients/${patientUuid}/manifest.json`;
        const manifestJson = await ipfs.readFile(manifestPath);

        if (!manifestJson) {
            return res.json([]);
        }

        const manifest = JSON.parse(manifestJson);
        const resources = [];

        // Convert patient demographics to FHIR Patient resource
        if (manifest.demographics) {
            const d = manifest.demographics;
            resources.push({
                id: `patient-${patientUuid}`,
                source_id: `fasten-${patientUuid}`,
                source_resource_type: "Patient",
                source_resource_id: patientUuid,
                sort_title: `${d.first_name} ${d.last_name}`.trim() || "Patient",
                sort_date: manifest.created_at,
                resource_raw: {
                    resourceType: "Patient",
                    id: patientUuid,
                    name: [{ family: d.last_name, given: [d.first_name, d.middle_name].filter(Boolean) }],
                    birthDate: d.dob,
                    gender: (d.sex || "").toLowerCase() === "male" ? "male" : (d.sex || "").toLowerCase() === "female" ? "female" : "unknown",
                    telecom: [
                        d.phone_home ? { system: "phone", value: d.phone_home, use: "home" } : null,
                        d.phone_cell ? { system: "phone", value: d.phone_cell, use: "mobile" } : null,
                        d.email ? { system: "email", value: d.email } : null,
                    ].filter(Boolean),
                    address: [
                        {
                            line: [d.street, d.street_line_2].filter(Boolean),
                            city: d.city,
                            state: d.state,
                            postalCode: d.postal_code,
                            country: d.country_code,
                        },
                    ],
                },
            });
        }

        // Convert each document to FHIR DocumentReference
        if (manifest.documents) {
            for (const doc of manifest.documents) {
                resources.push({
                    id: `doc-${doc.document_id}`,
                    source_id: `fasten-${patientUuid}`,
                    source_resource_type: "DocumentReference",
                    source_resource_id: doc.document_id,
                    sort_title: doc.filename || "Document",
                    sort_date: doc.uploaded_at,
                    resource_raw: {
                        resourceType: "DocumentReference",
                        id: doc.document_id,
                        status: "current",
                        type: {
                            coding: [{ system: "http://loinc.org", display: doc.category || "Document" }],
                        },
                        subject: { reference: `Patient/${patientUuid}` },
                        date: doc.uploaded_at,
                        content: [
                            {
                                attachment: {
                                    contentType: doc.mimetype,
                                    title: doc.filename,
                                    url: `http://localhost:${PORT}/api/patient/${patientUuid}/documents/${encodeURIComponent(path.basename(doc.ipfs_path))}`,
                                },
                            },
                        ],
                        context: {
                            related: [
                                { display: `SHA3: ${doc.sha3_hash}` },
                                { display: `IPFS: ${doc.ipfs_path}` },
                            ],
                        },
                    },
                });
            }
        }

        res.json(resources);
    } catch (e) {
        console.error("Error in /api/resources:", e.message);
        res.json([]);
    }
});

// ─── Patient Manifest ───
app.get("/api/patient/:uuid", authMiddleware, async (req, res) => {
    const manifestJson = await ipfs.readFile(`/openemr/patients/${req.params.uuid}/manifest.json`);
    if (!manifestJson) return res.status(404).json({ error: "Patient not found in IPFS" });
    res.json(JSON.parse(manifestJson));
});

// ─── Patient Documents List ───
app.get("/api/patient/:uuid/documents", authMiddleware, async (req, res) => {
    const entries = await ipfs.listDir(`/openemr/patients/${req.params.uuid}/documents/`);
    res.json(entries);
});

// ─── Download Specific Document ───
app.get("/api/patient/:uuid/documents/:filename", async (req, res) => {
    const filePath = `/openemr/patients/${req.params.uuid}/documents/${req.params.filename}`;
    const content = await ipfs.readFile(filePath);
    if (!content) return res.status(404).json({ error: "Document not found" });
    res.set("Content-Type", "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${req.params.filename}"`);
    res.send(Buffer.from(content, "binary"));
});

// ─── List All Patients ───
app.get("/api/patients", authMiddleware, async (req, res) => {
    const entries = await ipfs.listDir("/openemr/patients/");
    const patients = [];
    for (const entry of entries) {
        const manifestJson = await ipfs.readFile(`/openemr/patients/${entry.Name}/manifest.json`);
        if (manifestJson) {
            try {
                const manifest = JSON.parse(manifestJson);
                patients.push({
                    uuid: entry.Name,
                    pid: manifest.pid,
                    name: `${manifest.demographics?.first_name || ""} ${manifest.demographics?.last_name || ""}`.trim(),
                    documents_count: (manifest.documents || []).length,
                    created_at: manifest.created_at,
                    updated_at: manifest.updated_at,
                });
            } catch (e) { /* skip malformed */ }
        }
    }
    res.json(patients);
});

// ─── Blockchain: Record a Transaction ───
app.post("/api/blockchain/record", authMiddleware, async (req, res) => {
    if (!contract) return res.status(503).json({ error: "Blockchain not connected" });

    try {
        const { issuerRole, patientAddress, ipfsCid, metadataHash, category } = req.body;
        if (!issuerRole || !ipfsCid) {
            return res.status(400).json({ error: "issuerRole and ipfsCid required" });
        }

        const signedContract = getSignerForRole(issuerRole);
        const nonce = await contract.getIssuerNonce(wallets.roles[issuerRole].address);
        const salt = ethers.hexlify(ethers.randomBytes(32));
        const stealthRef = computeStealthRef(
            patientAddress || ethers.ZeroAddress,
            nonce,
            salt
        );

        const categoryInt = parseInt(category) || 6; // Default: GENERAL_DOCUMENT
        let metaHash = metadataHash || ethers.keccak256(ethers.toUtf8Bytes(ipfsCid));
        if (metaHash && !metaHash.startsWith("0x")) {
            metaHash = "0x" + metaHash;
        }

        const tx = await signedContract.createMedicalRecord(
            stealthRef,
            ipfsCid,
            metaHash,
            categoryInt
        );
        const receipt = await tx.wait();

        res.json({
            success: true,
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            stealthRef,
            salt,
            gasUsed: receipt.gasUsed.toString(),
        });
    } catch (e) {
        console.error("Blockchain record error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── Blockchain: Consent ───
app.post("/api/blockchain/consent", authMiddleware, async (req, res) => {
    if (!contract) return res.status(503).json({ error: "Blockchain not connected" });

    try {
        const { action, stealthRef, providerAddress } = req.body;
        const patientContract = getSignerForRole("patient1"); // TODO: dynamic patient lookup

        let tx;
        if (action === "grant") {
            tx = await patientContract.grantConsent(stealthRef, providerAddress);
        } else if (action === "revoke") {
            tx = await patientContract.revokeConsent(stealthRef, providerAddress);
        } else {
            return res.status(400).json({ error: "action must be 'grant' or 'revoke'" });
        }

        const receipt = await tx.wait();
        res.json({
            success: true,
            action,
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        });
    } catch (e) {
        console.error("Consent error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── Blockchain: Transaction Log ───
app.get("/api/blockchain/transactions", authMiddleware, async (req, res) => {
    if (!contract) return res.status(503).json({ error: "Blockchain not connected" });

    try {
        const count = await contract.getRecordCount();
        const records = [];
        const roleNames = ["NONE", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "PATIENT"];
        const categoryNames = ["REGISTRATION", "VITALS", "PRESCRIPTION", "LAB_REPORT", "IMAGING", "DISCHARGE_SUMMARY", "GENERAL_DOCUMENT"];

        for (let i = 0; i < Math.min(Number(count), 100); i++) {
            const record = await contract.getRecord(i);
            records.push({
                id: i,
                stealthRef: record.stealthRef,
                ipfsCid: record.ipfsCid,
                metadataHash: record.metadataHash,
                issuer: record.issuer,
                issuerRole: roleNames[Number(record.issuerRole)] || "UNKNOWN",
                category: categoryNames[Number(record.category)] || "UNKNOWN",
                timestamp: new Date(Number(record.timestamp) * 1000).toISOString(),
            });
        }

        res.json({ total: Number(count), records });
    } catch (e) {
        console.error("Transactions error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── Blockchain: Contract Info ───
app.get("/api/blockchain/info", (req, res) => {
    res.json({
        contractAddress: deployment?.contractAddress || "Not deployed",
        network: wallets.network,
        roles: Object.entries(wallets.roles).map(([key, info]) => ({
            name: key,
            address: info.address,
            role: info.role,
        })),
        ipfs: wallets.ipfs,
    });
});

// ─── Health Check ───
app.get("/api/health", async (req, res) => {
    const ipfsOk = await ipfs.stat("/openemr/patients/");
    let blockchainOk = false;
    let blockNumber = 0;
    try {
        if (provider) {
            blockNumber = await provider.getBlockNumber();
            blockchainOk = true;
        }
    } catch (e) { /* offline */ }

    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
            ipfs: ipfsOk ? "connected" : "disconnected",
            blockchain: blockchainOk ? `connected (block ${blockNumber})` : "disconnected",
            contract: deployment?.contractAddress || "not deployed",
        },
    });
});

// ─────────────────────── Start ───────────────────────
initWeb3();
app.listen(PORT, () => {
    console.log(`\n🚀 Blockchain Medical Ecosystem API Gateway`);
    console.log(`   Listening on http://localhost:${PORT}`);
    console.log(`   IPFS: ${IPFS_API}`);
    console.log(`   Blockchain: ${RPC_URL}`);
    if (deployment) console.log(`   Contract: ${deployment.contractAddress}`);
    console.log(`\n📋 Endpoints:`);
    console.log(`   POST /api/auth/token          → Generate sync JWT`);
    console.log(`   GET  /api/sources              → List sync sources`);
    console.log(`   GET  /api/resources            → FHIR resources (patient sync)`);
    console.log(`   GET  /api/patients             → List all patients`);
    console.log(`   GET  /api/patient/:uuid        → Patient manifest`);
    console.log(`   GET  /api/patient/:uuid/documents  → Patient documents`);
    console.log(`   POST /api/blockchain/record    → Record on-chain transaction`);
    console.log(`   POST /api/blockchain/consent   → Grant/revoke consent`);
    console.log(`   GET  /api/blockchain/transactions  → Transaction log`);
    console.log(`   GET  /api/blockchain/info      → Contract info`);
    console.log(`   GET  /api/health               → Health check`);
});
