/// Day of week for preaching sessions.
enum DayOfWeek {
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
  sunday,
}

/// Preaching session represents a weekly session at a meeting location.
/// Tuesday–Saturday: 1 or 2 conductors. Sunday: exactly 1 conductor per group.
class PreachingSessionModel {
  const PreachingSessionModel({
    required this.id,
    required this.dayOfWeek,
    required this.meetingLocationId,
    required this.startTime,
    required this.conductorIds,
    required this.isSundaySession,
    this.congregationId,
    this.createdAt,
  });

  final String id;
  final DayOfWeek dayOfWeek;
  final String meetingLocationId;
  final String startTime;
  final List<String> conductorIds;
  final bool isSundaySession;
  final String? congregationId;
  final DateTime? createdAt;

  PreachingSessionModel copyWith({
    String? id,
    DayOfWeek? dayOfWeek,
    String? meetingLocationId,
    String? startTime,
    List<String>? conductorIds,
    bool? isSundaySession,
    String? congregationId,
    DateTime? createdAt,
  }) {
    return PreachingSessionModel(
      id: id ?? this.id,
      dayOfWeek: dayOfWeek ?? this.dayOfWeek,
      meetingLocationId: meetingLocationId ?? this.meetingLocationId,
      startTime: startTime ?? this.startTime,
      conductorIds: conductorIds ?? this.conductorIds,
      isSundaySession: isSundaySession ?? this.isSundaySession,
      congregationId: congregationId ?? this.congregationId,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'dayOfWeek': dayOfWeek.name,
      'meetingLocationId': meetingLocationId,
      'startTime': startTime,
      'conductorIds': conductorIds,
      'isSundaySession': isSundaySession,
      'congregationId': congregationId,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  factory PreachingSessionModel.fromMap(Map<String, dynamic> map) {
    return PreachingSessionModel(
      id: map['id'] as String,
      dayOfWeek: DayOfWeek.values.firstWhere(
        (e) => e.name == map['dayOfWeek'],
        orElse: () => DayOfWeek.thursday,
      ),
      meetingLocationId: map['meetingLocationId'] as String,
      startTime: map['startTime'] as String,
      conductorIds:
          (map['conductorIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      isSundaySession: map['isSundaySession'] as bool? ?? false,
      congregationId: map['congregationId'] as String?,
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'] as String)
          : null,
    );
  }
}
