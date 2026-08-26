import assert from "node:assert/strict";
import test from "node:test";
import {
  getBlogPostWithSeoFallback,
  mergeBlogPosts,
} from "../dist/index.js";

const seoPost = {
  id: 1,
  title: "NotFair post",
  slug: "shared-slug",
  meta_description: null,
  tags: [],
  image_url: "https://example.com/image.png",
  reading_time_minutes: 2,
  published_at: null,
  created_at: "2026-08-09T00:00:00.000Z",
};

test("mergeBlogPosts preserves native posts on slug collisions", () => {
  const existing = [{ slug: "shared-slug", title: "Native post" }];
  const seoOnly = { ...seoPost, id: 2, slug: "seo-only" };

  assert.deepEqual(mergeBlogPosts(existing, [seoPost, seoOnly]), [
    { source: "existing", post: existing[0] },
    { source: "notfair", post: seoOnly },
  ]);
});

test("getBlogPostWithSeoFallback does not fetch NotFair when a native post exists", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("NotFair should not be fetched");
  };

  try {
    const native = { slug: "native", title: "Native post" };
    const result = await getBlogPostWithSeoFallback("native", async () => native);
    assert.deepEqual(result, { source: "existing", post: native });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getBlogPostWithSeoFallback returns a NotFair post after a native miss", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NOTFAIR_SEO_API_KEY;
  process.env.NOTFAIR_SEO_API_KEY = "nfbl_test";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ post: { ...seoPost, content_html: "<p>Body</p>" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  try {
    const result = await getBlogPostWithSeoFallback("shared-slug", async () => null);
    assert.equal(result?.source, "notfair");
    assert.equal(result?.post.slug, "shared-slug");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NOTFAIR_SEO_API_KEY;
    else process.env.NOTFAIR_SEO_API_KEY = originalKey;
  }
});
