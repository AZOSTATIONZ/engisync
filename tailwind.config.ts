import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // Opaque hover, derived per theme from `shade()`. Not an alpha of
          // DEFAULT — see the note in globals.css for why that failed AA.
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* `bg-popover` was already in use by the command palette and the More
           menu, but `popover` was never registered here — so the class did
           nothing and those overlays rendered with NO background, showing the
           page through them. Registering it is the fix; the token itself is
           defined in globals.css. */
        popover: {
          DEFAULT: "hsl(var(--elevated))",
          foreground: "hsl(var(--card-foreground))",
        },
        elevated: "hsl(var(--elevated))",
        sidebar: "hsl(var(--sidebar))",
        /* Semantic accents. Use these instead of literal Tailwind palette
           classes (`text-green-600`, `bg-amber-500`) so a colour means the
           same thing everywhere and both themes stay in step. */
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
      },
      /* MOTION FOLLOWS THE STYLE.
         `--motion-scale` was added in Stage 4 and eleven styles set it —
         Neo-Brutalism 0.4 because brutalism does not ease, Maximalism 1.3
         because it does nothing by halves — and then NOTHING READ IT. The
         variable was declared in globals.css and consumed nowhere, so every
         one of those values was decoration on a data structure. Same state
         `fontSans` is still in, and the same way to find it: grep for the
         consumer rather than trusting that writing the token did something.

         Tailwind's transition utilities take their duration from this key, so
         overriding the DEFAULT scales all 76 of them at once. The 8 explicit
         `duration-*` utilities in the codebase are deliberate — the 1200ms
         hero crossfade, for one — and keep their own values, because those
         utilities are emitted after the transition utilities and win.

         `prefers-reduced-motion` is untouched by this. That block sets
         `transition-duration: 0.01ms !important`, which beats any calc here.
         A style may not opt a user out of an accessibility preference, and
         the test asserts the `!important` is still there. */
      transitionDuration: {
        DEFAULT: "calc(150ms * var(--motion-scale))",
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        /* xl AND 2xl FOLLOW THE TOKEN TOO.
           They were Tailwind's fixed 12px/16px, which meant `--radius` only
           reached `rounded-md` and `rounded-lg`. That is 179 of the 226
           radius utilities in this codebase — but the 47 it missed are the
           big ones: cards, panels, the hero. Neo-Brutalism set radius 0 and
           its cards still came back 16px round. Found by reading
           borderTopLeftRadius off a real `.surface-premium` on /dashboard.

           MULTIPLIERS, not offsets, so the default is unchanged: --radius is
           0.7rem = 11.2px, and 1.071 x 11.2 = 12.0px, 1.429 x 11.2 = 16.0px,
           exactly what these were before. An offset like `+ 5px` would have
           left brutalist's 0 radius with 5px corners instead of square. */
        xl: "calc(var(--radius) * 1.071)",
        "2xl": "calc(var(--radius) * 1.429)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
