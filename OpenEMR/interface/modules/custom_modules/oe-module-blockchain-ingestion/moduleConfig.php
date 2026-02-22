<?php

/**
 * Config Module.
 * Called by Module Manager.
 *
 * @package   OpenEMR Module
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

use OpenEMR\Core\ModulesClassLoader;

require_once dirname(__FILE__, 4) . '/globals.php';

$classLoader = new ModulesClassLoader($GLOBALS['fileroot']);
$classLoader->registerNamespaceIfNotExists("OpenEMR\\Modules\\BlockchainIngestion\\", __DIR__ . DIRECTORY_SEPARATOR . 'src');

$module_config = 1;

exit;
