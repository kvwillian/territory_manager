import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/mock_user_repository.dart';
import '../../auth/models/user_model.dart';

final usersProvider = FutureProvider.autoDispose<List<UserModel>>((ref) async {
  final repo = ref.watch(userRepositoryProvider);
  try {
    return await repo.getUsers();
  } catch (e) {
    debugPrint('usersProvider.getUsers error: $e');
    rethrow;
  }
});
