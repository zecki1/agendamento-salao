import { firestore } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc } from 'firebase/firestore';
import { Servico, Cliente } from '@/types/tipos-auth';
import { Timestamp } from 'firebase/firestore';

export const serviceService = {
  async getServicos(userId: string): Promise<Servico[]> {
    try {
      console.log('Buscando serviços para userId:', userId);
      const q = query(
        collection(firestore, 'services'),
        where('proprietarioId', '==', userId),
        orderBy('criadoEm', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm && typeof doc.data().criadoEm.toDate === 'function'
          ? doc.data().criadoEm.toDate()
          : new Date(),
      } as Servico));
    } catch (error: any) {
      console.error('Erro ao buscar serviços:', error);
      throw new Error('Erro ao buscar serviços: ' + error.message);
    }
  },

  async createServico(servico: Servico, userId: string): Promise<void> {
    try {
      console.log('Criando serviço:', servico);
      await addDoc(collection(firestore, 'services'), {
        ...servico,
        proprietarioId: userId,
        criadoEm: Timestamp.fromDate(new Date()),
      });
    } catch (error: any) {
      console.error('Erro ao criar serviço:', error);
      throw new Error('Erro ao criar serviço: ' + error.message);
    }
  },

  async updateServico(servico: Servico, userId: string): Promise<void> {
    try {
      console.log('Atualizando serviço:', servico.id);
      if (!servico.id) {
        throw new Error('ID do serviço é obrigatório');
      }
      const docRef = doc(firestore, 'services', servico.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento não encontrado: ${docRef.path}`);
      }
      await updateDoc(docRef, {
        ...servico,
        proprietarioId: userId,
        atualizadoEm: Timestamp.fromDate(new Date()),
      });
    } catch (error: any) {
      console.error('Erro ao atualizar serviço:', error);
      throw new Error('Erro ao atualizar serviço: ' + error.message);
    }
  },

  async deleteServico(servicoId: string): Promise<void> {
    try {
      console.log('Excluindo serviço:', servicoId);
      const docRef = doc(firestore, 'services', servicoId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento não encontrado: ${docRef.path}`);
      }
      await deleteDoc(docRef);
    } catch (error: any) {
      console.error('Erro ao excluir serviço:', error);
      throw new Error('Erro ao excluir serviço: ' + error.message);
    }
  },

  async getClientes(userId: string): Promise<Cliente[]> {
    try {
      console.log('Buscando clientes para userId:', userId);
      const q = query(
        collection(firestore, 'clients'),
        where('proprietarioId', '==', userId),
        orderBy('criadoEm', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm && typeof doc.data().criadoEm.toDate === 'function'
          ? doc.data().criadoEm.toDate()
          : new Date(),
      } as Cliente));
    } catch (error: any) {
      console.error('Erro ao buscar clientes:', error);
      throw new Error('Erro ao buscar clientes: ' + error.message);
    }
  },

  async createCliente(cliente: Cliente, userId: string): Promise<void> {
    try {
      console.log('Criando cliente:', cliente);
      await addDoc(collection(firestore, 'clients'), {
        ...cliente,
        proprietarioId: userId,
        criadoEm: Timestamp.fromDate(new Date()),
      });
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      throw new Error('Erro ao criar cliente: ' + error.message);
    }
  },

  async updateCliente(cliente: Cliente, userId: string): Promise<void> {
    try {
      console.log('Atualizando cliente:', cliente.id);
      if (!cliente.id) {
        throw new Error('ID do cliente é obrigatório');
      }
      const docRef = doc(firestore, 'clients', cliente.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento não encontrado: ${docRef.path}`);
      }
      await updateDoc(docRef, {
        ...cliente,
        proprietarioId: userId,
        atualizadoEm: Timestamp.fromDate(new Date()),
      });
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      throw new Error('Erro ao atualizar cliente: ' + error.message);
    }
  },

  async deleteCliente(clienteId: string): Promise<void> {
    try {
      console.log('Excluindo cliente:', clienteId);
      const docRef = doc(firestore, 'clients', clienteId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento não encontrado: ${docRef.path}`);
      }
      await deleteDoc(docRef);
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      throw new Error('Erro ao excluir cliente: ' + error.message);
    }
  },
};