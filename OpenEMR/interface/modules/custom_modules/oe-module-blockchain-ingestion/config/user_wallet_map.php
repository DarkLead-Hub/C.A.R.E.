<?php

/**
 * User-to-Wallet Role Mapping.
 *
 * Maps OpenEMR usernames to blockchain wallet addresses and roles.
 * The BIM module reads this at runtime to determine which wallet
 * should sign transactions for the currently logged-in user.
 *
 * @package   OpenEMR
 * @link      http://www.open-emr.org
 */

return [
    // OpenEMR username => blockchain role config
    'admin' => [
        'blockchain_role' => 'hospital',
        'wallet_address' => '0xA8e52aB1e18b6Ce9E95934870c2B384444c62f62',
        'description' => 'Hospital Admin',
    ],
    'doctor' => [
        'blockchain_role' => 'doctor',
        'wallet_address' => '0x9804224B430991252AcAc78227c3e9882aa20862',
        'description' => 'Doctor',
    ],
    'nurse' => [
        'blockchain_role' => 'nurse',
        'wallet_address' => '0xE154A43DB256E5714886B376FD001a04271F8Ab0',
        'description' => 'Nurse',
    ],
    'receptionist' => [
        'blockchain_role' => 'receptionist',
        'wallet_address' => '0xf6F24FBBb54d31Ae86E3D1DaC8b53dC397eFF332',
        'description' => 'Receptionist',
    ],
];
