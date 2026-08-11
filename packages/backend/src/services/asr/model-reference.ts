export function parseProviderId(provider: string): string {
  return provider.split(":")[0] ?? "";
}

export function parseModelId(provider: string): string | undefined {
  return provider.split(":")[1];
}
