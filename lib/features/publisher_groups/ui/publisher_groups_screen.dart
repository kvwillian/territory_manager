import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../../auth/providers/auth_provider.dart';
import '../../publishers/models/publisher_model.dart';
import '../../publishers/providers/publisher_repository_provider.dart';
import '../models/publisher_group.dart';
import '../providers/publisher_groups_provider.dart';

class PublisherGroupsScreen extends ConsumerWidget {
  const PublisherGroupsScreen({super.key});

  Future<void> _showCreateGroupDialog(
    BuildContext context,
    WidgetRef ref,
    List<PublisherModel> activePublishers,
  ) async {
    final nameController = TextEditingController();
    String? superintendentId =
        activePublishers.isNotEmpty ? activePublishers.first.id : null;
    final created = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        var saving = false;
        String? errorText;
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Novo grupo'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Nome do grupo'),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  DropdownButtonFormField<String>(
                    initialValue: superintendentId,
                    decoration: const InputDecoration(
                      labelText: 'Superintendente',
                    ),
                    items: [
                      for (final publisher in activePublishers)
                        DropdownMenuItem(
                          value: publisher.id,
                          child: Text(publisher.name),
                        ),
                    ],
                    onChanged: (value) =>
                        setState(() => superintendentId = value),
                  ),
                  if (errorText != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      errorText!,
                      style: const TextStyle(color: Colors.red, fontSize: 12),
                    ),
                  ],
                ],
              ),
              actions: [
                TextButton(
                  onPressed: saving
                      ? null
                      : () => Navigator.pop(dialogContext, false),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: saving ||
                          activePublishers.isEmpty ||
                          superintendentId == null
                      ? null
                      : () async {
                          final name = nameController.text.trim();
                          if (name.isEmpty) return;
                          setState(() {
                            saving = true;
                            errorText = null;
                          });
                          try {
                            await FirebaseFunctions.instance
                                .httpsCallable('createCongregationGroup')
                                .call({
                              'name': name,
                              'superintendentPublisherId': superintendentId,
                            });
                            if (dialogContext.mounted) {
                              Navigator.pop(dialogContext, true);
                            }
                          } catch (_) {
                            setState(() {
                              saving = false;
                              errorText = 'Não foi possível criar o grupo.';
                            });
                          }
                        },
                  child: Text(saving ? 'Salvando…' : 'Criar grupo'),
                ),
              ],
            );
          },
        );
      },
    );
    if (created == true) {
      ref.invalidate(publisherGroupsProvider);
      ref.invalidate(publishersProvider);
    }
  }

  Future<void> _changeSuperintendent(
    BuildContext context,
    WidgetRef ref,
    PublisherGroup group,
    List<PublisherModel> activePublishers,
  ) async {
    String? selectedId = group.superintendentPublisherId;
    if (!activePublishers.any((p) => p.id == selectedId)) {
      selectedId = activePublishers.isNotEmpty ? activePublishers.first.id : null;
    }
    final changed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        var saving = false;
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Text('Superintendente — ${group.name}'),
              content: DropdownButtonFormField<String>(
                initialValue: selectedId,
                decoration: const InputDecoration(labelText: 'Superintendente'),
                items: [
                  for (final publisher in activePublishers)
                    DropdownMenuItem(
                      value: publisher.id,
                      child: Text(publisher.name),
                    ),
                ],
                onChanged: (value) => setState(() => selectedId = value),
              ),
              actions: [
                TextButton(
                  onPressed: saving
                      ? null
                      : () => Navigator.pop(dialogContext, false),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: saving || selectedId == null
                      ? null
                      : () async {
                          setState(() => saving = true);
                          try {
                            await FirebaseFunctions.instance
                                .httpsCallable(
                                  'setCongregationGroupSuperintendent',
                                )
                                .call({
                              'groupId': group.id,
                              'publisherId': selectedId,
                            });
                            if (dialogContext.mounted) {
                              Navigator.pop(dialogContext, true);
                            }
                          } finally {
                            if (dialogContext.mounted) {
                              setState(() => saving = false);
                            }
                          }
                        },
                  child: Text(saving ? 'Salvando…' : 'Salvar'),
                ),
              ],
            );
          },
        );
      },
    );
    if (changed == true) {
      ref.invalidate(publisherGroupsProvider);
      ref.invalidate(publishersProvider);
    }
  }

  Future<void> _deleteGroup(
    BuildContext context,
    WidgetRef ref,
    PublisherGroup group,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Excluir ${group.name}?'),
        content: const Text(
          'Os publicadores continuarão cadastrados e ficarão sem grupo.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    await FirebaseFunctions.instance
        .httpsCallable('deleteCongregationGroup')
        .call({'groupId': group.id});
    ref.invalidate(publisherGroupsProvider);
    ref.invalidate(publishersProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final canManage =
        auth is AuthAuthenticated && auth.user.canManagePublishers;
    final groups = ref.watch(publisherGroupsProvider);
    final publishers = ref.watch(publishersProvider);

    return groups.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => const Center(
        child: Text('Não foi possível carregar os grupos.'),
      ),
      data: (items) {
        final people = publishers.maybeWhen(
          data: (value) => value,
          orElse: () => const <PublisherModel>[],
        );
        final activePeople =
            people.where((p) => p.status != 'inactive').toList();

        return Stack(
          children: [
            items.isEmpty
                ? const Center(child: Text('Nenhum grupo cadastrado.'))
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.screenPadding,
                      AppSpacing.screenPadding,
                      AppSpacing.screenPadding,
                      88,
                    ),
                    itemCount: items.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.md),
                    itemBuilder: (context, index) {
                      final group = items[index];
                      final members = people
                          .where((p) => p.groupId == group.id)
                          .toList();
                      PublisherModel? superintendent;
                      PublisherModel? assistant;
                      for (final person in people) {
                        if (person.id == group.superintendentPublisherId) {
                          superintendent = person;
                        }
                        if (group.assistantPublisherId != null &&
                            person.id == group.assistantPublisherId) {
                          assistant = person;
                        }
                      }
                      return AppCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    group.name,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.deepNavy,
                                        ),
                                  ),
                                ),
                                Text(
                                  '${members.length} publicadores',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                if (canManage) ...[
                                  IconButton(
                                    tooltip: 'Alterar superintendente',
                                    icon: const Icon(
                                      Icons.manage_accounts_outlined,
                                      size: 20,
                                    ),
                                    onPressed: activePeople.isEmpty
                                        ? null
                                        : () => _changeSuperintendent(
                                              context,
                                              ref,
                                              group,
                                              activePeople,
                                            ),
                                  ),
                                  IconButton(
                                    tooltip: 'Excluir grupo',
                                    icon: const Icon(
                                      Icons.delete_outline,
                                      size: 20,
                                    ),
                                    onPressed: () =>
                                        _deleteGroup(context, ref, group),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              superintendent == null
                                  ? 'Sem superintendente'
                                  : 'Superintendente: ${superintendent.name}',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            if (assistant != null)
                              Text(
                                'Ajudante: ${assistant.name}',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            if (group.description != null) ...[
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                group.description!,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                            if (members.isNotEmpty) ...[
                              const SizedBox(height: AppSpacing.sm),
                              Wrap(
                                spacing: AppSpacing.xs,
                                runSpacing: AppSpacing.xs,
                                children: [
                                  for (final member in members)
                                    Chip(
                                      visualDensity: VisualDensity.compact,
                                      label: Text(
                                        member.name,
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
            if (canManage)
              Positioned(
                right: AppSpacing.screenPadding,
                bottom: AppSpacing.screenPadding,
                child: FloatingActionButton.extended(
                  onPressed: activePeople.isEmpty
                      ? null
                      : () => _showCreateGroupDialog(
                            context,
                            ref,
                            activePeople,
                          ),
                  icon: const Icon(Icons.add),
                  label: const Text('Novo grupo'),
                ),
              ),
          ],
        );
      },
    );
  }
}
