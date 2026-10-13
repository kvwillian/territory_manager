import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/current_congregation_provider.dart';
import '../models/congregation_model.dart';
import '../repositories/congregation_repository.dart';
import '../repositories/firestore_congregation_repository.dart';

final congregationRepositoryProvider = Provider<CongregationRepository>((ref) {
  final authState = ref.watch(authStateProvider);
  final useFirestore = Firebase.apps.isNotEmpty &&
      authState is AuthAuthenticated &&
      authState.user.id != 'demo-user' &&
      authState.user.id != 'demo-admin';
  if (useFirestore) {
    return FirestoreCongregationRepository();
  }
  return MockCongregationRepository();
});

final congregationProvider = FutureProvider<CongregationModel?>((ref) async {
  final id = ref.watch(currentCongregationProvider);
  if (id == null || id.isEmpty) return null;
  return ref.watch(congregationRepositoryProvider).getCongregationById(id);
});

class MockCongregationRepository implements CongregationRepository {
  CongregationModel _item = const CongregationModel(
    id: 'default',
    name: 'Congregação demo',
    city: 'Cidade',
    country: 'Brasil',
    midweekWeekday: DateTime.thursday,
    midweekTime: '19:30',
    weekendWeekday: DateTime.sunday,
    weekendTime: '10:00',
  );

  @override
  Future<CongregationModel?> getCongregationById(String id) async {
    if (_item.id != id) return null;
    return _item;
  }

  @override
  Future<CongregationModel> createCongregation(
    CongregationModel congregation,
  ) async {
    _item = congregation;
    return _item;
  }

  @override
  Future<void> saveMeetingSchedule({
    required String id,
    required int midweekWeekday,
    required String midweekTime,
    required int weekendWeekday,
    required String weekendTime,
  }) async {
    _item = _item.copyWith(
      id: id,
      midweekWeekday: midweekWeekday,
      midweekTime: midweekTime,
      weekendWeekday: weekendWeekday,
      weekendTime: weekendTime,
    );
  }
}
