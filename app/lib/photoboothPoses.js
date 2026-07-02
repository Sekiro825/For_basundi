// Cute pose prompts shown to both of you before each shot in the live photo booth.
export const POSE_PROMPTS = [
  'Blow a kiss to the camera 💋',
  'Make a heart with your hands together 🫶',
  'Squish your faces close and grin 🥰',
  'Boop noses (virtually) 👃',
  'Peace signs + a wink 😉',
  'Silly face contest — who\'s goofier? 🤪',
  'Close your eyes and smile softly 😌',
  'Point at each other and laugh 😂',
  'Wave hi like you just spotted each other 👋',
  'Pretend to whisper a secret 🤫',
  'Big cheesy grin, all teeth 😁',
  'Puppy dog eyes 🥺',
  'Air hug — arms out for the screen 🤗',
  'Thumbs up together 👍',
  'Rest your chin on your hand 🥹',
  'Look away dreamily, then snap back 👀',
  'Both blow a kiss at the same time 😘',
  'Pretend you\'re clinking coffee cups ☕',
  'Strike your best model pose 💅',
  'Just be yourselves and smile 💛',
];

export function pickPoses(count) {
  const pool = [...POSE_PROMPTS];
  const picked = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}
