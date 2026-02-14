'use client';
import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { VirtualizedChatDisplay } from '@/components/ai/chat/virtualized-chat-display';
import { ChatExportMenu } from '@/components/ai/chat/chat-export-menu';
import { ChatMessageFilters, searchMessageContent, } from '@/components/ai/chat/chat-message-filters';
import { useChatHistory } from './useChatHistory';
import { Loading } from '@/components/general/loading';
const getAllMessages = (chatDetails) => {
    return chatDetails.turns.flatMap((turn) => turn.messages);
};
const getFilteredTurns = (chatDetails, enableFilters, activeFilters, contentFilter) => {
    if (!enableFilters) {
        return chatDetails.turns;
    }
    return chatDetails.turns.filter((turn) => {
        const filteredMessages = turn.messages.filter((message) => {
            const passesTypeFilter = activeFilters.size === 0 ||
                activeFilters.has(message.role);
            const passesContentFilter = searchMessageContent(message, contentFilter);
            return passesTypeFilter && passesContentFilter;
        });
        return filteredMessages.length > 0;
    });
};
const calculateStats = (chatDetails) => {
    const turns = chatDetails.turns;
    const totalMessages = turns.reduce((sum, turn) => sum + turn.messages.length, 0);
    const totalTokens = turns.reduce((sum, turn) => {
        if (turn.metadata?.totalTokens) {
            return sum + turn.metadata.totalTokens;
        }
        return sum;
    }, 0);
    const toolUsage = turns.reduce((acc, turn) => {
        turn.messages.forEach((msg) => {
            if (msg.toolName && msg.toolResult) {
                acc[msg.toolName] = (acc[msg.toolName] || 0) + 1;
            }
        });
        return acc;
    }, {});
    return {
        totalTurns: turns.length,
        totalMessages,
        totalTokens,
        toolUsage,
        avgLatency: turns
            .filter((t) => t.latencyMs)
            .reduce((sum, t) => sum + (t.latencyMs || 0), 0) /
            Math.max(turns.filter((t) => t.latencyMs).length, 1),
    };
};
export const ChatHistory = ({ chatId, title: titleFromProps, }) => {
    const { data, isLoading, isError, error, refetch } = useChatHistory(chatId);
    const [enableSelection, setEnableSelection] = React.useState(false);
    const [selectedItems, setSelectedItems] = React.useState([]);
    const [enableFilters, setEnableFilters] = React.useState(false);
    const [activeFilters, setActiveFilters] = React.useState(new Set());
    const [contentFilter, setContentFilter] = React.useState('');
    const filteredData = React.useMemo(() => {
        if (!data)
            return null;
        return {
            ...data,
            turns: getFilteredTurns(data, enableFilters, activeFilters, contentFilter),
        };
    }, [data, enableFilters, activeFilters, contentFilter]);
    const allMessages = React.useMemo(() => {
        return data ? getAllMessages(data) : [];
    }, [data]);
    const stats = React.useMemo(() => {
        return filteredData ? calculateStats(filteredData) : null;
    }, [filteredData]);
    const effectiveTitle = React.useMemo(() => {
        const resolvedTitleFromProps = titleFromProps && titleFromProps.trim().length > 0
            ? titleFromProps.trim()
            : null;
        return (resolvedTitleFromProps ??
            (data?.title && data.title.trim().length > 0 ? data.title : null));
    }, [titleFromProps, data?.title]);
    const handleSelectAll = React.useCallback(() => {
        if (!filteredData)
            return;
        const allTurns = filteredData.turns.map((turn) => ({
            type: 'turn',
            turnId: turn.turnId,
        }));
        setSelectedItems(allTurns);
    }, [filteredData]);
    const handleClearSelection = React.useCallback(() => {
        setSelectedItems([]);
    }, []);
    const handleEnableSelectionChange = React.useCallback((e) => {
        setEnableSelection(e.target.checked);
    }, []);
    React.useEffect(() => {
        if (!enableSelection) {
            setSelectedItems([]);
        }
    }, [enableSelection]);
    React.useEffect(() => {
        if (!enableSelection) {
            setSelectedItems([]);
        }
    }, [enableSelection]);
    if (isError) {
        return (<Box>
        <Typography color="error" gutterBottom>
          Failed to load chat
        </Typography>
        <Typography variant="body2" gutterBottom>
          {error.message}
        </Typography>
        <Typography variant="body2" sx={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => refetch()}>
          Retry
        </Typography>
      </Box>);
    }
    return (<>
      <Typography variant="h4" gutterBottom>
        {effectiveTitle || `Chat ${chatId.slice(-8)}`}
      </Typography>
      {data && (<>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Created: {new Date(data.createdAt).toLocaleString()}
          </Typography>

          
          <Paper sx={{ p: 2, mb: 3 }}>
            <ChatMessageFilters messages={allMessages} enableFilters={enableFilters} onEnableFiltersChange={setEnableFilters} activeTypeFilters={activeFilters} onTypeFiltersChange={setActiveFilters} contentFilter={contentFilter} onContentFilterChange={setContentFilter} title="Global Message Filters" size="medium" showStatusMessage={true}/>
          </Paper>

          
          <Accordion sx={{ mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Chat Statistics & Metadata</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid gridColumn={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {stats?.totalTurns || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Turns
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid gridColumn={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {stats?.totalMessages || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Messages
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid gridColumn={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {stats?.totalTokens || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Tokens
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid gridColumn={{ xs: 12, sm: 6, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {stats?.avgLatency ? Math.round(stats.avgLatency) : 0}ms
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Latency
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                {stats?.toolUsage &&
                Object.keys(stats.toolUsage).length > 0 && (<Grid gridColumn={{ xs: 12 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Tool Usage
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {Object.entries(stats.toolUsage).map(([tool, count]) => (<Chip key={tool} label={`${tool}: ${count}`} size="small" variant="outlined"/>))}
                      </Box>
                    </Grid>)}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </>)}

      
      {filteredData && (<Box sx={{ mt: 3, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel control={<Switch checked={enableSelection} onChange={handleEnableSelectionChange}/>} label="Enable Export Selection"/>
          {enableSelection && (<>
              <Button size="small" variant="outlined" onClick={handleSelectAll} disabled={selectedItems.length === filteredData.turns.length}>
                Select All Turns
              </Button>
              <Button size="small" variant="outlined" onClick={handleClearSelection} disabled={selectedItems.length === 0}>
                Clear Selection
              </Button>
              <Typography variant="body2" color="text.secondary">
                {selectedItems.length} item
                {selectedItems.length !== 1 ? 's' : ''} selected
              </Typography>
              <ChatExportMenu turns={filteredData.turns} selectedItems={selectedItems} chatTitle={effectiveTitle || undefined} chatCreatedAt={data?.createdAt}/>
            </>)}
        </Box>)}

      <Box sx={{ mt: 1 }}>
        <Loading loading={isLoading}/>
        {!filteredData ? (!isLoading && <Typography>No chat found.</Typography>) : filteredData.turns.length === 0 ? (<Typography color="text.secondary">
            No messages match the current filters.
          </Typography>) : (<VirtualizedChatDisplay turns={filteredData.turns} height={800} enableSelection={enableSelection} selectedItems={selectedItems} onSelectionChange={setSelectedItems} globalFilters={enableFilters
                ? { typeFilters: activeFilters, contentFilter }
                : { typeFilters: new Set(), contentFilter: '' }}/>)}
      </Box>
    </>);
};
//# sourceMappingURL=chat-history.jsx.map