document.addEventListener('DOMContentLoaded', () => {
    
    // --- FAQ Accordion ---
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        const icon = item.querySelector('.faq-icon');

        questionBtn.addEventListener('click', () => {
            // Check if current item is active
            const isActive = item.classList.contains('active');

            // Close all items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.faq-icon').textContent = '+';
            });

            // If it wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
                icon.textContent = '-';
            }
        });
    });

    // --- Specs Dashboard Tabs ---
    const specTabs = document.querySelectorAll('.spec-tab');
    const specPanes = document.querySelectorAll('.spec-pane');

    specTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs and panes
            specTabs.forEach(t => t.classList.remove('active'));
            specPanes.forEach(p => p.classList.remove('active'));
            
            // Add active to clicked tab
            tab.classList.add('active');

            // Show corresponding pane
            const targetId = `pane-${tab.dataset.target}`;
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // --- Hero Background Slider ---
    const slides = document.querySelectorAll('.hero-bg.slide');
    const slideIndicators = document.querySelectorAll('.slide-indicator');
    const captionEl = document.getElementById('hero-slide-caption');
    const slideCaptions = [
        'Montaje e implantación en lote · Nördika',
        'Estructura y diseño arquitectónico · Nördika',
        'Terminaciones de alta prestación · Nördika'
    ];
    let currentSlide = 0;
    let slideTimer;

    function goToSlide(index) {
        if (!slides.length) return;
        slides[currentSlide].classList.remove('active');
        if (slideIndicators.length > currentSlide) {
            slideIndicators[currentSlide].classList.remove('active');
        }
        currentSlide = index;
        slides[currentSlide].classList.add('active');
        if (slideIndicators.length > currentSlide) {
            slideIndicators[currentSlide].classList.add('active');
        }
        if (captionEl && slideCaptions[currentSlide]) {
            captionEl.textContent = slideCaptions[currentSlide];
        }
    }

    function startSlideInterval() {
        if (slides.length <= 1) return;
        slideTimer = setInterval(() => {
            goToSlide((currentSlide + 1) % slides.length);
        }, 7000);
    }

    if (slides.length > 0) {
        startSlideInterval();
        slideIndicators.forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                clearInterval(slideTimer);
                goToSlide(idx);
                startSlideInterval();
            });
        });
    }

    // --- Navbar Scroll Effect (Optimizado con Passive Listener) ---
    const navbar = document.querySelector('.navbar');
    let isNavScrolled = false;
    
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY > 50;
        if (scrolled !== isNavScrolled) {
            isNavScrolled = scrolled;
            navbar.style.boxShadow = scrolled ? '0 2px 10px rgba(0,0,0,0.1)' : 'none';
        }
    }, { passive: true });

    // --- Smooth Scrolling para anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                // Adjust for navbar height
                const headerOffset = 70;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // --- Catálogo y Modal ---
    const moduleCards = document.querySelectorAll('.module-card');

    moduleCards.forEach(card => {
        const badges = card.querySelectorAll('.plan-btn');
        const priceDisplay = card.querySelector('.price-display');
        const detailsBtn = card.querySelector('.details-btn');
        const imgFront = card.querySelector('.module-img.img-real');
        const titleText = card.dataset.title;

        // Interactividad de planes
        badges.forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.preventDefault();
                badges.forEach(b => b.classList.remove('active'));
                badge.classList.add('active');
                priceDisplay.textContent = `Desde ${badge.dataset.price}`;
            });
        });

        // Abrir Modal
        if(detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = card.getAttribute('data-target') || 'module-modal';
                const currentModal = document.getElementById(targetId);
                if (!currentModal) return;

                const activeBadge = card.querySelector('.plan-btn.active');
                const currentPrice = activeBadge ? activeBadge.dataset.price : 'Consultar';
                
                const mTitle = currentModal.querySelector('.modal-title');
                const mPrice = currentModal.querySelector('.modal-price');
                const mImg = currentModal.querySelector('.modal-img');
                
                if(mTitle) mTitle.textContent = titleText;
                if(mPrice) mPrice.textContent = currentPrice;
                
                const customModalImg = card.getAttribute('data-modal-img');
                if(mImg && customModalImg) {
                    mImg.src = customModalImg;
                } else if(mImg && imgFront) {
                    mImg.src = imgFront.src;
                }

                currentModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }
    });

    // Cerrar Modales
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const overlay = btn.closest('.modal-overlay');
            if(overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    const modalContactBtns = document.querySelectorAll('.modal-contact-btn');
    modalContactBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const overlay = btn.closest('.modal-overlay');
            if(overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // --- Copiar Teléfono al Portapapeles ---
    const copyPhoneBtns = document.querySelectorAll('.copy-phone');
    copyPhoneBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const phone = btn.dataset.phone;
            const feedback = btn.querySelector('.copy-feedback');
            
            navigator.clipboard.writeText(phone).then(() => {
                if(feedback) {
                    feedback.style.display = 'inline';
                    setTimeout(() => {
                        feedback.style.display = 'none';
                    }, 2000);
                }
            });
        });
    });



    // --- Lightbox para imágenes a pantalla completa ---
    window.currentLightboxImages = [];
    window.currentLightboxIndex = 0;

    window.openLightbox = function(el) {
        // Encontrar todas las miniaturas dentro del modal
        const container = el.closest('.modal-thumbnails');
        const thumbs = Array.from(container.querySelectorAll('img.modal-thumb'));
        
        // Guardar todas las URLs en el array global
        window.currentLightboxImages = thumbs.map(img => img.src);
        
        // Determinar qué imagen se hizo click
        const clickedImg = el.querySelector('img.modal-thumb');
        window.currentLightboxIndex = thumbs.findIndex(img => img === clickedImg);
        
        const overlay = document.getElementById('lightbox-overlay');
        const imgElement = document.getElementById('lightbox-img');
        
        if (overlay && imgElement) {
            imgElement.src = window.currentLightboxImages[window.currentLightboxIndex];
            overlay.classList.add('active');
        }
    };

    window.closeLightbox = function() {
        const overlay = document.getElementById('lightbox-overlay');
        if(overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    };

    window.lightboxNext = function() {
        if(window.currentLightboxImages.length === 0) return;
        window.currentLightboxIndex = (window.currentLightboxIndex + 1) % window.currentLightboxImages.length;
        document.getElementById('lightbox-img').src = window.currentLightboxImages[window.currentLightboxIndex];
    };

    window.lightboxPrev = function() {
        if(window.currentLightboxImages.length === 0) return;
        window.currentLightboxIndex = (window.currentLightboxIndex - 1 + window.currentLightboxImages.length) % window.currentLightboxImages.length;
        document.getElementById('lightbox-img').src = window.currentLightboxImages[window.currentLightboxIndex];
    };

    // Eventos del Lightbox
    document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
    document.querySelector('.lightbox-next')?.addEventListener('click', lightboxNext);
    document.querySelector('.lightbox-prev')?.addEventListener('click', lightboxPrev);
    
    document.getElementById('lightbox-overlay')?.addEventListener('click', (e) => {
        if(e.target.id === 'lightbox-overlay') closeLightbox();
    });
    
    // Navegación por teclado
    document.addEventListener('keydown', (e) => {
        const overlay = document.getElementById('lightbox-overlay');
        if(overlay && overlay.classList.contains('active')) {
            if(e.key === 'Escape') closeLightbox();
            if(e.key === 'ArrowRight') lightboxNext();
            if(e.key === 'ArrowLeft') lightboxPrev();
        }
    });

    // --- Soporte de Gestos Táctiles (Swipe) en Móvil para Lightbox ---
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    if (lightboxOverlay) {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        const minSwipeDistance = 40;

        lightboxOverlay.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchEndX = touchStartX;
                touchEndY = touchStartY;
            }
        }, { passive: true });

        lightboxOverlay.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                touchEndX = e.touches[0].clientX;
                touchEndY = e.touches[0].clientY;
            }
        }, { passive: true });

        lightboxOverlay.addEventListener('touchend', (e) => {
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
                if (diffX < 0) {
                    // Deslizó hacia la izquierda -> Siguiente imagen
                    lightboxNext();
                } else {
                    // Deslizó hacia la derecha -> Imagen anterior
                    lightboxPrev();
                }
            }
        }, { passive: true });
    }

    // --- Soporte de Gestos Táctiles (Swipe) en Galería de Modales ---
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        const gallery = modal.querySelector('.modal-gallery');
        if (!gallery) return;

        let gTouchStartX = 0;
        let gTouchStartY = 0;
        let gTouchEndX = 0;
        let gTouchEndY = 0;
        const gMinSwipe = 40;

        gallery.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                gTouchStartX = e.touches[0].clientX;
                gTouchStartY = e.touches[0].clientY;
                gTouchEndX = gTouchStartX;
                gTouchEndY = gTouchStartY;
            }
        }, { passive: true });

        gallery.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                gTouchEndX = e.touches[0].clientX;
                gTouchEndY = e.touches[0].clientY;
            }
        }, { passive: true });

        gallery.addEventListener('touchend', () => {
            const diffX = gTouchEndX - gTouchStartX;
            const diffY = gTouchEndY - gTouchStartY;

            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > gMinSwipe) {
                const thumbs = Array.from(gallery.querySelectorAll('img.modal-thumb'));
                const mainImg = gallery.querySelector('.modal-img');
                if (thumbs.length > 0 && mainImg) {
                    let currentIdx = thumbs.findIndex(t => t.src === mainImg.src);
                    if (currentIdx === -1) currentIdx = 0;
                    if (diffX < 0) {
                        currentIdx = (currentIdx + 1) % thumbs.length;
                    } else {
                        currentIdx = (currentIdx - 1 + thumbs.length) % thumbs.length;
                    }
                    mainImg.src = thumbs[currentIdx].src;
                }
            }
        }, { passive: true });
    });

    // --- Menú Hamburguesa Móvil ---
    const navHamburger = document.getElementById('nav-hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (navHamburger && navLinks) {
        navHamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = navHamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
            navHamburger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        });

        // Cerrar menú al hacer clic en cualquier enlace
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navHamburger.classList.remove('active');
                navLinks.classList.remove('active');
                navHamburger.setAttribute('aria-expanded', 'false');
            });
        });

        // Cerrar al hacer clic fuera del navbar
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar') && navLinks.classList.contains('active')) {
                navHamburger.classList.remove('active');
                navLinks.classList.remove('active');
                navHamburger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // --- Tema Verde/Blanco (Teal Toggle Sincronizado) ---
    function toggleTheme() {
        document.body.classList.toggle('teal-mode');
        document.documentElement.classList.toggle('teal-mode');
        const isTeal = document.body.classList.contains('teal-mode');

        // Actualizar todos los iconos moon/sun
        document.querySelectorAll('#theme-toggle i, #mobile-theme-toggle i').forEach(icon => {
            if (isTeal) {
                icon.classList.remove('ph-moon');
                icon.classList.add('ph-sun');
            } else {
                icon.classList.remove('ph-sun');
                icon.classList.add('ph-moon');
            }
        });

        // Actualizar etiqueta del botón en el menú móvil
        const mobileLabel = document.querySelector('.mobile-theme-label');
        if (mobileLabel) {
            mobileLabel.textContent = isTeal ? 'Claro' : 'Oscuro';
        }
    }

    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    document.getElementById('mobile-theme-toggle')?.addEventListener('click', toggleTheme);

    // --- Envío de Formulario de Contacto a Firestore ---
    const contactForm = document.getElementById('contactForm');
    const contactFeedback = document.getElementById('contactFeedback');
    const contactSubmitBtn = document.getElementById('contactSubmitBtn');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const phone = document.getElementById('phone')?.value.trim();
            const message = document.getElementById('message')?.value.trim();

            if (!name || !email || !phone || !message) {
                if (contactFeedback) {
                    contactFeedback.style.display = 'block';
                    contactFeedback.style.background = 'rgba(230, 57, 70, 0.2)';
                    contactFeedback.style.color = '#ff6b6b';
                    contactFeedback.style.border = '1px solid #ff6b6b';
                    contactFeedback.textContent = 'Por favor, completá todos los campos requeridos.';
                }
                return;
            }

            if (contactSubmitBtn) {
                contactSubmitBtn.disabled = true;
                contactSubmitBtn.innerHTML = '<span>Enviando consulta...</span>';
            }

            try {
                if (typeof firebase !== 'undefined' && window.firebaseConfig) {
                    if (!firebase.apps.length) {
                        firebase.initializeApp(window.firebaseConfig);
                    }
                    const db = firebase.firestore();

                    await db.collection('mensajes').add({
                        nombre: name,
                        email: email,
                        telefono: phone,
                        mensaje: message,
                        fecha: firebase.firestore.FieldValue.serverTimestamp(),
                        leido: false,
                        archivado: false,
                        origen: 'Formulario Web'
                    });

                    contactForm.reset();
                    if (contactFeedback) {
                        contactFeedback.style.display = 'block';
                        contactFeedback.style.background = 'rgba(0, 128, 128, 0.2)';
                        contactFeedback.style.color = '#4ade80';
                        contactFeedback.style.border = '1px solid var(--teal)';
                        contactFeedback.innerHTML = '<strong>¡Mensaje enviado con éxito!</strong> Nos comunicaremos con vos a la brevedad.';
                    }
                } else {
                    throw new Error('Servicio de conexión no disponible');
                }
            } catch (err) {
                console.error('Error al enviar formulario:', err);
                if (contactFeedback) {
                    contactFeedback.style.display = 'block';
                    contactFeedback.style.background = 'rgba(230, 57, 70, 0.2)';
                    contactFeedback.style.color = '#ff6b6b';
                    contactFeedback.style.border = '1px solid #ff6b6b';
                    contactFeedback.textContent = 'Ocurrió un error al enviar tu consulta. Por favor escribinos directamente por WhatsApp.';
                }
            } finally {
                if (contactSubmitBtn) {
                    contactSubmitBtn.disabled = false;
                    contactSubmitBtn.innerHTML = '<span>Enviar Mensaje</span> <i class="ph-light ph-paper-plane-tilt" style="margin-left: 0.5rem;"></i>';
                }
            }
        });
    }


    // ==========================================
    // STEEL FRAME: SIMULADOR & CATÁLOGO INTERACTIVO
    // ==========================================
    const sfProjectData = {
        vivienda: {
            timeSaved: '180 días ganados',
            steelTimeText: '60 días (Llave en mano)',
            steelTimeWidth: '25%',
            tradTimeText: '240 días (8 meses a la intemperie)',
            tradTimeWidth: '100%',
            wasteSaved: '90% menos residuos',
            steelWasteText: '< 2% (Obra limpia en planta)',
            steelWasteWidth: '10%',
            tradWasteText: '18% a 22% (Escombros y roturas)',
            tradWasteWidth: '100%',
            energySaved: 'Ahorro permanente',
            steelEnergyText: '-45% Consumo Energético Mensual',
            steelEnergyWidth: '55%',
            tradEnergyText: '100% Gasto estándar (Puentes térmicos)',
            tradEnergyWidth: '100%',
            costSaved: 'Cero sorpresas',
            steelCostText: '100% Cerrado por contrato',
            steelCostWidth: '100%',
            tradCostText: 'Desvíos habituales del 20% al 35%',
            tradCostWidth: '65%'
        },
        cabana: {
            timeSaved: '125 días ganados',
            steelTimeText: '35 días (Llave en mano)',
            steelTimeWidth: '22%',
            tradTimeText: '160 días (5+ meses en terreno)',
            tradTimeWidth: '100%',
            wasteSaved: '95% menos residuos',
            steelWasteText: '< 1.5% (Pre-corte exacto en nave)',
            steelWasteWidth: '8%',
            tradWasteText: '15% a 20% (Escombros y sobrantes)',
            tradWasteWidth: '100%',
            energySaved: '-50% en Calefacción',
            steelEnergyText: '-50% Aislación extrema en frío/nieve',
            steelEnergyWidth: '50%',
            tradEnergyText: 'Pérdidas constantes por filtraciones',
            tradEnergyWidth: '100%',
            costSaved: 'Presupuesto blindado',
            steelCostText: 'Precio fijo sin imprevistos de flete',
            steelCostWidth: '100%',
            tradCostText: 'Desvíos habituales del 25% al 40%',
            tradCostWidth: '60%'
        },
        oficina: {
            timeSaved: '135 días de renta ganados',
            steelTimeText: '45 días (Puesta en marcha rápida)',
            steelTimeWidth: '25%',
            tradTimeText: '180 días (6 meses de obra comercial)',
            tradTimeWidth: '100%',
            wasteSaved: '88% menos residuos',
            steelWasteText: '< 2% (Montaje seco)',
            steelWasteWidth: '12%',
            tradWasteText: '20% escombros y volquetes continuos',
            tradWasteWidth: '100%',
            energySaved: '-40% en Climatización',
            steelEnergyText: '-40% Climatización estable todo el día',
            steelEnergyWidth: '60%',
            tradEnergyText: 'Alto costo en enfriamiento continuo',
            tradEnergyWidth: '100%',
            costSaved: 'Rápido retorno (ROI)',
            steelCostText: 'Amortización inmediata y facturación ágil',
            steelCostWidth: '100%',
            tradCostText: 'Capital inmovilizado por meses extras',
            tradCostWidth: '55%'
        }
    };

    // 1. Selector de proyectos en simulador
    const simButtons = document.querySelectorAll('.sf-selector-btn');
    if (simButtons.length > 0) {
        simButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const projectKey = btn.getAttribute('data-project');
                if (!sfProjectData[projectKey]) return;

                simButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const data = sfProjectData[projectKey];

                // Plazo
                const elTimeSaved = document.getElementById('simTimeSaved');
                const elSteelTime = document.getElementById('simSteelTime');
                const elBarSteelTime = document.getElementById('simBarSteelTime');
                const elTradTime = document.getElementById('simTradTime');
                const elBarTradTime = document.getElementById('simBarTradTime');
                if (elTimeSaved) elTimeSaved.textContent = data.timeSaved;
                if (elSteelTime) elSteelTime.textContent = data.steelTimeText;
                if (elBarSteelTime) elBarSteelTime.style.width = data.steelTimeWidth;
                if (elTradTime) elTradTime.textContent = data.tradTimeText;
                if (elBarTradTime) elBarTradTime.style.width = data.tradTimeWidth;

                // Desperdicio
                const elWasteSaved = document.getElementById('simWasteSaved');
                const elSteelWaste = document.getElementById('simSteelWaste');
                const elTradWaste = document.getElementById('simTradWaste');
                if (elWasteSaved) elWasteSaved.textContent = data.wasteSaved;
                if (elSteelWaste) elSteelWaste.textContent = data.steelWasteText;
                if (elTradWaste) elTradWaste.textContent = data.tradWasteText;

                // Energía
                const elEnergySaved = document.getElementById('simEnergySaved');
                const elSteelEnergy = document.getElementById('simSteelEnergy');
                const elTradEnergy = document.getElementById('simTradEnergy');
                if (elEnergySaved) elEnergySaved.textContent = data.energySaved;
                if (elSteelEnergy) elSteelEnergy.textContent = data.steelEnergyText;
                if (elTradEnergy) elTradEnergy.textContent = data.tradEnergyText;

                // Costo
                const elCostSaved = document.getElementById('simCostSaved');
                const elSteelCost = document.getElementById('simSteelCost');
                const elTradCost = document.getElementById('simTradCost');
                if (elCostSaved) elCostSaved.textContent = data.costSaved;
                if (elSteelCost) elSteelCost.textContent = data.steelCostText;
                if (elTradCost) elTradCost.textContent = data.tradCostText;
            });
        });
    }

    // 2. Mini-juego de capas técnicas (Toggles)
    const sfToggles = document.querySelectorAll('.sf-toggle-check');
    const sfFeedback = document.getElementById('sfToggleFeedback');

    function updateSfFeedback() {
        if (!sfFeedback) return;
        const features = {};
        sfToggles.forEach(t => {
            features[t.getAttribute('data-feature')] = t.checked;
        });

        const allActive = features.aislacion && features.taller && features.galvanizado;

        if (allActive) {
            sfFeedback.innerHTML = '<i class="ph-light ph-check-circle" style="color:var(--wood);"></i><span><strong>Configuración óptima activa:</strong> Máxima aislación acústica/térmica, cero demoras climáticas y protección garantizada por 100+ años.</span>';
            sfFeedback.style.borderLeftColor = 'var(--wood)';
        } else if (!features.galvanizado) {
            sfFeedback.innerHTML = '<i class="ph-light ph-warning-octagon" style="color:#ef4444;"></i><span><strong style="color:#ef4444;">¡Alerta de corrosión!</strong> Sin recubrimiento Z275, la estructura de acero pierde su inmunidad a la humedad y condensación, degradando la vida útil.</span>';
            sfFeedback.style.borderLeftColor = '#ef4444';
        } else if (!features.aislacion && !features.taller) {
            sfFeedback.innerHTML = '<i class="ph-light ph-warning" style="color:#f59e0b;"></i><span><strong style="color:#f59e0b;">Desempeño comprometido:</strong> Sin lana de vidrio ni fabricación en nave, los costos térmicos se disparan un 45% y la obra queda expuesta a lluvias.</span>';
            sfFeedback.style.borderLeftColor = '#f59e0b';
        } else if (!features.aislacion) {
            sfFeedback.innerHTML = '<i class="ph-light ph-thermometer" style="color:#f59e0b;"></i><span><strong style="color:#f59e0b;">Pérdida de eficiencia:</strong> Sin aislación termoacústica densa, se multiplican las pérdidas de temperatura y el consumo de aire/calefacción.</span>';
            sfFeedback.style.borderLeftColor = '#f59e0b';
        } else if (!features.taller) {
            sfFeedback.innerHTML = '<i class="ph-light ph-clock-countdown" style="color:#f59e0b;"></i><span><strong style="color:#f59e0b;">Mayor tiempo en obra:</strong> Sin prefabricado en planta, el montaje en terreno depende del clima exterior y tarda hasta un 50% más.</span>';
            sfFeedback.style.borderLeftColor = '#f59e0b';
        }
    }

    if (sfToggles.length > 0) {
        sfToggles.forEach(t => t.addEventListener('change', updateSfFeedback));
    }

    // 3. Filtro interactivo de ventajas
    const sfFilterBtns = document.querySelectorAll('.sf-filter-btn');
    const sfCards = document.querySelectorAll('.sf-card');

    if (sfFilterBtns.length > 0 && sfCards.length > 0) {
        sfFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.getAttribute('data-filter');

                sfFilterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                sfCards.forEach(card => {
                    const cardCat = card.getAttribute('data-cat');
                    if (category === 'all' || cardCat === category) {
                        card.classList.remove('is-hidden');
                    } else {
                        card.classList.add('is-hidden');
                    }
                });
            });
        });
    }


    // ==========================================
        // --- SECCIÓN: NUESTROS TRABAJOS (OPTIMIZADO PARA ALTO RENDIMIENTO) ---
    // =====================================================================
    const worksRawData = [
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

    // Enriquecer con rutas optimizadas
    let worksData = worksRawData.map(item => ({
        ...item,
        display: `assets/images/trabajos/display/${item.file}`,
        thumb: `assets/images/trabajos/thumbs/${item.file}`,
        full: `assets/images/trabajos/Trabajos/${item.file}`
    }));

    // Variables de estado
    let worksActiveFilter = 'all';
    let filteredWorks = [...worksData];
    let worksCurrentIndex = 0;
    let worksAutoplayTimer = null;
    let isWorksPlaying = true;
    let mosaicHasRendered = false;
    const worksDuration = 5500; // 5.5s

    const stageImg = document.getElementById('works-stage-img');
    const stagePhase = document.getElementById('works-stage-phase');
    const stageRatio = document.getElementById('works-stage-ratio');
    const stageIndex = document.getElementById('works-stage-index');
    const stageTitle = document.getElementById('works-stage-title');
    const stageDesc = document.getElementById('works-stage-desc');
    const thumbsTrack = document.getElementById('works-thumbs-track');
    const marqueeTrack = document.getElementById('works-marquee-track');
    const mosaicGrid = document.getElementById('works-mosaic-grid');
    const progressBar = document.getElementById('works-progress-bar');
    const playBtn = document.getElementById('works-play-btn');

    // Apertura en Lightbox con imagen en máxima resolución (full)
    window.openWorksLightbox = function(itemRef) {
        let targetItem = null;
        if (typeof itemRef === 'number') {
            targetItem = worksData.find(w => w.id === itemRef);
        } else if (typeof itemRef === 'string') {
            targetItem = worksData.find(w => w.file === itemRef || w.display === itemRef || w.thumb === itemRef || w.full === itemRef || w.id === itemRef);
        }
        if (!targetItem) targetItem = filteredWorks[worksCurrentIndex] || worksData[0];

        window.currentLightboxImages = worksData.map(w => w.full);
        const foundIdx = window.currentLightboxImages.indexOf(targetItem.full);
        window.currentLightboxIndex = foundIdx !== -1 ? foundIdx : 0;
        
        const overlay = document.getElementById('lightbox-overlay');
        const imgEl = document.getElementById('lightbox-img');
        if (overlay && imgEl) {
            imgEl.src = targetItem.full;
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    // 1. Renderizar Miniaturas en Filmstrip (usando thumbs ligeros de ~20KB)
    function renderFilmstrip() {
        if (!thumbsTrack) return;
        thumbsTrack.innerHTML = '';
        const currentItem = filteredWorks[worksCurrentIndex] || worksData[0];
        worksData.forEach(item => {
            const isActive = currentItem && item.id === currentItem.id;
            const thumb = document.createElement('div');
            thumb.className = `works-thumb-item ${isActive ? 'active' : ''}`;
            thumb.setAttribute('data-id', item.id);
            thumb.setAttribute('data-phase', item.phase);
            thumb.title = item.title;
            const badgeText = item.ratio ? item.ratio.split(' ')[0] : '16:9';
            thumb.innerHTML = `
                <img src="${item.thumb || item.display}" alt="${item.title}" loading="lazy" decoding="async">
                <span class="works-thumb-badge">${badgeText}</span>
            `;
            thumb.addEventListener('click', () => {
                selectWorksById(item.id);
            });
            thumbsTrack.appendChild(thumb);
        });
    }
    renderFilmstrip();

    // 2. Renderizar Ticker Infinito (usando thumbs ligeros con decoding async)
    function renderMarquee() {
        if (!marqueeTrack) return;
        const count = worksData.length;
        if (count === 0) {
            marqueeTrack.innerHTML = '';
            return;
        }
        const marqueeSelection = count >= 10
            ? [
                worksData[0], worksData[1], worksData[Math.min(3, count-1)], worksData[Math.min(5, count-1)],
                worksData[Math.min(6, count-1)], worksData[Math.min(7, count-1)], worksData[Math.min(9, count-1)],
                worksData[Math.min(11, count-1)], worksData[Math.min(13, count-1)], worksData[Math.min(17, count-1)]
              ]
            : [...worksData];
        const doubleMarquee = [...marqueeSelection, ...marqueeSelection];
        marqueeTrack.innerHTML = '';
        doubleMarquee.forEach(item => {
            const card = document.createElement('div');
            card.className = `works-marquee-card ${item.ratioClass || 'ratio-16-9'}`;
            card.title = `${item.title} (Clic para ampliar)`;
            card.innerHTML = `
                <img src="${item.thumb || item.display}" alt="${item.title}" loading="lazy" decoding="async">
                <div class="works-marquee-card-overlay">
                    <span class="works-marquee-card-tag">${item.phaseText || item.phase}</span>
                    <h4 class="works-marquee-card-title">${item.title}</h4>
                </div>
            `;
            card.addEventListener('click', () => {
                openWorksLightbox(item);
            });
            marqueeTrack.appendChild(card);
        });
    }
    renderMarquee();

    // 3. Renderizado Diferido del Mosaico (Lazy Rendering: solo cuando el usuario abre la pestaña)
    function renderMosaicOnce(force = false) {
        if ((mosaicHasRendered && !force) || !mosaicGrid) return;
        mosaicHasRendered = true;
        mosaicGrid.innerHTML = '';

        const fragment = document.createDocumentFragment();
        worksData.forEach(item => {
            const tile = document.createElement('div');
            tile.className = `works-mosaic-item ${item.spanClass}`;
            tile.setAttribute('data-id', item.id);
            tile.setAttribute('data-phase', item.phase);
            tile.innerHTML = `
                <img src="${item.thumb}" alt="${item.title}" loading="lazy" decoding="async">
                <div class="works-mosaic-overlay">
                    <span class="works-mosaic-phase"><i class="ph-light ${item.phaseIcon}"></i> ${item.phaseText}</span>
                    <h3 class="works-mosaic-title">${item.title}</h3>
                    <div class="works-mosaic-meta">
                        <span>${item.ratio}</span>
                        <i class="ph-light ph-arrows-out works-mosaic-icon-expand"></i>
                    </div>
                </div>
            `;
            tile.addEventListener('click', () => {
                openWorksLightbox(item);
            });
            fragment.appendChild(tile);
        });
        mosaicGrid.appendChild(fragment);

        // Aplicar filtro si ya había uno activo
        if (worksActiveFilter !== 'all') {
            applyMosaicFilter(worksActiveFilter);
        }
    }

    function applyMosaicFilter(filter) {
        if (!mosaicGrid) return;
        mosaicGrid.querySelectorAll('.works-mosaic-item').forEach(tile => {
            const phase = tile.getAttribute('data-phase');
            if (filter === 'all' || phase === filter) {
                tile.classList.remove('hidden-by-filter');
            } else {
                tile.classList.add('hidden-by-filter');
            }
        });
    }

    // 4. Actualizar Estado del Escenario Principal (usa display version ~180KB)
    function updateWorksStage() {
        if (!filteredWorks.length) return;
        if (worksCurrentIndex >= filteredWorks.length) worksCurrentIndex = 0;
        if (worksCurrentIndex < 0) worksCurrentIndex = filteredWorks.length - 1;

        const item = filteredWorks[worksCurrentIndex];

        if (stageImg) {
            stageImg.decoding = 'async';
            stageImg.src = item.display;
            stageImg.alt = item.title;
        }

        if (stagePhase) {
            stagePhase.innerHTML = `<i class="ph-light ${item.phaseIcon}"></i> ${item.phaseText}`;
        }

        if (stageRatio) {
            stageRatio.textContent = item.ratio;
        }

        if (stageIndex) {
            const currentNum = (worksCurrentIndex + 1).toString().padStart(2, '0');
            const totalNum = filteredWorks.length.toString().padStart(2, '0');
            stageIndex.textContent = `${currentNum} / ${totalNum}`;
        }

        if (stageTitle) {
            stageTitle.textContent = item.title;
        }

        if (stageDesc) {
            stageDesc.textContent = item.desc;
        }

        // Desplazamiento exclusivo dentro de la tira de miniaturas
        if (thumbsTrack) {
            thumbsTrack.querySelectorAll('.works-thumb-item').forEach(thumb => {
                const thumbId = parseInt(thumb.getAttribute('data-id'), 10);
                if (thumbId === item.id) {
                    thumb.classList.add('active');
                    const thumbOffsetLeft = thumb.offsetLeft;
                    const thumbWidth = thumb.offsetWidth;
                    const trackWidth = thumbsTrack.clientWidth;
                    thumbsTrack.scrollTo({
                        left: thumbOffsetLeft - (trackWidth / 2) + (thumbWidth / 2),
                        behavior: 'smooth'
                    });
                } else {
                    thumb.classList.remove('active');
                }
            });
        }
    }

    function selectWorksById(id) {
        const foundIdx = filteredWorks.findIndex(w => w.id === id);
        if (foundIdx !== -1) {
            worksCurrentIndex = foundIdx;
        } else {
            resetFilterToAll();
            worksCurrentIndex = worksData.findIndex(w => w.id === id);
        }
        updateWorksStage();
        resetAutoplay();
    }

    function worksNext() {
        if (!filteredWorks.length) return;
        worksCurrentIndex = (worksCurrentIndex + 1) % filteredWorks.length;
        updateWorksStage();
        resetAutoplay();
    }

    function worksPrev() {
        if (!filteredWorks.length) return;
        worksCurrentIndex = (worksCurrentIndex - 1 + filteredWorks.length) % filteredWorks.length;
        updateWorksStage();
        resetAutoplay();
    }

    document.getElementById('works-next-btn')?.addEventListener('click', worksNext);
    document.getElementById('works-prev-btn')?.addEventListener('click', worksPrev);

    document.getElementById('works-expand-btn')?.addEventListener('click', () => {
        if (filteredWorks[worksCurrentIndex]) {
            openWorksLightbox(filteredWorks[worksCurrentIndex]);
        }
    });

    stageImg?.addEventListener('click', () => {
        if (filteredWorks[worksCurrentIndex]) {
            openWorksLightbox(filteredWorks[worksCurrentIndex]);
        }
    });

    document.getElementById('thumbs-scroll-left')?.addEventListener('click', () => {
        thumbsTrack?.scrollBy({ left: -260, behavior: 'smooth' });
    });
    document.getElementById('thumbs-scroll-right')?.addEventListener('click', () => {
        thumbsTrack?.scrollBy({ left: 260, behavior: 'smooth' });
    });

    // Control de Autoplay Acelerado por Hardware (transición CSS nativa en vez de loop JS)
    function startAutoplay() {
        if (!isWorksPlaying) return;
        stopAutoplay();

        if (progressBar) {
            progressBar.classList.remove('is-animating');
            progressBar.style.width = '0%';
            void progressBar.offsetWidth; // forzar reflow
            progressBar.classList.add('is-animating');
        }

        worksAutoplayTimer = setTimeout(() => {
            worksNext();
        }, worksDuration);
    }

    function stopAutoplay() {
        if (worksAutoplayTimer) {
            clearTimeout(worksAutoplayTimer);
            worksAutoplayTimer = null;
        }
        if (progressBar) {
            const computedWidth = window.getComputedStyle(progressBar).width;
            progressBar.classList.remove('is-animating');
            progressBar.style.width = computedWidth;
        }
    }

    function resetAutoplay() {
        if (isWorksPlaying) {
            startAutoplay();
        } else if (progressBar) {
            progressBar.classList.remove('is-animating');
            progressBar.style.width = '0%';
        }
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            isWorksPlaying = !isWorksPlaying;
            const icon = playBtn.querySelector('i');
            if (isWorksPlaying) {
                if (icon) { icon.classList.remove('ph-play'); icon.classList.add('ph-pause'); }
                playBtn.setAttribute('aria-label', 'Pausar');
                startAutoplay();
            } else {
                if (icon) { icon.classList.remove('ph-pause'); icon.classList.add('ph-play'); }
                playBtn.setAttribute('aria-label', 'Reproducir');
                stopAutoplay();
                if (progressBar) {
                    progressBar.classList.remove('is-animating');
                    progressBar.style.width = '0%';
                }
            }
        });
    }

    const stageViewport = document.getElementById('works-stage-viewport');
    if (stageViewport) {
        stageViewport.addEventListener('mouseenter', () => {
            if (isWorksPlaying) stopAutoplay();
        });
        stageViewport.addEventListener('mouseleave', () => {
            if (isWorksPlaying) startAutoplay();
        });

        let sTouchStartX = 0;
        let sTouchEndX = 0;
        stageViewport.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                sTouchStartX = e.touches[0].clientX;
                sTouchEndX = sTouchStartX;
            }
        }, { passive: true });
        stageViewport.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                sTouchEndX = e.touches[0].clientX;
            }
        }, { passive: true });
        stageViewport.addEventListener('touchend', () => {
            const diff = sTouchEndX - sTouchStartX;
            if (Math.abs(diff) > 40) {
                if (diff < 0) { worksNext(); } else { worksPrev(); }
            }
        }, { passive: true });
    }

    // Selector de Modalidad (Carrusel vs Mosaico con Lazy Render)
    const viewBtns = document.querySelectorAll('.works-view-btn');
    const panelCarousel = document.getElementById('works-panel-carousel');
    const panelMosaic = document.getElementById('works-panel-mosaic');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (view === 'carousel') {
                panelCarousel?.classList.add('active');
                panelMosaic?.classList.remove('active');
                startAutoplay();
            } else {
                panelCarousel?.classList.remove('active');
                panelMosaic?.classList.add('active');
                stopAutoplay();
                renderMosaicOnce(); // Solo renderiza al abrir la pestaña
            }
        });
    });

    // Filtros por Etapa de Trabajo
    const filterBtns = document.querySelectorAll('.works-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            worksActiveFilter = filter;

            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (filter === 'all') {
                filteredWorks = [...worksData];
            } else {
                filteredWorks = worksData.filter(w => w.phase === filter);
            }

            worksCurrentIndex = 0;
            updateWorksStage();
            resetAutoplay();

            if (thumbsTrack) {
                thumbsTrack.querySelectorAll('.works-thumb-item').forEach(thumb => {
                    const phase = thumb.getAttribute('data-phase');
                    if (filter === 'all' || phase === filter) {
                        thumb.style.display = 'block';
                    } else {
                        thumb.style.display = 'none';
                    }
                });
            }

            if (mosaicHasRendered) {
                applyMosaicFilter(filter);
            }
        });
    });

    function resetFilterToAll() {
        worksActiveFilter = 'all';
        filteredWorks = [...worksData];
        filterBtns.forEach(b => {
            if (b.getAttribute('data-filter') === 'all') b.classList.add('active');
            else b.classList.remove('active');
        });
        thumbsTrack?.querySelectorAll('.works-thumb-item').forEach(t => t.style.display = 'block');
        if (mosaicHasRendered) {
            applyMosaicFilter('all');
        }
    }

    // Inicializar estado del carrusel
    updateWorksStage();

    // Solo activar autoplay cuando la sección sea visible en pantalla
    const worksSectionEl = document.getElementById('trabajos');
    if ('IntersectionObserver' in window && worksSectionEl) {
        const worksObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && isWorksPlaying) {
                    startAutoplay();
                } else {
                    stopAutoplay();
                }
            });
        }, { threshold: 0.15 });
        worksObserver.observe(worksSectionEl);
    } else {
        startAutoplay();
    }

    // =========================================================================
    // --- SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE FIRESTORE (CMS NÖRDIKA) ---
    // =========================================================================
    try {
        if (typeof firebase !== 'undefined' && window.firebaseConfig) {
            if (!firebase.apps.length) {
                firebase.initializeApp(window.firebaseConfig);
            }
            const firestoreDb = firebase.firestore();

            // 1. Sincronizar Hero Principal
            firestoreDb.collection('config').doc('hero').onSnapshot(doc => {
                if (!doc.exists) return;
                const data = doc.data();
                if (Array.isArray(data.slides)) {
                    slides.forEach((slide, idx) => {
                        if (data.slides[idx] && data.slides[idx].image) {
                            slide.style.backgroundImage = `url('${data.slides[idx].image}')`;
                        }
                    });
                    data.slides.forEach((s, idx) => {
                        if (s && s.caption) slideCaptions[idx] = s.caption;
                    });
                    if (captionEl && slideCaptions[currentSlide]) {
                        captionEl.textContent = slideCaptions[currentSlide];
                    }
                }
            }, err => console.log('Hero fallback a HTML estático:', err));

            // 2. Sincronizar Módulos y Precios (20m, 40m, 60m)
            firestoreDb.collection('modulos').onSnapshot(snapshot => {
                if (snapshot.empty) return;
                snapshot.forEach(doc => {
                    const modId = doc.id; // '20m', '40m', '60m'
                    const mData = doc.data();

                    // Actualizar tarjeta del catálogo
                    const card = document.querySelector(`.module-card[data-target="modal-${modId}"]`);
                    if (card) {
                        const planBtns = card.querySelectorAll('.plan-btn');
                        if (planBtns.length >= 3) {
                            if (mData.priceBasico) planBtns[0].setAttribute('data-price', mData.priceBasico);
                            if (mData.priceStandard) planBtns[1].setAttribute('data-price', mData.priceStandard);
                            if (mData.pricePremium) planBtns[2].setAttribute('data-price', mData.pricePremium);
                        }

                        const activeBadge = card.querySelector('.plan-btn.active');
                        const priceDisplay = card.querySelector('.price-display');
                        if (activeBadge && priceDisplay) {
                            priceDisplay.textContent = `Desde ${activeBadge.getAttribute('data-price')}`;
                        }

                        const cardImg = card.querySelector('.module-img.img-real');
                        if (cardImg && mData.tarjetaImg) cardImg.src = mData.tarjetaImg;
                        if (mData.modalImg) card.setAttribute('data-modal-img', mData.modalImg);
                    }

                    // Actualizar modal del módulo
                    const modal = document.getElementById(`modal-${modId}`);
                    if (modal) {
                        const modalMainImg = modal.querySelector('.modal-img');
                        if (modalMainImg && mData.modalImg) modalMainImg.src = mData.modalImg;

                        const modalPrice = modal.querySelector('.modal-price');
                        if (modalPrice && mData.priceStandard) modalPrice.textContent = mData.priceStandard;

                        if (Array.isArray(mData.thumbnails)) {
                            const thumbImgs = modal.querySelectorAll('.modal-thumbnails .modal-thumb');
                            thumbImgs.forEach((tImg, idx) => {
                                if (mData.thumbnails[idx]) tImg.src = mData.thumbnails[idx];
                            });
                        }
                    }

                    // REGLA DE NEGOCIO OBLIGATORIA: Cross-sync con Especificaciones Nivel Standard
                    if (modId === '20m' && mData.priceStandard) {
                        const specPriceEl = document.querySelector('#especificaciones .price-value') || document.querySelector('.price-value');
                        if (specPriceEl) {
                            specPriceEl.textContent = mData.priceStandard.endsWith('.-') ? mData.priceStandard : `${mData.priceStandard}.-`;
                        }
                    }
                });
            }, err => console.log('Módulos fallback a HTML estático:', err));

            // Sincronización explícita de precio Standard desde config/sync
            firestoreDb.collection('config').doc('sync').onSnapshot(doc => {
                if (!doc.exists) return;
                const d = doc.data();
                if (d.specsStandardPrice) {
                    const specPriceEl = document.querySelector('#especificaciones .price-value') || document.querySelector('.price-value');
                    if (specPriceEl) {
                        specPriceEl.textContent = d.specsStandardPrice.endsWith('.-') ? d.specsStandardPrice : `${d.specsStandardPrice}.-`;
                    }
                }
            }, () => {});

            // 3. Sincronizar Nuestros Trabajos
            const phaseIcons = {
                'montaje': 'ph-crane',
                'estructura': 'ph-frame-corners',
                'envolvente': 'ph-shield-check',
                'finalizadas': 'ph-house-line'
            };

            firestoreDb.collection('trabajos').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
                if (snapshot.empty) return; // Mantener 29 fotos estáticas como fallback

                const dynamicWorks = [];
                snapshot.forEach(doc => {
                    const d = doc.data();
                    dynamicWorks.push({
                        id: doc.id,
                        phase: d.phase || 'estructura',
                        phaseText: d.phaseText || d.phase,
                        phaseIcon: phaseIcons[d.phase] || 'ph-cube',
                        ratio: d.ratio || '16:9 Panorámica',
                        ratioClass: d.ratioClass || 'ratio-16-9',
                        spanClass: d.spanClass || 'span-2-col',
                        title: d.title || 'Obra Nördika',
                        desc: d.desc || '',
                        display: d.display || d.full || d.thumb,
                        thumb: d.thumb || d.display,
                        full: d.full || d.display
                    });
                });

                if (dynamicWorks.length > 0) {
                    worksData = dynamicWorks;
                    filteredWorks = worksActiveFilter === 'all' 
                        ? [...worksData] 
                        : worksData.filter(w => w.phase === worksActiveFilter);
                    
                    renderFilmstrip();
                    renderMarquee();
                    if (mosaicHasRendered) {
                        renderMosaicOnce(true);
                    }
                    updateWorksStage();
                }
            }, err => console.log('Trabajos fallback a catálogo local:', err));

            // 4. Sincronizar Preguntas Frecuentes
            firestoreDb.collection('faqs').orderBy('order', 'asc').onSnapshot(snapshot => {
                if (snapshot.empty) return; // Mantener 6 preguntas estáticas
                const faqContainer = document.querySelector('#faq .faq-container');
                if (!faqContainer) return;

                faqContainer.innerHTML = '';
                snapshot.forEach(doc => {
                    const faq = doc.data();
                    const item = document.createElement('div');
                    item.className = 'faq-item';

                    let itemsHtml = '';
                    if (Array.isArray(faq.items) && faq.items.length > 0) {
                        itemsHtml = `
                            <ul class="faq-list">
                                ${faq.items.map(it => {
                                    const idxColon = it.indexOf(':');
                                    if (idxColon !== -1) {
                                        const title = it.substring(0, idxColon);
                                        const rest = it.substring(idxColon + 1);
                                        return `<li><strong class="faq-subheading">${title}:</strong>${rest}</li>`;
                                    }
                                    return `<li>${it}</li>`;
                                }).join('')}
                            </ul>
                        `;
                    }

                    item.innerHTML = `
                        <button class="faq-question tech-font">
                            ${faq.question}
                            <span class="faq-icon">+</span>
                        </button>
                        <div class="faq-answer">
                            <div class="faq-answer-content">
                                <p class="faq-intro">${faq.intro || ''}</p>
                                ${itemsHtml}
                            </div>
                        </div>
                    `;

                    const questionBtn = item.querySelector('.faq-question');
                    const icon = item.querySelector('.faq-icon');
                    questionBtn.addEventListener('click', () => {
                        const isActive = item.classList.contains('active');
                        faqContainer.querySelectorAll('.faq-item').forEach(other => {
                            other.classList.remove('active');
                            const otherIcon = other.querySelector('.faq-icon');
                            if (otherIcon) otherIcon.textContent = '+';
                        });
                        if (!isActive) {
                            item.classList.add('active');
                            icon.textContent = '-';
                        }
                    });

                    faqContainer.appendChild(item);
                });
            }, err => console.log('FAQs fallback a HTML estático:', err));
        }
    } catch (e) {
        console.error('Error inicializando Firestore sync en landing:', e);
    }

});
