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
    this.congregationId,
  });

  final String id;
  final String name;
  final CongregationPrivilege privilege;
  final PioneerService pioneer;
  final bool indicador;
  final bool microfone;
  final bool som;
  final String? congregationId;

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
    String? congregationId,
  }) {
    return PublisherModel(
      id: id ?? this.id,
      name: name ?? this.name,
      privilege: privilege ?? this.privilege,
      pioneer: pioneer ?? this.pioneer,
      indicador: indicador ?? this.indicador,
      microfone: microfone ?? this.microfone,
      som: som ?? this.som,
      congregationId: congregationId ?? this.congregationId,
    );
  }
}
