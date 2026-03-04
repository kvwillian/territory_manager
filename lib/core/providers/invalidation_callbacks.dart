/// Global callbacks for invalidating providers after offline sync.
/// Used to avoid circular dependencies between repository and data providers.
void Function()? invalidateTerritories;
void Function()? invalidateMeetingLocations;
