// Generates an anonymous display name like "Quiet Falcon442"
// used everywhere instead of the user's real identity.

const adjectives = ["Quiet", "Brave", "Calm", "Steady", "Bright", "Gentle", "Bold", "Patient"];
const nouns = ["Falcon", "River", "Mountain", "Wolf", "Comet", "Maple", "Harbor", "Ember"];

export function generateAlias(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 900) + 100;
  return `${adjective} ${noun}${number}`;
}