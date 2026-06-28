import { cn } from "@/lib/utils/cn";
import type { SocialPost, SocialPlatform } from "@/lib/admin/viral-post-builder";

// ---------------------------------------------------------------------------
// Platform chrome metadata
// ---------------------------------------------------------------------------

const PLATFORM_META: Record<
  SocialPlatform,
  {
    label: string;
    accentClass: string;
    headerClass: string;
    charLimit: number;
    authorName: string;
    authorHandle: string;
  }
> = {
  facebook: {
    label:        "Facebook",
    accentClass:  "border-blue-500/30",
    headerClass:  "bg-blue-900/20 border-b border-blue-500/20",
    charLimit:    63206,
    authorName:   "Mike Eatmon — Our Town Properties",
    authorHandle: "",
  },
  linkedin: {
    label:        "LinkedIn",
    accentClass:  "border-sky-500/30",
    headerClass:  "bg-sky-900/20 border-b border-sky-500/20",
    charLimit:    3000,
    authorName:   "Mike Eatmon",
    authorHandle: "Licensed NC Broker · Our Town Properties",
  },
  threads: {
    label:        "Threads",
    accentClass:  "border-white/[0.12]",
    headerClass:  "bg-white/[0.03] border-b border-white/[0.08]",
    charLimit:    500,
    authorName:   "Mike Eatmon",
    authorHandle: "@askmagicmike",
  },
  x: {
    label:        "X / Twitter",
    accentClass:  "border-slate-600/40",
    headerClass:  "bg-slate-800/30 border-b border-slate-600/30",
    charLimit:    280,
    authorName:   "Mike Eatmon",
    authorHandle: "@askmagicmike",
  },
};

// ---------------------------------------------------------------------------
// Avatar placeholder
// ---------------------------------------------------------------------------

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-gold-400/20 border border-gold-400/30 flex items-center justify-center shrink-0">
      <span className="font-bebas text-sm leading-none text-gold-400">{initials}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform post preview
// ---------------------------------------------------------------------------

interface PlatformPostPreviewProps {
  post: SocialPost;
  className?: string;
}

export function PlatformPostPreview({ post, className }: PlatformPostPreviewProps) {
  const meta      = PLATFORM_META[post.platform];
  const overLimit = post.characterCount > meta.charLimit;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        meta.accentClass,
        className
      )}
    >
      {/* Platform header */}
      <div className={cn("flex items-center justify-between px-4 py-2.5", meta.headerClass)}>
        <span className="text-[10.5px] font-bold tracking-label uppercase text-slate-400">
          {meta.label}
        </span>
        <span
          className={cn(
            "text-[10.5px] tabular-nums font-mono",
            overLimit ? "text-ruby-400 font-bold" : "text-slate-600"
          )}
        >
          {post.characterCount.toLocaleString()} / {meta.charLimit.toLocaleString()}
        </span>
      </div>

      {/* Post body */}
      <div className="px-4 py-4">
        {/* Author row */}
        <div className="flex items-center gap-2.5 mb-3">
          <AvatarPlaceholder name={meta.authorName} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-cream leading-none">{meta.authorName}</p>
            {meta.authorHandle && (
              <p className="text-[10px] text-slate-500 mt-0.5">{meta.authorHandle}</p>
            )}
          </div>
        </div>

        {/* Post text */}
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
          {post.body}
        </p>

        {/* Hashtags (if separate from body) */}
        {post.hashtags.length > 0 && !post.body.includes(post.hashtags[0]) && (
          <p className="mt-2 text-sm text-blue-400/70 leading-relaxed">
            {post.hashtags.join(" ")}
          </p>
        )}
      </div>

      {/* Over-limit warning */}
      {overLimit && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold text-ruby-400">
            {(post.characterCount - meta.charLimit).toLocaleString()} chars over limit — edit before posting
          </p>
        </div>
      )}
    </div>
  );
}
