import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../assignments/providers/assignment_repository_provider.dart';
import '../providers/assignments_provider.dart';
import '../providers/territories_provider.dart';
import '../providers/users_provider.dart';
import '../../assignments/models/assignment_model.dart';
import '../../auth/models/user_model.dart';
import '../../meetings/models/meeting_location_model.dart';
import '../../meetings/providers/meeting_location_repository_provider.dart';
import '../../territories/models/territory_model.dart';
import 'admin_shell.dart';
import 'day_assignment_dialog.dart';
import '../../../../shared/widgets/app_card.dart';

/// Admin assignments screen - weekly territory assignments.
class AssignmentsScreen extends ConsumerWidget {
  const AssignmentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final weekStart = ref.watch(selectedWeekStartProvider);
    final asyncAssignments = ref.watch(assignmentsForWeekProvider);

    return asyncAssignments.when(
      loading: () => AdminShell(
        title: 'Designações',
        child: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => AdminShell(
        title: 'Designações',
        child: Center(child: Text('Erro: $e')),
      ),
      data: (assignments) => _AssignmentsContent(
        assignments: assignments,
        weekStart: weekStart,
      ),
    );
  }
}

class _AssignmentsContent extends ConsumerWidget {
  const _AssignmentsContent({
    required this.assignments,
    required this.weekStart,
  });

  final List<AssignmentModel> assignments;
  final DateTime weekStart;

  static const _days = [
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
    'Domingo',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncTerritories = ref.watch(territoriesProvider);
    final asyncUsers = ref.watch(usersProvider);
    final asyncLocations = ref.watch(meetingLocationsProvider);
    final territories =
        asyncTerritories.whenOrNull(data: (d) => d) ?? <TerritoryModel>[];
    final users = asyncUsers.whenOrNull(data: (d) => d) ?? <UserModel>[];
    final locations =
        asyncLocations.whenOrNull(data: (d) => d) ?? <MeetingLocationModel>[];

    return AdminShell(
      title: 'Designações',
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _WeekSelector(weekStart: weekStart),
            const SizedBox(height: AppSpacing.sectionSpacing),
            ...List.generate(6, (i) {
              final date = weekStart.add(Duration(days: i));
              final dayName = _days[i];
              final assignment = assignments
                  .where((a) =>
                      a.date.year == date.year &&
                      a.date.month == date.month &&
                      a.date.day == date.day)
                  .firstOrNull;

              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: _DayCard(
                  dayName: dayName,
                  date: date,
                  assignment: assignment,
                  territories: territories,
                  users: users,
                  locations: locations,
                  onTap: () => _openDayDialog(
                      context, ref, date, dayName, assignment, weekStart),
                ),
              );
            }),
            const SizedBox(height: AppSpacing.sectionSpacing),
            FilledButton.icon(
              onPressed: () => _generateAssignments(context, ref),
              icon: const Icon(Icons.auto_awesome),
              label: const Text('Gerar designações (em breve)'),
            ),
          ],
        ),
      ),
    );
  }

  void _openDayDialog(
    BuildContext context,
    WidgetRef ref,
    DateTime date,
    String dayName,
    AssignmentModel? assignment,
    DateTime weekStart,
  ) {
    showDialog<void>(
      context: context,
      builder: (ctx) => DayAssignmentDialog(
        date: date,
        dayName: dayName,
        initialAssignment: assignment,
      ),
    );
  }

  Future<void> _generateAssignments(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final repo = ref.read(assignmentRepositoryProvider);
    await repo.generateAssignments(weekStart);
    ref.invalidate(assignmentsProvider);
    ref.invalidate(assignmentsForWeekProvider);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Designações geradas'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}

class _WeekSelector extends ConsumerWidget {
  const _WeekSelector({required this.weekStart});

  final DateTime weekStart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final weekEnd = weekStart.add(const Duration(days: 6));
    final format = DateFormat('d/MM', 'pt_BR');

    return Row(
      children: [
        IconButton(
          icon: const Icon(Icons.chevron_left),
          onPressed: () {
            ref.read(selectedWeekStartProvider.notifier).state =
                weekStart.subtract(const Duration(days: 7));
          },
        ),
        Expanded(
          child: Center(
            child: Text(
              'Semana de ${format.format(weekStart)} – ${format.format(weekEnd)}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.chevron_right),
          onPressed: () {
            ref.read(selectedWeekStartProvider.notifier).state =
                weekStart.add(const Duration(days: 7));
          },
        ),
      ],
    );
  }
}

class _DayCard extends StatelessWidget {
  const _DayCard({
    required this.dayName,
    required this.date,
    required this.assignment,
    required this.territories,
    required this.users,
    required this.locations,
    required this.onTap,
  });

  final String dayName;
  final DateTime date;
  final AssignmentModel? assignment;
  final List<TerritoryModel> territories;
  final List<UserModel> users;
  final List<MeetingLocationModel> locations;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final conductor = assignment?.conductorId != null
        ? users
            .where((u) => u.id == assignment!.conductorId)
            .firstOrNull
        : null;
    final location = assignment?.meetingLocationId != null
        ? locations
            .where((l) => l.id == assignment!.meetingLocationId)
            .firstOrNull
        : null;
    final territoryIds = assignment?.allTerritoryIds ?? [];
    final territoryNames = territoryIds
        .map((id) => territories.where((t) => t.id == id).firstOrNull?.name)
        .whereType<String>()
        .toList();
    final summary = territoryNames.isNotEmpty
        ? (territoryNames.length > 2
            ? '${territoryNames.take(2).join(', ')} +${territoryNames.length - 2}'
            : territoryNames.join(', '))
        : null;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  dayName,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const Spacer(),
                Icon(
                  Icons.edit_outlined,
                  size: 18,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ],
            ),
            Text(
              DateFormat('d/MM/yyyy', 'pt_BR').format(date),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: AppSpacing.sm),
            if (assignment != null) ...[
              if (conductor != null)
                _InfoRow(
                  icon: Icons.person_outline,
                  label: conductor.name,
                ),
              if (location != null)
                _InfoRow(
                  icon: Icons.place_outlined,
                  label: location.name,
                ),
              if (summary != null)
                _InfoRow(
                  icon: Icons.map_outlined,
                  label: summary,
                ),
              if (conductor == null && location == null && summary == null)
                Text(
                  'Toque para configurar',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                        fontStyle: FontStyle.italic,
                      ),
                ),
            ] else
              Text(
                'Toque para designar dirigente, local e territórios',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontStyle: FontStyle.italic,
                    ),
              ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
