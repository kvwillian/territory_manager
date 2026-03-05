/// Assignment links a session (date) to conductor, meeting location, and territories.
/// Uses: conductorId, meetingLocationId, territoryIds, and optional preachingSessionId.
class AssignmentModel {
  const AssignmentModel({
    required this.id,
    required this.date,
    this.territoryId,
    this.conductorId,
    this.meetingLocationId,
    this.territoryIds = const [],
    this.preachingSessionId,
    this.congregationId,
  });

  final String id;
  final DateTime date;
  /// Legacy: single territory. When territoryIds is empty, used for display.
  final String? territoryId;
  /// Conductor (condutor) for this session.
  final String? conductorId;
  /// Meeting location (local de saída) for this session.
  final String? meetingLocationId;
  /// Territories assigned for this session. Grouped by neighborhood in UI.
  final List<String> territoryIds;
  /// Optional link to PreachingSession (day of week, meeting location, conductors).
  final String? preachingSessionId;
  final String? congregationId;

  /// All territory IDs for this assignment (territoryIds or [territoryId] if single).
  List<String> get allTerritoryIds {
    if (territoryIds.isNotEmpty) return territoryIds;
    if (territoryId != null) return [territoryId!];
    return [];
  }

  AssignmentModel copyWith({
    String? id,
    DateTime? date,
    String? territoryId,
    String? conductorId,
    String? meetingLocationId,
    List<String>? territoryIds,
    String? preachingSessionId,
    String? congregationId,
  }) {
    return AssignmentModel(
      id: id ?? this.id,
      date: date ?? this.date,
      territoryId: territoryId ?? this.territoryId,
      conductorId: conductorId ?? this.conductorId,
      meetingLocationId: meetingLocationId ?? this.meetingLocationId,
      territoryIds: territoryIds ?? this.territoryIds,
      preachingSessionId: preachingSessionId ?? this.preachingSessionId,
      congregationId: congregationId ?? this.congregationId,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'date': date.toIso8601String(),
      'territoryId': territoryId,
      'conductorId': conductorId,
      'meetingLocationId': meetingLocationId,
      'territoryIds': territoryIds,
      'preachingSessionId': preachingSessionId,
      'congregationId': congregationId,
    };
  }

  factory AssignmentModel.fromMap(Map<String, dynamic> map) {
    final territoryIdsRaw = map['territoryIds'];
    final territoryIds = territoryIdsRaw != null
        ? (territoryIdsRaw as List<dynamic>).map((e) => e as String).toList()
        : <String>[];
    return AssignmentModel(
      id: map['id'] as String,
      date: DateTime.parse(map['date'] as String),
      territoryId: map['territoryId'] as String?,
      conductorId: map['conductorId'] as String?,
      meetingLocationId: map['meetingLocationId'] as String?,
      territoryIds: territoryIds,
      preachingSessionId: map['preachingSessionId'] as String?,
      congregationId: map['congregationId'] as String?,
    );
  }
}
