/** Segment-safe prefix: `/restaurant` must not match `/restaurants`. */
export function pathIs(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isStaffArea(pathname: string) {
  return pathIs(pathname, "/restaurant") || pathIs(pathname, "/admin") || pathIs(pathname, "/courier");
}
