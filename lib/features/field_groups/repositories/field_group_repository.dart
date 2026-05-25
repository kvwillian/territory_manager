import '../models/field_group_model.dart';

abstract class FieldGroupRepository {
  Future<List<FieldGroupModel>> getFieldGroups();
  Future<FieldGroupModel?> getFieldGroupById(String id);
  Future<FieldGroupModel> createFieldGroup(FieldGroupModel group);
  Future<void> updateFieldGroup(FieldGroupModel group);
  Future<void> deleteFieldGroup(String id);
}
