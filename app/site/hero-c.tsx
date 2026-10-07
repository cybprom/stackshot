import { GeneratorPanel } from "@/app/site/generator/panel";
import { Nav } from "@/app/site/nav";
import { GalleryWall } from "@/app/site/wall";
import { COLORS } from "@/lib/tokens";

/**
 * Layout C — Gallery wall. Sixteen real cards drifting behind one panel, so the first
 * thing the page says is what the product makes rather than what it is for.
 *
 * **The band is dark in both schemes and the panel is not.** A gallery is a dark room,
 * and the wall shows light and dark cards side by side, which only reads against one
 * ground. The panel is the page's own surface and follows the reader's scheme as every
 * other control on the site does — a permanently white form in a dark-mode page would be
 * the brightest thing on it.
 *
 * The nav sits inside the band rather than above it, which is why `.theme-dark` wraps it:
 * the shared component is unchanged and the band re-points the palette underneath it.
 * docs/design/site/c-gallery-wall.dc.html.
 */
export function HeroC() {
  return (
    <>
      <div className="theme-dark">
        <Nav />
      </div>

      <section
        className="relative flex min-h-205 shrink-0 items-center justify-center overflow-hidden px-4 py-16 sm:px-10 sm:py-20"
        style={{ backgroundColor: COLORS.dark.surface }}
      >
        <GalleryWall />
        <GeneratorPanel />
      </section>
    </>
  );
}
