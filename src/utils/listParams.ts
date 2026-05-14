export function serializeListParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) searchParams.append(key, v);
    } else if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }
  return searchParams.toString();
}
