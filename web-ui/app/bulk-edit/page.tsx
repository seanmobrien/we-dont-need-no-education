import BulkEmailForm from '@/components/email-message/bulk-form';
import Image from 'next/image';
import { css } from '@emotion/react';

const pageStyles = {
  container: css`
    display: grid;
    align-items: center;
    justify-items: center;
    min-height: 100vh;
    padding: 2rem;
    gap: 4rem;
    font-family: var(--font-geist-sans);
    
    @media (min-width: 640px) {
      padding: 5rem;
      padding-bottom: 5rem;
    }
  `,
  main: css`
    display: flex;
    flex-direction: column;
    gap: 2rem;
    align-items: center;
    
    @media (min-width: 640px) {
      align-items: flex-start;
    }
  `,
  mainWrapper: css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    grid-column: span 12;
  `,
  buttonContainer: css`
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-direction: column;
    
    @media (min-width: 640px) {
      flex-direction: row;
    }
  `,
  footer: css`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    
    @media (min-width: 640px) {
      flex-direction: row;
    }
  `,
  link: css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    &:hover {
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  `,
};

export default function Home() {
  return (
    <div css={pageStyles.container}>
      <main css={pageStyles.main}>
        <div css={pageStyles.mainWrapper}>
          <BulkEmailForm />
        </div>

        <div css={pageStyles.buttonContainer}></div>
      </main>
      <footer css={pageStyles.footer}>
        <a
          css={pageStyles.link}
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          css={pageStyles.link}
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
}
