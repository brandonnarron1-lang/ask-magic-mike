import type { ReactNode } from "react";
import { isPreviewDataDisabled } from "../../src/lib/preview-security";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const previewReadOnly = isPreviewDataDisabled();

  return (
    <>
      {previewReadOnly ? (
        <div className="border-b border-amber-300/30 bg-black px-4 py-3 text-sm text-amber-100">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <strong className="font-semibold text-amber-200">Preview read-only mode</strong>
            <span className="text-amber-100/85">
              Database mutations, notification processing, and provider delivery are disabled for this Preview.
            </span>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
