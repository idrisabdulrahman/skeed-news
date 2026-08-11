import React from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { StoryCard } from "@/components/StoryCard";
import { BiasDemo } from "@/components/BiasDemo";
import { getTopArticles, getLatestArticleFallback } from "@/lib/supabase/queries/articles";

// Read fresh from Supabase for the Latest Briefings section (section 6).
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Landing page: 9 sections, 8 layout families                       */
/*  Theme: light only, paper white, hairline rules, cobalt accent     */
/*  No em-dashes, no en-dashes, no emoji, no gradients, no glass      */
/* ------------------------------------------------------------------ */

// ---- Inline SVG icons (2px stroke, rounded caps, Heroicons style) ----

const ArrowRightIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const BoltIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
  </svg>
);

const GlobeIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ShieldCheckIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const ChartBarIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20V10M18 20V4M6 20v-4" />
  </svg>
);

// ---- Static data ----

const TICKER_ITEMS = [
  { category: "Markets", headline: "Fed holds rates as inflation cools", sentiment: "Neutral" },
  { category: "Europe", headline: "Grid operators weigh winter reserve plan", sentiment: "Negative" },
  { category: "Tech", headline: "Export rules tighten on advanced chips", sentiment: "Negative" },
  { category: "Climate", headline: "Coastal cities map adaptation budgets", sentiment: "Positive" },
];

const METHOD_STEPS = [
  {
    num: "01",
    title: "We gather",
    body: "Oxylabs Scheduler pulls each active source's homepage every hour. Candidate links are filtered, deduped, and validated before a single detail page is fetched.",
    icon: GlobeIcon,
    image: "https://picsum.photos/seed/skeem-gather/800/520",
    alt: "Source homepages being collected from the web",
  },
  {
    num: "02",
    title: "We verify",
    body: "Each article passes a content gate: real body text, a published date, an image, an article-specific URL. Only valid stories enter the pipeline.",
    icon: ShieldCheckIcon,
    image: "https://picsum.photos/seed/skeem-verify/800/520",
    alt: "Article details being checked against the content gate",
  },
  {
    num: "03",
    title: "We explain",
    body: "A language model reads the full text and returns sentiment, left-center-right percentages, loaded terms, and a confidence score. All saved, all visible.",
    icon: ChartBarIcon,
    image: "https://picsum.photos/seed/skeem-explain/800/520",
    alt: "Analysis results with sentiment and framing breakdown",
  },
];

const SOURCES = [
  { name: "Reuters", seed: "skeem-reuters" },
  { name: "AP News", seed: "skeem-ap" },
  { name: "BBC", seed: "skeem-bbc" },
  { name: "NPR", seed: "skeem-npr" },
  { name: "The Guardian", seed: "skeem-guardian" },
  { name: "Financial Times", seed: "skeem-ft" },
];

const AUDIENCE_ITEMS = [
  {
    num: "01",
    title: "For investors",
    body: "See the sentiment behind policy and macro stories before the open.",
  },
  {
    num: "02",
    title: "For founders",
    body: "Track how your sector is framed across outlets without reading five newsletters.",
  },
  {
    num: "03",
    title: "For researchers",
    body: "A reproducible record of how a topic was framed, with confidence scores attached.",
  },
  {
    num: "04",
    title: "For busy readers",
    body: "A morning briefing that respects your time and shows its work.",
  },
];

// ---- Sections ----

