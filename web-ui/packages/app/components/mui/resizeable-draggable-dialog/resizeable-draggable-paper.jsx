'use client';
import * as React from 'react';
import Paper from '@mui/material/Paper';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { useCallback } from 'react';
import 'react-resizable/css/styles.css';
const stableResizeHandles = ['sw', 'se', 'nw', 'ne', 'w', 'e', 'n', 's'];
const defaultMinConstraints = [200, 200];
const defaultMaxConstraints = undefined;
const ResizeableDraggablePaper = ({ height, width, minConstraints, maxConstraints, dialogId, children, onResize, ...props }) => {
    const nodeRef = React.useRef(null);
    const onDialogResize = useCallback((event, { size: { width: newWidth, height: newHeight }, }) => {
        onResize?.(newWidth, newHeight);
    }, [onResize]);
    return (<Draggable nodeRef={nodeRef} handle={`#${dialogId ?? 'draggable-dialog'}`}>
      <div ref={nodeRef}>
        <ResizableBox className="box" width={width} height={height} minConstraints={minConstraints ?? defaultMinConstraints} maxConstraints={maxConstraints ?? defaultMaxConstraints} resizeHandles={stableResizeHandles} onResize={onDialogResize}>
          <Paper {...props} style={{
            height: `${height}px`,
            width: `${width}px`,
            maxHeight: '100%',
            maxWidth: '100%',
            margin: 0,
        }}>
            {children}
          </Paper>
        </ResizableBox>
      </div>
    </Draggable>);
};
export default ResizeableDraggablePaper;
//# sourceMappingURL=resizeable-draggable-paper.jsx.map