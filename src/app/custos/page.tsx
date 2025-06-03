'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDocs, collection, addDoc, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';

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

export default function ReportsCostsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [usoProdutos, setUsoProdutos] = useState([]);
  const [novoProduto, setNovoProduto] = useState({ nome: '', custo: 0, quantidade: 0 });
  const [novoUsoProduto, setNovoUsoProduto] = useState({ agendamentoId: '', produtoId: '', quantidade: 1 });
  const [editandoProduto, setEditandoProduto] = useState(null);
  const [mostrarDialogoProduto, setMostrarDialogoProduto] = useState(false);
  const [mostrarDialogoUsoProduto, setMostrarDialogoUsoProduto] = useState(false);
  const [relatorioPeriodo, setRelatorioPeriodo] = useState('semanal');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user || !user.id) return;
    const carregarDados = async () => {
      setCarregando(true);
      try {
        await Promise.all([
          buscarProdutos(user.id),
          buscarAgendamentos(user.id),
          buscarUsoProdutos(user.id),
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setCarregando(false);
      }
    };
    carregarDados();
  }, [authLoading, isAuthenticated, user]);

  const buscarProdutos = async (userId) => {
    const q = query(collection(firestore, 'products'), where('proprietarioId', '==', userId));
    const querySnapshot = await getDocs(q);
    setProdutos(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const buscarAgendamentos = async (userId) => {
    const q = query(collection(firestore, 'appointments'), where('proprietarioId', '==', userId));
    const querySnapshot = await getDocs(q);
    setAgendamentos(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const buscarUsoProdutos = async (userId) => {
    const q = query(collection(firestore, 'productUsage'), where('proprietarioId', '==', userId));
    const querySnapshot = await getDocs(q);
    setUsoProdutos(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const handleCriarProduto = async (e) => {
    e.preventDefault();
    try {
      const validado = produtoSchema.parse(novoProduto);
      if (editandoProduto) {
        await updateDoc(doc(firestore, 'products', editandoProduto.id), {
          ...validado,
          proprietarioId: user.id,
        });
        toast.success('Produto atualizado com sucesso!');
      } else {
        await addDoc(collection(firestore, 'products'), {
          ...validado,
          proprietarioId: user.id,
        });
        toast.success('Produto cadastrado com sucesso!');
      }
      setNovoProduto({ nome: '', custo: 0, quantidade: 0 });
      setEditandoProduto(null);
      setMostrarDialogoProduto(false);
      await buscarProdutos(user.id);
    } catch (error) {
      const mensagemErro = error instanceof z.ZodError
        ? error.errors.map(e => e.message).join(', ')
        : 'Erro ao salvar produto';
      toast.error(mensagemErro);
    }
  };

  const handleCriarUsoProduto = async (e) => {
    e.preventDefault();
    try {
      const validado = usoProdutoSchema.parse(novoUsoProduto);
      await addDoc(collection(firestore, 'productUsage'), {
        ...validado,
        proprietarioId: user.id,
        data: new Date().toISOString(),
      });
      toast.success('Uso de produto registrado com sucesso!');
      setNovoUsoProduto({ agendamentoId: '', produtoId: '', quantidade: 1 });
      setMostrarDialogoUsoProduto(false);
      await buscarUsoProdutos(user.id);
    } catch (error) {
      const mensagemErro = error instanceof z.ZodError
        ? error.errors.map(e => e.message).join(', ')
        : 'Erro ao registrar uso de produto';
      toast.error(mensagemErro);
    }
  };

  const handleEditarProduto = (produto) => {
    setNovoProduto({ nome: produto.nome, custo: produto.custo, quantidade: produto.quantidade });
    setEditandoProduto(produto);
    setMostrarDialogoProduto(true);
  };

  const handleExcluirProduto = async (id) => {
    try {
      await deleteDoc(doc(firestore, 'products', id));
      toast.success('Produto excluído com sucesso!');
      await buscarProdutos(user.id);
    } catch (error) {
      toast.error('Erro ao excluir produto');
    }
  };

  const gerarRelatorio = () => {
    const hoje = new Date();
    let dataInicio, dataFim;
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

    const receitaTotal = agendamentosPeriodo.reduce((soma, ag) => soma + ag.custo, 0);
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

  if (carregando) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

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
            <p><strong>Período:</strong> {relatorioPeriodo}</p>
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
            <Button className='border text-black dark:text-white' onClick={() => setMostrarDialogoProduto(true)}>Novo Produto</Button>
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
                  <TableCell>
                    <Button variant="ghost" onClick={() => handleEditarProduto(produto)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" onClick={() => handleExcluirProduto(produto.id)}><Trash2 className="h-4 w-4" /></Button>
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
            <Button className='border text-black dark:text-white' onClick={() => setMostrarDialogoUsoProduto(true)}>Registrar Uso</Button>
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
                  onChange={(e) => setNovoProduto({ ...novoProduto, custo: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantidade">Quantidade em Estoque</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={novoProduto.quantidade}
                  onChange={(e) => setNovoProduto({ ...novoProduto, quantidade: parseInt(e.target.value) })}
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
                  onChange={(e) => setNovoUsoProduto({ ...novoUsoProduto, quantidade: parseInt(e.target.value) })}
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