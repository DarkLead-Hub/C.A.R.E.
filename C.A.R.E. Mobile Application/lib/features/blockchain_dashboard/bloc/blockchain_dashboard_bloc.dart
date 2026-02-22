import 'dart:async';
import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:health_wallet/core/services/blockchain/blockchain_service.dart';
import 'package:health_wallet/core/services/blockchain/care_x_api_service.dart';
import 'package:health_wallet/core/services/auth/patient_auth_service.dart';
import 'package:health_wallet/core/services/blockchain/care_x_wallet_service.dart';
import 'package:injectable/injectable.dart';

part 'blockchain_dashboard_state.dart';
part 'blockchain_dashboard_event.dart';

@injectable
class BlockchainDashboardBloc
    extends Bloc<BlockchainDashboardEvent, BlockchainDashboardState> {
  final BlockchainService _blockchainService;
  final PatientAuthService _authService;
  final CareXApiService _apiService;
  Timer? _pollTimer;

  BlockchainDashboardBloc(
    this._blockchainService,
    this._apiService,
    this._authService,
  ) : super(const BlockchainDashboardState()) {
    on<BlockchainDashboardStarted>(_onStarted);
    on<BlockchainDashboardRefreshed>(_onRefreshed);
    on<BlockchainDocumentShareRequested>(_onShareRequested);
    on<BlockchainDocumentRevokeRequested>(_onRevokeRequested);
  }

  Future<void> _onStarted(
    BlockchainDashboardStarted event,
    Emitter<BlockchainDashboardState> emit,
  ) async {
    emit(state.copyWith(status: BlockchainDashboardStatus.loading));
    try {
      final account = await _authService.getCurrentAccount();
      final connected = await _blockchainService.isConnected();

      if (account == null) {
        emit(state.copyWith(
          status: BlockchainDashboardStatus.failure,
          error: 'No active session. Please log in.',
          isChainConnected: connected,
        ));
        return;
      }

      emit(state.copyWith(
        currentWallet: account,
        isChainConnected: connected,
      ));

      await _loadDashboardData(account.walletAddress, emit);

      // Start auto-refresh every 5 seconds
      _pollTimer?.cancel();
      _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
        if (!isClosed) {
          add(BlockchainDashboardRefreshed());
        }
      });
    } catch (e) {
      emit(state.copyWith(
        status: BlockchainDashboardStatus.failure,
        error: e.toString(),
      ));
    }
  }

  Future<void> _onRefreshed(
    BlockchainDashboardRefreshed event,
    Emitter<BlockchainDashboardState> emit,
  ) async {
    if (state.currentWallet == null) return;
    // Don't show loading spinner on auto-refresh to avoid flicker
    await _loadDashboardData(state.currentWallet!.walletAddress, emit);
  }

  Future<void> _onShareRequested(
    BlockchainDocumentShareRequested event,
    Emitter<BlockchainDashboardState> emit,
  ) async {
    try {
      emit(state.copyWith(isSharingInProgress: true));
      await _apiService.shareDocuments(
        docIds: event.docIds,
        recipientWallet: event.recipientWallet,
      );
      emit(state.copyWith(
        isSharingInProgress: false,
        lastShareMessage: 'Access granted to ${event.recipientWallet}',
      ));
    } catch (e) {
      emit(state.copyWith(
        isSharingInProgress: false,
        error: 'Failed to share: $e',
      ));
    }
  }

  Future<void> _onRevokeRequested(
    BlockchainDocumentRevokeRequested event,
    Emitter<BlockchainDashboardState> emit,
  ) async {
    try {
      emit(state.copyWith(isSharingInProgress: true));
      await _apiService.revokeDocumentAccess(event.recipientWallet);
      emit(state.copyWith(
        isSharingInProgress: false,
        lastShareMessage: 'Access revoked for ${event.recipientWallet}',
      ));
      // Refresh documents list after revoke
      if (state.currentWallet != null) {
        await _loadDashboardData(state.currentWallet!.walletAddress, emit);
      }
    } catch (e) {
      emit(state.copyWith(
        isSharingInProgress: false,
        error: 'Failed to revoke: $e',
      ));
    }
  }

  Future<void> _loadDashboardData(
    String walletAddress,
    Emitter<BlockchainDashboardState> emit,
  ) async {
    try {
      final results = await Future.wait([
        _apiService.getPatientByWallet(walletAddress),
        _blockchainService.getRecordsForPatient(walletAddress),
        _apiService.getDocumentsByWallet(walletAddress),
      ]);

      final patient = results[0] as CareXPatient?;
      final chainRecords = results[1] as List<BlockchainRecord>;
      final documents = results[2] as List<CareXDocument>;

      List<CareXVitals> vitals = [];
      if (patient != null) {
        final rawVitals = await _apiService.getVitalsForPatient(patient.id);
        // Show newest first, limit to 50 to avoid UI lag with Column
        vitals = rawVitals.reversed.take(50).toList();
      }

      emit(state.copyWith(
        status: BlockchainDashboardStatus.success,
        patient: patient,
        vitals: vitals,
        chainRecords: chainRecords,
        documents: documents,
        error: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: BlockchainDashboardStatus.failure,
        error: e.toString(),
      ));
    }
  }

  @override
  Future<void> close() {
    _pollTimer?.cancel();
    return super.close();
  }
}
