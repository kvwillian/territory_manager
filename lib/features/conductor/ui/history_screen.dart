import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../admin/providers/work_sessions_provider.dart';
import '../../admin/providers/territories_provider.dart';
import '../../assignments/models/work_session_model.dart';
import '../../../../shared/widgets/app_card.dart';

/// Conductor history screen - work sessions timeline.
class ConductorHistoryScreen extends ConsumerWidget {
  const ConductorHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSessions = ref.watch(workSessionsProvider);
    final asyncTerritories = ref.watch(territoriesProvider);

    return asyncSessions.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Erro: $e')),
      data: (sessions) {
        final territories =
            asyncTerritories.hasValue ? asyncTerritories.value! : [];
        return ListView.builder(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          itemCount: sessions.length,
          itemBuilder: (context, index) {
            final session = sessions[index];
            final territory = territories
                .where((t) => t.id == session.territoryId)
                .firstOrNull;
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: _HistoryCard(
                session: session,
                territoryName: territory?.name ?? 'Território desconhecido',
              ),
            );
          },
        );
      },
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({
    required this.session,
    required this.territoryName,
  });

  final WorkSessionModel session;
  final String territoryName;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.calendar_today,
                size: 20,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                DateFormat('d/MM/yyyy', 'pt_BR').format(session.date),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            territoryName,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          Text(
            '${session.segmentsWorked.length} segmentos concluídos',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          if (session.notes != null && session.notes!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              session.notes!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontStyle: FontStyle.italic,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}
