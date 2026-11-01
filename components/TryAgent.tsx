'use client';

export default function TryAgent({ label }: { label: string }) {
  return (
    <a
      className="btn btn-sm"
      href="#ask"
      onClick={(e) => {
        e.preventDefault();
        document.getElementById('ask')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const input = document.getElementById('agent-input') as HTMLInputElement | null;
        if (input) setTimeout(() => input.focus({ preventScroll: true }), 700);
      }}
    >
      {label}
    </a>
  );
}
