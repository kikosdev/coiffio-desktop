/**
 * BLACK BOX design tokens — JS constants mirroring tailwind.config.js.
 * D-SIGNIN-4: accent = #F5A623 (the #F4A62A in the mockup is drift — ignored).
 *
 * SYNC RULE: keep this file in sync with tailwind.config.js manually.
 * DO NOT use these values in JSX className strings — use Tailwind classes instead.
 * Valid uses: inline SVG fills, canvas, radial-gradient inline styles, staffAvatarColor(), tests.
 */

export const colors = {
  bg:       '#0E0E0F',
  surface:  '#1A1A1C',
  surface2: '#141416',
  ink:      '#FFFFFF',
  muted:    '#8A8A8E',
  accent:   '#F5A623',
  success:  '#5BBF7A',
  error:    '#E05C5C',
  line:     '#2A2A2C',
} as const;

// Fixed 8-hue palette for staff avatars. Seeded deterministically by staff _id.
// Colors stay consistent across sessions even if staff rename themselves.
const AVATAR_PALETTE = [
  '#C98C2E', // amber-deep
  '#4A7FC1', // blue-mid
  '#B85C45', // terracotta
  '#4DAA6F', // green-mid
  '#7B5EA7', // purple
  '#3D9AA8', // teal
  '#C05A8A', // rose
  '#7A8C3E', // olive
] as const;

/**
 * Returns a deterministic hex color from the fixed palette.
 * @param seed — staff _id string (ObjectId). Use id, not name, for stability.
 */
export function staffAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffff;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
