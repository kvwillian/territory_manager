/// Modules a user may open from the congregation home.
class AccessFlags {
  static const territories = 'territories';
  static const publishers = 'publishers';
  static const meetings = 'meetings';
  static const reports = 'reports';

  static const all = [
    territories,
    publishers,
    meetings,
    reports,
  ];

  static const labels = {
    territories: 'Territórios',
    publishers: 'Publicadores',
    meetings: 'Reuniões',
    reports: 'Relatórios',
  };
}

/// Modules a non-admin user may manage (create/edit/publish).
class ManageFlags {
  static const meetings = 'meetings';
  static const publishers = 'publishers';
  static const elderlySupport = 'elderlySupport';

  static const all = [
    meetings,
    publishers,
    elderlySupport,
  ];

  static const labels = {
    meetings: 'Gerenciar reuniões e escalas',
    publishers: 'Gerenciar publicadores e grupos',
    elderlySupport: 'Gerenciar suporte a idosos',
  };
}
