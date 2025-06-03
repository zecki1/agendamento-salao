'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { register, login, loading, error } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Tentando registrar:', { name, email, password, confirmPassword });
    try {
      await register(name, email, password, confirmPassword);
      setIsDialogOpen(true);
    } catch (err: any) {
      console.error('Erro ao registrar:', err);
      toast.error(err.message || 'Erro ao registrar');
    }
  };

  const handleLogin = async () => {
    console.log('Tentando login automático:', { email, password });
    try {
      await login(email, password);
      setIsDialogOpen(false);
      router.push('/calendar');
    } catch (err: any) {
      console.error('Erro ao fazer login automático:', err);
      toast.error(err.message || 'Erro ao fazer login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 ">
      <div className="w-full flex flex-col lg:flex-row gap-6 m-12">
        {/* Formulário à esquerda */}
        <Card className="w-full shadow-xl mx-auto lg:w-1/2" data-aos="fade-right" data-aos-delay="100">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Registre-se!</CardTitle>
            <CardDescription className="text-center text-lg">
              Crie sua conta para fazer a gestão da sua agenda!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm" data-aos="fade-in" data-aos-delay="400">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                data-aos="fade-up"
                data-aos-delay="500"
              >
                {loading ? 'Carregando...' : 'Registrar'}
              </Button>
              <p className="text-center text-sm" data-aos="fade-up" data-aos-delay="600">
                Já tem conta?{' '}
                <Link href="/login" className="text-blue-500 hover:underline">
                  Faça login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} data-aos="zoom-in" data-aos-delay="100">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parabéns, você foi registrado!</DialogTitle>
          </DialogHeader>
          <p>Clique no botão abaixo para fazer login automaticamente e começar a usar o Calendário.</p>
          <DialogFooter>
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              {loading ? 'Carregando...' : 'Fazer Login'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}