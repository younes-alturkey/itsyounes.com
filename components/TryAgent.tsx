'use client';

export default function TryAgent({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <a
      className="btn btn-sm"
      href="#ask"
      onClick={(e) => {
        e.preventDefault();
        const panel = document.getElementById('ask');
        const input = document.getElementById('agent-input') as HTMLInputElement | null;
        panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (input) { input.placeholder = placeholder; setTimeout(() => input.focus({ preventScroll: true }), 700); }
      }}
    >
      {label}
    </a>
  );
}
