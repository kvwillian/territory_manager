import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/announcement_model.dart';
import 'announcement_repository.dart';

const _collection = 'announcements';

class FirestoreAnnouncementRepository implements AnnouncementRepository {
  FirestoreAnnouncementRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _cid => congregationId ?? defaultCongregationId;

  @override
  Future<List<AnnouncementModel>> getAnnouncements() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('congregationId', isEqualTo: _cid)
        .get();
    final items = snapshot.docs.map(_fromDoc).toList();
    items.sort((a, b) {
      final aDate = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bDate = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bDate.compareTo(aDate);
    });
    return items;
  }

  @override
  Future<AnnouncementModel> createAnnouncement(
    AnnouncementModel announcement,
  ) async {
    final docRef = _firestore.collection(_collection).doc();
    final now = DateTime.now();
    await docRef.set({
      'title': announcement.title,
      'body': announcement.body,
      'kind': announcement.kind.name,
      'eventDate': announcement.eventDate == null
          ? null
          : Timestamp.fromDate(announcement.eventDate!),
      'congregationId': _cid,
      'createdAt': Timestamp.fromDate(now),
    });
    return announcement.copyWith(
      id: docRef.id,
      congregationId: _cid,
      createdAt: now,
    );
  }

  @override
  Future<void> deleteAnnouncement(String id) async {
    await _firestore.collection(_collection).doc(id).delete();
  }

  AnnouncementModel _fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return AnnouncementModel(
      id: doc.id,
      title: data['title'] as String? ?? '',
      body: data['body'] as String? ?? '',
      kind: announcementKindFrom(data['kind']),
      eventDate: announcementDateFrom(data['eventDate']),
      congregationId: data['congregationId'] as String? ?? _cid,
      createdAt: announcementDateFrom(data['createdAt']),
    );
  }
}
