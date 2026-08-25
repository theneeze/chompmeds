// Funny arcade-flavoured copy for push notifications.
// {name} is replaced with the medicine/vitamin name.

const FIRST_TITLES = [
  "🟠 CHOMP TIME, CHIARA!",
  "🕹️ Insert Coin, Chiara",
  "👾 New Quest for Chiara",
  "🍬 Pellet Alert, Chiara",
  "🎮 Ready Player Chiara"
];

const FIRST_MESSAGES = [
  "Chiara, your {name} is on the board. Go gobble it up before the ghosts do.",
  "Level unlocked, Chiara: {name} time. Press START, then swallow.",
  "A wild {name} appeared! Chiara, use ITEM to defeat it.",
  "Ding! Chiara, your {name} is ready to be chomped.",
  "New objective for Chiara: eat the {name}. Reward: +1 healthy point.",
  "The maze has one job for you right now, Chiara: {name}.",
  "Chiara, your character is hungry for {name}. Feed it to continue.",
  "Bonus round, Chiara: {name}. Easiest points you'll get all day."
];

const NAG_TITLES = [
  "👻 Still Waiting, Chiara...",
  "⏰ Extra Life Needed, Chiara",
  "🚨 Game Not Paused, Chiara",
  "🔁 Round Two, Chiara",
  "😤 The Ghosts Are Circling, Chiara"
];

const NAG_MESSAGES = [
  "Chiara, your {name} is still sitting there, uneaten. The ghosts are getting closer.",
  "Reminder #{count}, Chiara: {name} is not going to take itself.",
  "The maze remembers everything, Chiara. {name} is still on the board.",
  "Still no {name}, Chiara? Your streak is watching you disappointed.",
  "Beep boop, Chiara. This is your {name}, reminding you that it exists.",
  "No pause button in real life, Chiara. Go take your {name}.",
  "Achievement locked, Chiara: 'Took the {name}'. Go unlock it.",
  "One more nudge, Chiara: {name} is overdue and mildly offended."
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildFirstNotification(medicineName) {
  return {
    title: pick(FIRST_TITLES),
    body: pick(FIRST_MESSAGES).replace("{name}", medicineName)
  };
}

function buildNagNotification(medicineName, reminderCount) {
  return {
    title: pick(NAG_TITLES),
    body: pick(NAG_MESSAGES).replace("{name}", medicineName).replace("{count}", String(reminderCount))
  };
}

module.exports = { buildFirstNotification, buildNagNotification };
