import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../../publishers/models/publisher_model.dart';
import '../../publishers/providers/publisher_repository_provider.dart';
import '../models/elderly_support_schedule.dart';
import '../providers/designations_provider.dart';

class AudioVideoRosterScreen extends ConsumerWidget {
  const AudioVideoRosterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rosters = ref.watch(audioVideoRostersProvider);
    return rosters.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => const Center(
        child: Text('Não foi possível carregar o áudio e vídeo.'),
      ),
      data: (items) {
        if (items.isEmpty) {
          return const Center(child: Text('Nenhuma escala enviada.'));
        }
        return ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            for (final roster in items) ...[
              Text(roster.label, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              for (final row in roster.rows)
                ListTile(
                  title: Text('Dia ${row.day}'),
                  subtitle: Text(
                    'Indicadores: ${row.attendants.isEmpty ? '—' : row.attendants}\n'
                    'Microfones: ${row.microphones.isEmpty ? '—' : row.microphones}\n'
                    'Mesa de som: ${row.sound.isEmpty ? '—' : row.sound}',
                  ),
                ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ],
        );
      },
    );
  }
}

class CleaningAssignmentsScreen extends ConsumerWidget {
  const CleaningAssignmentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cleaning = ref.watch(cleaningAssignmentsProvider);
    return cleaning.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => const Center(
        child: Text('Não foi possível carregar a limpeza.'),
      ),
      data: (people) {
        final entries = people.entries
            .where((item) => item.value.trim().isNotEmpty)
            .toList()
          ..sort((a, b) => a.key.compareTo(b.key));
        if (entries.isEmpty) {
          return const Center(child: Text('Nenhuma limpeza enviada.'));
        }
        return ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            for (final entry in entries)
              ListTile(
                title: Text(_label(entry.key)),
                subtitle: Text(entry.value),
              ),
          ],
        );
      },
    );
  }

  String _label(String meetingId) {
    final date = RegExp(r'\d{4}-\d{2}-\d{2}').firstMatch(meetingId)?.group(0);
    final kind =
        meetingId.startsWith('weekend') ? 'Fim de semana' : 'Meio de semana';
    if (date == null) return kind;
    final parts = date.split('-');
    return '$kind · ${parts[2]}/${parts[1]}/${parts[0]}';
  }
}

class ElderlySupportScreen extends ConsumerWidget {
  const ElderlySupportScreen({super.key});

  Future<void> _toggleStatus(
    WidgetRef ref,
    ElderlySupportSchedule schedule,
  ) async {
    final callable = schedule.isPublished
        ? 'unpublishElderlySupportSchedule'
        : 'publishElderlySupportSchedule';
    await FirebaseFunctions.instance
        .httpsCallable(callable)
        .call({'scheduleId': schedule.id});
    ref.invalidate(elderlySupportSchedulesProvider);
  }

