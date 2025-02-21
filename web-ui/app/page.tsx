import EmailList from '@/components/email-message/list';
import Image from 'next/image';
import {
  classnames,
  display,
  justifyItems,
  minHeight,
  padding,
  gap,
  flexDirection,
  fontSize,
  backgroundColor,
  borderRadius,
  transitionProperty,
  height,
  alignItems,
  justifyContent,
  flexBox,
  invert,
  textColor,
  borderStyle,
  borderColor,
  borderWidth,
  gridColumn,
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
          <EmailList />
        </div>

        <div
          className={classnames(
            display('flex'),
            gap('gap-4'),
            alignItems('items-center'),
            flexBox('flex-col', 'sm:flex-row')
          )}
        >
          <a
            className={classnames(
              borderRadius('rounded-full'),
              borderWidth('border'),
              borderStyle('border-solid'),
              transitionProperty('transition-colors'),
              display('flex'),
              alignItems('items-center'),
              justifyContent('justify-center'),
              'bg-foreground',
              'text-background',
              gap('gap-2'),
              textColor('hover:text-blue-500'),
              fontSize('text-sm', 'sm:text-base'),
              height('h-10', 'sm:h-12'),
              padding('px-4', 'sm:px-5')
            )}
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className={invert('hover:invert')}
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className={classnames(
              borderRadius('rounded-full'),
              borderWidth('border'),
              borderStyle('border-solid'),
              borderColor('border-black', 'border-white'),
              transitionProperty('transition-colors'),
              display('flex'),
              alignItems('items-center'),
              justifyContent('justify-center'),
              backgroundColor('hover:bg-white'),
              fontSize('text-sm', 'sm:text-base'),
              height('h-10', 'sm:h-12'),
              padding('px-4', 'sm:px-5')
            )}
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
      </main>
    </div>
  );
}
