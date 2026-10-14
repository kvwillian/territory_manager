import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../admin/providers/territories_provider.dart';
import '../../auth/models/access_flags.dart';
import '../../auth/providers/auth_provider.dart';
import '../../territories/models/territory_model.dart';
import '../../territories/models/territory_status.dart';

/// Mapas tab. Territory cards with status, using the records already stored.
class MapsScreen extends ConsumerWidget {
  const MapsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final user = auth is AuthAuthenticated ? auth.user : null;
    if (user == null || !user.canAccess(AccessFlags.territories)) {
      return const Center(
        child: Text('Territórios não estão liberados para esta conta.'),
      );
    }

    final territories = ref.watch(territoriesProvider);
    return territories.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Erro: $error')),
      data: (items) {
        if (items.isEmpty) {
          return const Center(child: Text('Nenhum território cadastrado.'));
        }
        return ListView.separated(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          itemCount: items.length,
          separatorBuilder: (context, index) =>
              const SizedBox(height: AppSpacing.md),
          itemBuilder: (context, index) {
            final territory = items[index];
            return _TerritoryCard(
              territory: territory,
              onTap: () {
                if (user.isAdmin) {
                  context.push('/admin/territories/edit/${territory.id}');
                } else {
                  context.push('/territory/${territory.id}');
                }
              },
            );
          },
        );
      },
    );
  }
}

class _TerritoryCard extends StatelessWidget {
  const _TerritoryCard({required this.territory, required this.onTap});

  final TerritoryModel territory;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = switch (territory.territoryStatus) {
      TerritoryStatus.completed => ('Concluído', StatusTone.done),
      TerritoryStatus.inProgress => ('Em progresso', StatusTone.progress),
      TerritoryStatus.notStarted => ('Disponível', StatusTone.available),
    };
    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.secondaryPurple,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.place_outlined, color: AppColors.richViolet),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  territory.number == null || territory.number!.isEmpty
                      ? territory.name
                      : 'Território #${territory.number}',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.deepNavy,
                      ),
                ),
                Text(
                  territory.neighborhood,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          StatusBadge(label: label, tone: tone),
        ],
      ),
    );
  }
}
