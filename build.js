const fs = require('fs');
const path = require('path');

const configEnv = process.env.FIREBASE_CONFIG;
const targetPath = path.join(__dirname, 'js', 'firebase-config.js');

if (configEnv) {
    try {
        const parsed = JSON.parse(configEnv);
        const fileContent = `// Archivo generado automáticamente en Vercel a partir de Variables de Entorno
const firebaseConfig = ${JSON.stringify(parsed, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}
`;
        fs.writeFileSync(targetPath, fileContent, 'utf8');
        console.log('✓ js/firebase-config.js generado exitosamente en Vercel.');
    } catch (err) {
        console.error('Error parseando FIREBASE_CONFIG en build.js:', err);
        process.exit(1);
    }
} else {
    if (fs.existsSync(targetPath)) {
        console.log('✓ js/firebase-config.js ya existe localmente.');
    } else {
        console.warn('⚠ Advertencia: Variable FIREBASE_CONFIG no encontrada en el entorno.');
    }
}
