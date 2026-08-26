import Image from "next/image.js";
import type { CSSProperties } from "react";
import type { SeoPostSummary } from "./index.js";

export type NotFairPostHeroProps = {
  /** A full post or summary returned by notfair-nextjs-blog. */
  post: Pick<SeoPostSummary, "image_url" | "title">;
  className?: string;
  imageClassName?: string;
  titleClassName?: string;
  /** Above-the-fold article heroes should keep the default eager priority. */
  priority?: boolean;
  /** Responsive image hint passed to next/image. */
  sizes?: string;
  imageStyle?: CSSProperties;
};

/**
 * Canonical NotFair article header. It deliberately owns only the cover and
 * title so host apps retain control of their typography and sanitized article
 * body. The cover is always the first visible element.
 *
 * Import from `notfair-nextjs-blog/react`; the root data-client export remains
 * UI-free and fully backward compatible.
 */
export function NotFairPostHero({
  post,
  className,
  imageClassName,
  titleClassName,
  priority = true,
  sizes = "(max-width: 768px) 100vw, 1200px",
  imageStyle,
}: NotFairPostHeroProps) {
  return (
    <header className={className}>
      <Image
        src={post.image_url}
        alt={post.title}
        width={1600}
        height={900}
        sizes={sizes}
        priority={priority}
        className={imageClassName}
        style={{ width: "100%", height: "auto", ...imageStyle }}
      />
      <h1 className={titleClassName}>{post.title}</h1>
    </header>
  );
}
