import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/congregation_constants.dart';
import 'auth_provider.dart';

/// Provides the congregationId of the currently logged-in user.
/// Returns [defaultCongregationId] for demo users or when congregationId is missing (backward compatibility).
final currentCongregationProvider = Provider<String?>((ref) {
  final authState = ref.watch(authStateProvider);
  if (authState is! AuthAuthenticated) return null;
  final user = authState.user;
  if (user.id == 'demo-user' || user.id == 'demo-admin') {
    return defaultCongregationId;
  }
  return user.congregationId ?? defaultCongregationId;
});
