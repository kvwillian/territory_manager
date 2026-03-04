import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../admin/data/mock_user_repository.dart';
import '../../auth/models/user_model.dart';

final usersProvider = FutureProvider<List<UserModel>>((ref) async {
  final repo = ref.watch(userRepositoryProvider);
  return repo.getUsers();
});
