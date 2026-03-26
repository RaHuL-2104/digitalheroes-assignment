type StatusBannerProps = {
  title: string;
  message: string;
};

export function StatusBanner({ title, message }: StatusBannerProps) {
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
      <p className="font-semibold">{title}</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}
