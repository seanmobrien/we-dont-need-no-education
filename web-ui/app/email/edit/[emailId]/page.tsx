import EmailForm from '@/components/email-message/form';
import Image from 'next/image';
import {
  classnames,
  display,
  justifyItems,
  minHeight,
  padding,
  gap,
  flexDirection,
  alignItems,
  flexBox,
  textDecoration,
  textUnderlineOffset,
  gridColumn,
} from 'tailwindcss-classnames';

const Home = async ({
  params: { emailId: emailIdFromParams },
}: {
  params: { emailId: string };
}) => {
  const emailId: string = await emailIdFromParams;
  return (
    <div
      className={classnames(
        display('grid'),
        alignItems('items-center'),
        justifyItems('justify-items-center'),
        minHeight('min-h-screen'),
        padding('p-8', 'pb-20', 'sm:p-20'),
        gap('gap-16'),
        'font-[family-name:var(--font-geist-sans)]'
      )}
    >
      <main
        className={classnames(
          display('flex'),
          flexDirection('flex-col'),
          gap('gap-8'),
          alignItems('items-center', 'sm:items-start')
        )}
      >
        <div
          className={classnames(
            display('flex'),
            alignItems('items-center'),
            gap('gap-2'),
            gridColumn('col-span-12')
          )}
        >
          <EmailForm
            emailId={emailId}
            withButtons={true}
            afterSaveBehavior="redirect"
          />
        </div>

        <div
          className={classnames(
            display('flex'),
            gap('gap-4'),
            alignItems('items-center'),
            flexBox('flex-col', 'sm:flex-row')
          )}
        ></div>
      </main>
      <footer
        className={classnames(
          display('flex'),
          flexDirection('flex-col', 'sm:flex-row'),
          gap('gap-4'),
          alignItems('items-center')
        )}
      >
        <a
          className={classnames(
            display('flex'),
            alignItems('items-center'),
            gap('gap-2'),
            textDecoration('hover:underline'),
            textUnderlineOffset('hover:underline-offset-4')
          )}
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
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
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
