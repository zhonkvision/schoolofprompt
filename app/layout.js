import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "School of Prompt // Instant Developer & AI Prompt Sharing",
  description: "A lightning-fast text and developer prompt-sharing utility optimized for AI prompt engineers and software developers.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>" />
      </head>
      <body
        className={`${jetbrainsMono.variable} font-mono antialiased bg-[#111111] text-[#FFFFFF] h-full overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
