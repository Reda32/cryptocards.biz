import { useState } from 'preact/hooks';

interface Props {
  code: string;
  label?: string;
}

export default function CopyCodeButton({ code, label = 'Copy code' }: Props) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  };

  return (
    <div class="flex flex-wrap items-center gap-3">
      <span class="rounded-lg border-2 border-dashed border-brand-400 bg-brand-50 px-4 py-2 font-mono text-lg font-bold tracking-wide text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
        {code}
      </span>
      <button type="button" class="btn-primary" onClick={copy}>
        {copied ? 'Copied!' : failed ? 'Copy manually' : label}
      </button>
    </div>
  );
}
