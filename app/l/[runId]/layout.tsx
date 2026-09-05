import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-landing",
});

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${outfit.variable} min-h-screen bg-[#f4efe6] text-[#17140f] antialiased`}
      style={{ fontFamily: "var(--font-landing), ui-sans-serif, system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
