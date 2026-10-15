import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../admin/providers/territories_provider.dart';
import '../../announcements/models/announcement_model.dart';
import '../../announcements/providers/announcement_repository_provider.dart';
import '../../auth/models/access_flags.dart';
import '../../auth/models/user_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../congregations/models/congregation_model.dart';
import '../../congregations/providers/congregation_repository_provider.dart';
import '../../../shared/widgets/app_card.dart';

class CongregationDashboardScreen extends ConsumerWidget {
  const CongregationDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth is AuthAuthenticated ? auth.user : null;
    if (user == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final congregation = ref.watch(congregationProvider);
    final territories = ref.watch(territoriesProvider);
    final announcements = ref.watch(announcementsProvider);
    final territoryCount = territories.maybeWhen(
      data: (items) => items.length,
      orElse: () => null,
    );
    final meetingLine = congregation.maybeWhen(
      data: (item) => _nextMeetingLabel(item),
      orElse: () => null,
    );

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenPadding,
        AppSpacing.md,
        AppSpacing.screenPadding,
        AppSpacing.xl,
      ),
      children: [
        Text(_greeting(user.name), style: Theme.of(context).textTheme.headlineLarge),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Veja o que está acontecendo na congregação.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: AppSpacing.lg),
        _CongregationCard(
          congregation: congregation.asData?.value,
        ),
        const SizedBox(height: AppSpacing.lg),
        Text('Acesso rápido', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: AppSpacing.md),
        _QuickAccess(
          user: user,
          territoryCount: territoryCount,
          meetingLine: meetingLine,
        ),
        const SizedBox(height: AppSpacing.lg),
        _NextAssignmentCard(congregation: congregation.asData?.value),
        const SizedBox(height: AppSpacing.lg),
        _Commitments(congregation: congregation.asData?.value),
        const SizedBox(height: AppSpacing.lg),
        _Notices(
          announcements: announcements,
          onSeeAll: () => context.push('/announcements'),
        ),
      ],
    );
  }
}

class _CongregationCard extends StatelessWidget {
  const _CongregationCard({required this.congregation});

  final CongregationModel? congregation;

  @override
  Widget build(BuildContext context) {
    final name = congregation?.name.isNotEmpty == true
        ? congregation!.name
        : 'Congregação';
    final place = [
      congregation?.city,
      congregation?.country,
    ].whereType<String>().where((part) => part.isNotEmpty).join(', ');
    return AppCard(
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFEDE9FE),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.apartment_outlined, color: Color(0xFF6D5BD0)),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: Theme.of(context).textTheme.titleMedium),
                if (place.isNotEmpty)
                  Text(place, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickAccess extends StatelessWidget {
  const _QuickAccess({
    required this.user,
    required this.territoryCount,
    required this.meetingLine,
  });

  final UserModel user;
  final int? territoryCount;
  final String? meetingLine;

  @override
  Widget build(BuildContext context) {
    final tiles = <Widget>[
      if (user.canAccess(AccessFlags.territories))
        _QuickTile(
          title: 'Territórios',
          subtitle: territoryCount == null
              ? 'Carregando'
              : '$territoryCount territórios',
          icon: Icons.map_outlined,
          background: const Color(0xFFE7F6EE),
          foreground: const Color(0xFF1F8A4C),
          onTap: () => context.go('/mapas'),
        ),
      if (user.canAccess(AccessFlags.publishers))
        _QuickTile(
          title: 'Publicadores',
          subtitle: 'Cadastro',
          icon: Icons.people_outline,
          background: const Color(0xFFEDE9FE),
          foreground: const Color(0xFF6D5BD0),
          onTap: () => context.push('/publishers'),
        ),
      if (user.canAccess(AccessFlags.meetings))
        _QuickTile(
          title: 'Reuniões',
          subtitle: meetingLine ?? 'Horários',
          icon: Icons.calendar_month_outlined,
          background: const Color(0xFFE7F0FF),
          foreground: const Color(0xFF3B6FD8),
          onTap: () => context.go('/agenda'),
        ),
      if (user.canAccess(AccessFlags.reports))
        _QuickTile(
          title: 'Relatórios',
          subtitle: 'Relatório mensal',
          icon: Icons.description_outlined,
          background: const Color(0xFFFFF1E6),
          foreground: const Color(0xFFE07A2F),
          onTap: () => context.push('/module/relatorios'),
        ),
    ];
    if (tiles.isEmpty) {
      return Text(
        'Nenhum módulo liberado para esta conta.',
        style: Theme.of(context).textTheme.bodyMedium,
      );
    }
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: AppSpacing.md,
      crossAxisSpacing: AppSpacing.md,
      childAspectRatio: 1.7,
      children: tiles,
    );
  }
}

