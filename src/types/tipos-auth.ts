export interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  proprietarioId: string;
}

export interface Profissional {
  id: string;
  nome: string;
  email: string;
  cor: string;
  proprietarioId: string;
}

export interface Produto {
  id: string;
  nome: string;
  custo: number;
  quantidade: number;
  proprietarioId: string;
}

export interface Cliente {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  aniversario: string; // Formato: YYYY-MM-DD
  recorrencia: 'semanal' | 'quinzenal' | 'mensal' | 'nenhuma';
  proprietarioId: string;
}