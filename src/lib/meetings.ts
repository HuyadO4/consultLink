export function tryGenerateMeetingLink(bookingId: string) {
  const baseUrl = process.env.MEETING_LINK_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBaseUrl}/${bookingId}`;
}
