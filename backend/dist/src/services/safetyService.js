"use strict";
// Pattern-level detection for crisis language in user-generated content.
// This is intentionally coarse (keyword/phrase matching, not ML) for v1 —
// it's meant to catch clear signals and err toward showing support resources
// too often rather than too rarely. False positives here are low-cost
// (person sees a resource card they didn't need); false negatives are not.
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkContent = checkContent;
// Categories are deliberately broad. Each is a signal to surface support,
// not a judgment about intent — many of these phrases are also used
// casually, and that's fine; the response (a resource card) is low-friction
// either way.
const CRISIS_PATTERNS = [
    {
        category: "self_harm_risk",
        patterns: [
            /\bkill myself\b/i,
            /\bend my life\b/i,
            /\bsuicid(e|al)\b/i,
            /\bwant to die\b/i,
            /\bself[\s-]?harm\b/i,
            /\bno reason to (live|go on)\b/i,
        ],
    },
    {
        category: "acute_relapse_crisis",
        patterns: [
            /\babout to (relapse|use|drink)\b/i,
            /\bcan'?t (hold on|do this) (anymore|any longer)\b/i,
            /\bgiving up\b/i,
        ],
    },
];
function checkContent(content) {
    if (!content)
        return { flagged: false, matchedCategory: null };
    for (const group of CRISIS_PATTERNS) {
        for (const pattern of group.patterns) {
            if (pattern.test(content)) {
                return { flagged: true, matchedCategory: group.category };
            }
        }
    }
    return { flagged: false, matchedCategory: null };
}
