"use client";
import React, { useState } from "react";
import { copyToClipboard } from "../../utils/copyToClipboard";

export type ShareOverlayState = { show: boolean; url: string; error?: string; copied?: boolean };

export default function ShareOverlay({
  state,
  onClose,
  onCopy,
}: {
  state: ShareOverlayState;
  onClose: () => void;
  onCopy?: (copied: boolean) => void;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'success'>('idle');
  
  if (!state.show) return null;
  const { url, error, copied } = state;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {error ? "Share Failed" : "Share Architecture"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {error ? (
          <div className="text-red-600 text-center py-4">{error}</div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              {(copied || copyState === 'success') ? "Link copied to clipboard! Share this link with others:" : "Copy this link to share your architecture:"}
            </p>

            <div className="relative mb-4">
              <div className="bg-gray-50 border rounded-lg p-3 pr-12">
                <code className="text-sm text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis block">{url}</code>
              </div>
              <button
                onClick={async () => {
                  if (copyState === 'copying') return; // Prevent multiple clicks
                  
                  setCopyState('copying');
                  
                  const success = await copyToClipboard(url, {
                    successMessage: 'URL copied to clipboard',
                    errorMessage: 'Failed to copy URL',
                    onSuccess: () => {
                      setCopyState('success');
                      setTimeout(() => setCopyState('idle'), 2000);
                    },
                    onError: () => {
                      setCopyState('idle');
                    }
                  });
                  
                  // Also notify parent component
                  onCopy?.(success);
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 transition-colors ${
                  copyState === 'copying' 
                    ? 'text-blue-500 cursor-wait' 
                    : copyState === 'success'
                      ? 'text-green-500'
                      : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Copy to clipboard"
                disabled={copyState === 'copying'}
              >
                {copyState === 'copying' ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                ) : copyState === 'success' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                )}
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