  Future<void> _addAssignmentDialog(
    BuildContext context,
    WidgetRef ref,
    ElderlySupportSchedule? currentSchedule,
    List<PublisherModel> elderlyPeople,
    List<PublisherModel> drivers,
  ) async {
    final now = DateTime.now();
    var selectedDate = DateTime(now.year, now.month, now.day);
    PublisherModel? selectedElderly =
        elderlyPeople.isNotEmpty ? elderlyPeople.first : null;
    PublisherModel? selectedDriver = drivers.isNotEmpty ? drivers.first : null;
    final noteController =
        TextEditingController(text: currentSchedule?.note ?? '');

    final saved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        var saving = false;
        return StatefulBuilder(
          builder: (context, setState) {
            final isoDate =
                '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}';
            return AlertDialog(
              title: const Text('Nova carona / apoio'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Data da reunião'),
                      subtitle: Text(
                        '${selectedDate.day.toString().padLeft(2, '0')}/${selectedDate.month.toString().padLeft(2, '0')}/${selectedDate.year}',
                      ),
                      trailing: const Icon(Icons.calendar_today_outlined),
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: selectedDate,
                          firstDate: DateTime(now.year - 1),
                          lastDate: DateTime(now.year + 2),
                        );
                        if (picked != null) {
                          setState(() => selectedDate = picked);
                        }
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    DropdownButtonFormField<PublisherModel>(
                      initialValue: selectedElderly,
                      decoration: const InputDecoration(labelText: 'Idoso'),
                      items: [
                        for (final person in elderlyPeople)
                          DropdownMenuItem(
                            value: person,
                            child: Text(person.name),
                          ),
                      ],
                      onChanged: (value) =>
                          setState(() => selectedElderly = value),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    DropdownButtonFormField<PublisherModel?>(
                      initialValue: selectedDriver,
                      decoration: const InputDecoration(labelText: 'Motorista'),
                      items: [
                        const DropdownMenuItem<PublisherModel?>(
                          value: null,
                          child: Text('Sem motorista definido'),
                        ),
                        for (final person in drivers)
                          DropdownMenuItem<PublisherModel?>(
                            value: person,
                            child: Text(person.name),
                          ),
                      ],
                      onChanged: (value) =>
                          setState(() => selectedDriver = value),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextField(
                      controller: noteController,
                      decoration: const InputDecoration(
                        labelText: 'Observação (opcional)',
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: saving
                      ? null
                      : () => Navigator.pop(dialogContext, false),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: saving || selectedElderly == null
                      ? null
                      : () async {
                          setState(() => saving = true);
                          try {
                            final newEntry = ElderlyAssignment(
                              date: isoDate,
                              elderlyName: selectedElderly!.name,
                              elderlyPublisherId: selectedElderly!.id,
                              driverName: selectedDriver?.name ?? '',
                              driverPublisherId: selectedDriver?.id,
                            );
                            if (currentSchedule != null) {
                              final updated = [
                                ...currentSchedule.assignments,
                                newEntry,
                              ];
                              await FirebaseFunctions.instance
                                  .httpsCallable(
                                    'updateElderlySupportAssignments',
                                  )
                                  .call({
                                'scheduleId': currentSchedule.id,
                                'note': noteController.text.trim(),
                                'assignments':
                                    updated.map((e) => e.toMap()).toList(),
                              });
                            } else {
                              await FirebaseFunctions.instance
                                  .httpsCallable(
                                    'createElderlySupportSchedule',
                                  )
                                  .call({
                                'title':
                                    'Suporte a idosos — ${selectedDate.month.toString().padLeft(2, '0')}/${selectedDate.year}',
                                'note': noteController.text.trim(),
                                'assignments': [newEntry.toMap()],
                              });
                            }
                            if (dialogContext.mounted) {
                              Navigator.pop(dialogContext, true);
                            }
                          } finally {
                            if (dialogContext.mounted) {
                              setState(() => saving = false);
                            }
                          }
                        },
                  child: Text(saving ? 'Salvando…' : 'Salvar'),
                ),
              ],
            );
          },
        );
      },
    );
    if (saved == true) {
      ref.invalidate(elderlySupportSchedulesProvider);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final canManage =
        auth is AuthAuthenticated && auth.user.canManageElderlySupport;
    final schedules = ref.watch(elderlySupportSchedulesProvider);
    final publishers = ref.watch(publishersProvider).maybeWhen(
          data: (items) => items,
          orElse: () => const <PublisherModel>[],
        );
    final elderlyPeople = publishers
        .where((p) => p.status != 'inactive' && p.needsElderlySupport)
        .toList();
    final drivers =
        publishers.where((p) => p.status != 'inactive' && p.driver).toList();

    return schedules.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => const Center(
        child: Text('Não foi possível carregar a escala de suporte a idosos.'),
      ),
      data: (items) {
        final visible = items
            .where((item) => canManage || item.isPublished)
            .toList();
        return Stack(
          children: [
            visible.isEmpty
                ? const Center(child: Text('Nenhuma escala publicada.'))
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.screenPadding,
                      AppSpacing.screenPadding,
                      AppSpacing.screenPadding,
                      88,
                    ),
                    itemCount: visible.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.md),
                    itemBuilder: (context, index) {
                      final schedule = visible[index];
                      return AppCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    schedule.title ?? 'Suporte a idosos',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.deepNavy,
                                        ),
                                  ),
                                ),
                                StatusBadge(
                                  label: schedule.isPublished
                                      ? 'Publicada'
                                      : 'Rascunho',
                                  tone: schedule.isPublished
                                      ? StatusTone.available
                                      : StatusTone.pending,
                                ),
                                if (canManage)
                                  TextButton(
                                    onPressed: () =>
                                        _toggleStatus(ref, schedule),
                                    child: Text(
                                      schedule.isPublished
                                          ? 'Voltar rascunho'
                                          : 'Publicar',
                                    ),
                                  ),
                              ],
                            ),
                            if (schedule.note != null) ...[
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                schedule.note!,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                            const SizedBox(height: AppSpacing.sm),
                            for (final row in schedule.assignments)
                              Padding(
                                padding: const EdgeInsets.only(
                                  top: AppSpacing.xs,
                                ),
                                child: Row(
                                  children: [
                                    SizedBox(
                                      width: 88,
                                      child: Text(
                                        row.formattedDate,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w600,
                                            ),
                                      ),
                                    ),
                                    Expanded(
                                      child: Text(
                                        'Idoso: ${row.elderlyName}\nMotorista: ${row.driverName.isEmpty ? '—' : row.driverName}',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
            if (canManage)
              Positioned(
                right: AppSpacing.screenPadding,
                bottom: AppSpacing.screenPadding,
                child: FloatingActionButton.extended(
                  onPressed: elderlyPeople.isEmpty
                      ? null
                      : () => _addAssignmentDialog(
                            context,
                            ref,
                            visible.isNotEmpty ? visible.first : null,
                            elderlyPeople,
                            drivers,
                          ),
                  icon: const Icon(Icons.directions_car_outlined),
                  label: const Text('Adicionar apoio'),
                ),
              ),
          ],
        );
      },
    );
  }
}

