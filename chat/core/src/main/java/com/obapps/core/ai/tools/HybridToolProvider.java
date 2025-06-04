/*
package com.obapps.core.ai.tools;

import dev.langchain4j.mcp.McpToolProvider;
import dev.langchain4j.mcp.client.DefaultMcpClient;
import dev.langchain4j.mcp.client.transport.McpTransport;
import dev.langchain4j.mcp.client.transport.http.HttpMcpTransport;
import dev.langchain4j.service.tool.ToolProvider;
import dev.langchain4j.service.tool.ToolProviderRequest;
import dev.langchain4j.service.tool.ToolProviderResult;

public class HybridToolProvider implements ToolProvider {

  private final McpToolProvider mcpToolProvider;

  public HybridToolProvider() {
    super();
    McpTransport transport = new HttpMcpTransport.Builder()
      .sseUrl("http://localhost:3000/api/ai/tools/sse")
      .logRequests(true) // if you want to see the traffic in the log
      .logResponses(true)
      .build();

    DefaultMcpClient defaultMcpClient = new DefaultMcpClient.Builder()
      .transport(transport)
      .build();

    mcpToolProvider = McpToolProvider.builder()
      .mcpClients(defaultMcpClient)
      .build();
  }

  @Override
  public ToolProviderResult provideTools(ToolProviderRequest request) {
    return mcpToolProvider.provideTools(request);
  }  
}
*/
