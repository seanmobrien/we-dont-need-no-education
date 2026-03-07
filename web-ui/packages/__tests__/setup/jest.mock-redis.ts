import { createClient } from '@redis/client';

afterEach(() => {
  (createClient as (arg: string) => void)('teardown');
});
