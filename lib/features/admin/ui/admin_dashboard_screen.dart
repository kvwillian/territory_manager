import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../territories/models/territory_model.dart';
import '../../territories/models/territory_status.dart';
import '../../territories/utils/neighborhood_territory_utils.dart';
import '../../territories/widgets/neighborhood_territory_accordion_section.dart';
import '../../territories/widgets/territory_progress_summary.dart';
import '../providers/territories_provider.dart';
import 'admin_shell.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/progress_indicator_bar.dart';

/// Admin dashboard - coverage analytics overview.
class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncTerritories = ref.watch(territoriesProvider);

    return AdminShell(
      title: 'Painel',
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/admin/territories/create'),
        icon: const Icon(Icons.add),
        label: const Text('Novo território'),
      ),
      child: asyncTerritories.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Erro: $e')),
        data: (territories) => _DashboardContent(territories: territories),
      ),
    );
  }
}


class _DashboardContent extends StatelessWidget {
  const _DashboardContent({required this.territories});

  final List<TerritoryModel> territories;

  @override
  Widget build(BuildContext context) {
    final totalSegments = territories.fold<int>(0, (s, t) => s + t.totalSegments);
    final completedSegments =
        territories.fold<int>(0, (s, t) => s + t.completedCount);
    final fullyCompleted =
        territories.where((t) => t.isCompleted).length;
    final inProgress = territories.where((t) => t.isInProgress).length;
    final notStarted = territories.where((t) => t.isNotStarted).length;
    final overdueTerritories = _getOverdueTerritories(territories);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Cobertura de Territórios',
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Visão geral do progresso mensal',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.sectionSpacing),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Progresso geral',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  '$completedSegments de $totalSegments ruas concluídas',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: AppSpacing.md),
                ProgressIndicatorBar(
                  completed: completedSegments,
                  total: totalSegments,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sectionSpacing),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: _StatusCard(
                    count: fullyCompleted,
                    label: 'Concluídos',
                    color: AppColors.successGreen,
                    backgroundColor: AppColors.softGreenBackground,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _StatusCard(
                    count: inProgress,
                    label: 'Em andamento',
                    color: AppColors.primaryPurple,
                    backgroundColor: AppColors.secondaryPurple,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _StatusCard(
                    count: notStarted,
                    label: 'Não iniciados',
                    color: AppColors.neutralGray,
                    backgroundColor: AppColors.border,
                  ),
                ),
              ],
            ),
          ),
          if (overdueTerritories.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sectionSpacing),
            Text(
              'Territórios em atraso (>90 dias)',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: AppSpacing.md),
            ...overdueTerritories.map(
              (t) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: AppCard(
                  onTap: () => context.push('/admin/territories/edit/${t.id}'),
                  child: Row(
                    children: [
                      Icon(
                        Icons.warning_amber_rounded,
                        color: Theme.of(context).colorScheme.error,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              t.name,
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            Text(
                              t.neighborhood,
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.sectionSpacing),
          Text(
            'Todos os territórios',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: AppSpacing.md),
          ..._dashboardNeighborhoodSections(context, territories),
        ],
      ),
    );
  }

  /// Accordion sections by neighborhood; skips empty groups.
  Iterable<Widget> _dashboardNeighborhoodSections(
    BuildContext context,
    List<TerritoryModel> territories,
  ) sync* {
    final groups = groupTerritoriesByNeighborhood(territories);
    for (final entry in groups.entries) {
      if (entry.value.isEmpty) continue;
      yield Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.md),
        child: NeighborhoodTerritoryAccordionSection(
          neighborhoodName: entry.key,
          territories: entry.value,
          initiallyExpanded: false,
          itemBuilder: (context, t) => TerritoryDashboardCard(territory: t),
        ),
      );
    }
  }

  List<TerritoryModel> _getOverdueTerritories(List<TerritoryModel> territories) {
    const overdueDays = 90;
    final cutoff = DateTime.now().subtract(Duration(days: overdueDays));
    return territories.where((t) {
      if (t.segments.isEmpty) return false;
      final lastWorked = t.segments
          .map((s) => s.lastWorkedDate)
          .whereType<DateTime>()
          .fold<DateTime?>(null, (a, b) => a == null ? b : (a.isAfter(b) ? a : b));
      return lastWorked != null && lastWorked.isBefore(cutoff);
    }).toList();
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.count,
    required this.label,
    required this.color,
    required this.backgroundColor,
  });

  final int count;
  final String label;
  final Color color;
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '$count',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: AppSpacing.xs),
          SizedBox(
            width: double.infinity,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.secondaryText,
                  ),
              textAlign: TextAlign.center,
              maxLines: 2,
              softWrap: true,
            ),
          ),
        ],
      ),
    );
  }
}

/// Territory row for dashboard lists: name, percentage, progress bar; taps open edit.
class TerritoryDashboardCard extends StatelessWidget {
  const TerritoryDashboardCard({super.key, required this.territory});

  final TerritoryModel territory;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => context.push('/admin/territories/edit/${territory.id}'),
      child: TerritoryProgressSummary(territory: territory),
    );
  }
}
