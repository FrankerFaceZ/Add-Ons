export const BAD_USERS = [
  "_deck", "bits", "directory", "downloads", "drops", "friends",
  "inventory", "jobs", "moderator", "p", "partner", "prime", "privacy",
  "recaps", "search", "settings", "store", "subscriptions", "turbo", "wallet"
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