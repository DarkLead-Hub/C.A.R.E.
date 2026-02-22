import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:health_wallet/core/theme/app_color.dart';
import 'package:health_wallet/core/theme/app_insets.dart';
import 'package:health_wallet/core/theme/app_text_style.dart';
import 'package:health_wallet/core/utils/build_context_extension.dart';
import 'package:health_wallet/features/auth/presentation/care_x_session_provider.dart';

class BlockchainVitalsLiveFeed extends StatelessWidget {
  const BlockchainVitalsLiveFeed({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<CareXSessionCubit, CareXSessionState>(
      builder: (context, state) {
        if (state.vitals.isEmpty) return const SizedBox.shrink();

        // Get latest 3 vitals
        final latestVitals = state.vitals.reversed.take(3).toList();

        return Container(
          decoration: BoxDecoration(
            color: context.colorScheme.surfaceContainerHighest
                .withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: context.colorScheme.primary.withValues(alpha: 0.1),
            ),
          ),
          padding: const EdgeInsets.all(Insets.normal),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const _LiveIndicator(),
                      const SizedBox(width: 8),
                      Text(
                        'BLOCKCHAIN ACTIVITY',
                        style: AppTextStyle.labelSmall.copyWith(
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.1,
                          color: context.colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '${state.vitals.length} RECORDS',
                    style: AppTextStyle.labelSmall.copyWith(
                      color:
                          context.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: Insets.medium),
              ...latestVitals.map((v) => _VitalActivityRow(vitals: v)),
            ],
          ),
        );
      },
    );
  }
}

class _VitalActivityRow extends StatelessWidget {
  final dynamic vitals; // CareXVitals
  const _VitalActivityRow({required this.vitals});

  @override
  Widget build(BuildContext context) {
    final time = vitals.timestamp?.substring(11, 16) ?? '--:--';

    return Padding(
      padding: const EdgeInsets.only(bottom: Insets.small),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: context.colorScheme.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              time,
              style: AppTextStyle.labelSmall.copyWith(
                fontFamily: 'monospace',
                color: context.colorScheme.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${vitals.bpm?.toStringAsFixed(0) ?? '--'} BPM • ${vitals.spo2?.toStringAsFixed(0) ?? '--'}% SpO₂ • ${vitals.temperature?.toStringAsFixed(1) ?? '--'}°C',
                  style: AppTextStyle.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'Verified on Patient Ledger',
                  style: AppTextStyle.labelSmall.copyWith(
                    color: context.colorScheme.onSurface.withValues(alpha: 0.4),
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
          if (vitals.isCritical == true)
            Icon(
              Icons.warning_amber_rounded,
              size: 16,
              color: AppColors.error,
            ),
        ],
      ),
    );
  }
}

class _LiveIndicator extends StatefulWidget {
  const _LiveIndicator();

  @override
  State<_LiveIndicator> createState() => _LiveIndicatorState();
}

class _LiveIndicatorState extends State<_LiveIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _controller.drive(CurveTween(curve: Curves.easeInOut)),
      child: Container(
        width: 6,
        height: 6,
        decoration: const BoxDecoration(
          color: Colors.green,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
