import 'access_flags.dart';

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
    this.mustChangePassword = false,
    this.accessFlags,
  });

  final String id;
  final String name;
  final UserRole role;
  final String? email;
  final String? congregationId;
  final bool mustChangePassword;

  /// Null means the account still uses the previous default:
  /// administrators see every module, other people see territories.
  final List<String>? accessFlags;

  bool get isAdmin => role == UserRole.admin;
  bool get isConductor => role == UserRole.conductor;

  bool canAccess(String flag) {
    if (isAdmin) return true;
    final flags = accessFlags;
    if (flags == null) return flag == AccessFlags.territories;
    return flags.contains(flag);
  }

  UserModel copyWith({
    String? id,
    String? name,
    UserRole? role,
    String? email,
    String? congregationId,
    bool? mustChangePassword,
    List<String>? accessFlags,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      role: role ?? this.role,
      email: email ?? this.email,
      congregationId: congregationId ?? this.congregationId,
      mustChangePassword: mustChangePassword ?? this.mustChangePassword,
      accessFlags: accessFlags ?? this.accessFlags,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'role': role.name,
      'email': email,
      'congregationId': congregationId,
      'mustChangePassword': mustChangePassword,
      if (accessFlags != null) 'accessFlags': accessFlags,
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
      mustChangePassword: map['mustChangePassword'] == true,
      accessFlags: accessFlagsFromMap(map),
    );
  }
}

List<String>? accessFlagsFromMap(Map<String, dynamic> map) {
  if (!map.containsKey('accessFlags')) return null;
  final raw = map['accessFlags'];
  if (raw is! List) return [];
  return raw.map((item) => item.toString()).toList();
}
