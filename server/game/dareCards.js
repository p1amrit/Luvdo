export const DARE_CARDS = [
  // --- FRIENDS & PARTY VIBES ---
  {
    id: "friend-1",
    vibe: "friends",
    category: "party-dare",
    title: "Accented Speech",
    prompt: "Speak in a dramatic British, pirate, or cartoon voice for the next 2 full rounds!",
    icon: "🎩"
  },
  {
    id: "friend-2",
    vibe: "friends",
    category: "roast",
    title: "Playful Roast",
    prompt: "Deliver a funny, harmless 10-second roast to the player currently in first place!",
    icon: "🔥"
  },
  {
    id: "friend-3",
    vibe: "friends",
    category: "bet",
    title: "Boba / Coffee Bet",
    prompt: "If you don't finish in the top 2 this game, you owe the winner a coffee or boba next hangout!",
    icon: "🧋"
  },
  {
    id: "friend-4",
    vibe: "friends",
    category: "party-dare",
    title: "Dramatic Monologue",
    prompt: "Act out a dramatic Shakespearean scene over voice chat mourning your lost token.",
    icon: "🎭"
  },
  {
    id: "friend-5",
    vibe: "friends",
    category: "fun-truth",
    title: "Zombie Squad",
    prompt: "Who in this game would be the first to get eliminated in a zombie apocalypse and why?",
    icon: "🧟"
  },
  {
    id: "friend-6",
    vibe: "friends",
    category: "party-dare",
    title: "Sound Effect Machine",
    prompt: "You must make funny cartoon sound effects for every single dice roll until your next turn!",
    icon: "🎺"
  },
  {
    id: "friend-7",
    vibe: "friends",
    category: "bet",
    title: "Snack Tax",
    prompt: "You must buy the group or your opponent their favorite snack next time you see each other.",
    icon: "🍕"
  },
  {
    id: "friend-8",
    vibe: "friends",
    category: "fun-truth",
    title: "Search History",
    prompt: "Confess the most bizarre or random thing you googled in the last 48 hours.",
    icon: "🔍"
  },
  {
    id: "friend-9",
    vibe: "friends",
    category: "party-dare",
    title: "Hype Person",
    prompt: "Give the player with the lowest score a 15-second hype-man speech like a sports coach!",
    icon: "📣"
  },
  {
    id: "friend-10",
    vibe: "friends",
    category: "fun-truth",
    title: "Superpower Dilemma",
    prompt: "Would you rather have the ability to fly but only at 5 mph, or become invisible when nobody is looking?",
    icon: "⚡"
  },

  // --- COUPLE & ROMANTIC VIBES ---
  {
    id: "sweet-1",
    vibe: "couple",
    category: "sweet",
    title: "The Moment",
    prompt: "Tell your partner the exact moment you realized you had feelings for them.",
    icon: "💖"
  },
  {
    id: "sweet-2",
    vibe: "couple",
    category: "sweet",
    title: "Sweet Compliment",
    prompt: "Give your partner 3 genuine compliments about their personality or smile right now on voice/chat.",
    icon: "✨"
  },
  {
    id: "sweet-3",
    vibe: "couple",
    category: "sweet",
    title: "Dream Date",
    prompt: "Describe your ideal romantic getaway with your partner if money and distance were no object.",
    icon: "🏖️"
  },
  {
    id: "sweet-4",
    vibe: "couple",
    category: "sweet",
    title: "Favorite Habit",
    prompt: "Confess one cute little habit your partner has that always makes you smile secretly.",
    icon: "🥰"
  },
  {
    id: "sweet-5",
    vibe: "couple",
    category: "sweet",
    title: "First Impression",
    prompt: "Recall what you were thinking the very first time you saw or talked to your partner.",
    icon: "💭"
  },
  {
    id: "playful-1",
    vibe: "couple",
    category: "playful",
    title: "Voice Serenade",
    prompt: "Hum or sing the chorus of a love song (or our favorite song) over voice chat!",
    icon: "🎶"
  },
  {
    id: "playful-2",
    vibe: "couple",
    category: "playful",
    title: "Cute Nickname",
    prompt: "Call your partner by the cheesiest romantic pet name you can invent for the rest of this match.",
    icon: "🍯"
  },
  {
    id: "playful-3",
    vibe: "couple",
    category: "playful",
    title: "Staring Contest",
    prompt: "Turn on voice/video or send a photo: hold a 15-second smiling staring contest without blinking or laughing!",
    icon: "👀"
  },
  {
    id: "flirty-1",
    vibe: "couple",
    category: "flirty",
    title: "Massage Voucher",
    prompt: "You officially owe your partner a relaxing 10-minute shoulder or back massage next time you meet!",
    icon: "💆"
  },
  {
    id: "flirty-2",
    vibe: "couple",
    category: "flirty",
    title: "Sweet Treat IOU",
    prompt: "The next dessert, boba, or coffee date is on you! Take a screenshot to seal the deal.",
    icon: "🧋"
  }
];

export function getRandomDareCard(vibe = 'friends') {
  let pool = DARE_CARDS;
  if (vibe === 'couple') {
    pool = DARE_CARDS.filter(c => c.vibe === 'couple');
  } else if (vibe === 'friends') {
    pool = DARE_CARDS.filter(c => c.vibe === 'friends');
  }
  // If fallback empty
  if (pool.length === 0) pool = DARE_CARDS;

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}
