/// Default congregation ID for backward compatibility.
/// Documents without congregationId are treated as belonging to this congregation.
///
/// Documentos sem congregationId não aparecem nas queries e as regras recusam
/// o acesso. Rode uma vez, antes de publicar as regras:
/// functions: npm run stamp-congregation-ids
const defaultCongregationId = 'default';
