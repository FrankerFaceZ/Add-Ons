export const BAD_USERS = [
  "_deck", "activate", "annual-recap", "bits", "bits-checkout", "claim",
  "directory", "dj-program", "dj-signup", "downloads", "drops", "email-unsubscribe",
  "friends", "inventory", "jobs", "moderator", "p", "partner",
  "popout", "prime", "privacy", "recaps", "redeem", "search",
  "settings", "store", "subs", "subscriptions", "turbo", "unsubscribe",
  "wallet"
];

export const ErrorCodes = ["1000", "2000", "3000", "4000", "5000"];
export const ErrorMessages = {
  "1000": "The video download was cancelled. Please try again.",
  "2000": "There was a network error. Please try again.",
  "3000": "Your browser encountered an error while decoding the video.",
  "5000": "This video is unavailable."
};

export const PermissionLevels = {
  VIEWER: 0,
  VIP: 1,
  MODERATOR: 2,
  BROADCASTER: 3,
};