'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  BookOpen,
  Volume2,
  CheckCircle2,
  Flame,
  ArrowRight,
  Eye,
  Sliders,
  Layers,
  Smartphone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  ShieldCheck,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useProgress } from '@/context/progress-context';

export default function HomePage() {
  const { hasCompletedOnboarding, account } = useProgress();

  // Interactive flashcard demo state
  const [demoFlipped, setDemoFlipped] = useState(false);
  const [demoGrade, setDemoGrade] = useState<string | null>(null);

  // Interactive reader mask demo state
  const [maskTranslations, setMaskTranslations] = useState(true);

  // FAQ open states
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const startHref = hasCompletedOnboarding ? '/learn' : '/onboarding';

  const faqs = [
    {
      q: 'How does Quranki help me understand 80% of the Quran?',
      a: "Quranic vocabulary follows Zipf's Law: out of approximately 77,400 total words in the Quran, roughly 80% of all occurrences come from just ~1,000 unique roots. Quranki's 141 levels are prioritized strictly by frequency so you unlock the highest percentage of the text in the shortest time.",
    },
    {
      q: 'What is FSRS and how is it better than traditional Anki (SM-2)?',
      a: 'FSRS (Free Spaced Repetition Scheduler) is a modern algorithm that models memory stability, difficulty, and retrievability independently. Unlike older SM-2 algorithms that rely on simple multipliers, FSRS computes your personal forgetting curve to guarantee 90% recall with fewer daily reviews.',
    },
    {
      q: 'Can I use Quranki if I cannot read Arabic yet?',
      a: 'Yes. Quranki includes the complete Qaida curriculum (Stage 0) designed specifically for beginners. It teaches the Arabic alphabet, letter joining positions, Harakat vowels, Sukoon, and Madd before introducing vocabulary.',
    },
    {
      q: 'What is Dynamic Translation Masking?',
      a: 'In traditional study, readers become reliant on English translations under every word. In Quranki, once you master a word in flashcards, its English meaning automatically hides in the Mushaf reader. This trains your brain to read authentic Arabic, while keeping hints just one click away.',
    },
    {
      q: 'Which Quran reciters are included?',
      a: 'Quranki includes synchronized word-by-word timestamps for 10 world-renowned reciters, including Sheikh Mahmoud Khalil Al-Husary, Sheikh Muhammad Siddiq Al-Minshawi, Sheikh Abdul Basit Abdul Samad, Sheikh Ibrahim Al-Dosari, Sheikh Mishary Rashid Al-Afasy, and Sheikh Saad Al-Ghamdi.',
    },
    {
      q: 'Is Quranki available on mobile devices?',
      a: 'Yes. Quranki is available on both iOS (Apple App Store) and Android (Google Play Store), featuring offline review support and cloud sync with your web account.',
    },
  ];

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Quranki',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: '1480',
        },
        downloadUrl: [
          'https://apps.apple.com/us/app/quranki/id6805386348',
          'https://play.google.com/store/apps/details?id=com.quranki.app&hl=en_US',
        ],
        featureList: [
          'FSRS Spaced Repetition for Quranic Vocabulary',
          '141 Progressive Levels covering 80% of Quran Words',
          '114 Surahs with Uthmanic Hafs Tajweed Rule Coloring',
          'Synchronized Word-by-Word Audio for 10 Famous Reciters',
          'Dynamic Translation Masking for Authentic Reading Practice',
          'The Qaida Foundation Track for Learning Arabic Letters and Vowels',
          'Asma ul-Husna (99 Names of Allah) and Arabic Numerals',
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.a,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-text select-none">
      {/* Inject JSON-LD Schema into DOM */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation Bar with Circular Logo */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/85 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Circular Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-backgroundSelected border border-border shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src="/images/Quranki.png"
                alt="Quranki Logo"
                width={36}
                height={36}
                className="w-full h-full object-cover rounded-full"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-text tracking-tight leading-none">Quranki</span>
              <span className="text-[10px] text-primary font-bold tracking-wide mt-0.5">Quran Spaced Repetition</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-textSecondary">
            <a href="#how-it-works" className="hover:text-text transition-colors">
              How It Works
            </a>
            <a href="#curriculum" className="hover:text-text transition-colors">
              Curriculum
            </a>
            <a href="#features" className="hover:text-text transition-colors">
              Features
            </a>
            <a href="#faq" className="hover:text-text transition-colors">
              FAQ
            </a>
            <a href="#mobile-apps" className="hover:text-text transition-colors">
              Mobile Apps
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            {account ? (
              <Link
                href="/learn"
                className="py-2 px-4 rounded-medium bg-primary hover:opacity-90 text-onPrimary font-bold text-xs flex items-center gap-1.5 transition-opacity shadow-xs"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="py-2 px-3 rounded-medium text-xs font-bold text-textSecondary hover:text-text transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href={startHref}
                  className="py-2 px-4 rounded-medium bg-primary hover:opacity-90 text-onPrimary font-bold text-xs flex items-center gap-1.5 transition-opacity shadow-xs"
                >
                  <span>Start Learning</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          {/* Release / Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-backgroundSelected border border-primary/25 text-xs font-bold text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>v2.0 - Available Free on Web, iOS & Android</span>
          </div>

          {/* Primary Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-text tracking-tight leading-tight max-w-4xl mx-auto">
            Understand 80% of the Quran <br className="hidden sm:inline" />
            <span className="text-primary">in 100 days.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-textSecondary max-w-2xl mx-auto leading-relaxed">
            Quranki pairs modern FSRS spaced repetition with a word-by-word Tajweed reader.
            Review high-frequency roots, hear 10 master reciters, and transition smoothly to reading
            pure Arabic.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href={startHref}
              className="w-full sm:w-auto py-3.5 px-8 rounded-medium bg-primary hover:opacity-90 text-onPrimary font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <span>Start Learning Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/quran"
              className="w-full sm:w-auto py-3.5 px-6 rounded-medium bg-card hover:bg-backgroundElement border border-border text-text font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Browse Quran Reader</span>
            </Link>
          </div>

          {/* App Store Download Badges with 4.9 Star Rating */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://apps.apple.com/us/app/quranki/id6805386348"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-4 py-2.5 rounded-medium bg-card border border-border hover:border-primary/50 text-text transition-all shadow-xs"
            >
              <Smartphone className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-[10px] text-textMuted uppercase font-bold leading-none">Download on the</div>
                <div className="text-xs font-bold leading-tight">Apple App Store</div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold pl-1 border-l border-border">
                <Star className="w-3 h-3 fill-amber-500" />
                <span>4.9</span>
              </div>
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.quranki.app&hl=en_US"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-4 py-2.5 rounded-medium bg-card border border-border hover:border-primary/50 text-text transition-all shadow-xs"
            >
              <Smartphone className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-[10px] text-textMuted uppercase font-bold leading-none">Get it on</div>
                <div className="text-xs font-bold leading-tight">Google Play</div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold pl-1 border-l border-border">
                <Star className="w-3 h-3 fill-amber-500" />
                <span>4.9</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Hero Dual Interactive Mockup Showcase */}
      <section id="how-it-works" className="py-16 bg-backgroundElement/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text">
              How Quranki Works: Flashcards + Mushaf
            </h2>
            <p className="text-xs sm:text-sm text-textSecondary max-w-xl mx-auto">
              Learn words with spaced repetition, then see them immediately reinforced inside the real Quran text.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Live Interactive Flashcard */}
            <div className="p-6 rounded-large bg-card border border-border shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-textMuted font-bold border-b border-border pb-2">
                  <span className="flex items-center gap-1 text-primary">
                    <Sparkles className="w-3.5 h-3.5" /> 1. FSRS Spaced Repetition Card
                  </span>
                  <span>Word 1 of Level 1</span>
                </div>

                <div
                  onClick={() => setDemoFlipped((prev) => !prev)}
                  className="cursor-pointer py-8 flex flex-col items-center justify-center text-center space-y-3 rounded-medium bg-backgroundElement/40 hover:bg-backgroundElement/70 transition-colors"
                >
                  <span className="uthmanic-text text-5xl font-bold text-text">
                    الرَّحْمَٰنِ
                  </span>

                  {demoFlipped ? (
                    <div className="space-y-1 animate-fadeIn">
                      <div className="text-lg font-bold text-primary">The Most Merciful</div>
                      <div className="text-xs font-mono text-textSecondary">ar-Rahmān</div>
                      <p className="text-[11px] text-textMuted pt-1">
                        Occurs 57 times - Root: ر - ح - م
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-textMuted font-bold pt-2">
                      Tap card to reveal answer
                    </div>
                  )}
                </div>
              </div>

              {demoFlipped ? (
                <div className="pt-4 border-t border-border space-y-2">
                  <div className="text-[11px] text-textSecondary font-bold text-center">
                    Rate recall to schedule next review:
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'Again', time: '< 10m', bg: 'bg-gradeAgain' },
                      { label: 'Hard', time: '1d', bg: 'bg-gradeHard' },
                      { label: 'Good', time: '4d', bg: 'bg-gradeGood' },
                      { label: 'Easy', time: '7d', bg: 'bg-gradeEasy' },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => {
                          setDemoGrade(btn.label);
                          setTimeout(() => {
                            setDemoFlipped(false);
                            setDemoGrade(null);
                          }, 1000);
                        }}
                        className={`py-2 px-1 rounded-small ${btn.bg} text-white flex flex-col items-center justify-center text-center transition-opacity hover:opacity-90`}
                      >
                        <span className="text-xs font-bold">{btn.label}</span>
                        <span className="text-[10px] opacity-80">{btn.time}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center pt-3 text-xs text-textMuted font-medium border-t border-border">
                  Card intervals automatically adapt to your memory strength
                </div>
              )}
            </div>

            {/* Live Interactive Mushaf Masking Preview */}
            <div className="p-6 rounded-large bg-card border border-border shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-textMuted font-bold border-b border-border pb-2">
                  <span className="flex items-center gap-1 text-primary">
                    <BookOpen className="w-3.5 h-3.5" /> 2. Real Mushaf Reinforcement
                  </span>
                  <span>Surah Al-Fatihah 1:1 - 1:3</span>
                </div>

                <div className="py-6 px-4 rounded-medium bg-backgroundElement/40 space-y-5 text-right" dir="rtl">
                  {/* Ayah 1 */}
                  <div className="flex flex-wrap items-center justify-start gap-3">
                    <div className="text-center">
                      <span className="uthmanic-text text-2xl font-bold text-text block">بِسْمِ</span>
                      <span className="text-[10px] text-textSecondary font-sans block mt-0.5">
                        {maskTranslations ? <span className="text-primary font-bold">hint</span> : 'In the name of'}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="uthmanic-text text-2xl font-bold text-text block">اللَّهِ</span>
                      <span className="text-[10px] text-textSecondary font-sans block mt-0.5">
                        {maskTranslations ? <span className="text-primary font-bold">hint</span> : 'Allah'}
                      </span>
                    </div>

                    <div className="text-center bg-backgroundSelected/60 px-2 py-1 rounded-small border border-primary/20">
                      <span className="uthmanic-text text-2xl font-bold text-primary block">الرَّحْمَٰنِ</span>
                      <span className="text-[10px] text-primary font-bold font-sans block mt-0.5">
                        {maskTranslations ? 'hint' : 'the Most Merciful'}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="uthmanic-text text-2xl font-bold text-text block">الرَّحِيمِ</span>
                      <span className="text-[10px] text-textSecondary font-sans block mt-0.5">
                        {maskTranslations ? <span className="text-primary font-bold">hint</span> : 'the Entirely Merciful'}
                      </span>
                    </div>

                    <span className="uthmanic-text text-2xl text-textMuted">١</span>
                  </div>

                  {/* Ayah 2 */}
                  <div className="flex flex-wrap items-center justify-start gap-3 pt-2 border-t border-border/40">
                    <div className="text-center">
                      <span className="uthmanic-text text-2xl font-bold text-text block">الْحَمْدُ</span>
                      <span className="text-[10px] text-textSecondary font-sans block mt-0.5">
                        {maskTranslations ? <span className="text-primary font-bold">hint</span> : 'All praise'}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="uthmanic-text text-2xl font-bold text-text block">لِلَّهِ</span>
                      <span className="text-[10px] text-textSecondary font-sans block mt-0.5">
                        {maskTranslations ? <span className="text-primary font-bold">hint</span> : 'is for Allah'}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="uthmanic-text text-2xl font-bold text-text block">رَبِّ</span>
                      <span className="text-[10px] text-textSecondary font-sans block mt-0.5">
                        {maskTranslations ? <span className="text-primary font-bold">hint</span> : 'Lord'}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="uthmanic-text text-2xl font-bold text-text block">الْعَالَمِينَ</span>
                      <span className="text-[10px] text-textSecondary font-sans block mt-0.5">
                        {maskTranslations ? <span className="text-primary font-bold">hint</span> : 'of the worlds'}
                      </span>
                    </div>

                    <span className="uthmanic-text text-2xl text-textMuted">٢</span>
                  </div>
                </div>
              </div>

              {/* Translation Mask Toggle */}
              <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="text-textSecondary">Dynamic Vocabulary Masking:</span>
                <button
                  type="button"
                  onClick={() => setMaskTranslations((prev) => !prev)}
                  className={`py-1.5 px-3 rounded-small font-bold text-xs transition-colors ${
                    maskTranslations
                      ? 'bg-backgroundSelected text-primary border border-primary/20'
                      : 'bg-backgroundElement text-textSecondary'
                  }`}
                >
                  {maskTranslations ? 'Learned Words Masked (Hints)' : 'All Translations Shown'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 80/20 Math Section */}
      <section className="py-20 max-w-5xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">The Zipf Law of Quranic Arabic</span>
          <h2 className="text-3xl font-extrabold text-text tracking-tight">
            The First Words Go a Long Way
          </h2>
          <p className="text-sm text-textSecondary max-w-xl mx-auto">
            The Quran contains ~77,400 words, but high-frequency vocabulary repeats hundreds of times.
            Mastering just the most frequent roots unlocks the majority of the text.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-large bg-card border border-border space-y-2 shadow-xs text-center">
            <div className="text-4xl font-black text-primary">80%</div>
            <div className="text-sm font-bold text-text">Quran Vocabulary Coverage</div>
            <p className="text-xs text-textSecondary leading-relaxed">
              Achieved by mastering the high-frequency roots organized across 141 levels.
            </p>
          </div>

          <div className="p-6 rounded-large bg-card border border-border space-y-2 shadow-xs text-center">
            <div className="text-4xl font-black text-primary">141</div>
            <div className="text-sm font-bold text-text">Bite-sized Levels</div>
            <p className="text-xs text-textSecondary leading-relaxed">
              Each level contains 10 to 15 words with authentic Quranic context sentences.
            </p>
          </div>

          <div className="p-6 rounded-large bg-card border border-border space-y-2 shadow-xs text-center">
            <div className="text-4xl font-black text-primary">10</div>
            <div className="text-sm font-bold text-text">Synchronized Reciters</div>
            <p className="text-xs text-textSecondary leading-relaxed">
              Word-level audio timestamps for Sheikh Al-Husary, Al-Minshawi, and more.
            </p>
          </div>
        </div>
      </section>

      {/* Curriculum Roadmap */}
      <section id="curriculum" className="py-16 bg-backgroundElement/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-6 space-y-10 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-text">Structured Curriculum Roadmap</h2>
            <p className="text-xs sm:text-sm text-textSecondary max-w-lg mx-auto">
              Progress systematically from Arabic phonetics to complete vocabulary mastery
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left">
            <div className="p-5 rounded-large bg-card border border-border space-y-2 hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-backgroundSelected text-primary">
                Stage 0
              </span>
              <h4 className="font-bold text-sm text-text">The Qaida (19 Levels)</h4>
              <p className="text-xs text-textSecondary">
                Arabic alphabet, joint letter shapes, Harakat vowels, Tanween, Sukoon, and Madd.
              </p>
            </div>

            <div className="p-5 rounded-large bg-card border border-border space-y-2 hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-backgroundSelected text-primary">
                Stage 1
              </span>
              <h4 className="font-bold text-sm text-text">Thematic Core (Levels 1 - 47)</h4>
              <p className="text-xs text-textSecondary">
                The original curated curriculum covering ~20% of Quran word occurrences.
              </p>
            </div>

            <div className="p-5 rounded-large bg-card border border-border space-y-2 hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-backgroundSelected text-primary">
                Stage 2
              </span>
              <h4 className="font-bold text-sm text-text">Asma ul-Husna (Levels 48 - 60)</h4>
              <p className="text-xs text-textSecondary">
                The 99 Beautiful Names of Allah paired with Quran verses and Arabic numerals.
              </p>
            </div>

            <div className="p-5 rounded-large bg-card border border-border space-y-2 hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-backgroundSelected text-primary">
                Stage 3
              </span>
              <h4 className="font-bold text-sm text-text">High Frequency (5+ times)</h4>
              <p className="text-xs text-textSecondary">
                Every word appearing 5 or more times in the Quran, organized by root family.
              </p>
            </div>

            <div className="p-5 rounded-large bg-card border border-border space-y-2 hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-backgroundSelected text-primary">
                Stage 4
              </span>
              <h4 className="font-bold text-sm text-text">Mid Frequency (2 - 4 times)</h4>
              <p className="text-xs text-textSecondary">
                Deepens vocabulary coverage toward 80% with contextual verse examples.
              </p>
            </div>

            <div className="p-5 rounded-large bg-card border border-border space-y-2 hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-backgroundSelected text-primary">
                Stage 5
              </span>
              <h4 className="font-bold text-sm text-text">Deep Vocabulary (Occurs once)</h4>
              <p className="text-xs text-textSecondary">
                Hapax legomena and unique Quranic expressions for complete reader mastery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section id="features" className="py-20 max-w-5xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-text tracking-tight">
            Designed for Genuine Retention
          </h2>
          <p className="text-sm text-textSecondary max-w-xl mx-auto">
            Everything in Quranki is engineered around long-term memory and authentic Quran reading.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-large bg-card border border-border space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-medium bg-backgroundSelected text-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-text">Modern FSRS Engine</h3>
            <p className="text-xs text-textSecondary leading-relaxed">
              Based on the Free Spaced Repetition Scheduler, review intervals adapt to your individual
              memory retention curve, saving hours of unnecessary review time.
            </p>
          </div>

          <div className="p-6 rounded-large bg-card border border-border space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-medium bg-backgroundSelected text-primary flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-text">Adaptive Translation Masking</h3>
            <p className="text-xs text-textSecondary leading-relaxed">
              Once you master a word, its translation hides in the reader. The Mushaf looks like an authentic
              copy while allowing you to tap for hints whenever needed.
            </p>
          </div>

          <div className="p-6 rounded-large bg-card border border-border space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-medium bg-backgroundSelected text-primary flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-text">Word-by-Word Audio</h3>
            <p className="text-xs text-textSecondary leading-relaxed">
              Tap any word in any Surah to hear its pronunciation. Listen to full ayah recitations with
              real-time word highlighting across 10 world-class reciters.
            </p>
          </div>

          <div className="p-6 rounded-large bg-card border border-border space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-medium bg-backgroundSelected text-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-text">Uthmanic Hafs Font & Tajweed</h3>
            <p className="text-xs text-textSecondary leading-relaxed">
              Rendered with the authentic Uthmanic Hafs v18 font, traditional rosette ayah end markers,
              and color-coded Tajweed rules for Ghunnah, Qalqalah, Ikhfa, and Madd.
            </p>
          </div>

          <div className="p-6 rounded-large bg-card border border-border space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-medium bg-backgroundSelected text-primary flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-text">The Qaida Beginner Track</h3>
            <p className="text-xs text-textSecondary leading-relaxed">
              Cannot read Arabic script yet? The built-in Qaida curriculum teaches individual letters,
              consonant connectors, vowels, Sukoon, and Madd before starting vocabulary.
            </p>
          </div>

          <div className="p-6 rounded-large bg-card border border-border space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-medium bg-backgroundSelected text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-text">Cross-Device Cloud Sync</h3>
            <p className="text-xs text-textSecondary leading-relaxed">
              Review on your desktop during work, on your phone on the train, and keep your streaks,
              mastered roots, and bookmarks in perfect sync.
            </p>
          </div>
        </div>
      </section>

      {/* App Screenshots Showcase */}
      <section className="py-16 bg-backgroundElement/30 border-y border-border overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 space-y-8 text-center">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Mobile & Desktop Parity</span>
            <h2 className="text-3xl font-extrabold text-text">Built to Feel Native Everywhere</h2>
            <p className="text-xs sm:text-sm text-textSecondary max-w-md mx-auto">
              Enjoy the exact same sleek dark aesthetic, gestures, and typography on web and native apps
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="rounded-large overflow-hidden border border-border bg-card shadow-md">
              <Image
                src="/images/screenshots/app-1.jpg"
                alt="Quranki Mobile App - Curriculum"
                width={360}
                height={780}
                className="w-full h-auto object-cover"
              />
              <div className="p-3 text-center text-xs font-bold text-text">
                Sequential Curriculum & Stages
              </div>
            </div>

            <div className="rounded-large overflow-hidden border border-border bg-card shadow-md">
              <Image
                src="/images/screenshots/app-2.jpg"
                alt="Quranki Mobile App - Word by Word Reader"
                width={360}
                height={780}
                className="w-full h-auto object-cover"
              />
              <div className="p-3 text-center text-xs font-bold text-text">
                Word-by-Word Tajweed Reader
              </div>
            </div>

            <div className="rounded-large overflow-hidden border border-border bg-card shadow-md">
              <Image
                src="/images/screenshots/app-3.jpg"
                alt="Quranki Mobile App - Flashcards"
                width={360}
                height={780}
                className="w-full h-auto object-cover"
              />
              <div className="p-3 text-center text-xs font-bold text-text">
                FSRS Flashcard Review Sessions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 max-w-3xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Questions & Answers</span>
          <h2 className="text-3xl font-extrabold text-text tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-textSecondary">
            Everything you need to know about Quranki, spaced repetition, and our curriculum.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-large bg-card border border-border overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 hover:bg-backgroundElement/40 transition-colors"
                >
                  <span className="text-sm font-bold text-text">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-textMuted shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-textSecondary leading-relaxed border-t border-border/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Mobile Apps CTA Section */}
      <section id="mobile-apps" className="py-16 max-w-4xl mx-auto px-6 text-center">
        <div className="p-8 sm:p-12 rounded-large bg-card border border-border shadow-xs space-y-6">
          <div className="w-14 h-14 rounded-full bg-backgroundSelected border border-border flex items-center justify-center mx-auto text-primary">
            <Smartphone className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-text">
              Study Anywhere with the Mobile Apps
            </h2>
            <p className="text-xs sm:text-sm text-textSecondary">
              Practice during your commute, review cards offline, and sync your progress seamlessly across devices.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="https://apps.apple.com/us/app/quranki/id6805386348"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-3 px-6 rounded-medium bg-primary hover:opacity-90 text-onPrimary font-bold text-xs flex items-center justify-center gap-2 transition-opacity shadow-xs"
            >
              <span>Download on Apple App Store</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.quranki.app&hl=en_US"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-3 px-6 rounded-medium bg-backgroundElement hover:bg-backgroundSelected text-text font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-border"
            >
              <span>Get it on Google Play</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer with Circular Logo */}
      <footer className="border-t border-border py-12 bg-backgroundElement/20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-textSecondary">
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-backgroundSelected border border-border flex items-center justify-center shrink-0">
              <Image
                src="/images/Quranki.png"
                alt="Quranki Logo"
                width={28}
                height={28}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <span className="font-bold text-text">Quranki</span>
            <span>-</span>
            <span>Quran Spaced Repetition & Reader</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/learn" className="hover:text-text transition-colors">
              Curriculum
            </Link>
            <Link href="/quran" className="hover:text-text transition-colors">
              Quran Reader
            </Link>
            <Link href="/progress" className="hover:text-text transition-colors">
              Progress
            </Link>
            <Link href="/settings" className="hover:text-text transition-colors">
              Settings
            </Link>
            <Link href="/sign-in" className="hover:text-text transition-colors">
              Account
            </Link>
          </div>

          <div className="text-textMuted">
            &copy; {new Date().getFullYear()} Quranki. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
