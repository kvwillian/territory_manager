import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../models/publisher_model.dart';
import '../repositories/firestore_publisher_repository.dart';
import '../repositories/publisher_repository.dart';

final publisherRepositoryProvider = Provider<PublisherRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore) {
    return FirestorePublisherRepository(ref.watch(currentCongregationProvider));
  }
  return MockPublisherRepository();
});

final publishersProvider = FutureProvider<List<PublisherModel>>((ref) {
  return ref.watch(publisherRepositoryProvider).getPublishers();
});

class MockPublisherRepository implements PublisherRepository {
  final List<PublisherModel> _items = [
    const PublisherModel(
      id: 'p1',
      name: 'Ana Souza',
      privilege: CongregationPrivilege.publisher,
      pioneer: PioneerService.none,
    ),
    const PublisherModel(
      id: 'p2',
      name: 'Carlos Lima',
      privilege: CongregationPrivilege.publisher,
      pioneer: PioneerService.auxiliary,
    ),
    const PublisherModel(
      id: 'p3',
      name: 'Marina Alves',
      privilege: CongregationPrivilege.ministerialServant,
      pioneer: PioneerService.regular,
    ),
    const PublisherModel(
      id: 'p4',
      name: 'Paulo Mendes',
      privilege: CongregationPrivilege.elder,
      pioneer: PioneerService.none,
    ),
  ];

  @override
  Future<List<PublisherModel>> getPublishers() async {
    final copy = List<PublisherModel>.from(_items);
    copy.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return copy;
  }

  @override
  Future<PublisherModel?> getPublisherById(String id) async {
    final index = _items.indexWhere((item) => item.id == id);
    return index < 0 ? null : _items[index];
  }

  @override
  Future<PublisherModel> createPublisher(PublisherModel publisher) async {
    final created = publisher.copyWith(
      id: 'p${DateTime.now().millisecondsSinceEpoch}',
    );
    _items.add(created);
    return created;
  }

  @override
  Future<PublisherModel> updatePublisher(PublisherModel publisher) async {
    final index = _items.indexWhere((item) => item.id == publisher.id);
    if (index < 0) throw StateError('Publisher not found');
    _items[index] = publisher;
    return publisher;
  }

  @override
  Future<void> deletePublisher(String id) async {
    _items.removeWhere((item) => item.id == id);
  }
}
