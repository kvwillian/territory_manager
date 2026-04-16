import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../assignments/models/assignment_model.dart';
import '../../auth/models/user_model.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../../meetings/models/meeting_location_model.dart';
import '../../territories/models/territory_model.dart';
import '../../territories/utils/neighborhood_territory_utils.dart';
import '../../assignments/providers/assignment_repository_provider.dart';
import '../providers/assignments_provider.dart';
import '../providers/territories_provider.dart';
import '../providers/users_provider.dart';
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
  /// When true, lista todos os territórios (ignora o permitido no local de saída).
  bool _allowOutsidePermittedRange = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialAssignment != null) {
      _conductorId = widget.initialAssignment!.conductorId;
      _meetingLocationId = widget.initialAssignment!.meetingLocationId;
      _selectedTerritoryIds.addAll(widget.initialAssignment!.allTerritoryIds);
    }
  }

  void _pruneTerritoriesToAllowed(List<MeetingLocationModel> locations) {
    if (_meetingLocationId == null) return;
    final loc = _locationById(_meetingLocationId, locations);
    if (loc == null) return;
    if (_allowOutsidePermittedRange) return;

    final allowed = loc.allowedTerritories.toSet();
    final hasOutsideSelection =
        _selectedTerritoryIds.any((id) => !allowed.contains(id));
    if (hasOutsideSelection) {
      setState(() => _allowOutsidePermittedRange = true);
    }
  }

  void _onMeetingLocationChanged(
    String? id,
    List<MeetingLocationModel> locations,
  ) {
    setState(() {
      _meetingLocationId = id;
      if (id == null) {
        _selectedTerritoryIds.clear();
        return;
      }
      if (_allowOutsidePermittedRange) return;
      final loc = _locationById(id, locations);
      if (loc == null) return;
      final allowed = loc.allowedTerritories.toSet();
      _selectedTerritoryIds.removeWhere((tid) => !allowed.contains(tid));
    });
  }

  void _onOutsideRangeToggled(bool value, List<MeetingLocationModel> locations) {
    setState(() {
      _allowOutsidePermittedRange = value;
      if (!value) {
        if (_meetingLocationId == null) return;
        final loc = _locationById(_meetingLocationId, locations);
        if (loc == null) return;
        final allowed = loc.allowedTerritories.toSet();
        _selectedTerritoryIds.removeWhere((tid) => !allowed.contains(tid));
      }
    });
  }

  MeetingLocationModel? _locationById(
    String? id,
    List<MeetingLocationModel> locations,
  ) {
    if (id == null) return null;
    try {
      return locations.firstWhere((l) => l.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<List<MeetingLocationModel>>>(
      meetingLocationsProvider,
      (previous, next) {
        next.whenData(_pruneTerritoriesToAllowed);
      },
    );

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
                        onChanged: (id) => _onMeetingLocationChanged(
                          id,
                          asyncLocations.whenOrNull(data: (d) => d) ?? [],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Text(
                              'Usar território fora do alcance permitido',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(fontSize: 13),
                            ),
                          ),
                          Switch(
                            value: _allowOutsidePermittedRange,
                            onChanged: (v) => _onOutsideRangeToggled(
                              v,
                              asyncLocations.whenOrNull(data: (d) => d) ?? [],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      _TerritoriesSelector(
                        meetingLocationId: _meetingLocationId,
                        locations: asyncLocations.whenOrNull(data: (d) => d) ?? [],
                        allowOutsidePermittedRange: _allowOutsidePermittedRange,
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
    ref.invalidate(nextAssignmentForConductorProvider);
    ref.invalidate(conductorAssignmentForDateProvider);
    ref.invalidate(conductorAssignmentDatesProvider);
    if (context.mounted) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Designação salva'),
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
          'Dirigente',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
        const SizedBox(height: AppSpacing.xs),
        DropdownButtonFormField<String>(
          value: conductorId,
          decoration: const InputDecoration(
            hintText: 'Selecione o dirigente',
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
    required this.meetingLocationId,
    required this.locations,
    required this.allowOutsidePermittedRange,
    required this.selectedIds,
    required this.territories,
    required this.onToggle,
  });

  final String? meetingLocationId;
  final List<MeetingLocationModel> locations;
  final bool allowOutsidePermittedRange;
  final Set<String> selectedIds;
  final List<TerritoryModel> territories;
  final ValueChanged<String> onToggle;

  List<TerritoryModel> _eligibleTerritories() {
    if (meetingLocationId == null) return [];
    MeetingLocationModel? loc;
    try {
      loc = locations.firstWhere((l) => l.id == meetingLocationId);
    } catch (_) {
      return [];
    }
    final allowed = loc.allowedTerritories.toSet();
    if (allowed.isEmpty) return [];
    return territories.where((t) => allowed.contains(t.id)).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (!allowOutsidePermittedRange && meetingLocationId == null) {
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
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Text(
              'Selecione o local de saída para ver os territórios permitidos — ou ative a opção acima para listar todos.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ),
        ],
      );
    }

    if (allowOutsidePermittedRange) {
      if (territories.isEmpty) {
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
      return _buildTerritoryGroups(context, territories);
    }

    final eligible = _eligibleTerritories();
    final loc = _locationById(meetingLocationId, locations);

    if (loc != null && loc.allowedTerritories.isEmpty) {
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
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Text(
              'Este local não tem territórios permitidos. Configure-os em Locais de saída.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ),
        ],
      );
    }

    if (eligible.isEmpty) {
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
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Text(
              'Nenhum território permitido encontrado para este local.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ),
        ],
      );
    }

    return _buildTerritoryGroups(context, eligible);
  }

  Widget _buildTerritoryGroups(
    BuildContext context,
    List<TerritoryModel> eligible,
  ) {
    final grouped = groupTerritoriesByNeighborhood(eligible);

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
                        title: Text(
                          t.number != null && t.number!.isNotEmpty
                              ? '${t.number} - ${t.name}'
                              : t.name,
                        ),
                        value: selectedIds.contains(t.id),
                        onChanged: (_) => onToggle(t.id),
                      ))
                  .toList(),
            ),
          );
        }),
      ],
    );
  }

  MeetingLocationModel? _locationById(
    String? id,
    List<MeetingLocationModel> locations,
  ) {
    if (id == null) return null;
    try {
      return locations.firstWhere((l) => l.id == id);
    } catch (_) {
      return null;
    }
  }
}
