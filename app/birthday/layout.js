import { Great_Vibes, Caveat, Playfair_Display } from 'next/font/google';
import { birthday } from './birthdayConfig';
import './birthday.css';

const greatVibes = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-great-vibes', display: 'swap' });
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' });
// The birthday pages use Playfair italics too; this overrides the root font variable.
const playfair = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-playfair', display: 'swap' });

export const metadata = {
  title: `Happy Birthday, ${birthday.name} 🌸`,
  description: `A little surprise for ${birthday.name}, from ${birthday.from}.`,
  robots: { index: false, follow: false },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌸</text></svg>",
  },
};

export const viewport = {
  themeColor: '#0f0610',
  viewportFit: 'cover',
};

export default function BirthdayLayout({ children }) {
  return <div className={`${greatVibes.variable} ${caveat.variable} ${playfair.variable}`}>{children}</div>;
}
