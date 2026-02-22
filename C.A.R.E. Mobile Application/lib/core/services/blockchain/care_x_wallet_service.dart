import 'package:health_wallet/core/config/constants/app_constants.dart';
import 'package:injectable/injectable.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Represents a Care-X patient / user account holding their Ethereum wallet.
class CareXWalletAccount {
  final String name;
  final String walletAddress;
  final String privateKey;

  const CareXWalletAccount({
    required this.name,
    required this.walletAddress,
    required this.privateKey,
  });
}

/// Preset wallet accounts that map to the Ganache accounts in care-x/.env.
/// These match the mock "auth-config.ts" used in the patient-dashboard webapp.
class CareXAccounts {
  static const nandakishore = CareXWalletAccount(
    name: 'Nandakishore V',
    walletAddress: '0xA777836eCF036cA0486C1576CC42CB8De95F8fd9',
    privateKey:
        '0xb7e10758e825011f8356335c4105c70aa5a2b6c274d364dec3e91dfda178cadc',
  );

  static const aarav = CareXWalletAccount(
    name: 'Aarav Sharma',
    walletAddress: '0x76CD4c470fb8B7Ae3a46B222c41a30d60465BC84',
    privateKey:
        '0x147d3897bf27e4679016c613413ebefae8ee4626b1525a91ca877edae82776c7',
  );

  static const priya = CareXWalletAccount(
    name: 'Priya Patel',
    walletAddress: '0x52B9902751905a34936A6D6FB0148fAF86dcE265',
    privateKey:
        '0x1dc890d9ea601ffdfa5c4ea0d4ac26b0048d52117d4fb2e937fffc4dbf38b40b',
  );

  static const doctor = CareXWalletAccount(
    name: 'Doctor',
    walletAddress: '0x6a4a4ff67F3B64CF7CB5492a9F455D4703A35eE3',
    privateKey:
        '0x84fa8b67ef319b860a065d9f9ed58f19b8fe717bd9addba64ae69e7b5c2bf339',
  );

  static const List<CareXWalletAccount> all = [
    nandakishore,
    aarav,
    priya,
    doctor
  ];
}

/// Service for persisting and retrieving the currently active Care-X wallet.
@lazySingleton
class CareXWalletService {
  /// Returns the currently saved wallet or null if not configured.
  Future<CareXWalletAccount?> getCurrentWallet() async {
    final prefs = await SharedPreferences.getInstance();
    final address = prefs.getString(AppConstants.walletAddressKey);
    final privateKey = prefs.getString(AppConstants.walletPrivateKeyKey);
    final name = prefs.getString(AppConstants.walletNameKey);

    if (address == null || privateKey == null) return null;
    return CareXWalletAccount(
      name: name ?? 'Unknown',
      walletAddress: address,
      privateKey: privateKey,
    );
  }

  /// Save the active wallet to persistent storage.
  Future<void> saveWallet(CareXWalletAccount account) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.walletAddressKey, account.walletAddress);
    await prefs.setString(AppConstants.walletPrivateKeyKey, account.privateKey);
    await prefs.setString(AppConstants.walletNameKey, account.name);
  }

  /// Clear the saved wallet (for logout / account switch).
  Future<void> clearWallet() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.walletAddressKey);
    await prefs.remove(AppConstants.walletPrivateKeyKey);
    await prefs.remove(AppConstants.walletNameKey);
  }
}
