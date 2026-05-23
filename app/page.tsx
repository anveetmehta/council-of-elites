import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RECOMMENDED_COUNCILS } from "@/data/recommended-councils";
import { RecommendedCouncilCard } from "@/components/council/RecommendedCouncils";
import { LandingTranscript } from "@/components/landing/LandingTranscript";
import { HomeQuestionInput } from "@/components/home/HomeQuestionInput";
import { ContinueSection } from "@/components/home/ContinueSection";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

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
  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="border-b border-surface-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent-muted border border-accent/30 flex items-center justify-center">
              <Users size={14} className="text-accent" />
            </div>
            <span className="text-text-primary font-serif italic text-sm tracking-tight">
              Council of Elites
            </span>
          </div>
          <Link
            href="/login"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero — headline + question entry */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12">
        <p className="text-xs font-medium text-accent uppercase tracking-widest mb-5">
          A panel that pushes back
        </p>
        <h1 className="text-4xl sm:text-5xl font-serif italic text-text-primary leading-[1.1] mb-5 tracking-tight">
          Your question deserves a real conversation, not a single answer.
        </h1>
        <p className="text-text-secondary text-base leading-relaxed mb-8 max-w-xl">
          Assemble a panel of advisors with distinct perspectives. Watch them debate your question,
          challenge each other, and surface what you've been missing.
        </p>

        {/* Question input — works even before signup */}
        <form action="/login" method="GET" className="mb-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              name="topic"
              placeholder="What are you wrestling with?"
              required
              className="flex-1 px-4 py-3 rounded-lg text-sm bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-lg bg-accent hover:bg-accent-hover transition-colors text-sm font-medium text-white whitespace-nowrap inline-flex items-center justify-center gap-2"
            >
              Suggest a council
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
        <p className="text-xs text-text-muted">
          Sign in to start — Google, no credit card.
        </p>
      </section>

      {/* Show-don't-tell — a real transcript fragment */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-surface-border" />
          <p className="text-[11px] uppercase tracking-widest text-text-muted">
            A glimpse
          </p>
          <div className="h-px flex-1 bg-surface-border" />
        </div>
        <LandingTranscript />
      </section>

      {/* Recommended councils */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
            Ready-made councils
          </h2>
          <Link
            href="/login"
            className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
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
          <span>Council of Elites — a panel that pushes back</span>
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
