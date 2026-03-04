import 'package:cloud_functions/cloud_functions.dart';

/// Resets a user's password via Firebase Cloud Function (admin only).
class ResetPasswordService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  /// Resets the password for the given user. Admin only.
  /// Throws [FirebaseFunctionsException] on failure.
  Future<void> resetPassword({
    required String uid,
    required String newPassword,
  }) async {
    await _functions.httpsCallable('resetUserPassword').call({
      'uid': uid,
      'newPassword': newPassword,
    });
  }
}
