import { readFileSync } from "node:fs";
import { join } from "node:path";

type SatoriFont = {
  name: string;
  data: Buffer;
  weight: 400 | 600 | 700;
  style: "normal";
};

// Commit Mono still ships 400 and 700 only, so every style's mono 600 becomes 700 on the
// way in. Archivo now carries 400/600/700: the tile symbol is Tiles' signature at 64
// units and 600 is visibly light there, while tile names at 23 units take 400 because the
// designs' 500 is indistinguishable at any display ratio we render for. GOTCHAS 014, 047.

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
  {
    name: "Archivo",
    data: readFileSync(join(dir, "Archivo-Bold.ttf")),
    weight: 700,
    style: "normal",
  },
];
