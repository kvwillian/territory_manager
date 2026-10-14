import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';

enum StatusTone { available, progress, pending, done }

/// Pill used for Disponível, Em progresso, Pendente, and Concluído.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    required this.tone,
  });

  final String label;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (tone) {
      StatusTone.available => (
          AppColors.softGreenBackground,
          AppColors.emerald,
        ),
      StatusTone.progress => (
          AppColors.progressBackground,
          AppColors.progressBlue,
        ),
      StatusTone.pending => (
          AppColors.pendingBackground,
          AppColors.secondaryText,
        ),
      StatusTone.done => (
          AppColors.softGreenBackground,
          AppColors.emerald,
        ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}
