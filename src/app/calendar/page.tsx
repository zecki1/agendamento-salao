'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDocs, collection, addDoc, query, where, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import Head from 'next/head';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import { format, addDays, addWeeks, addMonths, getMonth, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';
import { UserPlusIcon } from 'lucide-react';
import { TimeSelector } from '@/components/shared/TimeSelector';
import { DatePicker } from '@/components/shared/date-picker';
import { Agendamento, Cliente, Servico, Profissional } from '@/types/tipos-auth';

// Esquemas de validação com Zod
const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  aniversario: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Data de aniversário inválida' }
  ),
});

const agendamentoSchema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  servicoId: z.string().min(1, 'Selecione um serviço'),
  data: z.string().min(1, 'Data é obrigatória'),
  hora: z.string().min(1, 'Hora é obrigatória'),
  duracao: z.number().min(5, 'Duração mínima é 5 minutos').multipleOf(5),
  profissionalId: z.string().min(1, 'Selecione um profissional'),
  custo: z.number().min(0, 'Custo deve ser maior ou igual a 0'),
  recorrencia: z.object({
    frequencia: z.enum(['nenhuma', 'semanal', 'quinzenal', 'mensal']),
    dataFim: z.string().optional(),
  }),
});

export default function AgendaPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', email: '', aniversario: '' });
  const [novoAgendamento, setNovoAgendamento] = useState({
    clienteId: '',
    servicoId: '',
    data: '',
    hora: '',
    duracao: 30,
    profissionalId: '',
    custo: 0,
    recorrencia: { frequencia: 'nenhuma' as const, dataFim: '' },
  });
  const [mostrarCadastroCliente, setMostrarCadastroCliente] = useState(false);
  const [abrirDialogoAgendamento, setAbrirDialogoAgendamento] = useState(false);
  const [dataClicada, setDataClicada] = useState<Date | null>(null);
  const [clientesAniversario, setClientesAniversario] = useState<Cliente[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Verificar autenticação e carregar dados
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user || !user.id) {
      console.log('Autenticação incompleta:', { authLoading, isAuthenticated, user });
      setCarregandoDados(false);
      return;
    }
    const verificarUsuario = async () => {
      try {
        setCarregandoDados(true);
        console.log('Verificando usuário:', { uid: user.id, email: user.email });
        const userDocRef = doc(firestore, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : null;
        console.log('Dados do usuário:', userData);
        if (!userData) {
          console.warn('Documento do usuário não encontrado para UID:', user.id);
          setErro('Usuário não encontrado no banco de dados.');
          return;
        }
        await Promise.all([
          buscarClientes(user.id),
          buscarServicos(user.id),
          buscarProfissionais(user.id),
          buscarAgendamentos(user.id),
          buscarClientesAniversario(user.id),
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setErro('Erro ao carregar dados. Tente novamente.');
        toast.error('Erro ao carregar dados');
      } finally {
        setCarregandoDados(false);
      }
    };
    verificarUsuario();
  }, [authLoading, isAuthenticated, user]);

  // Buscar clientes
  const buscarClientes = async (userId: string) => {
    try {
      console.log('Buscando clientes para userId:', userId);
      const querySnapshot = await getDocs(collection(firestore, 'clients'));
      const listaClientes = querySnapshot.docs
        .filter((doc) => doc.data().proprietarioId === userId)
        .map((doc) => ({ id: doc.id, ...doc.data() } as Cliente));
      setClientes(listaClientes);
      console.log('Clientes encontrados:', listaClientes);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      throw error;
    }
  };

  // Buscar clientes com aniversário no mês atual
  const buscarClientesAniversario = async (userId: string) => {
    try {
      console.log('Buscando aniversariantes para userId:', userId);
      const querySnapshot = await getDocs(collection(firestore, 'clients'));
      const mesAtual = getMonth(new Date()) + 1; // 1-12
      const listaAniversario = querySnapshot.docs
        .filter((doc) => {
          const cliente = doc.data() as Cliente;
          if (!cliente.aniversario || cliente.proprietarioId !== userId) return false;
          const mesAniversario = parse(cliente.aniversario, 'yyyy-MM-dd', new Date()).getMonth() + 1;
          return mesAniversario === mesAtual;
        })
        .map((doc) => ({ id: doc.id, ...doc.data() } as Cliente));
      setClientesAniversario(listaAniversario);
      console.log('Aniversariantes encontrados:', listaAniversario);
      if (listaAniversario.length > 0) {
        toast.info(`🎉 ${listaAniversario.length} cliente(s) fazem aniversário este mês!`);
      }
    } catch (error) {
      console.error('Erro ao buscar aniversariantes:', error);
      throw error;
    }
  };

  // Buscar serviços
  const buscarServicos = async (userId: string) => {
    try {
      console.log('Buscando serviços para userId:', userId);
      const querySnapshot = await getDocs(collection(firestore, 'services'));
      setServicos(
        querySnapshot.docs
          .filter((doc) => doc.data().proprietarioId === userId)
          .map((doc) => ({ id: doc.id, ...doc.data() } as Servico)),
      );
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      throw error;
    }
  };

  // Buscar profissionais
  const buscarProfissionais = async (userId: string) => {
    try {
      console.log('Buscando profissionais para userId:', userId);
      const querySnapshot = await getDocs(collection(firestore, 'users'));
      setProfissionais(
        querySnapshot.docs
          .filter((doc) => doc.data().proprietarioId === userId || doc.id === userId)
          .map((doc) => ({ id: doc.id, ...doc.data() } as Profissional)),
      );
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      throw error;
    }
  };

  // Buscar agendamentos
  const buscarAgendamentos = async (userId: string) => {
    try {
      console.log('Buscando agendamentos para userId:', userId);
      const querySnapshot = await getDocs(collection(firestore, 'appointments'));
      setAgendamentos(
        querySnapshot.docs
          .filter((doc) => doc.data().proprietarioId === userId)
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              inicio: new Date(`${data.data}T${data.hora}`),
              fim: new Date(new Date(`${data.data}T${data.hora}`).getTime() + data.duracao * 60000),
              titulo: `${data.nomeCliente} - ${data.nomeServico}`,
              corFundo: data.corProfissional,
            } as Agendamento;
          }),
      );
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      throw error;
    }
  };

  // Criar cliente
  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Tentando cadastrar cliente:', novoCliente);
    if (!user || !user.id) {
      console.error('Nenhum usuário autenticado ou ID ausente', { user });
      toast.error('Erro: Nenhum usuário autenticado');
      return;
    }
    try {
      const validado = clienteSchema.parse(novoCliente);
      console.log('Dados validados do cliente:', validado);
      const docRef = await addDoc(collection(firestore, 'clients'), {
        ...validado,
        proprietarioId: user.id,
      });
      console.log('Cliente cadastrado com ID:', docRef.id);
      setNovoCliente({ nome: '', telefone: '', email: '', aniversario: '' });
      await buscarClientes(user.id);
      await buscarClientesAniversario(user.id);
      toast.success('Cliente cadastrado com sucesso!');
      setMostrarCadastroCliente(false);
      setAbrirDialogoAgendamento(true); // Volta para o agendamento
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      const mensagemErro = error instanceof z.ZodError
        ? error.errors.map(e => e.message).join(', ')
        : error.message || 'Erro ao cadastrar cliente';
      toast.error(mensagemErro);
    }
  };

  // Criar agendamento
  const handleCriarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Tentando criar agendamento:', novoAgendamento);
    if (!user || !user.id) {
      console.error('Nenhum usuário autenticado ou ID ausente', { user });
      toast.error('Erro: Nenhum usuário autenticado');
      return;
    }
    try {
      const validado = agendamentoSchema.parse(novoAgendamento);
      console.log('Dados validados do agendamento:', validado);
      const cliente = clientes.find((c) => c.id === validado.clienteId);
      const servico = servicos.find((s) => s.id === validado.servicoId);
      const profissional = profissionais.find((p) => p.id === validado.profissionalId);
      if (!cliente || !servico || !profissional) {
        console.error('Dados inválidos:', { cliente, servico, profissional });
        toast.error('Cliente, serviço ou profissional não encontrado.');
        return;
      }
      const agendamento = {
        clienteId: validado.clienteId,
        nomeCliente: cliente.nome,
        servicoId: validado.servicoId,
        nomeServico: servico.nome,
        data: validado.data,
        hora: validado.hora,
        duracao: validado.duracao,
        profissionalId: validado.profissionalId,
        nomeProfissional: profissional.nome,
        corProfissional: profissional.cor,
        custo: validado.custo,
        recorrencia: validado.recorrencia,
        status: 'pendente' as const,
        proprietarioId: user.id,
      };
      const docRef = await addDoc(collection(firestore, 'appointments'), agendamento);
      console.log('Agendamento criado com ID:', docRef.id);

      // Recorrência
      if (validado.recorrencia.frequencia !== 'nenhuma' && validado.recorrencia.dataFim) {
        let dataAtual = new Date(validado.data);
        const dataFim = new Date(validado.recorrencia.dataFim);
        while (dataAtual < dataFim) {
          dataAtual =
            validado.recorrencia.frequencia === 'semanal'
              ? addDays(dataAtual, 7)
              : validado.recorrencia.frequencia === 'quinzenal'
                ? addWeeks(dataAtual, 2)
                : addMonths(dataAtual, 1);
          if (dataAtual <= dataFim) {
            await addDoc(collection(firestore, 'appointments'), {
              ...agendamento,
              data: format(dataAtual, 'yyyy-MM-dd', { locale: ptBR }),
              hora: validado.hora,
            });
          }
        }
      }

      setNovoAgendamento({
        clienteId: '',
        servicoId: '',
        data: '',
        hora: '',
        duracao: 30,
        profissionalId: '',
        custo: 0,
        recorrencia: { frequencia: 'nenhuma', dataFim: '' },
      });
      await buscarAgendamentos(user.id);
      toast.success('Agendamento criado com sucesso!');
      setAbrirDialogoAgendamento(false);
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      const mensagemErro = error instanceof z.ZodError
        ? error.errors.map(e => e.message).join(', ')
        : error.message || 'Erro ao criar agendamento';
      toast.error(mensagemErro);
    }
  };

  // Lidar com clique no calendário
  const handleDataClique = (info: { date: Date }) => {
    console.log('Clique na data:', info.date);
    if (!user || !user.id) {
      console.error('Nenhum usuário autenticado ou ID ausente', { user });
      toast.error('Erro: Nenhum usuário autenticado');
      return;
    }
    setDataClicada(info.date);
    setNovoAgendamento({
      ...novoAgendamento,
      data: format(info.date, 'yyyy-MM-dd', { locale: ptBR }),
      hora: format(info.date, 'HH:mm', { locale: ptBR }),
    });
    setAbrirDialogoAgendamento(true);
  };

  // Resumo financeiro diário
  const resumoFinanceiroDiario = () => {
    const hoje = format(new Date(), 'yyyy-MM-dd', { locale: ptBR });
    const agendamentosDiarios = agendamentos.filter((agendamento) => agendamento.data === hoje);
    const receitaTotal = agendamentosDiarios.reduce((soma, agendamento) => soma + agendamento.custo, 0);
    const clientesUnicos = [...new Set(agendamentosDiarios.map((agendamento) => agendamento.clienteId))].length;
    const receitasProfissionais = profissionais.map((prof) => {
      const agendamentosProf = agendamentosDiarios.filter(
        (agendamento) => agendamento.profissionalId === prof.id,
      );
      return {
        nome: prof.nome,
        receita: agendamentosProf.reduce((soma, agendamento) => soma + agendamento.custo, 0),
      };
    });
    return { receitaTotal, clientesUnicos, receitasProfissionais };
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div className="min-h-screen flex items-center justify-center">Por favor, faça login.</div>;
  }

  if (erro) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{erro}</div>;
  }

  if (carregandoDados) {
    return <div className="min-h-screen flex items-center justify-center">Carregando dados...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Head>
        <title>Agenda do Salão</title>
        <meta name="description" content="Sistema de agendamento para salão de beleza" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Agenda</h1>
          <div className="flex items-center gap-4">
            <Button className="flex items-center gap-2" onClick={() => setAbrirDialogoAgendamento(true)}>
              <UserPlusIcon className="h-4 w-4" /> Cadastrar Cliente
            </Button>
            <div className="text-sm">
              <p><strong>Resumo Financeiro - {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}</strong></p>
              <p>Total do Dia: R${resumoFinanceiroDiario().receitaTotal.toFixed(2)}</p>
              <p>Clientes Atendidos: {resumoFinanceiroDiario().clientesUnicos}</p>
              <p>Por Profissional:</p>
              <ul className="list-disc pl-5">
                {resumoFinanceiroDiario().receitasProfissionais?.map((prof) => (
                  <li key={prof.nome}>
                    {prof.nome}: R${prof.receita.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Notificação de Aniversariantes */}
        {clientesAniversario.length > 0 && (
          <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <h2 className="text-lg font-semibold">🎂 Aniversariantes do Mês</h2>
            <ul className="list-disc pl-5 mt-2">
              {clientesAniversario.map((cliente) => (
                <li key={cliente.id}>
                  {cliente.nome} - {cliente.aniversario ? format(parse(cliente.aniversario, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR }) : 'N/A'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dialogo de Agendamento */}
        <Dialog open={abrirDialogoAgendamento} onOpenChange={setAbrirDialogoAgendamento}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{mostrarCadastroCliente ? 'Cadastrar Cliente' : 'Novo Agendamento'}</DialogTitle>
              <DialogDescription>
                {mostrarCadastroCliente ? 'Preencha os dados do novo cliente.' : 'Crie um novo agendamento selecionando cliente, serviço e horário.'}
              </DialogDescription>
            </DialogHeader>
            {mostrarCadastroCliente ? (
              <form onSubmit={handleCriarCliente} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={novoCliente.email}
                    onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="aniversario">Aniversário (opcional)</Label>
                  <Input
                    id="aniversario"
                    type="date"
                    value={novoCliente.aniversario}
                    onChange={(e) => setNovoCliente({ ...novoCliente, aniversario: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Cadastrar</Button>
                  <Button variant="outline" onClick={() => setMostrarCadastroCliente(false)}>
                    Voltar
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCriarAgendamento} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="clienteId">Cliente</Label>
                  <div className="flex gap-2">
                    <Select
                      value={novoAgendamento.clienteId}
                      onValueChange={(value) => setNovoAgendamento({ ...novoAgendamento, clienteId: value })}
                      required
                    >
                      <SelectTrigger id="clienteId">
                        <SelectValue placeholder="Selecione o Cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => setMostrarCadastroCliente(true)}>
                      Novo Cliente
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="servicoId">Serviço</Label>
                  <Select
                    value={novoAgendamento.servicoId}
                    onValueChange={(value) => {
                      const servico = servicos.find((s) => s.id === value);
                      setNovoAgendamento({
                        ...novoAgendamento,
                        servicoId: value,
                        custo: servico?.preco || 0,
                        duracao: servico?.duracao || 30,
                      });
                    }}
                    required
                  >
                    <SelectTrigger id="servicoId">
                      <SelectValue placeholder="Selecione o Serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map((servico) => (
                        <SelectItem key={servico.id} value={servico.id}>
                          {servico.nome} - R${servico.preco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="data">Data</Label>
                  <DatePicker
                    date={novoAgendamento.data ? new Date(novoAgendamento.data) : undefined}
                    setDate={(date) =>
                      setNovoAgendamento({
                        ...novoAgendamento,
                        data: date ? format(date, 'yyyy-MM-dd', { locale: ptBR }) : '',
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hora">Hora</Label>
                  <TimeSelector
                    selectedDate={novoAgendamento.data ? new Date(novoAgendamento.data) : undefined}
                    selectedTime={novoAgendamento.hora}
                    onSelectTime={(hora) => setNovoAgendamento({ ...novoAgendamento, hora: hora || '' })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duracao">Duração (minutos)</Label>
                  <Input
                    id="duracao"
                    type="number"
                    value={novoAgendamento.duracao}
                    onChange={(e) =>
                      setNovoAgendamento({ ...novoAgendamento, duracao: parseInt(e.target.value) })
                    }
                    step="5"
                    min="5"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profissionalId">Profissional</Label>
                  <Select
                    value={novoAgendamento.profissionalId}
                    onValueChange={(value) => setNovoAgendamento({ ...novoAgendamento, profissionalId: value })}
                    required
                  >
                    <SelectTrigger id="profissionalId">
                      <SelectValue placeholder="Selecione o Profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionais.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="custo">Custo (R$)</Label>
                  <Input
                    id="custo"
                    type="number"
                    value={novoAgendamento.custo}
                    onChange={(e) =>
                      setNovoAgendamento({ ...novoAgendamento, custo: parseFloat(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="recorrencia">Recorrência</Label>
                  <Select
                    value={novoAgendamento.recorrencia.frequencia}
                    onValueChange={(value) =>
                      setNovoAgendamento({
                        ...novoAgendamento,
                        recorrencia: { ...novoAgendamento.recorrencia, frequencia: value as 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal' },
                      })
                    }
                  >
                    <SelectTrigger id="recorrencia">
                      <SelectValue placeholder="Sem Recorrência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Sem Recorrência</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {novoAgendamento.recorrencia.frequencia !== 'nenhuma' && (
                  <div className="grid gap-2">
                    <Label htmlFor="dataFim">Data Final da Recorrência</Label>
                    <DatePicker
                      date={novoAgendamento.recorrencia.dataFim ? new Date(novoAgendamento.recorrencia.dataFim) : undefined}
                      setDate={(date) =>
                        setNovoAgendamento({
                          ...novoAgendamento,
                          recorrencia: {
                            ...novoAgendamento.recorrencia,
                            dataFim: date ? format(date, 'yyyy-MM-dd', { locale: ptBR }) : '',
                          },
                        })
                      }
                    />
                  </div>
                )}
                <Button type="submit">Agendar</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Visão Semanal */}
        <h2 className="mt-6 text-lg font-semibold">Agenda Semanal</h2>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={ptLocale}
          events={agendamentos}
          eventContent={(eventInfo) => (
            <div className="p-1 text-sm" style={{ backgroundColor: eventInfo.event.corFundo, color: 'white' }}>
              <b>{eventInfo.event.titulo}</b>
            </div>
          )}
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          height="auto"
          headerToolbar={{
            left: 'prev,next hoje',
            center: 'title',
            right: 'timeGridWeek,timeGridDay',
          }}
          dateClick={handleDataClique}
        />
      </main>
    </div>
  );
}