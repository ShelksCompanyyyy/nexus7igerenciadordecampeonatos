import { useState, useEffect, useCallback } from 'react';
import {
  fetchProfiles, fetchTeams, fetchMatches, fetchTrainings, fetchNews,
  fetchChatMessages, fetchWithdrawals, fetchSpinPurchases, fetchClans,
  fetchTransfers, fetchNotifications,
  type Profile, type SbTeam, type SbMatch, type SbTraining, type SbNewsItem,
  type SbChatMessage, type SbWithdrawal, type SbSpinPurchase, type SbClan,
  type SbTransfer, type SbNotification,
} from '@/lib/supabaseStore';

function useAsyncData<T>(fetcher: () => Promise<T[]>, deps: any[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await fetcher();
    setData(result);
    setLoading(false);
  }, deps);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, refresh };
}

export function useProfiles() { return useAsyncData<Profile>(fetchProfiles); }
export function useTeams() { return useAsyncData<SbTeam>(fetchTeams); }
export function useMatches() { return useAsyncData<SbMatch>(fetchMatches); }
export function useTrainings() { return useAsyncData<SbTraining>(fetchTrainings); }
export function useNews() { return useAsyncData<SbNewsItem>(fetchNews); }
export function useChatMessages() { return useAsyncData<SbChatMessage>(fetchChatMessages); }
export function useWithdrawals() { return useAsyncData<SbWithdrawal>(fetchWithdrawals); }
export function useSpinPurchases() { return useAsyncData<SbSpinPurchase>(fetchSpinPurchases); }
export function useClans() { return useAsyncData<SbClan>(fetchClans); }
export function useTransfers() { return useAsyncData<SbTransfer>(fetchTransfers); }

export function useNotifications(userId: string | undefined) {
  const [data, setData] = useState<SbNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setData([]); setLoading(false); return; }
    const result = await fetchNotifications(userId);
    setData(result);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, refresh };
}
