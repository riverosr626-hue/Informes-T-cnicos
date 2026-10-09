// Códigos de recuperación de contraseña (solo servidor)
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 símbolos, sin O/0/I/1

export type CodigoGuardado = {
  hash: string;
  sal: string;
  intentos: number;
  bloqueado_hasta: string | null;
  usado: boolean;
  creado_en: string;
};

export function nuevoCodigo() {
  let codigo = "";
  for (const byte of randomBytes(12)) codigo += ALFABETO[byte % ALFABETO.length];
  return codigo;
}

export function formatear(codigo: string) {
  return `${codigo.slice(0, 4)}-${codigo.slice(4, 8)}-${codigo.slice(8, 12)}`;
}

export function limpiar(codigo: string) {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashear(codigo: string, sal: string) {
  return scryptSync(codigo, sal, 32).toString("hex");
}

export function coincide(codigo: string, guardado: CodigoGuardado) {
  const a = Buffer.from(hashear(codigo, guardado.sal), "hex");
  const b = Buffer.from(guardado.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function nuevaSal() {
  return randomBytes(16).toString("hex");
}
