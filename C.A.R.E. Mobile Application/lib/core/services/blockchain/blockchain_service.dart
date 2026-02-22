import 'dart:convert';
import 'package:health_wallet/core/config/constants/app_constants.dart';
import 'package:http/http.dart' as http;
import 'package:injectable/injectable.dart';

/// A health record anchored on the Ganache blockchain.
class BlockchainRecord {
  final String ipfsHash;
  final DateTime timestamp;
  final bool isCritical;
  final String deviceId;

  const BlockchainRecord({
    required this.ipfsHash,
    required this.timestamp,
    required this.isCritical,
    required this.deviceId,
  });
}

/// Calls the Ganache Ethereum node via raw JSON-RPC (eth_call) directly,
/// without depending on web3dart's generated type system.
///
/// This avoids the `EthereumAddress` import/namespace issues in web3dart 3.x and is
/// fully compatible with Ganache's HTTP API.
@lazySingleton
class BlockchainService {
  // ABI function selector for "getRecords(address)" – keccak256 first 4 bytes
  // sha3("getRecords(address)") = 0x5b69e7b4 (pre-calculated)
  static const String _getRecordsSelector = '0x5b69e7b4';

  String get _rpcUrl => AppConstants.ganacheRpcUrl;
  String get _contractAddress => AppConstants.contractAddress;

  /// Check whether the Ganache node responds.
  Future<bool> isConnected() async {
    try {
      final resp = await http
          .post(
            Uri.parse(_rpcUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'jsonrpc': '2.0',
              'method': 'eth_blockNumber',
              'params': <dynamic>[],
              'id': 1,
            }),
          )
          .timeout(const Duration(seconds: 5));
      final data = jsonDecode(resp.body) as Map<String, dynamic>;
      return data.containsKey('result');
    } catch (_) {
      return false;
    }
  }

  /// Fetch on-chain records for [patientHexAddress] by calling `getRecords(address)`
  /// using the raw eth_call JSON-RPC endpoint.
  Future<List<BlockchainRecord>> getRecordsForPatient(
      String patientHexAddress) async {
    try {
      // Pad the address to 32 bytes for ABI encoding (20 bytes right-aligned)
      final cleanAddr = patientHexAddress.toLowerCase().replaceFirst('0x', '');
      final paddedAddr = cleanAddr.padLeft(64, '0');
      final data = _getRecordsSelector + paddedAddr;

      final resp = await http
          .post(
            Uri.parse(_rpcUrl),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'jsonrpc': '2.0',
              'method': 'eth_call',
              'params': [
                {
                  'to': _contractAddress,
                  'data': data,
                },
                'latest',
              ],
              'id': 2,
            }),
          )
          .timeout(const Duration(seconds: 10));

      final body = jsonDecode(resp.body) as Map<String, dynamic>;
      if (body['error'] != null || body['result'] == null) return [];

      final hex = (body['result'] as String).replaceFirst('0x', '');
      return _decodeRecords(hex);
    } catch (_) {
      return [];
    }
  }

  /// Minimal ABI decoder for the `Record[]` tuple returned by `getRecords`.
  List<BlockchainRecord> _decodeRecords(String hex) {
    try {
      if (hex.isEmpty || hex == '0' * 64) return [];

      // The outer offset to the dynamic array (always 32 = 0x20)
      final outerOffset = int.parse(hex.substring(0, 64), radix: 16) * 2;
      // Number of elements in the array
      final count =
          int.parse(hex.substring(outerOffset, outerOffset + 64), radix: 16);
      if (count == 0) return [];

      final records = <BlockchainRecord>[];
      // Each tuple is (string ipfsHash, uint256 timestamp, bool isCritical, address deviceId)
      // Because it contains a dynamic type (string), each tuple starts with an offset.
      final tupleBase = outerOffset + 64; // after the count slot

      // Per-tuple offset slots (array of offsets, relative to the start of the array data)

      for (var i = 0; i < count; i++) {
        final tupleOffsetHex =
            hex.substring(tupleBase + i * 64, tupleBase + (i + 1) * 64);
        final tupleOffset = int.parse(tupleOffsetHex, radix: 16) * 2;
        // The tuple offset is relative to the start of the array data (after count slot)
        final tStart = outerOffset + 64 + tupleOffset;

        // Slot 0: offset to "ipfsHash" string (relative to tStart)
        final strOffsetHex = hex.substring(tStart, tStart + 64);
        final strOffset = int.parse(strOffsetHex, radix: 16) * 2;

        // Slot 1: timestamp (uint256)
        final timestampHex = hex.substring(tStart + 64, tStart + 128);
        final timestamp = int.parse(timestampHex, radix: 16);

        // Slot 2: isCritical (bool)
        final criticalHex = hex.substring(tStart + 128, tStart + 192);
        final isCritical = criticalHex.endsWith('1');

        // Slot 3: deviceId (address) – last 40 chars of the 64-char slot
        final deviceIdHex = hex.substring(tStart + 192, tStart + 256);
        final deviceId = '0x${deviceIdHex.substring(24)}';

        // Read ipfsHash string from the offset (relative to tStart)
        final strStart = tStart + strOffset;
        final strLen =
            int.parse(hex.substring(strStart, strStart + 64), radix: 16);
        final strHex = hex.substring(strStart + 64, strStart + 64 + strLen * 2);
        final ipfsHash = String.fromCharCodes(
          List.generate(strLen,
              (i) => int.parse(strHex.substring(i * 2, i * 2 + 2), radix: 16)),
        );

        records.add(BlockchainRecord(
          ipfsHash: ipfsHash,
          timestamp: DateTime.fromMillisecondsSinceEpoch(timestamp * 1000),
          isCritical: isCritical,
          deviceId: deviceId,
        ));
      }

      return records;
    } catch (_) {
      return [];
    }
  }
}
