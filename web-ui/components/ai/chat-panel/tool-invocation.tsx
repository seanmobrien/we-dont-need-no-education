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
    const convertValueToString = (value: unknown): string => {
      if (typeof value === 'object') {
        return !!value ? JSON.stringify(value) : 'null';
      }
      return String(value);
    };

    argArray = Object.entries(args).map(
      ([key, value]) => `${key}: ${convertValueToString(value)}`,
    );
  } else {
    argArray = ['[No arguments]'];
  }
  return (
    <Box>
      <strong className="pr-2">Tool Call:</strong>
      {`${toolName} (${argArray.join(', ')})`}
    </Box>
  );
};

export default ToolInvocation;
