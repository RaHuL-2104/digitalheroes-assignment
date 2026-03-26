import Link from "next/link";
import { SectionTitle } from "@/components/section-title";
import { StatusBanner } from "@/components/status-banner";
import { createSupabaseServerClientSafe } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CharitiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const supabase = await createSupabaseServerClientSafe();
  const backendReady = Boolean(supabase);

  const { data: charities } = supabase
    ? await supabase
        .from("charities")
        .select("id,name,description,image_url,country_code,is_featured")
        .ilike("name", query ? `%${query}%` : "%")
        .order("is_featured", { ascending: false })
        .order("name", { ascending: true })
    : { data: [] as Array<any> };

  return (
    <section className="shell py-10 md:py-14">
      {!backendReady ? (
        <StatusBanner
          title="Charity data unavailable"
          message="Backend is not configured yet. This page is active, but charity records will appear after Supabase setup."
        />
      ) : null}
      <SectionTitle
        eyebrow="Charity Directory"
        title="Choose where your subscription creates impact"
        description="Use search to quickly find organizations by name."
      />
      <form className="mb-5">
        <input name="q" defaultValue={query} placeholder="Search charities..." className="field max-w-md" />
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {(charities ?? []).map((charity) => (
          <article key={charity.id} className="card">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ocean">
              {charity.is_featured ? "Featured Charity" : "Community Charity"}
            </p>
            <h3 className="mt-2 text-xl font-bold">{charity.name}</h3>
            <p className="mt-2 text-sm text-ink/70">{charity.description}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink/45">{charity.country_code}</p>
            <Link href={`/charities/${charity.id}`} className="btn-secondary mt-4">
              View profile
            </Link>
          </article>
        ))}
      </div>
      {backendReady && (charities?.length ?? 0) === 0 ? (
        <p className="mt-6 text-sm text-ink/70">No charities found for your search.</p>
      ) : null}
    </section>
  );
}
