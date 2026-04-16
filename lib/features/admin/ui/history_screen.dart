import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_spacing.dart';
import '../providers/work_sessions_provider.dart';
import '../providers/territories_provider.dart';
import '../providers/users_provider.dart';
import '../../assignments/models/work_session_model.dart';
import '../../auth/models/user_model.dart';
import '../../territories/models/territory_model.dart';
import 'admin_shell.dart';
import '../../history/widgets/work_session_history_card.dart';

/// Admin history — log de saídas de campo por dirigente e território.
class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncSessions = ref.watch(workSessionsProvider);
    final asyncTerritories = ref.watch(territoriesProvider);
    final asyncUsers = ref.watch(usersProvider);

    return asyncSessions.when(
      loading: () => AdminShell(
        title: 'Histórico',
        child: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => AdminShell(
        title: 'Histórico',
        child: Center(child: Text('Erro: $e')),
      ),
      data: (sessions) {
        final List<TerritoryModel> territories = asyncTerritories.hasValue
            ? asyncTerritories.value!
            : <TerritoryModel>[];
        final users = asyncUsers.whenOrNull(data: (d) => d) ?? <UserModel>[];
        final nameById = {for (final u in users) u.id: u.name};

        String dirigenteName(WorkSessionModel s) {
          return nameById[s.conductorId] ?? 'Dirigente desconhecido';
        }

        return AdminShell(
          title: 'Histórico',
          child: sessions.isEmpty
              ? _EmptyHistory(
                  message:
                      'Ainda não há registros de saída de campo na congregação.',
                )
              : ListView(
                  padding: const EdgeInsets.all(AppSpacing.screenPadding),
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: Text(
                        'Log de dirigentes — saídas de campo registradas (mais recentes primeiro).',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                      ),
                    ),
                    ...sessions.map((session) {
                      final territory = territories
                          .where((t) => t.id == session.territoryId)
                          .firstOrNull;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: WorkSessionHistoryCard(
                          session: session,
                          territoryName:
                              territory?.name ?? 'Território desconhecido',
                          dirigenteLabel: dirigenteName(session),
                        ),
                      );
                    }),
                  ],
                ),
        );
      },
    );
  }
}

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history_edu_outlined,
              size: 56,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      ),
    );
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final it = iterator;
    return it.moveNext() ? it.current : null;
  }
}
