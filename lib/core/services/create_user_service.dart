import 'package:cloud_functions/cloud_functions.dart';

import '../constants/congregation_constants.dart';
import '../../features/auth/models/user_model.dart';

/// Creates users via Firebase Cloud Function (Auth + Firestore).
/// Use when admins create conductors or other admins.
/// New user always gets the same congregationId as the admin caller.
class CreateUserService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  /// Creates a Firebase Auth user and Firestore user document.
  /// Pass [congregationId] (admin's congregation from currentCongregationProvider).
  /// When null/empty, Cloud Function uses the admin's Firestore doc - new user
  /// always inherits the admin's congregationId.
  Future<UserModel> createUser({
    required String email,
    required String password,
    required String name,
    required UserRole role,
    String? congregationId,
  }) async {
    final payload = <String, dynamic>{
      'email': email,
      'password': password,
      'name': name,
      'role': role.name,
    };
    if (congregationId != null && congregationId.trim().isNotEmpty) {
      payload['congregationId'] = congregationId.trim();
    }

    final result = await _functions.httpsCallable('createUser').call(payload);

    final data = result.data as Map<String, dynamic>;
    final cid = data['congregationId'] as String? ?? congregationId ?? defaultCongregationId;
    return UserModel(
      id: data['uid'] as String,
      name: data['name'] as String,
      email: data['email'] as String?,
      role: UserRole.values.firstWhere(
        (e) => e.name == data['role'],
        orElse: () => UserRole.conductor,
      ),
      congregationId: cid,
    );
  }
}
