"use strict";
// Builds a personalized support response combining:
// 1. The user's own emergency contact, if they've set one (most actionable —
//    a real person who knows them, reachable immediately)
// 2. Distract Me options (activity suggestions, buddy ping to their group,
//    nearby public places) — gives something to DO right now, not just read
// 3. A verified global helpline directory as a fallback, since hotline
//    numbers are country-specific and change — we don't want to show a
//    wrong or defunct number
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSupportResponse = buildSupportResponse;
function buildSupportResponse(emergencyContact) {
    const hasEmergencyContact = emergencyContact.name && emergencyContact.phone;
    return {
        title: "You're not alone",
        message: "If you're going through a difficult moment, here's what might help right now.",
        emergencyContact: hasEmergencyContact
            ? { name: emergencyContact.name, phone: emergencyContact.phone }
            : null,
        distractMeSuggestion: {
            // Frontend can immediately surface the Distract Me panel using this
            type: "activity", // rotates: activity | nearby_place | ping_buddy | content
            prompt: "Want to try something else for a few minutes?",
        },
        fallbackResource: {
            name: "Find A Helpline (global directory)",
            description: "Free, confidential, verified crisis helplines by country.",
            url: "https://findahelpline.com",
        },
    };
}
