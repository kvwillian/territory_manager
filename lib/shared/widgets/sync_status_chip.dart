import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_colors.dart';
import '../../core/providers/sync_status_provider.dart';

/// Expandable sync status chip. Minimized: icon + color only. Tap to expand for full status.
class SyncStatusChip extends ConsumerStatefulWidget {
  const SyncStatusChip({super.key});

  @override
  ConsumerState<SyncStatusChip> createState() => _SyncStatusChipState();
}

class _SyncStatusChipState extends ConsumerState<SyncStatusChip> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
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
      child: GestureDetector(
        onTap: () => setState(() => _expanded = !_expanded),
        behavior: HitTestBehavior.opaque,
        child: AnimatedSize(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          child: _expanded
              ? Chip(
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
                )
              : Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    border: Border.all(color: color.withValues(alpha: 0.4)),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, size: 20, color: color),
                ),
        ),
      ),
    );
  }
}
