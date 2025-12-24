// import { config } from './common';

const instrument = () => {
  /*
  if (!config.instrumentations) {
    config.instrumentations = ['auto'];
  }
  registerOTel({
    ...config,
  });
  */
  // NOTE: log methods not available at edge runtime and until after instrumentation is complete
  console.warn('Instrumentation is currently disabled at edge.');
};

export default instrument;
