// lib/hooks/useSession.ts
import { useQuery } from '@tanstack/react-query';
import { Session } from 'next-auth';

type SessionResponse<TSessionData extends object> = {
  status: 'authenticated' | 'unauthenticated';
  data: TSessionData | null;
};

type UseSessionResult<TSessionData extends object> = {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  data: TSessionData | null;
  isFetching: boolean;
  refetch: () => void;
};

const SESSION_QUERY_KEY = ['auth-session'];

export function useSession<
  TSessionData extends object = Session,
>(): UseSessionResult<TSessionData> {
  const query = useQuery<SessionResponse<TSessionData>>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) throw new Error('Failed to fetch session');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // SWR-style refresh every 5 min
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });

  const { data, isLoading, isFetching, refetch } = query;

  return {
    status: isLoading ? 'loading' : (data?.status ?? 'unauthenticated'),
    data: data?.data ?? null,
    isFetching,
    refetch,
  };
}
