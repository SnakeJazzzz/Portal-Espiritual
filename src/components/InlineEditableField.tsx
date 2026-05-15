'use client';

import { useState, useTransition } from 'react';

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

  function submit() {
    start(async () => {
      const fd = new FormData();
      fd.append(fieldName, value);
      await onSave(fd);
      setEditing(false);
    });
  }

  return (
    <div className="py-2">
      <span className="text-portal-text/70 text-sm">{label}</span>
      {editing ? (
        <div className="flex gap-2 mt-1">
          <input value={value} onChange={(e) => setValue(e.target.value)}
            className="flex-1 bg-white/[0.05] text-white rounded px-2 py-1" />
          <button onClick={submit} disabled={pending} className="bg-white/20 text-white px-3 rounded disabled:opacity-50">
            {pending ? '…' : 'Guardar'}
          </button>
          <button onClick={() => { setValue(initialValue); setEditing(false); }} className="text-portal-text/60 px-2">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="block text-white text-lg w-full text-left">
          {value || <span className="text-portal-text/40">— vacío</span>}
        </button>
      )}
    </div>
  );
}
