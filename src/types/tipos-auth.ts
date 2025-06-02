export interface Usuario {
  id: string;
  email: string | null;
  nomeExibicao: string | null;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  aniversario?: string; // Formato: yyyy-MM-dd
  proprietarioId: string;
}

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
  cor: string;
  proprietarioId?: string;
}

export interface Agendamento {
  id: string;
  clienteId: string;
  nomeCliente: string;
  servicoId: string;
  nomeServico: string;
  data: string;
  hora: string;
  duracao: number;
  profissionalId: string;
  nomeProfissional: string;
  corProfissional: string;
  custo: number;
  recorrencia: { frequencia: 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal'; dataFim?: string };
  status: 'confirmado' | 'pendente';
  proprietarioId: string;
  inicio?: Date;
  fim?: Date;
  titulo?: string;
  corFundo?: string;
}