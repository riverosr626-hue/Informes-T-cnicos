"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Valores de Firebase > Configuración del proyecto > Tus apps > App web
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Se inicializa solo cuando se usa (en el navegador), nunca al compilar
function app(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}

export const auth = () => getAuth(app());
export const db = () => getFirestore(app());
export const storage = () => getStorage(app());

// Llama a las rutas /api del servidor con la sesión del usuario conectado
export async function llamarApi<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  const usuario = auth().currentUser;
  const token = usuario ? await usuario.getIdToken() : null;
  const respuesta = await fetch(ruta, {
    method: cuerpo === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error((datos as { error?: string }).error || "Error del servidor. Inténtalo de nuevo.");
  }
  return datos as T;
}
