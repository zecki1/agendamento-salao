export interface Cliente {
  id?: string;
  nome: string;
  telefone?: string;
  whatsapp: string;
  email?: string;
  aniversario?: string;
  recorrencia: 'semanal' | 'quinzenal' | 'mensal' | 'nenhuma';
  proprietarioId: string;
  cor?: string; // Client color for calendar
}

export interface Servico {
  id?: string;
  nome: string;
  preco: number;
  duracao: number;
  proprietarioId?: string;
}

export interface Profissional {
  id: string;
  nome: string;
  cor?: string;
  proprietarioId?: string;
}

export interface Agendamento {
  id?: string;
  clienteId: string;
  nomeCliente?: string;
  servicoId: string;
  nomeServico?: string;
  data: string;
  hora: string;
  duracao: number;
  profissionalId: string;
  nomeProfissional?: string;
  corCliente?: string; // Client color
  custo: number;
  recorrencia: {
    frequencia: 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal';
    dataFim?: string;
  };
  status: string;
  proprietarioId: string;
  criadoEm?: Date;
}