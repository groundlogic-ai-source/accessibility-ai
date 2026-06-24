---
name: axe-core WCAG tag format
description: How axe-core encodes WCAG success criteria in rule tags, and the parsing trap that silently corrupts VPAT criterion mapping.
---

axe-core encodes a rule's WCAG success criterion as a **digit-only** tag with no dots:
`wcag143` → 1.4.3, `wcag1410` → 1.4.10, `wcag111` → 1.1.1. Parse by position:
1st digit = principle, 2nd = guideline, the rest = success-criterion number (1–2 digits).
Level/version tags (`wcag2a`, `wcag2aa`, `wcag21aa`) contain letters — skip them with a digit-only match `^wcag(\d)(\d)(\d+)$`.

**Why:** A regex that expects dots (e.g. `/wcag\d+\.\d+\.\d+/`) never matches any real axe tag, so the mapper falls through to its default criterion (e.g. `4.1.2`) for *every* violation. The bug is silent — scans still "work" and produce output — but every axe finding lands on the wrong WCAG criterion, corrupting VPAT criterion placement and any dedupe/diff key that includes the criterion.

**How to apply:** Whenever mapping axe results to WCAG criteria (VPAT building, two-tier conformance, re_verify diff keys), match digit-only tags. If a VPAT shows nearly all violations collapsed onto one criterion, suspect this mapper first.
