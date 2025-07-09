import { config } from './common';

//import { registerOTel } from '@vercel/otel';

const instrument = () => {
  /*
  if (!config.instrumentations) {
    config.instrumentations = ['auto'];
  }
  registerOTel({
    ...config,
  });
  */
};

export default instrument;
