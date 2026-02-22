<?php
// Comprehensive auth test — run inside the OpenEMR container
$pdo = new PDO('mysql:host=mysql;dbname=openemr', 'openemr', 'openemr');
$username = 'receptionist';
$password = 'Recept@12345678!';

echo "=== Auth Debug for '$username' ===\n\n";

// 1. Check users table
$stmt = $pdo->prepare("SELECT id, username, active, authorized FROM users WHERE BINARY username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
echo "1. users table: " . ($user ? "FOUND (id={$user['id']}, active={$user['active']}, authorized={$user['authorized']})" : "NOT FOUND") . "\n";

// 2. Check users_secure table  
$stmt = $pdo->prepare("SELECT id, username, password FROM users_secure WHERE BINARY username = ?");
$stmt->execute([$username]);
$secure = $stmt->fetch(PDO::FETCH_ASSOC);
echo "2. users_secure: " . ($secure ? "FOUND (id={$secure['id']}, hash_len=" . strlen($secure['password']) . ", hash_prefix=" . substr($secure['password'], 0, 10) . ")" : "NOT FOUND") . "\n";

// 3. Verify password
if ($secure) {
    $verified = password_verify($password, $secure['password']);
    echo "3. password_verify: " . ($verified ? "PASS" : "FAIL") . "\n";
} else {
    echo "3. password_verify: SKIP (no secure entry)\n";
}

// 4. Check groups table
$stmt = $pdo->prepare("SELECT id, name FROM `groups` WHERE user = ?");
$stmt->execute([$username]);
$group = $stmt->fetch(PDO::FETCH_ASSOC);
echo "4. groups table: " . ($group ? "FOUND (group='{$group['name']}')" : "NOT FOUND") . "\n";

// 5. Check gacl_aro
$stmt = $pdo->prepare("SELECT id, section_value, value FROM gacl_aro WHERE value = ?");
$stmt->execute([$username]);
$aro = $stmt->fetch(PDO::FETCH_ASSOC);
echo "5. gacl_aro: " . ($aro ? "FOUND (id={$aro['id']}, section={$aro['section_value']})" : "NOT FOUND") . "\n";

// 6. Check gacl_groups_aro_map
if ($aro) {
    $stmt = $pdo->prepare("SELECT gm.group_id, g.name FROM gacl_groups_aro_map gm JOIN gacl_aro_groups g ON g.id = gm.group_id WHERE gm.aro_id = ?");
    $stmt->execute([$aro['id']]);
    $aclGroup = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "6. ACL group mapping: " . ($aclGroup ? "FOUND (group_id={$aclGroup['group_id']}, name='{$aclGroup['name']}')" : "NOT FOUND") . "\n";
} else {
    echo "6. ACL group mapping: SKIP (no ARO)\n";
}

// 7. Compare with admin
echo "\n=== Admin reference ===\n";
$stmt = $pdo->prepare("SELECT id, password FROM users_secure WHERE username = 'admin'");
$stmt->execute();
$admin = $stmt->fetch(PDO::FETCH_ASSOC);
echo "admin hash prefix: " . substr($admin['password'], 0, 10) . " len=" . strlen($admin['password']) . "\n";
echo "admin password_verify('pass'): " . (password_verify('pass', $admin['password']) ? "PASS" : "FAIL") . "\n";

$stmt = $pdo->prepare("SELECT id FROM gacl_aro WHERE value = 'admin'");
$stmt->execute();
$adminAro = $stmt->fetch(PDO::FETCH_ASSOC);
$stmt = $pdo->prepare("SELECT gm.group_id FROM gacl_groups_aro_map gm WHERE gm.aro_id = ?");
$stmt->execute([$adminAro['id']]);
$adminGroup = $stmt->fetch(PDO::FETCH_ASSOC);
echo "admin ACL group: " . ($adminGroup ? "group_id={$adminGroup['group_id']}" : "NOT FOUND") . "\n";
