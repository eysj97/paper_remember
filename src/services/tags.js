// "  #감정 " / "감정" -> "#감정"; empty input gives an empty string
export function normalizeTag(text) {
  const body = text.trim().replace(/^#+/, '').trim()
  return body ? `#${body}` : ''
}
