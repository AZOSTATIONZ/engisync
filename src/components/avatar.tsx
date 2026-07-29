import Image from "next/image";
import {
  ACCENTS,
  initials,
  resolveAccent,
  resolveAvatarStyle,
  type AccentKey,
  type AvatarStyle,
} from "@/lib/personalization";

/**
 * A person's face in the interface.
 *
 * Renders, in order of preference:
 *   1. the OAuth provider image, if they signed in with Google or Microsoft —
 *      already hosted, already moderated, costs us nothing;
 *   2. a generated engineering-motif SVG, a few hundred bytes inline.
 *
 * There is no upload path. See lib/personalization.ts for why: no object
 * storage exists, uploaded images would need a moderation queue nobody can
 * staff, and photos are real money on a mobile data bundle when a team list
 * shows twelve of them.
 *
 * Each motif is drawn from the accent colour so a person is recognisable by
 * shape AND colour — colour alone would fail for colour-blind users, which is
 * why the six styles are distinguishable in greyscale too.
 */

const SIZES = { sm: 28, md: 40, lg: 64, xl: 96 } as const;
export type AvatarSize = keyof typeof SIZES;

function Motif({ style, id }: { style: AvatarStyle; id: string }) {
  // Small deterministic variation within a style, so two students who both
  // chose "gear" don't get an identical face.
  const v = (id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % 3;
  const stroke = "currentColor";

  switch (style) {
    case "node":
      return (
        <g fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round">
          <circle cx="50" cy="50" r="12" fill={stroke} stroke="none" />
          <path d="M50 38V16M50 62v22M38 50H16M62 50h22" />
          {v > 0 && <circle cx="50" cy="50" r="26" opacity="0.45" />}
          {v > 1 && <path d="M31 31l-12-12M69 31l12-12" opacity="0.6" />}
        </g>
      );
    case "gear":
      return (
        <g fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round">
          <circle cx="50" cy="50" r="16" />
          {Array.from({ length: 6 + v }).map((_, i, arr) => {
            const a = (i / arr.length) * Math.PI * 2;
            return (
              <path
                key={i}
                d={`M${50 + Math.cos(a) * 22} ${50 + Math.sin(a) * 22}L${
                  50 + Math.cos(a) * 34
                } ${50 + Math.sin(a) * 34}`}
              />
            );
          })}
        </g>
      );
    case "hex":
      return (
        <g fill="none" stroke={stroke} strokeWidth="5" strokeLinejoin="round">
          <path d="M50 14l31 18v36L50 86 19 68V32z" />
          {v > 0 && <path d="M50 34l16 9v18l-16 9-16-9V43z" opacity="0.55" />}
          {v > 1 && <circle cx="50" cy="50" r="5" fill={stroke} stroke="none" />}
        </g>
      );
    case "wave":
      return (
        <g fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round">
          <path d="M12 50q12-26 24 0t24 0 24 0" opacity={v > 0 ? 1 : 0.9} />
          {v > 0 && <path d="M12 68q12-16 24 0t24 0 24 0" opacity="0.45" />}
          {v > 1 && <path d="M12 32q12-16 24 0t24 0 24 0" opacity="0.45" />}
        </g>
      );
    case "truss":
      return (
        <g fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round">
          <path d="M14 74h72M14 74L50 26l36 48" />
          {v > 0 && <path d="M32 74L50 50l18 24" opacity="0.6" />}
          {v > 1 && <path d="M50 26v48" opacity="0.5" />}
        </g>
      );
    /* PEOPLE — head and shoulders, drawn as line art rather than illustration.
       No skin tone is implied: the figure takes the user's accent colour like
       every other motif, so the system never guesses at someone's appearance.
       The three variants differ by hair, which is what actually distinguishes
       them. */
    case "personShort":
      return (
        <g fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round">
          <circle cx="50" cy="40" r="16" />
          <path d="M34 36q16-14 32 0" />
          <path d="M22 84q6-22 28-22t28 22" />
        </g>
      );
    case "personLong":
      return (
        <g fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round">
          <circle cx="50" cy="40" r="16" />
          <path d="M32 40q0-20 18-20t18 20" />
          <path d="M32 40v18M68 40v18" opacity="0.7" />
          <path d="M24 84q6-20 26-20t26 20" />
        </g>
      );
    case "personCurls":
      return (
        <g fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round">
          <circle cx="50" cy="42" r="15" />
          {[36, 44, 52, 60, 64].map((cx, i) => (
            <circle key={cx} cx={cx} cy={i % 2 ? 24 : 27} r="6" opacity="0.85" />
          ))}
          <path d="M23 84q6-21 27-21t27 21" />
        </g>
      );

    /* ANIMALS — for students who would rather not be a person or a circuit. */
    case "cat":
      return (
        <g fill="none" stroke={stroke} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
          <path d="M28 44L24 22l18 10M72 44l4-22-18 10" />
          <circle cx="50" cy="56" r="24" />
          <path d="M41 52h.01M59 52h.01" strokeWidth="7" />
          <path d="M50 62l-4 4M50 62l4 4" strokeWidth="4" />
          <path d="M28 58H14M28 64H16M72 58h14M72 64h12" strokeWidth="3" opacity="0.6" />
        </g>
      );
    case "owl":
      return (
        <g fill="none" stroke={stroke} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
          <path d="M26 34q-6-14 6-16t12 10M74 34q6-14-6-16T64 28" />
          <path d="M50 20q26 0 26 30t-26 34q-26-4-26-34t26-30z" />
          <circle cx="40" cy="46" r="8" />
          <circle cx="60" cy="46" r="8" />
          <path d="M50 54l-4 6h8z" fill={stroke} stroke="none" />
        </g>
      );

    case "orbit":
      return (
        <g fill="none" stroke={stroke} strokeWidth="5">
          <circle cx="50" cy="50" r="9" fill={stroke} stroke="none" />
          <ellipse cx="50" cy="50" rx="34" ry="15" />
          {v > 0 && (
            <ellipse
              cx="50"
              cy="50"
              rx="34"
              ry="15"
              transform="rotate(60 50 50)"
              opacity="0.6"
            />
          )}
          {v > 1 && (
            <ellipse
              cx="50"
              cy="50"
              rx="34"
              ry="15"
              transform="rotate(-60 50 50)"
              opacity="0.6"
            />
          )}
        </g>
      );
  }
}

export function Avatar({
  userId,
  name,
  image,
  accentColor,
  avatarStyle,
  size = "md",
  className = "",
}: {
  userId: string;
  name: string | null | undefined;
  /** OAuth provider image, if any. */
  image?: string | null;
  accentColor?: string | null;
  avatarStyle?: string | null;
  size?: AvatarSize;
  className?: string;
}) {
  const px = SIZES[size];
  const accent: AccentKey = resolveAccent(accentColor);
  const style = resolveAvatarStyle(avatarStyle, userId);
  const label = name?.trim() || "Member";

  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={px}
        height={px}
        className={`shrink-0 rounded-full object-cover ${className}`}
        /* Decorative: the name is always rendered beside it, and a duplicate
           announcement is noise for a screen-reader user. */
        aria-hidden
      />
    );
  }

  const swatch = ACCENTS[accent].swatch;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{
        width: px,
        height: px,
        backgroundColor: `${swatch}1f`,
        color: swatch,
      }}
      title={label}
      aria-hidden
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        role="presentation"
        focusable="false"
      >
        <Motif style={style} id={userId} />
      </svg>
    </span>
  );
}

/**
 * Text-only fallback for very dense lists where even an inline SVG per row is
 * more weight than the row deserves.
 */
export function InitialsBadge({
  name,
  accentColor,
  className = "",
}: {
  name: string | null | undefined;
  accentColor?: string | null;
  className?: string;
}) {
  const swatch = ACCENTS[resolveAccent(accentColor)].swatch;
  const text = initials(name) || "·";
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${className}`}
      style={{ backgroundColor: `${swatch}1f`, color: swatch }}
      aria-hidden
    >
      {text}
    </span>
  );
}