function HeroSection() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-14 lg:gap-20 items-center py-16 lg:py-24">
      <div className="lg:pr-4">
        <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-5">
          AI news analysis · global coverage
        </p>
        <h1 className="text-display font-bold tracking-tight leading-[1.08]">
          News, decoded
          <br />
          <span className="text-text-secondary">in real time.</span>
        </h1>
        <p className="mt-6 text-body-large text-text-secondary leading-relaxed max-w-[52ch]">
          Skeem gathers headlines from global sources, checks them against the
          source text, and returns a fact-aware summary with the framing made
          visible. Built for readers who act on the news.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 h-11 px-6 bg-text-primary text-bg-app text-body-small font-medium rounded-brand-sm transition-all duration-200 hover:bg-accent-app hover:text-on-accent active:translate-y-px"
          >
            Read the briefing
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
          <Link
            href="#method"
            className="inline-flex items-center gap-2 h-11 px-6 border border-border-strong text-text-primary text-body-small font-medium rounded-brand-sm transition-colors duration-200 hover:border-text-tertiary hover:text-accent-app active:translate-y-px"
          >
            See how it works
          </Link>
        </div>
        <p className="mt-8 text-caption text-text-quaternary">
          Updated hourly · Fact-aware summaries · Framing shown, not hidden
        </p>
      </div>

      {/* Layered editorial composition: photo behind, analysis card in front */}
      <div className="relative">
        <div className="aspect-[4/3] border border-border-subtle rounded-brand-md overflow-hidden">
          <img
            src="https://picsum.photos/seed/skeem-hero-v2/800/600"
            alt="Newsroom desk with printed briefings"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
        <div className="relative -mt-28 ml-auto w-[88%] lg:w-[74%] border border-border-strong bg-bg-app rounded-brand-md p-6">
          <p className="text-caption text-text-quaternary tabular-nums">
            Reuters · Markets
          </p>
          <h2 className="mt-2 text-h3 font-bold tracking-tight text-text-primary">
            Fed holds rates as inflation cools
          </h2>
          <p className="mt-2 text-body-small text-text-secondary leading-relaxed">
            Leads with consumer confidence before the rate decision, softening
            the headline.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <div className="h-1 bg-info rounded-brand-full" />
              <p className="mt-1.5 text-caption text-text-tertiary tabular-nums">Left 28%</p>
            </div>
            <div>
              <div className="h-1 bg-success rounded-brand-full" />
              <p className="mt-1.5 text-caption text-text-tertiary tabular-nums">Center 44%</p>
            </div>
            <div>
              <div className="h-1 bg-trending rounded-brand-full" />
              <p className="mt-1.5 text-caption text-text-tertiary tabular-nums">Right 28%</p>
            </div>
          </div>
          <p className="mt-4 text-caption text-text-quaternary">
            AI-estimated · Confidence 0.91
          </p>
        </div>
      </div>
    </section>
  );
}

