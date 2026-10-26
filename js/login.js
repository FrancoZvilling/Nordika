/**
 * NÖRDIKA ARQUITECTURA MODULAR - AUTENTICACIÓN SEGURA (login.js)
 * Conexión directa y encriptada con Firebase Authentication (Google Identity Toolkit)
 * 
 * Reglas de seguridad:
 * 1. Las credenciales NUNCA se almacenan en código fuente del frontend.
 * 2. La autenticación se verifica mediante tokens criptográficos JWT emitidos por Google.
 * 3. Si el usuario ya está autenticado, redirige automáticamente al panel.
 */

(function () {
    'use strict';

    if (!window.firebaseConfig) {
        console.error('Firebase Config no encontrada.');
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
    }

    const auth = firebase.auth();

    // Establecer persistencia local segura (la sesión se mantiene activa en el navegador)
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((err) => {
        console.warn('Persistencia de sesión:', err);
    });

    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const loginFeedback = document.getElementById('loginFeedback');
    const loginFeedbackText = document.getElementById('loginFeedbackText');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');

    // 1. Si ya hay una sesión activa del administrador, redirigir directo al panel
    auth.onAuthStateChanged((user) => {
        if (user && user.email === 'admin@nordika.com') {
            window.location.replace('admin.html');
        }
    });

    // 2. Alternar visibilidad de contraseña
    if (togglePasswordBtn && loginPassword) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = loginPassword.type === 'password';
            loginPassword.type = isPassword ? 'text' : 'password';
            togglePasswordIcon.className = isPassword ? 'ph-light ph-eye-slash' : 'ph-light ph-eye';
            togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        });
    }

    // 3. Manejador de Feedback visual
    function showFeedback(message, type = 'error') {
        if (!loginFeedback || !loginFeedbackText) return;
        loginFeedbackText.textContent = message;
        loginFeedback.className = `login-feedback active ${type}`;
    }

    function hideFeedback() {
        if (!loginFeedback) return;
        loginFeedback.className = 'login-feedback';
    }

    // 4. Envío del Formulario de Acceso
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideFeedback();

            let email = loginEmail.value.trim().toLowerCase();
            // Aceptar alias comunes de usuario (admin, AdminNordika2026, etc.) y normalizar a la cuenta oficial
            if (email === 'admin' || email === 'adminnordika2026' || email === 'admin@nordika' || email === 'admin@nordika.com') {
                email = 'admin@nordika.com';
            }
            const password = loginPassword.value;

            if (!email || !password) {
                showFeedback('Por favor completá tu correo y contraseña.', 'error');
                return;
            }

            // Solo permitir el correo oficial del administrador
            if (email !== 'admin@nordika.com') {
                showFeedback('Usuario no autorizado. El usuario es: admin@nordika.com', 'error');
                loginPassword.value = '';
                return;
            }

            // Bloquear botón durante la verificación
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.innerHTML = '<i class="ph-light ph-spinner admin-spin"></i><span>Autenticando...</span>';

            try {
                // Intentar iniciar sesión en Firebase Auth
                let userCredential;
                try {
                    userCredential = await auth.signInWithEmailAndPassword(email, password);
                } catch (signInErr) {
                    // Si el usuario aún no existe en el proyecto de Firebase (primera ejecución),
                    // crearlo automáticamente con las credenciales maestras autorizadas
                    if ((signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') && email === 'admin@nordika.com') {
                        try {
                            userCredential = await auth.createUserWithEmailAndPassword(email, password);
                        } catch (createErr) {
                            throw signInErr;
                        }
                    } else {
                        throw signInErr;
                    }
                }

                if (userCredential && userCredential.user) {
                    showFeedback('¡Credenciales válidas! Ingresando al panel...', 'info');
                    loginSubmitBtn.innerHTML = '<i class="ph-light ph-check-circle"></i><span>Acceso Concedido</span>';
                    setTimeout(() => {
                        window.location.replace('admin.html');
                    }, 500);
                }
            } catch (error) {
                console.error('Error de autenticación:', error);
                loginPassword.value = '';

                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    showFeedback('Contraseña incorrecta. Acceso denegado.', 'error');
                } else if (error.code === 'auth/too-many-requests') {
                    showFeedback('Demasiados intentos fallidos. Por seguridad, el acceso se bloqueó temporalmente. Esperá unos minutos.', 'error');
                } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') {
                    showFeedback('Aviso del Sistema: El proveedor Correo/Contraseña debe activarse en la consola de Firebase (Authentication > Proveedores de Acceso).', 'error');
                } else if (error.code === 'auth/network-request-failed') {
                    showFeedback('Error de conexión a internet. Verificá tu red y volvé a intentar.', 'error');
                } else {
                    showFeedback(`Error de acceso: ${error.message || 'Credenciales inválidas.'}`, 'error');
                }

                loginSubmitBtn.disabled = false;
                loginSubmitBtn.innerHTML = '<i class="ph-light ph-sign-in"></i><span>Ingresar al Sistema</span>';
            }
        });
    }

})();
