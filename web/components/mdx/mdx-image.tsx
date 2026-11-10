import fs from "node:fs";
import path from "node:path";

import { imageSize } from "image-size";
import type { ComponentPropsWithoutRef } from "react";

import { ZoomImage } from "./zoom-image";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/**
 * Intrinsic size of a site-local image (`/images/...` under web/public), read
 * at build time. Remote or unreadable images return undefined.
 */
export function localImageSize(
  src: string,
): { width: number; height: number } | undefined {
  if (!src.startsWith("/") || src.startsWith("//")) return undefined;
  try {
    // decodeURI throws on a bad escape such as `/100%.png`.
    const file = path.join(PUBLIC_DIR, decodeURI(src.split(/[?#]/)[0]!));
    if (!file.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(file)) {
      return undefined;
    }
    const { width, height } = imageSize(fs.readFileSync(file));
    return width && height ? { width, height } : undefined;
  } catch {
    return undefined;
  }
}

/** Markdown `![alt](src "title")` in posts: a zoomable, lazy image. */
export function MdxImage({
  src,
  alt = "",
  title,
}: ComponentPropsWithoutRef<"img">) {
  if (typeof src !== "string" || !src) return null;
  const size = localImageSize(src);
  return <ZoomImage src={src} alt={alt} title={title} {...size} />;
}
