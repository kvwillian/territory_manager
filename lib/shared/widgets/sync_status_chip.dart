import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_colors.dart';
import '../../core/providers/sync_status_provider.dart';

/// Displays current sync status: Sincronizado, Sincronizando, or Pendências offline.
class SyncStatusChip extends ConsumerWidget {
  const SyncStatusChip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(syncStatusProvider);

    final (icon, label, color) = switch (status) {
      SyncStatus.synced => (
          Icons.check_circle_outline,
          'Sincronizado',
          AppColors.successGreen,
        ),
      SyncStatus.syncing => (
          Icons.sync,
          'Sincronizando',
          AppColors.primaryPurple,
        ),
      SyncStatus.pendingOffline => (
          Icons.warning_amber_rounded,
          'Pendências offline',
          Colors.orange,
        ),
    };

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Chip(
        avatar: Icon(icon, size: 18, color: color),
        label: Text(
          label,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w500,
              ),
        ),
        backgroundColor: color.withValues(alpha: 0.15),
        side: BorderSide(color: color.withValues(alpha: 0.4)),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}
