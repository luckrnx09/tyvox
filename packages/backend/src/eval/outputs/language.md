# Eval Output: language

- Timestamp: 2026-08-10T08:24:22.191Z
- Polisher model: deepseek-v4-flash
- Judge model: deepseek-v4-flash
- Passed: 2/3
## normalizes traditional asr output to simplified — PASS
- Rule: fixMisidentifiedLanguage
- Input: 這個專案的程式碼品質不太好需要重構
- Output: 这个项目的代码质量不太好，需要重构。
- expect: 重构: pass — The output contains the exact term '重构'.
- forbid: 重構: pass — The output does not contain the traditional form '重構'.
- forbid: 程式碼: pass — The output uses '代码' instead of '程式碼'.
- fidelity: meaning preserved: pass — The output preserves the original meaning about code quality and refactoring without adding or omitting information.
- fidelity: no invented content: pass — The output is a direct rewrite with no added ideas, questions, or explanations.
- language: standard written form: pass — The output is in standard Simplified Chinese written form.
- mechanics: punctuation and grammar: pass — The output uses proper comma, period, and no spacing issues.

## keeps language mix — FAIL
- Rule: keepLanguageMix
- Input: 这个 feature 我做到一半，we need more time
- Output: 这个 feature 我做到一半，我们需要更多时间。
- expect (literal): we need more time: fail — Output is missing a required phrase

## keeps foreign words in original script — PASS
- Rule: keepForeignWordScript
- Input: 后端用 go 写的，部署在 aws 上
- Output: 后端用 Go 写的，部署在 AWS 上。
- expect: Go: pass — The output contains 'Go' in English as required.
- expect: AWS: pass — The output contains 'AWS' in English as required.
- forbid: Go or AWS translated into Chinese: pass — Neither 'Go' nor 'AWS' is translated into Chinese; both remain in English.
- fidelity: meaning preserved: pass — The output preserves the original meaning: the backend is written in Go and deployed on AWS, with no additions or omissions.
- fidelity: no invented content: pass — The output only rewrites the input, adding no new ideas or explanations.
- language: standard written form: pass — The output is in standard written Chinese with proper capitalization of the English terms.
- mechanics: punctuation and grammar: pass — The output uses correct punctuation, grammar, and spacing, including a period at the end and proper capitalization.
