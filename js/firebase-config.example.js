// Plantilla de Configuración de Firebase - Nördika
// Duplicar este archivo como js/firebase-config.js y completar con las variables de .env

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}
