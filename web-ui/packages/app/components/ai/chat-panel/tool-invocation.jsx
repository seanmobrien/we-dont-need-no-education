import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { useCallback, useState } from 'react';
import { signResponse } from '@/lib/ai/client/confirmation';
import { LoggedError } from '@compliance-theater/logger';
import { useNotifications } from '@toolpad/core/useNotifications';
const ShowToolCall = ({ toolName, args, }) => {
    if (!toolName) {
        return <></>;
    }
    let argArray;
    if (typeof args === 'string') {
        argArray = [args];
    }
    else if (Array.isArray(args)) {
        argArray = args.length > 0 ? args : ['[No arguments]'];
    }
    else if (args && typeof args === 'object') {
        const convertValueToString = (value) => {
            if (typeof value === 'object') {
                return !!value ? JSON.stringify(value) : 'null';
            }
            return String(value);
        };
        argArray = Object.entries(args).map(([key, value]) => `${key}: ${convertValueToString(value)}`);
    }
    else {
        argArray = ['[No arguments]'];
    }
    return (<Box>
      <strong className="pr-2">Tool Call:</strong>
      {`${toolName} (${argArray.join(', ')})`}
    </Box>);
};
const ConfirmationPrompt = ({ callId, state, toolName, args, result, addToolResult, }) => {
    const notifications = useNotifications();
    const [selectedOption, setSelectedOption] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const onOptionSelected = useCallback(async (e) => {
        const buttonResponse = e.currentTarget.getAttribute('data-response');
        if (buttonResponse && !isSubmitting) {
            setIsSubmitting(true);
            try {
                const signedResponse = await signResponse({
                    callId,
                    choice: buttonResponse,
                });
                addToolResult({
                    tool: `tool-${toolName}`,
                    toolCallId: callId,
                    output: signedResponse,
                });
            }
            catch (error) {
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
            }
            finally {
                setIsSubmitting(false);
            }
        }
    }, [addToolResult, callId, isSubmitting, notifications, toolName]);
    const handleSelectChange = useCallback((e) => {
        const selectedOption = e.target.value;
        setSelectedOption((current) => selectedOption === current ? current : selectedOption);
    }, [setSelectedOption]);
    if (state === 'input-streaming') {
        return (<Box data-callid={callId}>
        <div>
          <strong>Confirmation Required:</strong>
          <span>
            <CircularProgress />
          </span>
        </div>
      </Box>);
    }
    const { question, options: optionsFromArgs = [] } = args;
    const options = optionsFromArgs?.length > 1 ? optionsFromArgs : ['Yes', 'No'];
    if (!question) {
        return <></>;
    }
    switch (state) {
        case 'output-available':
            return (<Box data-callid={callId}>
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
        </Box>);
        case 'input-available':
            return (<Box data-callid={callId}>
          <div>
            <strong>Confirmation Required:</strong>
            <span>{question}</span>
          </div>
          {options.length < 4 ? (<Stack direction="row" spacing={1}>
              {options.map((option, index) => (<Button key={`${callId}-option-${index}`} variant={index === 0 ? 'contained' : 'outlined'} data-response={option} onClick={onOptionSelected} disabled={isSubmitting}>
                  {isSubmitting ? 'Signing...' : option}
                </Button>))}
            </Stack>) : (<Stack direction="row" spacing={1}>
              <Select defaultValue="" inputProps={{ 'aria-label': 'Options' }} onChange={handleSelectChange}>
                <MenuItem disabled value="">
                  <em>Please Select</em>
                </MenuItem>
                {options.map((option, index) => (<MenuItem key={`${callId}-option-${index}`} value={option}>
                    {option}
                  </MenuItem>))}
              </Select>
              <IconButton color="primary" aria-label="Submit Confirmation" data-response={selectedOption} disabled={!selectedOption || isSubmitting} onClick={onOptionSelected}>
                <span>{isSubmitting ? '⏳' : '✔️'}</span>
              </IconButton>
            </Stack>)}
        </Box>);
        case 'output-error':
            return (<Box data-callid={callId}>
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
        </Box>);
        default:
            return <ShowToolCall toolName={toolName} args={args}/>;
    }
};
const ToolInvocation = ({ toolInvocation, addToolResult, }) => {
    if (!toolInvocation) {
        return <></>;
    }
    let toolCallId;
    let toolName;
    let args;
    let state;
    if ('toolName' in toolInvocation) {
        toolCallId = toolInvocation.toolCallId;
        toolName = toolInvocation.toolName;
        args = toolInvocation.input;
        state = toolInvocation.state;
    }
    else {
        toolCallId = toolInvocation.toolCallId;
        toolName = toolInvocation.type.slice(5);
        args = toolInvocation.input;
        state = toolInvocation.state;
    }
    const result = toolInvocation.state === 'output-available'
        ? toolInvocation.output
        : undefined;
    switch (toolName) {
        case 'askConfirmation':
            return (<ConfirmationPrompt addToolResult={addToolResult} callId={toolCallId} state={state} toolName="askConfirmation" args={args} result={result}/>);
        default:
            return <ShowToolCall toolName={toolName} args={args}/>;
    }
};
export default ToolInvocation;
//# sourceMappingURL=tool-invocation.jsx.map