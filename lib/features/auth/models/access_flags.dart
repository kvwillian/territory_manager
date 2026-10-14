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
