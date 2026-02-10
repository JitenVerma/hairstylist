import { Sora, Bebas_Neue } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-body",
});

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata = {
  title: "LookShift | Find Your Next Style",
  description:
    "Upload your front, side, and rear profile to try on new hairstyles and beard looks.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${bebas.variable}`}>{children}</body>
    </html>
  );
}
