import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_spacing.dart';
import '../../publishers/models/publisher_model.dart';
import '../../publishers/providers/publisher_repository_provider.dart';
import '../providers/publisher_groups_provider.dart';

class PublisherGroupsScreen extends ConsumerWidget {
  const PublisherGroupsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groups = ref.watch(publisherGroupsProvider);
    final publishers = ref.watch(publishersProvider);
    return groups.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => const Center(child: Text('Não foi possível carregar os grupos.')),
      data: (items) {
        final people = publishers.maybeWhen(data: (value) => value, orElse: () => const <PublisherModel>[]);
        if (items.isEmpty) {
          return const Center(child: Text('Nenhum grupo cadastrado.'));
        }
        return ListView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          children: [
            for (final group in items)
              Card(
                child: ListTile(
                  title: Text(group.name),
                  subtitle: Text(_subtitle(group.superintendentPublisherId, group.id, people)),
                ),
              ),
          ],
        );
      },
    );
  }

  String _subtitle(String superintendentId, String groupId, List<PublisherModel> people) {
    PublisherModel? superintendent;
    var count = 0;
    for (final person in people) {
      if (person.id == superintendentId) superintendent = person;
      if (person.groupId == groupId) count += 1;
    }
    final lead = superintendent == null ? 'Sem superintendente' : 'Superintendente: ${superintendent.name}';
    return '$lead · $count publicadores';
  }
}
