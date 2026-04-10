import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Newspaper, Clock } from 'lucide-react';

export default function NewsPage() {
  const { profile } = useAuth();
  const clanId = profile?.clan_id || '';
  const [news, setNews] = useState<any[]>([]);

  useEffect(() => {
    if (!clanId) return;
    supabase.from('news').select('*').eq('clan_id', clanId).order('created_at', { ascending: false })
      .then(({ data }) => setNews(data || []));
  }, [clanId]);

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3"><Newspaper size={28} /> NOTÍCIAS</h1>
      <div className="space-y-4">
        {news.map(item => (
          <div key={item.id} className="bg-card rounded-lg neon-border p-5">
            {item.image && <img src={item.image} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />}
            <h3 className="font-heading text-sm text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground font-display whitespace-pre-wrap">{item.content}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground font-display">
              <Clock size={12} />
              <span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        ))}
        {news.length === 0 && <p className="text-center text-muted-foreground font-display p-12">Nenhuma notícia ainda</p>}
      </div>
    </div>
  );
}
