import Link from "next/link";
import { getAllArchetypePersonas } from "@/data/personas";
import { getAllDomainExperts } from "@/data/domain-experts";
import { PersonaCard } from "@/components/personas/PersonaCard";

export default function PersonasPage() {
  const archetypes = getAllArchetypePersonas();
  const domainExperts = getAllDomainExperts();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Persona Library
        </h1>
        <p className="text-text-secondary text-sm">
          Browse and select advisors for your council. Mix archetypes and domain-expert perspectives.
        </p>
      </div>

      {/* Archetypes */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Archetypes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {archetypes.map((persona) => (
            <Link key={persona.id} href={`/council/new?persona=${persona.id}`}>
              <PersonaCard persona={persona} />
            </Link>
          ))}
        </div>
      </section>

      {/* Domain Experts */}
      <section>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
            Domain Expert Perspectives
          </h2>
          <span className="text-[10px] text-amber-400/70">
            AI-inspired · Based on publicly available materials
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {domainExperts.map((persona) => (
            <Link key={persona.id} href={`/council/new?persona=${persona.id}`}>
              <PersonaCard persona={persona} />
            </Link>
          ))}
        </div>
        <p className="mt-6 text-xs text-text-muted leading-relaxed max-w-2xl">
          Domain expert perspectives are AI-generated based solely on publicly available writings, essays, speeches, and interviews. They are not affiliated with, endorsed by, or representative of the individuals named. For educational purposes only.
        </p>
      </section>
    </div>
  );
}
