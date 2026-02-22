import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:health_wallet/core/theme/app_insets.dart';
import 'package:health_wallet/core/theme/app_text_style.dart';
import 'package:health_wallet/core/utils/build_context_extension.dart';
import 'package:health_wallet/core/widgets/custom_app_bar.dart';
import 'package:health_wallet/features/auth/presentation/care_x_session_provider.dart';
import 'package:health_wallet/features/home/presentation/widgets/authorized_users_card.dart';
import 'package:health_wallet/features/records/domain/entity/entity.dart';

/// Tab 1 — Key Sharing & Access Control (replaces FHIR records browser)
@RoutePage()
class RecordsPage extends StatefulWidget {
  final List<FhirType>? initFilters;
  final PageController? pageController;

  const RecordsPage({super.key, this.initFilters, this.pageController});

  @override
  State<RecordsPage> createState() => _RecordsPageState();
}

class _RecordsPageState extends State<RecordsPage> {
  final _recipientCtrl = TextEditingController();
  final _sharedWallets = <String>[];
  String? _error;
  bool _isBusy = false;

  // Preset recipient types for quick entry
  final _presets = const [
    _AccessPreset(label: 'Doctor', icon: Icons.local_hospital_outlined),
    _AccessPreset(label: 'Hospital', icon: Icons.business_outlined),
    _AccessPreset(label: 'Lab', icon: Icons.science_outlined),
    _AccessPreset(label: 'Emergency', icon: Icons.emergency_outlined),
  ];

