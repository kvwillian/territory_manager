import 'package:cloud_functions/cloud_functions.dart';

import '../../features/auth/models/user_model.dart';

/// Creates users via Firebase Cloud Function (Auth + Firestore).
/// Use when admins create conductors or other admins.
/// New user inherits congregationId from the admin caller.
class CreateUserService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  /// Creates a Firebase Auth user and Firestore user document.
  /// Pass [congregationId] to ensure the new user belongs to the admin's congregation.
  /// Throws [FirebaseFunctionsException] on failure.
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
    if (congregationId != null && congregationId.isNotEmpty) {
      payload['congregationId'] = congregationId;
    }

    final result = await _functions.httpsCallable('createUser').call(payload);

    final data = result.data as Map<String, dynamic>;
    return UserModel(
      id: data['uid'] as String,
      name: data['name'] as String,
      email: data['email'] as String?,
      role: UserRole.values.firstWhere(
        (e) => e.name == data['role'],
        orElse: () => UserRole.conductor,
      ),
      congregationId: data['congregationId'] as String? ?? congregationId,
    );
  }
}
