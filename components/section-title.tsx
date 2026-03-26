type SectionTitleProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-ocean">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold text-ink md:text-3xl">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-ink/70">{description}</p> : null}
    </div>
  );
}
