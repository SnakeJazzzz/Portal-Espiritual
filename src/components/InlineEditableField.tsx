'use client';

import { useEffect, useState, useTransition } from 'react';

interface Props {
  label: string;
  initialValue: string;
  fieldName: string;
  onSave: (formData: FormData) => Promise<void>;
}

export default function InlineEditableField({ label, initialValue, fieldName, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  function submit() {
    start(async () => {
      const fd = new FormData();
      fd.append(fieldName, value);
      await onSave(fd);
      setEditing(false);
      setSaved(true);
    });
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-portal-text/70 text-sm">{label}</span>
        {saved && (
          <span className="text-portal-gold text-xs" role="status" aria-live="polite">
            ✓ guardado
          </span>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2 mt-1">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="flex-1 bg-white/[0.05] text-white rounded px-3 py-2 border border-white/30 focus:border-white/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="bg-white/20 text-white px-3 rounded disabled:opacity-50"
          >
            {pending ? '…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => { setValue(initialValue); setEditing(false); }}
            className="text-portal-text/60 px-2"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block w-full text-left text-white text-lg mt-1 px-3 py-2 rounded border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 cursor-pointer transition-colors"
        >
          {value || <span className="text-portal-text/40">— vacío</span>}
        </button>
      )}
    </div>
  );
}
