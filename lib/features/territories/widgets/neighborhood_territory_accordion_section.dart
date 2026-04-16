import 'package:flutter/material.dart';

import '../../../core/constants/app_spacing.dart';
import '../models/territory_model.dart';
import '../utils/neighborhood_territory_utils.dart';

/// Accordion header: neighborhood name (optional average %); body: custom tiles.
class NeighborhoodTerritoryAccordionSection extends StatefulWidget {
  const NeighborhoodTerritoryAccordionSection({
    super.key,
    required this.neighborhoodName,
    required this.territories,
    required this.itemBuilder,
    this.initiallyExpanded = false,
    this.showNeighborhoodCompletionPercent = true,
  });

  final String neighborhoodName;
  final List<TerritoryModel> territories;
  final Widget Function(BuildContext context, TerritoryModel territory) itemBuilder;
  final bool initiallyExpanded;

  /// When false (e.g. territory pickers), header shows only the neighborhood name.
  final bool showNeighborhoodCompletionPercent;

  @override
  State<NeighborhoodTerritoryAccordionSection> createState() =>
      _NeighborhoodTerritoryAccordionSectionState();
}

class _NeighborhoodTerritoryAccordionSectionState
    extends State<NeighborhoodTerritoryAccordionSection> {
  late bool _expanded;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initiallyExpanded;
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.showNeighborhoodCompletionPercent
        ? '${widget.neighborhoodName} - ${neighborhoodAverageCompletionPercent(widget.territories)}%'
        : widget.neighborhoodName;

    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.md,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.location_city_outlined,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                        Text(
                          '${widget.territories.length} território(s)',
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                        ),
                      ],
                    ),
                  ),
                  AnimatedRotation(
                    turns: _expanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(Icons.expand_more),
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Padding(
              padding: const EdgeInsets.only(
                left: AppSpacing.md,
                right: AppSpacing.md,
                bottom: AppSpacing.md,
              ),
              child: Column(
                children: widget.territories.map((t) {
                  return Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.sm),
                    child: widget.itemBuilder(context, t),
                  );
                }).toList(),
              ),
            ),
            crossFadeState: _expanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    );
  }
}
