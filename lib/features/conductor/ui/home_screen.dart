import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/app_spacing.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/models/user_model.dart';
import '../../meetings/models/meeting_location_model.dart';
import '../../territories/models/territory_model.dart';
import '../../admin/providers/territories_provider.dart';
import '../providers/mock_data_provider.dart';
import '../../../../shared/widgets/app_card.dart';
import '../../../../shared/widgets/cached_territory_image.dart';
import '../../../../shared/widgets/progress_indicator_bar.dart';

/// Conductor home screen.
/// Displays: Greeting, today's meeting location, assigned territory, progress, primary action.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final assignment = ref.watch(mockTodayAssignmentProvider);
    final territories = ref.watch(territoriesProvider);
    final meetingLocations = ref.watch(mockMeetingLocationsProvider);

    if (authState is! AuthAuthenticated) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (territories.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final user = authState.user;
    final territoryList =
        territories.hasValue ? territories.value! : [];
    final territory = assignment != null
        ? territoryList.where((t) => t.id == assignment.territoryId).firstOrNull
        : null;
    final meetingLocation = meetingLocations.isNotEmpty
        ? meetingLocations.first
        : null;

    return SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildGreeting(context, user),
              const SizedBox(height: AppSpacing.sectionSpacing),
              if (meetingLocation != null) ...[
                _MeetingLocationCard(meetingLocation: meetingLocation),
                const SizedBox(height: AppSpacing.sectionSpacing),
              ],
              if (territory != null) ...[
                _TerritoryCard(territory: territory),
                const SizedBox(height: AppSpacing.sectionSpacing),
                FilledButton.icon(
                  onPressed: () => context.push('/territory/${territory.id}'),
                  icon: const Icon(Icons.map),
                  label: const Text('Abrir Território'),
                ),
              ] else ...[
                AppCard(
                  child: Column(
                    children: [
                      Icon(
                        Icons.assignment_outlined,
                        size: 48,
                        color: Theme.of(context).colorScheme.primary.withValues(
                              alpha: 0.5,
                            ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        'Nenhum território atribuído para hoje',
                        style: Theme.of(context).textTheme.bodyLarge,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
    );
  }

  Widget _buildGreeting(BuildContext context, UserModel user) {
    final hour = DateTime.now().hour;
    String greeting;
    if (hour < 12) {
      greeting = 'Bom dia';
    } else if (hour < 18) {
      greeting = 'Boa tarde';
    } else {
      greeting = 'Boa noite';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$greeting, ${user.name}',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        Text(
          DateFormat('EEEE, d \'de\' MMMM', 'pt_BR').format(DateTime.now()),
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _MeetingLocationCard extends StatelessWidget {
  const _MeetingLocationCard({required this.meetingLocation});

  final MeetingLocationModel meetingLocation;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.place_outlined,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Local de saída de hoje',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            meetingLocation.name,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
        ],
      ),
    );
  }
}

class _TerritoryCard extends StatelessWidget {
  const _TerritoryCard({required this.territory});

  final TerritoryModel territory;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () {},
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CachedTerritoryImage(
            imageUrl: territory.imageUrl,
            width: double.infinity,
            height: 120,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            territory.name,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          Text(
            territory.neighborhood,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          ProgressIndicatorBar(
            completed: territory.completedCount,
            total: territory.totalSegments,
            label: 'Segmentos concluídos',
          ),
        ],
      ),
    );
  }
}
