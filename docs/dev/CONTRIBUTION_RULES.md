# 📜 Contribution Rules

## 1. Role Definitions
### **AI Agents (Roo, Gemini, ChatGPT)**
- **Rule 1**: Read `AI_CONTEXT.md` before making any changes.
- **Rule 2**: Do not delete existing code unless it is redundant or broken.
- **Rule 3**: Always update the `updated_at` field (using `Date.now()`) on mutation functions.
- **Rule 4**: Use **Vanilla JS** (ES6+) for logic. Do not install new dependencies without permission.

### **Human Developers**
- **Rule 1**: Follow the **Doc Sync Rule**. Ensure `/docs` match the code.
- **Rule 2**: Use **Glassmorphism** CSS tokens for UI additions.
- **Rule 3**: Perform manual UI testing on a small screen (mobile view) before committing changes.

## 2. Code Review Standard (The 3-Check Rule)
Before merging any PR:
1.  **Sync Check**: Does it break `deepMergeArrays` or the `updated_at` chain?
2.  **Performance Check**: Does it trigger unnecessary DOM re-renders in a loop?
3.  **UI Check**: Does it follow the "Simple Study Companion" philosophy (minimalism)?

## 3. Atomic Commits
- Commit messages must follow the **Conventional Commits** format:
  - `feat: added AI insight widget`
  - `fix: resolved sync loop in history tab`
  - `docs: updated architecture.md`
  - `refactor: extracted charts logic from script.js`

## 4. Documentation Compliance
- **Requirement**: No PR can be merged without a corresponding update to `docs/dev/CHANGELOG.md`.

---
*Following these rules keeps the codebase clean for both humans and future AI assistants.*
