import '../models/territory_model.dart';

/// Classification of territory progress status.
enum TerritoryStatus {
  completed,
  inProgress,
  notStarted,
}

/// Helper to determine territory status from segment completion.
extension TerritoryStatusX on TerritoryModel {
  TerritoryStatus get territoryStatus {
    if (totalSegments == 0) return TerritoryStatus.notStarted;
    if (completedCount == totalSegments) return TerritoryStatus.completed;
    if (completedCount > 0) return TerritoryStatus.inProgress;
    return TerritoryStatus.notStarted;
  }

  bool get isCompleted => territoryStatus == TerritoryStatus.completed;
  bool get isInProgress => territoryStatus == TerritoryStatus.inProgress;
  bool get isNotStarted => territoryStatus == TerritoryStatus.notStarted;
}
