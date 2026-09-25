export function toLiteralLikePattern(query: string | undefined): string | null {
  const trimmed = query?.trim().slice(0, 200);
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[!%_]/g, "!$&");
  return `%${escaped}%`;
}
