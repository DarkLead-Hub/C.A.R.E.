import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:health_wallet/core/services/blockchain/care_x_api_service.dart';
import 'package:health_wallet/core/theme/app_insets.dart';
import 'package:health_wallet/core/theme/app_text_style.dart';
import 'package:health_wallet/core/utils/build_context_extension.dart';
import 'package:health_wallet/core/widgets/custom_app_bar.dart';
import 'package:health_wallet/features/auth/presentation/care_x_session_provider.dart';

/// Tab 2 — Patient Profile (replaces document scanner)
@RoutePage()
class ScanPage extends StatelessWidget {
  const ScanPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.colorScheme.surface,
      appBar: CustomAppBar(
        title: 'Patient Profile',
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
          if (state.isLoading) {
            return Center(
                child: CircularProgressIndicator(
                    color: context.colorScheme.primary));
          }
          if (state.error != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(Insets.large),
                child: Text(
                  'Error: ${state.error}',
                  style: AppTextStyle.bodyMedium
                      .copyWith(color: context.colorScheme.error),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          final patient = state.patient;
          final account = state.account;
          if (patient == null || account == null) {
            return Center(
              child: Text(
                'No patient data.',
                style: AppTextStyle.bodyMedium.copyWith(
                    color:
                        context.colorScheme.onSurface.withValues(alpha: 0.5)),
              ),
            );
          }

          final criticalVitals =
              state.vitals.where((v) => v.isCritical == true).toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(
                Insets.normal, Insets.medium, Insets.normal, 80),
            children: [
              _ProfileCard(title: '🧑‍⚕️ Patient Identity', children: [
                _InfoRow(label: 'Full Name', value: patient.name),
                _InfoRow(label: 'Age', value: '${patient.age} years'),
                _InfoRow(label: 'Patient ID', value: '#${patient.id}'),
                _InfoRow(
                  label: 'Wallet',
                  value: account.walletAddress,
                  mono: true,
                  wrap: true,
                ),
              ]),
              const SizedBox(height: Insets.medium),
              _ProfileCard(title: '📊 Medical History', children: [
                _InfoRow(
                  label: 'EMR Vitals',
                  value: '${state.vitals.length} records',
                ),
                _InfoRow(
                  label: 'Blockchain',
                  value: '${state.chainRecordCount} records',
                  valueColor: context.colorScheme.primary,
                ),
                _InfoRow(
                  label: 'Critical Events',
                  value: '${criticalVitals.length}',
                  valueColor: criticalVitals.isNotEmpty
                      ? Colors.redAccent
                      : Colors.green,
                ),
                _InfoRow(
                  label: 'Documents',
                  value: '${state.documents.length} on file',
                ),
              ]),
              if (state.vitals.isNotEmpty) ...[
                const SizedBox(height: Insets.medium),
                _ProfileCard(
                  title: '💓 Vitals Timeline (Latest 8)',
                  children: state.vitals.reversed
                      .take(8)
                      .map((v) => _VitalTimelineRow(vitals: v))
                      .toList(),
                ),
              ],
              if (criticalVitals.isNotEmpty) ...[
                const SizedBox(height: Insets.medium),
                _ProfileCard(
                  title: '⚠️ Recent Critical Conditions',
                  children: criticalVitals.reversed
                      .take(5)
                      .map((v) => _CriticalRow(vitals: v))
                      .toList(),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _ProfileCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Insets.medium),
      decoration: BoxDecoration(
        color: context.isDarkMode
            ? Colors.white.withValues(alpha: 0.03)
            : Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: context.isDarkMode
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.black.withValues(alpha: 0.05),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: AppTextStyle.titleMedium.copyWith(
                  fontWeight: FontWeight.w600,
                  color: context.colorScheme.onSurface)),
          Divider(
              color: context.colorScheme.onSurface.withValues(alpha: 0.06),
              height: 24),
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool mono;
  final bool wrap;
  final Color? valueColor;
  const _InfoRow({
    required this.label,
    required this.value,
    this.mono = false,
    this.wrap = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    final style = AppTextStyle.bodySmall.copyWith(
      color: valueColor ?? context.colorScheme.onSurface,
      fontFamily: mono ? 'monospace' : null,
      fontWeight: FontWeight.w500,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Insets.extraSmall),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label,
                style: AppTextStyle.bodySmall.copyWith(
                    color:
                        context.colorScheme.onSurface.withValues(alpha: 0.5))),
          ),
          Expanded(
            child: wrap
                ? Text(value, style: style, softWrap: true)
                : Text(value,
                    style: style, maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}

class _VitalTimelineRow extends StatelessWidget {
  final CareXVitals vitals;
  const _VitalTimelineRow({required this.vitals});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Insets.extraSmall),
      child: Row(
        children: [
          Icon(
            vitals.isCritical == true
                ? Icons.warning_amber
                : Icons.favorite_border,
            size: 14,
            color: vitals.isCritical == true ? Colors.redAccent : Colors.green,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'BPM: ${vitals.bpm?.toStringAsFixed(0) ?? '—'}  '
              'SpO₂: ${vitals.spo2?.toStringAsFixed(1) ?? '—'}%',
              style: AppTextStyle.bodySmall
                  .copyWith(color: context.colorScheme.onSurface),
            ),
          ),
          Text(
            (vitals.timestamp?.length ?? 0) >= 10
                ? vitals.timestamp!.substring(0, 10)
                : '',
            style: AppTextStyle.bodySmall.copyWith(
              color: context.colorScheme.onSurface.withValues(alpha: 0.4),
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

class _CriticalRow extends StatelessWidget {
  final CareXVitals vitals;
  const _CriticalRow({required this.vitals});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Insets.extraSmall),
      child: Row(
        children: [
          const Icon(Icons.warning_amber, size: 14, color: Colors.redAccent),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'BPM ${vitals.bpm?.toStringAsFixed(0) ?? '—'}'
              ' | SpO₂ ${vitals.spo2?.toStringAsFixed(1) ?? '—'}%'
              ' | ${(vitals.timestamp?.length ?? 0) >= 10 ? vitals.timestamp!.substring(0, 10) : ''}',
              style: AppTextStyle.bodySmall
                  .copyWith(color: Colors.redAccent.withValues(alpha: 0.85)),
            ),
          ),
        ],
      ),
    );
  }
}
