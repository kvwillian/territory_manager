import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/constants/app_spacing.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/announcement_model.dart';
import '../providers/announcement_repository_provider.dart';
import '../../../shared/widgets/app_card.dart';

class AnnouncementsListScreen extends ConsumerWidget {
  const AnnouncementsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final isAdmin = auth is AuthAuthenticated && auth.user.isAdmin;
    final announcements = ref.watch(announcementsProvider);

    return announcements.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Erro: $error')),
      data: (items) => Stack(
        children: [
          items.isEmpty
              ? const Center(child: Text('Nenhum aviso por enquanto'))
              : ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.screenPadding),
                  itemCount: items.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: AppSpacing.md),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return AppCard(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: _AnnouncementBody(item: item)),
                          if (isAdmin)
                            IconButton(
                              tooltip: 'Excluir',
                              onPressed: () async {
                                await ref
                                    .read(announcementRepositoryProvider)
                                    .deleteAnnouncement(item.id);
                                ref.invalidate(announcementsProvider);
                              },
                              icon: const Icon(Icons.delete_outline),
                            ),
                        ],
                      ),
                    );
                  },
                ),
          if (isAdmin)
            Positioned(
              right: AppSpacing.screenPadding,
              bottom: AppSpacing.screenPadding,
              child: FloatingActionButton.extended(
                onPressed: () => context.push('/announcements/create'),
                icon: const Icon(Icons.add),
                label: const Text('Novo aviso'),
              ),
            ),
        ],
      ),
    );
  }
}

class _AnnouncementBody extends StatelessWidget {
  const _AnnouncementBody({required this.item});

  final AnnouncementModel item;

  @override
  Widget build(BuildContext context) {
    final date = item.eventDate ?? item.createdAt;
    final dateLabel = date == null
        ? null
        : DateFormat("EEE, d MMM", 'pt_BR').format(date);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(item.title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: AppSpacing.xs),
        Text(item.body, style: Theme.of(context).textTheme.bodyMedium),
        if (dateLabel != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            item.isEvent ? 'Evento · $dateLabel' : dateLabel,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ],
    );
  }
}
