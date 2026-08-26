import assert from "node:assert/strict";
import test from "node:test";

import { NotFairPostHero } from "../dist/react.js";

const post = {
  title: "A practical resource guide",
  image_url: "https://notfair.co/api/seo/og?postId=32",
};

test("NotFairPostHero always renders the cover before the article title", () => {
  const hero = NotFairPostHero({ post });
  const [cover, title] = hero.props.children;

  assert.equal(title.type, "h1");
  assert.equal(cover.props.src, post.image_url);
  assert.equal(cover.props.alt, post.title);
  assert.equal(cover.props.width, 1600);
  assert.equal(cover.props.height, 900);
  assert.equal(title.props.children, post.title);
});

test("NotFairPostHero keeps host styling hooks optional", () => {
  const hero = NotFairPostHero({
    post,
    className: "article-header",
    imageClassName: "article-cover",
    titleClassName: "article-title",
    priority: false,
  });
  const [cover, title] = hero.props.children;

  assert.equal(hero.props.className, "article-header");
  assert.equal(cover.props.className, "article-cover");
  assert.equal(title.props.className, "article-title");
  assert.equal(cover.props.priority, false);
});