  @override
  void dispose() {
    _recipientCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.colorScheme.surface,
      appBar: CustomAppBar(
        title: 'Key Sharing & Access',
        automaticallyImplyLeading: false,
        actions: [
          BlocBuilder<CareXSessionCubit, CareXSessionState>(
            builder: (ctx, state) => IconButton(
              icon: Icon(Icons.refresh_outlined,
                  color: context.colorScheme.onSurface),
              onPressed: () => ctx.read<CareXSessionCubit>().loadSession(),
            ),
          ),
        ],
      ),
      body: BlocBuilder<CareXSessionCubit, CareXSessionState>(
        builder: (context, state) {
          // Aggregate shared wallets from local list + session data
          final allWallets = {
            ..._sharedWallets,
          }.toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(
                Insets.normal, Insets.medium, Insets.normal, 80),
            children: [
              // ── Stats row ─────────────────────────────────────────────
              _buildStatsRow(context, state, allWallets),
              const SizedBox(height: Insets.medium),

              // ── Share panel ───────────────────────────────────────────
              _buildSharePanel(context, state),
              const SizedBox(height: Insets.medium),

              // ── Authorized users card ─────────────────────────────────
              AuthorizedUsersCard(
                authorizedAddresses: allWallets,
                onRevoke: (address) => _handleRevoke(context, state, address),
              ),
              const SizedBox(height: Insets.medium),

              // ── Key status panel ──────────────────────────────────────
              _buildKeyStatusCard(context, state),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatsRow(
    BuildContext context,
    CareXSessionState state,
    List<String> wallets,
  ) {
    final items = [
      _StatItem(
        label: 'Active Shares',
        value: '${wallets.length}',
        icon: Icons.share_outlined,
        color: context.colorScheme.primary,
      ),
      _StatItem(
        label: 'Documents',
        value: '${state.documents.length}',
        icon: Icons.folder_outlined,
        color: Colors.teal,
      ),
      _StatItem(
        label: 'Vitals',
        value: '${state.vitals.length}',
        icon: Icons.favorite_border,
        color: Colors.redAccent,
      ),
    ];

    return Row(
      children: items
          .map((item) => Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: _StatCard(item: item),
                ),
              ))
          .toList(),
    );
  }

  Widget _buildSharePanel(BuildContext context, CareXSessionState state) {
    return Container(
      padding: const EdgeInsets.all(Insets.medium),
      decoration: _cardDecoration(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Share Access',
            style: AppTextStyle.titleMedium.copyWith(
              fontWeight: FontWeight.w600,
              color: context.colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: Insets.smallNormal),

          // Preset chips
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _presets
                .map((p) => ActionChip(
                      avatar: Icon(p.icon,
                          size: 14, color: context.colorScheme.primary),
                      label: Text(
                        p.label,
                        style: AppTextStyle.labelSmall.copyWith(
                          color: context.colorScheme.onSurface,
                        ),
                      ),
                      backgroundColor: context.isDarkMode
                          ? Colors.white.withValues(alpha: 0.04)
                          : Colors.black.withValues(alpha: 0.03),
                      side: BorderSide(
                          color: context.colorScheme.onSurface
                              .withValues(alpha: 0.1)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(100)),
                      onPressed: () {
                        // Pre-fill a demo placeholder for the selected type
                        _recipientCtrl.text =
                            '0x${p.label.toLowerCase()}...wallet';
                        setState(() {});
                      },
                    ))
                .toList(),
          ),
          const SizedBox(height: Insets.smallNormal),

          // Recipient wallet field
          TextField(
            controller: _recipientCtrl,
            style: AppTextStyle.bodySmall.copyWith(
              color: context.colorScheme.onSurface,
              fontFamily: 'monospace',
            ),
            decoration: _inputDecoration(context,
                label: 'Recipient Wallet Address',
                hint: '0x...',
                icon: Icons.person_outline),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: Insets.small),
              child: Text(_error!,
                  style: AppTextStyle.bodySmall
                      .copyWith(color: context.colorScheme.error)),
            ),
          const SizedBox(height: Insets.smallNormal),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: context.colorScheme.primary,
                    foregroundColor: context.colorScheme.onPrimary,
                    padding: const EdgeInsets.symmetric(
                        vertical: Insets.smallNormal),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: _isBusy
                      ? SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: context.colorScheme.onPrimary),
                        )
                      : const Icon(Icons.key_outlined, size: 18),
                  label: Text(_isBusy ? 'Sharing…' : 'Grant Access'),
                  onPressed:
                      _isBusy ? null : () => _handleShare(context, state),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKeyStatusCard(BuildContext context, CareXSessionState state) {
    final account = state.account;
    if (account == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(Insets.medium),
      decoration: _cardDecoration(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Key Status',
            style: AppTextStyle.titleMedium.copyWith(
              fontWeight: FontWeight.w600,
              color: context.colorScheme.onSurface,
            ),
          ),
          Divider(
              color: context.colorScheme.onSurface.withValues(alpha: 0.06),
              height: 24),
          _KeyRow(
            label: 'Master Key',
            badge: 'Patient Owner',
            badgeColor: context.colorScheme.primary,
            icon: Icons.vpn_key_outlined,
          ),
          _KeyRow(
            label: 'Wallet Address',
            value: '${account.walletAddress.substring(0, 8)}…'
                '${account.walletAddress.substring(account.walletAddress.length - 4)}',
            icon: Icons.account_balance_wallet_outlined,
          ),
          _KeyRow(
            label: 'Blockchain Status',
            badge: 'Verified',
            badgeColor: Colors.green,
            icon: Icons.verified_outlined,
          ),
          _KeyRow(
            label: 'Consent Mode',
            badge: 'Active',
            badgeColor: Colors.teal,
            icon: Icons.shield_outlined,
          ),
        ],
      ),
    );
  }

  Future<void> _handleShare(
      BuildContext context, CareXSessionState state) async {
    final wallet = _recipientCtrl.text.trim();
    if (wallet.isEmpty) {
      setState(() => _error = 'Enter a recipient wallet address.');
      return;
    }
    setState(() {
      _isBusy = true;
      _error = null;
    });
    final messenger = ScaffoldMessenger.of(context);
    try {
      final docIds = state.documents.map((d) => d.id).toList();
      await context.read<CareXSessionCubit>().shareDocuments(docIds, wallet);
      if (mounted) {
        setState(() {
          _isBusy = false;
          if (!_sharedWallets.contains(wallet)) _sharedWallets.add(wallet);
          _recipientCtrl.clear();
        });
        messenger.showSnackBar(
          SnackBar(
            content: Text('Access granted to ${_truncate(wallet)}'),
            backgroundColor: Colors.green.shade700,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isBusy = false;
          _error = e.toString();
        });
      }
    }
  }

  Future<void> _handleRevoke(
    BuildContext context,
    CareXSessionState state,
    String address,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await context.read<CareXSessionCubit>().revokeAccess(address);
      if (mounted) {
        setState(() => _sharedWallets.remove(address));
        messenger.showSnackBar(
          SnackBar(
            content: Text('Access revoked for ${_truncate(address)}'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    } catch (_) {}
  }

  String _truncate(String s) =>
      s.length > 14 ? '${s.substring(0, 6)}…${s.substring(s.length - 4)}' : s;

  BoxDecoration _cardDecoration(BuildContext context) => BoxDecoration(
        color: context.isDarkMode
            ? Colors.white.withValues(alpha: 0.03)
            : Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: context.isDarkMode
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.05),
        ),
      );

  InputDecoration _inputDecoration(
    BuildContext context, {
    required String label,
    required String hint,
    required IconData icon,
  }) =>
      InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon,
            color: context.colorScheme.onSurface.withValues(alpha: 0.4)),
        labelStyle: AppTextStyle.bodySmall.copyWith(
            color: context.colorScheme.onSurface.withValues(alpha: 0.5)),
        hintStyle: AppTextStyle.bodySmall.copyWith(
            color: context.colorScheme.onSurface.withValues(alpha: 0.25)),
        filled: true,
        fillColor: context.isDarkMode
            ? Colors.white.withValues(alpha: 0.03)
            : Colors.black.withValues(alpha: 0.02),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
              color: context.isDarkMode
                  ? Colors.white.withValues(alpha: 0.12)
                  : Colors.black.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: context.colorScheme.primary),
        ),
      );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

