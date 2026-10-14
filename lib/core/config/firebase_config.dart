import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../../firebase_options.dart';

/// Firebase configuration and initialization.
class FirebaseConfig {
  FirebaseConfig._();

  static Future<void> initialize() async {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    await _activateAppCheck();
    // Disable Firestore persistence to avoid PERMISSION_DENIED on Listen:
    // Cached docs (e.g. assignments) from a previous session may have a
    // different congregationId than the current user; Firestore's sync
    // listeners then fail. Offline is handled by Drift + OfflineSyncService.
    FirebaseFirestore.instance.settings = const Settings(
      persistenceEnabled: false,
    );
  }

  static bool get isInitialized => Firebase.apps.isNotEmpty;

  /// Release builds use Play Integrity / DeviceCheck.
  /// Debug skips App Check: the debug provider calls an API that is not
  /// enabled on this project, and a failed token makes Auth and Cloud
  /// Functions return UNAVAILABLE.
  static Future<void> _activateAppCheck() async {
    if (kIsWeb || kDebugMode) return;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        break;
      default:
        return;
    }
    try {
      await FirebaseAppCheck.instance.activate(
        // ignore: deprecated_member_use
        androidProvider: AndroidProvider.playIntegrity,
        // ignore: deprecated_member_use
        appleProvider: AppleProvider.deviceCheck,
      );
    } catch (e, st) {
      debugPrint('Firebase App Check activate failed: $e\n$st');
    }
  }
}
