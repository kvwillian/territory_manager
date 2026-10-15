class PublisherGroup {
  const PublisherGroup({
    required this.id,
    required this.name,
    required this.superintendentPublisherId,
  });

  final String id;
  final String name;
  final String superintendentPublisherId;

  factory PublisherGroup.fromDoc(String id, Map<String, dynamic> map) {
    return PublisherGroup(
      id: id,
      name: map['name'] as String? ?? 'Grupo',
      superintendentPublisherId: map['superintendentPublisherId'] as String? ?? '',
    );
  }
}
