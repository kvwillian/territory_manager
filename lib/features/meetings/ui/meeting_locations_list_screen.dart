import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../models/meeting_location_model.dart';
import '../providers/meeting_locations_provider.dart';
import '../../admin/ui/admin_shell.dart';

/// Admin screen: list of meeting locations (locais de saída).
class MeetingLocationsListScreen extends ConsumerWidget {
  const MeetingLocationsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncLocations = ref.watch(meetingLocationsProvider);

    return asyncLocations.when(
      loading: () => Scaffold(
        appBar: AppBar(
          title: const Text('Locais de Saída'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/admin'),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Locais de Saída')),
        body: Center(child: Text('Erro: $e')),
      ),
      data: (locations) => AdminShell(
        title: 'Locais de Saída',
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => context.push('/admin/meeting-locations/create'),
          icon: const Icon(Icons.add),
          label: const Text('Novo local'),
        ),
        child: ListView.builder(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          itemCount: locations.length,
          itemBuilder: (context, index) {
            final location = locations[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: _MeetingLocationListTile(location: location),
            );
          },
        ),
      ),
    );
  }
}

class _MeetingLocationListTile extends StatelessWidget {
  const _MeetingLocationListTile({required this.location});

  final MeetingLocationModel location;

  String get _subtitle {
    String base;
    if (location.shortLocation != null && location.shortLocation!.isNotEmpty) {
      base = location.shortLocation!;
    } else if (location.address != null && location.address!.isNotEmpty) {
      base = MeetingLocationModel.deriveShortLocation(location.address!);
    } else {
      return '';
    }
    final number = location.houseNumber?.trim();
    if (number != null && number.isNotEmpty && !base.contains(number)) {
      final parts = base.split(', ');
      if (parts.length >= 2) {
        return '${parts[0]}, $number, ${parts.sublist(1).join(', ')}';
      }
      return '$base, nº $number';
    }
    return base;
  }

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => context.push('/admin/meeting-locations/edit/${location.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.place_outlined,
                size: 40,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      location.name,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    if (_subtitle.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          _subtitle,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant,
                              ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'Raio: ${location.radiusKm} km • ${location.allowedTerritories.length} territórios',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ],
      ),
    );
  }
}
