import { notFound } from "next/navigation";
import { createSupabaseServerClientSafe } from "@/lib/supabase/server";
import { StatusBanner } from "@/components/status-banner";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CharityProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClientSafe();
  if (!supabase) {
    return (
      <section className="shell py-10">
        <StatusBanner
          title="Charity profile unavailable"
          message="Backend is not configured. Please finish Supabase setup to view charity profiles."
        />
      </section>
    );
  }

  const { data: charity } = await supabase
    .from("charities")
    .select("id,name,description,image_url,upcoming_events,country_code")
    .eq("id", id)
    .single();

  if (!charity) {
    notFound();
  }

  return (
    <section className="shell py-10">
      <article className="card">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ocean">{charity.country_code}</p>
        <h1 className="mt-2 text-3xl font-black">{charity.name}</h1>
        <p className="mt-4 max-w-3xl text-ink/75">{charity.description}</p>
        <div className="mt-6 rounded-xl bg-ink/5 p-4">
          <h2 className="font-semibold">Upcoming events</h2>
          <p className="mt-2 text-sm text-ink/70">{charity.upcoming_events ?? "No event listed yet."}</p>
        </div>
      </article>
    </section>
  );
}
