part of 'blockchain_dashboard_bloc.dart';

enum BlockchainDashboardStatus {
  initial,
  loading,
  success,
  failure,
  noWallet,
}

class BlockchainDashboardState extends Equatable {
  final BlockchainDashboardStatus status;
  final CareXWalletAccount? currentWallet;
  final CareXPatient? patient;
  final List<CareXVitals> vitals;
  final List<BlockchainRecord> chainRecords;
  final List<CareXDocument> documents;
  final bool isChainConnected;
  final bool isSharingInProgress;
  final String? error;
  final String? lastShareMessage;

  const BlockchainDashboardState({
    this.status = BlockchainDashboardStatus.initial,
    this.currentWallet,
    this.patient,
    this.vitals = const [],
    this.chainRecords = const [],
    this.documents = const [],
    this.isChainConnected = false,
    this.isSharingInProgress = false,
    this.error,
    this.lastShareMessage,
  });

  BlockchainDashboardState copyWith({
    BlockchainDashboardStatus? status,
    CareXWalletAccount? currentWallet,
    CareXPatient? patient,
    List<CareXVitals>? vitals,
    List<BlockchainRecord>? chainRecords,
    List<CareXDocument>? documents,
    bool? isChainConnected,
    bool? isSharingInProgress,
    String? error,
    String? lastShareMessage,
  }) {
    return BlockchainDashboardState(
      status: status ?? this.status,
      currentWallet: currentWallet ?? this.currentWallet,
      patient: patient ?? this.patient,
      vitals: vitals ?? this.vitals,
      chainRecords: chainRecords ?? this.chainRecords,
      documents: documents ?? this.documents,
      isChainConnected: isChainConnected ?? this.isChainConnected,
      isSharingInProgress: isSharingInProgress ?? this.isSharingInProgress,
      error: error,
      lastShareMessage: lastShareMessage,
    );
  }

  @override
  List<Object?> get props => [
        status,
        currentWallet?.walletAddress,
        patient?.id,
        vitals,
        chainRecords,
        documents,
        isChainConnected,
        isSharingInProgress,
        error,
        lastShareMessage,
      ];
}
