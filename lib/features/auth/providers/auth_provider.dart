import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/user_model.dart';

/// Auth state: loading, authenticated, or unauthenticated.
sealed class AuthState {}

class AuthLoading extends AuthState {}

class AuthAuthenticated extends AuthState {
  AuthAuthenticated(this.user);
  final UserModel user;
}

class AuthUnauthenticated extends AuthState {}

const _usersCollection = 'users';

/// Provides current auth state.
/// In development, can use mock data when Firebase is not configured.
final authStateProvider =
    NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    _init();
    return AuthLoading();
  }

  void _init() {
    try {
      FirebaseAuth.instance.authStateChanges().listen((User? user) async {
        if (user != null) {
          final appUser = await _userFromFirebaseUser(user);
          state = AuthAuthenticated(appUser);
        } else {
          state = AuthUnauthenticated();
        }
      });
    } catch (_) {
      state = AuthUnauthenticated();
    }
  }

  /// Fetches user profile from Firestore (name, role).
  /// Retries when doc doesn't exist yet (e.g. right after Cloud Function creates user).
  /// Falls back to Auth data if not found after retries.
  Future<UserModel> _userFromFirebaseUser(User user) async {
    const maxAttempts = 5;
    const delayMs = 500;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        final doc = await FirebaseFirestore.instance
            .collection(_usersCollection)
            .doc(user.uid)
            .get(const GetOptions(source: Source.server));

        debugPrint(
          'AuthProvider._userFromFirebaseUser attempt ${attempt + 1}/$maxAttempts: '
          'doc.exists=${doc.exists}, data=${doc.data()}',
        );

        if (doc.exists && doc.data() != null) {
          final data = doc.data()!;
          final cid = data['congregationId'] as String?;
          debugPrint(
            'AuthProvider: user doc found congregationId=$cid, full data=$data',
          );
          if (cid != null && cid.isNotEmpty) {
            await user.getIdToken(true);
            debugPrint('AuthProvider: token refreshed after user doc confirmed');
            return UserModel(
              id: user.uid,
              name: data['name'] as String? ?? user.displayName ?? user.email ?? 'Usuário',
              email: data['email'] as String? ?? user.email,
              role: UserRole.values.firstWhere(
                (e) => e.name == data['role'],
                orElse: () => UserRole.conductor,
              ),
              congregationId: cid,
            );
          }
          await user.getIdToken(true);
          debugPrint('AuthProvider: token refreshed (user doc has no congregationId)');
          return UserModel(
            id: user.uid,
            name: data['name'] as String? ?? user.displayName ?? user.email ?? 'Usuário',
            email: data['email'] as String? ?? user.email,
            role: UserRole.values.firstWhere(
              (e) => e.name == data['role'],
              orElse: () => UserRole.conductor,
            ),
            congregationId: defaultCongregationId,
          );
        }
      } catch (e, st) {
        debugPrint('AuthProvider._userFromFirebaseUser attempt ${attempt + 1} error: $e\n$st');
        // Fall through to retry or fallback
      }
      if (attempt < maxAttempts - 1) {
        await Future<void>.delayed(Duration(milliseconds: delayMs));
      }
    }
    return UserModel(
      id: user.uid,
      name: user.displayName ?? user.email ?? 'Usuário',
      email: user.email,
      role: UserRole.conductor,
      congregationId: defaultCongregationId,
    );
  }

  /// Demo mode: bypass auth for development when Firebase is not configured.
  void signInDemo() {
    state = AuthAuthenticated(
      UserModel(
        id: 'demo-user',
        name: 'Usuário Demo',
        role: UserRole.conductor,
        congregationId: defaultCongregationId,
      ),
    );
  }

  /// Demo mode as admin: bypass auth with admin role.
  void signInDemoAsAdmin() {
    state = AuthAuthenticated(
      UserModel(
        id: 'demo-admin',
        name: 'Administrador Demo',
        role: UserRole.admin,
        congregationId: defaultCongregationId,
      ),
    );
  }

  Future<void> signInWithEmail(String email, String password) async {
    await FirebaseAuth.instance.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() async {
    await FirebaseAuth.instance.signOut();
    state = AuthUnauthenticated();
  }
}
