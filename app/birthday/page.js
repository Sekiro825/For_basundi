import BirthdayClient from './BirthdayClient';

export default async function Page({ searchParams }) {
  // Remount when ?preview is toggled from the sidebar, so the client re-reads the URL.
  const { preview } = await searchParams;
  return <BirthdayClient key={preview === undefined ? 'live' : 'preview'} />;
}
