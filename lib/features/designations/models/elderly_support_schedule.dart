class ElderlyAssignment {
  const ElderlyAssignment({
    required this.date,
    required this.elderlyName,
    required this.driverName,
    this.elderlyPublisherId,
    this.driverPublisherId,
  });

  final String date;
  final String elderlyName;
  final String driverName;
  final String? elderlyPublisherId;
  final String? driverPublisherId;

  String get formattedDate {
    final parts = date.split('-');
    if (parts.length != 3) return date;
    return '${parts[2]}/${parts[1]}/${parts[0]}';
  }

  Map<String, dynamic> toMap() {
    return {
      'date': date,
      'elderlyName': elderlyName,
      'driverName': driverName,
      if (elderlyPublisherId != null && elderlyPublisherId!.isNotEmpty)
        'elderlyPublisherId': elderlyPublisherId,
      if (driverPublisherId != null && driverPublisherId!.isNotEmpty)
        'driverPublisherId': driverPublisherId,
    };
  }

  factory ElderlyAssignment.fromMap(Map<String, dynamic> map) {
    final elderlyId = map['elderlyPublisherId'];
    final driverId = map['driverPublisherId'];
    return ElderlyAssignment(
      date: map['date'] as String? ?? '',
      elderlyName: map['elderlyName'] as String? ?? '',
      driverName: map['driverName'] as String? ?? '',
      elderlyPublisherId:
          elderlyId is String && elderlyId.trim().isNotEmpty
              ? elderlyId.trim()
              : null,
      driverPublisherId:
          driverId is String && driverId.trim().isNotEmpty
              ? driverId.trim()
              : null,
    );
  }
}

class ElderlySupportSchedule {
  const ElderlySupportSchedule({
    required this.id,
    required this.congregationId,
    required this.status,
    required this.assignments,
    this.title,
    this.note,
  });

  final String id;
  final String congregationId;
  final String status;
  final String? title;
  final String? note;
  final List<ElderlyAssignment> assignments;

  bool get isPublished => status == 'published';

  factory ElderlySupportSchedule.fromDoc(String id, Map<String, dynamic> map) {
    final rawAssignments = map['assignments'];
    final assignments = rawAssignments is List
        ? rawAssignments
            .whereType<Map>()
            .map((item) =>
                ElderlyAssignment.fromMap(Map<String, dynamic>.from(item)))
            .where((item) => item.elderlyName.trim().isNotEmpty)
            .toList()
        : <ElderlyAssignment>[];
    assignments.sort((a, b) => a.date.compareTo(b.date));
    final title = map['title'];
    final note = map['note'];
    return ElderlySupportSchedule(
      id: id,
      congregationId: map['congregationId'] as String? ?? '',
      status: map['status'] == 'published' ? 'published' : 'draft',
      title: title is String && title.trim().isNotEmpty ? title.trim() : null,
      note: note is String && note.trim().isNotEmpty ? note.trim() : null,
      assignments: assignments,
    );
  }
}
