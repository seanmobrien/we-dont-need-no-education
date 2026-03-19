import { type UseQueryResult } from '@compliance-theater/react-query-compat';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@compliance-theater/react-query-compat/runtime';

const queryClient = new QueryClient();

type ConsumerQueryResult = UseQueryResult<string, Error>;

const ConsumerComponent = () => {
  const query = useQuery<string>({
    queryKey: ['consumer-smoke'],
    queryFn: async () => 'ready',
    enabled: false,
  });

  const _result: ConsumerQueryResult = query;

  return <div>{query.data ?? 'pending'}</div>;
};

export const ConsumerApp = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConsumerComponent />
    </QueryClientProvider>
  );
};
