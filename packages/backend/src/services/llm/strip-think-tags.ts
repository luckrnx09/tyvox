const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";
const MAX_TAG_PREFIX_LENGTH = THINK_CLOSE.length - 1;

export function stripThinkTags(text: string): string {
  let result = "";
  let rest = text;
  while (rest.length > 0) {
    const openIndex = rest.toLowerCase().indexOf(THINK_OPEN);
    if (openIndex === -1) {
      result += rest;
      break;
    }
    result += rest.slice(0, openIndex);
    const afterOpen = rest.slice(openIndex + THINK_OPEN.length);
    const closeIndex = afterOpen.toLowerCase().indexOf(THINK_CLOSE);
    if (closeIndex === -1) break;
    rest = afterOpen.slice(closeIndex + THINK_CLOSE.length);
  }
  return result;
}

function longestTagPrefixSuffix(text: string): number {
  const lower = text.toLowerCase();
  for (let length = Math.min(MAX_TAG_PREFIX_LENGTH, lower.length); length > 0; length--) {
    const suffix = lower.slice(-length);
    if (THINK_OPEN.startsWith(suffix) || THINK_CLOSE.startsWith(suffix)) return length;
  }
  return 0;
}

export function createThinkTagStripper(): {
  push: (chunk: string) => string;
  flush: () => string;
} {
  let buffer = "";
  let insideThink = false;

  return {
    push(chunk: string): string {
      buffer += chunk;
      let output = "";
      let safety = buffer.length + 1;
      while (buffer.length > 0 && safety-- > 0) {
        if (insideThink) {
          const closeIndex = buffer.toLowerCase().indexOf(THINK_CLOSE);
          if (closeIndex === -1) {
            const holdback = longestTagPrefixSuffix(buffer);
            buffer = buffer.slice(buffer.length - holdback || undefined);
            if (holdback === 0) buffer = "";
            break;
          }
          buffer = buffer.slice(closeIndex + THINK_CLOSE.length);
          insideThink = false;
          continue;
        }
        const openIndex = buffer.toLowerCase().indexOf(THINK_OPEN);
        if (openIndex === -1) {
          const holdback = longestTagPrefixSuffix(buffer);
          output += buffer.slice(0, buffer.length - holdback || undefined);
          buffer = holdback > 0 ? buffer.slice(-holdback) : "";
          break;
        }
        output += buffer.slice(0, openIndex);
        buffer = buffer.slice(openIndex + THINK_OPEN.length);
        insideThink = true;
      }
      return output;
    },
    flush(): string {
      const rest = insideThink ? "" : buffer;
      buffer = "";
      return rest;
    },
  };
}
