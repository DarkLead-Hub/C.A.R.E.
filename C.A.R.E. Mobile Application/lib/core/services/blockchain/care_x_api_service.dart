import 'dart:convert';
import 'package:health_wallet/core/config/constants/app_constants.dart';
import 'package:http/http.dart' as http;
import 'package:injectable/injectable.dart';

/// Model for a patient registered in the Care-X EMR.
class CareXPatient {
  final int id;
  final String name;
  final int age;
  final String walletAddress;

  const CareXPatient({
    required this.id,
    required this.name,
    required this.age,
    required this.walletAddress,
  });

  factory CareXPatient.fromJson(Map<String, dynamic> json) => CareXPatient(
        id: (json['id'] as num).toInt(),
        name: json['name'] as String? ?? 'Unknown',
        age: (json['age'] as num?)?.toInt() ?? 0,
        walletAddress: json['wallet_address'] as String? ?? '',
      );
}

/// Model for a vitals record from the Care-X EMR.
class CareXVitals {
  final int? id;
  final double? bpm;
  final double? spo2;
  final double? temperature;
  final String? sessionAddress;
  final String? ipfsHash;
  final bool? isCritical;
  final String? timestamp;

  const CareXVitals({
    this.id,
    this.bpm,
    this.spo2,
    this.temperature,
    this.sessionAddress,
    this.ipfsHash,
    this.isCritical,
    this.timestamp,
  });

  factory CareXVitals.fromJson(Map<String, dynamic> json) {
    // timestamp is stored as a Float (Unix epoch seconds) in SQLite
    final rawTs = json['timestamp'];
    String? timestampStr;
    if (rawTs is num) {
      timestampStr = DateTime.fromMillisecondsSinceEpoch(
        (rawTs.toDouble() * 1000).toInt(),
      ).toIso8601String();
    } else if (rawTs is String) {
      timestampStr = rawTs;
    }

    return CareXVitals(
      id: (json['id'] as num?)?.toInt(),
      bpm: (json['bpm'] as num?)?.toDouble(),
      spo2: (json['spo2'] as num?)?.toDouble(),
      temperature: (json['temperature'] as num?)?.toDouble(),
      sessionAddress: json['session_address'] as String?,
      ipfsHash: json['ipfs_hash'] as String?,
      isCritical: json['is_critical'] as bool?,
      timestamp: timestampStr,
    );
  }
}

/// Metadata pulled directly from the IPFS Gateway node
class IpfsDocumentMetadata {
  final String patientUuid;
  final String mimeType;
  final String? category;
  final String? sourceSystem;
  final String? recordHash;
  final String? fileHash;

  const IpfsDocumentMetadata({
    required this.patientUuid,
    required this.mimeType,
    this.category,
    this.sourceSystem,
    this.recordHash,
    this.fileHash,
  });

  factory IpfsDocumentMetadata.fromJson(Map<String, dynamic> json) {
    return IpfsDocumentMetadata(
      patientUuid: json['patient_uuid'] as String? ?? '',
      mimeType: json['mime_type'] as String? ?? 'application/octet-stream',
      category: json['category'] as String?,
      sourceSystem: json['source_system'] as String?,
      recordHash: json['record_hash'] as String?,
      fileHash: json['file_hash'] as String?,
    );
  }
}

/// Model for a medical document from the Care-X EMR.
/// DB schema: id, patient_wallet, file_name, description, is_secure, timestamp
class CareXDocument {
  final int id;
  final String patientWallet;
  final String documentType;
  final String? title;
  final String? ipfsHash;
  final String? timestamp;

  // Appended asynchronously from the IPFS network
  final IpfsDocumentMetadata? ipfsMetadata;

  const CareXDocument({
    required this.id,
    required this.patientWallet,
    required this.documentType,
    this.title,
    this.ipfsHash,
    this.timestamp,
    this.ipfsMetadata,
  });

