<?php

/**
 * Patient Updated Listener.
 * Listens for the patient.updated event and syncs updated data to IPFS.
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

namespace OpenEMR\Modules\BlockchainIngestion\Listener;

use OpenEMR\Events\Patient\PatientUpdatedEvent;
use OpenEMR\Modules\BlockchainIngestion\Service\PatientSyncService;

class PatientUpdatedListener
{
    public function __construct(
        private readonly PatientSyncService $patientSyncService
    ) {
    }

    /**
     * Handle the patient.updated event.
     *
     * @param PatientUpdatedEvent $event
     */
    public function onPatientUpdated(PatientUpdatedEvent $event): void
    {
        $oldData = $event->getDataBeforeUpdate();
        $newData = $event->getNewPatientData();
        error_log('[BlockchainIngestion] PatientUpdatedEvent received');
        $this->patientSyncService->onPatientUpdated($oldData, $newData);
    }
}
