import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../models/audio_video_roster.dart';

final audioVideoRostersProvider = FutureProvider<List<AudioVideoRoster>>((ref) async {
  if (Firebase.apps.isEmpty) return const [];
  final auth = ref.watch(authStateProvider);
  if (auth is! AuthAuthenticated) return const [];
  final congregationId = ref.watch(currentCongregationProvider);
  if (congregationId == null || congregationId.isEmpty) return const [];
  final snapshot = await FirebaseFirestore.instance
      .collection('audioVideoRosters')
      .where('congregationId', isEqualTo: congregationId)
      .get();
  final rosters = snapshot.docs.map((doc) => AudioVideoRoster.fromDoc(doc.data())).toList();
  rosters.sort((a, b) => b.label.compareTo(a.label));
  return rosters;
});

final cleaningAssignmentsProvider = FutureProvider<Map<String, String>>((ref) async {
  if (Firebase.apps.isEmpty) return const {};
  final auth = ref.watch(authStateProvider);
  if (auth is! AuthAuthenticated) return const {};
  final congregationId = ref.watch(currentCongregationProvider);
  if (congregationId == null || congregationId.isEmpty) return const {};
  final snapshot = await FirebaseFirestore.instance.collection('cleaningAssignments').doc(congregationId).get();
  final people = snapshot.data()?['people'];
  if (people is! Map) return const {};
  return people.map((key, value) => MapEntry(key.toString(), value.toString()));
});
