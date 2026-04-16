import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../meetings/models/meeting_location_model.dart';
import '../../territories/models/territory_model.dart';
import '../../territories/utils/neighborhood_territory_utils.dart';
import '../providers/territories_provider.dart';
import 'admin_shell.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/cached_territory_image.dart';
import '../../../../shared/widgets/progress_indicator_bar.dart';

/// Admin screen: list of territories with progress indicators.
/// Grouped by neighborhood in accordion sections.
class TerritoriesListScreen extends ConsumerWidget {
  const TerritoriesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncTerritories = ref.watch(territoriesProvider);

    return asyncTerritories.when(
      loading: () => Scaffold(
        appBar: AppBar(
          title: const Text('Territórios'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/admin'),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Territórios')),
        body: Center(child: Text('Erro: $e')),
      ),
      data: (territories) {
        final groups = groupTerritoriesByNeighborhood(territories);
        return AdminShell(
          title: 'Territórios',
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => context.push('/admin/territories/create'),
            icon: const Icon(Icons.add),
            label: const Text('Novo território'),
          ),
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            children: groups.entries.map((e) {
              return _NeighborhoodSection(
                neighborhoodName: e.key,
                territories: e.value,
              );
            }).toList(),
          ),
        );
      },
    );
  }
}

class _NeighborhoodSection extends StatefulWidget {
  const _NeighborhoodSection({
    required this.neighborhoodName,
    required this.territories,
  });

  final String neighborhoodName;
  final List<TerritoryModel> territories;

  @override
  State<_NeighborhoodSection> createState() => _NeighborhoodSectionState();
}

class _NeighborhoodSectionState extends State<_NeighborhoodSection> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.md,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.location_city_outlined,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.neighborhoodName,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        Text(
                          '${widget.territories.length} território(s)',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                              ),
                        ),
                      ],
                    ),
                  ),
                  AnimatedRotation(
                    turns: _expanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(Icons.expand_more),
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Padding(
              padding: const EdgeInsets.only(
                left: AppSpacing.md,
                right: AppSpacing.md,
                bottom: AppSpacing.md,
              ),
              child: Column(
                children: widget.territories.map((t) {
                  return Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.sm),
                    child: _TerritoryListTile(territory: t),
                  );
                }).toList(),
              ),
            ),
            crossFadeState:
                _expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    );
  }
}

class _TerritoryListTile extends StatelessWidget {
  const _TerritoryListTile({required this.territory});

  final TerritoryModel territory;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => context.push('/admin/territories/edit/${territory.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _TerritoryImagePreview(
                imageUrl: territory.imageUrl,
                width: 80,
                height: 80,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      territory.number != null && territory.number!.isNotEmpty
                          ? '${territory.number} - ${territory.name}'
                          : territory.name,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    Text(
                      territory.neighborhood,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    if ((territory.shortAddress != null &&
                            territory.shortAddress!.isNotEmpty) ||
                        (territory.address != null &&
                            territory.address!.isNotEmpty))
                      Text(
                        territory.shortAddress?.isNotEmpty == true
                            ? territory.shortAddress!
                            : MeetingLocationModel.deriveShortLocation(
                                territory.address!),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: AppSpacing.sm),
                    ProgressIndicatorBar(
                      completed: territory.completedCount,
                      total: territory.totalSegments,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ],
      ),
    );
  }
}

class _TerritoryImagePreview extends StatelessWidget {
  const _TerritoryImagePreview({
    required this.imageUrl,
    this.width = 80,
    this.height = 80,
  });

  final String? imageUrl;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return CachedTerritoryImage(
      imageUrl: imageUrl,
      width: width,
      height: height,
      fit: BoxFit.cover,
    );
  }
}
