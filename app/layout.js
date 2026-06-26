import { Quicksand, Playfair_Display } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata = {
  title: "Grishma & Saket 💖",
  description: "A special place for all our memories, notes, and photos.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💖</text></svg>",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${quicksand.variable} ${playfair.variable}`}>
        <Nav />
        <main className="page-content">
          {children}
        </main>
      </body>
    </html>
  );
}
