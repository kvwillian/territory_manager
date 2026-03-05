import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/models/user_model.dart';
import '../../meetings/models/meeting_location_model.dart';
import '../../territories/models/segment_model.dart';
import '../../territories/models/segment_status.dart';
import '../../territories/models/territory_model.dart';
import '../../assignments/models/assignment_model.dart';
import '../../admin/providers/assignments_provider.dart';
import '../../admin/providers/territories_provider.dart';
import '../../meetings/providers/meeting_location_repository_provider.dart';
import '../../meetings/providers/preaching_session_repository_provider.dart';
import '../services/territory_progress_service.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/cached_territory_image.dart';
import '../../../../shared/widgets/progress_indicator_bar.dart';

/// Conductor home screen.
/// Displays: Greeting, calendar with session days highlighted, selected day's
/// session and territories. Image clickable for full-screen zoom.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  DateTime _focusedDay = DateTime.now();

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final nextAssignmentAsync = ref.watch(nextAssignmentForConductorProvider);
    final selectedDate = ref.watch(conductorSelectedDateProvider);
    final assignmentDatesAsync = ref.watch(conductorAssignmentDatesProvider);
    final territories = ref.watch(territoriesProvider);
    final meetingLocations = ref.watch(meetingLocationsProvider);

    if (authState is! AuthAuthenticated) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (territories.isLoading || nextAssignmentAsync.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final user = authState.user;
    final nextAssignment = nextAssignmentAsync.whenOrNull(data: (a) => a);
    final effectiveDate = selectedDate ??
        nextAssignment?.date ??
        DateTime.now();
    final normalizedDate = DateTime(
      effectiveDate.year,
      effectiveDate.month,
      effectiveDate.day,
    );

    final assignmentAsync = ref.watch(
      conductorAssignmentForDateProvider(normalizedDate),
    );
    final assignment = assignmentAsync.whenOrNull(data: (a) => a);

    final territoryList =
        territories.hasValue ? territories.value! : [];
    final ids = assignment?.allTerritoryIds ?? [];
    final territoryModels = ids
        .map((id) {
          try {
            return territoryList.firstWhere((t) => t.id == id);
          } catch (_) {
            return null;
          }
        })
        .whereType<TerritoryModel>()
        .toList();

    final locationList = meetingLocations.whenOrNull(data: (list) => list) ?? [];
    MeetingLocationModel? meetingLocation;
    if (assignment?.meetingLocationId != null) {
      try {
        meetingLocation = locationList
            .firstWhere((l) => l.id == assignment!.meetingLocationId);
      } catch (_) {
        meetingLocation = null;
      }
    }

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(nextAssignmentForConductorProvider);
          ref.invalidate(conductorAssignmentForDateProvider);
          ref.invalidate(conductorAssignmentDatesProvider);
          ref.invalidate(territoriesProvider);
          ref.invalidate(meetingLocationsProvider);
          await ref.read(nextAssignmentForConductorProvider.future);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
            _buildGreeting(context, user),
            const SizedBox(height: AppSpacing.sectionSpacing),
            _ConductorCalendar(
              focusedDay: _focusedDay,
              onDateSelected: (date) {
                ref.read(conductorSelectedDateProvider.notifier).state = date;
              },
              onPageChanged: (day) {
                setState(() => _focusedDay = day);
              },
              selectedDate: normalizedDate,
              sessionDates: assignmentDatesAsync.whenOrNull(data: (d) => d) ?? {},
            ),
            const SizedBox(height: AppSpacing.sectionSpacing),
            if (assignment != null) ...[
              _SessionCard(
                assignment: assignment,
                meetingLocation: meetingLocation,
                selectedDate: normalizedDate,
                nextAssignmentDate: nextAssignment?.date,
              ),
              const SizedBox(height: AppSpacing.sectionSpacing),
            ],
            if (territoryModels.isNotEmpty) ...[
              Text(
                'Territórios desta saída',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              ...territoryModels.map(
                (t) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.md),
                  child: _ExpandableTerritoryCard(
                    territory: t,
                    conductorId: user.id,
                  ),
                ),
              ),
            ] else ...[
              AppCard(
                child: Column(
                  children: [
                    Icon(
                      Icons.assignment_outlined,
                      size: 48,
                      color: Theme.of(context).colorScheme.primary.withValues(
                            alpha: 0.5,
                          ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      assignment != null
                          ? 'Nenhum território atribuído para esta saída'
                          : 'Nenhuma saída agendada',
                      style: Theme.of(context).textTheme.bodyLarge,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGreeting(BuildContext context, UserModel user) {
    final hour = DateTime.now().hour;
    String greeting;
    if (hour < 12) {
      greeting = 'Bom dia';
    } else if (hour < 18) {
      greeting = 'Boa tarde';
    } else {
      greeting = 'Boa noite';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$greeting, ${user.name}',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        Text(
          DateFormat('EEEE, d \'de\' MMMM', 'pt_BR').format(DateTime.now()),
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _ConductorCalendar extends StatelessWidget {
  const _ConductorCalendar({
    required this.focusedDay,
    required this.onDateSelected,
    required this.onPageChanged,
    required this.selectedDate,
    required this.sessionDates,
  });

  final DateTime focusedDay;
  final void Function(DateTime) onDateSelected;
  final void Function(DateTime) onPageChanged;
  final DateTime selectedDate;
  final Set<DateTime> sessionDates;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: TableCalendar(
        firstDay: DateTime.utc(2020, 1, 1),
        lastDay: DateTime.utc(2030, 12, 31),
        focusedDay: focusedDay,
        selectedDayPredicate: (day) {
          return day.year == selectedDate.year &&
              day.month == selectedDate.month &&
              day.day == selectedDate.day;
        },
        onDaySelected: (selected, focused) {
          onDateSelected(selected);
          onPageChanged(focused);
        },
        onPageChanged: onPageChanged,
        eventLoader: (day) {
          final hasSession = sessionDates.any((d) =>
              d.year == day.year &&
              d.month == day.month &&
              d.day == day.day);
          return hasSession ? ['session'] : [];
        },
        locale: 'pt_BR',
        calendarFormat: CalendarFormat.month,
        headerStyle: const HeaderStyle(
          formatButtonVisible: false,
          titleCentered: true,
        ),
        calendarStyle: CalendarStyle(
          markerDecoration: BoxDecoration(
            color: AppColors.primaryPurple,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }
}

class _SessionCard extends ConsumerWidget {
  const _SessionCard({
    required this.assignment,
    this.meetingLocation,
    required this.selectedDate,
    this.nextAssignmentDate,
  });

  final AssignmentModel assignment;
  final MeetingLocationModel? meetingLocation;
  final DateTime selectedDate;
  final DateTime? nextAssignmentDate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preachingSessionAsync = ref.watch(
      preachingSessionByIdProvider(assignment.preachingSessionId),
    );
    final session = preachingSessionAsync.whenOrNull(data: (s) => s);
    final date = assignment.date;
    final dayLabel = DateFormat('EEEE', 'pt_BR').format(date);
    final dateLabel = DateFormat('d \'de\' MMMM', 'pt_BR').format(date);
    final timeLabel = session?.startTime ?? '';

    final nextDate = nextAssignmentDate != null
        ? DateTime(
            nextAssignmentDate!.year,
            nextAssignmentDate!.month,
            nextAssignmentDate!.day,
          )
        : null;
    final isNextSession = nextDate != null &&
        selectedDate.year == nextDate.year &&
        selectedDate.month == nextDate.month &&
        selectedDate.day == nextDate.day;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.calendar_today_outlined,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                isNextSession ? 'Próxima saída' : 'Saída do dia',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '$dayLabel, $dateLabel',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          if (timeLabel.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              timeLabel,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.secondaryText,
                  ),
            ),
          ],
          if (meetingLocation != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Icon(
                  Icons.place_outlined,
                  size: 18,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    meetingLocation!.name,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ExpandableTerritoryCard extends ConsumerStatefulWidget {
  const _ExpandableTerritoryCard({
    required this.territory,
    required this.conductorId,
  });

  final TerritoryModel territory;
  final String conductorId;

  @override
  ConsumerState<_ExpandableTerritoryCard> createState() =>
      _ExpandableTerritoryCardState();
}

class _ExpandableTerritoryCardState extends ConsumerState<_ExpandableTerritoryCard> {
  bool _expanded = false;
  Set<String> _completedIds = {};
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _completedIds = widget.territory.segments
        .where((s) => s.isCompleted)
        .map((s) => s.id)
        .toSet();
  }

  @override
  void didUpdateWidget(_ExpandableTerritoryCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.territory.id != widget.territory.id) {
      _completedIds = widget.territory.segments
          .where((s) => s.isCompleted)
          .map((s) => s.id)
          .toSet();
    }
  }

  Future<void> _toggleSegment(SegmentModel segment, bool value) async {
    setState(() {
      if (value) {
        _completedIds.add(segment.id);
      } else {
        _completedIds.remove(segment.id);
      }
    });

    final statusBySegmentId = <String, SegmentStatus>{};
    for (final seg in widget.territory.segments) {
      statusBySegmentId[seg.id] =
          _completedIds.contains(seg.id) ? SegmentStatus.completed : SegmentStatus.pending;
    }

    _saving = true;
    if (mounted) setState(() {});

    await ref.read(territoryProgressServiceProvider).saveProgress(
          territoryId: widget.territory.id,
          conductorId: widget.conductorId,
          statusBySegmentId: statusBySegmentId,
          skipInvalidate: true,
        );

    // Don't invalidate here - it causes full-screen loading, unmounts the card,
    // and resets scroll. Local state already shows the correct UI; pull-to-refresh
    // will sync when the user wants fresh data.
    _saving = false;
    if (mounted) setState(() {});
  }

  void _showExpandedImage(BuildContext context, String? url) {
    if (url == null || url.trim().isEmpty) return;
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 4,
                child: SizedBox(
                  width: MediaQuery.of(context).size.width - 48,
                  height: MediaQuery.of(context).size.height - 96,
                  child: CachedTerritoryImage(
                    imageUrl: url,
                    fit: BoxFit.contain,
                    height: MediaQuery.of(context).size.height - 96,
                    width: MediaQuery.of(context).size.width - 48,
                  ),
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final territory = widget.territory;
    final isDone = territory.segments.isNotEmpty &&
        _completedIds.length == territory.segments.length;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GestureDetector(
            onTap: () {
              if (territory.imageUrl != null && territory.imageUrl!.trim().isNotEmpty) {
                _showExpandedImage(context, territory.imageUrl);
              } else {
                context.push('/territory/${territory.id}');
              }
            },
            child: Stack(
              children: [
                CachedTerritoryImage(
                  imageUrl: territory.imageUrl,
                  width: double.infinity,
                  height: 140,
                ),
                Positioned(
                  top: AppSpacing.sm,
                  right: AppSpacing.sm,
                  child: isDone
                      ? Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: AppSpacing.xs,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.successGreen,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.check_circle,
                            color: Colors.white,
                            size: 18,
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Text(
                            'Concluído',
                            style: Theme.of(context)
                                .textTheme
                                .labelMedium
                                ?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ],
                      ),
                    )
                      : const SizedBox.shrink(),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          territory.name,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          territory.neighborhood,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(
                                color: AppColors.secondaryText,
                              ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        ProgressIndicatorBar(
                          completed: _completedIds.length,
                          total: territory.totalSegments,
                          label: 'Segmentos concluídos',
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    _expanded ? Icons.expand_less : Icons.expand_more,
                    color: AppColors.secondaryText,
                  ),
                ],
              ),
            ),
          ),
          if (_expanded) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.cardPadding,
                vertical: AppSpacing.sm,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ruas a cobrir',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ...territory.segments.map(
                    (segment) => _SegmentCheckbox(
                      segment: segment,
                      isChecked: _completedIds.contains(segment.id),
                      onChanged: (value) => _toggleSegment(segment, value ?? false),
                      disabled: _saving,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  OutlinedButton.icon(
                    onPressed: () => context.push('/territory/${territory.id}'),
                    icon: const Icon(Icons.open_in_new, size: 18),
                    label: const Text('Abrir território completo'),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SegmentCheckbox extends StatelessWidget {
  const _SegmentCheckbox({
    required this.segment,
    required this.isChecked,
    required this.onChanged,
    this.disabled = false,
  });

  final SegmentModel segment;
  final bool isChecked;
  final ValueChanged<bool?> onChanged;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: disabled ? null : () => onChanged(!isChecked),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            SizedBox(
              width: 44,
              height: 44,
              child: Checkbox(
                value: isChecked,
                onChanged: disabled ? null : onChanged,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                segment.description,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      decoration: isChecked ? TextDecoration.lineThrough : null,
                      color: isChecked
                          ? AppColors.secondaryText
                          : AppColors.primaryText,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
