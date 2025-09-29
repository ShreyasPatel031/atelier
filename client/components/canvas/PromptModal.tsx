"use client";
import React, { useRef, useEffect } from "react";

export default function PromptModal({
  show,
  title,
  placeholder,
  defaultValue,
  onConfirm,
  onCancel,
}: {
  show: boolean;
  title: string;
  placeholder: string;
  defaultValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (show) ref.current?.focus(); }, [show]);
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onCancel}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          defaultValue={defaultValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm((e.target as HTMLInputElement).value);
            if (e.key === "Escape") onCancel();
          }}
          className="w-full p-3 bg-gray-50 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
          <button
            onClick={() => onConfirm(ref.current?.value || "")}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
