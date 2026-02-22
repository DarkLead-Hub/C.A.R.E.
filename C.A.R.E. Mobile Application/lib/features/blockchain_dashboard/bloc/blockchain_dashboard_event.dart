part of 'blockchain_dashboard_bloc.dart';

abstract class BlockchainDashboardEvent extends Equatable {
  const BlockchainDashboardEvent();

  @override
  List<Object?> get props => [];
}

/// Load dashboard on first open.
class BlockchainDashboardStarted extends BlockchainDashboardEvent {
  const BlockchainDashboardStarted();
}

/// User selected a patient wallet from the account picker.
class BlockchainWalletSelected extends BlockchainDashboardEvent {
  final CareXWalletAccount account;
  const BlockchainWalletSelected(this.account);

  @override
  List<Object?> get props => [account.walletAddress];
}

/// Pull-to-refresh triggered.
class BlockchainDashboardRefreshed extends BlockchainDashboardEvent {
  const BlockchainDashboardRefreshed();
}

/// User granted a doctor / recipient access to medical document(s).
class BlockchainDocumentShareRequested extends BlockchainDashboardEvent {
  final List<int> docIds;
  final String recipientWallet;

  const BlockchainDocumentShareRequested({
    required this.docIds,
    required this.recipientWallet,
  });

  @override
  List<Object?> get props => [docIds, recipientWallet];
}

/// User revoked all document access for a given recipient.
class BlockchainDocumentRevokeRequested extends BlockchainDashboardEvent {
  final String recipientWallet;
  const BlockchainDocumentRevokeRequested(this.recipientWallet);

  @override
  List<Object?> get props => [recipientWallet];
}
