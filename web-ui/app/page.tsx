import Image from "next/image";
import { classnames,display, justifyItems, minHeight, padding, gap, flexDirection, listStyleType, textAlign, fontSize, backgroundColor, borderRadius, fontWeight, transitionProperty, height, listStylePosition, alignItems, justifyContent, flexBox, invert, filters, spacing, textColor, borderStyle,  borderColor, borderWidth, textDecoration, textUnderlineOffset } from 'tailwindcss-classnames';

export default function Home() {
  return (
    <div className={classnames(
      display('grid'),
      alignItems('items-center'),
      justifyItems('justify-items-center'),
      minHeight('min-h-screen'),
      padding('p-8', 'pb-20', 'sm:p-20'),
      gap('gap-16'),
      'font-[family-name:var(--font-geist-sans)]'
    )}>
      <main className={classnames(
        display('flex'),
        flexDirection('flex-col'),
        gap('gap-8'),
        alignItems('items-center', 'sm:items-start')
      )}>
        <Image
          className={classnames(filters('invert'))}
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className={classnames(
          listStylePosition('list-inside'),
          listStyleType('list-decimal'),
          textAlign('text-center', 'sm:text-left'), 
          fontSize('text-sm', 'sm:text-base'),
          'font-[family-name:var(--font-geist-mono)]'
        )}>
          <li className={classnames(spacing('mb-2'))}>
            Get started by editing{" "}
            <code className={classnames(
              padding('px-1', 'py-0.5'),
              borderRadius('rounded'),
              fontWeight('font-semibold')
            )}>
              app/page.tsx
            </code>
            .
          </li>
          <li>Save and see your changes instantly.</li>
        </ol>

        <div className={classnames(
          display('flex'),
          gap('gap-4'),
          alignItems('items-center'),
          flexBox('flex-col', 'sm:flex-row'),
        )}>
          <a
            className={classnames(
              borderRadius('rounded-full'),
              borderWidth('border'),
              borderStyle('border-solid'),
              transitionProperty('transition-colors'),
              display('flex'),
              alignItems('items-center'),
              justifyContent('justify-center'),
              'bg-foreground', 'text-background',
              gap('gap-2'),
              textColor( 'hover:text-blue-500'),
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
      <footer className={classnames(
        display('flex'),
        flexDirection('flex-col', 'sm:flex-row'),
        gap('gap-4'),
        alignItems('items-center')
      )}>
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
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
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
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
