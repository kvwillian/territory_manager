import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_spacing.dart';
import '../data/mock_assignment_repository.dart';
import '../providers/assignments_provider.dart';
import '../providers/territories_provider.dart';
import '../../assignments/models/assignment_model.dart';
import 'admin_shell.dart';
import '../../../../shared/widgets/app_card.dart';

/// Admin assignments screen - weekly territory assignments.
class AssignmentsScreen extends ConsumerWidget {
  const AssignmentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncAssignments = ref.watch(assignmentsProvider);
    final weekStart = _getWeekStart(DateTime.now());

    return asyncAssignments.when(
      loading: () => AdminShell(
        title: 'Atribuições',
        child: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => AdminShell(
        title: 'Atribuições',
        child: Center(child: Text('Erro: $e')),
      ),
      data: (assignments) => _AssignmentsContent(
        assignments: assignments,
        weekStart: weekStart,
      ),
    );
  }

  DateTime _getWeekStart(DateTime date) {
    final weekday = date.weekday;
    return DateTime(date.year, date.month, date.day - (weekday - 1));
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
    final territories = asyncTerritories.hasValue ? asyncTerritories.value! : [];
    final weekAssignments = assignments
        .where((a) {
          return !a.date.isBefore(weekStart) &&
              a.date.isBefore(weekStart.add(const Duration(days: 7)));
        })
        .toList();

    return AdminShell(
      title: 'Atribuições',
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Semana de ${DateFormat('d/MM', 'pt_BR').format(weekStart)}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: AppSpacing.sectionSpacing),
            ...List.generate(6, (i) {
              final date = weekStart.add(Duration(days: i));
              final dayName = _days[i];
              final assignment = weekAssignments
                  .where((a) => a.date.day == date.day)
                  .firstOrNull;
              final territory = assignment != null
                  ? territories
                      .where((t) => t.id == assignment.territoryId)
                      .firstOrNull
                  : null;

              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        dayName,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      Text(
                        DateFormat('d/MM/yyyy', 'pt_BR').format(date),
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        territory?.name ?? 'Nenhum território atribuído',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: AppSpacing.sectionSpacing),
            FilledButton.icon(
              onPressed: () => _generateAssignments(context, ref),
              icon: const Icon(Icons.auto_awesome),
              label: const Text('Gerar atribuições'),
            ),
          ],
        ),
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
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Atribuições geradas'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
