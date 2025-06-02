import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { User } from '@/types/tipos-auth';

export const authService = {
  async login({ email, password }: { email: string; password: string }): Promise<User> {
    try {
      console.log('Tentando login:', { email });
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Login bem-sucedido:', user.uid);
      return {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || '',
      };
    } catch (error: any) {
      console.error('Erro no login:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },

  async register({ name, email, password, confirmPassword }: { name: string; email: string; password: string; confirmPassword: string }): Promise<User> {
    try {
      console.log('Tentando registro:', { email });
      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Usuário criado:', userCredential.user.uid);
      await updateProfile(userCredential.user, { displayName: name });
      const user = userCredential.user;
      console.log('Registro bem-sucedido:', user.uid);
      return {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || '',
      };
    } catch (error: any) {
      console.error('Erro no registro:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      console.log('Tentando logout');
      await signOut(auth);
      console.log('Logout bem-sucedido');
    } catch (error: any) {
      console.error('Erro no logout:', error.code, error.message);
      throw error;
    }
  },

  onAuthStateChanged(
    onSuccess: (user: User | null) => void,
    onError: (error: any) => void
  ) {
    return onAuthStateChanged(auth, (firebaseUser) => {
      try {
        if (firebaseUser) {
          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || '',
          };
          console.log('Usuário autenticado:', user.id);
          onSuccess(user);
        } else {
          console.log('Nenhum usuário autenticado');
          onSuccess(null);
        }
      } catch (error) {
        console.error('Erro no auth state:', error);
        onError(error);
      }
    });
  },
};