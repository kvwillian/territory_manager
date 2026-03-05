// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $TerritoriesTable extends Territories
    with TableInfo<$TerritoriesTable, Territory> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TerritoriesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _congregationIdMeta = const VerificationMeta(
    'congregationId',
  );
  @override
  late final GeneratedColumn<String> congregationId = GeneratedColumn<String>(
    'congregation_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _jsonMeta = const VerificationMeta('json');
  @override
  late final GeneratedColumn<String> json = GeneratedColumn<String>(
    'json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _lastUpdatedAtMeta = const VerificationMeta(
    'lastUpdatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastUpdatedAt =
      GeneratedColumn<DateTime>(
        'last_updated_at',
        aliasedName,
        false,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: true,
      );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    congregationId,
    json,
    lastUpdatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'territories';
  @override
  VerificationContext validateIntegrity(
    Insertable<Territory> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('congregation_id')) {
      context.handle(
        _congregationIdMeta,
        congregationId.isAcceptableOrUnknown(
          data['congregation_id']!,
          _congregationIdMeta,
        ),
      );
    }
    if (data.containsKey('json')) {
      context.handle(
        _jsonMeta,
        json.isAcceptableOrUnknown(data['json']!, _jsonMeta),
      );
    } else if (isInserting) {
      context.missing(_jsonMeta);
    }
    if (data.containsKey('last_updated_at')) {
      context.handle(
        _lastUpdatedAtMeta,
        lastUpdatedAt.isAcceptableOrUnknown(
          data['last_updated_at']!,
          _lastUpdatedAtMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_lastUpdatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Territory map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Territory(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      congregationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}congregation_id'],
      ),
      json: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}json'],
      )!,
      lastUpdatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_updated_at'],
      )!,
    );
  }

  @override
  $TerritoriesTable createAlias(String alias) {
    return $TerritoriesTable(attachedDatabase, alias);
  }
}

class Territory extends DataClass implements Insertable<Territory> {
  final String id;
  final String? congregationId;
  final String json;
  final DateTime lastUpdatedAt;
  const Territory({
    required this.id,
    this.congregationId,
    required this.json,
    required this.lastUpdatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || congregationId != null) {
      map['congregation_id'] = Variable<String>(congregationId);
    }
    map['json'] = Variable<String>(json);
    map['last_updated_at'] = Variable<DateTime>(lastUpdatedAt);
    return map;
  }

  TerritoriesCompanion toCompanion(bool nullToAbsent) {
    return TerritoriesCompanion(
      id: Value(id),
      congregationId: congregationId == null && nullToAbsent
          ? const Value.absent()
          : Value(congregationId),
      json: Value(json),
      lastUpdatedAt: Value(lastUpdatedAt),
    );
  }

