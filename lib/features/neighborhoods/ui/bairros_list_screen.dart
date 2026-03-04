import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../models/neighborhood_model.dart';
import '../providers/neighborhoods_provider.dart';
import '../../admin/ui/admin_shell.dart';

/// Admin screen: list of neighborhoods (bairros).
class BairrosListScreen extends ConsumerWidget {
  const BairrosListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncNeighborhoods = ref.watch(neighborhoodsProvider);

    final createFab = FloatingActionButton.extended(
      onPressed: () => context.push('/admin/bairros/create'),
      icon: const Icon(Icons.add),
      label: const Text('Novo bairro'),
    );

    return asyncNeighborhoods.when(
      loading: () => Scaffold(
        appBar: AppBar(
          title: const Text('Bairros'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/admin'),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
        floatingActionButton: createFab,
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(
          title: const Text('Bairros'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/admin'),
          ),
        ),
        body: Center(child: Text('Erro: $e')),
        floatingActionButton: createFab,
      ),
      data: (neighborhoods) => AdminShell(
        title: 'Bairros',
        floatingActionButton: createFab,
        child: neighborhoods.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.screenPadding),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.location_city_outlined,
                        size: 64,
                        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        'Nenhum bairro cadastrado',
                        style: Theme.of(context).textTheme.titleLarge,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Toque no botão abaixo para criar o primeiro bairro.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      FilledButton.icon(
                        onPressed: () => context.push('/admin/bairros/create'),
                        icon: const Icon(Icons.add),
                        label: const Text('Criar bairro'),
                      ),
                    ],
                  ),
                ),
              )
            : ListView.builder(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          itemCount: neighborhoods.length,
          itemBuilder: (context, index) {
            final n = neighborhoods[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: _BairroListTile(neighborhood: n),
            );
          },
        ),
      ),
    );
  }
}

class _BairroListTile extends StatelessWidget {
  const _BairroListTile({required this.neighborhood});

  final NeighborhoodModel neighborhood;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => context.push('/admin/bairros/edit/${neighborhood.id}'),
      child: Row(
        children: [
          Icon(
            Icons.location_city_outlined,
            size: 40,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              neighborhood.name,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}
