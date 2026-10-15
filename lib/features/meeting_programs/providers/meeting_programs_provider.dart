import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';

import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../models/meeting_program.dart';

final meetingProgramsProvider = FutureProvider<List<MeetingProgram>>((ref) async {
  if (Firebase.apps.isEmpty) return const [];
  final auth = ref.watch(authStateProvider);
  if (auth is! AuthAuthenticated) return const [];
  final congregationId = ref.watch(currentCongregationProvider);
  if (congregationId == null || congregationId.isEmpty) return const [];
  final snapshot = await FirebaseFirestore.instance
      .collection('meetingPrograms')
      .where('congregationId', isEqualTo: congregationId)
      .get();
  final meetings = snapshot.docs.map((doc) => MeetingProgram.fromDoc(doc.id, doc.data())).toList();
  meetings.sort((a, b) => a.date.compareTo(b.date));
  return meetings;
});
