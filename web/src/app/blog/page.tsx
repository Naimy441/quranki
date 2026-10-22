import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PostCover } from '@/components/blog/post-cover';
import { POSTS, formatPostDate } from '@/lib/blog/posts';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Blog: Guides to Learning Quranic Arabic',
  description:
    'Data-backed guides to learning Quranic Arabic: the most common words in the Quran, how many words you need, how long it takes, spaced repetition, and hifz revision.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/blog`,
    title: 'Quranki Blog: Guides to Learning Quranic Arabic',
    description: 'Data-backed guides to understanding and memorizing the Quran.',
  },
};

export default function BlogIndex() {
  const [featured, ...rest] = POSTS;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITE_URL}/blog#blog`,
    name: `${SITE_NAME} Blog`,
    url: `${SITE_URL}/blog`,
    publisher: { '@id': `${SITE_URL}/#organization` },
    blogPost: POSTS.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.published,
      dateModified: p.updated,
    })),
  };

  return (
    <main className="pt-32 sm:pt-40 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem]">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute left-1/2 top-[-14rem] h-[34rem] w-[56rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">The Quranki blog</p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl leading-[1.02] tracking-[-0.02em] text-balance">
            Learn the Quran&rsquo;s Arabic, <span className="italic text-primary">with real numbers.</span>
          </h1>
          <p className="mt-5 text-lg text-textSecondary text-pretty">
            Practical guides built on word-frequency data from all 77,399 words of the Quran. What to learn first, how
            long it takes, and how to make it stick.
          </p>
        </header>

        <Link href={`/blog/${featured.slug}`} className="group mt-14 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <PostCover post={featured} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lift" />
          <div>
            <PostMetaLine published={featured.published} minutes={featured.readMinutes} />
            <h2 className="mt-3 font-display text-3xl sm:text-4xl leading-tight tracking-tight text-balance group-hover:text-primary transition-colors">
              {featured.title}
            </h2>
            <p className="mt-3 text-textSecondary text-pretty">{featured.excerpt}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Read the guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        <div className="mt-20 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col">
              <PostCover post={post} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lift" />
              <PostMetaLine className="mt-5" published={post.published} minutes={post.readMinutes} />
              <h2 className="mt-2 text-lg font-semibold leading-snug text-balance group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-textSecondary text-pretty">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function PostMetaLine({ published, minutes, className }: { published: string; minutes: number; className?: string }) {
  return (
    <div className={`text-xs text-textMuted ${className ?? ''}`}>
      <time dateTime={published}>{formatPostDate(published)}</time> - {minutes} min read
    </div>
  );
}
