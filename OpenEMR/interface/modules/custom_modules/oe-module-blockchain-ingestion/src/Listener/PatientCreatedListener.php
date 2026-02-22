<?php

/**
 * Patient Created Listener.
 * Listens for the patient.created event and syncs the new patient to IPFS.
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

namespace OpenEMR\Modules\BlockchainIngestion\Listener;

use OpenEMR\Events\Patient\PatientCreatedEvent;
use OpenEMR\Modules\BlockchainIngestion\Service\PatientSyncService;

class PatientCreatedListener
{
    public function __construct(
        private readonly PatientSyncService $patientSyncService
    ) {
    }

    /**
     * Handle the patient.created event.
     *
     * @param PatientCreatedEvent $event
     */
    public function onPatientCreated(PatientCreatedEvent $event): void
    {
        $patientData = $event->getPatientData();
        error_log('[BlockchainIngestion] PatientCreatedEvent received for pid: ' . ($patientData['pid'] ?? 'unknown'));
        $this->patientSyncService->onPatientCreated($patientData);
    }
}
