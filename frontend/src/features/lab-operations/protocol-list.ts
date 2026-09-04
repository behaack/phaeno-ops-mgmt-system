/**
 * Protocol records stay in the working list until explicitly deleted.
 * This includes never-approved records whose only draft was discarded.
 */
export function isProtocolVisible() {
  return true
}
