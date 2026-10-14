import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/publisher_model.dart';
import '../providers/publisher_repository_provider.dart';

enum _PublisherFilter {
  all,
  publishers,
  auxiliaryPioneers,
  regularPioneers,
  ministerialServants,
  elders,
}

const _filterLabels = {
  _PublisherFilter.all: 'Todos',
  _PublisherFilter.publishers: 'Publicadores',
  _PublisherFilter.auxiliaryPioneers: 'Pioneiros auxiliares',
  _PublisherFilter.regularPioneers: 'Pioneiros regulares',
  _PublisherFilter.ministerialServants: 'Servos ministeriais',
  _PublisherFilter.elders: 'Anciãos',
};

class PublishersListScreen extends ConsumerStatefulWidget {
  const PublishersListScreen({super.key});

  @override
  ConsumerState<PublishersListScreen> createState() =>
      _PublishersListScreenState();
}

class _PublishersListScreenState extends ConsumerState<PublishersListScreen> {
  final _searchController = TextEditingController();
  _PublisherFilter _filter = _PublisherFilter.all;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool _matches(PublisherModel publisher) {
    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty && !publisher.name.toLowerCase().contains(query)) {
      return false;
    }
    return switch (_filter) {
      _PublisherFilter.all => true,
      _PublisherFilter.publishers =>
        publisher.privilege == CongregationPrivilege.publisher &&
            publisher.pioneer == PioneerService.none,
      _PublisherFilter.auxiliaryPioneers =>
        publisher.pioneer == PioneerService.auxiliary,
      _PublisherFilter.regularPioneers =>
        publisher.pioneer == PioneerService.regular,
      _PublisherFilter.ministerialServants =>
        publisher.privilege == CongregationPrivilege.ministerialServant,
      _PublisherFilter.elders =>
        publisher.privilege == CongregationPrivilege.elder,
    };
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final isAdmin = auth is AuthAuthenticated && auth.user.isAdmin;
    final publishers = ref.watch(publishersProvider);

    return publishers.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Erro: $error')),
      data: (items) {
        final visible = items.where(_matches).toList();
        return Stack(
          children: [
            Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenPadding,
                    AppSpacing.md,
                    AppSpacing.screenPadding,
                    0,
                  ),
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      labelText: 'Buscar por nome',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                SizedBox(
                  height: 56,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.screenPadding,
                      vertical: AppSpacing.sm,
                    ),
                    children: [
                      for (final filter in _PublisherFilter.values)
                        Padding(
                          padding: const EdgeInsets.only(right: AppSpacing.sm),
                          child: FilterChip(
                            label: Text(_filterLabels[filter]!),
                            selected: _filter == filter,
                            onSelected: (_) => setState(() => _filter = filter),
                          ),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: visible.isEmpty
                      ? const Center(child: Text('Nenhum publicador encontrado'))
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.screenPadding,
                            0,
                            AppSpacing.screenPadding,
                            88,
                          ),
                          itemCount: visible.length,
                          separatorBuilder: (context, index) =>
                              const SizedBox(height: AppSpacing.md),
                          itemBuilder: (context, index) {
                            final publisher = visible[index];
                            return AppCard(
                              onTap: isAdmin
                                  ? () => context.push(
                                        '/publishers/edit/${publisher.id}',
                                      )
                                  : null,
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: AppColors.secondaryPurple,
                                    child: Text(
                                      publisher.name.isEmpty
                                          ? '?'
                                          : publisher.name[0].toUpperCase(),
                                      style: const TextStyle(
                                        color: AppColors.richViolet,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          publisher.name,
                                          style: Theme.of(context)
                                              .textTheme
                                              .titleSmall
                                              ?.copyWith(
                                                fontWeight: FontWeight.w700,
                                                color: AppColors.deepNavy,
                                              ),
                                        ),
                                        Text(
                                          publisher.subtitle,
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodySmall,
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (isAdmin)
                                    IconButton(
                                      tooltip: 'Excluir',
                                      onPressed: () async {
                                        await ref
                                            .read(publisherRepositoryProvider)
                                            .deletePublisher(publisher.id);
                                        ref.invalidate(publishersProvider);
                                      },
                                      icon: const Icon(Icons.delete_outline),
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
            if (isAdmin)
              Positioned(
                right: AppSpacing.screenPadding,
                bottom: AppSpacing.screenPadding,
                child: FloatingActionButton.extended(
                  onPressed: () => context.push('/publishers/create'),
                  icon: const Icon(Icons.add),
                  label: const Text('Novo publicador'),
                ),
              ),
          ],
        );
      },
    );
  }
}
