'use client';
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/system/Box";
import Typography from "@mui/material/Typography";
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/GetApp';
import { useEmailAttachmentsQuery } from "./hooks";
import { LoadingAttachments } from "./loading";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import React from "react";
import { RenderFallbackFromBoundary } from "../../error-boundaries/render-fallback-from-boundary";
const handleDownload = (attachment) => {
    if (attachment.hrefDocument) {
        window.open(attachment.hrefDocument, '_blank');
    }
};
export const Attachments = ({ emailId }) => {
    const { attachments = [], isFetching } = useEmailAttachmentsQuery({
        emailId: emailId,
    });
    return (<QueryErrorResetBoundary>
        {({ reset }) => (<ErrorBoundary fallbackRender={RenderFallbackFromBoundary} onReset={reset}>
            <React.Suspense fallback={<LoadingAttachments />}>
               {isFetching ? (<LoadingAttachments />) : attachments.length > 0 ? (<>
                      <Divider sx={{ my: 3 }}/>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Attachments ({attachments.length})
                        </Typography>
                        <List>
                          {attachments.map((attachment) => (<ListItem key={`attachment-${attachment.attachmentId}`} sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                    }}>
                              <ListItemIcon>
                                <AttachFileIcon />
                              </ListItemIcon>
                              <ListItemText primary={attachment.fileName ||
                        `Attachment ${attachment.attachmentId}`} secondary={`Attachment ID: ${attachment.attachmentId}`}/>
                              {attachment.hrefDocument && (<IconButton edge="end" onClick={() => handleDownload(attachment)} color="primary" title="Download attachment">
                                  <DownloadIcon />
                                </IconButton>)}
                            </ListItem>))}
                        </List>
                      </Box>
                    </>) : (<></>)}
            </React.Suspense>
          </ErrorBoundary>)}
      </QueryErrorResetBoundary>);
};
//# sourceMappingURL=attachments.jsx.map