  factory Territory.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Territory(
      id: serializer.fromJson<String>(json['id']),
      congregationId: serializer.fromJson<String?>(json['congregationId']),
      json: serializer.fromJson<String>(json['json']),
      lastUpdatedAt: serializer.fromJson<DateTime>(json['lastUpdatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'congregationId': serializer.toJson<String?>(congregationId),
      'json': serializer.toJson<String>(json),
      'lastUpdatedAt': serializer.toJson<DateTime>(lastUpdatedAt),
    };
  }

  Territory copyWith({
    String? id,
    Value<String?> congregationId = const Value.absent(),
    String? json,
    DateTime? lastUpdatedAt,
  }) => Territory(
    id: id ?? this.id,
    congregationId: congregationId.present
        ? congregationId.value
        : this.congregationId,
    json: json ?? this.json,
    lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
  );
  Territory copyWithCompanion(TerritoriesCompanion data) {
    return Territory(
      id: data.id.present ? data.id.value : this.id,
      congregationId: data.congregationId.present
          ? data.congregationId.value
          : this.congregationId,
      json: data.json.present ? data.json.value : this.json,
      lastUpdatedAt: data.lastUpdatedAt.present
          ? data.lastUpdatedAt.value
          : this.lastUpdatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Territory(')
          ..write('id: $id, ')
          ..write('congregationId: $congregationId, ')
          ..write('json: $json, ')
          ..write('lastUpdatedAt: $lastUpdatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, congregationId, json, lastUpdatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Territory &&
          other.id == this.id &&
          other.congregationId == this.congregationId &&
          other.json == this.json &&
          other.lastUpdatedAt == this.lastUpdatedAt);
}

class TerritoriesCompanion extends UpdateCompanion<Territory> {
  final Value<String> id;
  final Value<String?> congregationId;
  final Value<String> json;
  final Value<DateTime> lastUpdatedAt;
  final Value<int> rowid;
  const TerritoriesCompanion({
    this.id = const Value.absent(),
    this.congregationId = const Value.absent(),
    this.json = const Value.absent(),
    this.lastUpdatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  TerritoriesCompanion.insert({
    required String id,
    this.congregationId = const Value.absent(),
    required String json,
    required DateTime lastUpdatedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       json = Value(json),
       lastUpdatedAt = Value(lastUpdatedAt);
  static Insertable<Territory> custom({
    Expression<String>? id,
    Expression<String>? congregationId,
    Expression<String>? json,
    Expression<DateTime>? lastUpdatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (congregationId != null) 'congregation_id': congregationId,
      if (json != null) 'json': json,
      if (lastUpdatedAt != null) 'last_updated_at': lastUpdatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  TerritoriesCompanion copyWith({
    Value<String>? id,
    Value<String?>? congregationId,
    Value<String>? json,
    Value<DateTime>? lastUpdatedAt,
    Value<int>? rowid,
  }) {
    return TerritoriesCompanion(
      id: id ?? this.id,
      congregationId: congregationId ?? this.congregationId,
      json: json ?? this.json,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (congregationId.present) {
      map['congregation_id'] = Variable<String>(congregationId.value);
    }
    if (json.present) {
      map['json'] = Variable<String>(json.value);
    }
    if (lastUpdatedAt.present) {
      map['last_updated_at'] = Variable<DateTime>(lastUpdatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TerritoriesCompanion(')
          ..write('id: $id, ')
          ..write('congregationId: $congregationId, ')
          ..write('json: $json, ')
          ..write('lastUpdatedAt: $lastUpdatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SegmentsTable extends Segments with TableInfo<$SegmentsTable, Segment> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SegmentsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _territoryIdMeta = const VerificationMeta(
    'territoryId',
  );
  @override
  late final GeneratedColumn<String> territoryId = GeneratedColumn<String>(
    'territory_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _congregationIdMeta = const VerificationMeta(
    'congregationId',
  );
  @override
  late final GeneratedColumn<String> congregationId = GeneratedColumn<String>(
    'congregation_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _jsonMeta = const VerificationMeta('json');
  @override
  late final GeneratedColumn<String> json = GeneratedColumn<String>(
    'json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _lastUpdatedAtMeta = const VerificationMeta(
    'lastUpdatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastUpdatedAt =
      GeneratedColumn<DateTime>(
        'last_updated_at',
        aliasedName,
        false,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: true,
      );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    territoryId,
    congregationId,
    json,
    lastUpdatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'segments';
  @override
  VerificationContext validateIntegrity(
    Insertable<Segment> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('territory_id')) {
      context.handle(
        _territoryIdMeta,
        territoryId.isAcceptableOrUnknown(
          data['territory_id']!,
          _territoryIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_territoryIdMeta);
    }
    if (data.containsKey('congregation_id')) {
      context.handle(
        _congregationIdMeta,
        congregationId.isAcceptableOrUnknown(
          data['congregation_id']!,
          _congregationIdMeta,
        ),
      );
    }
    if (data.containsKey('json')) {
      context.handle(
        _jsonMeta,
        json.isAcceptableOrUnknown(data['json']!, _jsonMeta),
      );
    } else if (isInserting) {
      context.missing(_jsonMeta);
    }
    if (data.containsKey('last_updated_at')) {
      context.handle(
        _lastUpdatedAtMeta,
        lastUpdatedAt.isAcceptableOrUnknown(
          data['last_updated_at']!,
          _lastUpdatedAtMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_lastUpdatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Segment map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Segment(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      territoryId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}territory_id'],
      )!,
      congregationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}congregation_id'],
      ),
      json: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}json'],
      )!,
      lastUpdatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_updated_at'],
      )!,
    );
  }

  @override
  $SegmentsTable createAlias(String alias) {
    return $SegmentsTable(attachedDatabase, alias);
  }
}

class Segment extends DataClass implements Insertable<Segment> {
  final String id;
  final String territoryId;
  final String? congregationId;
  final String json;
  final DateTime lastUpdatedAt;
  const Segment({
    required this.id,
    required this.territoryId,
    this.congregationId,
    required this.json,
    required this.lastUpdatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['territory_id'] = Variable<String>(territoryId);
    if (!nullToAbsent || congregationId != null) {
      map['congregation_id'] = Variable<String>(congregationId);
    }
    map['json'] = Variable<String>(json);
    map['last_updated_at'] = Variable<DateTime>(lastUpdatedAt);
    return map;
  }

  SegmentsCompanion toCompanion(bool nullToAbsent) {
    return SegmentsCompanion(
      id: Value(id),
      territoryId: Value(territoryId),
      congregationId: congregationId == null && nullToAbsent
          ? const Value.absent()
          : Value(congregationId),
      json: Value(json),
      lastUpdatedAt: Value(lastUpdatedAt),
    );
  }

  factory Segment.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Segment(
      id: serializer.fromJson<String>(json['id']),
      territoryId: serializer.fromJson<String>(json['territoryId']),
      congregationId: serializer.fromJson<String?>(json['congregationId']),
      json: serializer.fromJson<String>(json['json']),
      lastUpdatedAt: serializer.fromJson<DateTime>(json['lastUpdatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'territoryId': serializer.toJson<String>(territoryId),
      'congregationId': serializer.toJson<String?>(congregationId),
      'json': serializer.toJson<String>(json),
      'lastUpdatedAt': serializer.toJson<DateTime>(lastUpdatedAt),
    };
  }

  Segment copyWith({
    String? id,
    String? territoryId,
    Value<String?> congregationId = const Value.absent(),
    String? json,
    DateTime? lastUpdatedAt,
  }) => Segment(
    id: id ?? this.id,
    territoryId: territoryId ?? this.territoryId,
    congregationId: congregationId.present
        ? congregationId.value
        : this.congregationId,
    json: json ?? this.json,
    lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
  );
  Segment copyWithCompanion(SegmentsCompanion data) {
    return Segment(
      id: data.id.present ? data.id.value : this.id,
      territoryId: data.territoryId.present
          ? data.territoryId.value
          : this.territoryId,
      congregationId: data.congregationId.present
          ? data.congregationId.value
          : this.congregationId,
      json: data.json.present ? data.json.value : this.json,
      lastUpdatedAt: data.lastUpdatedAt.present
          ? data.lastUpdatedAt.value
          : this.lastUpdatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Segment(')
          ..write('id: $id, ')
          ..write('territoryId: $territoryId, ')
          ..write('congregationId: $congregationId, ')
          ..write('json: $json, ')
          ..write('lastUpdatedAt: $lastUpdatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, territoryId, congregationId, json, lastUpdatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Segment &&
          other.id == this.id &&
          other.territoryId == this.territoryId &&
          other.congregationId == this.congregationId &&
          other.json == this.json &&
          other.lastUpdatedAt == this.lastUpdatedAt);
}

class SegmentsCompanion extends UpdateCompanion<Segment> {
  final Value<String> id;
  final Value<String> territoryId;
  final Value<String?> congregationId;
  final Value<String> json;
  final Value<DateTime> lastUpdatedAt;
  final Value<int> rowid;
  const SegmentsCompanion({
    this.id = const Value.absent(),
    this.territoryId = const Value.absent(),
    this.congregationId = const Value.absent(),
    this.json = const Value.absent(),
    this.lastUpdatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SegmentsCompanion.insert({
    required String id,
    required String territoryId,
    this.congregationId = const Value.absent(),
    required String json,
    required DateTime lastUpdatedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       territoryId = Value(territoryId),
       json = Value(json),
       lastUpdatedAt = Value(lastUpdatedAt);
  static Insertable<Segment> custom({
    Expression<String>? id,
    Expression<String>? territoryId,
    Expression<String>? congregationId,
    Expression<String>? json,
    Expression<DateTime>? lastUpdatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (territoryId != null) 'territory_id': territoryId,
      if (congregationId != null) 'congregation_id': congregationId,
      if (json != null) 'json': json,
      if (lastUpdatedAt != null) 'last_updated_at': lastUpdatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SegmentsCompanion copyWith({
    Value<String>? id,
    Value<String>? territoryId,
    Value<String?>? congregationId,
    Value<String>? json,
    Value<DateTime>? lastUpdatedAt,
    Value<int>? rowid,
  }) {
    return SegmentsCompanion(
      id: id ?? this.id,
      territoryId: territoryId ?? this.territoryId,
      congregationId: congregationId ?? this.congregationId,
      json: json ?? this.json,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (territoryId.present) {
      map['territory_id'] = Variable<String>(territoryId.value);
    }
    if (congregationId.present) {
      map['congregation_id'] = Variable<String>(congregationId.value);
    }
    if (json.present) {
      map['json'] = Variable<String>(json.value);
    }
    if (lastUpdatedAt.present) {
      map['last_updated_at'] = Variable<DateTime>(lastUpdatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SegmentsCompanion(')
          ..write('id: $id, ')
          ..write('territoryId: $territoryId, ')
          ..write('congregationId: $congregationId, ')
          ..write('json: $json, ')
          ..write('lastUpdatedAt: $lastUpdatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $MeetingLocationsTable extends MeetingLocations
    with TableInfo<$MeetingLocationsTable, MeetingLocation> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $MeetingLocationsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _congregationIdMeta = const VerificationMeta(
    'congregationId',
  );
  @override
  late final GeneratedColumn<String> congregationId = GeneratedColumn<String>(
    'congregation_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _jsonMeta = const VerificationMeta('json');
  @override
  late final GeneratedColumn<String> json = GeneratedColumn<String>(
    'json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _lastUpdatedAtMeta = const VerificationMeta(
    'lastUpdatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastUpdatedAt =
      GeneratedColumn<DateTime>(
        'last_updated_at',
        aliasedName,
        false,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: true,
      );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    congregationId,
    json,
    lastUpdatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'meeting_locations';
  @override
  VerificationContext validateIntegrity(
    Insertable<MeetingLocation> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('congregation_id')) {
      context.handle(
        _congregationIdMeta,
        congregationId.isAcceptableOrUnknown(
          data['congregation_id']!,
          _congregationIdMeta,
        ),
      );
    }
    if (data.containsKey('json')) {
      context.handle(
        _jsonMeta,
        json.isAcceptableOrUnknown(data['json']!, _jsonMeta),
      );
    } else if (isInserting) {
      context.missing(_jsonMeta);
    }
    if (data.containsKey('last_updated_at')) {
      context.handle(
        _lastUpdatedAtMeta,
        lastUpdatedAt.isAcceptableOrUnknown(
          data['last_updated_at']!,
          _lastUpdatedAtMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_lastUpdatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  MeetingLocation map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MeetingLocation(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      congregationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}congregation_id'],
      ),
      json: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}json'],
      )!,
      lastUpdatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_updated_at'],
      )!,
    );
  }

  @override
  $MeetingLocationsTable createAlias(String alias) {
    return $MeetingLocationsTable(attachedDatabase, alias);
  }
}

class MeetingLocation extends DataClass implements Insertable<MeetingLocation> {
  final String id;
  final String? congregationId;
  final String json;
  final DateTime lastUpdatedAt;
  const MeetingLocation({
    required this.id,
    this.congregationId,
    required this.json,
    required this.lastUpdatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || congregationId != null) {
      map['congregation_id'] = Variable<String>(congregationId);
    }
    map['json'] = Variable<String>(json);
    map['last_updated_at'] = Variable<DateTime>(lastUpdatedAt);
    return map;
  }

  MeetingLocationsCompanion toCompanion(bool nullToAbsent) {
    return MeetingLocationsCompanion(
      id: Value(id),
      congregationId: congregationId == null && nullToAbsent
          ? const Value.absent()
          : Value(congregationId),
      json: Value(json),
      lastUpdatedAt: Value(lastUpdatedAt),
    );
  }

  factory MeetingLocation.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MeetingLocation(
      id: serializer.fromJson<String>(json['id']),
      congregationId: serializer.fromJson<String?>(json['congregationId']),
      json: serializer.fromJson<String>(json['json']),
      lastUpdatedAt: serializer.fromJson<DateTime>(json['lastUpdatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'congregationId': serializer.toJson<String?>(congregationId),
      'json': serializer.toJson<String>(json),
      'lastUpdatedAt': serializer.toJson<DateTime>(lastUpdatedAt),
    };
  }

  MeetingLocation copyWith({
    String? id,
    Value<String?> congregationId = const Value.absent(),
    String? json,
    DateTime? lastUpdatedAt,
  }) => MeetingLocation(
    id: id ?? this.id,
    congregationId: congregationId.present
        ? congregationId.value
        : this.congregationId,
    json: json ?? this.json,
    lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
  );
  MeetingLocation copyWithCompanion(MeetingLocationsCompanion data) {
    return MeetingLocation(
      id: data.id.present ? data.id.value : this.id,
      congregationId: data.congregationId.present
          ? data.congregationId.value
          : this.congregationId,
      json: data.json.present ? data.json.value : this.json,
      lastUpdatedAt: data.lastUpdatedAt.present
          ? data.lastUpdatedAt.value
          : this.lastUpdatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MeetingLocation(')
          ..write('id: $id, ')
          ..write('congregationId: $congregationId, ')
          ..write('json: $json, ')
          ..write('lastUpdatedAt: $lastUpdatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, congregationId, json, lastUpdatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MeetingLocation &&
          other.id == this.id &&
          other.congregationId == this.congregationId &&
          other.json == this.json &&
          other.lastUpdatedAt == this.lastUpdatedAt);
}

class MeetingLocationsCompanion extends UpdateCompanion<MeetingLocation> {
  final Value<String> id;
  final Value<String?> congregationId;
  final Value<String> json;
  final Value<DateTime> lastUpdatedAt;
  final Value<int> rowid;
  const MeetingLocationsCompanion({
    this.id = const Value.absent(),
    this.congregationId = const Value.absent(),
    this.json = const Value.absent(),
    this.lastUpdatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  MeetingLocationsCompanion.insert({
    required String id,
    this.congregationId = const Value.absent(),
    required String json,
    required DateTime lastUpdatedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       json = Value(json),
       lastUpdatedAt = Value(lastUpdatedAt);
  static Insertable<MeetingLocation> custom({
    Expression<String>? id,
    Expression<String>? congregationId,
    Expression<String>? json,
    Expression<DateTime>? lastUpdatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (congregationId != null) 'congregation_id': congregationId,
      if (json != null) 'json': json,
      if (lastUpdatedAt != null) 'last_updated_at': lastUpdatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  MeetingLocationsCompanion copyWith({
    Value<String>? id,
    Value<String?>? congregationId,
    Value<String>? json,
    Value<DateTime>? lastUpdatedAt,
    Value<int>? rowid,
  }) {
    return MeetingLocationsCompanion(
      id: id ?? this.id,
      congregationId: congregationId ?? this.congregationId,
      json: json ?? this.json,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (congregationId.present) {
      map['congregation_id'] = Variable<String>(congregationId.value);
    }
    if (json.present) {
      map['json'] = Variable<String>(json.value);
    }
    if (lastUpdatedAt.present) {
      map['last_updated_at'] = Variable<DateTime>(lastUpdatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('MeetingLocationsCompanion(')
          ..write('id: $id, ')
          ..write('congregationId: $congregationId, ')
          ..write('json: $json, ')
          ..write('lastUpdatedAt: $lastUpdatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $PreachingSessionsTable extends PreachingSessions
    with TableInfo<$PreachingSessionsTable, PreachingSession> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PreachingSessionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _congregationIdMeta = const VerificationMeta(
    'congregationId',
  );
  @override
  late final GeneratedColumn<String> congregationId = GeneratedColumn<String>(
    'congregation_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _jsonMeta = const VerificationMeta('json');
  @override
  late final GeneratedColumn<String> json = GeneratedColumn<String>(
    'json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _lastUpdatedAtMeta = const VerificationMeta(
    'lastUpdatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastUpdatedAt =
      GeneratedColumn<DateTime>(
        'last_updated_at',
        aliasedName,
        false,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: true,
      );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    congregationId,
    json,
    lastUpdatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'preaching_sessions';
  @override
  VerificationContext validateIntegrity(
    Insertable<PreachingSession> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('congregation_id')) {
      context.handle(
        _congregationIdMeta,
        congregationId.isAcceptableOrUnknown(
          data['congregation_id']!,
          _congregationIdMeta,
        ),
      );
    }
    if (data.containsKey('json')) {
      context.handle(
        _jsonMeta,
        json.isAcceptableOrUnknown(data['json']!, _jsonMeta),
      );
    } else if (isInserting) {
      context.missing(_jsonMeta);
    }
    if (data.containsKey('last_updated_at')) {
      context.handle(
        _lastUpdatedAtMeta,
        lastUpdatedAt.isAcceptableOrUnknown(
          data['last_updated_at']!,
          _lastUpdatedAtMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_lastUpdatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PreachingSession map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PreachingSession(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      congregationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}congregation_id'],
      ),
      json: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}json'],
      )!,
      lastUpdatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_updated_at'],
      )!,
    );
  }

  @override
  $PreachingSessionsTable createAlias(String alias) {
    return $PreachingSessionsTable(attachedDatabase, alias);
  }
}

class PreachingSession extends DataClass
    implements Insertable<PreachingSession> {
  final String id;
  final String? congregationId;
  final String json;
  final DateTime lastUpdatedAt;
  const PreachingSession({
    required this.id,
    this.congregationId,
    required this.json,
    required this.lastUpdatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || congregationId != null) {
      map['congregation_id'] = Variable<String>(congregationId);
    }
    map['json'] = Variable<String>(json);
    map['last_updated_at'] = Variable<DateTime>(lastUpdatedAt);
    return map;
  }

  PreachingSessionsCompanion toCompanion(bool nullToAbsent) {
    return PreachingSessionsCompanion(
      id: Value(id),
      congregationId: congregationId == null && nullToAbsent
          ? const Value.absent()
          : Value(congregationId),
      json: Value(json),
      lastUpdatedAt: Value(lastUpdatedAt),
    );
  }

  factory PreachingSession.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PreachingSession(
      id: serializer.fromJson<String>(json['id']),
      congregationId: serializer.fromJson<String?>(json['congregationId']),
      json: serializer.fromJson<String>(json['json']),
      lastUpdatedAt: serializer.fromJson<DateTime>(json['lastUpdatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'congregationId': serializer.toJson<String?>(congregationId),
      'json': serializer.toJson<String>(json),
      'lastUpdatedAt': serializer.toJson<DateTime>(lastUpdatedAt),
    };
  }

  PreachingSession copyWith({
    String? id,
    Value<String?> congregationId = const Value.absent(),
    String? json,
    DateTime? lastUpdatedAt,
  }) => PreachingSession(
    id: id ?? this.id,
    congregationId: congregationId.present
        ? congregationId.value
        : this.congregationId,
    json: json ?? this.json,
    lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
  );
  PreachingSession copyWithCompanion(PreachingSessionsCompanion data) {
    return PreachingSession(
      id: data.id.present ? data.id.value : this.id,
      congregationId: data.congregationId.present
          ? data.congregationId.value
          : this.congregationId,
      json: data.json.present ? data.json.value : this.json,
      lastUpdatedAt: data.lastUpdatedAt.present
          ? data.lastUpdatedAt.value
          : this.lastUpdatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PreachingSession(')
          ..write('id: $id, ')
          ..write('congregationId: $congregationId, ')
          ..write('json: $json, ')
          ..write('lastUpdatedAt: $lastUpdatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, congregationId, json, lastUpdatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PreachingSession &&
          other.id == this.id &&
          other.congregationId == this.congregationId &&
          other.json == this.json &&
          other.lastUpdatedAt == this.lastUpdatedAt);
}

class PreachingSessionsCompanion extends UpdateCompanion<PreachingSession> {
  final Value<String> id;
  final Value<String?> congregationId;
  final Value<String> json;
  final Value<DateTime> lastUpdatedAt;
  final Value<int> rowid;
  const PreachingSessionsCompanion({
    this.id = const Value.absent(),
    this.congregationId = const Value.absent(),
    this.json = const Value.absent(),
    this.lastUpdatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PreachingSessionsCompanion.insert({
    required String id,
    this.congregationId = const Value.absent(),
    required String json,
    required DateTime lastUpdatedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       json = Value(json),
       lastUpdatedAt = Value(lastUpdatedAt);
  static Insertable<PreachingSession> custom({
    Expression<String>? id,
    Expression<String>? congregationId,
    Expression<String>? json,
    Expression<DateTime>? lastUpdatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (congregationId != null) 'congregation_id': congregationId,
      if (json != null) 'json': json,
      if (lastUpdatedAt != null) 'last_updated_at': lastUpdatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PreachingSessionsCompanion copyWith({
    Value<String>? id,
    Value<String?>? congregationId,
    Value<String>? json,
    Value<DateTime>? lastUpdatedAt,
    Value<int>? rowid,
  }) {
    return PreachingSessionsCompanion(
      id: id ?? this.id,
      congregationId: congregationId ?? this.congregationId,
      json: json ?? this.json,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (congregationId.present) {
      map['congregation_id'] = Variable<String>(congregationId.value);
    }
    if (json.present) {
      map['json'] = Variable<String>(json.value);
    }
    if (lastUpdatedAt.present) {
      map['last_updated_at'] = Variable<DateTime>(lastUpdatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PreachingSessionsCompanion(')
          ..write('id: $id, ')
          ..write('congregationId: $congregationId, ')
          ..write('json: $json, ')
          ..write('lastUpdatedAt: $lastUpdatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $AssignmentsTable extends Assignments
    with TableInfo<$AssignmentsTable, Assignment> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $AssignmentsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _congregationIdMeta = const VerificationMeta(
    'congregationId',
  );
  @override
  late final GeneratedColumn<String> congregationId = GeneratedColumn<String>(
    'congregation_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _jsonMeta = const VerificationMeta('json');
  @override
  late final GeneratedColumn<String> json = GeneratedColumn<String>(
    'json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _lastUpdatedAtMeta = const VerificationMeta(
    'lastUpdatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastUpdatedAt =
      GeneratedColumn<DateTime>(
        'last_updated_at',
        aliasedName,
        false,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: true,
      );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    congregationId,
    json,
    lastUpdatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'assignments';
  @override
  VerificationContext validateIntegrity(
    Insertable<Assignment> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('congregation_id')) {
      context.handle(
        _congregationIdMeta,
        congregationId.isAcceptableOrUnknown(
          data['congregation_id']!,
          _congregationIdMeta,
        ),
      );
    }
    if (data.containsKey('json')) {
      context.handle(
        _jsonMeta,
        json.isAcceptableOrUnknown(data['json']!, _jsonMeta),
      );
    } else if (isInserting) {
      context.missing(_jsonMeta);
    }
    if (data.containsKey('last_updated_at')) {
      context.handle(
        _lastUpdatedAtMeta,
        lastUpdatedAt.isAcceptableOrUnknown(
          data['last_updated_at']!,
          _lastUpdatedAtMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_lastUpdatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Assignment map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Assignment(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      congregationId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}congregation_id'],
      ),
      json: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}json'],
      )!,
      lastUpdatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_updated_at'],
      )!,
    );
  }

  @override
  $AssignmentsTable createAlias(String alias) {
    return $AssignmentsTable(attachedDatabase, alias);
  }
}

class Assignment extends DataClass implements Insertable<Assignment> {
  final String id;
  final String? congregationId;
  final String json;
  final DateTime lastUpdatedAt;
  const Assignment({
    required this.id,
    this.congregationId,
    required this.json,
    required this.lastUpdatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || congregationId != null) {
      map['congregation_id'] = Variable<String>(congregationId);
    }
    map['json'] = Variable<String>(json);
    map['last_updated_at'] = Variable<DateTime>(lastUpdatedAt);
    return map;
  }

  AssignmentsCompanion toCompanion(bool nullToAbsent) {
    return AssignmentsCompanion(
      id: Value(id),
      congregationId: congregationId == null && nullToAbsent
          ? const Value.absent()
          : Value(congregationId),
      json: Value(json),
      lastUpdatedAt: Value(lastUpdatedAt),
    );
  }

  factory Assignment.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Assignment(
      id: serializer.fromJson<String>(json['id']),
      congregationId: serializer.fromJson<String?>(json['congregationId']),
      json: serializer.fromJson<String>(json['json']),
      lastUpdatedAt: serializer.fromJson<DateTime>(json['lastUpdatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'congregationId': serializer.toJson<String?>(congregationId),
      'json': serializer.toJson<String>(json),
      'lastUpdatedAt': serializer.toJson<DateTime>(lastUpdatedAt),
    };
  }

  Assignment copyWith({
    String? id,
    Value<String?> congregationId = const Value.absent(),
    String? json,
    DateTime? lastUpdatedAt,
  }) => Assignment(
    id: id ?? this.id,
    congregationId: congregationId.present
        ? congregationId.value
        : this.congregationId,
    json: json ?? this.json,
    lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
  );
  Assignment copyWithCompanion(AssignmentsCompanion data) {
    return Assignment(
      id: data.id.present ? data.id.value : this.id,
      congregationId: data.congregationId.present
          ? data.congregationId.value
          : this.congregationId,
      json: data.json.present ? data.json.value : this.json,
      lastUpdatedAt: data.lastUpdatedAt.present
          ? data.lastUpdatedAt.value
          : this.lastUpdatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Assignment(')
          ..write('id: $id, ')
          ..write('congregationId: $congregationId, ')
          ..write('json: $json, ')
          ..write('lastUpdatedAt: $lastUpdatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, congregationId, json, lastUpdatedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Assignment &&
          other.id == this.id &&
          other.congregationId == this.congregationId &&
          other.json == this.json &&
          other.lastUpdatedAt == this.lastUpdatedAt);
}

class AssignmentsCompanion extends UpdateCompanion<Assignment> {
  final Value<String> id;
  final Value<String?> congregationId;
  final Value<String> json;
  final Value<DateTime> lastUpdatedAt;
  final Value<int> rowid;
  const AssignmentsCompanion({
    this.id = const Value.absent(),
    this.congregationId = const Value.absent(),
    this.json = const Value.absent(),
    this.lastUpdatedAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  AssignmentsCompanion.insert({
    required String id,
    this.congregationId = const Value.absent(),
    required String json,
    required DateTime lastUpdatedAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       json = Value(json),
       lastUpdatedAt = Value(lastUpdatedAt);
  static Insertable<Assignment> custom({
    Expression<String>? id,
    Expression<String>? congregationId,
    Expression<String>? json,
    Expression<DateTime>? lastUpdatedAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (congregationId != null) 'congregation_id': congregationId,
      if (json != null) 'json': json,
      if (lastUpdatedAt != null) 'last_updated_at': lastUpdatedAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  AssignmentsCompanion copyWith({
    Value<String>? id,
    Value<String?>? congregationId,
    Value<String>? json,
    Value<DateTime>? lastUpdatedAt,
    Value<int>? rowid,
  }) {
    return AssignmentsCompanion(
      id: id ?? this.id,
      congregationId: congregationId ?? this.congregationId,
      json: json ?? this.json,
      lastUpdatedAt: lastUpdatedAt ?? this.lastUpdatedAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (congregationId.present) {
      map['congregation_id'] = Variable<String>(congregationId.value);
    }
    if (json.present) {
      map['json'] = Variable<String>(json.value);
    }
    if (lastUpdatedAt.present) {
      map['last_updated_at'] = Variable<DateTime>(lastUpdatedAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('AssignmentsCompanion(')
          ..write('id: $id, ')
          ..write('congregationId: $congregationId, ')
          ..write('json: $json, ')
          ..write('lastUpdatedAt: $lastUpdatedAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SyncQueueTable extends SyncQueue
    with TableInfo<$SyncQueueTable, SyncQueueData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncQueueTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _operationTypeMeta = const VerificationMeta(
    'operationType',
  );
  @override
  late final GeneratedColumn<String> operationType = GeneratedColumn<String>(
    'operation_type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadMeta = const VerificationMeta(
    'payload',
  );
  @override
  late final GeneratedColumn<String> payload = GeneratedColumn<String>(
    'payload',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _timestampMeta = const VerificationMeta(
    'timestamp',
  );
  @override
  late final GeneratedColumn<DateTime> timestamp = GeneratedColumn<DateTime>(
    'timestamp',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, operationType, payload, timestamp];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_queue';
  @override
  VerificationContext validateIntegrity(
    Insertable<SyncQueueData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('operation_type')) {
      context.handle(
        _operationTypeMeta,
        operationType.isAcceptableOrUnknown(
          data['operation_type']!,
          _operationTypeMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_operationTypeMeta);
    }
    if (data.containsKey('payload')) {
      context.handle(
        _payloadMeta,
        payload.isAcceptableOrUnknown(data['payload']!, _payloadMeta),
      );
    } else if (isInserting) {
      context.missing(_payloadMeta);
    }
    if (data.containsKey('timestamp')) {
      context.handle(
        _timestampMeta,
        timestamp.isAcceptableOrUnknown(data['timestamp']!, _timestampMeta),
      );
    } else if (isInserting) {
      context.missing(_timestampMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SyncQueueData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncQueueData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      operationType: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}operation_type'],
      )!,
      payload: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload'],
      )!,
      timestamp: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}timestamp'],
      )!,
    );
  }

  @override
  $SyncQueueTable createAlias(String alias) {
    return $SyncQueueTable(attachedDatabase, alias);
  }
}

class SyncQueueData extends DataClass implements Insertable<SyncQueueData> {
  final int id;
  final String operationType;
  final String payload;
  final DateTime timestamp;
  const SyncQueueData({
    required this.id,
    required this.operationType,
    required this.payload,
    required this.timestamp,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['operation_type'] = Variable<String>(operationType);
    map['payload'] = Variable<String>(payload);
    map['timestamp'] = Variable<DateTime>(timestamp);
    return map;
  }

  SyncQueueCompanion toCompanion(bool nullToAbsent) {
    return SyncQueueCompanion(
      id: Value(id),
      operationType: Value(operationType),
      payload: Value(payload),
      timestamp: Value(timestamp),
    );
  }

  factory SyncQueueData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncQueueData(
      id: serializer.fromJson<int>(json['id']),
      operationType: serializer.fromJson<String>(json['operationType']),
      payload: serializer.fromJson<String>(json['payload']),
      timestamp: serializer.fromJson<DateTime>(json['timestamp']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'operationType': serializer.toJson<String>(operationType),
      'payload': serializer.toJson<String>(payload),
      'timestamp': serializer.toJson<DateTime>(timestamp),
    };
  }

  SyncQueueData copyWith({
    int? id,
    String? operationType,
    String? payload,
    DateTime? timestamp,
  }) => SyncQueueData(
    id: id ?? this.id,
    operationType: operationType ?? this.operationType,
    payload: payload ?? this.payload,
    timestamp: timestamp ?? this.timestamp,
  );
  SyncQueueData copyWithCompanion(SyncQueueCompanion data) {
    return SyncQueueData(
      id: data.id.present ? data.id.value : this.id,
      operationType: data.operationType.present
          ? data.operationType.value
          : this.operationType,
      payload: data.payload.present ? data.payload.value : this.payload,
      timestamp: data.timestamp.present ? data.timestamp.value : this.timestamp,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncQueueData(')
          ..write('id: $id, ')
          ..write('operationType: $operationType, ')
          ..write('payload: $payload, ')
          ..write('timestamp: $timestamp')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, operationType, payload, timestamp);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncQueueData &&
          other.id == this.id &&
          other.operationType == this.operationType &&
          other.payload == this.payload &&
          other.timestamp == this.timestamp);
}

class SyncQueueCompanion extends UpdateCompanion<SyncQueueData> {
  final Value<int> id;
  final Value<String> operationType;
  final Value<String> payload;
  final Value<DateTime> timestamp;
  const SyncQueueCompanion({
    this.id = const Value.absent(),
    this.operationType = const Value.absent(),
    this.payload = const Value.absent(),
    this.timestamp = const Value.absent(),
  });
  SyncQueueCompanion.insert({
    this.id = const Value.absent(),
    required String operationType,
    required String payload,
    required DateTime timestamp,
  }) : operationType = Value(operationType),
       payload = Value(payload),
       timestamp = Value(timestamp);
  static Insertable<SyncQueueData> custom({
    Expression<int>? id,
    Expression<String>? operationType,
    Expression<String>? payload,
    Expression<DateTime>? timestamp,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (operationType != null) 'operation_type': operationType,
      if (payload != null) 'payload': payload,
      if (timestamp != null) 'timestamp': timestamp,
    });
  }

  SyncQueueCompanion copyWith({
    Value<int>? id,
    Value<String>? operationType,
    Value<String>? payload,
    Value<DateTime>? timestamp,
  }) {
    return SyncQueueCompanion(
      id: id ?? this.id,
      operationType: operationType ?? this.operationType,
      payload: payload ?? this.payload,
      timestamp: timestamp ?? this.timestamp,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (operationType.present) {
      map['operation_type'] = Variable<String>(operationType.value);
    }
    if (payload.present) {
      map['payload'] = Variable<String>(payload.value);
    }
    if (timestamp.present) {
      map['timestamp'] = Variable<DateTime>(timestamp.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncQueueCompanion(')
          ..write('id: $id, ')
          ..write('operationType: $operationType, ')
          ..write('payload: $payload, ')
          ..write('timestamp: $timestamp')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $TerritoriesTable territories = $TerritoriesTable(this);
  late final $SegmentsTable segments = $SegmentsTable(this);
  late final $MeetingLocationsTable meetingLocations = $MeetingLocationsTable(
    this,
  );
  late final $PreachingSessionsTable preachingSessions =
      $PreachingSessionsTable(this);
  late final $AssignmentsTable assignments = $AssignmentsTable(this);
  late final $SyncQueueTable syncQueue = $SyncQueueTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    territories,
    segments,
    meetingLocations,
    preachingSessions,
    assignments,
    syncQueue,
  ];
}

typedef $$TerritoriesTableCreateCompanionBuilder =
    TerritoriesCompanion Function({
      required String id,
      Value<String?> congregationId,
      required String json,
      required DateTime lastUpdatedAt,
      Value<int> rowid,
    });
typedef $$TerritoriesTableUpdateCompanionBuilder =
    TerritoriesCompanion Function({
      Value<String> id,
      Value<String?> congregationId,
      Value<String> json,
      Value<DateTime> lastUpdatedAt,
      Value<int> rowid,
    });

class $$TerritoriesTableFilterComposer
    extends Composer<_$AppDatabase, $TerritoriesTable> {
  $$TerritoriesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get json => $composableBuilder(
    column: $table.json,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$TerritoriesTableOrderingComposer
    extends Composer<_$AppDatabase, $TerritoriesTable> {
  $$TerritoriesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get json => $composableBuilder(
    column: $table.json,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$TerritoriesTableAnnotationComposer
    extends Composer<_$AppDatabase, $TerritoriesTable> {
  $$TerritoriesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get json =>
      $composableBuilder(column: $table.json, builder: (column) => column);

  GeneratedColumn<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => column,
  );
}

class $$TerritoriesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $TerritoriesTable,
          Territory,
          $$TerritoriesTableFilterComposer,
          $$TerritoriesTableOrderingComposer,
          $$TerritoriesTableAnnotationComposer,
          $$TerritoriesTableCreateCompanionBuilder,
          $$TerritoriesTableUpdateCompanionBuilder,
          (
            Territory,
            BaseReferences<_$AppDatabase, $TerritoriesTable, Territory>,
          ),
          Territory,
          PrefetchHooks Function()
        > {
  $$TerritoriesTableTableManager(_$AppDatabase db, $TerritoriesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TerritoriesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TerritoriesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TerritoriesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> congregationId = const Value.absent(),
                Value<String> json = const Value.absent(),
                Value<DateTime> lastUpdatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => TerritoriesCompanion(
                id: id,
                congregationId: congregationId,
                json: json,
                lastUpdatedAt: lastUpdatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> congregationId = const Value.absent(),
                required String json,
                required DateTime lastUpdatedAt,
                Value<int> rowid = const Value.absent(),
              }) => TerritoriesCompanion.insert(
                id: id,
                congregationId: congregationId,
                json: json,
                lastUpdatedAt: lastUpdatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$TerritoriesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $TerritoriesTable,
      Territory,
      $$TerritoriesTableFilterComposer,
      $$TerritoriesTableOrderingComposer,
      $$TerritoriesTableAnnotationComposer,
      $$TerritoriesTableCreateCompanionBuilder,
      $$TerritoriesTableUpdateCompanionBuilder,
      (Territory, BaseReferences<_$AppDatabase, $TerritoriesTable, Territory>),
      Territory,
      PrefetchHooks Function()
    >;
typedef $$SegmentsTableCreateCompanionBuilder =
    SegmentsCompanion Function({
      required String id,
      required String territoryId,
      Value<String?> congregationId,
      required String json,
      required DateTime lastUpdatedAt,
      Value<int> rowid,
    });
typedef $$SegmentsTableUpdateCompanionBuilder =
    SegmentsCompanion Function({
      Value<String> id,
      Value<String> territoryId,
      Value<String?> congregationId,
      Value<String> json,
      Value<DateTime> lastUpdatedAt,
      Value<int> rowid,
    });

class $$SegmentsTableFilterComposer
    extends Composer<_$AppDatabase, $SegmentsTable> {
  $$SegmentsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get territoryId => $composableBuilder(
    column: $table.territoryId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get json => $composableBuilder(
    column: $table.json,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SegmentsTableOrderingComposer
    extends Composer<_$AppDatabase, $SegmentsTable> {
  $$SegmentsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get territoryId => $composableBuilder(
    column: $table.territoryId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get json => $composableBuilder(
    column: $table.json,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SegmentsTableAnnotationComposer
    extends Composer<_$AppDatabase, $SegmentsTable> {
  $$SegmentsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get territoryId => $composableBuilder(
    column: $table.territoryId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get json =>
      $composableBuilder(column: $table.json, builder: (column) => column);

  GeneratedColumn<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => column,
  );
}

class $$SegmentsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SegmentsTable,
          Segment,
          $$SegmentsTableFilterComposer,
          $$SegmentsTableOrderingComposer,
          $$SegmentsTableAnnotationComposer,
          $$SegmentsTableCreateCompanionBuilder,
          $$SegmentsTableUpdateCompanionBuilder,
          (Segment, BaseReferences<_$AppDatabase, $SegmentsTable, Segment>),
          Segment,
          PrefetchHooks Function()
        > {
  $$SegmentsTableTableManager(_$AppDatabase db, $SegmentsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SegmentsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SegmentsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SegmentsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> territoryId = const Value.absent(),
                Value<String?> congregationId = const Value.absent(),
                Value<String> json = const Value.absent(),
                Value<DateTime> lastUpdatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SegmentsCompanion(
                id: id,
                territoryId: territoryId,
                congregationId: congregationId,
                json: json,
                lastUpdatedAt: lastUpdatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String territoryId,
                Value<String?> congregationId = const Value.absent(),
                required String json,
                required DateTime lastUpdatedAt,
                Value<int> rowid = const Value.absent(),
              }) => SegmentsCompanion.insert(
                id: id,
                territoryId: territoryId,
                congregationId: congregationId,
                json: json,
                lastUpdatedAt: lastUpdatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SegmentsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SegmentsTable,
      Segment,
      $$SegmentsTableFilterComposer,
      $$SegmentsTableOrderingComposer,
      $$SegmentsTableAnnotationComposer,
      $$SegmentsTableCreateCompanionBuilder,
      $$SegmentsTableUpdateCompanionBuilder,
      (Segment, BaseReferences<_$AppDatabase, $SegmentsTable, Segment>),
      Segment,
      PrefetchHooks Function()
    >;
typedef $$MeetingLocationsTableCreateCompanionBuilder =
    MeetingLocationsCompanion Function({
      required String id,
      Value<String?> congregationId,
      required String json,
      required DateTime lastUpdatedAt,
      Value<int> rowid,
    });
typedef $$MeetingLocationsTableUpdateCompanionBuilder =
    MeetingLocationsCompanion Function({
      Value<String> id,
      Value<String?> congregationId,
      Value<String> json,
      Value<DateTime> lastUpdatedAt,
      Value<int> rowid,
    });

class $$MeetingLocationsTableFilterComposer
    extends Composer<_$AppDatabase, $MeetingLocationsTable> {
  $$MeetingLocationsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get json => $composableBuilder(
    column: $table.json,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$MeetingLocationsTableOrderingComposer
    extends Composer<_$AppDatabase, $MeetingLocationsTable> {
  $$MeetingLocationsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get json => $composableBuilder(
    column: $table.json,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$MeetingLocationsTableAnnotationComposer
    extends Composer<_$AppDatabase, $MeetingLocationsTable> {
  $$MeetingLocationsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get json =>
      $composableBuilder(column: $table.json, builder: (column) => column);

  GeneratedColumn<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => column,
  );
}

class $$MeetingLocationsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $MeetingLocationsTable,
          MeetingLocation,
          $$MeetingLocationsTableFilterComposer,
          $$MeetingLocationsTableOrderingComposer,
          $$MeetingLocationsTableAnnotationComposer,
          $$MeetingLocationsTableCreateCompanionBuilder,
          $$MeetingLocationsTableUpdateCompanionBuilder,
          (
            MeetingLocation,
            BaseReferences<
              _$AppDatabase,
              $MeetingLocationsTable,
              MeetingLocation
            >,
          ),
          MeetingLocation,
          PrefetchHooks Function()
        > {
  $$MeetingLocationsTableTableManager(
    _$AppDatabase db,
    $MeetingLocationsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$MeetingLocationsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$MeetingLocationsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$MeetingLocationsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> congregationId = const Value.absent(),
                Value<String> json = const Value.absent(),
                Value<DateTime> lastUpdatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => MeetingLocationsCompanion(
                id: id,
                congregationId: congregationId,
                json: json,
                lastUpdatedAt: lastUpdatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> congregationId = const Value.absent(),
                required String json,
                required DateTime lastUpdatedAt,
                Value<int> rowid = const Value.absent(),
              }) => MeetingLocationsCompanion.insert(
                id: id,
                congregationId: congregationId,
                json: json,
                lastUpdatedAt: lastUpdatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$MeetingLocationsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $MeetingLocationsTable,
      MeetingLocation,
      $$MeetingLocationsTableFilterComposer,
      $$MeetingLocationsTableOrderingComposer,
      $$MeetingLocationsTableAnnotationComposer,
      $$MeetingLocationsTableCreateCompanionBuilder,
      $$MeetingLocationsTableUpdateCompanionBuilder,
      (
        MeetingLocation,
        BaseReferences<_$AppDatabase, $MeetingLocationsTable, MeetingLocation>,
      ),
      MeetingLocation,
      PrefetchHooks Function()
    >;
typedef $$PreachingSessionsTableCreateCompanionBuilder =
    PreachingSessionsCompanion Function({
      required String id,
      Value<String?> congregationId,
      required String json,
      required DateTime lastUpdatedAt,
      Value<int> rowid,
    });
typedef $$PreachingSessionsTableUpdateCompanionBuilder =
    PreachingSessionsCompanion Function({
      Value<String> id,
      Value<String?> congregationId,
      Value<String> json,
      Value<DateTime> lastUpdatedAt,
      Value<int> rowid,
    });

class $$PreachingSessionsTableFilterComposer
    extends Composer<_$AppDatabase, $PreachingSessionsTable> {
  $$PreachingSessionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get json => $composableBuilder(
    column: $table.json,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PreachingSessionsTableOrderingComposer
    extends Composer<_$AppDatabase, $PreachingSessionsTable> {
  $$PreachingSessionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get json => $composableBuilder(
    column: $table.json,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PreachingSessionsTableAnnotationComposer
    extends Composer<_$AppDatabase, $PreachingSessionsTable> {
  $$PreachingSessionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get json =>
      $composableBuilder(column: $table.json, builder: (column) => column);

  GeneratedColumn<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => column,
  );
}

class $$PreachingSessionsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $PreachingSessionsTable,
          PreachingSession,
          $$PreachingSessionsTableFilterComposer,
          $$PreachingSessionsTableOrderingComposer,
          $$PreachingSessionsTableAnnotationComposer,
          $$PreachingSessionsTableCreateCompanionBuilder,
          $$PreachingSessionsTableUpdateCompanionBuilder,
          (
            PreachingSession,
            BaseReferences<
              _$AppDatabase,
              $PreachingSessionsTable,
              PreachingSession
            >,
          ),
          PreachingSession,
          PrefetchHooks Function()
        > {
  $$PreachingSessionsTableTableManager(
    _$AppDatabase db,
    $PreachingSessionsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PreachingSessionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PreachingSessionsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PreachingSessionsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> congregationId = const Value.absent(),
                Value<String> json = const Value.absent(),
                Value<DateTime> lastUpdatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PreachingSessionsCompanion(
                id: id,
                congregationId: congregationId,
                json: json,
                lastUpdatedAt: lastUpdatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> congregationId = const Value.absent(),
                required String json,
                required DateTime lastUpdatedAt,
                Value<int> rowid = const Value.absent(),
              }) => PreachingSessionsCompanion.insert(
                id: id,
                congregationId: congregationId,
                json: json,
                lastUpdatedAt: lastUpdatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PreachingSessionsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $PreachingSessionsTable,
      PreachingSession,
      $$PreachingSessionsTableFilterComposer,
      $$PreachingSessionsTableOrderingComposer,
      $$PreachingSessionsTableAnnotationComposer,
      $$PreachingSessionsTableCreateCompanionBuilder,
      $$PreachingSessionsTableUpdateCompanionBuilder,
      (
        PreachingSession,
        BaseReferences<
          _$AppDatabase,
          $PreachingSessionsTable,
          PreachingSession
        >,
      ),
      PreachingSession,
      PrefetchHooks Function()
    >;
typedef $$AssignmentsTableCreateCompanionBuilder =
    AssignmentsCompanion Function({
      required String id,
      Value<String?> congregationId,
      required String json,
      required DateTime lastUpdatedAt,
      Value<int> rowid,
    });
typedef $$AssignmentsTableUpdateCompanionBuilder =
    AssignmentsCompanion Function({
      Value<String> id,
      Value<String?> congregationId,
      Value<String> json,
      Value<DateTime> lastUpdatedAt,
      Value<int> rowid,
    });

class $$AssignmentsTableFilterComposer
    extends Composer<_$AppDatabase, $AssignmentsTable> {
  $$AssignmentsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get json => $composableBuilder(
    column: $table.json,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$AssignmentsTableOrderingComposer
    extends Composer<_$AppDatabase, $AssignmentsTable> {
  $$AssignmentsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get json => $composableBuilder(
    column: $table.json,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$AssignmentsTableAnnotationComposer
    extends Composer<_$AppDatabase, $AssignmentsTable> {
  $$AssignmentsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get congregationId => $composableBuilder(
    column: $table.congregationId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get json =>
      $composableBuilder(column: $table.json, builder: (column) => column);

  GeneratedColumn<DateTime> get lastUpdatedAt => $composableBuilder(
    column: $table.lastUpdatedAt,
    builder: (column) => column,
  );
}

class $$AssignmentsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $AssignmentsTable,
          Assignment,
          $$AssignmentsTableFilterComposer,
          $$AssignmentsTableOrderingComposer,
          $$AssignmentsTableAnnotationComposer,
          $$AssignmentsTableCreateCompanionBuilder,
          $$AssignmentsTableUpdateCompanionBuilder,
          (
            Assignment,
            BaseReferences<_$AppDatabase, $AssignmentsTable, Assignment>,
          ),
          Assignment,
          PrefetchHooks Function()
        > {
  $$AssignmentsTableTableManager(_$AppDatabase db, $AssignmentsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$AssignmentsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$AssignmentsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$AssignmentsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> congregationId = const Value.absent(),
                Value<String> json = const Value.absent(),
                Value<DateTime> lastUpdatedAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => AssignmentsCompanion(
                id: id,
                congregationId: congregationId,
                json: json,
                lastUpdatedAt: lastUpdatedAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> congregationId = const Value.absent(),
                required String json,
                required DateTime lastUpdatedAt,
                Value<int> rowid = const Value.absent(),
              }) => AssignmentsCompanion.insert(
                id: id,
                congregationId: congregationId,
                json: json,
                lastUpdatedAt: lastUpdatedAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$AssignmentsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $AssignmentsTable,
      Assignment,
      $$AssignmentsTableFilterComposer,
      $$AssignmentsTableOrderingComposer,
      $$AssignmentsTableAnnotationComposer,
      $$AssignmentsTableCreateCompanionBuilder,
      $$AssignmentsTableUpdateCompanionBuilder,
      (
        Assignment,
        BaseReferences<_$AppDatabase, $AssignmentsTable, Assignment>,
      ),
      Assignment,
      PrefetchHooks Function()
    >;
typedef $$SyncQueueTableCreateCompanionBuilder =
    SyncQueueCompanion Function({
      Value<int> id,
      required String operationType,
      required String payload,
      required DateTime timestamp,
    });
typedef $$SyncQueueTableUpdateCompanionBuilder =
    SyncQueueCompanion Function({
      Value<int> id,
      Value<String> operationType,
      Value<String> payload,
      Value<DateTime> timestamp,
    });

class $$SyncQueueTableFilterComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get operationType => $composableBuilder(
    column: $table.operationType,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get timestamp => $composableBuilder(
    column: $table.timestamp,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SyncQueueTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get operationType => $composableBuilder(
    column: $table.operationType,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payload => $composableBuilder(
    column: $table.payload,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get timestamp => $composableBuilder(
    column: $table.timestamp,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SyncQueueTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncQueueTable> {
  $$SyncQueueTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get operationType => $composableBuilder(
    column: $table.operationType,
    builder: (column) => column,
  );

  GeneratedColumn<String> get payload =>
      $composableBuilder(column: $table.payload, builder: (column) => column);

  GeneratedColumn<DateTime> get timestamp =>
      $composableBuilder(column: $table.timestamp, builder: (column) => column);
}

class $$SyncQueueTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SyncQueueTable,
          SyncQueueData,
          $$SyncQueueTableFilterComposer,
          $$SyncQueueTableOrderingComposer,
          $$SyncQueueTableAnnotationComposer,
          $$SyncQueueTableCreateCompanionBuilder,
          $$SyncQueueTableUpdateCompanionBuilder,
          (
            SyncQueueData,
            BaseReferences<_$AppDatabase, $SyncQueueTable, SyncQueueData>,
          ),
          SyncQueueData,
          PrefetchHooks Function()
        > {
  $$SyncQueueTableTableManager(_$AppDatabase db, $SyncQueueTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncQueueTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncQueueTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncQueueTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> operationType = const Value.absent(),
                Value<String> payload = const Value.absent(),
                Value<DateTime> timestamp = const Value.absent(),
              }) => SyncQueueCompanion(
                id: id,
                operationType: operationType,
                payload: payload,
                timestamp: timestamp,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String operationType,
                required String payload,
                required DateTime timestamp,
              }) => SyncQueueCompanion.insert(
                id: id,
                operationType: operationType,
                payload: payload,
                timestamp: timestamp,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SyncQueueTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SyncQueueTable,
      SyncQueueData,
      $$SyncQueueTableFilterComposer,
      $$SyncQueueTableOrderingComposer,
      $$SyncQueueTableAnnotationComposer,
      $$SyncQueueTableCreateCompanionBuilder,
      $$SyncQueueTableUpdateCompanionBuilder,
      (
        SyncQueueData,
        BaseReferences<_$AppDatabase, $SyncQueueTable, SyncQueueData>,
      ),
      SyncQueueData,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$TerritoriesTableTableManager get territories =>
      $$TerritoriesTableTableManager(_db, _db.territories);
  $$SegmentsTableTableManager get segments =>
      $$SegmentsTableTableManager(_db, _db.segments);
  $$MeetingLocationsTableTableManager get meetingLocations =>
      $$MeetingLocationsTableTableManager(_db, _db.meetingLocations);
  $$PreachingSessionsTableTableManager get preachingSessions =>
      $$PreachingSessionsTableTableManager(_db, _db.preachingSessions);
  $$AssignmentsTableTableManager get assignments =>
      $$AssignmentsTableTableManager(_db, _db.assignments);
  $$SyncQueueTableTableManager get syncQueue =>
      $$SyncQueueTableTableManager(_db, _db.syncQueue);
}
