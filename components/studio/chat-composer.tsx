"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { memo, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CREDIT_ESTIMATE, SUBSCRIBE_MESSAGE } from "@/lib/constants";
import { EmailBriefSchema, type EmailBrief } from "@/lib/email/brief";
import { LandingBriefSchema, type LandingBrief } from "@/lib/landing/brief";
import { creditsQueryKey } from "@/lib/query-keys";
import { CreditBalanceSchema } from "@/lib/validations/canvas";
import { CreativeKindSchema, type CreativeKind } from "@/lib/validations/dispatch";
import type { AspectRatio, ImageStyle } from "@/lib/validations/image-options";

// ── Image-specific option data ───────────────────────────────────────────────

const ASPECT_RATIOS = [
  { value: "1:1",  label: "1:1",  shape: "square"    },
  { value: "16:9", label: "16:9", shape: "landscape"  },
  { value: "9:16", label: "9:16", shape: "portrait"   },
  { value: "4:3",  label: "4:3",  shape: "wide"       },
] as const;

const IMAGE_STYLES = [
  { value: "photographic", label: "Photo"        },
  { value: "illustration", label: "Illustration" },
  { value: "abstract",     label: "Abstract"     },
] as const;

// ── Schema ───────────────────────────────────────────────────────────────────

const ComposerSchema = z.object({
  prompt:      z.string().trim().min(1, "Write a prompt first.").max(4000),
  intent:      CreativeKindSchema.optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3"]).optional(),
  imageStyle:  z.enum(["photographic", "illustration", "abstract"]).optional(),
  brandName:   z.string().trim().max(80).optional(),
  offer:       z.string().trim().max(160).optional(),
  contactEmail: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email"),
  contactPhone: z.string().trim().max(40).optional(),
  contactAddress: z.string().trim().max(160).optional(),
  emailSenderName: z.string().trim().max(80).optional(),
  emailRecipientName: z.string().trim().max(80).optional(),
  emailRecipientEmail: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid recipient email",
    ),
  emailContactPhone: z.string().trim().max(40).optional(),
  ctaUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .refine(
      (value) =>
        !value ||
        value.startsWith("/") ||
        /^https?:\/\//i.test(value),
      "Use https://… or /sale",
    ),
  emailTone: z.enum(["casual", "professional"]).optional(),
});

type ComposerValues = z.infer<typeof ComposerSchema>;

// ── Intent chips ─────────────────────────────────────────────────────────────

const INTENT_CHIPS: Array<{ value?: CreativeKind; label: string }> = [
  { value: undefined,       label: "Auto"         },
  { value: "image",         label: "Image"        },
  { value: "landing-page",  label: "Landing page" },
  { value: "email",         label: "Email"        },
];

// ── Component ────────────────────────────────────────────────────────────────

