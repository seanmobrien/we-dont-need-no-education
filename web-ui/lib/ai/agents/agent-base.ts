class AgentBase {
  constructor() {
    // Base class for agents
  }

  // Common methods and properties for all agents can be defined here
  protected generateResponse(input: string): Promise<string> {
    return Promise.resolve(`Response for ${input}`);
  }
}

export default AgentBase;
