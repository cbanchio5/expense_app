interface ApiLikeErrorPayload {
  failed?: unknown;
}

interface FailedReceiptEntry {
  filename: string;
  detail: string;
}

function extractFailedReceiptEntries(error: unknown): FailedReceiptEntry[] {
  if (!error || typeof error !== "object" || !("payload" in error)) return [];
  const payload = (error as { payload?: ApiLikeErrorPayload }).payload;
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.failed)) return [];

  return payload.failed
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as { filename?: unknown; detail?: unknown };
      const filename = typeof record.filename === "string" ? record.filename.trim() : "";
      const detail = typeof record.detail === "string" ? record.detail.trim() : "";
      if (!filename || !detail) return null;
      return { filename, detail };
    })
    .filter((entry): entry is FailedReceiptEntry => entry !== null);
}

function formatBatchFailureMessage(failedEntries: FailedReceiptEntry[]): string | null {
  if (failedEntries.length === 0) return null;
  const preview = failedEntries
    .slice(0, 2)
    .map((entry) => `${entry.filename}: ${entry.detail}`)
    .join(" | ");
  const remaining = failedEntries.length - 2;
  const suffix = remaining > 0 ? ` | +${remaining} more file(s).` : "";
  return `Failed file details: ${preview}${suffix}`;
}

export function toUserErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message.trim() : "";
  if (!raw) return fallback;

  const message = raw.toLowerCase();
  const failedEntries = extractFailedReceiptEntries(error);
  const failedSummary = formatBatchFailureMessage(failedEntries);

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
    return failedSummary
      ? `We could not read any receipts from this batch. ${failedSummary}`
      : "We could not read any receipts from this batch. Try clearer images or upload fewer at once.";
  }
  if (message.includes("could not reach openai receipt service")) {
    return "Receipt AI service is temporarily unavailable. Please try again in a moment.";
  }
  if (message.includes("openai returned an invalid json payload")) {
    return "Receipt AI returned an invalid response. Please try the upload again.";
  }
  if (message.includes("receipt analysis service failed unexpectedly")) {
    return "Receipt analysis failed unexpectedly. Please retry.";
  }
  if (message.includes("image file is too large")) {
    return "The ticket image is too large. Upload a smaller image or lower-resolution photo.";
  }
  if (message.includes("request failed (413")) {
    return "Uploaded image is too large. Please use a smaller ticket image.";
  }
  if (message.includes("request failed (502")) {
    return "Receipt analysis service is temporarily unavailable. Please try again.";
  }
  if (message.includes("request failed (500")) {
    return "Server error. Please try again in a moment.";
  }

  return raw;
}
