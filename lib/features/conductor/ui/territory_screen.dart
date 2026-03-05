import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../auth/providers/auth_provider.dart';
import '../../territories/models/segment_model.dart';
import '../../territories/models/segment_status.dart';
import '../../territories/models/territory_model.dart';
import '../../admin/providers/territories_provider.dart';
import '../services/territory_progress_service.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/cached_territory_image.dart';
import '../../../../shared/widgets/progress_indicator_bar.dart';

/// Territory detail screen for conductors.
/// Displays: territory image, progress, segment checklist, Open Maps, Save Progress.
class TerritoryScreen extends ConsumerWidget {
  const TerritoryScreen({
    super.key,
    required this.territoryId,
  });

  final String territoryId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncTerritories = ref.watch(territoriesProvider);
    final territories =
        asyncTerritories.hasValue ? asyncTerritories.value! : [];
    final territory = territories.where((t) => t.id == territoryId).firstOrNull;

    if (asyncTerritories.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (territory == null) {
      return const Center(child: Text('Território não encontrado'));
    }

    return _TerritoryScreenContent(
      territory: territory,
      territoryId: territoryId,
    );
  }
}

class _TerritoryScreenContent extends ConsumerStatefulWidget {
  const _TerritoryScreenContent({
    required this.territory,
    required this.territoryId,
  });

  final TerritoryModel territory;
  final String territoryId;

  @override
  ConsumerState<_TerritoryScreenContent> createState() =>
      _TerritoryScreenContentState();
}

class _TerritoryScreenContentState extends ConsumerState<_TerritoryScreenContent> {
  final _checklistKey = GlobalKey<_SegmentChecklistState>();

  Future<void> _saveProgress() async {
    final completedIds = _checklistKey.currentState?.completedIds ?? {};
    final statusBySegmentId = <String, SegmentStatus>{};
    for (final seg in widget.territory.segments) {
      statusBySegmentId[seg.id] =
          completedIds.contains(seg.id) ? SegmentStatus.completed : SegmentStatus.pending;
    }

    final authState = ref.read(authStateProvider);
    final conductorId =
        authState is AuthAuthenticated ? authState.user.id : 'unknown';

    await ref.read(territoryProgressServiceProvider).saveProgress(
          territoryId: widget.territoryId,
          conductorId: conductorId,
          statusBySegmentId: statusBySegmentId,
        );

    ref.invalidate(territoriesProvider);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Progresso salvo'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    GestureDetector(
                      onTap: () => _showExpandedImage(
                        context,
                        widget.territory.imageUrl,
                      ),
                      child: CachedTerritoryImage(
                        imageUrl: widget.territory.imageUrl,
                        width: double.infinity,
                        height: 180,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      widget.territory.neighborhood,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    ProgressIndicatorBar(
                      completed: widget.territory.completedCount,
                      total: widget.territory.totalSegments,
                      label: 'Segmentos concluídos',
                    ),
                    const SizedBox(height: AppSpacing.sectionSpacing),
                    Text(
                      'Ruas a cobrir',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    _SegmentChecklist(
                      key: _checklistKey,
                      territory: widget.territory,
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              child: Column(
                children: [
                  if (widget.territory.mapsUrl != null)
                    FilledButton.icon(
                      onPressed: () =>
                          _openMaps(widget.territory.mapsUrl!),
                      icon: const Icon(Icons.map),
                      label: const Text('Abrir Google Maps'),
                    ),
                  const SizedBox(height: AppSpacing.sm),
                  OutlinedButton.icon(
                    onPressed: _saveProgress,
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Salvar Progresso'),
                  ),
                ],
              ),
            ),
          ],
        ),
    );
  }

  Future<void> _openMaps(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showExpandedImage(BuildContext context, String? url) {
    if (url == null || url.trim().isEmpty) return;
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 4,
                child: SizedBox(
                  width: MediaQuery.of(context).size.width - 48,
                  height: MediaQuery.of(context).size.height - 96,
                  child: CachedTerritoryImage(
                    imageUrl: url,
                    fit: BoxFit.contain,
                    height: MediaQuery.of(context).size.height - 96,
                    width: MediaQuery.of(context).size.width - 48,
                  ),
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    );
  }
}

class _SegmentChecklist extends ConsumerStatefulWidget {
  const _SegmentChecklist({super.key, required this.territory});

  final TerritoryModel territory;

  @override
  ConsumerState<_SegmentChecklist> createState() => _SegmentChecklistState();
}

class _SegmentChecklistState extends ConsumerState<_SegmentChecklist> {
  late Set<String> _completedIds;

  Set<String> get completedIds => _completedIds;

  @override
  void initState() {
    super.initState();
    _completedIds = widget.territory.segments
        .where((s) => s.isCompleted)
        .map((s) => s.id)
        .toSet();
  }

  @override
  void didUpdateWidget(_SegmentChecklist oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.territory.id != widget.territory.id) {
      _completedIds = widget.territory.segments
          .where((s) => s.isCompleted)
          .map((s) => s.id)
          .toSet();
    }
  }

  @override
  Widget build(BuildContext context) {
    final segments = widget.territory.segments;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: segments
            .map(
              (segment) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.listItemSpacing),
                child: _SegmentCheckbox(
                  segment: segment,
                  isChecked: _completedIds.contains(segment.id),
                  onChanged: (value) {
                    setState(() {
                      if (value == true) {
                        _completedIds.add(segment.id);
                      } else {
                        _completedIds.remove(segment.id);
                      }
                    });
                  },
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class _SegmentCheckbox extends StatelessWidget {
  const _SegmentCheckbox({
    required this.segment,
    required this.isChecked,
    required this.onChanged,
  });

  final SegmentModel segment;
  final bool isChecked;
  final ValueChanged<bool?> onChanged;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => onChanged(!isChecked),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            SizedBox(
              width: 44,
              height: 44,
              child: Checkbox(
                value: isChecked,
                onChanged: onChanged,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                segment.description,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      decoration: isChecked ? TextDecoration.lineThrough : null,
                      color: isChecked
                          ? AppColors.secondaryText
                          : AppColors.primaryText,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
