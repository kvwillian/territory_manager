import 'package:flutter/material.dart';

import '../../../core/constants/app_colors.dart';

enum AgendaKind { program, upcoming, important }

class AgendaItem {
  const AgendaItem({
    required this.date,
    required this.time,
    required this.title,
    required this.place,
    required this.icon,
    required this.accent,
    required this.kind,
    this.person,
    this.badge,
  });

  final DateTime date;
  final String time;
  final String title;
  final String place;
  final String? person;
  final IconData icon;
  final Color accent;
  final AgendaKind kind;
  final String? badge;
}

/// Sample week used until the agenda is stored for each congregation.
class AgendaMock {
  static DateTime _day(DateTime value) =>
      DateTime(value.year, value.month, value.day);

  static DateTime _nextWeekday(DateTime from, int weekday) {
    final start = _day(from);
    var cursor = start;
    while (cursor.weekday != weekday) {
      cursor = cursor.add(const Duration(days: 1));
    }
    return cursor;
  }

  static List<AgendaItem> programFor(DateTime day) {
    final date = _day(day);
    if (date.weekday == DateTime.wednesday) {
      return [
        AgendaItem(
          date: date,
          time: '19:00',
          title: 'Reunião Vida e Ministério',
          place: 'Salão do Reino · Presencial',
          icon: Icons.calendar_month_outlined,
          accent: AppColors.richViolet,
          kind: AgendaKind.program,
          badge: _isToday(date) ? 'Hoje' : null,
        ),
        AgendaItem(
          date: date,
          time: '19:45',
          title: 'Estudo Bíblico de Congregação',
          place: 'Salão principal',
          icon: Icons.menu_book_outlined,
          accent: AppColors.cyanAccent,
          kind: AgendaKind.program,
        ),
        AgendaItem(
          date: date,
          time: '20:30',
          title: 'Designação de leitura',
          place: 'Responsável: Marcos Oliveira',
          icon: Icons.mic_none_outlined,
          accent: AppColors.emerald,
          kind: AgendaKind.program,
          badge: 'Designado',
        ),
      ];
    }
    if (date.weekday == DateTime.saturday) {
      return [
        AgendaItem(
          date: date,
          time: '08:30',
          title: 'Saída de campo',
          place: 'Ponto de encontro: Salão do Reino',
          person: 'Grupo Central',
          icon: Icons.place_outlined,
          accent: AppColors.richViolet,
          kind: AgendaKind.program,
          badge: _isToday(date) ? 'Hoje' : null,
        ),
      ];
    }
    if (date.weekday == DateTime.sunday) {
      return [
        AgendaItem(
          date: date,
          time: '10:00',
          title: 'Reunião do fim de semana',
          place: 'Salão do Reino · Presencial',
          icon: Icons.event_outlined,
          accent: AppColors.cyanAccent,
          kind: AgendaKind.program,
          badge: _isToday(date) ? 'Hoje' : null,
        ),
      ];
    }
    return const [];
  }

  static List<AgendaItem> upcomingFrom(DateTime day) {
    final start = _day(day).add(const Duration(days: 1));
    final saturday = _nextWeekday(start, DateTime.saturday);
    return [
      AgendaItem(
        date: saturday,
        time: '08:30',
        title: 'Saída de campo',
        place: 'Ponto de encontro: Salão do Reino',
        person: 'Grupo Central',
        icon: Icons.groups_outlined,
        accent: AppColors.richViolet,
        kind: AgendaKind.upcoming,
      ),
    ];
  }

  static List<AgendaItem> importantFrom(DateTime day) {
    final start = _day(day);
    var assembly = DateTime(start.year, start.month, 25);
    if (!assembly.isAfter(start)) {
      assembly = DateTime(start.year, start.month + 1, 25);
    }
    while (assembly.weekday != DateTime.sunday) {
      assembly = assembly.add(const Duration(days: 1));
    }
    return [
      AgendaItem(
        date: assembly,
        time: '',
        title: 'Assembleia de Circuito',
        place: 'Salão de Convenções',
        icon: Icons.groups_outlined,
        accent: AppColors.cyanAccent,
        kind: AgendaKind.important,
      ),
    ];
  }

  static Color? markerFor(DateTime day) {
    return switch (day.weekday) {
      DateTime.wednesday => AppColors.richViolet,
      DateTime.saturday => AppColors.emerald,
      DateTime.sunday => AppColors.cyanAccent,
      _ => null,
    };
  }

  static bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }
}
