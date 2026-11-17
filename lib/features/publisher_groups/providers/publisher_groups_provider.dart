import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../models/publisher_group.dart';

final publisherGroupsProvider = FutureProvider<List<PublisherGroup>>((ref) async {
  if (Firebase.apps.isEmpty) return const [];
  final auth = ref.watch(authStateProvider);
  if (auth is! AuthAuthenticated) return const [];
  final congregationId = ref.watch(currentCongregationProvider);
  if (congregationId == null || congregationId.isEmpty) return const [];
  final user = auth.user;
  final firestore = FirebaseFirestore.instance;

  if (!user.hasFullPublishersAccess && user.isGroupSuperintendent) {
    final doc = await firestore
        .collection('publisherGroups')
        .doc(user.supervisedGroupId)
        .get();
    if (!doc.exists || doc.data() == null) return const [];
    final data = doc.data()!;
    if (data['congregationId'] != congregationId) return const [];
    return [PublisherGroup.fromDoc(doc.id, data)];
  }

  final snapshot = await firestore
      .collection('publisherGroups')
      .where('congregationId', isEqualTo: congregationId)
      .get();
  final groups = snapshot.docs
      .map((doc) => PublisherGroup.fromDoc(doc.id, doc.data()))
      .toList();
  groups.sort((a, b) => a.name.compareTo(b.name));
  return groups;
});
