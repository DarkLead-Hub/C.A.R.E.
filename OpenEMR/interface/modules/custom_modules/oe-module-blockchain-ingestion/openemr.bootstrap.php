<?php

/**
 * Bootstrap for Blockchain Ingestion Module.
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

namespace OpenEMR\Modules\BlockchainIngestion;

/**
 * @global OpenEMR\Core\ModulesClassLoader $classLoader
 */
$classLoader->registerNamespaceIfNotExists('OpenEMR\\Modules\\BlockchainIngestion\\', __DIR__ . DIRECTORY_SEPARATOR . 'src');

/**
 * @global \Symfony\Component\EventDispatcher\EventDispatcherInterface $eventDispatcher
 * Injected by the OpenEMR module loader
 */
$bootstrap = new Bootstrap($eventDispatcher);
$bootstrap->subscribeToEvents();
