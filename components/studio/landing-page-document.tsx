"use client";

import { useState } from "react";
import { RelatedPhoto } from "@/components/studio/related-photo";
import { normalizeLandingPage } from "@/lib/landing/normalize";
import type { LiveArtifactContent } from "@/lib/validations/canvas";

export type LandingCopy = Extract<
  LiveArtifactContent,
  { kind: "landing-page" }
>["content"];

function StreamText({
  value,
  className,
  wide,
}: {
  value?: string;
  className?: string;
  wide?: boolean;
}) {
  if (value) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span
      aria-hidden
      className={`inline-block h-[0.72em] animate-pulse rounded-full bg-[#17140f]/10 align-middle ${
        wide ? "w-[18ch]" : "w-[8ch]"
      } ${className ?? ""}`}
    />
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Jump({
  to,
  className,
  children,
  interactive,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
  interactive: boolean;
}) {
  if (!interactive) {
    return <span className={className}>{children}</span>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        document.getElementById(to)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {children}
    </button>
  );
}

export function LandingPageDocument({
  copy,
  prompt,
  streaming,
  interactive = true,
}: {
  copy?: LandingCopy;
  prompt: string;
  streaming: boolean;
  interactive?: boolean;
}) {
  const page = copy ? normalizeLandingPage(copy, prompt) : undefined;
  const brand = page?.brandName ?? "";
  const features = (page?.features ?? []).filter((feature) => feature?.title || feature?.description);
  const steps = (page?.steps ?? []).filter((step) => step?.title || step?.description);
  const showOwnerContact = Boolean(
    page?.contactEmail || page?.contactPhone || page?.contactAddress,
  );
  const showProblem = Boolean(page?.problemTitle || page?.problemBody);
  const showProduct = Boolean(page?.productHeading || features.length);
  const showHow = steps.length > 0;
  const showClose = Boolean(page?.closingHeadline || page?.closingBody);
  const waitHero = streaming && !page?.headline;

  return (
    <div className="min-h-screen bg-[#f4efe6] text-[#17140f]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f4efe6]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:h-[4.5rem] sm:px-8">
          <Jump interactive={interactive}  to="top" className="flex min-w-0 items-center gap-2.5">
            {brand ? (
              <span className="flex size-9 items-center justify-center rounded-2xl bg-[#17140f] text-[11px] font-semibold tracking-wide text-[#f4efe6]">
                {initials(brand)}
              </span>
            ) : null}
            <span className="truncate text-sm font-semibold tracking-tight">
              {brand || (streaming ? "…" : "")}
            </span>
          </Jump>
          <nav className="hidden items-center gap-7 text-[13px] text-[#17140f]/60 md:flex">
            {showProblem ? (
              <Jump interactive={interactive} to="problem" className="transition hover:text-[#17140f]">
                Problem
              </Jump>
            ) : null}
            {showProduct ? (
              <Jump interactive={interactive} to="product" className="transition hover:text-[#17140f]">
                Features
              </Jump>
            ) : null}
            {showHow ? (
              <Jump interactive={interactive} to="how" className="transition hover:text-[#17140f]">
                How it works
              </Jump>
            ) : null}
            <Jump interactive={interactive} to="contact" className="transition hover:text-[#17140f]">
              Contact
            </Jump>
          </nav>
          {page?.ctaLabel ? (
            <Jump interactive={interactive} 
              to={showClose ? "start" : "top"}
              className="rounded-full bg-[#17140f] px-4 py-2 text-[13px] font-medium text-[#f4efe6] transition hover:bg-[#2a241c]"
            >
              <StreamText value={page?.ctaLabel} />
            </Jump>
          ) : waitHero ? (
            <StreamText />
          ) : null}
        </div>
      </header>

      <section
        id="top"
        className="mx-auto grid max-w-6xl items-start gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12"
      >
        <div className="min-w-0">
          {page?.eyebrow || waitHero ? (
            <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-[#8a5a2b]">
              <StreamText value={page?.eyebrow} wide />
            </p>
          ) : null}
          <h1 className="mt-4 text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            <StreamText value={page?.headline} wide />
          </h1>
          {page?.body || waitHero ? (
            <p className="mt-6 max-w-xl text-base leading-7 text-[#17140f]/70 sm:text-lg sm:leading-8">
              <StreamText value={page?.body} wide />
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {page?.ctaLabel || waitHero ? (
              <Jump interactive={interactive} 
                to={showClose ? "start" : "top"}
                className="inline-flex rounded-full bg-[#c45c26] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(196,92,38,0.28)] transition hover:bg-[#a94c1d]"
              >
                <StreamText value={page?.ctaLabel} />
              </Jump>
            ) : null}
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="absolute -inset-4 rounded-[2rem] bg-[#c45c26]/10 blur-2xl" />
          <RelatedPhoto
            prompt={prompt}
            slot="hero"
            index={0}
            priority
            alt={page?.headline ?? "Hero"}
            width={1000}
            className="relative aspect-[4/3] w-full shrink-0 rounded-[1.75rem] shadow-[0_24px_60px_rgba(23,20,15,0.16)]"
          />
        </div>
      </section>

      {page?.eyebrow ? (
        <section className="px-5 pb-2 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 rounded-[1.4rem] bg-white/70 px-5 py-4 ring-1 ring-black/8 sm:px-7">
            <span className="rounded-full bg-[#17140f] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f4efe6]">
              For
            </span>
            <p className="text-sm font-medium text-[#17140f]/80 sm:text-base">
              People looking for {page.eyebrow}
            </p>
          </div>
        </section>
      ) : null}

      {showProblem ? (
        <section id="problem" className="px-5 pb-4 sm:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-black/8">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <RelatedPhoto
                prompt={prompt}
                slot="customer"
                alt={page?.problemTitle ?? "The problem"}
                width={880}
                className="aspect-[5/4] min-h-52 w-full lg:aspect-auto lg:h-full"
              />
              <div className="flex flex-col justify-center gap-4 px-6 py-8 sm:px-10 sm:py-12">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c45c26]">
                  Problem
                </p>
                {page?.problemTitle ? (
                  <h2 className="max-w-3xl text-[clamp(1.5rem,3.2vw,2.35rem)] font-semibold leading-[1.15] tracking-[-0.03em]">
                    <StreamText value={page?.problemTitle} wide />
                  </h2>
                ) : null}
                {page?.problemBody ? (
                  <p className="max-w-2xl text-base leading-7 text-[#17140f]/65">
                    <StreamText value={page?.problemBody} wide />
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {showProduct ? (
        <section id="product" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          {page?.productHeading ? (
            <div className="max-w-2xl">
              <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-[#8a5a2b]">
                Features
              </p>
              <h2 className="mt-2 text-[clamp(1.7rem,3.6vw,2.8rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
                <StreamText value={page?.productHeading} wide />
              </h2>
            </div>
          ) : null}
          {features.length ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {features.map((feature, index) => (
                <article
                  key={feature?.title ?? index}
                  className="overflow-hidden rounded-[1.4rem] bg-white shadow-[0_10px_40px_rgba(23,20,15,0.06)] ring-1 ring-black/8"
                >
                  <RelatedPhoto
                    prompt={prompt}
                    slot="feature"
                    index={index}
                    alt={feature?.title ?? `Feature ${index + 1}`}
                    width={640}
                    className="aspect-[16/11] w-full"
                  />
                  <div className="p-5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#c45c26]">
                      0{index + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight">
                      {feature?.title}
                    </h3>
                    {feature?.description &&
                    feature.description !== feature.title ? (
                      <p className="mt-2 text-sm leading-6 text-[#17140f]/60">
                        {feature.description}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {showHow ? (
        <section id="how" className="mt-4 bg-[#17140f] text-[#f4efe6]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-14">
            <RelatedPhoto
              prompt={prompt}
              slot="store"
              alt={page?.brandName ?? "Store"}
              width={880}
              className="aspect-[5/4] w-full rounded-[1.75rem]"
            />
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-[#e2b089]">
                How it works
              </p>
              <ol className="mt-8 space-y-7">
                {steps.map((step, index) => (
                  <li key={step?.title ?? index} className="grid grid-cols-[auto_1fr] gap-4">
                    <span className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-[#c45c26] text-sm font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">
                        {step?.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-7 text-[#f4efe6]/65">
                        {step?.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      {showClose ? (
        <section id="start" className="px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-[#c45c26] px-6 py-12 text-center text-white sm:px-12 sm:py-16">
            {page?.closingHeadline ? (
              <h2 className="text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
                <StreamText value={page?.closingHeadline} wide />
              </h2>
            ) : null}
            {page?.closingBody ? (
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/80">
                <StreamText value={page?.closingBody} wide />
              </p>
            ) : null}
            {page?.ctaLabel ? (
              <Jump interactive={interactive} 
                to="contact"
                className="mt-8 inline-flex rounded-full bg-[#17140f] px-7 py-3.5 text-sm font-semibold text-[#f4efe6] transition hover:bg-black"
              >
                {page?.ctaLabel}
              </Jump>
            ) : null}
          </div>
        </section>
      ) : null}

      <section id="contact" className="border-t border-black/10 bg-white/50 px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-[#8a5a2b]">
              Contact
            </p>
            <h2 className="mt-3 text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
              {brand ? `Write to ${brand}` : "Get in touch"}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#17140f]/60">
              Leave a note. We will get back to you.
            </p>
            {showOwnerContact ? (
              <dl className="mt-6 space-y-3 text-sm">
                {page?.contactEmail ? (
                  <div>
                    <dt className="text-[#17140f]/45">Email</dt>
                    <dd className="mt-0.5 font-medium">{page?.contactEmail}</dd>
                  </div>
                ) : null}
                {page?.contactPhone ? (
                  <div>
                    <dt className="text-[#17140f]/45">Phone</dt>
                    <dd className="mt-0.5 font-medium">{page?.contactPhone}</dd>
                  </div>
                ) : null}
                {page?.contactAddress ? (
                  <div>
                    <dt className="text-[#17140f]/45">Location</dt>
                    <dd className="mt-0.5 font-medium">{page?.contactAddress}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
          <ContactForm
            interactive={interactive}
            toEmail={page?.contactEmail}
            brand={brand}
          />
        </div>
      </section>

      <footer className="bg-[#17140f] text-[#f4efe6]">
        <div className={`mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-16 ${
          showOwnerContact ? "md:grid-cols-3" : "md:grid-cols-2"
        }`}>
          <div>
            {brand ? (
              <p className="text-lg font-semibold tracking-tight">{brand}</p>
            ) : null}
            {page?.eyebrow ? (
              <p className="mt-2 max-w-xs text-sm leading-6 text-[#f4efe6]/55">
                {page?.eyebrow}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#e2b089]">
              Explore
            </p>
            <div className="mt-3 flex flex-col items-start gap-2 text-sm text-[#f4efe6]/70">
              {showProblem ? (
                <Jump interactive={interactive} to="problem">Problem</Jump>
              ) : null}
              {showProduct ? (
                <Jump interactive={interactive}  to="product">Features</Jump>
              ) : null}
              {showHow ? (
                <Jump interactive={interactive}  to="how">How it works</Jump>
              ) : null}
              <Jump interactive={interactive} to="contact">Contact</Jump>
            </div>
          </div>
          {showOwnerContact ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#e2b089]">
              Reach us
            </p>
            {page?.contactEmail ? (
              <p className="mt-3 text-sm text-[#f4efe6]/70">{page?.contactEmail}</p>
            ) : null}
            {page?.contactPhone ? (
              <p className="mt-1 text-sm text-[#f4efe6]/70">{page?.contactPhone}</p>
            ) : null}
            {page?.contactAddress ? (
              <p className="mt-1 text-sm text-[#f4efe6]/55">{page?.contactAddress}</p>
            ) : null}
          </div>
          ) : null}
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl justify-between px-5 py-5 text-[12px] text-[#f4efe6]/40 sm:px-8">
            <span>© {new Date().getFullYear()}{brand ? ` ${brand}` : ""}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactForm({
  interactive,
  toEmail,
  brand,
}: {
  interactive: boolean;
  toEmail?: string;
  brand?: string;
}) {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="rounded-[1.5rem] bg-white p-5 shadow-[0_10px_40px_rgba(23,20,15,0.06)] ring-1 ring-black/8 sm:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        if (!interactive) {
          return;
        }
        const data = new FormData(event.currentTarget);
        const name = String(data.get("name") ?? "").trim();
        const email = String(data.get("email") ?? "").trim();
        const message = String(data.get("message") ?? "").trim();
        if (toEmail) {
          const params = new URLSearchParams({
            subject: brand ? `Message for ${brand}` : "New message",
            body: [name && `From: ${name}`, email && `Email: ${email}`, "", message]
              .filter(Boolean)
              .join("\n"),
          });
          window.open(`mailto:${toEmail}?${params.toString()}`, "_self");
        }
        setSent(true);
      }}
    >
      <label className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[#17140f]/45">
        Name
        <input
          name="name"
          type="text"
          required={interactive}
          placeholder="Your name"
          className="mt-1.5 w-full rounded-xl bg-[#f4efe6] px-3 py-2.5 text-sm text-[#17140f] outline-none ring-1 ring-black/10 placeholder:text-[#17140f]/35"
        />
      </label>
      <label className="mt-3 block text-[11px] font-medium uppercase tracking-[0.16em] text-[#17140f]/45">
        Email
        <input
          name="email"
          type="email"
          required={interactive}
          placeholder="you@email.com"
          className="mt-1.5 w-full rounded-xl bg-[#f4efe6] px-3 py-2.5 text-sm text-[#17140f] outline-none ring-1 ring-black/10 placeholder:text-[#17140f]/35"
        />
      </label>
      <label className="mt-3 block text-[11px] font-medium uppercase tracking-[0.16em] text-[#17140f]/45">
        Message
        <textarea
          name="message"
          required={interactive}
          rows={4}
          placeholder="How can we help?"
          className="mt-1.5 w-full resize-none rounded-xl bg-[#f4efe6] px-3 py-2.5 text-sm text-[#17140f] outline-none ring-1 ring-black/10 placeholder:text-[#17140f]/35"
        />
      </label>
      <button
        type={interactive ? "submit" : "button"}
        className="mt-5 w-full rounded-full bg-[#17140f] px-5 py-3 text-sm font-semibold text-[#f4efe6]"
      >
        {sent ? "Message ready" : "Send message"}
      </button>
    </form>
  );
}