function LiveTickerSection() {
  return (
    <section className="border-y border-border-strong">
      <div className="brand-container py-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-accent-app opacity-40 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-accent-app" />
          </span>
          <p className="text-caption text-text-primary font-semibold uppercase tracking-widest">
            Live now
          </p>
          <p className="text-caption text-text-quaternary">
            Sampled from today&apos;s pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
          {TICKER_ITEMS.map((item) => (
            <div key={item.headline} className="border-l-2 border-border-subtle pl-4">
              <p className="text-caption text-text-quaternary uppercase tracking-widest">
                {item.category}
              </p>
              <p className="mt-1.5 text-body-small font-medium text-text-primary leading-snug">
                {item.headline}
              </p>
              <p className="mt-2 text-caption text-text-tertiary">
                Sentiment: {item.sentiment}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnalysisShowcaseSection() {
  return (
    <section className="py-20">
      <div className="mb-14">
        <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-3">
          Analysis
        </p>
        <h2 className="text-h2 font-bold tracking-tight">
          What an analysis looks like
        </h2>
        <p className="mt-3 text-body-medium text-text-secondary leading-relaxed max-w-[52ch]">
          Every story gets a summary, a sentiment label, a left-center-right
          breakdown, and a confidence score. No black box: the model&apos;s
          reasoning is shown, and the uncertainty is shown too.
        </p>
      </div>

      {/* Editorial bento: 1.5fr tall interactive cell + 1fr stacked cells */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
        <BiasDemo />

        <div className="grid grid-rows-2 gap-6">
          <div className="border border-border-subtle rounded-brand-md p-8 flex flex-col justify-center">
            <p className="text-caption text-text-tertiary uppercase tracking-widest mb-4">
              Framing notes
            </p>
            <p className="text-body-small text-text-secondary leading-relaxed italic">
              &ldquo;Leads with consumer confidence before the rate decision,
              softening the headline. &lsquo;Cools&rsquo; frames the hold as a win.&rdquo;
            </p>
          </div>

          <div className="border border-border-subtle rounded-brand-md p-8 flex flex-col justify-center">
            <p className="text-caption text-text-tertiary uppercase tracking-widest mb-4">
              Loaded terms
            </p>
            <div className="flex flex-wrap gap-2">
              {["stimulus", "bailout", "turmoil", "recovery", "austerity"].map((term) => (
                <span
                  key={term}
                  className="px-2 py-0.5 bg-surface-app text-text-secondary text-caption rounded-brand-sm"
                >
                  {term}
                </span>
              ))}
            </div>
            <p className="mt-4 text-caption text-text-quaternary">
              Words the model flagged as carrying weight.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MethodSection() {
  return (
    <section id="method" className="py-20 border-t border-border-subtle">
      <div className="mb-14">
        <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-3">
          Method
        </p>
        <h2 className="text-h2 font-bold tracking-tight">
          From front page to framing
        </h2>
      </div>

      <div className="space-y-20">
        {METHOD_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                i % 2 === 1 ? "lg:[direction:rtl]" : ""
              }`}
            >
              <div className={i % 2 === 1 ? "lg:[direction:ltr]" : ""}>
                <span className="text-caption text-accent-app font-medium uppercase tracking-widest tabular-nums">
                  Step {step.num}
                </span>
                <div className="mt-4 flex items-center gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-brand-sm bg-surface-app">
                    <Icon className="w-4.5 h-4.5 text-accent-app" />
                  </span>
                  <h3 className="text-h3 font-bold tracking-tight text-text-primary">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-3 text-body-medium text-text-secondary leading-relaxed max-w-[46ch]">
                  {step.body}
                </p>
              </div>
              <div className={i % 2 === 1 ? "lg:[direction:ltr]" : ""}>
                <div className="aspect-[16/10] border border-border-subtle rounded-brand-md overflow-hidden">
                  <img
                    src={step.image}
                    alt={step.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SourcesSection() {
  return (
    <section className="py-20 border-t border-border-subtle overflow-hidden">
      <div className="mb-10">
        <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-3">
          Sources
        </p>
        <h2 className="text-h2 font-bold tracking-tight">
          Scraped from the front page
        </h2>
        <p className="mt-3 text-body-medium text-text-secondary leading-relaxed max-w-[52ch]">
          We pull directly from each source&apos;s homepage. No RSS, no
          aggregators, no curation on our end.
        </p>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-5 overflow-x-auto pb-4 -mx-24 px-24 snap-x snap-mandatory">
        {SOURCES.map((source) => (
          <div key={source.name} className="flex-shrink-0 w-60 snap-start">
            <div className="aspect-[16/10] border border-border-subtle rounded-brand-md overflow-hidden mb-3">
              <img
                src={`https://picsum.photos/seed/${source.seed}/600/375`}
                alt={`${source.name} front page`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <p className="text-body-small font-semibold text-text-primary tracking-tight">
              {source.name}
            </p>
            <p className="mt-0.5 text-caption text-text-tertiary">
              Active, scraped hourly
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LatestBriefingsSection({
  articles,
  fallbackArticle,
  isSignedIn,
}: {
  articles: Awaited<ReturnType<typeof getTopArticles>>;
  fallbackArticle: Awaited<ReturnType<typeof getLatestArticleFallback>>;
  isSignedIn: boolean;
}) {
  const featured = articles[0] ?? fallbackArticle;
  const rest = articles.slice(1);

  if (!featured) {
    return (
      <section className="py-20 border-t border-border-subtle">
        <div className="border border-border-subtle p-12 text-center">
          <p className="text-body-medium text-text-primary">
            No briefings yet.
          </p>
          <p className="mt-1 text-caption text-text-tertiary">
            Check back after the next pipeline run.
          </p>
        </div>
      </section>
    );
  }

  // If we're showing a fallback (unanalyzed) article, add a subtle indicator
  const isFallback = !!fallbackArticle && articles.length === 0;

  return (
    <section className="py-20 border-t border-border-subtle">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
        <div className="lg:sticky lg:top-8">
          <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-3">
            Latest briefings
          </p>
          <h2 className="text-h3 md:text-h2 font-bold tracking-tight">
            Today&apos;s stories
          </h2>
          <p className="mt-3 text-body-small text-text-tertiary leading-relaxed max-w-[28ch]">
            Newest first, from the live pipeline. Open any story for the full
            analysis.
          </p>
          {isFallback && (
            <p className="mt-3 text-caption text-text-quaternary italic">
              Showing latest scraped story — analysis pending.
            </p>
          )}
        </div>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
            <StoryCard article={featured} featured />
            {rest.map((article) => (
              <StoryCard key={article.id} article={article} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href={isSignedIn ? "/category/news" : "/sign-in"}
              className="inline-flex items-center gap-2 h-11 px-6 border border-border-strong text-text-primary text-body-small font-medium rounded-brand-sm transition-colors duration-200 hover:border-text-tertiary hover:text-accent-app active:translate-y-px"
            >
              More news
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section className="py-20 border-t border-border-subtle">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10 lg:gap-16 items-start">
        <div className="lg:sticky lg:top-8">
          <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-3">
            Who it&apos;s for
          </p>
          <h2 className="text-h3 md:text-h2 font-bold tracking-tight">
            Built for people who act on the news
          </h2>
          <p className="mt-3 text-body-small text-text-tertiary leading-relaxed max-w-[30ch]">
            If you read the news because it changes what you do next, Skeem
            is for you.
          </p>
        </div>

        <div className="divide-y divide-border-subtle">
          {AUDIENCE_ITEMS.map((item) => (
            <div key={item.num} className="py-6 first:pt-0 last:pb-0">
              <div className="flex items-baseline gap-4">
                <span className="text-caption text-accent-app font-medium tabular-nums">
                  {item.num}
                </span>
                <div>
                  <h3 className="text-body-medium font-semibold text-text-primary tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-body-small text-text-tertiary leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EditorialSection() {
  return (
    <section className="py-20 border-t border-border-subtle">
      <div className="max-w-[65ch] mx-auto">
        <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-3">
          Why this exists
        </p>
        <h2 className="text-h2 font-bold tracking-tight mb-10">
          Framing is the story
        </h2>
        <div className="space-y-5 text-body-large text-text-secondary leading-relaxed">
          <p className="first-letter:text-5xl first-letter:font-bold first-letter:text-text-primary first-letter:float-left first-letter:mr-2 first-letter:leading-[0.85]">
            Every outlet makes choices: which stories to run, which quotes to
            keep, which verbs to use. Those choices shape how you understand
            the world, and most readers never see them.
          </p>
          <p>
            Skeem reads each article the way a careful human would. It names
            the sentiment, measures the framing, and flags the loaded terms.
            Not to tell you what to think, but to show you how the story is
            being presented, by whom, and with how much certainty.
          </p>
          <p>
            The analysis is AI-estimated, not objective truth. Every score
            carries a confidence value, and every summary points at the text
            that produced it. Transparency is the product.
          </p>
        </div>

        <div className="mt-10 pt-8 border-t border-border-subtle flex items-center gap-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-brand-sm bg-accent-app text-on-accent">
            <BoltIcon className="w-5 h-5" />
          </span>
          <div>
            <p className="text-body-small font-semibold text-text-primary tracking-tight">
              Skeem News
            </p>
            <p className="text-caption text-text-tertiary">
              Real stories. Real fast.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-20 border-t border-border-subtle">
      <div className="max-w-[540px] mx-auto text-center">
        <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-3">
          Get started
        </p>
        <h2 className="text-h2 font-bold tracking-tight">
          Read the world with both eyes
        </h2>
        <p className="mt-4 text-body-medium text-text-secondary leading-relaxed">
          Start with today&apos;s briefing. Free to read, no card, no paywall.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 h-11 px-6 bg-text-primary text-bg-app text-body-small font-medium rounded-brand-sm transition-all duration-200 hover:bg-accent-app hover:text-on-accent active:translate-y-px"
          >
            Create an account
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 h-11 px-6 border border-border-strong text-text-primary text-body-small font-medium rounded-brand-sm transition-colors duration-200 hover:border-text-tertiary hover:text-accent-app active:translate-y-px"
          >
            Sign in
          </Link>
        </div>
        {/* <p className="mt-8 text-caption text-text-quaternary">
          Facts first. Framing visible.
        </p> */}
      </div>
    </section>
  );
}

// ---- Page ----

export default async function LandingPage() {
  let articles: Awaited<ReturnType<typeof getTopArticles>> = [];
  try {
    articles = await getTopArticles(2);
  } catch {
    // Pipeline may be empty or Supabase unreachable; landing must still render.
    articles = [];
  }

  // Fallback: if no analyzed articles, show the latest scraped article (even unanalyzed)
  let fallbackArticle: Awaited<ReturnType<typeof getLatestArticleFallback>> = null;
  if (articles.length === 0) {
    try {
      fallbackArticle = await getLatestArticleFallback();
    } catch {
      fallbackArticle = null;
    }
  }

  const { userId } = await auth();
  const isSignedIn = Boolean(userId);

  return (
    <div id="theme-root" className="light flex-1 bg-bg-app text-text-primary flex flex-col font-sans">
      <Masthead showAuth showThemeToggle={false} />

      <main className="brand-container flex-1 w-full">
        <HeroSection />
        <LiveTickerSection />
        <AnalysisShowcaseSection />
        <MethodSection />
        <SourcesSection />
        <LatestBriefingsSection articles={articles} fallbackArticle={fallbackArticle} isSignedIn={isSignedIn} />
        <AudienceSection />
        <EditorialSection />
        <CtaSection />
      </main>

      <Footer isSignedIn={isSignedIn} />
    </div>
  );
}
