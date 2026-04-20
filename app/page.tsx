import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RECOMMENDED_COUNCILS } from "@/data/recommended-councils";
import { RecommendedCouncilCard } from "@/components/council/RecommendedCouncils";
import Link from "next/link";
import { ArrowRight, Users, MessageSquare, Layers } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated: existing home
  if (user) {
    const firstName = user.user_metadata?.name?.split(" ")[0] || "there";
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-12">
          <p className="text-text-secondary text-sm mb-1">Welcome back, {firstName}</p>
          <h1 className="text-3xl font-semibold text-text-primary mb-4">
            Who should advise you today?
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed max-w-lg">
            Assemble a council of advisors with distinct perspectives. Ask one question — get contrasting, honest views that help you think better.
          </p>
        </div>

        <div className="mb-12 space-y-4">
          <form action="/council/new" method="GET" className="max-w-lg">
            <div className="flex gap-2">
              <input
                type="text"
                name="topic"
                placeholder="What do you need help with?"
                className="flex-1 px-3 py-2.5 rounded-lg text-sm bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover transition-colors text-sm font-medium text-white whitespace-nowrap"
              >
                Get advisors
              </button>
            </div>
          </form>
          <Link
            href="/council/new"
            className="inline-flex items-center gap-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <Users size={15} />
            Or build your own council manually
            <ArrowRight size={14} />
          </Link>
        </div>

        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-5">
            Recommended Councils
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RECOMMENDED_COUNCILS.map((council) => (
              <RecommendedCouncilCard key={council.id} council={council} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Unauthenticated: landing page
  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="border-b border-surface-border px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent-muted border border-accent/30 flex items-center justify-center">
              <Users size={14} className="text-accent" />
            </div>
            <span className="text-text-primary font-semibold text-sm tracking-tight">
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

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-6">
          Multi-perspective AI advisory
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-text-primary leading-tight mb-6 max-w-2xl mx-auto">
          Your question deserves more than one answer
        </h1>
        <p className="text-text-secondary text-base leading-relaxed max-w-xl mx-auto mb-10">
          Assemble a council of AI advisors — each with a distinct perspective, role, and voice. Get honest, contrasting views on your most important decisions.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover transition-colors text-sm font-medium text-white"
        >
          Get started free
          <ArrowRight size={14} />
        </Link>
        <p className="mt-4 text-xs text-text-muted">Sign in with Google · No credit card required</p>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest text-center mb-10">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: <Users size={18} className="text-accent" />,
              step: "01",
              title: "Pick your advisors",
              desc: "Choose 2–4 personas from archetypes and domain experts. Assign roles like Advocate, Critic, or Moderator.",
            },
            {
              icon: <MessageSquare size={18} className="text-accent" />,
              step: "02",
              title: "Ask anything",
              desc: "Career decisions, startup bets, investment theses, life questions — anything worth thinking hard about.",
            },
            {
              icon: <Layers size={18} className="text-accent" />,
              step: "03",
              title: "Get contrasting views",
              desc: "Each advisor responds from their perspective. A moderator synthesizes the crux and surfaces what you're missing.",
            },
          ].map(({ icon, step, title, desc }) => (
            <div
              key={step}
              className="p-6 rounded-xl border border-surface-border bg-surface-raised"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center">
                  {icon}
                </div>
                <span className="text-xs font-mono text-text-muted">{step}</span>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended councils preview */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RECOMMENDED_COUNCILS.map((council) => (
            <RecommendedCouncilCard key={council.id} council={council} />
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-text-muted">
          Clicking a council will prompt you to sign in
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <span>Council of Elites — AI advisory for better decisions</span>
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
