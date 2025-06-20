'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDocs, collection, addDoc, updateDoc, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

// Esquema de validação para produtos
const produtoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  custo: z.number().min(0, 'Custo deve ser maior ou igual a 0'),
  quantidade: z.number().min(0, 'Quantidade deve ser maior ou igual a 0'),
});

// Esquema de validação para uso de produtos em agendamentos
const usoProdutoSchema = z.object({
  agendamentoId: z.string().min(1, 'Selecione um agendamento'),
  produtoId: z.string().min(1, 'Selecione um produto'),
  quantidade: z.number().min(1, 'Quantidade deve ser maior que 0'),
});

interface Produto {
  id: string;
  nome: string;
  custo: number;
  quantidade: number;
  proprietarioId: string;
  criadoEm?: Date;
}

interface Agendamento {
  id: string;
  nomeCliente: string;
  data: string;
  custo: number;
  proprietarioId: string;
  criadoEm?: Date;
}

interface UsoProduto {
  id: string;
  agendamentoId: string;
  produtoId: string;
  quantidade: number;
  data: string;
  proprietarioId: string;
  criadoEm?: Date;
}

export default function ReportsCostsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [usoProdutos, setUsoProdutos] = useState<UsoProduto[]>([]);
  const [novoProduto, setNovoProduto] = useState({ nome: '', custo: 0, quantidade: 0 });
  const [novoUsoProduto, setNovoUsoProduto] = useState({ agendamentoId: '', produtoId: '', quantidade: 1 });
  const [editandoProduto, setEditandoProduto] = useState<Produto | null>(null);
  const [mostrarDialogoProduto, setMostrarDialogoProduto] = useState(false);
  const [mostrarDialogoUsoProduto, setMostrarDialogoUsoProduto] = useState(false);
  const [relatorioPeriodo, setRelatorioPeriodo] = useState('semanal');
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
        await Promise.all([
          buscarProdutos(user.id),
          buscarAgendamentos(user.id),
          buscarUsoProdutos(user.id),
        ]);
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

  const buscarProdutos = async (userId: string) => {
    try {
      const q = query(
        collection(firestore, 'products'),
        where('proprietarioId', '==', userId),
        orderBy('criadoEm', 'desc')
      );
      const querySnapshot = await getDocs(q);
      setProdutos(
        querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          criadoEm: doc.data().criadoEm && typeof doc.data().criadoEm.toDate === 'function'
            ? doc.data().criadoEm.toDate()
            : new Date(),
        } as Produto))
      );
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  };

  const buscarAgendamentos = async (userId: string) => {
    try {
      const q = query(
        collection(firestore, 'appointments'),
        where('proprietarioId', '==', userId),
        where('status', '==', 'pendente'),
        orderBy('criadoEm', 'desc')
      );
      const querySnapshot = await getDocs(q);
      setAgendamentos(
        querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          criadoEm: doc.data().criadoEm && typeof doc.data().criadoEm.toDate === 'function'
            ? doc.data().criadoEm.toDate()
            : new Date(),
        } as Agendamento))
      );
    } catch (error: any) {
      console.error('Erro ao buscar agendamentos:', error);
      throw error;
    }
  };

  const buscarUsoProdutos = async (userId: string) => {
    try {
      const q = query(
        collection(firestore, 'productUsage'),
        where('proprietarioId', '==', userId),
        orderBy('criadoEm', 'desc')
      );
      const querySnapshot = await getDocs(q);
      setUsoProdutos(
        querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          criadoEm: doc.data().criadoEm && typeof doc.data().criadoEm.toDate === 'function'
            ? doc.data().criadoEm.toDate()
            : new Date(),
        } as UsoProduto))
      );
    } catch (error: any) {
      console.error('Erro ao buscar uso de produtos:', error);
      throw error;
    }
  };

  const handleCriarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      const validado = produtoSchema.parse({
        ...novoProduto,
        custo: Number(novoProduto.custo) || 0,
        quantidade: Number(novoProduto.quantidade) || 0,
      });
      if (editandoProduto) {
        await updateDoc(doc(firestore, 'products', editandoProduto.id), {
          ...validado,
          proprietarioId: user.id,
          atualizadoEm: Timestamp.fromDate(new Date()),
        });
        toast.success('Produto atualizado com sucesso!');
      } else {
        await addDoc(collection(firestore, 'products'), {
          ...validado,
          proprietarioId: user.id,
          criadoEm: Timestamp.fromDate(new Date()),
        });
        toast.success('Produto cadastrado com sucesso!');
      }
      setNovoProduto({ nome: '', custo: 0, quantidade: 0 });
      setEditandoProduto(null);
      setMostrarDialogoProduto(false);
      await buscarProdutos(user.id);
    } catch (error: any) {
      const mensagemErro =
        error instanceof z.ZodError
          ? error.errors.map((e) => e.message).join(', ')
          : error.message || 'Erro ao salvar produto';
      toast.error(mensagemErro);
    }
  };

  const handleCriarUsoProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      const validado = usoProdutoSchema.parse({
        ...novoUsoProduto,
        quantidade: Number(novoUsoProduto.quantidade) || 1,
      });
      const produto = produtos.find((p) => p.id === validado.produtoId);
      if (!produto) {
        throw new Error('Produto não encontrado');
      }
      if (produto.quantidade < validado.quantidade) {
        throw new Error(`Estoque insuficiente: apenas ${produto.quantidade} unidades disponíveis`);
      }
      await addDoc(collection(firestore, 'productUsage'), {
        ...validado,
        proprietarioId: user.id,
        data: new Date().toISOString(),
        criadoEm: Timestamp.fromDate(new Date()),
      });
      // Atualizar estoque
      await updateDoc(doc(firestore, 'products', validado.produtoId), {
        quantidade: produto.quantidade - validado.quantidade,
        atualizadoEm: Timestamp.fromDate(new Date()),
      });
      toast.success('Uso de produto registrado com sucesso!');
      setNovoUsoProduto({ agendamentoId: '', produtoId: '', quantidade: 1 });
      setMostrarDialogoUsoProduto(false);
      await Promise.all([buscarUsoProdutos(user.id), buscarProdutos(user.id)]);
    } catch (error: any) {
      const mensagemErro =
        error instanceof z.ZodError
          ? error.errors.map((e) => e.message).join(', ')
          : error.message || 'Erro ao registrar uso de produto';
      toast.error(mensagemErro);
    }
  };

  const handleEditarProduto = (produto: Produto) => {
    setNovoProduto({ nome: produto.nome, custo: produto.custo, quantidade: produto.quantidade });
    setEditandoProduto(produto);
    setMostrarDialogoProduto(true);
  };

  const handleExcluirProduto = async (id: string) => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    try {
      const uso = usoProdutos.find((u) => u.produtoId === id);
      if (uso) {
        throw new Error('Produto está associado a um uso registrado');
      }
      await deleteDoc(doc(firestore, 'products', id));
      toast.success('Produto excluído com sucesso!');
      await buscarProdutos(user.id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir produto');
    }
  };

  const gerarRelatorio = () => {
    const hoje = new Date();
    let dataInicio: Date, dataFim: Date;
    if (relatorioPeriodo === 'semanal') {
      dataInicio = startOfWeek(hoje, { locale: ptBR });
      dataFim = endOfWeek(hoje, { locale: ptBR });
    } else if (relatorioPeriodo === 'quinzenal') {
      dataInicio = startOfWeek(hoje, { locale: ptBR });
      dataFim = endOfWeek(addWeeks(hoje, 1), { locale: ptBR });
    } else {
      dataInicio = startOfMonth(hoje);
      dataFim = endOfMonth(hoje);
    }

    const agendamentosPeriodo = agendamentos.filter((agendamento) => {
      const dataAgendamento = new Date(agendamento.data);
      return dataAgendamento >= dataInicio && dataAgendamento <= dataFim;
    });

    const receitaTotal = agendamentosPeriodo.reduce((soma, ag) => soma + (ag.custo || 0), 0);
    const usoProdutosPeriodo = usoProdutos.filter((uso) => {
      const dataUso = new Date(uso.data);
      return dataUso >= dataInicio && dataUso <= dataFim;
    });

    const custoTotalProdutos = usoProdutosPeriodo.reduce((soma, uso) => {
      const produto = produtos.find((p) => p.id === uso.produtoId);
      return soma + (produto ? produto.custo * uso.quantidade : 0);
    }, 0);

    return {
      receitaTotal,
      custoTotalProdutos,
      lucroLiquido: receitaTotal - custoTotalProdutos,
      agendamentos: agendamentosPeriodo.length,
      usoProdutos: usoProdutosPeriodo,
    };
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

  const relatorio = gerarRelatorio();

  return (
    <div className="min-h-screen bg-background p-4">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Relatórios e Custos</h1>

        {/* Relatório */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Relatório Financeiro</h2>
          <Select value={relatorioPeriodo} onValueChange={setRelatorioPeriodo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="quinzenal">Quinzenal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
            </SelectContent>
          </Select>
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p><strong>Período:</strong> {relatorioPeriodo.charAt(0).toUpperCase() + relatorioPeriodo.slice(1)}</p>
            <p><strong>Receita Total:</strong> R${relatorio.receitaTotal.toFixed(2)}</p>
            <p><strong>Custo de Produtos:</strong> R${relatorio.custoTotalProdutos.toFixed(2)}</p>
            <p><strong>Lucro Líquido:</strong> R${relatorio.lucroLiquido.toFixed(2)}</p>
            <p><strong>Agendamentos:</strong> {relatorio.agendamentos}</p>
          </div>
        </div>

        {/* Gerenciamento de Produtos */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Produtos</h2>
            <Button className="border text-black dark:text-white" onClick={() => setMostrarDialogoProduto(true)}>
              Novo Produto
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Custo (R$)</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>{produto.nome}</TableCell>
                  <TableCell>{produto.custo.toFixed(2)}</TableCell>
                  <TableCell>{produto.quantidade}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="ghost" onClick={() => handleEditarProduto(produto)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => handleExcluirProduto(produto.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Registro de Uso de Produtos */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Uso de Produtos</h2>
            <Button className="border text-black dark:text-white" onClick={() => setMostrarDialogoUsoProduto(true)}>
              Registrar Uso
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agendamento</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usoProdutos.map((uso) => (
                <TableRow key={uso.id}>
                  <TableCell>{agendamentos.find((ag) => ag.id === uso.agendamentoId)?.nomeCliente || 'N/A'}</TableCell>
                  <TableCell>{produtos.find((p) => p.id === uso.produtoId)?.nome || 'N/A'}</TableCell>
                  <TableCell>{uso.quantidade}</TableCell>
                  <TableCell>{format(new Date(uso.data), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Diálogo para Produtos */}
        <Dialog open={mostrarDialogoProduto} onOpenChange={setMostrarDialogoProduto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editandoProduto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
              <DialogDescription>Preencha os dados do produto.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCriarProduto} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={novoProduto.nome}
                  onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="custo">Custo (R$)</Label>
                <Input
                  id="custo"
                  type="number"
                  value={novoProduto.custo}
                  onChange={(e) =>
                    setNovoProduto({ ...novoProduto, custo: parseFloat(e.target.value) || 0 })
                  }
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantidade">Quantidade em Estoque</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={novoProduto.quantidade}
                  onChange={(e) =>
                    setNovoProduto({ ...novoProduto, quantidade: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  required
                />
              </div>
              <Button type="submit">{editandoProduto ? 'Atualizar' : 'Cadastrar'}</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Diálogo para Uso de Produtos */}
        <Dialog open={mostrarDialogoUsoProduto} onOpenChange={setMostrarDialogoUsoProduto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Uso de Produto</DialogTitle>
              <DialogDescription>Selecione o agendamento e o produto utilizado.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCriarUsoProduto} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="agendamentoId">Agendamento</Label>
                <Select
                  value={novoUsoProduto.agendamentoId}
                  onValueChange={(value) => setNovoUsoProduto({ ...novoUsoProduto, agendamentoId: value })}
                  required
                >
                  <SelectTrigger id="agendamentoId">
                    <SelectValue placeholder="Selecione o Agendamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {agendamentos.map((agendamento) => (
                      <SelectItem key={agendamento.id} value={agendamento.id}>
                        {agendamento.nomeCliente} - {format(new Date(agendamento.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="produtoId">Produto</Label>
                <Select
                  value={novoUsoProduto.produtoId}
                  onValueChange={(value) => setNovoUsoProduto({ ...novoUsoProduto, produtoId: value })}
                  required
                >
                  <SelectTrigger id="produtoId">
                    <SelectValue placeholder="Selecione o Produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome} (Estoque: {produto.quantidade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={novoUsoProduto.quantidade}
                  onChange={(e) =>
                    setNovoUsoProduto({ ...novoUsoProduto, quantidade: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  required
                />
              </div>
              <Button type="submit">Registrar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}