import { BlogNav } from '@/components/blog/blog-nav';
import { Footer } from '@/components/landing/landing';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-text">
      <BlogNav />
      {children}
      <Footer />
    </div>
  );
}
