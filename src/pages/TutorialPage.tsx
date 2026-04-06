import { useState } from 'react';
import { BookOpen, ChevronRight, ChevronLeft, Home, Trophy, Users, Swords, Target, Dices, ShoppingBag, Newspaper, MessageSquare, UserCircle, Shield, Crown, KeyRound, X } from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    icon: BookOpen,
    title: 'Bem-vindo ao Nexus7i E-Sports!',
    content: 'Esta é a plataforma oficial de campeonatos e-sports da Nexus7i. Aqui você gerencia seu clã, participa de partidas, acompanha rankings e muito mais!',
    details: [
      'Cada clã funciona de forma isolada — você só vê dados do seu clã.',
      'Todos os jogadores precisam selecionar um clã ao criar a conta.',
      'O sistema é dividido em: Jogador, Admin de Clã e Super Admin.',
    ],
  },
  {
    icon: UserCircle,
    title: 'Criando sua Conta',
    content: 'Para começar, registre-se na tela de login como Jogador.',
    details: [
      'Preencha: Username, Nick do Jogo, WhatsApp, Email e Senha.',
      'Selecione o clã do qual você faz parte na lista.',
      'Após o registro, você já entra automaticamente no app.',
      'Se esquecer a senha, use "Esqueci minha senha" para recuperar via email.',
    ],
  },
  {
    icon: Shield,
    title: 'O que é o Código de Admin do Clã?',
    content: 'O código de admin é uma senha exclusiva criada pelo líder do clã. Ele é necessário para acessar o painel de administração do clã.',
    details: [
      '🔐 O código é criado pelo Super Admin ao cadastrar o clã.',
      '🔑 Para fazer login como Admin, use a aba "Admin" na tela de login.',
      '📝 Você precisa do email + senha + código de admin do clã.',
      '⚠️ Sem o código, não é possível acessar o painel de admin.',
      '🛡️ O código protege o gerenciamento do clã contra acessos não autorizados.',
      '💡 Peça o código ao líder/fundador do seu clã.',
    ],
  },
  {
    icon: Home,
    title: 'Página Inicial',
    content: 'A Home mostra um resumo do seu clã: próximas partidas, últimas notícias e estatísticas rápidas.',
    details: [
      'Veja suas estatísticas pessoais (kills, mortes, K/D).',
      'Acompanhe as partidas mais recentes.',
      'Confira as últimas notícias do seu clã.',
    ],
  },
  {
    icon: Trophy,
    title: 'Ranking',
    content: 'O ranking mostra os melhores jogadores e times do seu clã, além de uma visão pública de todos os clãs.',
    details: [
      '📊 Abas: Jogadores (K/D), Times (vitórias), MVP e Gold.',
      '🏆 Aba "Clãs" é pública — todos podem ver os clãs do app.',
      '👀 Clique em um clã para ver seus membros e times.',
      '🔒 Dados detalhados (KDA exato) só são visíveis dentro do próprio clã.',
    ],
  },
  {
    icon: Users,
    title: 'Times (Lines)',
    content: 'Times são as linhas competitivas do seu clã. Cada line participa de partidas e treinos.',
    details: [
      'Veja os times do seu clã e seus jogadores.',
      'Admins podem criar, editar e gerenciar os times.',
      'As premiações são de campeonatos de lines contra lines.',
    ],
  },
  {
    icon: Swords,
    title: 'Partidas',
    content: 'Acompanhe partidas agendadas, ao vivo e finalizadas do seu clã.',
    details: [
      'Partidas mostram placar, estatísticas individuais e MVPs.',
      'Admins criam e atualizam as partidas.',
      'Filtre por status: Próximas, Ao Vivo, Finalizadas.',
    ],
  },
  {
    icon: Target,
    title: 'XTreino',
    content: 'Treinos internos entre times do mesmo clã. Prepare-se para os campeonatos!',
    details: [
      'Similar às partidas, mas exclusivo para treinos.',
      'Admins agendam e registram resultados.',
      'Estatísticas de treino são separadas das de campeonato.',
    ],
  },
  {
    icon: Dices,
    title: 'Roleta',
    content: 'Gire a roleta para ganhar Gold! Compre rodadas via Pix.',
    details: [
      'Pacotes: 1 a 4 rodadas com bônus.',
      'Prêmios variam de 5G a 500G.',
      'Gold pode ser sacado quando atingir o mínimo (500G).',
      'Na hora do saque, informe sua chave Pix para recebimento.',
    ],
  },
  {
    icon: ShoppingBag,
    title: 'Loja',
    content: 'Personalize seu perfil com itens exclusivos usando Gold.',
    details: [
      '🖼️ Quadros brilhantes e únicos para sua foto de perfil.',
      '🎨 Nicks coloridos com gradientes e efeitos neon.',
      '🏅 Badges exclusivas para exibir no chat.',
      '✨ Todos os itens aparecem no Chat Geral para todos verem!',
    ],
  },
  {
    icon: Newspaper,
    title: 'Notícias',
    content: 'Fique por dentro de tudo que acontece no seu clã.',
    details: [
      'Admins publicam avisos, resultados e novidades.',
      'Notícias são exclusivas do seu clã.',
      'Acompanhe comunicados importantes.',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Chat Geral',
    content: 'Converse com todos os jogadores do app em tempo real.',
    details: [
      'Nicks coloridos e quadros aparecem aqui!',
      'Badges são exibidas ao lado do nome.',
      'Use o botão "Limpar Chat" para limpar suas mensagens.',
      'O chat é global — todos os clãs compartilham o mesmo chat.',
    ],
  },
  {
    icon: Crown,
    title: 'Painel Admin (Líder de Clã)',
    content: 'Admins de clã gerenciam tudo dentro do seu clã isoladamente.',
    details: [
      '👥 Gerenciar membros: adicionar, editar KDA, MVPs.',
      '⚔️ Gerenciar Lines: criar times, adicionar logo, jogadores.',
      '🎮 Gerenciar Partidas: criar, atualizar placar e stats.',
      '🏋️ Gerenciar XTreinos: agendar e registrar treinos.',
      '📰 Gerenciar Notícias: publicar avisos e comunicados.',
      '❌ Admins NÃO podem: ver outros clãs, alterar economia, acessar Super Admin.',
    ],
  },
  {
    icon: KeyRound,
    title: 'Dicas Finais',
    content: 'Aproveite ao máximo a plataforma Nexus7i!',
    details: [
      '💡 Mantenha seu perfil atualizado com foto e nick.',
      '🎮 Participe ativamente de partidas e treinos.',
      '🛒 Personalize seu perfil na Loja com Gold.',
      '📱 O app funciona perfeitamente no celular.',
      '🔐 Nunca compartilhe o código de admin do seu clã.',
      '🏆 Suba no ranking com bom desempenho nas lines!',
    ],
  },
];

