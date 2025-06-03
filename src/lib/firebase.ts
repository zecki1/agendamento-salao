'use client';

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { useEffect, useState } from 'react';

const firebaseConfig = {
  apiKey: 'AIzaSyBDobEoERDXv08Sa7UudOTg_4StAriB8sY',
  authDomain: 'agendamento-rosy.firebaseapp.com',
  projectId: 'agendamento-rosy',
  storageBucket: 'agendamento-rosy.firebasestorage.app',
  messagingSenderId: '579550332864',
  appId: '1:579550332864:web:aa9cc46c30fe385e052a25',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
let messaging: any = null;

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
};

export const getFCMToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined' || !messaging) {
    console.warn('FCM não suportado ou ambiente não é do cliente.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permissão de notificação não concedida.');
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('Chave VAPID não configurada em NEXT_PUBLIC_FIREBASE_VAPID_KEY.');
      return null;
    }

    const currentToken = await getToken(messaging, { vapidKey });

    if (currentToken) {
      console.log('FCM Token obtido:', currentToken);
      return currentToken;
    } else {
      console.warn('Nenhum token FCM disponível.');
      return null;
    }
  } catch (error) {
    console.error('Erro ao obter FCM Token:', error);
    return null;
  }
};