import { css } from '@emotion/react';

// Emotion-based utility styles
const inputClass = css`
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem;
  outline: none;
  
  &:focus {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px #93c5fd;
  }
`;

const labelClass = css`
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const buttonClass = css`
  width: 100%;
  padding: 0.5rem;
  border-radius: 0.375rem;
  color: #ffffff;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.8;
  }
`;

const containerClass = css`
  max-width: 32rem;
  margin: 0 auto;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
`;

const baseHeader = css`
  font-weight: 600;
  margin-bottom: 1rem;
`;

const linkClass = css`
  &:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
`;

const globalStyles = {
  container: {
    base: containerClass,
  },
  form: {
    input: {
      base: inputClass,
      label: labelClass,
      text: css`
        ${inputClass}
        margin-bottom: 1rem;
      `,
    },
    button: {
      base: buttonClass,
      primary: css`
        ${buttonClass}
        background-color: #3b82f6;
        
        &:hover {
          background-color: #2563eb;
        }
        
        &:disabled {
          background-color: #9ca3af;
        }
      `,
      secondary: css`
        ${buttonClass}
        background-color: #6b7280;
        
        &:hover {
          background-color: #4b5563;
        }
        
        &:disabled {
          background-color: #d1d5db;
        }
      `,
    },
  },
  page: {
    link: linkClass,
  },
  grid: {
    page: css`
      display: grid;
      align-items: center;
      justify-items: center;
      min-height: 100vh;
      padding: 2rem;
      gap: 4rem;
      font-family: var(--font-geist-sans);
      
      @media (min-width: 640px) {
        padding: 5rem;
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
  },
  headers: {
    default: {
      base: baseHeader,
    },
    h2: css`
      ${baseHeader}
      font-size: 1.5rem;
      line-height: 2rem;
    `,
    h3: css`
      ${baseHeader}
      font-size: 1.25rem;
      line-height: 1.75rem;
    `,
    h4: css`
      ${baseHeader}
      font-size: 1.125rem;
      line-height: 1.75rem;
    `,
    h5: css`
      ${baseHeader}
      font-size: 1rem;
      line-height: 1.5rem;
    `,
  },
  footer: {
    container: css`
      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
      
      @media (min-width: 640px) {
        flex-direction: row;
      }
    `,
    link: css`
      ${linkClass}
      display: flex;
      align-items: center;
      gap: 0.5rem;
    `,
  },
};

export default globalStyles;
