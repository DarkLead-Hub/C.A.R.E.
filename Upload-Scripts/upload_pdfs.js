#!/usr/bin/env node
/**
 * upload_pdfs.js
 *
 * Encrypts 3 sample PDF reports with AES-256-GCM and uploads them
 * to the IPFS cluster. It also registers the encryption keys in
 * the Patient Portal Key Database.
 *
 * Usage:
 *   node upload_pdfs.js --wallet 0xYourGanacheAddress --portal http://localhost:3000
 *
 * Requirements:
 *   - Place 3 PDF files in ./sample-reports/
 *   - IPFS node reachable at IPFS_API (default: http://10.211.171.140:5001)
 *   - Patient Portal running at PORTAL_URL (default: http://localhost:3000)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ─── Configuration ─────────────────────────────────────
const IPFS_API = process.env.IPFS_API || "https://ipfs-api.snbhowmik.dev";
const PORTAL_URL = process.env.PORTAL_URL || "http://localhost:3001";

// Parse CLI args
const args = process.argv.slice(2);
let walletAddress = "";
let portalUrl = PORTAL_URL;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--wallet" && args[i + 1]) walletAddress = args[i + 1];
  if (args[i] === "--portal" && args[i + 1]) portalUrl = args[i + 1];
}

if (!walletAddress) {
  console.error("Error: --wallet <address> is required");
  console.error("Usage: node upload_pdfs.js --wallet 0xYourGanacheAddress");
  process.exit(1);
}

// ─── Sample PDF Directory ──────────────────────────────
const REPORT_DIR = path.join(__dirname, "sample-reports");

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   C.A.R.E. PDF Report Encryptor & IPFS Uploader ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Ensure sample-reports directory exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    console.log(`Created ${REPORT_DIR}/`);
    console.log("Please place 3 PDF files in this directory and re-run.\n");

    // Create 3 placeholder PDFs for demo
    for (let i = 1; i <= 3; i++) {
      const name = `sample_report_${i}.pdf`;
      const content = generateSamplePDF(i);
      fs.writeFileSync(path.join(REPORT_DIR, name), content);
      console.log(`  Created placeholder: ${name}`);
    }
    console.log("\nPlaceholder PDFs created. Re-run to upload them.\n");
    return;
  }

  // Find PDF files
  const pdfFiles = fs
    .readdirSync(REPORT_DIR)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .slice(0, 3);

  if (pdfFiles.length === 0) {
    console.error("No PDF files found in", REPORT_DIR);
    process.exit(1);
  }

  console.log(`Wallet:  ${walletAddress}`);
  console.log(`IPFS:    ${IPFS_API}`);
  console.log(`Portal:  ${portalUrl}`);
  console.log(`Reports: ${pdfFiles.length} PDF(s)\n`);

  for (const fileName of pdfFiles) {
    console.log(`─── Processing: ${fileName} ───`);

    // 1. Read the PDF
    const filePath = path.join(REPORT_DIR, fileName);
    const pdfData = fs.readFileSync(filePath);
    console.log(`  Read ${pdfData.length} bytes`);

    // 2. Generate AES-256 key and IV
    const key = crypto.randomBytes(32); // 256-bit
    const iv = crypto.randomBytes(12); // 96-bit for GCM
    const keyHex = key.toString("hex");
    console.log(`  Generated AES key: ${keyHex.slice(0, 16)}...`);

    // 3. Encrypt with AES-256-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(pdfData), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine: IV (12) + encrypted data + authTag (16)
    // Note: Web Crypto API's AES-GCM appends the auth tag automatically,
    // so we combine IV + (encrypted + authTag) to match the browser's format
    const combined = Buffer.concat([iv, encrypted, authTag]);
    console.log(`  Encrypted: ${combined.length} bytes`);

    // 4. Upload to IPFS MFS
    const encFileName = fileName.replace(".pdf", ".pdf.enc");
    const mfsPath = `/openemr/patients/${walletAddress}/${encFileName}`;

    try {
      const FormData = (await import("form-data")).default;
      const formData = new FormData();
      formData.append("file", combined, { filename: encFileName });

      const writeUrl = `${IPFS_API}/api/v0/files/write?arg=${encodeURIComponent(mfsPath)}&create=true&parents=true&truncate=true`;

      const uploadRes = await fetch(writeUrl, {
        method: "POST",
        body: formData,
        headers: {
          ...formData.getHeaders(),
          'Origin': IPFS_API,
          'Host': new URL(IPFS_API).host,
        },
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(`Upload failed (${uploadRes.status}): ${text}`);
      }

      console.log(`  Uploaded to IPFS MFS: ${mfsPath}`);

      // 5. Get CID via files/stat
      let cid = "";
      const statRes = await fetch(
        `${IPFS_API}/api/v0/files/stat?arg=${encodeURIComponent(mfsPath)}`,
        {
          method: "POST",
          headers: {
            'Origin': IPFS_API,
            'Host': new URL(IPFS_API).host,
          },
        }
      );
      if (statRes.ok) {
        const statData = await statRes.json();
        cid = statData.Hash || "";
        console.log(`  CID: ${cid}`);
      }

      // 6. Register key in Patient Portal DB
      if (cid) {
        const keyRes = await fetch(`${portalUrl}/api/keys`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            ipfsCid: cid,
            aesKeyHex: keyHex,
            dataType: "PDF_REPORT",
          }),
        });

        if (keyRes.ok) {
          console.log(`  ✓ Key registered in Portal DB`);
        } else {
          const errText = await keyRes.text();
          console.warn(`  ⚠ Key registration failed: ${errText}`);
        }
      }

      console.log(`  ✓ Done!\n`);
    } catch (err) {
      console.error(`  ✗ Failed:`, err.message, "\n");
    }
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("All reports processed. Open Patient Portal to view.");
  console.log("═══════════════════════════════════════════════════\n");
}

// Generate a minimal valid PDF for demo purposes
function generateSamplePDF(index) {
  const titles = [
    "ECG Summary Report",
    "Blood Pressure Analysis",
    "Heart Rate Variability Report",
  ];
  const title = titles[index - 1] || `Report ${index}`;
  const date = new Date().toISOString().split("T")[0];

  // Minimal valid PDF with text content
  const content = `1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 200>>
stream
BT
/F1 24 Tf
72 700 Td
(${title}) Tj
/F1 14 Tf
0 -40 Td
(Patient Report #${index}) Tj
0 -25 Td
(Date: ${date}) Tj
0 -25 Td
(Status: Normal) Tj
0 -25 Td
(Generated by C.A.R.E. System) Tj
ET
endstream
endobj
`;

  const xref = `xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000107 00000 n 
0000000246 00000 n 
0000000313 00000 n 
`;

  const pdf = `%PDF-1.4
${content}${xref}trailer<</Size 6/Root 1 0 R>>
startxref
563
%%EOF`;

  return Buffer.from(pdf, "utf-8");
}

main().catch(console.error);
