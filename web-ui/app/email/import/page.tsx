import Image from 'next/image';
import globalStyles from '@/lib/components/global-styles';
import Link from 'next/link';
import ImportSession from '@/components/email-import/import-session';

const Home = async () => {
  return (
    <div className={globalStyles.grid.page}>
      <main className={globalStyles.grid.main}>
        <div className={globalStyles.grid.mainWrapper}>
          <ImportSession />
        </div>
      </main>
      <footer className={globalStyles.footer.container}>
        <Link href="/" className={globalStyles.footer.link}>
          Home
        </Link>

        <a
          className={globalStyles.footer.link}
          href="https://education.mn.gov/MDE/index.htm"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to MN Dept of Ed →
        </a>
      </footer>
    </div>
  );
};

export default Home;
