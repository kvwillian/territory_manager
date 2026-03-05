import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

import '../../firebase_options.dart';

/// Firebase configuration and initialization.
class FirebaseConfig {
  FirebaseConfig._();

  static Future<void> initialize() async {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    // Disable Firestore persistence to avoid PERMISSION_DENIED on Listen:
    // Cached docs (e.g. assignments) from a previous session may have a
    // different congregationId than the current user; Firestore's sync
    // listeners then fail. Offline is handled by Drift + OfflineSyncService.
    FirebaseFirestore.instance.settings = const Settings(
      persistenceEnabled: false,
    );
  }

  static bool get isInitialized => Firebase.apps.isNotEmpty;
}
