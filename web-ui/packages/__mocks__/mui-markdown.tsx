import React from 'react';

type MuiMarkdownProps = {
  children?: React.ReactNode;
};

const MuiMarkdown = ({ children }: MuiMarkdownProps) => (
  <div data-testid="mui-markdown">{children}</div>
);

export default MuiMarkdown;