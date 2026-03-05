import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'app_database.g.dart';

class Territories extends Table {
  TextColumn get id => text()();
  TextColumn get congregationId => text().nullable()();
  TextColumn get json => text()();
  DateTimeColumn get lastUpdatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class Segments extends Table {
  TextColumn get id => text()();
  TextColumn get territoryId => text()();
  TextColumn get congregationId => text().nullable()();
  TextColumn get json => text()();
  DateTimeColumn get lastUpdatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class MeetingLocations extends Table {
  TextColumn get id => text()();
  TextColumn get congregationId => text().nullable()();
  TextColumn get json => text()();
  DateTimeColumn get lastUpdatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class PreachingSessions extends Table {
  TextColumn get id => text()();
  TextColumn get congregationId => text().nullable()();
  TextColumn get json => text()();
  DateTimeColumn get lastUpdatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class Assignments extends Table {
  TextColumn get id => text()();
  TextColumn get congregationId => text().nullable()();
  TextColumn get json => text()();
  DateTimeColumn get lastUpdatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class SyncQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get operationType => text()();
  TextColumn get payload => text()();
  DateTimeColumn get timestamp => dateTime()();
}

@DriftDatabase(tables: [
  Territories,
  Segments,
  MeetingLocations,
  PreachingSessions,
  Assignments,
  SyncQueue,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration {
    final db = this;
    return MigrationStrategy(
      onUpgrade: (migrator, from, to) async {
        if (from < 2) {
          // Create assignments table (matches Drift schema: id, congregation_id, json, last_updated_at)
          await db.customStatement(
            'CREATE TABLE IF NOT EXISTS assignments ('
            'id TEXT NOT NULL PRIMARY KEY, '
            'congregation_id TEXT, '
            'json TEXT NOT NULL, '
            'last_updated_at INTEGER NOT NULL)',
          );
        }
      },
    );
  }

  static LazyDatabase _openConnection() {
    return LazyDatabase(() async {
      final dbFolder = await getApplicationDocumentsDirectory();
      final file = File(p.join(dbFolder.path, 'territory_manager.db'));
      return NativeDatabase.createInBackground(file);
    });
  }
}
