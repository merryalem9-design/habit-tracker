"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("../../generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});
const prisma = new client_1.PrismaClient({ adapter });
const content = [
    // ── Secular quotes ──────────────────────────────────────────────
    { type: "quote", category: "secular_quotes", source: "Viktor Frankl",
        text: "When we are no longer able to change a situation, we are challenged to change ourselves." },
    { type: "quote", category: "secular_quotes", source: "Marcus Aurelius",
        text: "You have power over your mind, not outside events. Realize this and you will find strength." },
    { type: "quote", category: "secular_quotes", source: "Rumi",
        text: "The wound is the place where the light enters you." },
    { type: "quote", category: "secular_quotes", source: "Brené Brown",
        text: "You are imperfect, you are wired for struggle, but you are also worthy of love and belonging." },
    { type: "quote", category: "secular_quotes", source: "Maya Angelou",
        text: "You may encounter many defeats, but you must not be defeated." },
    { type: "quote", category: "secular_quotes", source: "Albert Camus",
        text: "In the middle of winter, I at last discovered that there was in me an invincible summer." },
    // ── Recovery quotes ─────────────────────────────────────────────
    { type: "quote", category: "recovery_quotes", source: "AA Big Book",
        text: "One day at a time. You do not have to do it all at once." },
    { type: "quote", category: "recovery_quotes", source: "Anonymous",
        text: "Recovery is not a race. You don't have to feel guilty if it takes you longer than you thought." },
    { type: "quote", category: "recovery_quotes", source: "Anonymous",
        text: "Every moment is a fresh beginning. This one counts." },
    { type: "quote", category: "recovery_quotes", source: "Anonymous",
        text: "A relapse is not a failure. It is information. Use it." },
    { type: "quote", category: "recovery_quotes", source: "Anonymous",
        text: "The cravings will pass whether you act on them or not. Ride it out." },
    // ── Scripture ────────────────────────────────────────────────────
    { type: "verse", category: "scripture", source: "Philippians 4:13",
        text: "I can do all things through Christ who strengthens me." },
    { type: "verse", category: "scripture", source: "Psalm 34:18",
        text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit." },
    { type: "verse", category: "scripture", source: "Isaiah 41:10",
        text: "Do not fear, for I am with you. Do not be dismayed, for I am your God." },
    { type: "verse", category: "scripture", source: "Quran 94:5-6",
        text: "Indeed, with hardship comes ease. Indeed, with hardship comes ease." },
    { type: "verse", category: "scripture", source: "Quran 2:286",
        text: "Allah does not burden a soul beyond that it can bear." },
    { type: "verse", category: "scripture", source: "Proverbs 3:5-6",
        text: "Trust in the Lord with all your heart and lean not on your own understanding." },
    // ── Breathing exercises ──────────────────────────────────────────
    { type: "activity", category: "breathing",
        source: "Box Breathing (used by Navy SEALs)",
        text: "Breathe in for 4 counts. Hold for 4. Breathe out for 4. Hold for 4. Repeat 4 times. This resets your nervous system." },
    { type: "activity", category: "breathing",
        source: "4-7-8 Technique",
        text: "Inhale through your nose for 4 seconds. Hold for 7 seconds. Exhale through your mouth for 8 seconds. Do this 3 times." },
    { type: "activity", category: "breathing",
        source: "Physiological Sigh",
        text: "Take a deep breath in, then sniff in a little more air on top of it. Then exhale slowly and fully. This is the fastest known way to reduce stress." },
    // ── Physical activities ──────────────────────────────────────────
    { type: "activity", category: "physical",
        source: null,
        text: "Stand up and take a 5-minute walk — outside if possible. Movement shifts your brain chemistry faster than any thought exercise." },
    { type: "activity", category: "physical",
        source: null,
        text: "Do 10 slow jumping jacks. Count each one out loud. The counting breaks the thought loop." },
    { type: "activity", category: "physical",
        source: null,
        text: "Put cold water on your face and wrists for 30 seconds. This activates the dive reflex and slows your heart rate." },
    // ── Journaling prompts ───────────────────────────────────────────
    { type: "activity", category: "journaling",
        source: null,
        text: "Write down three things you can see, two you can hear, and one you can feel right now. This grounds you in the present moment." },
    { type: "activity", category: "journaling",
        source: null,
        text: "Finish this sentence without overthinking it: 'Right now I feel _____ and that is okay because _____.' Write as much as comes." },
    { type: "activity", category: "journaling",
        source: null,
        text: "Write a letter to your future self one year from now. What do you want them to know about this moment?" },
];
async function seed() {
    console.log("Seeding distraction_content...");
    // Wipe existing seed data so re-running is safe
    await prisma.distractionContent.deleteMany();
    await prisma.distractionContent.createMany({ data: content });
    const count = await prisma.distractionContent.count();
    console.log(`Done — ${count} items seeded.`);
    await prisma.$disconnect();
}
seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
