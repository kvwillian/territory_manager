import 'package:cloud_firestore/cloud_firestore.dart';

import 'segment_status.dart';

/// Segment represents the smallest unit of work inside a territory.
/// Examples: Rua A – left side, Rua A – right side, Rua B – block 1
class SegmentModel {
  const SegmentModel({
    required this.id,
    required this.territoryId,
    required this.description,
    required this.status,
    this.lastWorkedDate,
    this.congregationId,
  });

  final String id;
  final String territoryId;
  final String description;
  final SegmentStatus status;
  final DateTime? lastWorkedDate;
  final String? congregationId;

  bool get isCompleted => status == SegmentStatus.completed;
  bool get isPending => status == SegmentStatus.pending;

  SegmentModel copyWith({
    String? id,
    String? territoryId,
    String? description,
    SegmentStatus? status,
    DateTime? lastWorkedDate,
    String? congregationId,
  }) {
    return SegmentModel(
      id: id ?? this.id,
      territoryId: territoryId ?? this.territoryId,
      description: description ?? this.description,
      status: status ?? this.status,
      lastWorkedDate: lastWorkedDate ?? this.lastWorkedDate,
      congregationId: congregationId ?? this.congregationId,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'territoryId': territoryId,
      'description': description,
      'status': status.name,
      'lastWorkedDate': lastWorkedDate?.toIso8601String(),
      'congregationId': congregationId,
    };
  }

  /// Alias for Firestore/JSON serialization.
  Map<String, dynamic> toJson() => toMap();

  factory SegmentModel.fromMap(Map<String, dynamic> map) {
    return SegmentModel(
      id: map['id'] as String,
      territoryId: map['territoryId'] as String,
      description: map['description'] as String,
      status: SegmentStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => SegmentStatus.pending,
      ),
      lastWorkedDate: map['lastWorkedDate'] != null
          ? _parseDate(map['lastWorkedDate'])
          : null,
      congregationId: map['congregationId'] as String?,
    );
  }

  /// Parse date from String, Timestamp, or DateTime.
  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is String) return DateTime.parse(value);
    if (value is DateTime) return value;
    if (value is Timestamp) return value.toDate();
    return null;
  }

  /// Alias for Firestore/JSON deserialization.
  factory SegmentModel.fromJson(Map<String, dynamic> json) => SegmentModel.fromMap(json);
}
