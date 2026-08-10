import { Plus_Jakarta_Sans } from "next/font/google";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lab-sans",
});

export default function ManifestoLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${sans.variable} lab-font-root`}>{children}</div>;
}
