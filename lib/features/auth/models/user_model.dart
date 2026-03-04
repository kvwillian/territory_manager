/// User role in the system.
enum UserRole {
  admin,
  conductor,
}

/// User model.
class UserModel {
  const UserModel({
    required this.id,
    required this.name,
    required this.role,
    this.email,
    this.congregationId,
  });

  final String id;
  final String name;
  final UserRole role;
  final String? email;
  final String? congregationId;

  bool get isAdmin => role == UserRole.admin;
  bool get isConductor => role == UserRole.conductor;

  UserModel copyWith({
    String? id,
    String? name,
    UserRole? role,
    String? email,
    String? congregationId,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      role: role ?? this.role,
      email: email ?? this.email,
      congregationId: congregationId ?? this.congregationId,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'role': role.name,
      'email': email,
      'congregationId': congregationId,
    };
  }

  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      id: map['id'] as String,
      name: map['name'] as String,
      role: UserRole.values.firstWhere(
        (e) => e.name == map['role'],
        orElse: () => UserRole.conductor,
      ),
      email: map['email'] as String?,
      congregationId: map['congregationId'] as String?,
    );
  }
}
