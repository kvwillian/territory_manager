import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../auth/providers/auth_provider.dart';
import '../../meeting_programs/models/meeting_program.dart';
import '../../meeting_programs/providers/meeting_programs_provider.dart';

/// Agenda tab: week strip and the selected day's program.
class AgendaScreen extends ConsumerStatefulWidget {
  const AgendaScreen({super.key});

  @override
  ConsumerState<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends ConsumerState<AgendaScreen> {
  late DateTime _selected;

  static const _weekdayInitials = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  static const _weekdayNames = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo',
  ];
  static const _months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selected = DateTime(now.year, now.month, now.day);
  }

  DateTime get _weekStart =>
      _selected.subtract(Duration(days: _selected.weekday - DateTime.monday));

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  bool get _selectedIsToday => _isSameDay(_selected, DateTime.now());

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final canSeeDrafts = auth is AuthAuthenticated && auth.user.canManageMeetings;
    final meetings = ref.watch(meetingProgramsProvider);
    final visible = meetings.maybeWhen(
      data: (items) => items.where((item) => canSeeDrafts || item.status != 'draft').toList(),
      orElse: () => const <MeetingProgram>[],
    );
    final program = visible.where((item) => item.isOn(_selected)).toList();
    final upcoming = visible.where((item) => item.date.isAfter(_selected)).toList()
      ..sort((a, b) => a.date.compareTo(b.date));
    final next = upcoming.take(4).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenPadding,
        AppSpacing.md,
        AppSpacing.screenPadding,
        AppSpacing.xl,
      ),
      children: [
        Text(
          '${_months[_selected.month - 1].toUpperCase()} ${_selected.year}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.secondaryText,
                letterSpacing: 1.1,
                fontWeight: FontWeight.w600,
              ),
        ),
        Text(
          'Agenda',
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        const SizedBox(height: AppSpacing.md),
        _WeekStrip(
          weekStart: _weekStart,
          selected: _selected,
          initials: _weekdayInitials,
          isSameDay: _isSameDay,
          hasMeeting: (day) => visible.any((item) => item.isOn(day)),
          onPrevious: () => setState(() {
            _selected = _selected.subtract(const Duration(days: 7));
          }),
          onNext: () => setState(() {
            _selected = _selected.add(const Duration(days: 7));
          }),
          onSelect: (day) => setState(() => _selected = day),
        ),
        const SizedBox(height: AppSpacing.lg),
        Row(
          children: [
            Expanded(
              child: Text(
                '${_weekdayNames[_selected.weekday - 1]}, ${_selected.day} de ${_months[_selected.month - 1]}',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.deepNavy,
                    ),
              ),
            ),
            if (_selectedIsToday)
              const StatusBadge(label: 'Hoje', tone: StatusTone.available),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        _SectionTitle(title: 'Programação do dia'),
        const SizedBox(height: AppSpacing.sm),
        if (meetings.isLoading)
          const Padding(
            padding: EdgeInsets.only(bottom: AppSpacing.md),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (meetings.hasError)
          const _EmptyDay(message: 'Não foi possível carregar as reuniões.')
        else if (program.isEmpty)
          const _EmptyDay()
        else
          ...program.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: _MeetingCard(meeting: item),
              )),
        const SizedBox(height: AppSpacing.sm),
        const _SectionTitle(title: 'Próximas reuniões'),
        const SizedBox(height: AppSpacing.sm),
        if (next.isEmpty)
          const _EmptyDay(message: 'Nenhuma reunião seguinte.')
        else
          ...next.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: _MeetingCard(meeting: item),
              )),
      ],
    );
  }
}

class _WeekStrip extends StatelessWidget {
  const _WeekStrip({
    required this.weekStart,
    required this.selected,
    required this.initials,
    required this.isSameDay,
    required this.hasMeeting,
    required this.onPrevious,
    required this.onNext,
    required this.onSelect,
  });

  final DateTime weekStart;
  final DateTime selected;
  final List<String> initials;
  final bool Function(DateTime, DateTime) isSameDay;
  final bool Function(DateTime) hasMeeting;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final ValueChanged<DateTime> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: onPrevious,
            icon: const Icon(Icons.chevron_left),
            color: AppColors.secondaryText,
          ),
          for (var index = 0; index < 7; index++)
            Expanded(
              child: _DayCell(
                day: weekStart.add(Duration(days: index)),
                label: initials[index],
                selected: isSameDay(
                  weekStart.add(Duration(days: index)),
                  selected,
                ),
                marker: hasMeeting(weekStart.add(Duration(days: index))) ? AppColors.richViolet : null,
                onTap: () => onSelect(weekStart.add(Duration(days: index))),
              ),
            ),
          IconButton(
            onPressed: onNext,
            icon: const Icon(Icons.chevron_right),
            color: AppColors.secondaryText,
          ),
        ],
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.label,
    required this.selected,
    required this.marker,
    required this.onTap,
  });

  final DateTime day;
  final String label;
  final bool selected;
  final Color? marker;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
        child: Column(
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: selected ? AppColors.richViolet : AppColors.secondaryText,
                    fontWeight: FontWeight.w600,
                    fontSize: 10,
                  ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected ? AppColors.richViolet : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${day.day}',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: selected ? Colors.white : AppColors.deepNavy,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: marker ?? Colors.transparent,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: AppColors.deepNavy,
          ),
    );
  }
}

class _EmptyDay extends StatelessWidget {
  const _EmptyDay({this.message = 'Nenhum compromisso neste dia.'});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(message, style: Theme.of(context).textTheme.bodyMedium),
    );
  }
}

class _MeetingCard extends StatelessWidget {
  const _MeetingCard({required this.meeting});

  final MeetingProgram meeting;

  @override
  Widget build(BuildContext context) {
    final lines = <String>[
      for (final section in meeting.sections)
        for (final part in section.parts)
          if (part.title.isNotEmpty)
            part.roles.where((role) => role.personName.trim().isNotEmpty).isEmpty
                ? part.title
                : '${part.title}: ${part.roles.map((role) => role.personName.trim()).where((name) => name.isNotEmpty).join(', ')}',
      for (final duty in meeting.duties)
        if (duty.people.isNotEmpty) '${duty.label}: ${duty.people.join(', ')}',
    ];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(meeting.time, style: Theme.of(context).textTheme.bodySmall),
          Text(meeting.title, style: Theme.of(context).textTheme.titleMedium),
          for (final line in lines)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(line, style: Theme.of(context).textTheme.bodyMedium),
            ),
        ],
      ),
    );
  }
}
