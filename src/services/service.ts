import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Servico, Produto, Cliente } from '@/types/tipos-auth';

export const serviceService = {
  // Serviços
  async getServicos(userId: string): Promise<Servico[]> {
    const q = query(collection(firestore, 'services'), where('proprietarioId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Servico));
  },

  async createServico(servico: Omit<Servico, 'id'>, userId: string): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'services'), {
      ...servico,
      proprietarioId: userId,
    });
    return docRef.id;
  },

  async updateServico(servico: Servico, userId: string): Promise<void> {
    await updateDoc(doc(firestore, 'services', servico.id), {
      ...servico,
      proprietarioId: userId,
    });
  },

  async deleteServico(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'services', id));
  },

  // Produtos
  async getProdutos(userId: string): Promise<Produto[]> {
    const q = query(collection(firestore, 'products'), where('proprietarioId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Produto));
  },

  async createProduto(produto: Omit<Produto, 'id'>, userId: string): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'products'), {
      ...produto,
      proprietarioId: userId,
    });
    return docRef.id;
  },

  async updateProduto(produto: Produto, userId: string): Promise<void> {
    await updateDoc(doc(firestore, 'products', produto.id), {
      ...produto,
      proprietarioId: userId,
    });
  },

  async deleteProduto(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'products', id));
  },

  // Clientes
  async getClientes(userId: string): Promise<Cliente[]> {
    const q = query(collection(firestore, 'clients'), where('proprietarioId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Cliente));
  },

  async createCliente(cliente: Omit<Cliente, 'id'>, userId: string): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'clients'), {
      ...cliente,
      proprietarioId: userId,
    });
    return docRef.id;
  },

  async updateCliente(cliente: Cliente, userId: string): Promise<void> {
    await updateDoc(doc(firestore, 'clients', cliente.id), {
      ...cliente,
      proprietarioId: userId,
    });
  },

  async deleteCliente(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'clients', id));
  },
};