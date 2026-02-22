class AppConstants {
  static const String appName = 'HealthWallet';

  // ─── Care-X Backend (on your local machine) ───────────────────────────────
  // 10.211.171.115 is the host computer's local IP (accessible from Android device / emulator)
  static const String hostIp = '10.211.171.115';

  // EMR REST API (FastAPI running on port 8000 in care-x)
  static const String careXApiBaseUrl = 'http://$hostIp:8000/api/v1';

  // IPFS Local Gateway (to fetch advanced document metadata)
  static const String ipfsGatewayUrl = 'https://ipfs.snbhowmik.dev/ipfs/';

  // Ganache RPC (running on port 7545)
  static const String ganacheRpcUrl = 'http://$hostIp:7545';

  // Deployed smart contract address (from care-x/.env CONTRACT_ADDRESS)
  static const String contractAddress =
      '0x6EFc0ed7c0514cD4591dC6cdd36A2676B087C525';

  // Hospital Admin Address (who uploads vitals and files)
  static const String hospitalAddress =
      '0xDd46cfBee7C531F9b2182B5F0405A2aC73B1Cada';

  // Legacy base URL (keep for any internal REST calls)
  static const String baseUrl = careXApiBaseUrl;

  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
  static const String walletAddressKey = 'carex_wallet_address';
  static const String walletPrivateKeyKey = 'carex_wallet_private_key';
  static const String walletNameKey = 'carex_wallet_name';

  // Timeouts
  static const connectTimeout = Duration(minutes: 3);
  static const receiveTimeout = Duration(minutes: 3);
  static const sendTimeout = Duration(minutes: 3);

  // Pagination
  static const int pageSize = 10;

  // Cache Duration
  static const Duration cacheDuration = Duration(hours: 1);

  static const String modelUrl =
      'https://huggingface.co/google/gemma-2b-it-tflite/resolve/main/gemma-2b-it-gpu-int4.bin';
  static const String modelId = 'gemma-2b-it-gpu-int4.bin';
}
