'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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
import { serviceService } from '@/services/service';
import { appointmentService } from '@/services/appointment-service';
import { Agendamento, Cliente, Servico, Profissional } from '@/types/tipos-auth';

// Zod validation schemas
const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  aniversario: z.string().optional().refine(
    (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
    { message: 'Data de aniversário inválida (use YYYY-MM-DD)' },
  ),
});

const agendamentoSchema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  servicoId: z.string().min(1, 'Selecione um serviço'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)'),
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (use HH:mm)'),
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

  // Load data on auth change
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user || !user.id) {
      console.log('Autenticação incompleta:', { authLoading, isAuthenticated, user });
      setCarregandoDados(false);
      return;
    }
    const carregarDados = async () => {
      try {
        setCarregandoDados(true);
        console.log('Carregando dados para usuário:', { id: user.id, email: user.email });
        const userDocRef = doc(firestore, 'users', user.id);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          console.warn('Documento do usuário não encontrado para ID:', user.id);
          setErro('Usuário não encontrado no banco de dados.');
          toast.error('Usuário não encontrado. Por favor, contate o suporte.');
          return;
        }
        await Promise.all([
          serviceService.getClientes(user.id).then((data) => {
            console.log('Clientes carregados:', data);
            setClientes(data);
          }),
          serviceService.getServicos(user.id).then((data) => {
            console.log('Serviços carregados:', data);
            setServicos(data);
          }),
          buscarProfissionais(user.id).catch((error) => {
            console.warn('Erro ao buscar profissionais, continuando com lista vazia:', error);
            setProfissionais([]); // Continue even if professionals fail
          }),
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
    carregarDados();
  }, [authLoading, isAuthenticated, user]);

  // Fetch professionals
  const buscarProfissionais = async (userId: string) => {
    try {
      console.log('Buscando profissionais para userId:', userId);
      const q = query(collection(firestore, 'users'), where('proprietarioId', '==', userId));
      const querySnapshot = await getDocs(q);
      const listaProfissionais = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Profissional));
      const userDocRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        listaProfissionais.push({ id: userId, ...userDoc.data() } as Profissional);
      }
      setProfissionais(listaProfissional);
      console.log('Profissionais encontrados:', listaProfissional);
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      throw error;
    }
  };

  // Fetch appointments
  const buscarAgendamentos = async (userId: string) => {
    try {
      console.log('Buscando agendamentos para userId:', userId);
      const agendamentosData = await appointmentService.obterAgendamentosUsuario(userId);
      console.log('Dados brutos de agendamentos:', agendamentosData);
      const listaAgendamentos = agendamentosData
        .map((agendamento) => {
          // Validate data and hora
          if (!agendamento.data || !agendamento.hora) {
            console.warn('Agendamento inválido, faltando data ou hora:', agendamento);
            return null;
          }
          const startStr = `${agendamento.data}T${agendamento.hora}:00-03:00`; // Brazil timezone
          const start = new Date(startStr);
          const end = new Date(start.getTime() + (agendamento.duracao || 30) * 60000);
          const event = {
            ...agendamento,
            start: isNaN(start.getTime()) ? null : start,
            end: isNaN(end.getTime()) ? null : end,
            title: `${agendamento.nomeCliente || 'Cliente'} - ${agendamento.nomeServico || 'Serviço'}`,
            backgroundColor: agendamento.corProfissional || '#3788d8',
          };
          console.log('Evento mapeado:', {
            id: agendamento.id,
            title: event.title,
            start: event.start?.toISOString() || 'null',
            end: event.end?.toISOString() || 'null',
            rawData: agendamento.data,
            rawHora: agendamento.hora,
            duracao: agendamento.duracao,
            backgroundColor: event.backgroundColor,
          });
          return event;
        })
        .filter((event) => event && event.start && event.end);
      setAgendamentos(listaAgendamentos);
      console.log('Agendamentos encontrados:', listaAgendamentos);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      setErro('Erro ao carregar agendamentos. Verifique permissões.');
      toast.error('Erro ao carregar agendamentos');
    }
  };

  // Fetch birthday clients
  const buscarClientesAniversario = async (userId: string) => {
    try {
      console.log('Buscando aniversariantes para userId:', userId);
      const clientes = await serviceService.getClientes(userId);
      const mesAtual = getMonth(new Date()) + 1;
      const listaAniversario = clientes.filter((cliente) => {
        if (!cliente.aniversario) return false;
        const mesAniversario = parse(cliente.aniversario, 'yyyy-MM-dd', new Date()).getMonth() + 1;
        return mesAniversario === mesAtual;
      });
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

  // Create client
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
      await serviceService.createCliente(
        {
          nome: validado.nome,
          telefone: validado.telefone,
          email: validado.email || '',
          aniversario: validado.aniversario || '',
          whatsapp: validado.telefone,
          recorrencia: 'nenhuma',
          proprietarioId: user.id, // Ensure proprietarioId is set
        },
        user.id,
      );
      console.log('Cliente cadastrado com sucesso');
      setNovoCliente({ nome: '', telefone: '', email: '', aniversario: '' });
      const clientesData = await serviceService.getClientes(user.id);
      console.log('Clientes atualizados:', clientesData);
      setClientes(clientesData);
      await buscarClientesAniversario(user.id);
      toast.success('Cliente cadastrado com sucesso!');
      setMostrarCadastroCliente(false);
      setAbrirDialogoAgendamento(true);
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      const mensagemErro =
        error instanceof z.ZodError
          ? error.errors.map((e) => e.message).join(', ')
          : error.message || 'Erro ao cadastrar cliente';
      toast.error(mensagemErro);
    }
  };

  // Create appointment
  const handleCriarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Tentando criar agendamento:', novoAgendamento);
    if (!user || !user.id) {
      console.error('Nenhum usuário autenticado ou ID ausente', { user });
      toast.error('Erro: Nenhum usuário autenticado');
      return;
    }
    try {
      const parsedAgendamento = {
        ...novoAgendamento,
        duracao: Number(novoAgendamento.duracao) || 30,
        custo: Number(novoAgendamento.custo) || 0,
      };
      const validado = agendamentoSchema.parse(parsedAgendamento);
      console.log('Dados validados do agendamento:', validado);
      const cliente = clientes.find((c) => c.id === validado.clienteId);
      const servico = servicos.find((s) => s.id === validado.servicoId);
      const profissional = profissionais.find((p) => p.id === validado.profissionalId);
      if (!cliente || !servico || !profissional) {
        console.error('Dados inválidos:', { cliente, servico, profissional });
        toast.error('Cliente, serviço ou profissional não encontrado.');
        return;
      }
      const agendamento: Agendamento = {
        clienteId: validado.clienteId,
        nomeCliente: cliente.nome,
        servicoId: validado.servicoId,
        nomeServico: servico.nome,
        data: validado.data,
        hora: validado.hora,
        duracao: validado.duracao,
        profissionalId: validado.profissionalId,
        nomeProfissional: profissional.nome,
        corProfissional: profissional.cor || '#3788d8',
        custo: validado.custo,
        recorrencia: validado.recorrencia,
        status: 'pendente',
        proprietarioId: user.id,
      };
      console.log('Agendamento a ser salvo:', agendamento);
      await appointmentService.criarAgendamento(agendamento);

      // Handle recurrence
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
            await appointmentService.criarAgendamento({
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
      if (error instanceof z.ZodError) {
        console.log('Detalhes do ZodError:', error.errors);
        toast.error(error.errors.map((e) => e.message).join(', '));
      } else {
        toast.error(error.message || 'Erro ao criar agendamento');
      }
    }
  };

  // Handle calendar date click
  const handleDataClique = (info: { date: Date }) => {
    console.log('Clique na data:', info.date.toISOString());
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

  // Daily financial summary
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

  // Debug state
  console.log('Estado atual:', { clientes, servicos, profissionais, agendamentos });

  return (
    <div className="min-h-screen bg-background p-4">
      <Head>
        <title>Agenda do Salão</title>
        <meta name="description" content="Sistema de agendamento para salão de beleza" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header and Financial Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold">Agenda</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              className="flex items-center gap-2"
              onClick={() => {
                setMostrarCadastroCliente(true);
                setAbrirDialogoAgendamento(true);
              }}
            >
              <UserPlusIcon className="h-4 w-4" /> Cadastrar Cliente
            </Button>
            <div className="text-sm">
              <p>
                <strong>Resumo Financeiro - {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}</strong>
              </p>
              <p>Total do Dia: R${resumoFinanceiroDiario().receitaTotal.toFixed(2)}</p>
              <p>Clientes Atendidos: {resumoFinanceiroDiario().clientesUnicos}</p>
              <p>Por Profissional:</p>
              <ul className="list-disc pl-5">
                {resumoFinanceiroDiario().receitasProfissionais.map((prof) => (
                  <li key={prof.nome}>
                    {prof.nome}: R${prof.receita.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Birthday Notification */}
        {clientesAniversario.length > 0 && (
          <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <h2 className="text-lg font-semibold">🎂 Aniversariantes do Mês</h2>
            <ul className="list-disc pl-5 mt-2">
              {clientesAniversario.map((cliente) => (
                <li key={cliente.id}>
                  {cliente.nome} -{' '}
                  {cliente.aniversario
                    ? format(parse(cliente.aniversario, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })
                    : 'N/A'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Appointment Dialog */}
        <Dialog open={abrirDialogoAgendamento} onOpenChange={setAbrirDialogoAgendamento}>
          <DialogContent className="sm:max-w-[425px] max-w-[90vw]">
            <DialogHeader>
              <DialogTitle>{mostrarCadastroCliente ? 'Cadastrar Cliente' : 'Novo Agendamento'}</DialogTitle>
              <DialogDescription>
                {mostrarCadastroCliente ? 'Preencha os dados do novo cliente.' : 'Crie um novo agendamento.'}
              </DialogDescription>
            </DialogHeader>
            {mostrarCadastroCliente ? (
              <form onSubmit={handleCriarCliente} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telefone">Telefone/WhatsApp</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                    placeholder="Ex.: +5511999999999"
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
                    placeholder="exemplo@dominio.com"
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
              <form onSubmit={handleCriarAgendamento} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="clienteId">Cliente</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={novoAgendamento.clienteId}
                      onValueChange={(value) => setNovoAgendamento({ ...novoAgendamento, clienteId: value })}
                      required
                    >
                      <SelectTrigger id="clienteId">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setMostrarCadastroCliente(true)}
                      title="Cadastrar novo cliente"
                    >
                      <UserPlusIcon className="h-4 w-4" />
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
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map((servico) => (
                        <SelectItem key={servico.id} value={servico.id}>
                          {servico.nome} - R${servico.preco.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={novoAgendamento.data}
                    onChange={(e) => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hora">Hora</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={novoAgendamento.hora}
                    onChange={(e) => setNovoAgendamento({ ...novoAgendamento, hora: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duracao">Duração (minutos)</Label>
                  <Input
                    id="duracao"
                    type="number"
                    value={novoAgendamento.duracao || ''}
                    onChange={(e) =>
                      setNovoAgendamento({
                        ...novoAgendamento,
                        duracao: e.target.value ? parseInt(e.target.value) : 30,
                      })
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
                      <SelectValue placeholder="Selecione o profissional" />
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
                    value={novoAgendamento.custo || ''}
                    onChange={(e) =>
                      setNovoAgendamento({
                        ...novoAgendamento,
                        custo: e.target.value ? parseFloat(e.target.value) : 0,
                      })
                    }
                    step="0.01"
                    min="0"
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
                        recorrencia: {
                          ...novoAgendamento.recorrencia,
                          frequencia: value as 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal',
                        },
                      })
                    }
                  >
                    <SelectTrigger id="recorrencia">
                      <SelectValue placeholder="Sem recorrência" />
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
                    <Input
                      id="dataFim"
                      type="date"
                      value={novoAgendamento.recorrencia.dataFim}
                      onChange={(e) =>
                        setNovoAgendamento({
                          ...novoAgendamento,
                          recorrencia: {
                            ...novoAgendamento.recorrencia,
                            dataFim: e.target.value,
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

        {/* Calendar Section */}
        <h2 className="mt-6 text-lg font-semibold">Agenda Semanal</h2>
        <div className="overflow-x-auto">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            initialDate="2025-06-01"
            locale={ptLocale}
            events={agendamentos}
            eventContent={(info) => {
              console.log('Renderizando evento:', {
                id: info.event.id,
                title: info.event.title,
                start: info.event.start?.toISOString() || 'null',
                end: info.event.end?.toISOString() || 'null',
              });
              return (
                <div
                  className="p-2 text-sm"
                  style={{ backgroundColor: info.event.backgroundColor || '#3788d8', color: 'white' }}
                >
                  <b>{info.event.title}</b>
                </div>
              );
            }}
            slotMinTime="08:00:00"
            slotMaxTime="22:00:00"
            height="auto"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay',
            }}
            dateClick={handleDataClique}
            eventDisplay="block"
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            validRange={{
              start: '2025-01-01',
              end: '2026-12-31',
            }}
            allDaySlot={false}
            timeZone="America/Sao_Paulo"
          />
        </div>
      </main>
    </div>
  );
}