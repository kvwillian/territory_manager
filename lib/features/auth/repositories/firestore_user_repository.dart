import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/congregation_constants.dart';
import '../models/user_model.dart';
import 'user_repository.dart';

const _collection = 'users';

/// Firestore implementation of UserRepository.
class FirestoreUserRepository implements UserRepository {
  FirestoreUserRepository(this.congregationId);

  final String? congregationId;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _effectiveCongregationId =>
      congregationId ?? defaultCongregationId;

  @override
  Future<List<UserModel>> getUsers() async {
    final snapshot = await _firestore
        .collection(_collection)
        .where('congregationId', isEqualTo: _effectiveCongregationId)
        .get();
    return snapshot.docs.map((doc) => _docToUser(doc)).toList();
  }

  @override
  Future<UserModel?> getUserById(String id) async {
    final doc = await _firestore.collection(_collection).doc(id).get();
    if (!doc.exists || doc.data() == null) return null;
    final user = _docToUser(doc);
    final docCid = user.congregationId ?? defaultCongregationId;
    if (docCid != _effectiveCongregationId) return null;
    return user;
  }

  @override
  Future<UserModel> createUser({
    required String name,
    required String email,
    required UserRole role,
    String? congregationId,
  }) async {
    final docRef = _firestore.collection(_collection).doc();
    final id = docRef.id;
    final cid = congregationId ?? _effectiveCongregationId;

    final user = UserModel(
      id: id,
      name: name,
      role: role,
      email: email,
      congregationId: cid,
    );
    await docRef.set(user.toMap());

    return user;
  }

  @override
  Future<UserModel> updateUser(UserModel user) async {
    final docRef = _firestore.collection(_collection).doc(user.id);
    final doc = await docRef.get();
    if (!doc.exists) throw StateError('User not found');

    await docRef.update(user.toMap());

    return user;
  }

  @override
  Future<void> deleteUser(String id) async {
    await _firestore.collection(_collection).doc(id).delete();
  }

  UserModel _docToUser(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return UserModel(
      id: doc.id,
      name: data['name'] as String,
      role: UserRole.values.firstWhere(
        (e) => e.name == data['role'],
        orElse: () => UserRole.conductor,
      ),
      email: data['email'] as String?,
      congregationId: data['congregationId'] as String? ?? defaultCongregationId,
    );
  }
}
