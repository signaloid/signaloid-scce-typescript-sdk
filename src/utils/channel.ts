export function idToChannelName(id: string): string {
  const parts = id.split("_");
  return parts.length > 1 ? parts[1] : id;
}
