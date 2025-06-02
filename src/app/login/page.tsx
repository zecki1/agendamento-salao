'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      console.error('Erro ao fazer login:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center ">
      <div className="w-full  flex flex-col lg:flex-row gap-6 m-12">
        {/* Formulário à esquerda */}
        <Card className="w-full lg:w-1/2 shadow-xl" data-aos="fade-right" data-aos-delay="100">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Bem-vindo!</CardTitle>
            <CardDescription className="text-center text-lg">
              Faça login para participar do palpite! 🎉
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
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
                  autoComplete="current-password"
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
                {loading ? 'Carregando...' : 'Entrar'}
              </Button>
              <p className="text-center text-sm" data-aos="fade-up" data-aos-delay="600">
                Não tem conta?{' '}
                <Link href="/register" className="text-blue-500 hover:underline">
                  Registre-se
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
        {/* Regras à direita */}
        <Card className="w-full lg:w-1/2 shadow-xl" data-aos="fade-left" data-aos-delay="100">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Como funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
              <li><strong>Um palpite por usuário</strong>: Cada participante pode registrar apenas um palpite para o dia e horário do nascimento do Arthurzinho.</li>
              <li><strong>Registro do palpite</strong>: Todos os palpites são salvos e podem ser acompanhados ao fazer login na plataforma.</li>
              <li><strong>Formato do palpite</strong>: Escolha uma data (entre 1º e 20 de junho de 2025) e um horário específico (hora e minuto, no formato HH:mm).</li>
              <li><strong>Prêmio</strong>: O participante que acertar o dia e horário exatos, ou chegar mais perto, ganhará um brinde especial (um presente simbólico, feito com carinho!).</li>
              <li><strong>Visibilidade dos palpites</strong>: Após o login, você poderá visualizar os palpites de outros participantes, identificados pelo nome completo ou apelido registrado.</li>
              <li><strong>Prazo</strong>: Os palpites devem ser feitos até o dia 05 de junho de 2025, conforme a previsão de nascimento.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}