class _QuickTile extends StatelessWidget {
  const _QuickTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.background,
    required this.foreground,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color background;
  final Color foreground;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.cardBackground,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: background,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: foreground, size: 20),
              ),
              const Spacer(),
              Text(
                title,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: AppColors.deepNavy,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.secondaryText,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NextAssignmentCard extends StatelessWidget {
  const _NextAssignmentCard({required this.congregation});

  final CongregationModel? congregation;

  @override
  Widget build(BuildContext context) {
    final items = _meetingItems(congregation);
    final next = items.isEmpty ? null : items.first;
    return Material(
      color: AppColors.vibrantIndigo,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => context.go('/agenda'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              const Icon(Icons.menu_book_outlined, color: Colors.white),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Próxima designação',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                    ),
                    Text(
                      next?.title ?? 'Nenhum horário definido',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    if (next != null)
                      Text(
                        next.subtitle,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.white.withValues(alpha: 0.9),
                            ),
                      ),
                  ],
                ),
              ),
              Text(
                'Ver todas',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Commitments extends StatelessWidget {
  const _Commitments({required this.congregation});

  final CongregationModel? congregation;

  @override
  Widget build(BuildContext context) {
    final items = _meetingItems(congregation);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Próximos compromissos',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: AppSpacing.md),
        if (items.isEmpty)
          Text(
            'Os horários das reuniões ainda não foram definidos.',
            style: Theme.of(context).textTheme.bodyMedium,
          )
        else
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: AppCard(
                onTap: () => context.push('/congregation'),
                child: Row(
                  children: [
                    Icon(item.icon, color: const Color(0xFF6D5BD0)),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.title, style: Theme.of(context).textTheme.titleSmall),
                          Text(item.subtitle, style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ),
                    if (item.today)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: AppSpacing.xs,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE7F6EE),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text('Hoje'),
                      ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Notices extends StatelessWidget {
  const _Notices({
    required this.announcements,
    required this.onSeeAll,
  });

  final AsyncValue<List<AnnouncementModel>> announcements;
  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context) {
    final items = announcements.maybeWhen(
      data: (list) => list.take(2).toList(),
      orElse: () => const <AnnouncementModel>[],
    );
    return Column(
      children: [
        Row(
          children: [
            Text('Avisos', style: Theme.of(context).textTheme.titleLarge),
            const Spacer(),
            TextButton(onPressed: onSeeAll, child: const Text('Ver todos')),
          ],
        ),
        if (announcements.isLoading)
          const Padding(
            padding: EdgeInsets.all(AppSpacing.md),
            child: CircularProgressIndicator(),
          )
        else if (items.isEmpty)
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Nenhum aviso publicado.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          )
        else
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: AppCard(
                onTap: onSeeAll,
                child: Row(
                  children: [
                    const Icon(Icons.campaign_outlined, color: Color(0xFF6D5BD0)),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.title, style: Theme.of(context).textTheme.titleSmall),
                          Text(
                            item.body,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    if (item.isEvent)
                      const Text('Evento'),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _MeetingItem {
  const _MeetingItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.today,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool today;
}

List<_MeetingItem> _meetingItems(CongregationModel? congregation) {
  if (congregation == null) return const [];
  final today = DateTime.now().weekday;
  final items = <_MeetingItem>[];
  final midweek = _formatMeeting(
    congregation.midweekWeekday,
    congregation.midweekTime,
  );
  if (midweek != null) {
    items.add(_MeetingItem(
      title: 'Reunião do meio de semana',
      subtitle: midweek,
      icon: Icons.event_outlined,
      today: congregation.midweekWeekday == today,
    ));
  }
  final weekend = _formatMeeting(
    congregation.weekendWeekday,
    congregation.weekendTime,
  );
  if (weekend != null) {
    items.add(_MeetingItem(
      title: 'Reunião do fim de semana',
      subtitle: weekend,
      icon: Icons.place_outlined,
      today: congregation.weekendWeekday == today,
    ));
  }
  return items;
}

String? _formatMeeting(int? weekday, String? time) {
  if (weekday == null || time == null || time.isEmpty) return null;
  const names = {
    DateTime.monday: 'Segunda-feira',
    DateTime.tuesday: 'Terça-feira',
    DateTime.wednesday: 'Quarta-feira',
    DateTime.thursday: 'Quinta-feira',
    DateTime.friday: 'Sexta-feira',
    DateTime.saturday: 'Sábado',
    DateTime.sunday: 'Domingo',
  };
  return '${names[weekday] ?? ''}, $time';
}

String? _nextMeetingLabel(CongregationModel? congregation) {
  if (congregation == null) return null;
  final today = DateTime.now().weekday;
  if (congregation.midweekWeekday != null &&
      congregation.midweekTime != null) {
    final short = DateFormat.E('pt_BR')
        .format(DateTime(2024, 1, congregation.midweekWeekday!));
    return 'Próxima: $short. ${congregation.midweekTime}';
  }
  if (congregation.weekendTime != null) return congregation.weekendTime;
  if (congregation.midweekWeekday == today) return 'Hoje';
  return null;
}

String _greeting(String name) {
  final hour = DateTime.now().hour;
  final hello = hour < 12
      ? 'Bom dia'
      : hour < 18
          ? 'Boa tarde'
          : 'Boa noite';
  final first = name.trim().split(' ').first;
  if (first.isEmpty) return '$hello!';
  return '$hello, $first';
}
