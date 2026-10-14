import 'package:cloud_functions/cloud_functions.dart';

/// Asks the server for a temporary password by email.
/// The next sign-in must replace that password inside the app.
class RequestPasswordResetService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  /// Throws [FirebaseFunctionsException] on failure.
  Future<void> requestReset(String email) async {
    await _functions.httpsCallable('requestPasswordReset').call({
      'email': email.trim(),
    });
  }
}
