import 'package:cloud_firestore/cloud_firestore.dart';

enum AnnouncementKind { announcement, event }

class AnnouncementModel {
  const AnnouncementModel({
    required this.id,
    required this.title,
    required this.body,
    required this.kind,
    this.eventDate,
    this.congregationId,
    this.createdAt,
  });

  final String id;
  final String title;
  final String body;
  final AnnouncementKind kind;
  final DateTime? eventDate;
  final String? congregationId;
  final DateTime? createdAt;

  bool get isEvent => kind == AnnouncementKind.event;

  AnnouncementModel copyWith({
    String? id,
    String? title,
    String? body,
    AnnouncementKind? kind,
    DateTime? eventDate,
    String? congregationId,
    DateTime? createdAt,
  }) {
    return AnnouncementModel(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      kind: kind ?? this.kind,
      eventDate: eventDate ?? this.eventDate,
      congregationId: congregationId ?? this.congregationId,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

AnnouncementKind announcementKindFrom(Object? value) {
  return value == AnnouncementKind.event.name
      ? AnnouncementKind.event
      : AnnouncementKind.announcement;
}

DateTime? announcementDateFrom(Object? value) {
  if (value is Timestamp) return value.toDate();
  if (value is String) return DateTime.tryParse(value);
  return null;
}
