import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/create_user_service.dart';
import '../../features/auth/providers/auth_provider.dart';

/// True when we should use Cloud Function to create users (Firebase Auth + Firestore).
/// False in demo mode - uses mock repository instead.
final useCloudFunctionForCreateUserProvider = Provider<bool>((ref) {
  final authState = ref.watch(authStateProvider);
  return Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
});

final createUserServiceProvider = Provider<CreateUserService>((ref) {
  return CreateUserService();
});
