/**
 * NÖRDIKA ARQUITECTURA MODULAR - PANEL DE CONTROL CMS (admin.js)
 * Desarrollado con Firebase v10 Compat (Firestore & Storage)
 * 
 * Módulos integrados:
 * 1. Hero Principal (3 diapositivas fijas, reemplazo individual)
 * 2. Catálogo de Módulos (20m, 40m, 60m: precios, tarjeta, modal y exactamente 5 miniaturas)
 * 3. Nuestros Trabajos (4 etapas técnicas obligatorias, carga y optimización WebP, filtros)
 * 4. Preguntas Frecuentes (CRUD acordeón FAQ)
 * 5. Bandeja de Entrada (Leads en tiempo real, WhatsApp directo, marcar leído/archivado)
 */

(function () {
    'use strict';

    // =========================================================================
    // 1. INICIALIZACIÓN DE FIREBASE
    // =========================================================================
    if (!window.firebaseConfig) {
        console.error('Nördika Admin: firebaseConfig no está definido en js/firebase-config.js');
        alert('Error: No se encontró la configuración de Firebase.');
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
    }

    const db = firebase.firestore();
    const auth = firebase.auth();

    // =========================================================================
    // 1.1 GUARDIÁN DE AUTENTICACIÓN (LOGIN OBLIGATORIO)
    // =========================================================================
    let isPanelInitialized = false;

    // Si no hay usuario autenticado o no es admin@nordika.com, expulsa de inmediato
    auth.onAuthStateChanged((user) => {
        if (!user || user.email !== 'admin@nordika.com') {
            window.location.replace('login.html');
        } else {
            // Usuario verificado y autorizado: Desbloquear el panel suavemente
            const gateOverlay = document.getElementById('authGateOverlay');
            if (gateOverlay) {
                gateOverlay.style.transition = 'opacity 0.25s ease';
                gateOverlay.style.opacity = '0';
                setTimeout(() => { if (gateOverlay.parentNode) gateOverlay.remove(); }, 250);
            }

            // Inicializar las conexiones a Firestore ÚNICAMENTE con sesión activa verificada
            if (!isPanelInitialized) {
                isPanelInitialized = true;
                initAdminPanel();
            }
        }
    });

    // Manejador del Botón Cerrar Sesión
    document.addEventListener('DOMContentLoaded', () => {
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('¿Deseás cerrar la sesión en el Panel de Control?')) {
                    try {
                        await auth.signOut();
                        window.location.replace('login.html');
                    } catch (err) {
                        console.error('Error al cerrar sesión:', err);
                        window.location.replace('login.html');
                    }
                }
            });
        }
    });

    const storage = firebase.storage();
    try {
        storage.setMaxUploadRetryTime(3000);
        storage.setMaxOperationRetryTime(3000);
    } catch (e) {
        // Ignorar si el SDK no expone estas opciones en este entorno
    }

    // =========================================================================
    // 2. SISTEMA DE NOTIFICACIONES TOAST
    // =========================================================================
    const toastContainer = document.getElementById('toastContainer');

    function showToast(message, type = 'success', duration = 4000) {
        if (!toastContainer) {
            console.log(`[Toast ${type}]: ${message}`);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;

        const iconClass = type === 'success' 
            ? 'ph-check-circle' 
            : type === 'error' 
                ? 'ph-warning-circle' 
                : 'ph-info';

        toast.innerHTML = `
            <i class="ph-light ${iconClass} admin-toast-icon"></i>
            <span class="admin-toast-text">${message}</span>
            <button class="admin-toast-close" aria-label="Cerrar"><i class="ph-light ph-x"></i></button>
        `;

        toast.querySelector('.admin-toast-close').addEventListener('click', () => {
            toast.remove();
        });

        toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    // =========================================================================
    // 3. UTILIDADES: COMPRESIÓN DE IMÁGENES A WEBP & SUBIDA A STORAGE
    // =========================================================================
    /**
     * Comprime y redimensiona cualquier imagen del cliente a formato WebP ligero usando HTML5 Canvas.
     */
    function compressImageToWebP(file, maxWidth = 1600, maxHeight = 1200, quality = 0.82) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                return reject(new Error('El archivo seleccionado no es una imagen válida.'));
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                // Fallback a JPEG si WebP no fuera soportado
                                canvas.toBlob(
                                    (fallbackBlob) => resolve(fallbackBlob),
                                    'image/jpeg',
                                    quality
                                );
                            }
                        },
                        'image/webp',
                        quality
                    );
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }

    /**
     * Sube un Blob a Firebase Storage y retorna la URL pública de descarga.
     * Si Storage aún no fue activado en la consola de Firebase, efectúa fallback automático
     * a Data URL WebP comprimido sin bloquear ni romper la operación del usuario.
     */
    async function uploadBlobToStorage(blob, storagePath) {
        const uploadViaStorage = new Promise((resolve, reject) => {
            try {
                const ref = storage.ref(storagePath);
                const task = ref.put(blob, {
                    contentType: blob.type || 'image/webp',
                    cacheControl: 'public, max-age=31536000'
                });

                task.on(
                    'state_changed',
                    null,
                    (err) => reject(err),
                    async () => {
                        try {
                            const url = await task.snapshot.ref.getDownloadURL();
                            resolve(url);
                        } catch (uErr) {
                            reject(uErr);
                        }
                    }
                );
            } catch (err) {
                reject(err);
            }
        });

        const uploadTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Firebase Storage timeout: servicio no configurado o inactivo')), 3500);
        });

        try {
            return await Promise.race([uploadViaStorage, uploadTimeout]);
        } catch (storageError) {
            console.warn('Firebase Storage no disponible (o aún no activado en consola), usando fallback WebP Data URL:', storageError);
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }
    }

    

    // Formateo de fecha amigable para los contactos
    function formatTimestamp(timestamp) {
        if (!timestamp) return 'Fecha desconocida';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Limpieza de número de teléfono para enlace directo a WhatsApp
    function cleanPhoneNumber(phone) {
        if (!phone) return '';
        let cleaned = phone.replace(/[^\d+]/g, '');
        // Si no tiene prefijo internacional +, asumir Argentina (+54)
        if (!cleaned.startsWith('+')) {
            // Si empieza con 9 o 11 o código de área nacional argentino
            if (cleaned.startsWith('54')) {
                cleaned = '+' + cleaned;
            } else if (cleaned.startsWith('0')) {
                cleaned = '+549' + cleaned.substring(1);
            } else {
                cleaned = '+549' + cleaned;
            }
        }
        return cleaned.replace('+', '');
    }

    // =========================================================================
    // 4. NAVEGACIÓN Y TABS DEL PANEL
    // =========================================================================
    const navItems = document.querySelectorAll('.admin-nav-item');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    const adminTopBarTitle = document.getElementById('adminCurrentTabTitle');
    const adminSidebar = document.getElementById('adminSidebar');
    const adminHamburger = document.getElementById('adminHamburger');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

    const tabTitles = {
        'hero': 'Hero Principal',
        'modulos': 'Catálogo de Módulos & Precios',
        'trabajos': 'Nuestros Trabajos',
        'faqs': 'Preguntas Frecuentes',
        'inbox': 'Bandeja de Entrada'
    };

    function switchTab(tabId) {
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        tabContents.forEach(content => {
            if (content.id === `tab-${tabId}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        if (adminTopBarTitle && tabTitles[tabId]) {
            adminTopBarTitle.textContent = tabTitles[tabId];
        }

        if (adminSidebar && adminSidebar.classList.contains('open')) {
            adminSidebar.classList.remove('open');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    if (adminHamburger) {
        adminHamburger.addEventListener('click', () => {
            adminSidebar.classList.add('open');
        });
    }

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', () => {
            adminSidebar.classList.remove('open');
        });
    }

    // =========================================================================
    // 5. SECCIÓN 1: HERO PRINCIPAL (3 SLIDES FIJOS)
    // =========================================================================
    const DEFAULT_HERO_SLIDES = [
        {
            image: 'assets/images/img7.jpg',
            caption: 'Montaje e implantación en lote · Nördika'
        },
        {
            image: 'assets/images/img17.jpg',
            caption: 'Estructura y diseño arquitectónico · Nördika'
        },
        {
            image: 'assets/images/img42.jpg',
            caption: 'Terminaciones de alta prestación · Nördika'
        }
    ];

    // Estado local del Hero
    let currentHeroSlides = JSON.parse(JSON.stringify(DEFAULT_HERO_SLIDES));
    let heroNewFiles = [null, null, null]; // Guarda archivos File pendientes de subida

    // Cargar Hero desde Firestore
    async function loadHeroConfig() {
        try {
            const doc = await db.collection('config').doc('hero').get();
            if (doc.exists && Array.isArray(doc.data().slides) && doc.data().slides.length === 3) {
                currentHeroSlides = doc.data().slides;
            } else {
                // Si no existe, guardar configuración predeterminada
                await db.collection('config').doc('hero').set({
                    slides: DEFAULT_HERO_SLIDES,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentHeroSlides = JSON.parse(JSON.stringify(DEFAULT_HERO_SLIDES));
            }
            renderHeroUI();
        } catch (error) {
            console.error('Error cargando Hero config:', error);
            showToast('Aviso: Cargando diapositivas predeterminadas del Hero.', 'info');
            renderHeroUI();
        }
    }

    function renderHeroUI() {
        for (let i = 0; i < 3; i++) {
            const imgEl = document.getElementById(`heroImg${i}`);
            const captionInput = document.getElementById(`heroCaption${i}`);
            if (imgEl && currentHeroSlides[i]) {
                imgEl.src = currentHeroSlides[i].image;
            }
            if (captionInput && currentHeroSlides[i]) {
                captionInput.value = currentHeroSlides[i].caption || '';
            }
        }
    }

    // Previews para cambios individuales de diapositivas
    for (let i = 0; i < 3; i++) {
        const fileInput = document.getElementById(`heroUpload${i}`);
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                heroNewFiles[i] = file;
                const objectUrl = URL.createObjectURL(file);
                const imgEl = document.getElementById(`heroImg${i}`);
                if (imgEl) {
                    imgEl.src = objectUrl;
                }
                showToast(`Foto de Diapositiva 0${i + 1} seleccionada para guardar.`, 'info');
            });
        }
    }

    // Guardar cambios en el Hero
    const saveHeroBtn = document.getElementById('saveHeroBtn');
    if (saveHeroBtn) {
        saveHeroBtn.addEventListener('click', async () => {
            saveHeroBtn.disabled = true;
            saveHeroBtn.innerHTML = '<i class="ph-light ph-spinner admin-spin"></i><span>Guardando Hero...</span>';

            try {
                const updatedSlides = [];

                for (let i = 0; i < 3; i++) {
                    const captionVal = document.getElementById(`heroCaption${i}`)?.value.trim() || '';
                    let imageUrl = currentHeroSlides[i].image;

                    // Si hay un archivo nuevo seleccionado, optimizar y subir a Storage
                    if (heroNewFiles[i]) {
                        showToast(`Optimizando y subiendo Foto 0${i + 1}...`, 'info');
                        const compressedBlob = await compressImageToWebP(heroNewFiles[i], 1920, 1080, 0.85);
                        const storagePath = `hero/slide_${i}_${Date.now()}.webp`;
                        imageUrl = await uploadBlobToStorage(compressedBlob, storagePath);
                        heroNewFiles[i] = null; // Resetear archivo pendiente
                    }

                    updatedSlides.push({
                        image: imageUrl,
                        caption: captionVal
                    });
                }

                // Guardar en Firestore
                await db.collection('config').doc('hero').set({
                    slides: updatedSlides,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                currentHeroSlides = updatedSlides;
                showToast('¡Hero Principal actualizado correctamente con sus 3 imágenes!', 'success');
            } catch (error) {
                console.error('Error guardando Hero:', error);
                showToast(`Error al guardar Hero: ${error.message}`, 'error');
            } finally {
                saveHeroBtn.disabled = false;
                saveHeroBtn.innerHTML = '<i class="ph-light ph-floppy-disk"></i><span>Guardar Cambios Hero</span>';
            }
        });
    }

    // =========================================================================
    // 6. SECCIÓN 2: MÓDULOS & PRECIOS (20m, 40m, 60m)
    // =========================================================================
    const DEFAULT_MODULES = {
        '20m': {
            id: '20m',
            name: 'Módulo 20 m²',
            sub: 'Nö. 01 · Monoambiente',
            priceBasico: 'USD $11.500',
            priceStandard: 'USD $14.500',
            pricePremium: 'USD $18.500',
            tarjetaImg: 'assets/images/20m/tarjeta.webp',
            modalImg: 'assets/images/20m/modal.webp',
            thumbnails: [
                'assets/images/20m/0.webp',
                'assets/images/20m/1.webp',
                'assets/images/20m/2.webp',
                'assets/images/20m/3.webp',
                'assets/images/20m/4.webp'
            ]
        },
        '40m': {
            id: '40m',
            name: 'Módulo 40 m²',
            sub: 'Nö. 02 · 1/2 Dormitorios',
            priceBasico: 'USD $22.000',
            priceStandard: 'USD $28.000',
            pricePremium: 'USD $35.000',
            tarjetaImg: 'assets/images/45m/tarjeta.webp',
            modalImg: 'assets/images/45m/modal.webp',
            thumbnails: [
                'assets/images/45m/0.webp',
                'assets/images/45m/1.webp',
                'assets/images/45m/2.webp',
                'assets/images/45m/3.webp',
                'assets/images/45m/4.webp'
            ]
        },
        '60m': {
            id: '60m',
            name: 'Módulo 60 m²',
            sub: 'Nö. 03 · 2/3 Dormitorios',
            priceBasico: 'USD $30.000',
            priceStandard: 'USD $39.500',
            pricePremium: 'USD $48.000',
            tarjetaImg: 'assets/images/60m/tarjeta.webp',
            modalImg: 'assets/images/60m/modal.webp',
            thumbnails: [
                'assets/images/60m/0.webp',
                'assets/images/60m/1.webp',
                'assets/images/60m/2.webp',
                'assets/images/60m/3.webp',
                'assets/images/60m/4.webp'
            ]
        }
    };

    let activeModuleId = '20m';
    let currentModuleData = {};
    let pendingModuleUploads = {
        tarjeta: null,
        modal: null,
        thumbnails: [null, null, null, null, null]
    };

    const moduleTabBtns = document.querySelectorAll('.module-tab-btn');
    const syncBadgeNote = document.getElementById('syncBadgeNote');
    const priceBasicoInput = document.getElementById('priceBasico');
    const priceStandardInput = document.getElementById('priceStandard');
    const pricePremiumInput = document.getElementById('pricePremium');
    const modTarjetaPreview = document.getElementById('modTarjetaPreview');
    const modModalPreview = document.getElementById('modModalPreview');
    const modTarjetaFile = document.getElementById('modTarjetaFile');
    const modModalFile = document.getElementById('modModalFile');
    const thumbnailsEditorGrid = document.getElementById('thumbnailsEditorGrid');
    const thumbCounterBadge = document.getElementById('thumbCounterBadge');
    const saveModuleBtn = document.getElementById('saveModuleBtn');

    // Cargar módulo activo desde Firestore
    async function loadModule(moduleId) {
        activeModuleId = moduleId;
        pendingModuleUploads = {
            tarjeta: null,
            modal: null,
            thumbnails: [null, null, null, null, null]
        };

        // Mostrar / ocultar nota de sincronización especial para 20m
        if (syncBadgeNote) {
            syncBadgeNote.style.display = moduleId === '20m' ? 'inline-flex' : 'none';
        }

        try {
            const doc = await db.collection('modulos').doc(moduleId).get();
            if (doc.exists) {
                currentModuleData = doc.data();
                // Asegurar que thumbnails sea un array de 5 elementos
                if (!Array.isArray(currentModuleData.thumbnails) || currentModuleData.thumbnails.length !== 5) {
                    currentModuleData.thumbnails = [...DEFAULT_MODULES[moduleId].thumbnails];
                }
            } else {
                currentModuleData = JSON.parse(JSON.stringify(DEFAULT_MODULES[moduleId]));
                await db.collection('modulos').doc(moduleId).set({
                    ...currentModuleData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error cargando módulo:', error);
            currentModuleData = JSON.parse(JSON.stringify(DEFAULT_MODULES[moduleId]));
        }

        renderModuleUI();
    }

    function renderModuleUI() {
        if (!currentModuleData) return;

        // Precios
        if (priceBasicoInput) priceBasicoInput.value = currentModuleData.priceBasico || '';
        if (priceStandardInput) priceStandardInput.value = currentModuleData.priceStandard || '';
        if (pricePremiumInput) pricePremiumInput.value = currentModuleData.pricePremium || '';

        // Fotos Principales
        if (modTarjetaPreview) modTarjetaPreview.src = currentModuleData.tarjetaImg || '';
        if (modModalPreview) modModalPreview.src = currentModuleData.modalImg || '';

        // Renderizar los 5 slots de miniaturas
        renderThumbnailSlots();
    }

    function renderThumbnailSlots() {
        if (!thumbnailsEditorGrid) return;
        thumbnailsEditorGrid.innerHTML = '';

        const thumbs = currentModuleData.thumbnails || [];
        let validCount = 0;

        for (let i = 0; i < 5; i++) {
            const thumbSrc = thumbs[i] || '';
            if (thumbSrc.trim() !== '') validCount++;

            const slot = document.createElement('div');
            slot.className = 'thumb-slot-card';
            slot.innerHTML = `
                <div class="thumb-slot-header tech-font">
                    <span>Miniatura 0${i + 1}</span>
                    <span style="color: ${thumbSrc ? 'var(--teal-light)' : 'var(--danger)'}">
                        ${thumbSrc ? 'OK' : 'Falta'}
                    </span>
                </div>
                <div class="thumb-preview-box">
                    <img src="${thumbSrc || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'75\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23111\'/%3E%3C/svg%3E'}" 
                         alt="Miniatura ${i + 1}" id="thumbSlotImg${i}">
                    <label for="thumbSlotFile${i}" class="btn-change-img tech-font">
                        <i class="ph-light ph-camera"></i>
                        <span>Cambiar</span>
                    </label>
                    <input type="file" id="thumbSlotFile${i}" accept="image/*" class="file-input-hidden">
                </div>
            `;

            // Listener de cambio para cada miniatura individual
            const fileInput = slot.querySelector(`#thumbSlotFile${i}`);
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                pendingModuleUploads.thumbnails[i] = file;
                const objectUrl = URL.createObjectURL(file);
                currentModuleData.thumbnails[i] = objectUrl;
                slot.querySelector(`#thumbSlotImg${i}`).src = objectUrl;
                renderThumbnailSlots();
                showToast(`Miniatura 0${i + 1} lista para guardar.`, 'info');
            });

            thumbnailsEditorGrid.appendChild(slot);
        }

        // Actualizar badge de conteo
        if (thumbCounterBadge) {
            thumbCounterBadge.textContent = `${validCount} / 5 completadas`;
            if (validCount === 5) {
                thumbCounterBadge.style.background = 'rgba(0, 128, 128, 0.2)';
                thumbCounterBadge.style.color = 'var(--teal-light)';
                thumbCounterBadge.style.borderColor = 'var(--teal)';
            } else {
                thumbCounterBadge.style.background = 'rgba(230, 57, 70, 0.2)';
                thumbCounterBadge.style.color = '#ff6b6b';
                thumbCounterBadge.style.borderColor = '#ff6b6b';
            }
        }
    }

    // Switch de pestañas de módulos
    moduleTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            moduleTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const modId = btn.getAttribute('data-module');
            loadModule(modId);
        });
    });

    // Cambios en tarjeta y modal preview
    if (modTarjetaFile) {
        modTarjetaFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            pendingModuleUploads.tarjeta = file;
            modTarjetaPreview.src = URL.createObjectURL(file);
            showToast('Foto de Tarjeta lista para guardar.', 'info');
        });
    }

    if (modModalFile) {
        modModalFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            pendingModuleUploads.modal = file;
            modModalPreview.src = URL.createObjectURL(file);
            showToast('Foto Principal de Modal lista para guardar.', 'info');
        });
    }

    // Guardar cambios del módulo activo
    if (saveModuleBtn) {
        saveModuleBtn.addEventListener('click', async () => {
            // REGLA DE NEGOCIO OBLIGATORIA: Validar exactamente 5 miniaturas
            const validThumbs = (currentModuleData.thumbnails || []).filter(t => t && t.trim() !== '');
            if (validThumbs.length < 5) {
                showToast(
                    `Regla de negocio: El modal requiere estrictamente 5 imágenes en miniatura (tenés ${validThumbs.length} de 5). Por favor cargá la 5ta imagen obligatoriamente.`, 
                    'error', 
                    6000
                );
                return;
            }

            saveModuleBtn.disabled = true;
            saveModuleBtn.innerHTML = '<i class="ph-light ph-spinner admin-spin"></i><span>Guardando Módulo...</span>';

            try {
                let tarjetaUrl = currentModuleData.tarjetaImg;
                let modalUrl = currentModuleData.modalImg;
                const finalThumbs = [...currentModuleData.thumbnails];

                // 1. Subir Tarjeta si cambió
                if (pendingModuleUploads.tarjeta) {
                    showToast('Optimizando y subiendo foto de tarjeta...', 'info');
                    const blob = await compressImageToWebP(pendingModuleUploads.tarjeta, 1200, 900, 0.85);
                    tarjetaUrl = await uploadBlobToStorage(blob, `modulos/${activeModuleId}/tarjeta_${Date.now()}.webp`);
                    pendingModuleUploads.tarjeta = null;
                }

                // 2. Subir Modal Principal si cambió
                if (pendingModuleUploads.modal) {
                    showToast('Optimizando y subiendo foto de modal...', 'info');
                    const blob = await compressImageToWebP(pendingModuleUploads.modal, 1600, 1200, 0.85);
                    modalUrl = await uploadBlobToStorage(blob, `modulos/${activeModuleId}/modal_${Date.now()}.webp`);
                    pendingModuleUploads.modal = null;
                }

                // 3. Subir miniaturas que hayan cambiado
                for (let i = 0; i < 5; i++) {
                    if (pendingModuleUploads.thumbnails[i]) {
                        showToast(`Optimizando miniatura 0${i + 1}...`, 'info');
                        const blob = await compressImageToWebP(pendingModuleUploads.thumbnails[i], 1600, 1200, 0.85);
                        finalThumbs[i] = await uploadBlobToStorage(blob, `modulos/${activeModuleId}/thumb_${i}_${Date.now()}.webp`);
                        pendingModuleUploads.thumbnails[i] = null;
                    }
                }

                const priceBasico = priceBasicoInput ? priceBasicoInput.value.trim() : '';
                const priceStandard = priceStandardInput ? priceStandardInput.value.trim() : '';
                const pricePremium = pricePremiumInput ? pricePremiumInput.value.trim() : '';

                // Guardar en Firestore colección 'modulos'
                const updatePayload = {
                    id: activeModuleId,
                    name: currentModuleData.name || DEFAULT_MODULES[activeModuleId].name,
                    sub: currentModuleData.sub || DEFAULT_MODULES[activeModuleId].sub,
                    priceBasico,
                    priceStandard,
                    pricePremium,
                    tarjetaImg: tarjetaUrl,
                    modalImg: modalUrl,
                    thumbnails: finalThumbs,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('modulos').doc(activeModuleId).set(updatePayload, { merge: true });

                // REGLA DE NEGOCIO OBLIGATORIA: Cross-sync si es el módulo de 20m
                if (activeModuleId === '20m') {
                    await db.collection('config').doc('sync').set({
                        specsStandardPrice: priceStandard,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    showToast('¡Precio Standard de 20m sincronizado con la sección Especificaciones!', 'info');
                }

                currentModuleData = updatePayload;
                renderModuleUI();
                showToast(`¡Módulo ${DEFAULT_MODULES[activeModuleId].name} actualizado con éxito!`, 'success');
            } catch (error) {
                console.error('Error guardando módulo:', error);
                showToast(`Error al guardar módulo: ${error.message}`, 'error');
            } finally {
                saveModuleBtn.disabled = false;
                saveModuleBtn.innerHTML = '<i class="ph-light ph-floppy-disk"></i><span>Guardar Módulo Activo</span>';
            }
        });
    }

    // =========================================================================
    // 7. SECCIÓN 3: NUESTROS TRABAJOS (4 ETAPAS TÉCNICAS OBLIGATORIAS)
    // =========================================================================
    const worksAdminGrid = document.getElementById('worksAdminGrid');
    const totalWorksCount = document.getElementById('totalWorksCount');
    const workFilterPills = document.querySelectorAll('.works-admin-filter-bar .admin-filter-pill');
    const openAddWorkModalBtn = document.getElementById('openAddWorkModalBtn');
    const workModal = document.getElementById('workModal');
    const closeWorkModalBtn = document.getElementById('closeWorkModalBtn');
    const cancelWorkModalBtn = document.getElementById('cancelWorkModalBtn');
    const workForm = document.getElementById('workForm');
    const workEditId = document.getElementById('workEditId');
    const workPhaseSelect = document.getElementById('workPhaseSelect');
    const workTitleInput = document.getElementById('workTitleInput');
    const workDescInput = document.getElementById('workDescInput');
    const workRatioSelect = document.getElementById('workRatioSelect');
    const workFileInput = document.getElementById('workFileInput');
    const workDropzone = document.getElementById('workDropzone');
    const workModalImgPreview = document.getElementById('workModalImgPreview');
    const dropzonePrompt = document.getElementById('dropzonePrompt');
    const saveWorkSubmitBtn = document.getElementById('saveWorkSubmitBtn');
    const workModalTitle = document.getElementById('workModalTitle');

    let allWorks = [];
    let currentWorksFilter = 'all';
    let pendingWorkFile = null;
    let existingWorkImgUrl = '';

    const phaseLabels = {
        'estructura': 'Estructura & Steel Frame',
        'montaje': 'Montaje & Logística',
        'envolvente': 'Terminaciones & Envolvente',
        'finalizadas': 'Obras Entregadas'
    };

    // Escuchar colección 'trabajos' en tiempo real
    function listenToWorks() {
        db.collection('trabajos')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                allWorks = [];
                snapshot.forEach(doc => {
                    allWorks.push({ id: doc.id, ...doc.data() });
                });

                if (totalWorksCount) {
                    totalWorksCount.textContent = allWorks.length;
                }

                renderWorksGrid();
            }, (error) => {
                console.error('Error escuchando trabajos:', error);
                // Si la colección está vacía o no tiene índice de createdAt, cargar con get básico
                db.collection('trabajos').get().then(snapshot => {
                    allWorks = [];
                    snapshot.forEach(doc => {
                        allWorks.push({ id: doc.id, ...doc.data() });
                    });
                    if (totalWorksCount) totalWorksCount.textContent = allWorks.length;
                    renderWorksGrid();
                });
            });
    }

    function renderWorksGrid() {
        if (!worksAdminGrid) return;
        worksAdminGrid.innerHTML = '';

        const filtered = currentWorksFilter === 'all'
            ? allWorks
            : allWorks.filter(w => w.phase === currentWorksFilter);

        if (filtered.length === 0) {
            worksAdminGrid.innerHTML = `
                <div class="inbox-empty-state" style="grid-column: 1 / -1;">
                    <i class="ph-light ph-images inbox-empty-icon"></i>
                    <h3 class="tech-font text-white" style="margin-bottom: 0.5rem;">No hay obras registradas en esta etapa</h3>
                    <p class="text-silver mb-4">Podés agregar una nueva obra haciendo clic en el botón superior o inicializar las obras del catálogo.</p>
                    <button type="button" class="btn btn-outline" id="seedWorksBtn">
                        <i class="ph-light ph-database"></i>
                        <span>Cargar 29 Obras del Catálogo a la Base de Datos</span>
                    </button>
                </div>
            `;
            const seedBtn = document.getElementById('seedWorksBtn');
            if (seedBtn) seedBtn.addEventListener('click', seedInitialWorks);
            return;
        }

        filtered.forEach(work => {
            const card = document.createElement('div');
            card.className = 'work-admin-card';
            card.innerHTML = `
                <div class="work-card-media">
                    <img src="${work.thumb || work.display || work.full || ''}" alt="${work.title}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/logo simple.png'; this.style.objectFit='contain'; this.style.padding='1.5rem';">
                    <span class="work-card-tag tech-font">${phaseLabels[work.phase] || work.phase}</span>
                    <span class="work-card-ratio tech-font">${work.ratio || '16:9'}</span>
                </div>
                <div class="work-card-info">
                    <h4 class="work-card-title tech-font">${work.title}</h4>
                    <p class="work-card-desc">${work.desc || ''}</p>
                    <div class="work-card-actions">
                        <button type="button" class="btn-card-action btn-edit-work" data-id="${work.id}">
                            <i class="ph-light ph-pencil"></i>
                            <span>Editar</span>
                        </button>
                        <button type="button" class="btn-card-action btn-delete btn-delete-work" data-id="${work.id}" title="Eliminar obra">
                            <i class="ph-light ph-trash"></i>
                            <span>Eliminar</span>
                        </button>
                    </div>
                </div>
            `;

            card.querySelector('.btn-edit-work').addEventListener('click', () => openEditWorkModal(work));
            card.querySelector('.btn-delete-work').addEventListener('click', () => deleteWork(work.id, work.title));

            worksAdminGrid.appendChild(card);
        });
    }

    // Filtros de obras
    workFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            workFilterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentWorksFilter = pill.getAttribute('data-filter');
            renderWorksGrid();
        });
    });

    // Gestión del Modal de Obras
    function openAddWorkModal() {
        workForm.reset();
        workEditId.value = '';
        pendingWorkFile = null;
        existingWorkImgUrl = '';
        workModalImgPreview.src = '';
        workModalImgPreview.classList.add('hidden');
        dropzonePrompt.classList.remove('hidden');
        workModalTitle.textContent = 'Agregar Registro de Obra';
        workFileInput.required = true;
        workModal.classList.add('active');
    }

    function openEditWorkModal(work) {
        workForm.reset();
        workEditId.value = work.id;
        workPhaseSelect.value = work.phase || '';
        workTitleInput.value = work.title || '';
        workDescInput.value = work.desc || '';
        workRatioSelect.value = work.ratio || '16:9 Panorámica';
        pendingWorkFile = null;
        existingWorkImgUrl = work.display || work.thumb || work.full || '';

        if (existingWorkImgUrl) {
            workModalImgPreview.src = existingWorkImgUrl;
            workModalImgPreview.classList.remove('hidden');
            dropzonePrompt.classList.add('hidden');
        } else {
            workModalImgPreview.src = '';
            workModalImgPreview.classList.add('hidden');
            dropzonePrompt.classList.remove('hidden');
        }

        workModalTitle.textContent = 'Editar Registro de Obra';
        workFileInput.required = false; // No es obligatorio subir otra foto si ya tiene una
        workModal.classList.add('active');
    }

    function closeWorkModal() {
        workModal.classList.remove('active');
        workForm.reset();
        pendingWorkFile = null;
    }

    if (openAddWorkModalBtn) openAddWorkModalBtn.addEventListener('click', openAddWorkModal);
    if (closeWorkModalBtn) closeWorkModalBtn.addEventListener('click', closeWorkModal);
    if (cancelWorkModalBtn) cancelWorkModalBtn.addEventListener('click', closeWorkModal);

    // Dropzone / File Picker de la foto de la obra
    if (workDropzone && workFileInput) {
        workDropzone.addEventListener('click', () => workFileInput.click());

        workFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            pendingWorkFile = file;
            workModalImgPreview.src = URL.createObjectURL(file);
            workModalImgPreview.classList.remove('hidden');
            dropzonePrompt.classList.add('hidden');
        });
    }

    // Guardar Obra (Crear o Editar)
    if (workForm) {
        workForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validación de etapa obligatoria
            const phase = workPhaseSelect.value;
            if (!phase) {
                showToast('Error: Debés seleccionar obligatoriamente una de las 4 etapas técnicas constructivas.', 'error');
                workPhaseSelect.focus();
                return;
            }

            const isEdit = !!workEditId.value;
            if (!isEdit && !pendingWorkFile) {
                showToast('Error: Debés seleccionar una fotografía para la obra.', 'error');
                return;
            }

            saveWorkSubmitBtn.disabled = true;
            saveWorkSubmitBtn.innerHTML = '<i class="ph-light ph-spinner admin-spin"></i><span>Guardando...</span>';

            try {
                let displayUrl = existingWorkImgUrl;
                let thumbUrl = existingWorkImgUrl;

                // Si seleccionó un archivo nuevo, comprimir a WebP display y thumb
                if (pendingWorkFile) {
                    showToast('Optimizando fotografía a WebP...', 'info');
                    const displayBlob = await compressImageToWebP(pendingWorkFile, 1920, 1280, 0.85);
                    const thumbBlob = await compressImageToWebP(pendingWorkFile, 600, 450, 0.80);

                    const timestamp = Date.now();
                    displayUrl = await uploadBlobToStorage(displayBlob, `trabajos/display_${timestamp}.webp`);
                    thumbUrl = await uploadBlobToStorage(thumbBlob, `trabajos/thumb_${timestamp}.webp`);
                }

                const ratio = workRatioSelect.value;
                const ratioClass = ratio.includes('16:9') ? 'ratio-16-9' 
                    : ratio.includes('2:3') ? 'ratio-2-3' 
                    : ratio.includes('1:1') ? 'ratio-1-1' : 'ratio-5-4';

                const spanClass = ratio.includes('2:3') ? 'span-2-row' : 'span-2-col';

                const workPayload = {
                    phase,
                    phaseText: phaseLabels[phase] || phase,
                    title: workTitleInput.value.trim(),
                    desc: workDescInput.value.trim(),
                    ratio,
                    ratioClass,
                    spanClass,
                    display: displayUrl,
                    thumb: thumbUrl,
                    full: displayUrl,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (isEdit) {
                    await db.collection('trabajos').doc(workEditId.value).update(workPayload);
                    showToast('¡Registro de obra actualizado correctamente!', 'success');
                } else {
                    workPayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('trabajos').add(workPayload);
                    showToast('¡Nueva obra agregada exitosamente!', 'success');
                }

                closeWorkModal();
            } catch (error) {
                console.error('Error guardando obra:', error);
                showToast(`Error al guardar obra: ${error.message}`, 'error');
            } finally {
                saveWorkSubmitBtn.disabled = false;
                saveWorkSubmitBtn.innerHTML = '<i class="ph-light ph-check"></i><span>Guardar Registro</span>';
            }
        });
    }

    async function deleteWork(id, title) {
        if (!confirm(`¿Estás seguro de que deseás eliminar la obra "${title}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            await db.collection('trabajos').doc(id).delete();
            showToast(`Obra "${title}" eliminada con éxito.`, 'success');
        } catch (error) {
            console.error('Error eliminando obra:', error);
            showToast(`Error al eliminar obra: ${error.message}`, 'error');
        }
    }

    // Inicializador / Seed de las 29 obras predeterminadas
    
    const forceSyncWorksBtn = document.getElementById('forceSyncWorksBtn');
    if (forceSyncWorksBtn) {
        forceSyncWorksBtn.addEventListener('click', () => {
            seedInitialWorks(true);
        });
    }

    async function seedInitialWorks(force = false) {
        const msg = force 
            ? '¿Deseás sincronizar y restaurar las 29 obras con las fotos reales del catálogo? Esto reemplazará las obras actuales asegurando que todas las miniaturas se vean perfectamente.' 
            : '¿Deseás cargar las 29 obras del catálogo inicial a Firestore? Podrás editarlas o cambiarlas cuando quieras.';
        if (!confirm(msg)) {
            return;
        }

        showToast('Sincronizando 29 obras con fotos reales...', 'info');

        const initialCatalog = [
            { id: 1, file: '16-9 (1).webp', phase: 'montaje', phaseText: 'Montaje & Logística', phaseIcon: 'ph-crane', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Izaje e Implantación en Terreno', desc: 'Posicionamiento milimétrico del módulo sobre platea nivelada mediante hidrogrúa de alto tonelaje.' },
            { id: 2, file: '2-3 (1).webp', phase: 'estructura', phaseText: 'Estructura & Steel Frame', phaseIcon: 'ph-frame-corners', ratio: '2:3 Vertical', ratioClass: 'ratio-2-3', spanClass: 'span-2-row', title: 'Estructura Portante en Perfilería Liviana', desc: 'Montaje vertical de montantes galvanizados PGC y vinculaciones estructurales de alta rigidez.' },
            { id: 3, file: '16-9 (2).webp', phase: 'estructura', phaseText: 'Estructura & Steel Frame', phaseIcon: 'ph-wrench', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Prefabricación de Paneles en Planta', desc: 'Armado bajo clima controlado en nave industrial, garantizando escuadras y tolerancias cero.' },
            { id: 4, file: '2-3 (2).webp', phase: 'envolvente', phaseText: 'Terminaciones & Envolvente', phaseIcon: 'ph-shield-check', ratio: '2:3 Vertical', ratioClass: 'ratio-2-3', spanClass: 'span-2-row', title: 'Barrera Hidrófuga y Aislación Integral', desc: 'Colocación de membrana de ventilación y aislante multicapa contra humedad y puentes térmicos.' },
            { id: 5, file: '16-9 (3).webp', phase: 'finalizadas', phaseText: 'Obras Entregadas', phaseIcon: 'ph-house-line', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Módulo Habitacional Instalado', desc: 'Unidad completamente habitable, conectada a servicios e integrada al entorno natural.' },
            { id: 6, file: '1-1 (1).webp', phase: 'estructura', phaseText: 'Estructura & Steel Frame', phaseIcon: 'ph-squares-four', ratio: '1:1 Cuadrada', ratioClass: 'ratio-1-1', spanClass: '', title: 'Nudo y Rigidización Estructural', desc: 'Detalle técnico de encuentros en esquinas y arriostramientos con cruces de San Andrés.' },
            { id: 7, file: '16-9 (4).webp', phase: 'montaje', phaseText: 'Montaje & Logística', phaseIcon: 'ph-truck', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Logística y Transporte Terrestre', desc: 'Carga de módulo prefabricado en batea especial para traslado directo al lote del cliente.' },
            { id: 8, file: '2-3 (3).webp', phase: 'envolvente', phaseText: 'Terminaciones & Envolvente', phaseIcon: 'ph-door', ratio: '2:3 Vertical', ratioClass: 'ratio-2-3', spanClass: 'span-2-row', title: 'Carpinterías DVH y Revestimiento', desc: 'Montaje de vanos con doble vidriado hermético y sellados de alta estanqueidad.' },
            { id: 9, file: '16-9 (5).webp', phase: 'estructura', phaseText: 'Estructura & Steel Frame', phaseIcon: 'ph-bounding-box', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Esqueleto Metálico y Entrepiso', desc: 'Cálculo y distribución de cargas sobre vigas de acero conformadas en frío.' },
            { id: 10, file: '2-1.webp', phase: 'finalizadas', phaseText: 'Obras Entregadas', phaseIcon: 'ph-armchair', ratio: '5:4 Especial', ratioClass: 'ratio-2-1', spanClass: '', title: 'Espacios Interiores Terminados', desc: 'Ambientes luminosos y confortables con pisos vinílicos y revestimientos de primera línea.' },
            { id: 11, file: '16-9 (6).webp', phase: 'envolvente', phaseText: 'Terminaciones & Envolvente', phaseIcon: 'ph-paint-brush-broad', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Revestimiento Exterior y Terminaciones', desc: 'Aplicación de terminaciones modernas de bajo mantenimiento y alta durabilidad climática.' },
            { id: 12, file: '2-3 (4).webp', phase: 'montaje', phaseText: 'Montaje & Logística', phaseIcon: 'ph-arrows-down-up', ratio: '2:3 Vertical', ratioClass: 'ratio-2-3', spanClass: 'span-2-row', title: 'Maniobra Vertical de Izaje', desc: 'Eslingas homologadas y personal especializado en maniobras de izaje de módulos completos.' },
            { id: 13, file: '16-9 (7).webp', phase: 'finalizadas', phaseText: 'Obras Entregadas', phaseIcon: 'ph-sun', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Galería y Pérgola Exterior', desc: 'Ampliación de superficie semicubierta integrada armónicamente a la arquitectura modular.' },
            { id: 14, file: '1-1 (2).webp', phase: 'envolvente', phaseText: 'Terminaciones & Envolvente', phaseIcon: 'ph-check-circle', ratio: '1:1 Cuadrada', ratioClass: 'ratio-1-1', spanClass: '', title: 'Detalle de Acabados Interiores', desc: 'Encuentros limpios, molduras minimalistas y verificación técnica de terminación.' },
            { id: 15, file: '16-9 (8).webp', phase: 'estructura', phaseText: 'Estructura & Steel Frame', phaseIcon: 'ph-house-line', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Cubierta y Estructura de Techo', desc: 'Cabriadas de acero liviano diseñadas para resistir fuertes cargas de viento y nieve.' },
            { id: 16, file: '2-3 (5).webp', phase: 'finalizadas', phaseText: 'Obras Entregadas', phaseIcon: 'ph-sparkle', ratio: '2:3 Vertical', ratioClass: 'ratio-2-3', spanClass: 'span-2-row', title: 'Fachada Arquitectónica Nördika', desc: 'Líneas rectas, estética contemporánea y contraste refinado de texturas y materiales.' },
            { id: 17, file: '16-9 (9).webp', phase: 'montaje', phaseText: 'Montaje & Logística', phaseIcon: 'ph-anchor', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Fijación y Anclaje sobre Platea', desc: 'Anclajes mecánicos y químicos de alta resistencia garantizando rigidez estructural.' },
            { id: 18, file: '2-3-mas_ancho (1).webp', phase: 'envolvente', phaseText: 'Terminaciones & Envolvente', phaseIcon: 'ph-plugs-connected', ratio: '3:4 Especial', ratioClass: 'ratio-2-3-wide', spanClass: '', title: 'Tendido de Instalaciones y Canalizaciones', desc: 'Pasaje seguro de cañerías eléctricas, agua y desagües a través del alma de los perfiles.' },
            { id: 19, file: '16-9 (10).webp', phase: 'estructura', phaseText: 'Estructura & Steel Frame', phaseIcon: 'ph-wall', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Emplacado y Rigidización en Seco', desc: 'Fijación de placas estructurales OSB y multilaminado sobre estructura de perfiles PGC.' },
            { id: 20, file: '2-3 (6).webp', phase: 'estructura', phaseText: 'Estructura & Steel Frame', phaseIcon: 'ph-link', ratio: '2:3 Vertical', ratioClass: 'ratio-2-3', spanClass: 'span-2-row', title: 'Fijaciones Industriales Autoperforantes', desc: 'Tornillería galvanizada de torque controlado que asegura la indestructibilidad del esqueleto.' },
            { id: 21, file: '16-9 (11).webp', phase: 'montaje', phaseText: 'Montaje & Logística', phaseIcon: 'ph-intersect', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Unión y Acople de Módulos', desc: 'Encuentro de módulos combinados para formar viviendas de 40 m² y 60 m² sin puentes térmicos.' },
            { id: 22, file: '2-3 (7).webp', phase: 'envolvente', phaseText: 'Terminaciones & Envolvente', phaseIcon: 'ph-paint-roller', ratio: '2:3 Vertical', ratioClass: 'ratio-2-3', spanClass: 'span-2-row', title: 'Revestimiento Siding y Placas Exteriores', desc: 'Materiales ignífugos de alta densidad preparados para intemperie extrema.' },
            { id: 23, file: '16-9 (12).webp', phase: 'finalizadas', phaseText: 'Obras Entregadas', phaseIcon: 'ph-check-square', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Unidad Modular Llave en Mano', desc: 'Módulo terminado con equipamiento standard, listo para su uso inmediato.' },
            { id: 24, file: '2-3-mas_ancho (2).webp', phase: 'montaje', phaseText: 'Montaje & Logística', phaseIcon: 'ph-ruler', ratio: '3:4 Especial', ratioClass: 'ratio-2-3-wide', spanClass: '', title: 'Nivelación Láser y Verificación', desc: 'Control de pendientes y apoyos de precisión en la etapa de implantación.' },
            { id: 25, file: '16-9 (13).webp', phase: 'estructura', phaseText: 'Estructura & Steel Frame', phaseIcon: 'ph-cube', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Armazón Espacial y Distribución Interna', desc: 'Definición geométrica de ambientes mediante tabiquería de acero galvanizado.' },
            { id: 26, file: '16-9 (14).webp', phase: 'envolvente', phaseText: 'Terminaciones & Envolvente', phaseIcon: 'ph-shield', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Aislamiento Acústico y Confort Térmico', desc: 'Lana de vidrio de alta densidad que proporciona máxima eficiencia energética.' },
            { id: 27, file: '16-9 (15).webp', phase: 'finalizadas', phaseText: 'Obras Entregadas', phaseIcon: 'ph-buildings', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Complejo de Módulos Turísticos', desc: 'Conjunto de unidades implantadas de forma simultánea, maximizando la rentabilidad.' },
            { id: 28, file: '16-9 (16).webp', phase: 'montaje', phaseText: 'Montaje & Logística', phaseIcon: 'ph-navigation-arrow', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Traslado en Ruta con Seguridad Total', desc: 'Chasis diseñado y arriostrado para soportar traslados viales sin fatiga estructural.' },
            { id: 29, file: '16-9 (17).webp', phase: 'finalizadas', phaseText: 'Obras Entregadas', phaseIcon: 'ph-tree', ratio: '16:9 Panorámica', ratioClass: 'ratio-16-9', spanClass: 'span-2-col', title: 'Integración Armónica en Paisaje', desc: 'Vivienda moderna finalizada respetando la topografía y el entorno natural.' }
        ];

        try {
            if (force) {
                const snap = await db.collection('trabajos').get();
                const delBatch = db.batch();
                snap.forEach(d => delBatch.delete(d.ref));
                await delBatch.commit();
            }
            const batch = db.batch();
            initialCatalog.forEach(item => {
                const docRef = db.collection('trabajos').doc();
                const ratioClass = item.ratio.includes('16:9') ? 'ratio-16-9' 
                    : item.ratio.includes('2:3') ? 'ratio-2-3' 
                    : item.ratio.includes('1:1') ? 'ratio-1-1' : 'ratio-5-4';

                const spanClass = item.ratio.includes('2:3') ? 'span-2-row' : 'span-2-col';

                batch.set(docRef, {
                    phase: item.phase,
                    phaseText: phaseLabels[item.phase] || item.phase,
                    title: item.title,
                    desc: item.desc,
                    ratio: item.ratio,
                    ratioClass,
                    spanClass,
                    display: `assets/images/trabajos/display/${item.file}`,
                    thumb: `assets/images/trabajos/thumbs/${item.file}`,
                    full: `assets/images/trabajos/Trabajos/${item.file}`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            showToast('¡29 obras del catálogo inicial cargadas exitosamente a Firestore!', 'success');
        } catch (error) {
            console.error('Error inicializando obras:', error);
            showToast(`Error al cargar obras iniciales: ${error.message}`, 'error');
        }
    }

    // =========================================================================
    // 8. SECCIÓN 4: PREGUNTAS FRECUENTES (CRUD FAQ)
    // =========================================================================
    const faqsAdminList = document.getElementById('faqsAdminList');
    const openAddFaqModalBtn = document.getElementById('openAddFaqModalBtn');
    const faqModal = document.getElementById('faqModal');
    const closeFaqModalBtn = document.getElementById('closeFaqModalBtn');
    const cancelFaqModalBtn = document.getElementById('cancelFaqModalBtn');
    const faqForm = document.getElementById('faqForm');
    const faqEditId = document.getElementById('faqEditId');
    const faqQuestionInput = document.getElementById('faqQuestionInput');
    const faqIntroInput = document.getElementById('faqIntroInput');
    const faqItemsInput = document.getElementById('faqItemsInput');
    const saveFaqSubmitBtn = document.getElementById('saveFaqSubmitBtn');
    const faqModalTitle = document.getElementById('faqModalTitle');

    let allFaqs = [];

    const DEFAULT_FAQS = [
        {
            order: 1,
            question: '¿Qué hacemos?',
            intro: 'Desarrollamos proyectos arquitectónicos integrales a través del sistema Steel Frame, cubriendo diversas escalas y requerimientos:',
            items: [
                'Viviendas Permanentes: Casas modernas diseñadas para ofrecer confort térmico, durabilidad estructural y máxima eficiencia energética.',
                'Cabañas Turísticas: Soluciones habitacionales optimizadas para complejos vacacionales, hotelería y desarrollos en entornos naturales.',
                'Dormis Modulares: Módulos versátiles y funcionales, ideales para ampliaciones rápidas, glampings o unidades independientes.',
                'Desarrollos Inmobiliarios: Soluciones seriadas e industrializadas a gran escala que optimizan tiempos y reducen costos de ejecución.',
                'Oficinas y Espacios Comerciales: Espacios de trabajo funcionales y acústicamente confortables, adaptados a la identidad de cada empresa.'
            ]
        },
        {
            order: 2,
            question: '¿Por qué elegir Nördika?',
            intro: 'Combinamos tecnología constructiva de vanguardia con Ingeniería Fina en cada proceso. Nuestras principales ventajas:',
            items: [
                'Certeza de Costos y Plazos: Construcción industrializada en planta, eliminando imprevistos, sobrecostos y demoras climáticas.',
                'Diseño Arquitectónico Inteligente: Espacios modernos, luminosos, de distribución óptima y estética cuidada al milímetro.',
                'Confort Termoacústico Superior: Paquetes multicapa con lana de vidrio y barreras técnicas para un clima interior perfecto los 365 días del año.',
                'Acompañamiento Profesional: Asesoramiento continuo por parte de nuestro equipo técnico desde el anteproyecto hasta la entrega final.',
                'Sustentabilidad y Eficiencia: Menor impacto ambiental, obra seca y limpia sin desperdicios, y gran ahorro energético mensual.'
            ]
        },
        {
            order: 3,
            question: '¿Qué incluye el nivel Standard?',
            intro: 'Nuestros módulos en nivel Standard se entregan listos para habitar con materiales de primera línea y terminaciones cuidadas:',
            items: [
                'Estructura y Cerramientos: Perfilería estructural en Steel Frame galvanizado, paneles exteriores y cubierta de chapa con aislamiento termoacústico.',
                'Terminaciones Interiores: Muros y cielorrasos con placas de yeso pintadas al látex, pisos flotantes de alto tránsito y zócalos perimetrales.',
                'Baño Completo: Sanitarios de primera línea (Capea/Roca), griferías FV o similar, receptáculo de ducha impermeabilizado y vanitory instalado.',
                'Carpintería e Instalaciones: Ventanas de aluminio anodizado línea Módena, puertas interiores y circuito eléctrico completo con tablero seccional y llaves térmicas.'
            ]
        },
        {
            order: 4,
            question: '¿Cuánto tiempo demora la construcción?',
            intro: 'El método modular off-site reduce los tiempos de obra en más de un 60% respecto a la construcción tradicional húmeda:',
            items: [
                'Fabricación en Planta (45 a 60 días): Manufactura integral bajo nave cubierta, sin interrupciones por lluvias ni inclemencias climáticas.',
                'Control de Calidad Riguroso: Inspección exhaustiva de cada fase estructural, hidrosanitaria y eléctrica antes del despacho.',
                'Montaje en Terreno (24 a 48 horas): La unidad llega ensamblada y se asienta sobre las fundaciones preparadas, lista para conectar servicios.',
                'Plazos Contractuales: Cronograma de entrega garantizado y establecido por contrato, brindándote total previsibilidad.'
            ]
        },
        {
            order: 5,
            question: '¿Se pueden personalizar los módulos?',
            intro: 'Sí, con total flexibilidad. Si bien contamos con tipologías base optimizadas, cada módulo puede adaptarse a tu gusto y terreno:',
            items: [
                'Distribución y Espacios: Posibilidad de reorganizar ambientes, incorporar dormitorios o diseñar anexos para futuras ampliaciones en etapas.',
                'Revestimientos y Fachadas: Opciones de acabado exterior en chapa acanalada, siding de fibrocemento, tablas de madera tratada o WPC.',
                'Adicionales Arquitectónicos: Integración de galerías, pérgolas, decks perimetrales, aberturas DVH o sistemas de energía solar.',
                'Desarrollos a Medida: Adaptación de módulos para usos específicos como estudios profesionales, consultorios o proyectos hoteleros.'
            ]
        },
        {
            order: 6,
            question: '¿El sistema es apto para cualquier clima?',
            intro: 'Totalmente. El sistema constructivo Steel Frame está homologado a nivel mundial para responder en las condiciones climáticas más exigentes:',
            items: [
                'Aislamiento Térmico Multicapa: Lana de vidrio de alta densidad que minimiza el consumo energético tanto en inviernos rigurosos como en veranos cálidos.',
                'Barrera Hidrófuga y Cortaviento: Membrana respirable tipo Tyvek que frena el viento y la humedad exterior, evitando cualquier condensación interna.',
                'Resistencia Estructural y Sismo-resistencia: Estructura de acero galvanizado indeformable, altamente resistente a fuertes vientos, sismos y granizo.',
                'Inmunidad Biológica y Durabilidad: Materiales incombustibles e inmunes a plagas (termitas, insectos) y humedad de cimientos, con más de 100 años de vida útil.'
            ]
        }
    ];

    function listenToFaqs() {
        db.collection('faqs')
            .orderBy('order', 'asc')
            .onSnapshot((snapshot) => {
                allFaqs = [];
                snapshot.forEach(doc => {
                    allFaqs.push({ id: doc.id, ...doc.data() });
                });
                renderFaqsUI();
            }, (error) => {
                console.error('Error escuchando FAQs:', error);
                db.collection('faqs').get().then(snapshot => {
                    allFaqs = [];
                    snapshot.forEach(doc => allFaqs.push({ id: doc.id, ...doc.data() }));
                    renderFaqsUI();
                });
            });
    }

    function renderFaqsUI() {
        if (!faqsAdminList) return;
        faqsAdminList.innerHTML = '';

        if (allFaqs.length === 0) {
            faqsAdminList.innerHTML = `
                <div class="inbox-empty-state">
                    <i class="ph-light ph-question inbox-empty-icon"></i>
                    <h3 class="tech-font text-white" style="margin-bottom: 0.5rem;">No hay preguntas frecuentes registradas</h3>
                    <p class="text-silver mb-4">Podés agregar una nueva pregunta o cargar las 6 preguntas estándar de Nördika.</p>
                    <button type="button" class="btn btn-outline" id="seedFaqsBtn">
                        <i class="ph-light ph-database"></i>
                        <span>Importar 6 Preguntas Frecuentes Iniciales</span>
                    </button>
                </div>
            `;
            const seedBtn = document.getElementById('seedFaqsBtn');
            if (seedBtn) seedBtn.addEventListener('click', seedInitialFaqs);
            return;
        }

        allFaqs.forEach((faq, index) => {
            const item = document.createElement('div');
            item.className = 'faq-admin-item';

            const itemsHtml = Array.isArray(faq.items) && faq.items.length > 0
                ? `<ul style="margin: 0.5rem 0 0 1.25rem; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                    ${faq.items.map(it => `<li>${it}</li>`).join('')}
                   </ul>`
                : '';

            item.innerHTML = `
                <div class="faq-admin-header">
                    <div>
                        <span style="color: var(--teal-light); font-size: 0.75rem; font-family: var(--font-heading); font-weight: 700; text-transform: uppercase;">
                            Pregunta #${index + 1}
                        </span>
                        <h3 class="faq-admin-question tech-font">${faq.question}</h3>
                    </div>
                    <div class="faq-admin-actions">
                        <button type="button" class="btn-card-action btn-edit-faq" data-id="${faq.id}">
                            <i class="ph-light ph-pencil"></i>
                            <span>Editar</span>
                        </button>
                        <button type="button" class="btn-card-action btn-delete btn-delete-faq" data-id="${faq.id}">
                            <i class="ph-light ph-trash"></i>
                            <span>Eliminar</span>
                        </button>
                    </div>
                </div>
                <div class="faq-admin-body">
                    <p>${faq.intro || ''}</p>
                    ${itemsHtml}
                </div>
            `;

            item.querySelector('.btn-edit-faq').addEventListener('click', () => openEditFaqModal(faq));
            item.querySelector('.btn-delete-faq').addEventListener('click', () => deleteFaq(faq.id, faq.question));

            faqsAdminList.appendChild(item);
        });
    }

    function openAddFaqModal() {
        faqForm.reset();
        faqEditId.value = '';
        faqModalTitle.textContent = 'Agregar Pregunta Frecuente';
        faqModal.classList.add('active');
    }

    function openEditFaqModal(faq) {
        faqForm.reset();
        faqEditId.value = faq.id;
        faqQuestionInput.value = faq.question || '';
        faqIntroInput.value = faq.intro || '';
        faqItemsInput.value = Array.isArray(faq.items) ? faq.items.join('\n') : '';
        faqModalTitle.textContent = 'Editar Pregunta Frecuente';
        faqModal.classList.add('active');
    }

    function closeFaqModal() {
        faqModal.classList.remove('active');
        faqForm.reset();
    }

    if (openAddFaqModalBtn) openAddFaqModalBtn.addEventListener('click', openAddFaqModal);
    if (closeFaqModalBtn) closeFaqModalBtn.addEventListener('click', closeFaqModal);
    if (cancelFaqModalBtn) cancelFaqModalBtn.addEventListener('click', closeFaqModal);

    if (faqForm) {
        faqForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const question = faqQuestionInput.value.trim();
            const intro = faqIntroInput.value.trim();
            const itemsRaw = faqItemsInput.value.trim();

            const items = itemsRaw ? itemsRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0) : [];
            const isEdit = !!faqEditId.value;

            saveFaqSubmitBtn.disabled = true;
            saveFaqSubmitBtn.innerHTML = '<i class="ph-light ph-spinner admin-spin"></i><span>Guardando...</span>';

            try {
                const payload = {
                    question,
                    intro,
                    items,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (isEdit) {
                    await db.collection('faqs').doc(faqEditId.value).update(payload);
                    showToast('¡Pregunta frecuente actualizada!', 'success');
                } else {
                    payload.order = allFaqs.length + 1;
                    payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('faqs').add(payload);
                    showToast('¡Nueva pregunta frecuente agregada!', 'success');
                }

                closeFaqModal();
            } catch (error) {
                console.error('Error guardando FAQ:', error);
                showToast(`Error al guardar FAQ: ${error.message}`, 'error');
            } finally {
                saveFaqSubmitBtn.disabled = false;
                saveFaqSubmitBtn.innerHTML = '<i class="ph-light ph-check"></i><span>Guardar Pregunta</span>';
            }
        });
    }

    async function deleteFaq(id, question) {
        if (!confirm(`¿Eliminar la pregunta "${question}"?`)) return;

        try {
            await db.collection('faqs').doc(id).delete();
            showToast('Pregunta frecuente eliminada.', 'success');
        } catch (error) {
            console.error('Error eliminando FAQ:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    async function seedInitialFaqs() {
        if (!confirm('¿Importar las 6 preguntas frecuentes estándar de Nördika?')) return;

        showToast('Importando preguntas frecuentes...', 'info');
        try {
            if (force) {
                const snap = await db.collection('trabajos').get();
                const delBatch = db.batch();
                snap.forEach(d => delBatch.delete(d.ref));
                await delBatch.commit();
            }
            const batch = db.batch();
            DEFAULT_FAQS.forEach(faq => {
                const ref = db.collection('faqs').doc();
                batch.set(ref, {
                    ...faq,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();
            showToast('¡6 Preguntas frecuentes importadas con éxito!', 'success');
        } catch (error) {
            console.error('Error importando FAQs:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    // =========================================================================
    // 9. SECCIÓN 5: BANDEJA DE ENTRADA (LEADS EN TIEMPO REAL & WHATSAPP)
    // =========================================================================
    const inboxMessagesContainer = document.getElementById('inboxMessagesContainer');
    const unreadBadge = document.getElementById('unreadBadge');
    const inboxUnreadCount = document.getElementById('inboxUnreadCount');
    const inboxTotalCount = document.getElementById('inboxTotalCount');
    const inboxFilterBtns = document.querySelectorAll('.inbox-filter-bar .inbox-filter-btn');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    let allMessages = [];
    let currentInboxFilter = 'all';

    function listenToMessages() {
        db.collection('mensajes')
            .orderBy('fecha', 'desc')
            .onSnapshot((snapshot) => {
                allMessages = [];
                let unreadCount = 0;

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const msg = { id: doc.id, ...data };
                    allMessages.push(msg);

                    if (!msg.leido && !msg.archivado) {
                        unreadCount++;
                    }
                });

                // Actualizar badges
                if (unreadBadge) {
                    unreadBadge.textContent = unreadCount;
                    unreadBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
                }

                if (inboxUnreadCount) inboxUnreadCount.textContent = unreadCount;
                if (inboxTotalCount) inboxTotalCount.textContent = allMessages.length;

                renderMessagesUI();
            }, (error) => {
                console.error('Error escuchando mensajes:', error);
                // Si la consulta con orderBy falla (por índice o vacía), intentar sin orden
                db.collection('mensajes').get().then(snapshot => {
                    allMessages = [];
                    let unreadCount = 0;
                    snapshot.forEach(doc => {
                        const msg = { id: doc.id, ...doc.data() };
                        allMessages.push(msg);
                        if (!msg.leido && !msg.archivado) unreadCount++;
                    });
                    if (unreadBadge) {
                        unreadBadge.textContent = unreadCount;
                        unreadBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
                    }
                    if (inboxUnreadCount) inboxUnreadCount.textContent = unreadCount;
                    if (inboxTotalCount) inboxTotalCount.textContent = allMessages.length;
                    renderMessagesUI();
                }).catch(err => {
                    console.warn('Consulta fallback de mensajes:', err);
                });
            });
    }

    function renderMessagesUI() {
        if (!inboxMessagesContainer) return;
        inboxMessagesContainer.innerHTML = '';

        let filtered = allMessages;
        if (currentInboxFilter === 'unread') {
            filtered = allMessages.filter(m => !m.leido && !m.archivado);
        } else if (currentInboxFilter === 'archived') {
            filtered = allMessages.filter(m => !!m.archivado);
        } else {
            // "Todos" excluye archivados para mantener la bandeja despejada, o incluye todos según estándar
            filtered = allMessages.filter(m => !m.archivado);
        }

        if (filtered.length === 0) {
            inboxMessagesContainer.innerHTML = `
                <div class="inbox-empty-state">
                    <i class="ph-light ph-envelope-open inbox-empty-icon"></i>
                    <h3 class="tech-font text-white" style="margin-bottom: 0.5rem;">No hay mensajes en esta vista</h3>
                    <p class="text-silver">Los nuevos contactos que completen el formulario web aparecerán aquí en tiempo real con su número de teléfono.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(msg => {
            const card = document.createElement('div');
            card.className = `lead-card ${!msg.leido ? 'unread' : ''}`;

            const cleanPhone = cleanPhoneNumber(msg.telefono);
            const firstName = (msg.nombre || 'estimado/a').split(' ')[0];
            const waGreeting = encodeURIComponent(
                `Hola ${firstName}! Te contactamos desde Nördika Arquitectura Modular en respuesta a tu consulta enviada desde nuestra página web. ¿En qué podemos ayudarte con tu proyecto?`
            );
            const waUrl = cleanPhone 
                ? `https://wa.me/${cleanPhone}?text=${waGreeting}` 
                : '#';

            card.innerHTML = `
                <div class="lead-card-header">
                    <div class="lead-sender-name tech-font">
                        ${!msg.leido ? '<span class="lead-new-dot" title="Mensaje no leído"></span>' : ''}
                        <span>${msg.nombre || 'Contacto Anónimo'}</span>
                    </div>
                    <span class="lead-date tech-font">${formatTimestamp(msg.fecha)}</span>
                </div>

                <div class="lead-contact-grid">
                    <div class="lead-contact-item">
                        <i class="ph-light ph-phone"></i>
                        <a href="tel:${msg.telefono || ''}" style="color: inherit; text-decoration: none;" title="Llamar">
                            ${msg.telefono || 'Sin teléfono'}
                        </a>
                    </div>
                    <div class="lead-contact-item">
                        <i class="ph-light ph-envelope"></i>
                        <a href="mailto:${msg.email || ''}" style="color: inherit; text-decoration: none;" title="Enviar correo">
                            ${msg.email || 'Sin email'}
                        </a>
                    </div>
                    <div class="lead-contact-item">
                        <i class="ph-light ph-tag"></i>
                        <span>${msg.origen || 'Formulario Web'}</span>
                    </div>
                </div>

                <div class="lead-message-body">${msg.mensaje || 'Sin texto de consulta.'}</div>

                <div class="lead-card-actions">
                    <div class="lead-action-left">
                        ${cleanPhone ? `
                            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp-lead">
                                <i class="ph-light ph-whatsapp-logo"></i>
                                <span>Responder por WhatsApp</span>
                            </a>
                        ` : ''}
                        
                        <button type="button" class="btn btn-outline btn-toggle-read" data-id="${msg.id}" data-read="${!!msg.leido}">
                            <i class="ph-light ${msg.leido ? 'ph-envelope' : 'ph-envelope-open'}"></i>
                            <span>${msg.leido ? 'Marcar no leído' : 'Marcar leído'}</span>
                        </button>
                    </div>

                    <div class="lead-action-right" style="display: flex; gap: 0.5rem;">
                        <button type="button" class="btn btn-outline btn-toggle-archive" data-id="${msg.id}" data-archived="${!!msg.archivado}" title="${msg.archivado ? 'Restaurar de archivados' : 'Archivar consulta'}">
                            <i class="ph-light ${msg.archivado ? 'ph-arrow-u-up-left' : 'ph-archive'}"></i>
                            <span>${msg.archivado ? 'Desarchivar' : 'Archivar'}</span>
                        </button>
                        <button type="button" class="btn btn-outline btn-delete-lead" data-id="${msg.id}" title="Eliminar definitivamente" style="color: var(--danger); border-color: rgba(230,57,70,0.4);">
                            <i class="ph-light ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            // Listeners de acciones del lead
            card.querySelector('.btn-toggle-read').addEventListener('click', () => toggleMessageRead(msg.id, !msg.leido));
            card.querySelector('.btn-toggle-archive').addEventListener('click', () => toggleMessageArchive(msg.id, !msg.archivado));
            card.querySelector('.btn-delete-lead').addEventListener('click', () => deleteMessage(msg.id, msg.nombre));

            inboxMessagesContainer.appendChild(card);
        });
    }

    // Filtros de Bandeja
    inboxFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            inboxFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentInboxFilter = btn.getAttribute('data-filter');
            renderMessagesUI();
        });
    });

    async function toggleMessageRead(id, newStatus) {
        try {
            await db.collection('mensajes').doc(id).update({
                leido: newStatus
            });
            showToast(newStatus ? 'Mensaje marcado como leído.' : 'Mensaje marcado como no leído.', 'info');
        } catch (error) {
            console.error('Error actualizando mensaje:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    async function toggleMessageArchive(id, newStatus) {
        try {
            await db.collection('mensajes').doc(id).update({
                archivado: newStatus,
                leido: true
            });
            showToast(newStatus ? 'Mensaje archivado.' : 'Mensaje restaurado a la bandeja principal.', 'info');
        } catch (error) {
            console.error('Error archivando mensaje:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    async function deleteMessage(id, name) {
        if (!confirm(`¿Eliminar definitivamente el mensaje de "${name || 'Contacto'}"?`)) return;

        try {
            await db.collection('mensajes').doc(id).delete();
            showToast('Mensaje eliminado.', 'success');
        } catch (error) {
            console.error('Error eliminando mensaje:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    // Marcar todo como leído
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            const unreadMessages = allMessages.filter(m => !m.leido && !m.archivado);
            if (unreadMessages.length === 0) {
                showToast('No tenés mensajes pendientes de lectura.', 'info');
                return;
            }

            markAllReadBtn.disabled = true;
            try {
                const batch = db.batch();
                unreadMessages.forEach(m => {
                    batch.update(db.collection('mensajes').doc(m.id), { leido: true });
                });
                await batch.commit();
                showToast(`¡Se marcaron ${unreadMessages.length} mensajes como leídos!`, 'success');
            } catch (error) {
                console.error('Error marcando como leídos:', error);
                showToast(`Error: ${error.message}`, 'error');
            } finally {
                markAllReadBtn.disabled = false;
            }
        });
    }

    // =========================================================================
    // 10. ARRANQUE E INICIALIZACIÓN GENERAL (SOLO TRAS AUTENTICACIÓN)
    // =========================================================================
    function initAdminPanel() {
        loadHeroConfig();
        loadModule('20m');
        listenToWorks();
        listenToFaqs();
        listenToMessages();
        console.log('Nördika CMS Admin Panel inicializado con autenticación válida.');
    }

})();
