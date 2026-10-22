import { POSTS, getPost } from '@/lib/blog/posts';
import { OG_SIZE, renderOgCard } from '@/lib/blog/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Quranki blog';

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug)!;
  return renderOgCard({ eyebrow: post.category, title: post.title, stat: post.stat.value, statLabel: post.stat.label });
}
