const ASCII_WORD_PATTERN = /^[\w\s-]+$/;

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findForbiddenHit(forbidden: readonly string[], output: string): string | undefined {
  return forbidden.find((text) => matchesLiteral(text, output));
}

export function findMissingExpected(
  expected: readonly string[],
  output: string,
): string | undefined {
  return expected.find((text) => !matchesLiteral(text, output));
}

function matchesLiteral(text: string, output: string): boolean {
  if (!ASCII_WORD_PATTERN.test(text)) {
    return output.toLowerCase().includes(text.toLowerCase());
  }
  const prefix = /^\w/.test(text) ? "(?<![\\w])" : "";
  const suffix = /\w$/.test(text) ? "(?![\\w])" : "";
  return new RegExp(`${prefix}${escapeRegExp(text)}${suffix}`, "i").test(output);
}
