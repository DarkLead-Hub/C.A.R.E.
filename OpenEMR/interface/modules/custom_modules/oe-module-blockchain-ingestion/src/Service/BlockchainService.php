<?php

/**
 * Blockchain Service.
 * Communicates with the API Gateway to record on-chain transactions
 * using stealth references for privacy.
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

namespace OpenEMR\Modules\BlockchainIngestion\Service;

class BlockchainService
{
    private string $apiGatewayUrl;
    private ?array $userWalletMap = null;

    /**
     * Record category constants matching the Solidity enum.
     */
    public const CATEGORY_REGISTRATION = 0;
    public const CATEGORY_VITALS = 1;
    public const CATEGORY_PRESCRIPTION = 2;
    public const CATEGORY_LAB_REPORT = 3;
    public const CATEGORY_IMAGING = 4;
    public const CATEGORY_DISCHARGE_SUMMARY = 5;
    public const CATEGORY_GENERAL_DOCUMENT = 6;

    public function __construct(?string $apiGatewayUrl = null)
    {
        $this->apiGatewayUrl = rtrim($apiGatewayUrl ?? 'http://host.docker.internal:4200', '/');
    }

    /**
     * Get the blockchain role for the currently logged-in OpenEMR user.
     * Reads from config/user_wallet_map.php and maps $_SESSION['authUser'].
     *
     * @return string Role name: hospital, doctor, nurse, receptionist
     */
    public function getCurrentUserRole(): string
    {
        $map = $this->loadWalletMap();
        $username = $_SESSION['authUser'] ?? 'admin';
        $entry = $map[$username] ?? null;

        if ($entry) {
            error_log("[BlockchainIngestion] User '{$username}' mapped to blockchain role: {$entry['blockchain_role']}");
            return $entry['blockchain_role'];
        }

        // Fallback: default to hospital admin
        error_log("[BlockchainIngestion] User '{$username}' not in wallet map — defaulting to 'hospital'");
        return 'hospital';
    }

    /**
     * Get the wallet address for the currently logged-in user.
     */
    public function getCurrentUserWalletAddress(): string
    {
        $map = $this->loadWalletMap();
        $username = $_SESSION['authUser'] ?? 'admin';
        return $map[$username]['wallet_address'] ?? '0x0000000000000000000000000000000000000000';
    }

    /**
     * Load the user-to-wallet mapping from config file (cached).
     */
    private function loadWalletMap(): array
    {
        if ($this->userWalletMap === null) {
            $configPath = __DIR__ . '/../../config/user_wallet_map.php';
            if (file_exists($configPath)) {
                $this->userWalletMap = require $configPath;
            } else {
                error_log("[BlockchainIngestion] user_wallet_map.php not found at: {$configPath}");
                $this->userWalletMap = [];
            }
        }
        return $this->userWalletMap;
    }

    /**
     * Record a medical event on the blockchain via the API gateway.
     *
     * @param string $issuerRole     Role name: hospital, doctor, nurse, receptionist
     * @param string $patientAddress Patient wallet address (or empty for stealth)
     * @param string $ipfsCid        IPFS MFS path or CID
     * @param string $metadataHash   Hash of the plaintext metadata
     * @param int    $category       Record category constant
     * @return array|false           Transaction result or false on failure
     */
    public function recordTransaction(
        string $issuerRole,
        string $patientAddress,
        string $ipfsCid,
        string $metadataHash,
        int $category = self::CATEGORY_GENERAL_DOCUMENT
    ): array|false {
        try {
            $payload = json_encode([
                'issuerRole' => $issuerRole,
                'patientAddress' => $patientAddress,
                'ipfsCid' => $ipfsCid,
                'metadataHash' => $metadataHash,
                'category' => $category,
            ]);

            // Generate a temporary JWT for internal service-to-service auth
            $token = $this->generateServiceToken();

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $this->apiGatewayUrl . '/api/blockchain/record',
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $token,
                ],
                CURLOPT_POSTFIELDS => $payload,
            ]);

            $body = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                error_log("[BlockchainIngestion][Blockchain] cURL error: {$curlError}");
                return false;
            }

            if ($httpCode >= 200 && $httpCode < 300) {
                $result = json_decode($body, true);
                error_log("[BlockchainIngestion][Blockchain] Transaction recorded: txHash={$result['transactionHash']} block={$result['blockNumber']}");
                return $result;
            }

            error_log("[BlockchainIngestion][Blockchain] Record failed: HTTP={$httpCode} Body={$body}");
            return false;
        } catch (\Throwable $e) {
            error_log("[BlockchainIngestion][Blockchain] Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get blockchain system info (contract address, roles, etc).
     */
    public function getInfo(): array|false
    {
        try {
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $this->apiGatewayUrl . '/api/blockchain/info',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 10,
            ]);
            $body = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                return json_decode($body, true);
            }
            return false;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Generate a simple internal service JWT for API gateway auth.
     */
    private function generateServiceToken(): string
    {
        // Simple JWT for service-to-service communication
        $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = $this->base64UrlEncode(json_encode([
            'sub' => 'openemr-bim-service',
            'role' => 'service',
            'iss' => 'blockchain-medical-ecosystem',
            'iat' => time(),
            'exp' => time() + 3600,
        ]));
        $signature = $this->base64UrlEncode(hash_hmac(
            'sha256',
            "{$header}.{$payload}",
            'healthwallet-blockchain-medical-ecosystem-2026',
            true
        ));
        return "{$header}.{$payload}.{$signature}";
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Map an OpenEMR document category to a blockchain record category.
     */
    public static function mapDocumentCategory(string $categoryName): int
    {
        $categoryName = strtolower($categoryName);
        return match (true) {
            str_contains($categoryName, 'lab') => self::CATEGORY_LAB_REPORT,
            str_contains($categoryName, 'prescription') || str_contains($categoryName, 'rx') => self::CATEGORY_PRESCRIPTION,
            str_contains($categoryName, 'vital') || str_contains($categoryName, 'triage') => self::CATEGORY_VITALS,
            str_contains($categoryName, 'imaging') || str_contains($categoryName, 'radiology') || str_contains($categoryName, 'xray') => self::CATEGORY_IMAGING,
            str_contains($categoryName, 'discharge') => self::CATEGORY_DISCHARGE_SUMMARY,
            default => self::CATEGORY_GENERAL_DOCUMENT,
        };
    }
}
