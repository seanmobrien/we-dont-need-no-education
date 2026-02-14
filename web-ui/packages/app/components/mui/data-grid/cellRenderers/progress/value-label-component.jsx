import Tooltip from '@mui/material/Tooltip';
const ValueLabelComponent = ({ children, open, value, }) => {
    return (<Tooltip open={open} enterTouchDelay={0} placement="top" title={value}>
      {children}
    </Tooltip>);
};
export default ValueLabelComponent;
//# sourceMappingURL=value-label-component.jsx.map