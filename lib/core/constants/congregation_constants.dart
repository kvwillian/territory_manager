/// Default congregation ID for backward compatibility.
/// Documents without congregationId are treated as belonging to this congregation.
///
/// Migration note: Existing Firestore documents without congregationId will not
/// appear in congregation-filtered queries. Run a one-time migration to add
/// congregationId: 'default' to existing documents for full backward compatibility.
const defaultCongregationId = 'default';
