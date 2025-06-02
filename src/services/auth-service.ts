import { auth, firestore } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Usuario } from '@/types/tipos-auth';

export const authService = {
  login: async ({ email, password }: { email: string; password: string }) => {
    console.log('Tentando login com:', email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        nomeExibicao: userCredential.user.displayName,
      } as Usuario;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  },

  register: async ({ name, email, password, confirmPassword }: { name: string; email: string; password: string; confirmPassword: string }) => {
    console.log('Tentando registro com:', { name, email });
    if (password !== confirmPassword) {
      throw new Error('As senhas não coincidem');
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await setDoc(doc(firestore, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        nome: name,
        role: 'pilot',
        subscription: { status: 'active' },
        cor: '#FF5733',
      });
      return {
        id: userCredential.user.uid,
        email,
        nomeExibicao: name,
      } as Usuario;
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  },

  logout: async () => {
    console.log('Executando logout');
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  },

  onAuthStateChanged: (onUserChanged: (user: Usuario | null) => void, onError: (error: any) => void) => {
    console.log('Configurando onAuthStateChanged');
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('Usuário autenticado:', firebaseUser.uid);
        // Verificar documento do usuário
        const userDoc = await getDoc(doc(firestore, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          console.warn('Documento do usuário não encontrado, criando...');
          await setDoc(doc(firestore, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            nome: firebaseUser.displayName || 'Usuário',
            role: 'pilot',
            subscription: { status: 'active' },
            cor: '#FF5733',
          });
        }
        onUserChanged({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          nomeExibicao: firebaseUser.displayName,
        } as Usuario);
      } else {
        console.log('Nenhum usuário autenticado');
        onUserChanged(null);
      }
    }, onError);
  },
};