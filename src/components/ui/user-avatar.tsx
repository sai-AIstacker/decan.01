"use client";

/**
 * UserAvatar — generates a unique Multiavatar SVG for any user.
 * Uses the user's ID as seed so every user always gets the same avatar.
 * 12 billion+ possible unique avatars, fully offline, zero API calls.
 */
import multiavatar from "@multiavatar/multiavatar/esm";

interface UserAvatarProps {
  /** User ID (UUID) used as the avatar seed — guarantees uniqueness */
  userId: string;
  /** Display name — used as aria-label only */
  name?: string;
  /** Size in px — default 32 */
  size?: number;
  className?: string;
}

export function UserAvatar({ userId, name, size = 32, className = "" }: UserAvatarProps) {
  const svgCode = multiavatar(userId);
  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden bg-transparent ${className}`}
      style={{ width: size, height: size, minWidth: size }}
      aria-label={name ? `Avatar for ${name}` : "User avatar"}
      dangerouslySetInnerHTML={{ __html: svgCode }}
    />
  );
}

/**
 * Server-safe version — renders the SVG inline without "use client".
 * Use this in Server Components.
 */
export function UserAvatarServer({ userId, name, size = 32, className = "" }: UserAvatarProps) {
  const svgCode = multiavatar(userId);
  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden bg-transparent ${className}`}
      style={{ width: size, height: size, minWidth: size }}
      aria-label={name ? `Avatar for ${name}` : "User avatar"}
      dangerouslySetInnerHTML={{ __html: svgCode }}
    />
  );
}
