// Funny arcade-flavoured copy for push notifications.
// {name} is replaced with the medicine/vitamin name.

const FIRST_TITLES = [
  "🟠 CHOMP TIME!",
  "🕹️ Insert Coin (and Pill)",
  "👾 New Quest Available",
  "🍬 Pellet Alert",
  "🎮 Ready Player Chiara"
];

const FIRST_MESSAGES = [
  "Your {name} is on the board. Go gobble it up before the ghosts do.",
  "Level unlocked: {name} time. Press START, then swallow.",
  "A wild {name} appeared! Use ITEM to defeat it.",
  "Ding! {name} is ready to be chomped.",
  "New objective: eat the {name}. Reward: +1 healthy point.",
  "The maze has one job for you right now: {name}.",
  "Your character is hungry for {name}. Feed it to continue.",
  "Bonus round: {name}. Easiest points you'll get all day."
];

const NAG_TITLES = [
  "👻 Still Waiting...",
  "⏰ Extra Life Needed",
  "🚨 Game Not Paused",
  "🔁 Round Two",
  "😤 The Ghosts Are Circling"
];

const NAG_MESSAGES = [
  "Your {name} is still sitting there, uneaten. The ghosts are getting closer.",
  "Reminder #{count}: {name} is not going to take itself.",
  "The maze remembers everything. {name} is still on the board.",
  "Still no {name}? Your streak is watching you disappointed.",
  "Beep boop. This is your {name}, reminding you that it exists.",
  "No pause button in real life. Go take your {name}.",
  "Achievement locked: 'Took the {name}'. Go unlock it.",
  "One more nudge: {name} is overdue and mildly offended."
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
