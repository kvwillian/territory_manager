import '../models/territory_model.dart';

/// Rounded completion percentage for one territory (0–100). Treats no segments as 0%.
int territoryCompletionPercentRounded(TerritoryModel t) {
  if (t.totalSegments <= 0) return 0;
  return (t.completedCount / t.totalSegments * 100).round().clamp(0, 100);
}

/// Average of each territory’s rounded percentage: sum(percent) / count.
/// Returns `0` when [territories] is empty.
int neighborhoodAverageCompletionPercent(List<TerritoryModel> territories) {
  if (territories.isEmpty) return 0;
  final sum = territories.fold<int>(
    0,
    (s, t) => s + territoryCompletionPercentRounded(t),
  );
  return (sum / territories.length).round();
}

/// Groups territories by [TerritoryModel.neighborhood], sorted by neighborhood
/// then by territory number/name.
Map<String, List<TerritoryModel>> groupTerritoriesByNeighborhood(
  List<TerritoryModel> territories,
) {
  final map = <String, List<TerritoryModel>>{};
  for (final t in territories) {
    final key = t.neighborhood;
    map.putIfAbsent(key, () => []).add(t);
  }
  for (final list in map.values) {
    list.sort((a, b) {
      final na = a.number ?? a.name;
      final nb = b.number ?? b.name;
      return na.compareTo(nb);
    });
  }
  final sortedKeys = map.keys.toList()..sort();
  return Map.fromEntries(
    sortedKeys.map((k) => MapEntry(k, map[k]!)),
  );
}
