import '../models/user_model.dart';

/// Repository for user data.
abstract class UserRepository {
  Future<List<UserModel>> getUsers();
  Future<UserModel?> getUserById(String id);
  Future<UserModel> createUser({
    required String name,
    required String email,
    required UserRole role,
    String? congregationId,
  });
  Future<UserModel> updateUser(UserModel user);
  Future<void> deleteUser(String id);
}
