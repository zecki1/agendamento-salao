'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppointment } from '@/hooks/useAppointment';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import Head from 'next/head';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptLocale from '@fullcalendar/core/locales/pt';
import { format, addDays, addWeeks, addMonths, getMonth, parse, add, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';
import { UserPlusIcon, Trash2 } from 'lucide-react';
import { serviceService } from '@/services/service';
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
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use formato #RRGGBB)').optional(),
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
  }).refine(
    (data) => data.frequencia === 'nenhuma' || !!data.dataFim,
    { message: 'Data final é obrigatória para recorrências', path: ['recorrencia', 'dataFim'] }
  ),
});

export default function AgendaPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { appointments, loading: appointmentsLoading, error: appointmentsError, fetchAppointments, createAppointment, updateAppointment, cancelAppointment } = useAppointment();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', email: '', aniversario: '', cor: '#3788d8' });
  const [novoAgendamento, setNovoAgendamento] = useState({
    clienteId: '',
    servicoId: '',
    data: format(new Date(), 'yyyy-MM-dd', { locale: ptBR }),
    hora: format(new Date(), 'HH:mm', { locale: ptBR }),
    duracao: 30,
    profissionalId: '',
    custo: 0,
    recorrencia: { frequencia: 'nenhuma' as const, dataFim: '' },
  });
  const [editandoAgendamento, setEditandoAgendamento] = useState<Agendamento | null>(null);
  const [mostrarCadastroCliente, setMostrarCadastroCliente] = useState(false);
  const [abrirDialogoAgendamento, setAbrirDialogoAgendamento] = useState(false);
  const [dataClicada, setDataClicada] = useState<Date | null>(null);
  const [clientesAniversario, setClientesAniversario] = useState<Cliente[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    console.log('Data atual:', new Date().toISOString());
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) {
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

        const tasks = [
          serviceService.getClientes(user.id)
            .then((data) => {
              console.log('Clientes carregados:', data);
              setClientes(data);
            })
            .catch((error) => {
              console.warn('Erro ao carregar clientes:', error);
              setClientes([]);
            }),
          serviceService.getServicos(user.id)
            .then((data) => {
              console.log('Serviços carregados:', data);
              setServicos(data);
            })
            .catch((error) => {
              console.warn('Erro ao carregar serviços:', error);
              setServicos([]);
            }),
          buscarProfissionais(user.id)
            .catch((error) => {
              console.warn('Erro ao carregar profissionais:', error);
              setProfissionais([]);
            }),
          buscarClientesAniversario(user.id)
            .catch((error) => {
              console.warn('Erro ao carregar aniversariantes:', error);
              setClientesAniversario([]);
            }),
        ];

        await Promise.all(tasks);
      } catch (error) {
        console.error('Erro geral ao carregar dados:', error);
        setErro('Erro ao carregar dados. Tente novamente.');
        toast.error('Erro ao carregar dados');
      } finally {
        setCarregandoDados(false);
      }
    };
    carregarDados();
  }, [authLoading, isAuthenticated, user?.id]);

  const buscarProfissionais = async (userId: string) => {
    const q = query(collection(firestore, 'users'), where('proprietarioId', '==', userId));
    const querySnapshot = await getDocs(q);
    const listaProfissionais = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Profissional));
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      listaProfissionais.push({ id: userId, ...userDoc.data() } as Profissional);
    }
    setProfissionais(listaProfissionais);
    console.log('Profissionais carregados:', listaProfissionais);
  };

  const buscarClientesAniversario = async (userId: string) => {
    const clientes = await serviceService.getClientes(userId);
    const mesAtual = getMonth(new Date()) + 1;
    const listaAniversario = clientes.filter((cliente) => {
      if (!cliente.aniversario) return false;
      const mesAniversario = parse(cliente.aniversario, 'yyyy-MM-dd', new Date()).getMonth() + 1;
      return mesAniversario === mesAtual;
    });
    setClientesAniversario(listaAniversario);
    if (listaAniversario.length > 0) {
      toast.info(`🎉 ${listaAniversario.length} cliente(s) fazem aniversário este mês!`);
    }
  };

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Erro ao buscar usuário');
      return;
    }
    try {
      const validado = clienteSchema.parse(novoCliente);
      await serviceService.createCliente(
        {
          nome: validado.nome,
          telefone: validado.telefone,
          whatsapp: validado.telefone,
          email: validado.email || '',
          aniversario: validado.aniversario || '',
          cor: validado.cor || '#3788d8',
          recorrencia: 'nenhuma',
          proprietarioId: user.id,
        },
        user.id,
      );
      setNovoCliente({ nome: '', telefone: '', email: '', aniversario: '', cor: '#3788d8' });
      const clientesData = await serviceService.getClientes(user.id);
      setClientes(clientesData);
      await buscarClientesAniversario(user.id);
      toast.success('Cliente cadastrado com sucesso!');
      setMostrarCadastroCliente(false);
      setAbrirDialogoAgendamento(true);
    } catch (error: any) {
      const mensagemErro =
        error instanceof z.ZodError
          ? error.errors.map((e) => e.message).join(', ')
          : error.message || 'Erro ao cadastrar cliente';
      toast.error(mensagemErro);
    }
  };

  const handleSalvarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('novoAgendamento:', novoAgendamento);
    if (!user?.id) {
      toast.error('Erro ao buscar usuário');
      return;
    }
    if (!novoAgendamento.profissionalId && profissionais.length > 0) {
      setNovoAgendamento((prev) => ({
        ...prev,
        profissionalId: profissionais[0].id,
      }));
      toast.info('Profissional selecionado automaticamente.');
      return;
    }
    try {
      const parsedAgendamento = {
        ...novoAgendamento,
        duracao: Number(novoAgendamento.duracao) || 30,
        custo: Number(novoAgendamento.custo) || 0,
        recorrencia: {
          ...novoAgendamento.recorrencia,
          dataFim: novoAgendamento.recorrencia.frequencia !== 'nenhuma' && !novoAgendamento.recorrencia.dataFim
            ? format(add(new Date(novoAgendamento.data), { months: 3 }), 'yyyy-MM-dd', { locale: ptBR })
            : novoAgendamento.recorrencia.dataFim,
        },
      };
      console.log('parsedAgendamento:', parsedAgendamento);
      const validado = agendamentoSchema.parse(parsedAgendamento);
      const cliente = clientes.find((c) => c.id === validado.clienteId);
      const servico = servicos.find((s) => s.id === validado.servicoId);
      const profissional = profissionais.find((p) => p.id === validado.profissionalId);
      if (!cliente || !servico || !profissional) {
        toast.error('Cliente, serviço ou profissional não encontrado.');
        return;
      }
      // Parse initial date in America/Sao_Paulo timezone
      const initialDate = parse(validado.data, 'yyyy-MM-dd', new Date());
      console.log('Initial date:', initialDate.toISOString(), 'Day of week:', getDay(initialDate));
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
        corCliente: cliente.cor || '#3788d8',
        custo: validado.custo,
        recorrencia: validado.recorrencia,
        status: 'pendente',
        proprietarioId: user.id,
      };
      if (editandoAgendamento) {
        agendamento.id = editandoAgendamento.id;
        try {
          await updateAppointment(agendamento);
        } catch (error: any) {
          if (error.message.includes('Documento não encontrado')) {
            console.warn('Documento não encontrado, criando novo agendamento:', agendamento.id);
            delete agendamento.id;
            await createAppointment(agendamento);
            toast.success('Agendamento criado como novo devido a ausência do original.');
          } else {
            throw error;
          }
        }
      } else {
        await createAppointment(agendamento);
        console.log('Recorrência:', validado.recorrencia);
        if (validado.recorrencia.frequencia !== 'nenhuma' && validado.recorrencia.dataFim) {
          let dataAtual = initialDate;
          const dataFim = parse(validado.recorrencia.dataFim, 'yyyy-MM-dd', new Date());
          console.log('Iniciando loop de recorrência:', { dataAtual: dataAtual.toISOString(), dataFim: dataFim.toISOString() });
          while (dataAtual < dataFim) {
            dataAtual =
              validado.recorrencia.frequencia === 'semanal'
                ? addDays(dataAtual, 7)
                : validado.recorrencia.frequencia === 'quinzenal'
                  ? addWeeks(dataAtual, 2)
                  : addMonths(dataAtual, 1);
            if (dataAtual <= dataFim) {
              console.log('Data recorrente:', dataAtual.toISOString(), 'Day of week:', getDay(dataAtual));
              const recurrente: Agendamento = {
                ...agendamento,
                data: format(dataAtual, 'yyyy-MM-dd', { locale: ptBR }),
                hora: validado.hora,
              };
              console.log('Criando agendamento recorrente:', recurrente);
              await createAppointment(recurrente);
            }
          }
        }
      }
      setNovoAgendamento({
        clienteId: '',
        servicoId: '',
        data: format(new Date(), 'yyyy-MM-dd', { locale: ptBR }),
        hora: format(new Date(), 'HH:mm', { locale: ptBR }),
        duracao: 30,
        profissionalId: '',
        custo: 0,
        recorrencia: { frequencia: 'nenhuma', dataFim: '' },
      });
      setEditandoAgendamento(null);
      setAbrirDialogoAgendamento(false);
      toast.success(editandoAgendamento ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar agendamento:', error);
      if (error instanceof z.ZodError) {
        console.log('ZodError details:', error.errors);
        toast.error(error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '));
      } else {
        toast.error(error.message || 'Erro ao salvar agendamento');
      }
    }
  };

  const handleExcluirAgendamento = async () => {
    if (!editandoAgendamento || !user?.id) {
      toast.error('Erro ao buscar agendamento ou usuário');
      return;
    }
    try {
      await cancelAppointment(editandoAgendamento.id!);
      setAbrirDialogoAgendamento(false);
      setEditandoAgendamento(null);
      toast.success('Agendamento excluído com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir agendamento');
    }
  };

  const handleDataClique = (info: { date: Date }) => {
    if (!user?.id) {
      toast.error('Erro ao buscar usuário');
      return;
    }
    setDataClicada(info.date);
    setNovoAgendamento({
      ...novoAgendamento,
      data: format(info.date, 'yyyy-MM-dd', { locale: ptBR }),
      hora: format(info.date, 'HH:mm', { locale: ptBR }),
    });
    setEditandoAgendamento(null);
    setMostrarCadastroCliente(false);
    setAbrirDialogoAgendamento(true);
  };

  const handleEventClique = (info: { event: { extendedProps: Agendamento } }) => {
    if (!user?.id) {
      toast.error('Erro ao buscar usuário');
      return;
    }
    const agendamento = info.event.extendedProps;
    setNovoAgendamento({
      clienteId: agendamento.clienteId || '',
      servicoId: agendamento.servicoId || '',
      data: agendamento.data || format(new Date(), 'yyyy-MM-dd', { locale: ptBR }),
      hora: agendamento.hora || format(new Date(), 'HH:mm', { locale: ptBR }),
      duracao: agendamento.duracao || 30,
      profissionalId: agendamento.profissionalId || '',
      custo: agendamento.custo || 0,
      recorrencia: {
        frequencia: agendamento.recorrencia.frequencia || 'nenhuma',
        dataFim: agendamento.recorrencia.dataFim || '',
      },
    });
    setEditandoAgendamento(agendamento);
    setMostrarCadastroCliente(false);
    setAbrirDialogoAgendamento(true);
  };

  const resumoFinanceiroDiario = () => {
    const hoje = format(new Date(), 'yyyy-MM-dd', { locale: ptBR });
    const agendamentosDiarios = appointments.filter((agendamento) => agendamento.data === hoje);
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

  if (authLoading || appointmentsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div className="min-h-screen flex items-center justify-center">Por favor, faça login.</div>;
  }

  if (erro || appointmentsError) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{erro || appointmentsError}</div>;
  }

  if (carregandoDados) {
    return <div className="min-h-screen flex items-center justify-center">Carregando dados...</div>;
  }

  console.log('Estado atual:', { clientes, appointments, servicos, profissionais });

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <Head>
        <title>Agenda do Salão</title>
        <meta name="description" content="Sistema de agendamento para salão de beleza" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold">Agenda</h1>
            <Button
              className="flex items-center gap-2 w-full sm:w-auto border text-black dark:text-white"
              onClick={() => {
                setMostrarCadastroCliente(true);
                setEditandoAgendamento(null);
                setAbrirDialogoAgendamento(true);
              }}
            >
              <UserPlusIcon className="h-4 w-4" /> Cadastrar Cliente
            </Button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-2">
              Resumo Financeiro - {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Total do Dia:</span>
                <span className="text-green-600">R${resumoFinanceiroDiario().receitaTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Clientes Atendidos:</span>
                <span>{resumoFinanceiroDiario().clientesUnicos}</span>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <span className="font-medium">Por Profissional:</span>
                <ul className="mt-1 space-y-1">
                  {resumoFinanceiroDiario().receitasProfissionais.map((prof) => (
                    <li key={prof.nome} className="flex justify-between">
                      <span>{prof.nome}</span>
                      <span className="text-green-600">R${prof.receita.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

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

        <Dialog open={abrirDialogoAgendamento} onOpenChange={setAbrirDialogoAgendamento}>
          <DialogContent className="sm:max-w-[425px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {mostrarCadastroCliente ? 'Cadastrar Cliente' : editandoAgendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
              </DialogTitle>
              <DialogDescription>
                {mostrarCadastroCliente ? 'Preencha os dados do novo cliente.' : 'Gerencie o agendamento.'}
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
                <div className="grid gap-2">
                  <Label htmlFor="cor">Cor do Cliente</Label>
                  <Input
                    id="cor"
                    type="color"
                    value={novoCliente.cor}
                    onChange={(e) => setNovoCliente({ ...novoCliente, cor: e.target.value })}
                    className="h-10 w-20"
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
              <form onSubmit={handleSalvarAgendamento} className="grid gap-4">
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
                    value={novoAgendamento.duracao}
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
                      <SelectValue placeholder={profissionais.length === 0 ? 'Nenhum profissional disponível' : 'Selecione o profissional'} />
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
                    required
                  >
                    <SelectTrigger id="recorrencia">
                      <SelectValue placeholder="Sem repetição" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Sem repetição</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {novoAgendamento.recorrencia.frequencia !== 'nenhuma' && (
                  <div className="grid gap-2">
                    <Label htmlFor="dataFim">Data Final da Repetição</Label>
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
                      required
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button className="border text-black dark:text-white" type="submit">
                    {editandoAgendamento ? 'Atualizar' : 'Agendar'}
                  </Button>
                  {editandoAgendamento && (
                    <Button
                      variant="destructive"
                      onClick={handleExcluirAgendamento}
                      className="flex items-center gap-2 border"
                    >
                      <Trash2 className="h-4 w-4" /> Excluir
                    </Button>
                  )}
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <h2 className="mt-6 text-lg font-semibold">Agenda Semanal</h2>
        <div className="overflow-x-auto w-full">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={ptLocale}
            events={appointments.map((event) => {
              const startStr = `${event.data}T${event.hora}:00-03:00`;
              const start = new Date(startStr);
              const end = new Date(start.getTime() + (event.duracao || 30) * 60000);
              return {
                ...event,
                extendedProps: event,
                start: isNaN(start.getTime()) ? null : start,
                end: isNaN(end.getTime()) ? null : end,
                title: `${event.nomeCliente || 'Cliente'} - ${event.nomeServico || 'Serviço'}`,
                backgroundColor: event.corCliente || '#3788d8',
              };
            }).filter((event): event is Agendamento & { start: Date; end: Date } => event.start !== null && event.end !== null)}
            eventContent={(info) => (
              <div
                className="fc-event-main p-1 text-sm sm:text-xs rounded-md"
                style={{
                  backgroundColor: info.event.backgroundColor || '#3788d8',
                  color: 'white',
                  width: '100%',
                  height: '100%',
                }}
              >
                <b>{info.event.title}</b>
              </div>
            )}
            slotMinTime="08:00:00"
            slotMaxTime="21:00:00"
            height="auto"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay',
            }}
            dateClick={handleDataClique}
            eventClick={handleEventClique}
            eventDisplay="block"
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            validRange={{
              start: '2025-01-01',
              end: '2027-01-01',
            }}
            allDaySlot={false}
            timeZone="America/Sao_Paulo"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md"
          />
        </div>
      </main>
    </div>
  );
}