import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../models/field_group_model.dart';
import '../providers/field_group_repository_provider.dart';
import '../../admin/ui/admin_shell.dart';

/// Admin: list field groups for Sunday WhatsApp messages.
class FieldGroupsListScreen extends ConsumerWidget {
  const FieldGroupsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncGroups = ref.watch(fieldGroupsProvider);

    final createFab = FloatingActionButton.extended(
      onPressed: () => context.push('/admin/field-groups/create'),
      icon: const Icon(Icons.add),
      label: const Text('Novo grupo'),
    );

    return asyncGroups.when(
      loading: () => Scaffold(
        appBar: AppBar(
          title: const Text('Grupos de campo'),
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
          title: const Text('Grupos de campo'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/admin'),
          ),
        ),
        body: Center(child: Text('Erro: $e')),
        floatingActionButton: createFab,
      ),
      data: (groups) => AdminShell(
        title: 'Grupos de campo',
        floatingActionButton: createFab,
        child: groups.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.screenPadding),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.groups_outlined,
                        size: 64,
                        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Text(
                        'Nenhum grupo cadastrado',
                        style: Theme.of(context).textTheme.titleLarge,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Cadastre grupos para usar no texto de domingo (WhatsApp).',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      FilledButton.icon(
                        onPressed: () => context.push('/admin/field-groups/create'),
                        icon: const Icon(Icons.add),
                        label: const Text('Criar grupo'),
                      ),
                    ],
                  ),
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                itemCount: groups.length,
                itemBuilder: (context, index) {
                  final g = groups[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.md),
                    child: _GroupTile(group: g),
                  );
                },
              ),
      ),
    );
  }
}

class _GroupTile extends StatelessWidget {
  const _GroupTile({required this.group});

  final FieldGroupModel group;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => context.push('/admin/field-groups/edit/${group.id}'),
      child: Row(
        children: [
          Icon(
            Icons.groups_outlined,
            size: 40,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              group.name,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}
