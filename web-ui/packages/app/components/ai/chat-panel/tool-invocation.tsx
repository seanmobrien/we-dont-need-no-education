import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { useCallback, useState } from 'react';
import { signResponse } from '@/lib/ai/client/confirmation';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { useNotifications } from '@toolpad/core/useNotifications';
import { DynamicToolUIPart, ToolUIPart, UITools } from 'ai';

const ShowToolCall = ({
  toolName,
  args,
}: {
  toolName: string;
  args: string | Array<string> | Record<string, unknown>;
}) => {
  if (!toolName) {
    return <></>;
  }
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

const ConfirmationPrompt = <TResult extends object>({
  callId,
  state,
  toolName,
  args,
  result,
  addToolResult,
}: {
  callId: string;
  state:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error';
  toolName: string;
  args: string | Array<string> | Record<string, unknown>;
  result?: TResult;
  addToolResult: <TResult>({
    toolCallId,
  }: {
    tool: string;
    toolCallId: string;
    output: TResult;
  }) => void;
}) => {
  const notifications = useNotifications();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const onOptionSelected = useCallback(
    async (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
      const buttonResponse = e.currentTarget.getAttribute('data-response');

      if (buttonResponse && !isSubmitting) {
        setIsSubmitting(true);
        try {
          // Create a signed response for security
          const signedResponse = await signResponse({
            callId,
            choice: buttonResponse,
          });

          addToolResult({
            tool: `tool-${toolName}`,
            toolCallId: callId,
            output: signedResponse,
          });
        } catch (error) {
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            message: 'Failed to sign user response',
            data: { callId, buttonResponse },
            severity: 'error',
            log: true,
            source: 'ConfirmationPrompt',
          });
          notifications.show('Unable to sign user response.', {
            severity: 'error',
            autoHideDuration: 120000,
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [addToolResult, callId, isSubmitting, notifications, toolName],
  );
  const handleSelectChange = useCallback(
    (e: { target: { value: string; name: string } }) => {
      const selectedOption = e.target.value as string;
      setSelectedOption((current: string | null) =>
        selectedOption === current ? current : selectedOption,
      );
    },
    [setSelectedOption],
  );
  // If we're still streaming input wait until we have the full prompt
  if (state === 'input-streaming') {
    return (
      <Box data-callid={callId}>
        <div>
          <strong>Confirmation Required:</strong>
          <span>
            <CircularProgress />
          </span>
        </div>
      </Box>
    );
  }
  const { question, options: optionsFromArgs = [] } = args as {
    question: string;
    result?: string;
    options?: Array<string>;
  };
  const options = optionsFromArgs?.length > 1 ? optionsFromArgs : ['Yes', 'No'];
  if (!question) {
    return <></>;
  }
  switch (state) {
    case 'output-available':
      return (
        <Box data-callid={callId}>
          <div>
            <strong>Confirmation Required:</strong>
            <span>{question}</span>
          </div>
          <div>
            <strong>Result:</strong>
            <span>
              {result
                ? typeof result === 'object'
                  ? JSON.stringify(result)
                  : String(result ?? 'Rejected')
                : 'Rejected'}
            </span>
          </div>
        </Box>
      );
    case 'input-available':
      return (
        <Box data-callid={callId}>
          <div>
            <strong>Confirmation Required:</strong>
            <span>{question}</span>
          </div>
          {options.length < 4 ? (
            <Stack direction="row" spacing={1}>
              {options.map((option, index) => (
                <Button
                  key={`${callId}-option-${index}`}
                  variant={index === 0 ? 'contained' : 'outlined'}
                  data-response={option}
                  onClick={onOptionSelected}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing...' : option}
                </Button>
              ))}
            </Stack>
          ) : (
            <Stack direction="row" spacing={1}>
              <Select
                defaultValue=""
                inputProps={{ 'aria-label': 'Options' }}
                onChange={handleSelectChange}
              >
                <MenuItem disabled value="">
                  <em>Please Select</em>
                </MenuItem>
                {options.map((option, index) => (
                  <MenuItem key={`${callId}-option-${index}`} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              <IconButton
                color="primary"
                aria-label="Submit Confirmation"
                data-response={selectedOption}
                disabled={!selectedOption || isSubmitting}
                onClick={onOptionSelected}
              >
                <span>{isSubmitting ? '⏳' : '✔️'}</span>
              </IconButton>
            </Stack>
          )}
        </Box>
      );
    case 'output-error':
      return (
        <Box data-callid={callId}>
          <div>
            <strong>Confirmation Required:</strong>
            <span>{question}</span>
          </div>
          <div>
            <strong>Error:</strong>
            <span>
              {result
                ? typeof result === 'object'
                  ? JSON.stringify(result)
                  : String(result)
                : 'Unknown error'}
            </span>
          </div>
        </Box>
      );
    default:
      return <ShowToolCall toolName={toolName} args={args} />;
  }
};

const ToolInvocation = <
  TResult extends object,
  TToolType extends UITools = UITools,
>({
  toolInvocation,
  addToolResult,
}: {
  toolInvocation: DynamicToolUIPart | ToolUIPart<TToolType>;
  result?: TResult;
  addToolResult: <TResult>({}: {
    tool: string;
    toolCallId: string;
    output: TResult;
  }) => void;
}) => {
  if (!toolInvocation) {
    return <></>;
  }
  let toolCallId: string;
  let toolName: string;
  let args: string | string[] | Record<string, unknown>;
  let state:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error';
  if ('toolName' in toolInvocation) {
    toolCallId = toolInvocation.toolCallId;
    toolName = toolInvocation.toolName;
    args = toolInvocation.input as string | string[] | Record<string, unknown>;
    state = toolInvocation.state;
  } else {
    toolCallId = toolInvocation.toolCallId;
    toolName = toolInvocation.type.slice(5); // remove "tool-" prefix
    args = toolInvocation.input as string | string[] | Record<string, unknown>;
    state = toolInvocation.state;
  }
  const result =
    toolInvocation.state === 'output-available'
      ? (toolInvocation.output as object)
      : undefined;
  switch (toolName) {
    case 'askConfirmation':
      return (
        <ConfirmationPrompt
          addToolResult={addToolResult}
          callId={toolCallId}
          state={state}
          toolName="askConfirmation"
          args={args}
          result={result}
        />
      );
    default:
      return <ShowToolCall toolName={toolName} args={args} />;
  }
};

export default ToolInvocation;
