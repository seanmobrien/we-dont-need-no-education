import { checkChatHealth } from './lib/api/health/chat';
import { env } from './lib/site-util/env';

async function main() {
  console.log('Checking chat health...');
  try {
    const result = await checkChatHealth();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
