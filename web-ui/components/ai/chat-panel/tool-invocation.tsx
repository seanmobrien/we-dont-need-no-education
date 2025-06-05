import classnames, { padding } from '@/tailwindcss.classnames';
import { Box } from '@mui/material';
import { ToolInvocation as ToolInvocationProps } from 'ai';

const ToolInvocation = ({
  toolInvocation,
}: {
  toolInvocation: ToolInvocationProps;
}) => {
  if (!toolInvocation) {
    return <></>;
  }
  const { toolName, args } = toolInvocation;
  let argArray: Array<string>;
  if (typeof args === 'string') {
    argArray = [args];
  } else if (Array.isArray(args)) {
    argArray = args.length > 0 ? args : ['[No arguments]'];
  } else if (args && typeof args === 'object') {
    argArray = Object.entries(args).map(([key, value]) => `${key}: ${value}`);
  } else {
    argArray = ['[No arguments]'];
  }
  return (
    <Box>
      <strong className={classnames(padding('pr-2'))}>Tool Call:</strong>
      {`${toolName} (${argArray.join(', ')})`}
    </Box>
  );
};

export default ToolInvocation;
