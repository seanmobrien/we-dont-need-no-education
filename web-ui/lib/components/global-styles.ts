import classnames, {
  alignItems,
  backgroundColor,
  borderRadius,
  borderWidth,
  boxShadow,
  display,
  flexDirection,
  gap,
  gridColumn,
  justifyItems,
  margin,
  maxWidth,
  minHeight,
  opacity,
  outlineStyle,
  padding,
  ringColor,
  ringWidth,
  spacing,
  textDecoration,
  textUnderlineOffset,
  transitionProperty,
  typography,
  width,
} from 'tailwindcss-classnames';

const inputClass = classnames(
  width('w-full'),
  borderWidth('border'),
  borderRadius('rounded'),
  spacing('p-2'),
  outlineStyle('focus:outline-none'),
  ringWidth('focus:ring'),
  ringColor('focus:ring-blue-300')
);
const labelClass = classnames(
  display('block'),
  typography('font-medium'),
  margin('mb-1')
);
const buttonClass = classnames(
  width('w-full'),
  spacing('p-2'),
  borderRadius('rounded'),
  typography('text-white'),
  opacity('hover:opacity-80'),
  transitionProperty('transition')
);
const containerClass = classnames(
  maxWidth('max-w-lg'),
  margin('mx-auto'),
  spacing('p-6'),
  borderRadius('rounded-lg'),
  boxShadow('shadow-md')
);
const baseHeader = classnames(typography('font-semibold'), margin('mb-4'));
const linkClass = classnames(
  textDecoration('hover:underline'),
  textUnderlineOffset('hover:underline-offset-4')
);
const globalStyles = {
  container: {
    base: containerClass,
  },
  form: {
    input: {
      base: inputClass,
      label: labelClass,
      text: classnames(inputClass, margin('mb-4')),
    },
    button: {
      base: buttonClass,
      primary: classnames(
        buttonClass,
        backgroundColor(
          'bg-blue-500',
          'hover:bg-blue-600',
          'disabled:bg-gray-400'
        )
      ),
      secondary: classnames(
        buttonClass,
        backgroundColor(
          'bg-gray-500',
          'hover:bg-gray-600',
          'disabled:bg-gray-300'
        )
      ),
    },
  },
  page: {
    link: linkClass,
  },
  grid: {
    page: classnames(
      display('grid'),
      alignItems('items-center'),
      justifyItems('justify-items-center'),
      minHeight('min-h-screen'),
      padding('p-8', 'pb-20', 'sm:p-20'),
      gap('gap-16'),
      'font-[family-name:var(--font-geist-sans)]'
    ),
    main: classnames(
      display('flex'),
      flexDirection('flex-col'),
      gap('gap-8'),
      alignItems('items-center', 'sm:items-start')
    ),
    mainWrapper: classnames(
      display('flex'),
      alignItems('items-center'),
      gap('gap-2'),
      gridColumn('col-span-12')
    ),
  },
  headers: {
    default: {
      base: baseHeader,
    },
    h2: classnames(baseHeader, typography('text-2xl')),
    h3: classnames(baseHeader, typography('text-xl')),
    h4: classnames(baseHeader, typography('text-lg')),
    h5: classnames(baseHeader, typography('text-base')),
  },
  footer: {
    container: classnames(
      display('flex'),
      flexDirection('flex-col', 'sm:flex-row'),
      gap('gap-4'),
      alignItems('items-center')
    ),
    link: classnames(
      linkClass,
      display('flex'),
      alignItems('items-center'),
      gap('gap-2')
    ),
  },
};
export default globalStyles;
