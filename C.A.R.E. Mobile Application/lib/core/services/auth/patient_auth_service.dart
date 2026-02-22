import 'package:health_wallet/core/config/constants/app_constants.dart';
import 'package:health_wallet/core/services/blockchain/care_x_wallet_service.dart';
import 'package:injectable/injectable.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Credential database that mirrors care-x/patient-dashboard-app/config/auth-config.ts.
const _authDb = <String, _PatientCred>{
  'patient@care.x': _PatientCred(
    password: 'password123',
    account: CareXWalletAccount(
      name: 'Nandakishore V',
      walletAddress: '0xA777836eCF036cA0486C1576CC42CB8De95F8fd9',
      privateKey:
          '0xb7e10758e825011f8356335c4105c70aa5a2b6c274d364dec3e91dfda178cadc',
    ),
  ),
  'aarav@care.x': _PatientCred(
    password: 'pass123',
    account: CareXWalletAccount(
      name: 'Aarav Sharma',
      walletAddress: '0x76CD4c470fb8B7Ae3a46B222c41a30d60465BC84',
      privateKey:
          '0x147d3897bf27e4679016c613413ebefae8ee4626b1525a91ca877edae82776c7',
    ),
  ),
  'priya@care.x': _PatientCred(
    password: 'pass123',
    account: CareXWalletAccount(
      name: 'Priya Patel',
      walletAddress: '0x52B9902751905a34936A6D6FB0148fAF86dcE265',
      privateKey:
          '0x1dc890d9ea601ffdfa5c4ea0d4ac26b0048d52117d4fb2e937fffc4dbf38b40b',
    ),
  ),
};

const _kUsernameKey = 'care_x_username';

class _PatientCred {
  final String password;
  final CareXWalletAccount account;
  const _PatientCred({required this.password, required this.account});
}

/// Service that handles patient login, logout and session persistence.
///
/// Session is stored in SharedPreferences using [AppConstants] keys so it
/// is compatible with [CareXWalletService].
@lazySingleton
class PatientAuthService {
  /// Tries to log in with [username] + [password].
  ///
  /// Returns the matching [CareXWalletAccount] on success, or `null` on failure.
  Future<CareXWalletAccount?> login(String username, String password) async {
    final cred = _authDb[username.trim().toLowerCase()];
    if (cred == null || cred.password != password.trim()) return null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        AppConstants.walletAddressKey, cred.account.walletAddress);
    await prefs.setString(
        AppConstants.walletPrivateKeyKey, cred.account.privateKey);
    await prefs.setString(AppConstants.walletNameKey, cred.account.name);
    await prefs.setString(_kUsernameKey, username.trim().toLowerCase());
    return cred.account;
  }

  /// Returns the currently logged-in [CareXWalletAccount], or `null`.
  Future<CareXWalletAccount?> getCurrentAccount() async {
    final prefs = await SharedPreferences.getInstance();
    final address = prefs.getString(AppConstants.walletAddressKey);
    final key = prefs.getString(AppConstants.walletPrivateKeyKey);
    final name = prefs.getString(AppConstants.walletNameKey);
    if (address == null || key == null) return null;
    return CareXWalletAccount(
      name: name ?? 'Unknown',
      walletAddress: address,
      privateKey: key,
    );
  }

  Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey(AppConstants.walletAddressKey);
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.walletAddressKey);
    await prefs.remove(AppConstants.walletPrivateKeyKey);
    await prefs.remove(AppConstants.walletNameKey);
    await prefs.remove(_kUsernameKey);
  }

  /// Returns the full list of available patient accounts (for display).
  List<CareXWalletAccount> get availableAccounts =>
      _authDb.values.map((c) => c.account).toList();
}
