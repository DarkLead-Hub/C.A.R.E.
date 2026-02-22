<?php

/**
 * Document Sync Service.
 * Uploads patient documents to IPFS and updates the patient manifest.
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

namespace OpenEMR\Modules\BlockchainIngestion\Service;

use OpenEMR\Common\Uuid\UuidRegistry;
use OpenEMR\Events\PatientDocuments\PatientDocumentStoreOffsite;

class DocumentSyncService
{
    public function __construct(
        private readonly IpfsService $ipfs,
        private readonly PatientSyncService $patientSync,
        private readonly ?BlockchainService $blockchain = null
    ) {
    }

    /**
     * Called when a document is stored.
     * Uploads the file to IPFS under the patient's documents folder and
     * appends the document entry to the patient's manifest.json.
     *
     * @param PatientDocumentStoreOffsite $event
     */
    public function onDocumentCreated(PatientDocumentStoreOffsite $event): void
    {
        try {
            $fileData = $event->getData();
            $patientId = $event->getPatientId();
            $filename = $event->getRemoteFileName();
            $mimetype = $event->getRemoteMimeType();
            $category = $event->getRemoteCategory();

            if (empty($patientId) || empty($fileData)) {
                error_log('[BlockchainIngestion] Document event missing patient ID or file data');
                return;
            }

            // Resolve patient UUID from pid
            $patientUuid = $this->resolvePatientUuid($patientId);
            if (empty($patientUuid)) {
                error_log("[BlockchainIngestion] Cannot resolve UUID for patient ID: {$patientId}");
                return;
            }

            // Sanitize the filename for IPFS path
            $safeFilename = $this->sanitizeFilename($filename);
            $timestamp = date('Ymd_His');
            $ipfsFilename = $timestamp . '_' . $safeFilename;

            // Build the IPFS path
            $docsPath = $this->patientSync->getPatientDocumentsPath($patientUuid);
            $ipfsFilePath = $docsPath . '/' . $ipfsFilename;

            // Ensure directory structure exists
            $this->ipfs->mkdir($docsPath);

            // Upload the file
            $uploadOk = $this->ipfs->writeFile($ipfsFilePath, $fileData, $ipfsFilename);
            if (!$uploadOk) {
                error_log("[BlockchainIngestion] Failed to upload document to IPFS: {$ipfsFilePath}");
                return;
            }

            // Resolve category name
            $categoryName = $this->resolveCategoryName($category);

            // Build document entry for manifest
            $documentEntry = [
                'document_id' => $timestamp . '_' . $patientId,
                'filename' => $filename,
                'mimetype' => $mimetype,
                'category' => $categoryName,
                'ipfs_path' => $ipfsFilePath,
                'sha3_hash' => hash('sha3-512', $fileData),
                'size_bytes' => strlen($fileData),
                'uploaded_at' => date('c'),
            ];

            // Append to manifest
            $this->patientSync->appendDocumentToManifest($patientUuid, $documentEntry);

            // Record the document transaction on-chain
            if ($this->blockchain) {
                $blockchainCategory = BlockchainService::mapDocumentCategory($categoryName);
                $this->blockchain->recordTransaction(
                    $this->blockchain->getCurrentUserRole(),
                    '', // stealth — no patient address on-chain
                    $ipfsFilePath,
                    hash('sha256', $fileData),
                    $blockchainCategory
                );
            }

            error_log("[BlockchainIngestion] Document synced to IPFS + blockchain: {$ipfsFilePath} for patient {$patientUuid}");
        } catch (\Throwable $e) {
            error_log("[BlockchainIngestion] Error syncing document: " . $e->getMessage());
        }
    }

    /**
     * Resolve patient UUID from a patient ID (pid).
     */
    private function resolvePatientUuid(string|int $patientId): ?string
    {
        try {
            $uuidBinary = \OpenEMR\Services\PatientService::getUuidById(
                $patientId,
                'patient_data',
                'pid'
            );
            if ($uuidBinary) {
                return UuidRegistry::uuidToString($uuidBinary);
            }
        } catch (\Throwable $e) {
            error_log("[BlockchainIngestion] UUID resolution error: " . $e->getMessage());
        }
        return null;
    }

    /**
     * Resolve a category name from a category ID.
     */
    private function resolveCategoryName(mixed $categoryId): string
    {
        if (empty($categoryId)) {
            return 'Uncategorized';
        }

        try {
            $row = sqlQuery("SELECT name FROM categories WHERE id = ?", [$categoryId]);
            return $row['name'] ?? 'Category_' . $categoryId;
        } catch (\Throwable $e) {
            return 'Category_' . $categoryId;
        }
    }

    /**
     * Sanitize a filename for safe IPFS usage.
     */
    private function sanitizeFilename(string $filename): string
    {
        // Replace spaces and special chars with underscores
        $safe = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename);
        // Collapse multiple underscores
        $safe = preg_replace('/_+/', '_', $safe);
        return $safe ?: 'unnamed_file';
    }
}
