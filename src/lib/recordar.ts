// Preferencia "Mantener sesión iniciada en este dispositivo".
// Firebase guarda la sesión según la persistencia elegida al iniciar sesión:
//  - marcada: browserLocalPersistence (queda guardada en el dispositivo)
//  - desmarcada: browserSessionPersistence (se cierra al cerrar el navegador)
// Aquí solo se recuerda qué eligió la persona, para mostrar la casilla igual la próxima vez.
const CLAVE = "le_recordar";

export function leerPreferenciaRecordar(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== "0";
  } catch {
    return true;
  }
}

export function guardarPreferenciaRecordar(recordar: boolean) {
  try {
    localStorage.setItem(CLAVE, recordar ? "1" : "0");
  } catch {
    // Sin almacenamiento (modo privado): no pasa nada, la sesión igual funciona
  }
}
