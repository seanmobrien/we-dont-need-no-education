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
  console.warn('Instrumentation is currently disabled at edge.');
};

export default instrument;