enum _QualificationFilter {
  all,
  estudante,
  indicador,
  volante,
  microfone,
  som,
  needsElderlySupport,
  driver,
}

const _qualificationLabels = <_QualificationFilter, String>{
  _QualificationFilter.all: 'Todos',
  _QualificationFilter.estudante: 'Estudante',
  _QualificationFilter.indicador: 'Indicador',
  _QualificationFilter.volante: 'Volante',
  _QualificationFilter.microfone: 'Microfone',
  _QualificationFilter.som: 'Áudio / Som',
  _QualificationFilter.needsElderlySupport: 'Precisa de apoio',
  _QualificationFilter.driver: 'Motorista',
};

class PublisherQualificationsScreen extends ConsumerStatefulWidget {
  const PublisherQualificationsScreen({super.key});

  @override
  ConsumerState<PublisherQualificationsScreen> createState() =>
      _PublisherQualificationsScreenState();
}

class _PublisherQualificationsScreenState
    extends ConsumerState<PublisherQualificationsScreen> {
  final _searchController = TextEditingController();
  _QualificationFilter _filter = _QualificationFilter.all;
  String? _savingPublisherId;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool _matches(PublisherModel publisher) {
    if (publisher.status == 'inactive') return false;
    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty && !publisher.name.toLowerCase().contains(query)) {
      return false;
    }
    return switch (_filter) {
      _QualificationFilter.all => true,
      _QualificationFilter.estudante => publisher.estudante,
      _QualificationFilter.indicador => publisher.indicador,
      _QualificationFilter.volante => publisher.volante,
      _QualificationFilter.microfone => publisher.microfone,
      _QualificationFilter.som => publisher.som,
      _QualificationFilter.needsElderlySupport => publisher.needsElderlySupport,
      _QualificationFilter.driver => publisher.driver,
    };
  }

  Future<void> _toggle(PublisherModel updated) async {
    setState(() => _savingPublisherId = updated.id);
    try {
      await ref.read(publisherRepositoryProvider).updatePublisher(updated);
      ref.invalidate(publishersProvider);
    } finally {
      if (mounted) setState(() => _savingPublisherId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final canEdit = auth is AuthAuthenticated &&
        (auth.user.isAdmin ||
            auth.user.canManageMeetings ||
            auth.user.canManagePublishers ||
            auth.user.canManageElderlySupport);
    final publishers = ref.watch(publishersProvider);

    return publishers.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Erro: $error')),
      data: (items) {
        final visible = items.where(_matches).toList();
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenPadding,
                AppSpacing.md,
                AppSpacing.screenPadding,
                0,
              ),
              child: TextField(
                controller: _searchController,
                decoration: const InputDecoration(
                  labelText: 'Buscar publicador',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
            SizedBox(
              height: 56,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.screenPadding,
                  vertical: AppSpacing.sm,
                ),
                children: [
                  for (final filter in _QualificationFilter.values)
                    Padding(
                      padding: const EdgeInsets.only(right: AppSpacing.sm),
                      child: FilterChip(
                        label: Text(_qualificationLabels[filter]!),
                        selected: _filter == filter,
                        onSelected: (_) => setState(() => _filter = filter),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: visible.isEmpty
                  ? const Center(child: Text('Nenhum publicador ativo encontrado'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(AppSpacing.screenPadding),
                      itemCount: visible.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: AppSpacing.md),
                      itemBuilder: (context, index) {
                        final publisher = visible[index];
                        final saving = _savingPublisherId == publisher.id;
                        return AppCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: AppColors.secondaryPurple,
                                    child: Text(
                                      publisher.name.isEmpty
                                          ? '?'
                                          : publisher.name[0].toUpperCase(),
                                      style: const TextStyle(
                                        color: AppColors.richViolet,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          publisher.name,
                                          style: Theme.of(context)
                                              .textTheme
                                              .titleSmall
                                              ?.copyWith(
                                                fontWeight: FontWeight.w700,
                                                color: AppColors.deepNavy,
                                              ),
                                        ),
                                        Text(
                                          publisher.subtitle,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall,
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (saving)
                                    const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Wrap(
                                spacing: AppSpacing.sm,
                                runSpacing: AppSpacing.xs,
                                children: [
                                  FilterChip(
                                    label: const Text('Estudante'),
                                    selected: publisher.estudante,
                                    onSelected: canEdit && !saving
                                        ? (value) => _toggle(
                                              publisher.copyWith(
                                                estudante: value,
                                              ),
                                            )
                                        : null,
                                  ),
                                  FilterChip(
                                    label: const Text('Indicador'),
                                    selected: publisher.indicador,
                                    onSelected: canEdit && !saving
                                        ? (value) => _toggle(
                                              publisher.copyWith(
                                                indicador: value,
                                              ),
                                            )
                                        : null,
                                  ),
                                  FilterChip(
                                    label: const Text('Volante'),
                                    selected: publisher.volante,
                                    onSelected: canEdit && !saving
                                        ? (value) => _toggle(
                                              publisher.copyWith(
                                                volante: value,
                                              ),
                                            )
                                        : null,
                                  ),
                                  FilterChip(
                                    label: const Text('Microfone'),
                                    selected: publisher.microfone,
                                    onSelected: canEdit && !saving
                                        ? (value) => _toggle(
                                              publisher.copyWith(
                                                microfone: value,
                                              ),
                                            )
                                        : null,
                                  ),
                                  FilterChip(
                                    label: const Text('Áudio / Som'),
                                    selected: publisher.som,
                                    onSelected: canEdit && !saving
                                        ? (value) => _toggle(
                                              publisher.copyWith(som: value),
                                            )
                                        : null,
                                  ),
                                  FilterChip(
                                    label: const Text('Precisa de apoio'),
                                    selected: publisher.needsElderlySupport,
                                    onSelected: canEdit && !saving
                                        ? (value) => _toggle(
                                              publisher.copyWith(
                                                needsElderlySupport: value,
                                              ),
                                            )
                                        : null,
                                  ),
                                  FilterChip(
                                    label: const Text('Motorista'),
                                    selected: publisher.driver,
                                    onSelected: canEdit && !saving
                                        ? (value) => _toggle(
                                              publisher.copyWith(driver: value),
                                            )
                                        : null,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}