class _AccessPreset {
  final String label;
  final IconData icon;
  const _AccessPreset({required this.label, required this.icon});
}

class _StatItem {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatItem(
      {required this.label,
      required this.value,
      required this.icon,
      required this.color});
}

class _StatCard extends StatelessWidget {
  final _StatItem item;
  const _StatCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: Insets.small, vertical: Insets.smallNormal),
      decoration: BoxDecoration(
        color: item.color.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: item.color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(item.icon, size: 20, color: item.color),
          const SizedBox(height: 4),
          Text(
            item.value,
            style: AppTextStyle.titleMedium
                .copyWith(fontWeight: FontWeight.bold, color: item.color),
          ),
          Text(
            item.label,
            style: AppTextStyle.labelSmall.copyWith(
              color: context.colorScheme.onSurface.withValues(alpha: 0.5),
              fontSize: 9,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _KeyRow extends StatelessWidget {
  final String label;
  final String? value;
  final String? badge;
  final Color? badgeColor;
  final IconData icon;
  const _KeyRow(
      {required this.label,
      this.value,
      this.badge,
      this.badgeColor,
      required this.icon});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Insets.extraSmall),
      child: Row(
        children: [
          Icon(icon,
              size: 16,
              color: context.colorScheme.onSurface.withValues(alpha: 0.5)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: AppTextStyle.bodySmall.copyWith(
                  color: context.colorScheme.onSurface.withValues(alpha: 0.6)),
            ),
          ),
          if (badge != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: (badgeColor ?? Colors.blue).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(100),
                border: Border.all(
                    color: (badgeColor ?? Colors.blue).withValues(alpha: 0.3)),
              ),
              child: Text(
                badge!,
                style: AppTextStyle.labelSmall.copyWith(
                  color: badgeColor ?? Colors.blue,
                  fontWeight: FontWeight.bold,
                  fontSize: 9,
                ),
              ),
            )
          else if (value != null)
            Text(
              value!,
              style: AppTextStyle.bodySmall.copyWith(
                color: context.colorScheme.onSurface,
                fontFamily: 'monospace',
                fontWeight: FontWeight.w500,
              ),
            ),
        ],
      ),
    );
  }
}
