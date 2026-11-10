import { Footer } from "@/app/site/footer";
import { GeneratorProvider } from "@/app/site/generator/context";
import { GeneratorFound } from "@/app/site/generator/found";
import { Hero } from "@/app/site/hero";
import { SnippetPitch } from "@/app/site/snippet-pitch";
import { TechIndex } from "@/app/site/tech-index";
import { EXAMPLE_REPO, pictureSnippet } from "@/lib/site";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <GeneratorProvider>
        <Hero />
        <GeneratorFound />
      </GeneratorProvider>

      <SnippetPitch snippet={pictureSnippet(EXAMPLE_REPO.owner, EXAMPLE_REPO.repo, "tiles")} />

      <TechIndex />
      <Footer />
    </div>
  );
}
