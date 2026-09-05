"use client";

import { useState } from "react";
import {
  emailCopyText,
  emailFromName,
  gmailComposeUrl,
} from "@/lib/email/format";
import { applyEmailBrief, decodeEmailBrief } from "@/lib/email/brief";

export function EmailPreview({
  headline,
  body,
  ctaLabel,
  ctaUrl,
  prompt,
}: {
  headline?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  prompt?: string;
}) {
  const fromName = emailFromName(prompt);
  const recipientEmail = decodeEmailBrief(prompt ?? "").brief.recipientEmail;
  const cleaned = applyEmailBrief(
    {
      headline: headline ?? "",
      body: body ?? "",
      ctaLabel: ctaLabel ?? "",
      ctaUrl: ctaUrl ?? "/",
    },
    prompt ?? "",
  );
  const [copied, setCopied] = useState(false);

  function copyEmail(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const text = emailCopyText({
      headline: cleaned.headline,
      body: cleaned.body,
      ctaLabel: cleaned.ctaLabel,
      ctaUrl: cleaned.ctaUrl,
      prompt,
    });
    const gmailUrl = gmailComposeUrl({
      headline: cleaned.headline,
      body: cleaned.body,
      ctaLabel: cleaned.ctaLabel,
      ctaUrl: cleaned.ctaUrl,
      prompt,
    });

    window.open(gmailUrl, "_blank", "noopener,noreferrer");
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => setCopied(false));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 dark:border-zinc-900">
        <span className="flex size-7 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
          {fromName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-50">
            From: {fromName}
          </p>
          <p className="truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
            To: {recipientEmail || "Add recipient email"}
          </p>
        </div>
        <button
          type="button"
          onClick={copyEmail}
          className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors flex items-center justify-center"
          aria-label="Open email in Gmail"
          title={copied ? "Copied and opened in Gmail" : "Open in Gmail"}
        >
          {copied ? (
            <span className="text-[10px] font-medium text-emerald-600">Sent</span>
          ) : (
            <GmailIcon />
          )}
        </button>
      </div>
      <div className="px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Subject
        </p>
        <h3 className="mt-1 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {cleaned.headline || "…"}
        </h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {cleaned.body || ""}
        </p>
        {cleaned.ctaUrl ? (
          <div className="mt-4">
            {/^https?:\/\//i.test(cleaned.ctaUrl) ? (
              <a
                href={cleaned.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                {cleaned.ctaLabel || "Open link"}
              </a>
            ) : (
              <span className="inline-flex rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                {cleaned.ctaLabel || "Open link"}
              </span>
            )}
            <p className="mt-2 truncate text-[11px] text-zinc-400">{cleaned.ctaUrl}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GmailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <path fill="#4285F4" d="M1.6 6.8v10.6c0 .9.7 1.6 1.6 1.6h3.1V11l5.7 4.3L17.7 11v8h3.1c.9 0 1.6-.7 1.6-1.6V6.8c0-1.2-1.3-1.9-2.3-1.2L12 10.6 3.9 5.6c-1-.7-2.3 0-2.3 1.2Z" />
      <path fill="#34A853" d="M20.8 19H17.7V11l2.1 1.6 1 3.1V19Z" />
      <path fill="#FBBC04" d="M3.2 19h3.1V11L4.2 12.6 3.2 15.7V19Z" />
      <path fill="#EA4335" d="M12 14.3 3.9 5.6C4.3 5.2 4.8 5 5.3 5h13.4c.5 0 1 .2 1.4.6L12 14.3Z" />
    </svg>
  );
}
