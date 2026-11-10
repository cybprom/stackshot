import { GeneratorPanel } from "@/app/site/generator/panel";
import { Nav } from "@/app/site/nav";
import { GalleryWall, WallCaption } from "@/app/site/wall";

/**
 * Real cards behind one panel. The band is dark in both schemes, because a gallery is a
 * dark room; the panel inside re-pins itself light. The panel sits at a fixed top so
 * anything that changes its height only ever pushes downward.
 */
export function Hero() {
  return (
    <>
      <Nav />

      <section className="hero-band theme-dark relative -mt-18 flex min-h-[max(820px,100dvh)] shrink-0 flex-col items-center overflow-hidden px-3 pb-14 pt-30 sm:px-10 sm:pt-32">
        <GalleryWall />
        <GeneratorPanel />
        <WallCaption />
      </section>
    </>
  );
}
