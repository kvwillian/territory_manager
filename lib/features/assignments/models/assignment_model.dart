/// Assignment links a session (date) to conductors, meeting location, territories,
/// and optional Sunday field group / preachingSessionId.
class AssignmentModel {
  const AssignmentModel({
    required this.id,
    required this.date,
    this.territoryId,
    this.conductorIds = const [],
    this.meetingLocationId,
    this.territoryIds = const [],
    this.preachingSessionId,
    this.congregationId,
    this.groupId,
  });

  final String id;
  final DateTime date;
  /// Legacy: single territory. When territoryIds is empty, used for display.
  final String? territoryId;
  /// Dirigentes for this session (order preserved for WhatsApp).
  final List<String> conductorIds;
  /// Meeting location (local de saída) for this session.
  final String? meetingLocationId;
  /// Territories assigned for this session. Grouped by neighborhood in UI.
  final List<String> territoryIds;
  /// Optional link to PreachingSession (day of week, meeting location, conductors).
  final String? preachingSessionId;
  final String? congregationId;
  /// Sunday field group id (e.g. registered "Grupo Guaíba").
  final String? groupId;

  /// First conductor for backward compatibility with single-dirigente UIs.
  String? get conductorId => conductorIds.isEmpty ? null : conductorIds.first;

  /// All territory IDs for this assignment (territoryIds or [territoryId] if single).
  List<String> get allTerritoryIds {
    if (territoryIds.isNotEmpty) return territoryIds;
    if (territoryId != null) return [territoryId!];
    return [];
  }

  bool assignsConductor(String userId) => conductorIds.contains(userId);

  AssignmentModel copyWith({
    String? id,
    DateTime? date,
    String? territoryId,
    List<String>? conductorIds,
    String? meetingLocationId,
    List<String>? territoryIds,
    String? preachingSessionId,
    String? congregationId,
    String? groupId,
    bool clearGroupId = false,
  }) {
    return AssignmentModel(
      id: id ?? this.id,
      date: date ?? this.date,
      territoryId: territoryId ?? this.territoryId,
      conductorIds: conductorIds ?? this.conductorIds,
      meetingLocationId: meetingLocationId ?? this.meetingLocationId,
      territoryIds: territoryIds ?? this.territoryIds,
      preachingSessionId: preachingSessionId ?? this.preachingSessionId,
      congregationId: congregationId ?? this.congregationId,
      groupId: clearGroupId ? null : (groupId ?? this.groupId),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'date': date.toIso8601String(),
      'territoryId': territoryId,
      'conductorIds': conductorIds,
      'conductorId': conductorIds.isEmpty ? null : conductorIds.first,
      'meetingLocationId': meetingLocationId,
      'territoryIds': territoryIds,
      'preachingSessionId': preachingSessionId,
      'congregationId': congregationId,
      'groupId': groupId,
    };
  }

  factory AssignmentModel.fromMap(Map<String, dynamic> map) {
    final territoryIdsRaw = map['territoryIds'];
    final territoryIds = territoryIdsRaw != null
        ? (territoryIdsRaw as List<dynamic>).map((e) => e as String).toList()
        : <String>[];
    final conductorIdsRaw = map['conductorIds'] as List<dynamic>?;
    var conductorIds = conductorIdsRaw != null
        ? conductorIdsRaw.map((e) => e as String).toList()
        : <String>[];
    final legacy = map['conductorId'] as String?;
    if (conductorIds.isEmpty && legacy != null && legacy.isNotEmpty) {
      conductorIds = [legacy];
    }
    return AssignmentModel(
      id: map['id'] as String,
      date: DateTime.parse(map['date'] as String),
      territoryId: map['territoryId'] as String?,
      conductorIds: conductorIds,
      meetingLocationId: map['meetingLocationId'] as String?,
      territoryIds: territoryIds,
      preachingSessionId: map['preachingSessionId'] as String?,
      congregationId: map['congregationId'] as String?,
      groupId: map['groupId'] as String?,
    );
  }
}
