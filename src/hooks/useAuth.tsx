import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/auth-service';
import { User } from '@/types/tipos-auth';
import { useRouter } from 'next/navigation';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(
      (user) => {
        setUser(user);
        setLoading(false);
        if (user) {
          router.push('/calendar');
        }
      },
      (error) => {
        console.error('Auth state error:', error);
        setError('Erro ao verificar autenticação');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [router]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = await authService.login({ email, password });
      setUser(user);
      router.push('/calendar');
      return user;
    } catch (error: any) {
      const errorMessage =
        error.code === 'auth/wrong-password'
          ? 'Senha incorreta'
          : error.code === 'auth/user-not-found'
            ? 'Usuário não encontrado'
            : error.code === 'auth/network-request-failed'
              ? 'Falha na conexão com o servidor. Verifique sua internet.'
              : error.message || 'Erro ao fazer login';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const user = await authService.register({
        name,
        email,
        password,
        confirmPassword,
      });
      setUser(user);
      return user;
    } catch (error: any) {
      const errorMessage =
        error.code === 'auth/email-already-in-use'
          ? 'Este email já está registrado. Tente outro ou faça login.'
          : error.code === 'auth/weak-password'
            ? 'A senha deve ter pelo menos 6 caracteres'
            : error.code === 'auth/network-request-failed'
              ? 'Falha na conexão com o servidor. Verifique sua internet.'
              : error.message || 'Erro ao registrar';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } catch (error: any) {
      setError('Erro ao sair');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};