import 'package:firebase_core/firebase_core.dart';

import '../../firebase_options.dart';

/// Firebase configuration and initialization.
class FirebaseConfig {
  FirebaseConfig._();

  static Future<void> initialize() async {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  }

  static bool get isInitialized => Firebase.apps.isNotEmpty;
}
