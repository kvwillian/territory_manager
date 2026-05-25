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
import '../../field_groups/models/field_group_model.dart';
import '../../field_groups/providers/field_group_repository_provider.dart';

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
  final List<String> _conductorIds = [];
  String? _meetingLocationId;
  String? _groupId;
  final Set<String> _selectedTerritoryIds = {};
  /// When true, lista todos os territórios (ignora o permitido no local de saída).
  bool _allowOutsidePermittedRange = false;

  bool get _isSunday => widget.date.weekday == DateTime.sunday;

  @override
  void initState() {
    super.initState();
    if (widget.initialAssignment != null) {
      final a = widget.initialAssignment!;
      _conductorIds.addAll(a.conductorIds);
      _meetingLocationId = a.meetingLocationId;
      _groupId = a.groupId;
      _selectedTerritoryIds.addAll(a.allTerritoryIds);
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
    final asyncGroups = ref.watch(fieldGroupsProvider);
    final fieldGroups = asyncGroups.when(
      data: (d) => d,
      loading: () => <FieldGroupModel>[],
      error: (_, __) => <FieldGroupModel>[],
    );
    final fieldGroupsLoading = asyncGroups.when(
      data: (_) => false,
      loading: () => true,
      error: (_, __) => false,
    );

    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 640),
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
                      _ConductorMultiSelector(
                        selectedIds: _conductorIds,
                        users: asyncUsers.whenOrNull(data: (d) => d) ?? [],
                        onToggle: (id) {
                          setState(() {
                            if (_conductorIds.contains(id)) {
                              _conductorIds.remove(id);
                            } else {
                              _conductorIds.add(id);
                            }
                          });
                        },
                      ),
                      if (_isSunday) ...[
                        const SizedBox(height: AppSpacing.md),
                        _SundayGroupSelector(
                          groupId: _groupId,
                          groups: fieldGroups,
                          loading: fieldGroupsLoading,
                          onChanged: (id) => setState(() => _groupId = id),
                        ),
                      ],
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
      conductorIds: List<String>.from(_conductorIds),
      meetingLocationId: _meetingLocationId,
      territoryIds: _selectedTerritoryIds.toList(),
      congregationId: congregationId,
      groupId: _isSunday ? _groupId : null,
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

class _ConductorMultiSelector extends StatelessWidget {
  const _ConductorMultiSelector({
    required this.selectedIds,
    required this.users,
    required this.onToggle,
  });

  final List<String> selectedIds;
  final List<UserModel> users;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    final conductors = users.where((u) => u.isConductor).toList()
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Dirigentes',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
        const SizedBox(height: AppSpacing.xs),
        if (conductors.isEmpty)
          Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: Text(
              'Nenhum usuário com perfil de condutor.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          )
        else
          ...conductors.map(
            (u) => CheckboxListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(u.name),
              value: selectedIds.contains(u.id),
              onChanged: (_) => onToggle(u.id),
            ),
          ),
      ],
    );
  }
}

class _SundayGroupSelector extends StatelessWidget {
  const _SundayGroupSelector({
    required this.groupId,
    required this.groups,
    required this.loading,
    required this.onChanged,
  });

  final String? groupId;
  final List<FieldGroupModel> groups;
  final bool loading;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Grupo (domingo)',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
        const SizedBox(height: AppSpacing.xs),
        if (loading)
          const Padding(
            padding: EdgeInsets.all(AppSpacing.sm),
            child: LinearProgressIndicator(),
          )
        else
          DropdownButtonFormField<String>(
            value: groupId,
            decoration: const InputDecoration(
              hintText: 'Grupo para o texto do WhatsApp',
              border: OutlineInputBorder(),
            ),
            items: [
              const DropdownMenuItem(value: null, child: Text('— Nenhum —')),
              ...groups.map(
                (g) => DropdownMenuItem(
                  value: g.id,
                  child: Text(g.name),
                ),
              ),
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