export default function TutorialPage() {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading text-primary text-glow flex items-center gap-3">
        <BookOpen size={28} /> TUTORIAL
      </h1>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-display text-muted-foreground">
          <span>Passo {step + 1} de {TUTORIAL_STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-card rounded-lg neon-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground">
            <Icon size={24} />
          </div>
          <h2 className="font-heading text-lg text-foreground">{current.title}</h2>
        </div>

        <p className="text-sm text-muted-foreground font-display leading-relaxed">{current.content}</p>

        <div className="space-y-2 pt-2">
          {current.details.map((detail, i) => (
            <div key={i} className="flex items-start gap-2 text-sm font-display text-foreground">
              <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded font-heading text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-secondary text-foreground hover:bg-secondary/80">
          <ChevronLeft size={16} /> Anterior
        </button>
        <div className="flex gap-1.5">
          {TUTORIAL_STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-primary w-6 box-glow-sm' : 'bg-secondary hover:bg-muted-foreground'}`}
            />
          ))}
        </div>
        <button onClick={() => setStep(Math.min(TUTORIAL_STEPS.length - 1, step + 1))} disabled={step === TUTORIAL_STEPS.length - 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded font-heading text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed gradient-primary text-primary-foreground">
          Próximo <ChevronRight size={16} />
        </button>
      </div>

      {/* Step quick nav */}
      <div className="flex flex-wrap gap-2 pt-2">
        {TUTORIAL_STEPS.map((s, i) => {
          const StepIcon = s.icon;
          return (
            <button key={i} onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-heading transition-all ${
                i === step ? 'gradient-primary text-primary-foreground box-glow-sm' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}>
              <StepIcon size={12} /> {s.title.split(' ').slice(0, 2).join(' ')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
