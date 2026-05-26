import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RECOMMENDED_COUNCILS } from "@/data/recommended-councils";
import { RecommendedCouncilCard } from "@/components/council/RecommendedCouncils";
import { LandingTranscript } from "@/components/landing/LandingTranscript";
import { HomeQuestionInput } from "@/components/home/HomeQuestionInput";
import { ContinueSection } from "@/components/home/ContinueSection";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllPersonas } from "@/data/personas";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated home
  if (user) {
    // Count sessions to detect first-time vs returning state
    const { count: sessionCount } = await supabase
      .from("council_rooms")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const isFirstTime = !sessionCount || sessionCount === 0;
    const firstName = user.user_metadata?.name?.split(" ")[0] || null;

    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Heading — context-aware */}
        <div className="mb-10">
          {isFirstTime ? (
            <>
              <p className="text-text-secondary text-sm mb-2">
                {firstName ? `Welcome, ${firstName}.` : "Welcome."}
              </p>
              <h1 className="text-3xl font-serif italic text-text-primary mb-4 leading-tight">
                What's on your mind?
              </h1>
              <p className="text-text-secondary text-sm leading-relaxed max-w-xl">
                Type a question. We'll assemble a panel of advisors with distinct perspectives and they'll talk it through — with you and each other.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-serif italic text-text-primary mb-3 leading-tight">
                What are you thinking about?
              </h1>
              <p className="text-text-secondary text-sm leading-relaxed">
                Type a question. Your council will weigh in.
              </p>
            </>
          )}
        </div>

        {/* Question input — primary action */}
        <div className="mb-12">
          <HomeQuestionInput />
        </div>

        {/* Returning users: Continue section */}
        {!isFirstTime && <ContinueSection userId={user.id} />}

        {/* Recommended councils */}
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
            {isFirstTime ? "Or start with a ready-made council" : "Ready-made councils"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RECOMMENDED_COUNCILS.map((council) => (
              <RecommendedCouncilCard key={council.id} council={council} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Unauthenticated landing page — show, don't tell
  const allPersonas = getAllPersonas();

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav — sticky, frosted */}
      <nav className="sticky top-0 z-10 border-b border-surface-border px-6 py-3.5 bg-surface/85 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* CouncilMark + wordmark */}
          <div className="flex items-center gap-2.5">
            <svg width="20" height="20" viewBox="0 0 48 48" className="text-text-primary shrink-0" aria-hidden="true">
              <circle cx="24" cy="6"     r="2.8" fill="currentColor" />
              <circle cx="38.8" cy="13"  r="2.8" fill="currentColor" />
              <circle cx="42"   cy="24"  r="2.8" fill="currentColor" />
              <circle cx="38.8" cy="35"  r="2.8" fill="currentColor" />
              <circle cx="24"   cy="42"  r="2.8" fill="currentColor" />
              <circle cx="9.2"  cy="35"  r="2.8" fill="currentColor" />
              <circle cx="6"    cy="24"  r="2.8" fill="currentColor" />
              <circle cx="9.2"  cy="13"  r="2.8" fill="currentColor" />
              <circle cx="24"   cy="24"  r="3.8" fill="#6D5BE3" />
            </svg>
            <span className="text-text-primary font-serif italic text-sm tracking-tight">
              Council <span className="text-text-muted font-normal">of</span> Elites
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#glimpse" className="text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
              A glimpse
            </Link>
            <Link href="#councils" className="text-sm text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
              Councils
            </Link>
            <Link
              href="/login"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — editorial masthead */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        {/* Masthead rule */}
        <div className="flex items-center gap-4 mb-10 max-w-sm mx-auto">
          <div className="h-px flex-1 bg-surface-strong" />
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-text-muted whitespace-nowrap">
            Vol. i · A panel that pushes back
          </p>
          <div className="h-px flex-1 bg-surface-strong" />
        </div>

        <h1 className="text-4xl sm:text-[52px] font-serif italic text-text-primary leading-[1.08] tracking-[-0.02em] mb-6 max-w-3xl mx-auto text-balance">
          Your question deserves <em className="text-accent not-italic">a real conversation</em>, not a single answer.
        </h1>
        <p className="text-text-secondary text-base leading-relaxed mb-10 max-w-lg mx-auto">
          Assemble a panel of advisors with distinct perspectives. Watch them debate your question,
          challenge each other, and surface what you've been missing.
        </p>

        {/* Question input — works even before signup */}
        <form action="/login" method="GET" className="mb-3 max-w-2xl mx-auto">
          <div className="bg-surface-raised border border-surface-border rounded-2xl p-4 text-left shadow-[var(--shadow-elevated)] focus-within:border-accent/40 focus-within:shadow-[0_0_0_4px_rgba(109,91,227,0.08)] transition-all">
            <input
              type="text"
              name="topic"
              placeholder="A decision, a dilemma, something you've been turning over…"
              required
              className="w-full bg-transparent text-base text-text-primary placeholder:text-text-muted focus:outline-none leading-relaxed mb-3"
            />
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-border">
              <p className="text-[11px] text-text-muted hidden sm:block">
                Sign in to start — Google, no credit card.
              </p>
              <button
                type="submit"
                className="px-4 py-2 rounded-[10px] bg-accent hover:bg-accent-hover transition-colors text-sm font-medium text-white whitespace-nowrap inline-flex items-center gap-2 ml-auto"
              >
                Convene the council
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </form>

        {/* The 8 advisors — standing by */}
        <div className="mt-10">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-4">
            Standing by · the council of eight
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 max-w-3xl mx-auto">
            {allPersonas.map((p) => {
              const initials = p.name.replace(/^The\s/, "").split(" ").slice(0, 2).map((w: string) => w[0]).join("");
              const firstName = p.name.split(" ")[0];
              const beat = p.tagline.split(",")[0];
              return (
                <div
                  key={p.id}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-surface-raised border border-surface-border text-center group hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] transition-all duration-150"
                  style={{ borderTopWidth: 2, borderTopColor: p.colorHex }}
                >
                  {/* Avatar tile */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-serif italic font-semibold text-sm shrink-0"
                    style={{
                      backgroundColor: `${p.colorHex}20`,
                      border: `1px solid ${p.colorHex}40`,
                      color: p.colorHex,
                    }}
                  >
                    {initials}
                  </div>
                  <span className="text-[11px] font-serif italic font-semibold text-text-primary leading-tight">
                    {firstName}
                  </span>
                  <span className="text-[9px] text-text-muted leading-tight line-clamp-2 hidden sm:block">
                    {beat}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Show-don't-tell — a real transcript fragment */}
      <section id="glimpse" className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-baseline gap-4 mb-6 pb-4 border-b border-surface-border">
          <span className="font-serif italic text-2xl text-text-muted leading-none">i.</span>
          <h2 className="font-serif italic text-2xl text-text-primary leading-tight tracking-[-0.012em]">
            A glimpse, from a recent session
          </h2>
        </div>
        <LandingTranscript />
      </section>

      {/* Recommended councils */}
      <section id="councils" className="max-w-5xl mx-auto px-6 pb-24">
        <div className="flex items-baseline gap-4 mb-6 pb-4 border-b border-surface-border">
          <span className="font-serif italic text-2xl text-text-muted leading-none">ii.</span>
          <h2 className="flex-1 font-serif italic text-2xl text-text-primary leading-tight tracking-[-0.012em]">
            Or start with a ready-made council
          </h2>
          <Link
            href="/login"
            className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1 shrink-0"
          >
            Start one <ArrowRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RECOMMENDED_COUNCILS.slice(0, 4).map((council) => (
            <RecommendedCouncilCard key={council.id} council={council} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 48 48" className="text-text-muted" aria-hidden="true">
              <circle cx="24" cy="6"     r="2.8" fill="currentColor" />
              <circle cx="38.8" cy="13"  r="2.8" fill="currentColor" />
              <circle cx="42"   cy="24"  r="2.8" fill="currentColor" />
              <circle cx="38.8" cy="35"  r="2.8" fill="currentColor" />
              <circle cx="24"   cy="42"  r="2.8" fill="currentColor" />
              <circle cx="9.2"  cy="35"  r="2.8" fill="currentColor" />
              <circle cx="6"    cy="24"  r="2.8" fill="currentColor" />
              <circle cx="9.2"  cy="13"  r="2.8" fill="currentColor" />
              <circle cx="24"   cy="24"  r="3.8" fill="#6D5BE3" />
            </svg>
            <span>Council of Elites — a panel that pushes back</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-text-secondary transition-colors">
              Terms of Service
            </Link>
            <Link href="/login" className="hover:text-text-secondary transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
