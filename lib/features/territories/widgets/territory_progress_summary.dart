import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../shared/widgets/progress_indicator_bar.dart';
import '../models/territory_model.dart';
import '../utils/neighborhood_territory_utils.dart';

/// Name, completion %, street count, and progress bar (no card / tap target).
class TerritoryProgressSummary extends StatelessWidget {
  const TerritoryProgressSummary({super.key, required this.territory});

  final TerritoryModel territory;

  @override
  Widget build(BuildContext context) {
    final percentage = territoryCompletionPercentRounded(territory);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text.rich(
          TextSpan(
            style: Theme.of(context).textTheme.headlineSmall,
            children: [
              TextSpan(
                text: territory.number != null && territory.number!.isNotEmpty
                    ? '${territory.number} - ${territory.name}'
                    : territory.name,
              ),
              TextSpan(
                text: ' - $percentage%',
                style: const TextStyle(
                  color: AppColors.successGreen,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        Text(
          '${territory.completedCount} ruas concluídas',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: AppSpacing.md),
        ProgressIndicatorBar(
          completed: territory.completedCount,
          total: territory.totalSegments,
        ),
      ],
    );
  }
}
