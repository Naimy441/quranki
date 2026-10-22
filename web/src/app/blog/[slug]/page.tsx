import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Plus } from 'lucide-react';
import { PostCover } from '@/components/blog/post-cover';
import { POST_BODIES } from '@/components/blog/posts';
import { POSTS, formatPostDate, getPost } from '@/lib/blog/posts';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: post.seoTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.published,
      modifiedTime: post.updated,
      section: post.category,
      tags: post.keywords,
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  const body = POST_BODIES[slug];
  if (!post || !body) notFound();
  const { Content, toc } = body;
  const url = `${SITE_URL}/blog/${post.slug}`;
  const related = POSTS.filter((p) => p.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: post.title,
        description: post.description,
        image: `${url}/opengraph-image`,
        datePublished: post.published,
        dateModified: post.updated,
        author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        publisher: { '@id': `${SITE_URL}/#organization` },
        mainEntityOfPage: url,
        keywords: post.keywords.join(', '),
        articleSection: post.category,
        inLanguage: 'en',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  return (
    <main className="pt-28 sm:pt-36 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]">
        <div className="absolute left-1/2 top-[-16rem] h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <article>
        <header className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-textMuted">
            <Link href="/" className="hover:text-text">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/blog" className="hover:text-text">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-textSecondary">{post.category}</span>
          </nav>
          <h1 className="mt-5 max-w-4xl font-display text-[2.6rem] leading-[1.03] sm:text-6xl tracking-[-0.02em] text-balance">
            {post.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-textSecondary text-pretty">{post.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-textMuted">
            <span className="font-medium text-textSecondary">By the {SITE_NAME} team</span>
            <span aria-hidden>-</span>
            <time dateTime={post.updated}>Updated {formatPostDate(post.updated)}</time>
            <span aria-hidden>-</span>
            <span>{post.readMinutes} min read</span>
          </div>
          <PostCover post={post} size="hero" className="mt-10 shadow-soft" />
        </header>

        <div className="mx-auto mt-14 grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0 max-w-[44rem] prose-blog">
            <Content />

            <h2 id="faq">Frequently asked questions</h2>
            <div className="not-prose mt-6 divide-y divide-border rounded-large border border-border bg-card">
              {post.faqs.map((f) => (
                <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-text">
                    {f.q}
                    <Plus className="h-4 w-4 shrink-0 text-textMuted transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-textSecondary">{f.a}</p>
                </details>
              ))}
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <div className="text-xs font-semibold uppercase tracking-wider text-textMuted">On this page</div>
              <ul className="mt-4 space-y-2 border-l border-border text-sm">
                {[...toc, { id: 'faq', label: 'FAQ' }].map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="-ml-px block border-l border-transparent pl-4 text-textSecondary hover:border-primary hover:text-text transition-colors">
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </article>

      <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Keep reading</h2>
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group">
              <PostCover post={p} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
              <div className="mt-4 text-base font-semibold leading-snug text-balance group-hover:text-primary transition-colors">
                {p.title}
              </div>
              <div className="mt-1 text-xs text-textMuted">{p.readMinutes} min read</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
