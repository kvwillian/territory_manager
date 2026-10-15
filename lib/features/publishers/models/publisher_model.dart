enum CongregationPrivilege { publisher, ministerialServant, elder }

enum PioneerService { none, auxiliary, regular }

const privilegeLabels = {
  CongregationPrivilege.publisher: 'Publicador',
  CongregationPrivilege.ministerialServant: 'Servo ministerial',
  CongregationPrivilege.elder: 'Ancião',
};

const pioneerLabels = {
  PioneerService.none: 'Não é pioneiro',
  PioneerService.auxiliary: 'Pioneiro auxiliar',
  PioneerService.regular: 'Pioneiro regular',
};

CongregationPrivilege privilegeFromName(Object? value) {
  return CongregationPrivilege.values.firstWhere(
    (item) => item.name == value,
    orElse: () => CongregationPrivilege.publisher,
  );
}

PioneerService pioneerFromName(Object? value) {
  return PioneerService.values.firstWhere(
    (item) => item.name == value,
    orElse: () => PioneerService.none,
  );
}

class PublisherModel {
  const PublisherModel({
    required this.id,
    required this.name,
    required this.privilege,
    required this.pioneer,
    this.indicador = false,
    this.microfone = false,
    this.som = false,
    this.estudante = false,
    this.volante = false,
    this.needsElderlySupport = false,
    this.driver = false,
    this.congregationId,
    this.phone,
    this.email,
    this.groupId,
    this.userId,
    this.gender,
    this.age,
    this.status = 'active',
  });

  final String id;
  final String name;
  final CongregationPrivilege privilege;
  final PioneerService pioneer;
  final bool indicador;
  final bool microfone;
  final bool som;
  final bool estudante;
  final bool volante;
  final bool needsElderlySupport;
  final bool driver;
  final String? congregationId;
  final String? phone;
  final String? email;
  final String? groupId;
  final String? userId;
  final String? gender;
  final int? age;
  final String status;

  String get subtitle {
    if (pioneer == PioneerService.none) return privilegeLabels[privilege]!;
    return '${privilegeLabels[privilege]} · ${pioneerLabels[pioneer]}';
  }

  PublisherModel copyWith({
    String? id,
    String? name,
    CongregationPrivilege? privilege,
    PioneerService? pioneer,
    bool? indicador,
    bool? microfone,
    bool? som,
    bool? estudante,
    bool? volante,
    bool? needsElderlySupport,
    bool? driver,
    String? congregationId,
    String? phone,
    String? email,
    String? groupId,
    String? userId,
    String? gender,
    int? age,
    String? status,
  }) {
    return PublisherModel(
      id: id ?? this.id,
      name: name ?? this.name,
      privilege: privilege ?? this.privilege,
      pioneer: pioneer ?? this.pioneer,
      indicador: indicador ?? this.indicador,
      microfone: microfone ?? this.microfone,
      som: som ?? this.som,
      estudante: estudante ?? this.estudante,
      volante: volante ?? this.volante,
      needsElderlySupport: needsElderlySupport ?? this.needsElderlySupport,
      driver: driver ?? this.driver,
      congregationId: congregationId ?? this.congregationId,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      groupId: groupId ?? this.groupId,
      userId: userId ?? this.userId,
      gender: gender ?? this.gender,
      age: age ?? this.age,
      status: status ?? this.status,
    );
  }
}
