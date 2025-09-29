"use client";
import React from "react";

export default function NotificationModal({
  show,
  title,
  message,
  type = "info",
  confirmText = "OK",
  onConfirm,
  onCancel,
}: {
  show: boolean;
  title: string;
  message: string;
  type?: "success" | "error" | "info" | "confirm";
  confirmText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  if (!show) return null;
  const isConfirm = type === "confirm";
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onCancel || onConfirm}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onCancel || onConfirm} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p className="text-gray-600 mb-4 whitespace-pre-line">{message}</p>
        <div className="flex gap-2">
          {isConfirm ? (
            <>
              <button onClick={onCancel} className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">{confirmText}</button>
            </>
          ) : (
            <button onClick={onConfirm} className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">{confirmText}</button>
          )}
        </div>
      </div>
    </div>
  );
}
