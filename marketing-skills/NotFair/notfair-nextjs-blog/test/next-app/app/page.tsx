import { NotFairPostHero } from "notfair-nextjs-blog/react";

export default function Page() {
  return (
    <main>
      <NotFairPostHero
        post={{
          title: "A practical resource guide",
          image_url: "https://notfair.co/api/seo/og?postId=32",
        }}
      />
    </main>
  );
}
