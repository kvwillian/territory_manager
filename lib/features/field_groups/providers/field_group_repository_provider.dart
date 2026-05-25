import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../models/field_group_model.dart';
import '../repositories/field_group_repository.dart';
import '../repositories/firestore_field_group_repository.dart';

final fieldGroupsProvider =
    FutureProvider.autoDispose<List<FieldGroupModel>>((ref) async {
  final repo = ref.watch(fieldGroupRepositoryProvider);
  return repo.getFieldGroups();
});

final fieldGroupRepositoryProvider = Provider<FieldGroupRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore) {
    return FirestoreFieldGroupRepository(
      ref.watch(currentCongregationProvider),
    );
  }
  return MockFieldGroupRepository();
});

class MockFieldGroupRepository implements FieldGroupRepository {
  final List<FieldGroupModel> _groups = [];

  @override
  Future<List<FieldGroupModel>> getFieldGroups() async =>
      List.from(_groups);

  @override
  Future<FieldGroupModel?> getFieldGroupById(String id) async {
    try {
      return _groups.firstWhere((g) => g.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<FieldGroupModel> createFieldGroup(FieldGroupModel group) async {
    final id = 'fg${DateTime.now().millisecondsSinceEpoch}';
    final created = group.copyWith(id: id);
    _groups.add(created);
    return created;
  }

  @override
  Future<void> updateFieldGroup(FieldGroupModel group) async {
    final i = _groups.indexWhere((g) => g.id == group.id);
    if (i >= 0) _groups[i] = group;
  }

  @override
  Future<void> deleteFieldGroup(String id) async {
    _groups.removeWhere((g) => g.id == id);
  }
}
