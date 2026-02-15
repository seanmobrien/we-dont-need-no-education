import {
  wellKnownFlag,
  wellKnownFlagSync,
} from '@compliance-theater/feature-flags/feature-flag-with-refresh';

export const getCacheEnabledFlag = () => wellKnownFlag('mcp_cache_tools');
export const getCacheEnabledFlagSync = () =>
  wellKnownFlagSync('mcp_cache_tools');

export const getMem0EnabledFlag = () => wellKnownFlag('mem0_mcp_tools_enabled');
export const getMem0EnabledFlagSync = () =>
  wellKnownFlagSync('mem0_mcp_tools_enabled');

export const getStreamingTransportFlag = () =>
  wellKnownFlag('mcp_protocol_http_stream');
export const getStreamingTransportFlagSync = () =>
  wellKnownFlagSync('mcp_protocol_http_stream');
