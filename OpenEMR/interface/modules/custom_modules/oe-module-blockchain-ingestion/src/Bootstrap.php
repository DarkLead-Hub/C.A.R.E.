<?php

/**
 * Bootstrap for Blockchain Ingestion Module.
 * Subscribes to OpenEMR patient and document events and syncs data to IPFS.
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

namespace OpenEMR\Modules\BlockchainIngestion;

use OpenEMR\Events\Patient\PatientCreatedEvent;
use OpenEMR\Events\Patient\PatientUpdatedEvent;
use OpenEMR\Events\PatientDocuments\PatientDocumentStoreOffsite;
use OpenEMR\Modules\BlockchainIngestion\Listener\PatientCreatedListener;
use OpenEMR\Modules\BlockchainIngestion\Listener\PatientUpdatedListener;
use OpenEMR\Modules\BlockchainIngestion\Listener\DocumentCreatedListener;
use OpenEMR\Modules\BlockchainIngestion\Service\IpfsService;
use OpenEMR\Modules\BlockchainIngestion\Service\PatientSyncService;
use OpenEMR\Modules\BlockchainIngestion\Service\DocumentSyncService;
use OpenEMR\Modules\BlockchainIngestion\Service\BlockchainService;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;

class Bootstrap
{
    private IpfsService $ipfsService;
    private BlockchainService $blockchainService;
    private PatientSyncService $patientSyncService;
    private DocumentSyncService $documentSyncService;

    public function __construct(
        private readonly EventDispatcherInterface $eventDispatcher
    ) {
        $this->ipfsService = new IpfsService();
        $this->blockchainService = new BlockchainService();
        $this->patientSyncService = new PatientSyncService($this->ipfsService, $this->blockchainService);
        $this->documentSyncService = new DocumentSyncService($this->ipfsService, $this->patientSyncService, $this->blockchainService);

        error_log('[BlockchainIngestion] Module bootstrap initialized');
    }

    /**
     * Subscribe to OpenEMR events for patient and document lifecycle.
     */
    public function subscribeToEvents(): void
    {
        // Patient created — create IPFS folder + manifest
        $patientCreatedListener = new PatientCreatedListener($this->patientSyncService);
        $this->eventDispatcher->addListener(
            PatientCreatedEvent::EVENT_HANDLE,
            [$patientCreatedListener, 'onPatientCreated']
        );

        // Patient updated — update manifest demographics
        $patientUpdatedListener = new PatientUpdatedListener($this->patientSyncService);
        $this->eventDispatcher->addListener(
            PatientUpdatedEvent::EVENT_HANDLE,
            [$patientUpdatedListener, 'onPatientUpdated']
        );

        // Document stored — upload file to IPFS + update manifest
        $documentCreatedListener = new DocumentCreatedListener($this->documentSyncService);
        $this->eventDispatcher->addListener(
            PatientDocumentStoreOffsite::REMOTE_STORAGE_LOCATION,
            [$documentCreatedListener, 'onDocumentCreated']
        );

        error_log('[BlockchainIngestion] Event subscriptions registered');
    }
}
