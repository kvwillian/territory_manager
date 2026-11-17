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
    this.manageFlags = const [],
    this.publisherId,
    this.supervisedGroupId,
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
  final List<String> manageFlags;
  final String? publisherId;
  final String? supervisedGroupId;

  bool get isAdmin => role == UserRole.admin;
  bool get isConductor => role == UserRole.conductor;

  bool get canManageMeetings => isAdmin || manageFlags.contains('meetings');
  bool get canManagePublishers => isAdmin || manageFlags.contains('publishers');
  bool get canManageElderlySupport =>
      isAdmin || manageFlags.contains('elderlySupport');
  bool get isGroupSuperintendent =>
      supervisedGroupId != null && supervisedGroupId!.isNotEmpty;

  bool get hasFullPublishersAccess =>
      isAdmin ||
      canManagePublishers ||
      (accessFlags?.contains(AccessFlags.publishers) == true);

  bool canAccess(String flag) {
    if (isAdmin) return true;
    if (flag == AccessFlags.publishers &&
        (canManagePublishers || isGroupSuperintendent)) {
      return true;
    }
    if (flag == AccessFlags.meetings && canManageMeetings) {
      return true;
    }
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
    List<String>? manageFlags,
    String? publisherId,
    String? supervisedGroupId,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      role: role ?? this.role,
      email: email ?? this.email,
      congregationId: congregationId ?? this.congregationId,
      mustChangePassword: mustChangePassword ?? this.mustChangePassword,
      accessFlags: accessFlags ?? this.accessFlags,
      manageFlags: manageFlags ?? this.manageFlags,
      publisherId: publisherId ?? this.publisherId,
      supervisedGroupId: supervisedGroupId ?? this.supervisedGroupId,
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
      if (manageFlags.isNotEmpty) 'manageFlags': manageFlags,
      if (publisherId != null) 'publisherId': publisherId,
      if (supervisedGroupId != null) 'supervisedGroupId': supervisedGroupId,
    };
  }

  factory UserModel.fromMap(Map<String, dynamic> map) {
    final pubId = map['publisherId'];
    final supGroupId = map['supervisedGroupId'];
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
      manageFlags: _stringList(map['manageFlags']),
      publisherId: pubId is String && pubId.trim().isNotEmpty
          ? pubId.trim()
          : null,
      supervisedGroupId: supGroupId is String && supGroupId.trim().isNotEmpty
          ? supGroupId.trim()
          : null,
    );
  }
}

List<String> _stringList(Object? raw) {
  if (raw is! List) return const [];
  return raw.map((item) => item.toString()).toList();
}

List<String>? accessFlagsFromMap(Map<String, dynamic> map) {
  if (!map.containsKey('accessFlags')) return null;
  final raw = map['accessFlags'];
  if (raw is! List) return [];
  return raw.map((item) => item.toString()).toList();
}
