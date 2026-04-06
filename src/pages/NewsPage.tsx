import { getNews } from '@/lib/store';
import { Newspaper, Clock } from 'lucide-react';

export default function NewsPage() {
  const news = [...getNews()].reverse();

  return (
    <div className="space-y-6 animate-slide-up">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3"><Newspaper size={28} /> NOTÍCIAS</h1>
      <div className="space-y-4">
        {news.map(item => (
          <div key={item.id} className="bg-card rounded-lg neon-border p-5">
            <h3 className="font-heading text-sm text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground font-display whitespace-pre-wrap">{item.content}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground font-display">
              <Clock size={12} />
              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
            </div>
          </div>
        ))}
        {news.length === 0 && <p className="text-center text-muted-foreground font-display p-12">Nenhuma notícia publicada</p>}
      </div>
    </div>
  );
}
