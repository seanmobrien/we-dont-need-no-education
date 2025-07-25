import { Box, Button, IconButton, MenuItem, Select, Stack } from '@mui/material';
import { ToolInvocation as ToolInvocationProps } from 'ai';
import { useCallback, useState } from 'react';
import { signResponse } from '@/lib/ai/client/confirmation';
import { LoggedError } from '@/lib/react-util';
import { useNotifications } from '@toolpad/core/useNotifications';


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
}

const ConfirmationPrompt = <TResult extends object>({
  callId,
  state,
  toolName,
  args,
  result,
  addToolResult
}: {
  callId: string;
  state: "result" | "partial-call" | "call";
  toolName: string;
  args: string | Array<string> | Record<string, unknown>;
  result?: TResult;
  addToolResult: <TResult>({toolCallId, result}: { toolCallId: string; result: TResult }) => void;
}) => {
  const notifications = useNotifications();
  const { question, options: optionsFromArgs = [] } = args as {
    question: string;
    result?: string;
    options?: Array<string>;
  };
  const options = optionsFromArgs?.length > 1 ? optionsFromArgs : ['Yes', 'No'];
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const onOptionSelected = useCallback(async (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    const buttonResponse = e.currentTarget.getAttribute('data-response');
    
    if (buttonResponse && !isSubmitting) {
      setIsSubmitting(true);
      try {
        // Create a signed response for security
        const signedResponse = await signResponse({
          callId,
          choice: buttonResponse
        });
        
        addToolResult({ toolCallId: callId, result: signedResponse });
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
  }, [addToolResult, callId, isSubmitting, notifications]);
  const handleSelectChange = useCallback((e:  { target: { value: string; name: string; }; }) => {
    const selectedOption = e.target.value as string;
    setSelectedOption((current:string | null) => selectedOption === current ? current : selectedOption);
  }, [setSelectedOption]);


  if (!question) {
    return <></>;
  }
  switch(state) {
    case 'result':
      return (<Box data-callid={callId}>
        <div>
          <strong>Confirmation Required:</strong>
          <span>{question}</span>
        </div>
        <div>
          <strong>Result:</strong> 
          <span>{result ? (typeof result === 'object' ? JSON.stringify(result) : String(result)) : 'Rejected'}</span>
        </div>
      </Box>);
    case 'call':
      return (<Box data-callid={callId}>
        <div>
          <strong>Confirmation Required:</strong>
          <span>{question}</span>
        </div>
        {options.length < 4 ? (
          <Stack direction="row" spacing={1}>
            {options.map((option, index) => (
              <Button key={`${callId}-option-${index}`} 
                      variant={index === 0 ? 'contained' : 'outlined'}
                      data-response={option} 
                      onClick={onOptionSelected}
                      disabled={isSubmitting}>
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
        </Box>);
    default:
      return (<ShowToolCall toolName={toolName} args={args}/>);
    }
};


const ToolInvocation = <TResult extends object>({
  toolInvocation,
  addToolResult,
}: {
  toolInvocation: ToolInvocationProps;
  result?: TResult;
  addToolResult: <TResult>({}: { toolCallId: string; result: TResult }) => void;
}) => {
  if (!toolInvocation) {
    return <></>;
  }
  const { toolName, args, toolCallId, state } = toolInvocation;
  const result = toolInvocation.state === 'result' ? toolInvocation.result : undefined;
  switch(toolName) {
    case 'askConfirmation':      
      return <ConfirmationPrompt addToolResult={addToolResult} callId={toolCallId} state={state} toolName='askConfirmation' args={args} result={result} />;
    default:
      return <ShowToolCall toolName={toolName} args={args} />;
  }
};

export default ToolInvocation;
