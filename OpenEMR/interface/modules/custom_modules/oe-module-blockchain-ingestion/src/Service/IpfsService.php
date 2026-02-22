<?php

/**
 * IPFS MFS API Client.
 * Wraps cURL calls to the remote IPFS node's Mutable File System API.
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

namespace OpenEMR\Modules\BlockchainIngestion\Service;

class IpfsService
{
    private string $baseUrl;

    public function __construct(?string $baseUrl = null)
    {
        $this->baseUrl = rtrim($baseUrl ?? 'https://ipfs.snbhowmik.dev', '/');
    }

    /**
     * Create a directory in IPFS MFS (recursive, like mkdir -p).
     *
     * @param string $path The absolute MFS path, e.g. /openemr/patients/<uuid>
     * @return bool True on success
     */
    public function mkdir(string $path): bool
    {
        $url = $this->baseUrl . '/api/v0/files/mkdir?arg=' . urlencode($path) . '&parents=true';
        $response = $this->curlPost($url);
        if ($response['httpCode'] >= 200 && $response['httpCode'] < 300) {
            error_log("[BlockchainIngestion][IPFS] mkdir OK: {$path}");
            return true;
        }
        // 500 with "file already exists" is also OK
        if (strpos($response['body'], 'file already exists') !== false) {
            error_log("[BlockchainIngestion][IPFS] mkdir already exists: {$path}");
            return true;
        }
        error_log("[BlockchainIngestion][IPFS] mkdir FAILED: {$path} HTTP={$response['httpCode']} Body={$response['body']}");
        return false;
    }

    /**
     * Write content to a file in IPFS MFS.
     *
     * @param string $ipfsPath  The absolute MFS destination path, e.g. /openemr/patients/<uuid>/manifest.json
     * @param string $content   The raw file content to write
     * @param string|null $filename  Optional original filename (used for multipart form field)
     * @return bool True on success
     */
    public function writeFile(string $ipfsPath, string $content, ?string $filename = null): bool
    {
        $url = $this->baseUrl . '/api/v0/files/write?arg=' . urlencode($ipfsPath) . '&create=true&truncate=true';
        $fname = $filename ?? basename($ipfsPath);

        // Create a temp file to use with CURLFile
        $tmpFile = tempnam(sys_get_temp_dir(), 'ipfs_');
        file_put_contents($tmpFile, $content);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_POSTFIELDS => [
                'file' => new \CURLFile($tmpFile, 'application/octet-stream', $fname)
            ],
        ]);

        $body = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        // Clean up temp file
        @unlink($tmpFile);

        if ($curlError) {
            error_log("[BlockchainIngestion][IPFS] writeFile cURL error for {$ipfsPath}: {$curlError}");
            return false;
        }

        if ($httpCode >= 200 && $httpCode < 300) {
            error_log("[BlockchainIngestion][IPFS] writeFile OK: {$ipfsPath} (" . strlen($content) . " bytes)");
            return true;
        }

        error_log("[BlockchainIngestion][IPFS] writeFile FAILED: {$ipfsPath} HTTP={$httpCode} Body={$body}");
        return false;
    }

    /**
     * Read a file from IPFS MFS.
     *
     * @param string $path Absolute MFS path
     * @return string|false File contents or false on error
     */
    public function readFile(string $path): string|false
    {
        $url = $this->baseUrl . '/api/v0/files/read?arg=' . urlencode($path);
        $response = $this->curlPost($url);
        if ($response['httpCode'] >= 200 && $response['httpCode'] < 300) {
            return $response['body'];
        }
        error_log("[BlockchainIngestion][IPFS] readFile FAILED: {$path} HTTP={$response['httpCode']}");
        return false;
    }

    /**
     * Check if a path exists in IPFS MFS.
     *
     * @param string $path Absolute MFS path
     * @return bool
     */
    public function exists(string $path): bool
    {
        $url = $this->baseUrl . '/api/v0/files/stat?arg=' . urlencode($path);
        $response = $this->curlPost($url);
        return ($response['httpCode'] >= 200 && $response['httpCode'] < 300);
    }

    /**
     * Simple cURL POST helper (no file upload).
     */
    private function curlPost(string $url, array $postFields = []): array
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_POSTFIELDS => $postFields,
        ]);

        $body = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            error_log("[BlockchainIngestion][IPFS] cURL error: {$curlError}");
            return ['httpCode' => 0, 'body' => $curlError];
        }

        return ['httpCode' => $httpCode, 'body' => $body ?? ''];
    }
}
