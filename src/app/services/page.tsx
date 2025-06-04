'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { serviceService } from '@/services/service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import { Servico, Cliente } from '@/types/tipos-auth';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Esquema de validação para serviços
const servicoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  preco: z.number().min(0, 'Preço deve ser maior ou igual a 0'),
  duracao: z.number().min(5, 'Duração mínima é 5 minutos').multipleOf(5),
});

// Esquema de validação para clientes
const clienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  whatsapp: z.string().regex(/^\+?\d{10,15}$/, 'WhatsApp inválido').optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  aniversario: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de aniversário inválida').optional().or(z.literal('')),
  recorrencia: z.enum(['semanal', 'quinzenal', 'mensal', 'nenhuma']).optional().or(z.literal('')),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use formato #RRGGBB)').optional().or(z.literal('')),
});

export default function ServicesManagementPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [novoServico, setNovoServico] = useState({ nome: '', preco: 0, duracao: 30 });
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    aniversario: '',
    recorrencia: 'nenhuma' as 'semanal' | 'quinzenal' | 'mensal' | 'nenhuma',
    cor: '#3788d8',
  });
  const [editandoServico, setEditandoServico] = useState<Servico | null>(null);
  const [editandoCliente, setEditandoCliente] = useState<Cliente | null>(null);
  const [mostrarDialogoServico, setMostrarDialogoServico] = useState(false);
  const [mostrarDialogoCliente, setMostrarDialogoCliente] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.id) {
      setCarregando(false);
      return;
    }
    const carregarDados = async () => {
      setCarregando(true);
      try {
        const [servicosData, clientesData] = await Promise.all([
          serviceService.getServicos(user.id),
          serviceService.getClientes(user.id),
        ]);
        console.log('Serviços carregados:', servicosData);
        console.log('Clientes carregados:', clientesData);
        setServicos(servicosData);
        setClientes(clientesData);
        setErro(null);
      } catch (error: any) {
        console.error('Erro ao carregar dados:', error);
        const mensagemErro = error.message.includes('index')
          ? `Índice do banco de dados necessário. Crie o índice no Firebase Console: ${error.message}`
          : error.message.includes('permission-denied')
            ? 'Permissões insuficientes para carregar dados.'
            : 'Erro ao carregar dados';
        setErro(mensagemErro);
        toast.error(mensagemErro);
      } finally {
        setCarregando(false);
      }
    };
    carregarDados();
  }, [authLoading, isAuthenticated, user?.id]);

  const handleCriarServico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      const validado = servicoSchema.parse({
        ...novoServico,
        preco: Number(novoServico.preco) || 0,
        duracao: Number(novoServico.duracao) || 30,
      });
      if (editandoServico) {
        await serviceService.updateServico(
          { ...validado, id: editandoServico.id, proprietarioId: user.id },
          user.id
        );
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await serviceService.createServico({ ...validado, proprietarioId: user.id }, user.id);
        toast.success('Serviço cadastrado com sucesso!');
      }
      setNovoServico({ nome: '', preco: 0, duracao: 30 });
      setEditandoServico(null);
      setMostrarDialogoServico(false);
      const servicosData = await serviceService.getServicos(user.id);
      setServicos(servicosData);
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error);
      const mensagemErro =
        error instanceof z.ZodError
          ? error.errors.map((e) => e.message).join(', ')
          : error.message || 'Erro ao salvar serviço';
      toast.error(mensagemErro);
    }
  };

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      const validado = clienteSchema.parse(novoCliente);
      const clienteData = {
        nome: validado.nome,
        whatsapp: validado.whatsapp || '',
        email: validado.email || '',
        aniversario: validado.aniversario || '',
        recorrencia: validado.recorrencia || 'nenhuma',
        cor: validado.cor || '#3788d8',
        proprietarioId: user.id,
        receiveNotifications: true,
      };
      if (editandoCliente) {
        await serviceService.updateCliente(
          { ...clienteData, id: editandoCliente.id },
          user.id
        );
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await serviceService.createCliente(clienteData, user.id);
        toast.success('Cliente cadastrado com sucesso!');
      }
      setNovoCliente({
        nome: '',
        whatsapp: '',
        email: '',
        aniversario: '',
        recorrencia: 'nenhuma',
        cor: '#3788d8',
      });
      setEditandoCliente(null);
      setMostrarDialogoCliente(false);
      const clientesData = await serviceService.getClientes(user.id);
      setClientes(clientesData);
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      const mensagemErro =
        error instanceof z.ZodError
          ? error.errors.map((e) => e.message).join(', ')
          : error.message || 'Erro ao salvar cliente';
      toast.error(mensagemErro);
    }
  };

  const handleEditarServico = (servico: Servico) => {
    setNovoServico({ nome: servico.nome, preco: servico.preco, duracao: servico.duracao });
    setEditandoServico(servico);
    setMostrarDialogoServico(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setNovoCliente({
      nome: cliente.nome,
      whatsapp: cliente.whatsapp || '',
      email: cliente.email || '',
      aniversario: cliente.aniversario || '',
      recorrencia: cliente.recorrencia || 'nenhuma',
      cor: cliente.cor || '#3788d8',
    });
    setEditandoCliente(cliente);
    setMostrarDialogoCliente(true);
  };

  const handleExcluirServico = async (id: string) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      await serviceService.deleteServico(id);
      toast.success('Serviço excluído com sucesso!');
      const servicosData = await serviceService.getServicos(user.id);
      setServicos(servicosData);
    } catch (error: any) {
      console.error('Erro ao excluir serviço:', error);
      toast.error(error.message || 'Erro ao excluir serviço');
    }
  };

  const handleExcluirCliente = async (id: string) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      await serviceService.deleteCliente(id);
      toast.success('Cliente excluído com sucesso!');
      const clientesData = await serviceService.getClientes(user.id);
      setClientes(clientesData);
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      toast.error(error.message || 'Erro ao excluir cliente');
    }
  };

  if (authLoading || carregando) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div className="min-h-screen flex items-center justify-center">Por favor, faça login.</div>;
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {erro}
        {erro.includes('index') && (
          <p>
            <a
              href="https://console.firebase.google.com/v1/r/project/agendamento-rosy/firestore/indexes"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Criar índice no Firebase Console
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold mb-6">Gerenciamento de Serviços e Clientes</h1>

        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold">Serviços</h2>
            <Button className="border text-black dark:text-white" onClick={() => setMostrarDialogoServico(true)}>
              Novo Serviço
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço (R$)</TableHead>
                  <TableHead>Duração (min)</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicos.map((servico) => (
                  <TableRow key={servico.id}>
                    <TableCell>{servico.nome}</TableCell>
                    <TableCell>{servico.preco.toFixed(2)}</TableCell>
                    <TableCell>{servico.duracao}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button className='border text-black dark:text-white'
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditarServico(servico)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button className='border text-black dark:text-white'
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExcluirServico(servico.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold">Clientes</h2>
            <Button className="border text-black dark:text-white" onClick={() => setMostrarDialogoCliente(true)}>
              Novo Cliente
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Data de Aniversário</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>{cliente.nome}</TableCell>
                    <TableCell>{cliente.whatsapp || 'N/A'}</TableCell>
                    <TableCell>{cliente.email || 'N/A'}</TableCell>
                    <TableCell>
                      {cliente.aniversario
                        ? format(
                          parse(cliente.aniversario, 'yyyy-MM-dd', new Date()),
                          'dd/MM/yyyy',
                          { locale: ptBR }
                        )
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{cliente.recorrencia || 'Nenhuma'}</TableCell>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: cliente.cor || '#3788d8' }}
                      ></div>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon" className='border text-black dark:text-white'
                        onClick={() => handleEditarCliente(cliente)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon" className='border text-black dark:text-white'
                        onClick={() => handleExcluirCliente(cliente.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={mostrarDialogoServico} onOpenChange={setMostrarDialogoServico}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editandoServico ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
              <DialogDescription>Preencha os dados do serviço.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCriarServico} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={novoServico.nome}
                  onChange={(e) => setNovoServico({ ...novoServico, nome: e.target.value })}
                  placeholder="Ex.: Corte de Cabelo"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="preco">Preço (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  value={novoServico.preco}
                  onChange={(e) =>
                    setNovoServico({
                      ...novoServico,
                      preco: e.target.value ? parseFloat(e.target.value) : 0,
                    })
                  }
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duracao">Duração (minutos)</Label>
                <Input
                  id="duracao"
                  type="number"
                  value={novoServico.duracao}
                  onChange={(e) =>
                    setNovoServico({
                      ...novoServico,
                      duracao: e.target.value ? parseInt(e.target.value) : 30,
                    })
                  }
                  placeholder="30"
                  step="5"
                  min="5"
                  required
                />
              </div>
              <Button className='border text-black dark:text-white' type="submit">{editandoServico ? 'Atualizar' : 'Cadastrar'}</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={mostrarDialogoCliente} onOpenChange={setMostrarDialogoCliente}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editandoCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              <DialogDescription>Preencha os dados do cliente.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCriarCliente} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={novoCliente.nome}
                  onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                  placeholder="Ex.: João Silva"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                <Input
                  id="whatsapp"
                  value={novoCliente.whatsapp}
                  onChange={(e) => setNovoCliente({ ...novoCliente, whatsapp: e.target.value })}
                  placeholder="Ex.: +5511999999999"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={novoCliente.email}
                  onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                  placeholder="exemplo@dominio.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="aniversario">Data de Aniversário (opcional)</Label>
                <Input
                  id="aniversario"
                  type="date"
                  value={novoCliente.aniversario}
                  onChange={(e) => setNovoCliente({ ...novoCliente, aniversario: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recorrencia">Recorrência (opcional)</Label>
                <Select
                  value={novoCliente.recorrencia}
                  onValueChange={(value) =>
                    setNovoCliente({
                      ...novoCliente,
                      recorrencia: value as 'semanal' | 'quinzenal' | 'mensal' | 'nenhuma',
                    })
                  }
                >
                  <SelectTrigger id="recorrencia">
                    <SelectValue placeholder="Selecione a recorrência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Nenhuma</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
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
              <Button className='border text-black dark:text-white' type="submit">{editandoCliente ? 'Atualizar' : 'Cadastrar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}