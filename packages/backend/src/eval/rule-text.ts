import { formatRule, RULE_IDS, rules, type RuleId } from "../services/transform/prompts/rules.js";

export function getRuleText(ruleId: RuleId): string {
  return formatRule(rules[ruleId], RULE_IDS.indexOf(ruleId) + 1);
}