export const ChatComposer = memo(function ChatComposer({
  disabled,
  parentArtifactId,
  parentPrompt,
  parentKind,
  onClearParent,
  notice,
  generating,
  onCancelGenerate,
  onSubmitPrompt,
}: {
  disabled?: boolean;
  parentArtifactId?: string;
  parentPrompt?: string;
  parentKind?: CreativeKind | null;
  onClearParent: () => void;
  notice?: string | null;
  generating?: boolean;
  onCancelGenerate?: () => void;
  onSubmitPrompt: (input: {
    prompt: string;
    intent?: CreativeKind;
    parentArtifactId?: string;
    aspectRatio?: AspectRatio;
    imageStyle?: ImageStyle;
    landing?: LandingBrief;
    email?: EmailBrief;
  }) => Promise<void>;
}) {
  const form = useForm<ComposerValues>({
    resolver: zodResolver(ComposerSchema),
    defaultValues: {
      prompt:      "",
      intent:      undefined,
      aspectRatio: "1:1",
      imageStyle:  undefined,
      brandName: "",
      offer: "",
      contactEmail: "",
      contactPhone: "",
      contactAddress: "",
      emailSenderName: "",
      emailRecipientName: "",
      emailRecipientEmail: "",
      emailContactPhone: "",
      ctaUrl: "",
      emailTone: "professional",
    },
  });

  const queryClient = useQueryClient();
  const [topupNotice, setTopupNotice] = useState(false);
  const intent      = form.watch("intent");
  const aspectRatio = form.watch("aspectRatio");
  const imageStyle  = form.watch("imageStyle");
  const emailTone   = form.watch("emailTone");

  useEffect(() => {
    if (parentArtifactId && parentKind) {
      form.setValue("intent", parentKind);
    }
  }, [form, parentArtifactId, parentKind]);

  return (
    <form
      className="flex flex-1 flex-col rounded-2xl border border-zinc-200 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90"
      onSubmit={form.handleSubmit(async (values) => {
        const kind = parentKind ?? values.intent;
        const needed = kind ? CREDIT_ESTIMATE[kind] : CREDIT_ESTIMATE.image;
        const credits = await queryClient.fetchQuery({
          queryKey: creditsQueryKey,
          queryFn: async () => {
            const response = await fetch("/api/credits");
            if (!response.ok) {
              throw new Error("Could not load credits");
            }
            return CreditBalanceSchema.parse(await response.json());
          },
          staleTime: 4_000,
        });
        if (credits.available < needed) {
          setTopupNotice(true);
          return;
        }
        setTopupNotice(false);
        const landing = LandingBriefSchema.parse({
          brandName: values.brandName,
          offer: values.offer,
          contactEmail: values.contactEmail,
          contactPhone: values.contactPhone,
          contactAddress: values.contactAddress,
        });
        const email = EmailBriefSchema.parse({
          senderName: values.emailSenderName,
          recipientName: values.emailRecipientName,
          recipientEmail: values.emailRecipientEmail,
          contactPhone: values.emailContactPhone,
          ctaUrl: values.ctaUrl,
          tone: values.emailTone,
        });
        await onSubmitPrompt({
          prompt:           values.prompt,
          intent:           kind,
          parentArtifactId,
          aspectRatio:      values.aspectRatio,
          imageStyle:       values.imageStyle,
          landing: kind === "landing-page" ? landing : undefined,
          email: kind === "email" ? email : undefined,
        });
        form.reset({
          prompt:      "",
          intent:      values.intent,
          aspectRatio: values.aspectRatio,
          imageStyle:  values.imageStyle,
          brandName: values.brandName,
          offer: values.offer,
          contactEmail: values.contactEmail,
          contactPhone: values.contactPhone,
          contactAddress: values.contactAddress,
          emailSenderName: values.emailSenderName,
          emailRecipientName: values.emailRecipientName,
          emailRecipientEmail: values.emailRecipientEmail,
          emailContactPhone: values.emailContactPhone,
          ctaUrl: values.ctaUrl,
          emailTone: values.emailTone,
        });
      })}
    >
      {/* Improvise banner */}
      {parentArtifactId ? (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/70 dark:text-amber-100">
          <span className="min-w-0">
            <span className="font-medium">Improvising:</span>{" "}
            <span className="line-clamp-2">
              {parentPrompt ?? parentArtifactId.slice(0, 8)}
            </span>
            <span className="mt-1 block text-[10px] opacity-80">
              Locked to {parentKind === "landing-page" ? "landing page" : parentKind ?? "this type"}. Short notes like “make better” are fine.
            </span>
          </span>
          <button type="button" className="font-medium" onClick={onClearParent}>
            Clear
          </button>
        </div>
      ) : null}

      {/* Notice banner */}
      {notice || topupNotice ? (
        <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
          {topupNotice ? SUBSCRIBE_MESSAGE : notice}
        </p>
      ) : null}

      {/* Intent chips */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {INTENT_CHIPS.map((chip) => {
          const locked = Boolean(parentKind);
          const active = locked ? chip.value === parentKind : intent === chip.value;
          return (
            <button
              key={chip.label}
              type="button"
              disabled={locked && chip.value !== parentKind}
              onClick={() => {
                if (locked) {
                  return;
                }
                form.setValue("intent", chip.value);
              }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Image-specific options — only when intent === "image" */}
      {intent === "image" ? (
        <div className="mb-3 flex flex-col gap-3 rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-900/60">
          {/* Aspect ratio */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Aspect ratio
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {ASPECT_RATIOS.map((ar) => {
                const active = aspectRatio === ar.value;
                // Visual shape hint sizes
                const shapeClass =
                  ar.shape === "square"
                    ? "w-5 h-5"
                    : ar.shape === "landscape"
                    ? "w-7 h-4"
                    : ar.shape === "portrait"
                    ? "w-4 h-6"
                    : "w-6 h-4";
                return (
                  <button
                    key={ar.value}
                    type="button"
                    onClick={() => form.setValue("aspectRatio", ar.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg py-2 text-[10px] font-medium transition ${
                      active
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {/* Shape preview */}
                    <span
                      className={`${shapeClass} rounded-sm border-2 ${
                        active
                          ? "border-white/60 dark:border-zinc-900/60"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    />
                    {ar.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Style */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Style
            </p>
            <div className="flex flex-wrap gap-1.5">
              {IMAGE_STYLES.map((style) => {
                const active = imageStyle === style.value;
                return (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() =>
                      form.setValue(
                        "imageStyle",
                        active ? undefined : style.value,
                      )
                    }
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      active
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {intent === "landing-page" ? (
        <div className="mb-3 space-y-2 rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-900/60">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Optional page details
          </p>
          <p className="text-[11px] leading-4 text-zinc-500">
            Fill only what you know. Contact stays hidden unless you add it here or in the prompt.
          </p>
          <input
            type="text"
            placeholder="Brand name"
            className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 dark:bg-zinc-800 dark:ring-zinc-700"
            {...form.register("brandName")}
          />
          <input
            type="text"
            placeholder="Offer (what you sell)"
            className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 dark:bg-zinc-800 dark:ring-zinc-700"
            {...form.register("offer")}
          />
          <input
            type="email"
            placeholder="Contact email (optional)"
            className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 dark:bg-zinc-800 dark:ring-zinc-700"
            {...form.register("contactEmail")}
          />
          <input
            type="text"
            placeholder="Phone (optional)"
            className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 dark:bg-zinc-800 dark:ring-zinc-700"
            {...form.register("contactPhone")}
          />
          <input
            type="text"
            placeholder="Location (optional)"
            className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 dark:bg-zinc-800 dark:ring-zinc-700"
            {...form.register("contactAddress")}
          />
          {form.formState.errors.contactEmail?.message ? (
            <p className="text-[11px] text-red-500">
              {form.formState.errors.contactEmail.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {intent === "email" ? (
        <div className="mb-3 space-y-2 rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-900/60">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Optional email details
          </p>
          <p className="text-[11px] leading-4 text-zinc-500">
            Add recipient details to open a ready-to-send Gmail draft.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Your name (optional)"
              className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 dark:bg-zinc-800 dark:ring-zinc-700"
              {...form.register("emailSenderName")}
            />
            <input
              type="text"
              placeholder="Contact number (optional)"
              className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 dark:bg-zinc-800 dark:ring-zinc-700"
              {...form.register("emailContactPhone")}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Recipient name (optional)"
              className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 dark:bg-zinc-800 dark:ring-zinc-700"
              {...form.register("emailRecipientName")}
            />
            <input
              type="email"
              placeholder="Recipient email"
              className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 dark:bg-zinc-800 dark:ring-zinc-700"
              {...form.register("emailRecipientEmail")}
            />
          </div>
          <input
            type="text"
            placeholder="CTA URL — https://… or /sale"
            className="w-full rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 dark:bg-zinc-800 dark:ring-zinc-700"
            {...form.register("ctaUrl")}
          />
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Tone
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { value: "casual" as const, label: "Casual" },
                  { value: "professional" as const, label: "Professional" },
                ]
              ).map((tone) => {
                const active = emailTone === tone.value;
                return (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() =>
                      form.setValue("emailTone", tone.value)
                    }
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      active
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "bg-white text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {tone.label}
                  </button>
                );
              })}
            </div>
          </div>
          {form.formState.errors.ctaUrl?.message ? (
            <p className="text-[11px] text-red-500">
              {form.formState.errors.ctaUrl.message}
            </p>
          ) : null}
          {form.formState.errors.emailRecipientEmail?.message ? (
            <p className="text-[11px] text-red-500">
              {form.formState.errors.emailRecipientEmail.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Prompt textarea — grows to fill remaining space */}
      <textarea
        rows={6}
        placeholder={
          parentArtifactId
            ? "make better, sharper, warmer light…"
            : intent === "landing-page"
              ? "ice cream shop, or a full landing page brief…"
              : intent === "email"
                ? "summer sale, 30% off for returning customers…"
                : intent === "image"
                  ? "a cat sitting in a sunny window…"
                  : "a cat photo, ice cream landing page, or a sale email…"
        }
        className="min-h-[80px] flex-1 w-full resize-none rounded-xl bg-transparent px-2 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
        {...form.register("prompt")}
      />

      {/* Generate row — sticks to bottom */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <p className="text-[11px] text-red-500">
          {form.formState.errors.prompt?.message}
        </p>
        <div className="flex items-center gap-2">
          {generating ? (
            <button
              type="button"
              onClick={onCancelGenerate}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={disabled || generating || form.formState.isSubmitting}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {form.formState.isSubmitting ? "Dispatching…" : "Generate"}
          </button>
        </div>
      </div>
    </form>
  );
});
