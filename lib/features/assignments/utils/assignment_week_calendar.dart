import '../../meetings/models/preaching_session_model.dart';

/// Terça-feira do bloco Terça–Domingo que contém [date].
/// (O grid de designações não usa segunda-feira como primeiro dia.)
DateTime assignmentGridWeekStart(DateTime date) {
  final weekday = date.weekday;
  final daysFromTuesday = (weekday - DateTime.tuesday + 7) % 7;
  return DateTime(date.year, date.month, date.day - daysFromTuesday);
}

/// Domingo do mesmo bloco (inclusive).
DateTime assignmentGridWeekSunday(DateTime weekStartTuesday) {
  return weekStartTuesday.add(const Duration(days: 5));
}

/// Se [assignmentDay] (só data) cai no bloco Terça–[weekStartTuesday] … Domingo.
bool assignmentDateIsInGridWeek(
  DateTime assignmentDay,
  DateTime weekStartTuesday,
) {
  final start = DateTime(
    weekStartTuesday.year,
    weekStartTuesday.month,
    weekStartTuesday.day,
  );
  final end = assignmentGridWeekSunday(weekStartTuesday);
  final d = DateTime(assignmentDay.year, assignmentDay.month, assignmentDay.day);
  return !d.isBefore(start) && !d.isAfter(end);
}

/// Deslocamento desde [weekStartTuesday] para o dia da sessão (Terça=0 … Domingo=5).
int dayOffsetFromTuesdayWeekStart(DayOfWeek day) {
  switch (day) {
    case DayOfWeek.tuesday:
      return 0;
    case DayOfWeek.wednesday:
      return 1;
    case DayOfWeek.thursday:
      return 2;
    case DayOfWeek.friday:
      return 3;
    case DayOfWeek.saturday:
      return 4;
    case DayOfWeek.sunday:
      return 5;
  }
}
