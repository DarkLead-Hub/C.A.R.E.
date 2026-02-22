<?php

/**
 * Patient Sync Service.
 * Creates and updates patient folders and manifest.json in IPFS MFS.
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

namespace OpenEMR\Modules\BlockchainIngestion\Service;

use OpenEMR\Common\Uuid\UuidRegistry;

class PatientSyncService
{
    private const BASE_PATH = '/openemr/patients';

    public function __construct(
        private readonly IpfsService $ipfs,
        private readonly ?BlockchainService $blockchain = null
    ) {
    }

    /**
     * Called when a new patient is created.
     * Creates the patient folder and writes the initial manifest.json.
     *
     * @param array $patientData The patient_data row
     */
    public function onPatientCreated(array $patientData): void
    {
        try {
            $uuid = $this->resolveUuid($patientData);
            if (empty($uuid)) {
                error_log('[BlockchainIngestion] Cannot sync patient: no UUID found');
                return;
            }

            $patientPath = self::BASE_PATH . '/' . $uuid;
            $docsPath = $patientPath . '/documents';

            // Create directory structure
            $this->ipfs->mkdir($patientPath);
            $this->ipfs->mkdir($docsPath);

            // Build and write manifest
            $manifest = $this->buildManifest($uuid, $patientData);
            $manifestJson = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

            $this->ipfs->writeFile($patientPath . '/manifest.json', $manifestJson, 'manifest.json');

            // Record the registration transaction on-chain
            if ($this->blockchain) {
                $this->blockchain->recordTransaction(
                    $this->blockchain->getCurrentUserRole(),
                    '', // stealth — no patient address on-chain
                    $patientPath . '/manifest.json',
                    hash('sha256', $manifestJson),
                    BlockchainService::CATEGORY_REGISTRATION
                );
            }

            error_log("[BlockchainIngestion] Patient created synced to IPFS + blockchain: {$uuid}");
        } catch (\Throwable $e) {
            error_log("[BlockchainIngestion] Error syncing patient creation: " . $e->getMessage());
        }
    }

    /**
     * Called when a patient is updated.
     * Reads the existing manifest, updates demographics, and rewrites.
     *
     * @param array|mixed $oldData Data before update
     * @param array|mixed $newData Data after update
     */
    public function onPatientUpdated($oldData, $newData): void
    {
        try {
            // newData could be an array or a ProcessingResult data array
            $patientData = is_array($newData) ? $newData : [];
            if (empty($patientData)) {
                error_log('[BlockchainIngestion] Patient update: no new data to sync');
                return;
            }

            // If it's a nested array (from ProcessingResult), unwrap
            if (isset($patientData[0]) && is_array($patientData[0])) {
                $patientData = $patientData[0];
            }

            $uuid = $this->resolveUuid($patientData);
            if (empty($uuid)) {
                error_log('[BlockchainIngestion] Cannot sync patient update: no UUID found');
                return;
            }

            $patientPath = self::BASE_PATH . '/' . $uuid;
            $manifestPath = $patientPath . '/manifest.json';

            // Try to read existing manifest
            $existingJson = $this->ipfs->readFile($manifestPath);
            if ($existingJson !== false) {
                $manifest = json_decode($existingJson, true);
                if (!is_array($manifest)) {
                    $manifest = $this->buildManifest($uuid, $patientData);
                } else {
                    // Update demographics
                    $manifest['demographics'] = $this->extractDemographics($patientData);
                    $manifest['updated_at'] = date('c');
                }
            } else {
                // Manifest doesn't exist yet — create from scratch
                $this->ipfs->mkdir($patientPath);
                $this->ipfs->mkdir($patientPath . '/documents');
                $manifest = $this->buildManifest($uuid, $patientData);
            }

            $manifestJson = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            $this->ipfs->writeFile($manifestPath, $manifestJson, 'manifest.json');

            error_log("[BlockchainIngestion] Patient updated synced to IPFS: {$uuid}");
        } catch (\Throwable $e) {
            error_log("[BlockchainIngestion] Error syncing patient update: " . $e->getMessage());
        }
    }

    /**
     * Append a document entry to the patient's manifest.
     *
     * @param string $patientUuid
     * @param array  $documentEntry  {document_id, filename, mimetype, category, ipfs_path, sha3_hash, uploaded_at}
     */
    public function appendDocumentToManifest(string $patientUuid, array $documentEntry): void
    {
        $patientPath = self::BASE_PATH . '/' . $patientUuid;
        $manifestPath = $patientPath . '/manifest.json';

        $existingJson = $this->ipfs->readFile($manifestPath);
        if ($existingJson !== false) {
            $manifest = json_decode($existingJson, true);
            if (!is_array($manifest)) {
                $manifest = [
                    'patient_uuid' => $patientUuid,
                    'pid' => null,
                    'demographics' => [],
                    'documents' => [],
                    'created_at' => date('c'),
                    'updated_at' => date('c'),
                ];
            }
        } else {
            // Create directories if they don't exist
            $this->ipfs->mkdir($patientPath);
            $this->ipfs->mkdir($patientPath . '/documents');
            $manifest = [
                'patient_uuid' => $patientUuid,
                'pid' => null,
                'demographics' => [],
                'documents' => [],
                'created_at' => date('c'),
                'updated_at' => date('c'),
            ];
        }

        $manifest['documents'][] = $documentEntry;
        $manifest['updated_at'] = date('c');

        $manifestJson = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $this->ipfs->writeFile($manifestPath, $manifestJson, 'manifest.json');
    }

    /**
     * Get the IPFS base path for a patient's documents folder.
     */
    public function getPatientDocumentsPath(string $uuid): string
    {
        return self::BASE_PATH . '/' . $uuid . '/documents';
    }

    /**
     * Build the initial manifest structure from patient data.
     */
    private function buildManifest(string $uuid, array $patientData): array
    {
        return [
            'patient_uuid' => $uuid,
            'pid' => $patientData['pid'] ?? null,
            'demographics' => $this->extractDemographics($patientData),
            'documents' => [],
            'created_at' => date('c'),
            'updated_at' => date('c'),
        ];
    }

    /**
     * Extract a structured demographics array from patient_data fields.
     */
    private function extractDemographics(array $data): array
    {
        return [
            'title' => $data['title'] ?? '',
            'first_name' => $data['fname'] ?? '',
            'middle_name' => $data['mname'] ?? '',
            'last_name' => $data['lname'] ?? '',
            'dob' => $data['DOB'] ?? '',
            'sex' => $data['sex'] ?? '',
            'email' => $data['email'] ?? ($data['email_direct'] ?? ''),
            'phone_home' => $data['phone_home'] ?? '',
            'phone_cell' => $data['phone_cell'] ?? '',
            'phone_biz' => $data['phone_biz'] ?? '',
            'street' => $data['street'] ?? '',
            'street_line_2' => $data['street_line_2'] ?? '',
            'city' => $data['city'] ?? '',
            'state' => $data['state'] ?? '',
            'postal_code' => $data['postal_code'] ?? '',
            'country_code' => $data['country_code'] ?? '',
            'ss' => $data['ss'] ?? '',
            'race' => $data['race'] ?? '',
            'ethnicity' => $data['ethnicity'] ?? '',
            'language' => $data['language'] ?? '',
            'status' => $data['status'] ?? '',
            'reg_date' => $data['regdate'] ?? '',
        ];
    }

    /**
     * Resolve a patient UUID string from various data formats.
     */
    private function resolveUuid(array $patientData): ?string
    {
        // UUID may be a binary string or already formatted
        if (!empty($patientData['uuid'])) {
            $uuid = $patientData['uuid'];
            // If it looks like a formatted UUID (contains dashes), use as-is
            if (is_string($uuid) && str_contains($uuid, '-')) {
                return $uuid;
            }
            // Otherwise convert from binary
            try {
                return UuidRegistry::uuidToString($uuid);
            } catch (\Throwable $e) {
                error_log("[BlockchainIngestion] UUID conversion error: " . $e->getMessage());
            }
        }

        // Fallback: lookup by pid
        if (!empty($patientData['pid'])) {
            try {
                $uuidBinary = \OpenEMR\Services\PatientService::getUuidById(
                    $patientData['pid'],
                    'patient_data',
                    'pid'
                );
                if ($uuidBinary) {
                    return UuidRegistry::uuidToString($uuidBinary);
                }
            } catch (\Throwable $e) {
                error_log("[BlockchainIngestion] UUID lookup error: " . $e->getMessage());
            }
        }

        return null;
    }
}
