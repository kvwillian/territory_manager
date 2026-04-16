import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../admin/providers/work_sessions_provider.dart';
import '../../admin/providers/territories_provider.dart';
import '../../territories/models/territory_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../history/widgets/work_session_history_card.dart';

/// Histórico do condutor — apenas os próprios registros de saída.
class ConductorHistoryScreen extends ConsumerWidget {
  const ConductorHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final asyncSessions = ref.watch(workSessionsProvider);
    final asyncTerritories = ref.watch(territoriesProvider);

    if (authState is! AuthAuthenticated) {
      return const Center(child: CircularProgressIndicator());
    }
    final userId = authState.user.id;

    return asyncSessions.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Erro: $e')),
      data: (allSessions) {
        final sessions = allSessions
            .where((s) => s.conductorId == userId)
            .toList(growable: false);
        final List<TerritoryModel> territories = asyncTerritories.hasValue
            ? asyncTerritories.value!
            : <TerritoryModel>[];
        final dirigenteLabel = authState.user.name;

        return sessions.isEmpty
            ? Center(
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
                        'Nenhum registro de saída ainda.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Quando salvar progresso em um território, o registro aparecerá aqui.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                      ),
                    ],
                  ),
                ),
              )
            : ListView(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: Text(
                      'Seu log de saídas de campo (mais recentes primeiro).',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant,
                          ),
                    ),
                  ),
                  ...sessions.map((session) {
                    final territory = _territoryForId(
                      territories,
                      session.territoryId,
                    );
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: WorkSessionHistoryCard(
                        session: session,
                        territoryName:
                            territory?.name ?? 'Território desconhecido',
                        dirigenteLabel: dirigenteLabel,
                      ),
                    );
                  }),
                ],
              );
      },
    );
  }
}

TerritoryModel? _territoryForId(
  List<TerritoryModel> territories,
  String territoryId,
) {
  for (final t in territories) {
    if (t.id == territoryId) return t;
  }
  return null;
}
