import type { ThemePersonality } from "@/lib/themes";
import { themeVars } from "@/lib/theme-preview";

/**
 * A miniature EngiSync, drawn with one personality's real tokens.
 *
 * This is the whole argument of the gallery. A row of two-colour swatches
 * tells you a theme is "blue-ish"; it cannot tell you that one style has no
 * shadows, that another has square corners and a heavy border, or that a
 * third blurs its surfaces. Those are the differences a student is actually
 * choosing between, and they only show up on something shaped like the
 * product.
 *
 * So this mirrors the real shell — rail, top bar, a raised card, a primary
 * button, text at two weights — at roughly a twentieth of the size. It uses
 * the same `hsl(var(--token))` expressions the application uses, inside a
 * wrapper carrying that theme's variables, so it responds to form tokens too:
 * flatten `--shadow-strength` and this thumbnail goes flat with the product.
 *
 * Deliberately not interactive and `aria-hidden`: the card around it carries
 * the name, the description and the controls. A screen-reader user should
 * hear "Ocean — deep water, teal light", not a tour of a decorative diagram.
 */
export function ThemeThumbnail({
  theme,
  mode,
}: {
  theme: ThemePersonality;
  mode: "light" | "dark";
}) {
  return (
    <div
      aria-hidden
      style={themeVars(theme, mode)}
      className="pointer-events-none overflow-hidden rounded-lg"
    >
      <div
        className="flex h-[86px] w-full"
        style={{ background: "hsl(var(--background))" }}
      >
        {/* Navigation rail */}
        <div
          className="flex w-[18%] shrink-0 flex-col gap-1 p-1.5"
          style={{
            background: "hsl(var(--sidebar))",
            borderRight: "var(--border-width) solid hsl(var(--border))",
          }}
        >
          <div
            className="h-1.5 w-full"
            style={{
              background: "hsl(var(--primary))",
              borderRadius: "calc(var(--radius) * 0.4)",
            }}
          />
          <div className="h-1 w-3/4" style={{ background: "hsl(var(--border))", borderRadius: 2 }} />
          <div className="h-1 w-2/3" style={{ background: "hsl(var(--border))", borderRadius: 2 }} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2">
          {/* Top bar */}
          <div className="flex items-center gap-1">
            <div
              className="h-1.5 w-1/3"
              style={{ background: "hsl(var(--primary))", borderRadius: 2 }}
            />
            <div className="h-1 flex-1" style={{ background: "hsl(var(--border))", borderRadius: 2 }} />
          </div>

          {/* A raised card — carries radius, border width and shadow at once */}
          <div
            className="flex-1 p-1.5"
            style={{
              background: "hsl(var(--card))",
              border: "var(--border-width) solid hsl(var(--border))",
              borderRadius: "calc(var(--radius) * 0.6)",
              boxShadow:
                "0 2px 6px -2px hsl(var(--shadow-color) / calc(0.18 * var(--shadow-strength)))",
            }}
          >
            <div
              className="mb-1 h-1.5 w-1/2"
              style={{ background: "hsl(var(--primary))", opacity: 0.85, borderRadius: 2 }}
            />
            <div className="mb-1 h-1 w-full" style={{ background: "hsl(var(--border))", borderRadius: 2 }} />
            <div className="h-1 w-4/5" style={{ background: "hsl(var(--border))", borderRadius: 2 }} />
          </div>

          {/* Primary action — the clearest read on brand colour and radius */}
          <div className="flex items-center gap-1">
            <div
              className="h-2.5 w-1/3"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-2)))",
                borderRadius: "calc(var(--radius) * 0.5)",
              }}
            />
            <div
              className="h-2.5 w-1/4"
              style={{
                background: "hsl(var(--elevated))",
                border: "var(--border-width) solid hsl(var(--border))",
                borderRadius: "calc(var(--radius) * 0.5)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
