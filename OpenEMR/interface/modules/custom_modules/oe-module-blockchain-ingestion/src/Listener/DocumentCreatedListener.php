<?php

/**
 * Document Created Listener.
 * Listens for the documents.remote.storage.location event and syncs
 * uploaded documents to IPFS.
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

namespace OpenEMR\Modules\BlockchainIngestion\Listener;

use OpenEMR\Events\PatientDocuments\PatientDocumentStoreOffsite;
use OpenEMR\Modules\BlockchainIngestion\Service\DocumentSyncService;

class DocumentCreatedListener
{
    public function __construct(
        private readonly DocumentSyncService $documentSyncService
    ) {
    }

    /**
     * Handle the documents.remote.storage.location event.
     *
     * @param PatientDocumentStoreOffsite $event
     */
    public function onDocumentCreated(PatientDocumentStoreOffsite $event): void
    {
        error_log('[BlockchainIngestion] PatientDocumentStoreOffsite event received');
        $this->documentSyncService->onDocumentCreated($event);
    }
}
