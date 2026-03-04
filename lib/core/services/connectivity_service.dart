import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';

/// Service for checking network connectivity.
class ConnectivityService {
  ConnectivityService() : _connectivity = Connectivity();

  final Connectivity _connectivity;

  /// Returns true if the device appears to have internet connectivity.
  Future<bool> get isOnline async {
    final result = await _connectivity.checkConnectivity();
    return _hasConnection(result);
  }

  /// Stream of connectivity changes.
  Stream<bool> get onConnectivityChanged =>
      _connectivity.onConnectivityChanged.map(_hasConnection);

  bool _hasConnection(List<ConnectivityResult> results) {
    for (final r in results) {
      if (r == ConnectivityResult.wifi ||
          r == ConnectivityResult.mobile ||
          r == ConnectivityResult.ethernet) {
        return true;
      }
    }
    return false;
  }
}
