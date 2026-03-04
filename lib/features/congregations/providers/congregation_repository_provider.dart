import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../repositories/congregation_repository.dart';
import '../repositories/firestore_congregation_repository.dart';

final congregationRepositoryProvider = Provider<CongregationRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore) {
    return FirestoreCongregationRepository();
  }
  throw UnsupportedError(
    'CongregationRepository only supported with Firestore',
  );
});