  factory CareXDocument.fromJson(Map<String, dynamic> json,
      {IpfsDocumentMetadata? metadata}) {
    // Actual DB columns: file_name, description — map to our model
    final fileName = json['file_name'] as String?;
    final description = json['description'] as String?;
    // Try standard fields too for forward compatibility
    final docType =
        json['document_type'] as String? ?? fileName ?? 'medical_record';
    final title = json['title'] as String? ?? fileName ?? description;

    return CareXDocument(
      id: (json['id'] as num).toInt(),
      patientWallet: json['patient_wallet'] as String? ?? '',
      documentType: docType,
      title: title,
      ipfsHash: json['ipfs_hash'] as String?,
      timestamp: json['timestamp'] as String?,
      ipfsMetadata: metadata,
    );
  }

  CareXDocument copyWith({
    IpfsDocumentMetadata? ipfsMetadata,
  }) {
    return CareXDocument(
      id: id,
      patientWallet: patientWallet,
      documentType: documentType,
      title: title,
      ipfsHash: ipfsHash,
      timestamp: timestamp,
      ipfsMetadata: ipfsMetadata ?? this.ipfsMetadata,
    );
  }
}

/// HTTP client for the Care-X EMR FastAPI backend (http://HOST_IP:8000/api/v1).
///
/// Exposed endpoints used by this app:
/// - GET  /patients/                          → list all patients
/// - GET  /patients/by-wallet/{wallet}        → get patient by wallet
/// - GET  /patients/{id}/vitals/              → get vitals for patient
/// - GET  /patients/by-wallet/{wallet}/documents → get documents
/// - POST /documents/share                    → grant access
/// - POST /documents/revoke                   → revoke access
@lazySingleton
class CareXApiService {
  final String _base = AppConstants.careXApiBaseUrl;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
      };

  // ─── Patient endpoints ──────────────────────────────────────────────────────

  Future<List<CareXPatient>> getAllPatients() async {
    final res =
        await http.get(Uri.parse('$_base/patients/'), headers: _headers);
    _checkStatus(res);
    final data = jsonDecode(res.body) as List;
    return data
        .map((e) => CareXPatient.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CareXPatient?> getPatientByWallet(String walletAddress) async {
    try {
      final res = await http.get(
        Uri.parse('$_base/patients/by-wallet/$walletAddress'),
        headers: _headers,
      );
      if (res.statusCode == 404) return null;
      _checkStatus(res);
      return CareXPatient.fromJson(
          jsonDecode(res.body) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  // ─── Vitals endpoints ───────────────────────────────────────────────────────

  Future<List<CareXVitals>> getVitalsForPatient(int patientId) async {
    final res = await http.get(
      Uri.parse('$_base/patients/$patientId/vitals/'),
      headers: _headers,
    );
    _checkStatus(res);
    final data = jsonDecode(res.body) as List;
    return data
        .map((e) => CareXVitals.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ─── Document access endpoints ──────────────────────────────────────────────

  Future<List<CareXDocument>> getDocumentsByWallet(
    String walletAddress, {
    String? viewerWallet,
  }) async {
    final uri = Uri.parse('$_base/patients/by-wallet/$walletAddress/documents')
        .replace(
            queryParameters:
                viewerWallet != null ? {'viewer_wallet': viewerWallet} : null);
    final res = await http.get(uri, headers: _headers);
    _checkStatus(res);

    final data = jsonDecode(res.body) as List;
    final baseDocuments = data
        .map((e) => CareXDocument.fromJson(e as Map<String, dynamic>))
        .toList();

    // Concurrently fetch the metadata payload for every document that possesses an IPFS hash
    await Future.wait(baseDocuments.map((doc) async {
      if (doc.ipfsHash == null || doc.ipfsHash!.isEmpty) return;
      try {
        final ipfsUri =
            Uri.parse('${AppConstants.ipfsGatewayUrl}${doc.ipfsHash!}');
        final ipfsRes =
            await http.get(ipfsUri).timeout(const Duration(seconds: 15));
        if (ipfsRes.statusCode == 200) {
          final payload = jsonDecode(ipfsRes.body) as Map<String, dynamic>;
          final metadata = IpfsDocumentMetadata.fromJson(payload);
          // Mutate the original reference in the list with the copied object
          final index = baseDocuments.indexOf(doc);
          if (index != -1) {
            baseDocuments[index] = doc.copyWith(ipfsMetadata: metadata);
          }
        }
      } catch (e) {
        // Soft fail
      }
    }));

    // [New] Fetch standalone pinning/legacy docs from IPFS node directly
    final standaloneDocs = await _fetchStandaloneIpfsDocs(walletAddress);

    return [...baseDocuments, ...standaloneDocs];
  }

  /// Fetch standalone documents (not in EMR DB) directly from the IPFS gateway.
  Future<List<CareXDocument>> _fetchStandaloneIpfsDocs(
      String walletAddress) async {
    final docs = <CareXDocument>[];
    int syntheticId = 10000;

    const knownIpfsHashes = [
      'QmVoMg3chKUrmYo8vBoZGrAGpQqX17xkVV3Js1U5etcbEC',
      'QmeSES8Xq5ez96Th4TGXG6bFVUibkyKVoLYYjPtk7zFjqh',
    ];

    for (final hash in knownIpfsHashes) {
      try {
        final uri = Uri.parse('${AppConstants.ipfsGatewayUrl}$hash');
        final headRes =
            await http.head(uri).timeout(const Duration(seconds: 10));
        if (headRes.statusCode != 200) continue;

        final contentType = headRes.headers['content-type'] ?? '';
        final id = syntheticId++;

        if (contentType.contains('json')) {
          final res = await http.get(uri).timeout(const Duration(seconds: 15));
          if (res.statusCode == 200) {
            final payload = jsonDecode(res.body) as Map<String, dynamic>;
            final metadata = IpfsDocumentMetadata.fromJson(payload);
            docs.add(CareXDocument(
              id: id,
              patientWallet: walletAddress,
              documentType: metadata.category ?? 'medical_record',
              title:
                  '${metadata.category ?? 'Document'} — ${metadata.sourceSystem ?? 'Unknown'}',
              ipfsHash: hash,
              timestamp: payload['timestamp'] as String? ??
                  DateTime.now().toIso8601String(),
              ipfsMetadata: metadata,
            ));
          }
        } else {
          String label = 'Document';
          if (contentType.contains('pdf')) {
            label = 'PDF Document';
          } else if (contentType.contains('image')) {
            label = 'Medical Image';
          }

          docs.add(CareXDocument(
            id: id,
            patientWallet: walletAddress,
            documentType: label,
            title: label,
            ipfsHash: hash,
            timestamp: DateTime.now().toIso8601String(),
            ipfsMetadata: IpfsDocumentMetadata(
              patientUuid: '',
              mimeType: contentType,
              category: label,
              sourceSystem: 'IPFS',
            ),
          ));
        }
      } catch (_) {}
    }

    return docs;
  }

  /// Grant [recipientWallet] access to [docIds].
  Future<void> shareDocuments({
    required List<int> docIds,
    required String recipientWallet,
  }) async {
    final res = await http.post(
      Uri.parse('$_base/documents/share'),
      headers: _headers,
      body: jsonEncode({
        'doc_ids': docIds,
        'recipient_wallet': recipientWallet,
      }),
    );
    _checkStatus(res);
  }

  /// Revoke access for [recipientWallet] to ALL documents.
  Future<void> revokeDocumentAccess(String recipientWallet) async {
    final res = await http.post(
      Uri.parse('$_base/documents/revoke'),
      headers: _headers,
      body: jsonEncode({
        'recipient_wallet': recipientWallet,
        'doc_ids': <int>[],
      }),
    );
    _checkStatus(res);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  void _checkStatus(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('CareX API error ${res.statusCode}: ${res.body}');
    }
  }
}
