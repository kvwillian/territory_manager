import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../assignments/models/assignment_model.dart';
import '../../auth/models/user_model.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../../meetings/models/meeting_location_model.dart';
import '../../territories/models/territory_model.dart';
import '../../assignments/providers/assignment_repository_provider.dart';
import '../providers/assignments_provider.dart';
import '../providers/territories_provider.dart';
import '../providers/users_provider.dart';
import 'territories_list_screen.dart';
import '../../meetings/providers/meeting_location_repository_provider.dart';

/// Dialog to manually assign conductor, meeting location, and territories for a day.
class DayAssignmentDialog extends ConsumerStatefulWidget {
  const DayAssignmentDialog({
    super.key,
    required this.date,
    required this.dayName,
    this.initialAssignment,
  });

  final DateTime date;
  final String dayName;
  final AssignmentModel? initialAssignment;

  @override
  ConsumerState<DayAssignmentDialog> createState() => _DayAssignmentDialogState();
}

class _DayAssignmentDialogState extends ConsumerState<DayAssignmentDialog> {
  String? _conductorId;
  String? _meetingLocationId;
  final Set<String> _selectedTerritoryIds = {};

  @override
  void initState() {
    super.initState();
    if (widget.initialAssignment != null) {
      _conductorId = widget.initialAssignment!.conductorId;
      _meetingLocationId = widget.initialAssignment!.meetingLocationId;
      _selectedTerritoryIds.addAll(widget.initialAssignment!.allTerritoryIds);
    }
  }

  @override
  Widget build(BuildContext context) {
    final asyncUsers = ref.watch(usersProvider);
    final asyncLocations = ref.watch(meetingLocationsProvider);
    final asyncTerritories = ref.watch(territoriesProvider);

    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.dayName,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        Text(
                          DateFormat('d/MM/yyyy', 'pt_BR').format(widget.date),
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                              ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _ConductorSelector(
                        conductorId: _conductorId,
                        users: asyncUsers.whenOrNull(data: (d) => d) ?? [],
                        onChanged: (id) =>
                            setState(() => _conductorId = id),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _MeetingLocationSelector(
                        meetingLocationId: _meetingLocationId,
                        locations: asyncLocations.whenOrNull(data: (d) => d) ?? [],
                        onChanged: (id) =>
                            setState(() => _meetingLocationId = id),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _TerritoriesSelector(
                        selectedIds: _selectedTerritoryIds,
                        territories: asyncTerritories.whenOrNull(data: (d) => d) ?? [],
                        onToggle: (id) {
                          setState(() {
                            if (_selectedTerritoryIds.contains(id)) {
                              _selectedTerritoryIds.remove(id);
                            } else {
                              _selectedTerritoryIds.add(id);
                            }
                          });
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Cancelar'),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  FilledButton(
                    onPressed: () => _save(context),
                    child: const Text('Salvar'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _save(BuildContext context) async {
    final repo = ref.read(assignmentRepositoryProvider);
    final congregationId = ref.read(currentCongregationProvider);
    final id = widget.initialAssignment?.id ??
        'a${DateTime.now().millisecondsSinceEpoch}';
    final assignment = AssignmentModel(
      id: id,
      date: widget.date,
      conductorId: _conductorId,
      meetingLocationId: _meetingLocationId,
      territoryIds: _selectedTerritoryIds.toList(),
      congregationId: congregationId,
    );
    await repo.saveAssignment(assignment);
    ref.invalidate(assignmentsProvider);
    ref.invalidate(assignmentsForWeekProvider);
    if (context.mounted) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Atribuição salva'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}

class _ConductorSelector extends StatelessWidget {
  const _ConductorSelector({
    required this.conductorId,
    required this.users,
    required this.onChanged,
  });

  final String? conductorId;
  final List<UserModel> users;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final conductors = users.where((u) => u.isConductor).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Condutor',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
        const SizedBox(height: AppSpacing.xs),
        DropdownButtonFormField<String>(
          value: conductorId,
          decoration: const InputDecoration(
            hintText: 'Selecione o condutor',
            border: OutlineInputBorder(),
          ),
          items: [
            const DropdownMenuItem(value: null, child: Text('— Nenhum —')),
            ...conductors.map((u) => DropdownMenuItem(
                  value: u.id,
                  child: Text(u.name),
                )),
          ],
          onChanged: onChanged,
        ),
      ],
    );
  }
}

class _MeetingLocationSelector extends StatelessWidget {
  const _MeetingLocationSelector({
    required this.meetingLocationId,
    required this.locations,
    required this.onChanged,
  });

  final String? meetingLocationId;
  final List<MeetingLocationModel> locations;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Local de Saída',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
        const SizedBox(height: AppSpacing.xs),
        DropdownButtonFormField<String>(
          value: meetingLocationId,
          decoration: const InputDecoration(
            hintText: 'Selecione o local de saída',
            border: OutlineInputBorder(),
          ),
          items: [
            const DropdownMenuItem(value: null, child: Text('— Nenhum —')),
            ...locations.map((l) => DropdownMenuItem(
                  value: l.id,
                  child: Text(l.name),
                )),
          ],
          onChanged: onChanged,
        ),
      ],
    );
  }
}

class _TerritoriesSelector extends StatelessWidget {
  const _TerritoriesSelector({
    required this.selectedIds,
    required this.territories,
    required this.onToggle,
  });

  final Set<String> selectedIds;
  final List<TerritoryModel> territories;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    final grouped = groupTerritoriesByNeighborhood(territories);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Territórios (por bairro)',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
        const SizedBox(height: AppSpacing.sm),
        ...grouped.entries.map((e) {
          return Card(
            margin: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: ExpansionTile(
              title: Text(
                e.key,
                style: Theme.of(context).textTheme.titleSmall,
              ),
              subtitle: Text(
                '${e.value.length} território(s)',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              children: e.value
                  .map((t) => CheckboxListTile(
                        title: Text(t.name),
                        value: selectedIds.contains(t.id),
                        onChanged: (_) => onToggle(t.id),
                      ))
                  .toList(),
            ),
          );
        }),
        if (grouped.isEmpty)
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Text(
              'Nenhum território cadastrado',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ),
      ],
    );
  }
}
