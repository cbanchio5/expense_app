export function toUserErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message.trim() : "";
  if (!raw) return fallback;

  const message = raw.toLowerCase();

  if (message.includes("failed to fetch") || message.includes("networkerror")) {
    return "Cannot reach the server right now. Please check your connection and try again.";
  }
  if (message.includes("authentication required")) {
    return "Your session expired. Please sign in again.";
  }
  if (message.includes("household name already taken")) {
    return "Household name already taken. Please choose another one.";
  }
  if (message.includes("household name not found")) {
    return "Household not found. Check the household name and try again.";
  }
  if (message.includes("invalid passcode")) {
    return "Incorrect passcode. Please try again.";
  }
  if (message.includes("name not recognized")) {
    return "Member name not recognized for this household.";
  }
  if (message.includes("multiple households found")) {
    return "This household name is duplicated. Please create a unique household name.";
  }
  if (message.includes("receipt id is missing")) {
    return "Could not delete this receipt right now. Refresh and try again.";
  }
  if (message.includes("no receipts were analyzed successfully")) {
    return "We could not read any tickets from this batch. Try clearer images or upload fewer at once.";
  }
  if (message.includes("request failed (500")) {
    return "Server error. Please try again in a moment.";
  }

  return raw;
}
