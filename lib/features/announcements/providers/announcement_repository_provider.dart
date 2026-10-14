import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../models/announcement_model.dart';
import '../repositories/announcement_repository.dart';
import '../repositories/firestore_announcement_repository.dart';

final announcementRepositoryProvider = Provider<AnnouncementRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore) {
    return FirestoreAnnouncementRepository(
      ref.watch(currentCongregationProvider),
    );
  }
  return MockAnnouncementRepository();
});

final announcementsProvider = FutureProvider<List<AnnouncementModel>>((ref) {
  return ref.watch(announcementRepositoryProvider).getAnnouncements();
});

class MockAnnouncementRepository implements AnnouncementRepository {
  final List<AnnouncementModel> _items = [
    AnnouncementModel(
      id: 'demo-1',
      title: 'Assembleia neste fim de semana',
      body: 'Confira os detalhes e horários.',
      kind: AnnouncementKind.event,
      eventDate: DateTime.now().add(const Duration(days: 2)),
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<List<AnnouncementModel>> getAnnouncements() async =>
      List.from(_items);

  @override
  Future<AnnouncementModel> createAnnouncement(
    AnnouncementModel announcement,
  ) async {
    final created = announcement.copyWith(
      id: 'a${DateTime.now().millisecondsSinceEpoch}',
      createdAt: DateTime.now(),
    );
    _items.insert(0, created);
    return created;
  }

  @override
  Future<void> deleteAnnouncement(String id) async {
    _items.removeWhere((item) => item.id == id);
  }
}
