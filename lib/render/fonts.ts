import { readFileSync } from "node:fs";
import { join } from "node:path";

type SatoriFont = {
  name: string;
  data: Buffer;
  weight: 400 | 600 | 700;
  style: "normal";
};

const dir = join(process.cwd(), "public", "fonts");

// Read at module scope and never at request time (I7). TTF not OTF — the release
// OTFs carry an ltag table Satori cannot parse. GOTCHAS 015.
export const FONTS: SatoriFont[] = [
  {
    name: "Commit Mono",
    data: readFileSync(join(dir, "CommitMono-400-Regular.ttf")),
    weight: 400,
    style: "normal",
  },
  {
    name: "Commit Mono",
    data: readFileSync(join(dir, "CommitMono-700-Regular.ttf")),
    weight: 700,
    style: "normal",
  },
  {
    name: "Archivo",
    data: readFileSync(join(dir, "Archivo-Regular.ttf")),
    weight: 400,
    style: "normal",
  },
  {
    name: "Archivo",
    data: readFileSync(join(dir, "Archivo-SemiBold.ttf")),
    weight: 600,
    style: "normal",
  },
];
