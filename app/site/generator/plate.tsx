"use client";

import { CardPlate } from "@/app/preview/card-plate";
import { useGenerator } from "@/app/site/generator/context";

/** One slot, contents swapped, so the page does not move when it answers you. */
export function GeneratorPlate() {
  const { doc, phase, onSettled, style, mode, png, placeholder } = useGenerator();

  return (
    <figure className="w-full">
      <CardPlate
        doc={doc}
        busy={phase === "reading"}
        reveal={phase === "drawing"}
        onSettled={onSettled}
        style={style}
        mode={mode}
        png={png}
        placeholder={placeholder}
      />
    </figure>
  );
}
