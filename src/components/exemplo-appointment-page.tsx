'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

export default function AppointmentPage() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fixedDate = '2023-06-15';
  const fixedTime = '15:00';

  const handleSubmit = async () => {
    if (!user) {
      alert('Você precisa estar logado para agendar.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Verificar se o usuário já agendou
      const appointmentsRef = collection(firestore, 'users', user.id, 'appointments');
      const q = query(appointmentsRef, where('userId', '==', user.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert('Você já realizou seu agendamento.');
        setIsSubmitting(false);
        return;
      }

      // Criar agendamento
      await addDoc(appointmentsRef, {
        userId: user.id,
        date: fixedDate,
        time: fixedTime,
        createdAt: new Date(),
      });

      alert('Agendamento confirmado para 15/06/2023 às 15:00!');
    } catch (error: any) {
      console.error('Erro ao agendar:', error);
      alert(`Erro ao criar agendamento: ${error.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Agendar Consulta</CardTitle>
          <CardDescription>Confirme seu agendamento único.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>Data:</strong> {fixedDate}
            </div>
            <div>
              <strong>Horário:</strong> {fixedTime}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Carregando...' : (
              <>
                <Check className="mr-2 h-4 w-4" /> Confirmar
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}