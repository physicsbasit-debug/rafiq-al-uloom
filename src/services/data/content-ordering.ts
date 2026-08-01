export function orderEntitiesByIds<T extends { id: string }>(
  entities: readonly T[],
  ids: readonly string[]
): T[] {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));

  return ids.flatMap((id) => {
    const entity = byId.get(id);
    return entity ? [entity] : [];
  });
}

export function uniqueIdsInOrder(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}
