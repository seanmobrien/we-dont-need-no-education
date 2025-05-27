import EmailList from '@/components/email-message/list';
import {
  classnames,
  display,
  justifyItems,
  minHeight,
  padding,
  flexDirection,
  alignItems,
  width,
} from 'tailwindcss-classnames';

export default function Home() {
  return (
    <div
      className={classnames(
        display('grid'),
        alignItems('items-center'),
        justifyItems('justify-items-center'),
        minHeight('min-h-screen'),
        padding('p-8', 'pb-20', 'sm:p-20'),
        'font-[family-name:var(--font-geist-sans)]',
        width('w-full'),
      )}
    >
      <main
        className={classnames(
          display('flex'),
          flexDirection('flex-col'),
          alignItems('items-center'),
          width('w-full'),
        )}
      >
        <EmailList />
      </main>
    </div>
  );
}
