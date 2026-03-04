import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';

/// Progress bar for territory completion.
/// Green pastel on soft green background.
class ProgressIndicatorBar extends StatelessWidget {
  const ProgressIndicatorBar({
    super.key,
    required this.completed,
    required this.total,
    this.label,
  });

  final int completed;
  final int total;
  final String? label;

  double get progress => total > 0 ? completed / total : 0.0;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.secondaryText,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        Row(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: AppColors.softGreenBackground,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    AppColors.successGreen,
                  ),
                  minHeight: 8,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Text(
              '$completed / $total',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryText,
                  ),
            ),
          ],
        ),
      ],
    );
  }
}
