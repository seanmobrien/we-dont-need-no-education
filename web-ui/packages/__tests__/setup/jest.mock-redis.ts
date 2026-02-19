import { createClient } from 'redis';

afterEach(() => {
  (createClient as (arg: string) => void)('teardown');
});
