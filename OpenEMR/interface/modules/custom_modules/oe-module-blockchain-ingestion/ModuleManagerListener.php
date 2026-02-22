<?php

/**
 * Module Manager Listener for Blockchain Ingestion Module.
 * Handles enable, disable, unregister lifecycle actions.
 *
 * @package   OpenEMR Modules
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

use OpenEMR\Core\AbstractModuleActionListener;

class ModuleManagerListener extends AbstractModuleActionListener
{
    public function __construct()
    {
        parent::__construct();
    }

    public function moduleManagerAction($methodName, $modId, string $currentActionStatus = 'Success'): string
    {
        if (method_exists(self::class, $methodName)) {
            return self::$methodName($modId, $currentActionStatus);
        }
        return $currentActionStatus;
    }

    public static function getModuleNamespace(): string
    {
        return 'OpenEMR\\Modules\\BlockchainIngestion\\';
    }

    public static function initListenerSelf(): ModuleManagerListener
    {
        return new self();
    }

    private function enable($modId, $currentActionStatus): mixed
    {
        error_log('BlockchainIngestion module has been enabled');
        return $currentActionStatus;
    }

    private function disable($modId, $currentActionStatus): mixed
    {
        error_log('BlockchainIngestion module has been disabled');
        return $currentActionStatus;
    }

    private function unregister($modId, $currentActionStatus): mixed
    {
        error_log('BlockchainIngestion module has been unregistered');
        return $currentActionStatus;
    }
}
