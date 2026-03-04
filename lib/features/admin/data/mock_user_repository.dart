import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/models/user_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../../auth/repositories/firestore_user_repository.dart';
import '../../auth/repositories/user_repository.dart';

final _initialUsers = <UserModel>[];

final userRepositoryProvider = Provider<UserRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore) {
    return FirestoreUserRepository(ref.watch(currentCongregationProvider));
  }
  return MockUserRepository();
});

class MockUserRepository implements UserRepository {
  final List<UserModel> _users = List.from(_initialUsers);

  @override
  Future<List<UserModel>> getUsers() async => List.from(_users);

  @override
  Future<UserModel?> getUserById(String id) async {
    final index = _users.indexWhere((u) => u.id == id);
    return index >= 0 ? _users[index] : null;
  }

  @override
  Future<UserModel> createUser({
    required String name,
    required String email,
    required UserRole role,
    String? congregationId,
  }) async {
    final id = 'u${DateTime.now().millisecondsSinceEpoch}';
    final user = UserModel(id: id, name: name, role: role, email: email);
    _users.add(user);
    return user;
  }

  @override
  Future<UserModel> updateUser(UserModel user) async {
    final index = _users.indexWhere((u) => u.id == user.id);
    if (index >= 0) {
      _users[index] = user;
      return user;
    }
    throw StateError('User not found');
  }

  @override
  Future<void> deleteUser(String id) async {
    _users.removeWhere((u) => u.id == id);
  }
}
