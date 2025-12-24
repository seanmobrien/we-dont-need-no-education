import Tooltip from '@mui/material/Tooltip';

const ValueLabelComponent = ({
  children,
  open,
  value,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: React.ReactElement<unknown, any>;
  open: boolean;
  value: number;
}) => {
  return (
    <Tooltip open={open} enterTouchDelay={0} placement="top" title={value}>
      {children}
    </Tooltip>
  );
};

export default ValueLabelComponent;
