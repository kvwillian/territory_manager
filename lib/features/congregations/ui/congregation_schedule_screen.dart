import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/congregation_model.dart';
import '../providers/congregation_repository_provider.dart';

/// Dia e hora das reuniões do meio de semana e do fim de semana.
/// Admin grava. Condutor só lê. O serviço de campo continua nas designações.
class CongregationScheduleScreen extends ConsumerWidget {
  const CongregationScheduleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final congregation = ref.watch(congregationProvider);
    final auth = ref.watch(authStateProvider);
    final canEdit = auth is AuthAuthenticated && auth.user.isAdmin;

    return congregation.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Erro: $error')),
      data: (item) {
        if (item == null) {
          return const Center(
            child: Text('Cadastro da congregação não encontrado'),
          );
        }
        return _ScheduleForm(
          congregation: item,
          canEdit: canEdit,
        );
      },
    );
  }
}

class _ScheduleForm extends ConsumerStatefulWidget {
  const _ScheduleForm({
    required this.congregation,
    required this.canEdit,
  });

  final CongregationModel congregation;
  final bool canEdit;

  @override
  ConsumerState<_ScheduleForm> createState() => _ScheduleFormState();
}

class _ScheduleFormState extends ConsumerState<_ScheduleForm> {
  final _formKey = GlobalKey<FormState>();
  late int? _midweekWeekday;
  late TimeOfDay? _midweekTime;
  late int? _weekendWeekday;
  late TimeOfDay? _weekendTime;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _apply(widget.congregation);
  }

  @override
  void didUpdateWidget(covariant _ScheduleForm oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.congregation != widget.congregation) {
      _apply(widget.congregation);
    }
  }

  void _apply(CongregationModel congregation) {
    _midweekWeekday = congregation.midweekWeekday;
    _midweekTime = _parseTime(congregation.midweekTime);
    _weekendWeekday = congregation.weekendWeekday;
    _weekendTime = _parseTime(congregation.weekendTime);
  }

  Future<TimeOfDay?> _pickTime({required bool midweek}) async {
    if (!widget.canEdit) return midweek ? _midweekTime : _weekendTime;
    final current = midweek ? _midweekTime : _weekendTime;
    final picked = await showTimePicker(
      context: context,
      initialTime: current ?? const TimeOfDay(hour: 19, minute: 0),
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
    if (picked == null) return current;
    setState(() {
      if (midweek) {
        _midweekTime = picked;
      } else {
        _weekendTime = picked;
      }
    });
    return picked;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final midweekTime = _midweekTime;
    final weekendTime = _weekendTime;
    final midweekWeekday = _midweekWeekday;
    final weekendWeekday = _weekendWeekday;
    if (midweekTime == null ||
        weekendTime == null ||
        midweekWeekday == null ||
        weekendWeekday == null) {
      return;
    }

    setState(() => _saving = true);
    try {
      await ref.read(congregationRepositoryProvider).saveMeetingSchedule(
            id: widget.congregation.id,
            midweekWeekday: midweekWeekday,
            midweekTime: _formatTime(midweekTime),
            weekendWeekday: weekendWeekday,
            weekendTime: _formatTime(weekendTime),
          );
      ref.invalidate(congregationProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Horários salvos'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao salvar: $error'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final place = [
      widget.congregation.name,
      widget.congregation.city,
    ].where((part) => part.isNotEmpty).join(' · ');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.screenPadding),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Horários das reuniões',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            if (place.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(place, style: Theme.of(context).textTheme.bodyMedium),
            ],
            const SizedBox(height: AppSpacing.sectionSpacing),
            _MeetingCard(
              title: 'Meio de semana',
              weekday: _midweekWeekday,
              time: _midweekTime,
              canEdit: widget.canEdit,
              onWeekday: (day) => setState(() => _midweekWeekday = day),
              onTime: () => _pickTime(midweek: true),
            ),
            const SizedBox(height: AppSpacing.md),
            _MeetingCard(
              title: 'Fim de semana',
              weekday: _weekendWeekday,
              time: _weekendTime,
              canEdit: widget.canEdit,
              onWeekday: (day) => setState(() => _weekendWeekday = day),
              onTime: () => _pickTime(midweek: false),
            ),
            if (widget.canEdit) ...[
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Salvar'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MeetingCard extends StatelessWidget {
  const _MeetingCard({
    required this.title,
    required this.weekday,
    required this.time,
    required this.canEdit,
    required this.onWeekday,
    required this.onTime,
  });

  final String title;
  final int? weekday;
  final TimeOfDay? time;
  final bool canEdit;
  final ValueChanged<int?> onWeekday;
  final Future<TimeOfDay?> Function() onTime;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.md),
          DropdownButtonFormField<int>(
            value: weekday,
            decoration: const InputDecoration(labelText: 'Dia'),
            items: [
              for (final entry in congregationWeekdayLabels.entries)
                DropdownMenuItem(value: entry.key, child: Text(entry.value)),
            ],
            onChanged: canEdit ? onWeekday : null,
            validator: (value) => value == null ? 'Obrigatório' : null,
          ),
          const SizedBox(height: AppSpacing.md),
          FormField<TimeOfDay>(
            initialValue: time,
            validator: (value) => value == null ? 'Obrigatório' : null,
            builder: (state) {
              final shown = state.value ?? time;
              final label =
                  shown == null ? 'Escolher horário' : _formatTime(shown);
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  InkWell(
                    onTap: canEdit
                        ? () async {
                            final picked = await onTime();
                            if (picked != null) state.didChange(picked);
                          }
                        : null,
                    child: InputDecorator(
                      decoration: const InputDecoration(labelText: 'Horário'),
                      child: Text(label),
                    ),
                  ),
                  if (state.hasError)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpacing.xs),
                      child: Text(
                        state.errorText!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.error,
                            ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

TimeOfDay? _parseTime(String? value) {
  if (value == null) return null;
  final match = RegExp(r'^([01]\d|2[0-3]):([0-5]\d)$').firstMatch(value);
  if (match == null) return null;
  return TimeOfDay(
    hour: int.parse(match.group(1)!),
    minute: int.parse(match.group(2)!),
  );
}

String _formatTime(TimeOfDay time) {
  final hour = time.hour.toString().padLeft(2, '0');
  final minute = time.minute.toString().padLeft(2, '0');
  return '$hour:$minute';
}
