import 'package:cloud_functions/cloud_functions.dart';

/// Pedido de redefinição de senha (sem estar autenticado). O e-mail contém a
/// nova senha e um link para confirmar no navegador antes de valer no Firebase.
class RequestPasswordResetService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  /// Throws [FirebaseFunctionsException] on failure.
  Future<void> requestReset(String email) async {
    await _functions.httpsCallable('requestPasswordReset').call({
      'email': email.trim(),
    });
  }
}
