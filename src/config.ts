export const config = {
  watchedUserIds: [
    724142242708717589n, // roni
    // 1413923760121315409n, // alt acc (debug)
  ] as unknown as bigint[],

  timeoutDurationSeconds: 30,

  dmMessages: [
    "🫵🤡",
    "You've been timed out for 30 seconds for innapropriate behavior.",
    "Nice try, buddy.",
    "GENUINE LOSER",
    "THATS NOT FUCKING FUNNY",
    "Talk when you know the industry standard.",
    "Bro wants timebomb madness game framework 😂🙏 in your dreams BUDDY",
    "Don't try talking again.",
  ],

  patterns: {
    giphy: /https?:\/\/(media\.)?giphy\.com\/\S+/i,
    tenor: /https?:\/\/(media\.)?tenor\.com\/\S+/i,
    gifer: /https?:\/\/gifer\.com\/\S+/i,
    instagram: /https?:\/\/(www\.)?instagram\.com\/\S+/i,
    kkinstagram: /https?:\/\/(www\.)?kkinstagram\.com\/\S+/i,
    tenorGif: /https?:\/\/tenor\.com\/view\/\S+/i,
  },
};

export function isGifOrInstagramLink(content: string): boolean {
  for (const pattern of Object.values(config.patterns)) {
    if (pattern.test(content)) {
      return true;
    }
  }
  return false;
}
