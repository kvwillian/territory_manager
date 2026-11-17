class PublisherGroup {
  const PublisherGroup({
    required this.id,
    required this.name,
    required this.superintendentPublisherId,
    this.assistantPublisherId,
    this.description,
  });

  final String id;
  final String name;
  final String superintendentPublisherId;
  final String? assistantPublisherId;
  final String? description;

  factory PublisherGroup.fromDoc(String id, Map<String, dynamic> map) {
    final assistant = map['assistantPublisherId'];
    final desc = map['description'];
    return PublisherGroup(
      id: id,
      name: map['name'] as String? ?? 'Grupo',
      superintendentPublisherId:
          map['superintendentPublisherId'] as String? ?? '',
      assistantPublisherId:
          assistant is String && assistant.trim().isNotEmpty
              ? assistant.trim()
              : null,
      description:
          desc is String && desc.trim().isNotEmpty ? desc.trim() : null,
    );
  }
}
