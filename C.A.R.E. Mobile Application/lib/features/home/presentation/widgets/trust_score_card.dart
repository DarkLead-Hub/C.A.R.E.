import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'package:health_wallet/core/theme/app_insets.dart';
import 'package:health_wallet/core/theme/app_text_style.dart';
import 'package:health_wallet/core/utils/build_context_extension.dart';

class TrustScoreCard extends StatelessWidget {
  final int recordCount;
  final int keyCount;
  final int blockchainRecordCount;

  const TrustScoreCard({
    super.key,
    this.recordCount = 0,
    this.keyCount = 0,
    this.blockchainRecordCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    final verifications = [
      _VerificationItem(
        label: "Identity Verified",
        icon: Icons.check_circle_outline,
        status: true,
      ),
      _VerificationItem(
        label: "Records Encrypted",
        icon: Icons.shield,
        status: recordCount > 0,
      ),
      _VerificationItem(
        label: "Keys Secured",
        icon: Icons.badge,
        status: keyCount > 0,
      ),
      _VerificationItem(
        label: "Documents Signed",
        icon: Icons.edit_document,
        status: recordCount > 0,
      ),
      _VerificationItem(
        label: "Blockchain Anchored",
        icon: Icons.link,
        status: blockchainRecordCount > 0,
      ),
    ];

    final activeChecks = verifications.where((v) => v.status).length;
    final score = ((activeChecks / verifications.length) * 100).round();

    final badgeLabel = score >= 80
        ? 'Excellent'
        : score >= 60
            ? 'Good'
            : score >= 40
                ? 'Fair'
                : 'Low';
    final badgeColor = score >= 80
        ? Colors.green
        : score >= 60
            ? Colors.blue
            : score >= 40
                ? Colors.orange
                : Colors.red;

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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Trust Score",
                style: AppTextStyle.titleMedium.copyWith(
                  fontWeight: FontWeight.w600,
                  color: context.colorScheme.onSurface,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: Insets.small,
                  vertical: Insets.extraSmall,
                ),
                decoration: BoxDecoration(
                  color: (context.isDarkMode
                          ? badgeColor
                          : badgeColor.withValues(alpha: 0.3))
                      .withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(100),
                  border: Border.all(
                    color: badgeColor.withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  badgeLabel,
                  style: AppTextStyle.labelSmall.copyWith(
                    color: badgeColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: Insets.medium),
          Center(
            child: SizedBox(
              width: 120,
              height: 120,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 120,
                    height: 120,
                    child: CustomPaint(
                      painter: _CircularProgressPainter(
                        progress: score / 100,
                        backgroundColor: context.isDarkMode
                            ? Colors.white.withValues(alpha: 0.1)
                            : Colors.black.withValues(alpha: 0.05),
                        color: context.colorScheme.primary,
                      ),
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.shield,
                        size: 24,
                        color: context.colorScheme.primary,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "$score%",
                        style: AppTextStyle.titleLarge.copyWith(
                          fontWeight: FontWeight.bold,
                          color: context.colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: Insets.medium),
          ...verifications.map((item) => _buildVerificationRow(context, item)),
        ],
      ),
    );
  }

  Widget _buildVerificationRow(BuildContext context, _VerificationItem item) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Insets.extraSmall),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: Icon(
                  item.icon,
                  size: 16,
                  color: item.status
                      ? Colors.green
                      : context.colorScheme.onSurface.withValues(alpha: 0.3),
                ),
              ),
              const SizedBox(width: Insets.small),
              Text(
                item.label,
                style: AppTextStyle.bodySmall.copyWith(
                  color: item.status
                      ? context.colorScheme.onSurface
                      : context.colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
            ],
          ),
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: item.status
                  ? Colors.green
                  : context.colorScheme.onSurface.withValues(alpha: 0.1),
            ),
          ),
        ],
      ),
    );
  }
}

class _VerificationItem {
  final String label;
  final IconData icon;
  final bool status;

  _VerificationItem({
    required this.label,
    required this.icon,
    required this.status,
  });
}

class _CircularProgressPainter extends CustomPainter {
  final double progress;
  final Color backgroundColor;
  final Color color;

  _CircularProgressPainter({
    required this.progress,
    required this.backgroundColor,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 4;
    final strokeWidth = 8.0;

    final backgroundPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    canvas.drawCircle(center, radius, backgroundPaint);

    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final startAngle = -math.pi / 2;
    final sweepAngle = 2 * math.pi * progress;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
