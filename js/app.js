document.addEventListener('DOMContentLoaded', () => {
    // Architecture Layer Data
    const layerData = {
        presentation: {
            title: "Presentación (Thymeleaf / Client)",
            desc: "Representa el frontend renderizado por el servidor mediante plantillas Thymeleaf para el panel administrativo, y los clientes REST (aplicación móvil/web externos).",
            strengths: ["Uso estructurado de vistas responsive", "Diferenciación de roles mediante plantillas"],
            errors: ["Los controladores mezclan lógica de presentación con consultas directas a base de datos"],
            files: ["UsuarioController.java", "ClinicaController.java", "HomeController.java"]
        },
        controller: {
            title: "Capa Controller (Controladores REST & Web)",
            desc: "Encargada de mapear las peticiones HTTP (GET, POST, PUT, DELETE), recibir DTOs y delegar el flujo de datos. Sin embargo, sufre de acoplamiento severo y gran tamaño.",
            strengths: ["Endpoints diferenciados para web (/...) y móvil (/api/...)", "Soporte para múltiples formatos"],
            errors: ["Inyección directa de repositorios, saltándose la capa de negocio Service", "UsuarioController.java tiene 2,016 líneas y ClinicaController.java tiene 1,211 líneas", "Violación severa de Single Responsibility Principle (SRP)"],
            files: ["UsuarioController.java", "ClinicaController.java", "ApiCitaController.java", "ApiSystemController.java"]
        },
        service: {
            title: "Capa Service (Lógica de Negocio)",
            desc: "Capa intermedia donde debe residir la lógica empresarial, transformaciones DTO, integraciones de terceros (Twilio, Stripe, Groq, Weka) y flujos transaccionales.",
            strengths: ["Integraciones completas con servicios de notificaciones y machine learning", "Desacoplada en interfaces e implementaciones (Impl)"],
            errors: ["Esta capa es evadida (bypass) en los flujos principales por inyección directa de repositorios en controladores"],
            files: ["UsuarioService.java", "ClinicaService.java", "UsuarioServiceImpl.java"]
        },
        repository: {
            title: "Capa Repository (Acceso a Datos)",
            desc: "Interfaces que extienden MongoRepository de Spring Data MongoDB, encargadas de realizar queries y persistencia en la base de datos.",
            strengths: ["Mapeo NoSQL robusto mediante Spring Data", "Consultas nativas declarativas de MongoDB"],
            errors: ["Inyectada directamente en la capa de vista/controlador, acoplando el almacenamiento con la presentación"],
            files: ["UsuarioRepository.java", "CitaRepository.java", "ClinicaRepository.java", "MascotaRepository.java"]
        },
        mongodb: {
            title: "Base de Datos MongoDB",
            desc: "Motor de base de datos NoSQL utilizado para almacenar colecciones de usuarios, mascotas, historiales clínicos, citas, clínicas, exámenes y anuncios globales.",
            strengths: ["Modelo de documentos flexible para datos clínicos variables", "Alta performance en lecturas/escrituras"],
            errors: ["NoSQL sin perfiles aislados en tests locales, causando fallos de conexión por requerir puerto 27017 activo"],
            files: ["DataSeeder.java (Carga inicial acoplada)"]
        }
    };

    // Findings Data
    const findings = [
        {
            id: 1,
            title: "Bypass Directo de Capa Service en Controlador de Usuarios",
            severity: "alta",
            category: "arquitectura",
            file: "UsuarioController.java",
            class: "UsuarioController",
            method: "Declaración de campos @Autowired (Líneas 80-88)",
            problem: "La clase UsuarioController inyecta directamente 5 interfaces de repositorio (UsuarioRepository, CitaRepository, ResenaRepository, VisitaRepository, AnuncioGlobalRepository), saltándose la capa intermedia de lógica de negocio (Service).",
            evidence: "@Autowired\nprivate UsuarioRepository usuarioRepository;\n@Autowired\nprivate CitaRepository citaRepository;\n// Inyección directa sin intermediario Service.",
            impact: "Fuerte acoplamiento físico entre la capa de presentación y la base de datos MongoDB. Si cambia la estructura del modelo o el motor de persistencia, se deben refactorizar los controladores de vistas Thymeleaf.",
            recommendation: "Refactorizar UsuarioController para interactuar únicamente con interfaces de la capa de servicios (como UsuarioService), encapsulando la consulta al repositorio en el módulo de servicio correspondiente."
        },
        {
            id: 2,
            title: "Acoplamiento Directo en Controlador de Clínicas",
            severity: "alta",
            category: "arquitectura",
            file: "ClinicaController.java",
            class: "ClinicaController",
            method: "Inyección de dependencias (Líneas 66-98)",
            problem: "ClinicaController inyecta y utiliza directamente 8 interfaces de repositorio de MongoDB para diversas operaciones de negocio.",
            evidence: "Inyección de ClinicaRepository, UsuarioRepository, VisitaRepository, MascotaRepository, CitaRepository, ProductoRepository, ExamenLaboratorioRepository, AnuncioGlobalRepository.",
            impact: "Disminuye la cohesión y rompe la separación de responsabilidades. Convierte el controlador en un orquestador transaccional y físico.",
            recommendation: "Centralizar los flujos en ClinicaService e inyectar solo la interfaz del servicio en el controlador."
        },
        {
            id: 3,
            title: "Controladores Excesivamente Voluminosos (Violación de SRP)",
            severity: "media",
            category: "arquitectura",
            file: "UsuarioController.java, ClinicaController.java",
            class: "UsuarioController, ClinicaController",
            method: "Clases completas",
            problem: "UsuarioController posee un tamaño de 2,016 líneas de código y ClinicaController posee 1,211 líneas. Concentran lógica de formato de texto, conversión a DTOs y validación de negocio.",
            evidence: "Tamaño físico de archivos detectado por herramientas estáticas del compilador.",
            impact: "Dificulta severamente la mantenibilidad, lectura, testing unitario y control de versiones.",
            recommendation: "Delegar lógica utilitaria y de negocio a servicios auxiliares y usar convertidores/mapeadores dedicados para las transformaciones DTO."
        },
        {
            id: 4,
            title: "Deshabilitación Global de Protección CSRF",
            severity: "alta",
            category: "seguridad",
            file: "SecurityConfig.java",
            class: "SecurityConfig",
            method: "filterChain (Línea 53)",
            problem: "Se desactiva globalmente la protección Cross-Site Request Forgery (.csrf(csrf -> csrf.disable())) para la aplicación web.",
            evidence: "SecurityConfig.java:\n.csrf(csrf -> csrf.disable())",
            impact: "Vulnerabilidad crítica. Dado que la aplicación web Thymeleaf gestiona roles administrativos y de personal clínico mediante sesiones basadas en cookies tradicionales (JSESSIONID), un atacante puede inducir a un usuario autenticado a realizar acciones no autorizadas sin su consentimiento.",
            recommendation: "Habilitar la protección CSRF para peticiones procesadas mediante sesiones web tradicionales (Thymeleaf), permitiendo excepciones únicamente para endpoints REST stateless que utilicen autenticación basada en tokens."
        },
        {
            id: 5,
            title: "Credencial y PIN de Monitoreo Hardcodeados en Endpoint Público",
            severity: "alta",
            category: "seguridad",
            file: "ApiSystemController.java, SecurityConfig.java",
            class: "ApiSystemController, SecurityConfig",
            method: "verifyIpPin (Línea 121) / Configuración de matchers (Línea 98)",
            problem: "La verificación de red de dispositivos cliente compara el PIN de entrada directamente con una credencial de verificación estática escrita en el código de producción. Además, la ruta '/api/**' está expuesta de manera pública.",
            evidence: "if (\"xxxx\".equals(pin)) { // Comparación estática directa en código\n    deviceTracker.verifyIpPin(request.getRemoteAddr());\n}\n\nSecurityConfig.java:\n.requestMatchers(..., \"/api/**\").permitAll()",
            impact: "Cualquier atacante externo que descubra el PIN estático por ingeniería inversa o análisis de rutas puede verificar y autorizar el acceso de su dirección IP a endpoints restringidos, eludiendo la protección de red global.",
            recommendation: "Externalizar la credencial a una propiedad configurable e inyectada segura (mediante @Value), y restringir el acceso a los endpoints administrativos del subpaquete /api/system/** a roles autenticados de administrador."
        },
        {
            id: 6,
            title: "CORS Configurado con Comodín Universal Permisivo",
            severity: "alta",
            category: "seguridad",
            file: "WebConfig.java, ApiCitaController.java, ApiMascotaController.java",
            class: "WebConfig, ApiCitaController, ApiMascotaController",
            method: "WebConfig.java (Línea 22), @CrossOrigin",
            problem: "Se asigna origen permitido global (*) a los endpoints, y controladores REST individuales replican explícitamente la anotación @CrossOrigin(origins = \"*\").",
            evidence: "registry.addMapping(\"/**\").allowedOrigins(\"*\")\n@CrossOrigin(origins = \"*\") en controladores de APIs.",
            impact: "Permite que cualquier aplicación web externa consulte los datos privados de los clientes, mascotas e historiales de ClínicaApp desde un navegador web.",
            recommendation: "Definir una lista blanca estricta con los hosts autorizados de la organización para consumir los recursos de la API REST."
        },
        {
            id: 7,
            title: "Ausencia de Perfiles de Configuración del Entorno",
            severity: "media",
            category: "configuracion",
            file: "application.properties, application.yml",
            class: "Configuración global",
            method: "N/A",
            problem: "No se implementa la separación física de archivos de configuración por entornos de desarrollo, pruebas o producción.",
            evidence: "Falta de application-dev.properties, application-test.properties u homólogos en el directorio src/main/resources.",
            impact: "Impide configurar comportamientos aislados de manera limpia, obligando a modificar y compartir strings de conexión locales en archivos unificados.",
            recommendation: "Configurar perfiles utilizando el estándar de Spring Boot (ej: @ActiveProfiles(\"test\") y perfiles específicos en resources)."
        },
        {
            id: 8,
            title: "Falta de Mecanismo REST de Control de Excepciones",
            severity: "alta",
            category: "errores",
            file: "GlobalControllerAdvice.java",
            class: "GlobalControllerAdvice",
            method: "Ausencia de anotaciones @ExceptionHandler",
            problem: "El único ControllerAdvice del sistema no procesa excepciones y solo rellena atributos del modelo HTML de Thymeleaf mediante @ModelAttribute.",
            evidence: "GlobalControllerAdvice.java contiene el método addNotificationsToModel anotado con @ModelAttribute, pero carece de interceptores @ExceptionHandler.",
            impact: "Al fallar flujos de la API (como ids no encontrados o argumentos inválidos), el servidor no traduce el error y expone stacktraces detallados o Whitelabel Error Pages de Spring Boot al cliente REST.",
            recommendation: "Implementar una clase centralizada anotada con @RestControllerAdvice que capture excepciones y retorne respuestas JSON con formato uniforme."
        },
        {
            id: 9,
            title: "Ausencia de Validaciones Declarativas en DTOs y Modelos",
            severity: "media",
            category: "errores",
            file: "Cita.java, UsuarioRegistroDTO.java",
            class: "Cita, UsuarioRegistroDTO",
            method: "N/A",
            problem: "Las estructuras no poseen validaciones automáticas mediante Bean Validation (jakarta.validation.constraints).",
            evidence: "Modelos y DTOs sin anotaciones de restricción (@NotNull, @NotBlank, @Size, @Email).",
            impact: "Peticiones REST mal estructuradas o con datos vacíos son procesadas y enviadas a MongoDB, forzando a validar imperativa y redundantemente en los controladores.",
            recommendation: "Añadir dependencias de Bean Validation en pom.xml, anotar campos críticos e invocar @Valid en firmas de métodos del controlador."
        },
        {
            id: 10,
            title: "Documentación de API Inexistente",
            severity: "baja",
            category: "documentacion",
            file: "pom.xml",
            class: "N/A",
            method: "N/A",
            problem: "No se registran dependencias de OpenAPI/Swagger en el proyecto, ni configuraciones descriptivas de contratos REST.",
            evidence: "Ausencia de dependencias springdoc-openapi-starter-webmvc-ui en pom.xml.",
            impact: "Los desarrolladores clientes deben deducir los esquemas de payloads y endpoints analizando directamente el código fuente Java.",
            recommendation: "Integrar la dependencia de Springdoc OpenAPI para autogenerar la consola interactiva Swagger UI."
        },
        {
            id: 11,
            title: "Fallo Crítico en Fase de Test (Acoplamiento de Base de Datos)",
            severity: "alta",
            category: "testing",
            file: "ClinicaappApplicationTests.java, DataSeeder.java",
            class: "ClinicaappApplicationTests",
            method: "contextLoads()",
            problem: "La compilación mediante 'mvnw test' provoca un BUILD FAILURE general debido a que el test de contexto de Spring arranca la aplicación e inicializa el DataSeeder, el cual intenta conectarse a un puerto de MongoDB activo en el entorno de testing local.",
            evidence: "bash output:\nCaused by: com.mongodb.MongoTimeoutException: Timed out after 30000 ms while waiting for a server that matches ReadPreferenceServerSelector",
            impact: "Impide la integración continua y el testeo automatizado de la lógica del sistema en entornos donde no existe un motor de MongoDB levantado.",
            recommendation: "Configurar un perfil activo de pruebas ('test'), y simular (mockear) la base de datos o implementar una base MongoDB embebida para pruebas aisladas."
        }
    ];

    // Sidebar navigation and active states
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');
    const sidebar = document.querySelector('aside.sidebar');
    const menuToggle = document.getElementById('menuToggle');

    // Menu toggle for mobile
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-open');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('mobile-open')) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('mobile-open');
                }
            }
        });
    }

    // Close mobile menu when nav-link clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.remove('mobile-open');
            }
        });
    });

    // Scroll Spy active link update
    const scrollSpy = () => {
        let currentSectionId = '';
        const scrollPosition = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', scrollSpy);

    // Fade-in sections on scroll
    const faders = document.querySelectorAll('.fade-in-section');
    const appearOnScrollOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        });
    }, appearOnScrollOptions);

    faders.forEach(fader => {
        appearOnScroll.observe(fader);
    });

    // Layer Interactions (Architecture)
    const layerBoxes = document.querySelectorAll('.layer-box');
    const layerDetailsContent = document.getElementById('layerDetailsContent');
    const layerDetailsPlaceholder = document.getElementById('layerDetailsPlaceholder');

    layerBoxes.forEach(box => {
        box.addEventListener('click', () => {
            // Remove active class from all boxes
            layerBoxes.forEach(b => b.classList.remove('active'));
            // Add active class to selected
            box.classList.add('active');

            const layerKey = box.getAttribute('data-layer');
            const data = layerData[layerKey];

            if (data) {
                layerDetailsPlaceholder.style.display = 'none';
                layerDetailsContent.style.display = 'block';

                let strengthsHtml = '';
                data.strengths.forEach(s => strengthsHtml += `<li>${s}</li>`);

                let errorsHtml = '';
                data.errors.forEach(e => errorsHtml += `<li>${e}</li>`);

                let filesHtml = '';
                data.files.forEach(f => filesHtml += `<li>${f}</li>`);

                layerDetailsContent.innerHTML = `
                    <h3>${data.title}</h3>
                    <p class="desc">${data.desc}</p>
                    
                    <div class="layer-details-list strengths">
                        <h4>Fortalezas e Implementación</h4>
                        <ul>${strengthsHtml}</ul>
                    </div>
                    
                    <div class="layer-details-list errors">
                        <h4>Problemas y Hallazgos</h4>
                        <ul>${errorsHtml}</ul>
                    </div>
                    
                    <div class="layer-details-list">
                        <h4>Archivos y Clases Relevantes</h4>
                        <ul>${filesHtml}</ul>
                    </div>
                `;
            }
        });
    });

    // Findings Filter & Render
    const filterButtons = document.querySelectorAll('.filter-btn');
    const findingsGrid = document.getElementById('findingsGrid');

    const renderFindings = (categoryFilter) => {
        findingsGrid.innerHTML = '';
        
        let filteredFindings = findings;
        if (categoryFilter !== 'todos') {
            if (['alta', 'media', 'baja'].includes(categoryFilter)) {
                filteredFindings = findings.filter(f => f.severity === categoryFilter);
            } else {
                filteredFindings = findings.filter(f => f.category === categoryFilter);
            }
        }

        filteredFindings.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card finding-card';
            card.setAttribute('data-id', item.id);
            
            card.innerHTML = `
                <div class="finding-card-header">
                    <span class="severity-badge ${item.severity}">${item.severity}</span>
                    <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">${item.category}</span>
                </div>
                <h3 class="finding-title">${item.title}</h3>
                <p class="finding-desc">${item.problem}</p>
                <div class="finding-footer">
                    <span class="file">${item.file}</span>
                    <span>Ver Detalles →</span>
                </div>
            `;

            card.addEventListener('click', () => openFindingModal(item));
            findingsGrid.appendChild(card);
        });
    };

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderFindings(btn.getAttribute('data-filter'));
        });
    });

    // Initial render of findings
    renderFindings('todos');

    // Modal Control
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const modalBody = document.getElementById('modalBody');

    const openFindingModal = (item) => {
        modalBody.innerHTML = `
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
                <span class="severity-badge ${item.severity}">${item.severity}</span>
                <span class="severity-badge" style="background-color: var(--bg-badge); color: var(--accent-blue); border-color: rgba(56, 189, 248, 0.2);">${item.category}</span>
            </div>
            
            <div class="modal-row">
                <div class="modal-label">Archivo de Origen / Ubicación</div>
                <div class="modal-value" style="font-family: var(--font-mono); color: var(--accent-blue);">${item.file}</div>
            </div>
            
            <div class="modal-row">
                <div class="modal-label">Clase / Elemento</div>
                <div class="modal-value" style="font-family: var(--font-mono);">${item.class}</div>
            </div>
            
            <div class="modal-row">
                <div class="modal-label">Método / Línea Detectada</div>
                <div class="modal-value" style="font-family: var(--font-mono); color: var(--text-secondary);">${item.method}</div>
            </div>
            
            <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 1.5rem 0;">
            
            <div class="modal-row">
                <div class="modal-label">Detalle del Problema</div>
                <div class="modal-value">${item.problem}</div>
            </div>
            
            <div class="modal-row">
                <div class="modal-label">Evidencia Técnica</div>
                <div class="modal-value code-val">${item.evidence.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="modal-row">
                <div class="modal-label">Impacto Detectado</div>
                <div class="modal-value" style="color: var(--text-secondary);">${item.impact}</div>
            </div>
            
            <div class="modal-row">
                <div class="modal-label">Recomendación de Refactorización</div>
                <div class="modal-value" style="border-left: 3px solid var(--accent-green); padding-left: 1rem; color: #e2e8f0; font-style: italic;">
                    ${item.recommendation}
                </div>
            </div>
        `;
        modalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        modalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    // Image error fallback helper
    window.handleImageError = (img) => {
        img.style.display = 'none';
        const fallback = img.nextElementSibling;
        if (fallback) {
            fallback.style.display = 'flex';
        }
    };

    // Evidence Gallery Data
    const evidenceGalleryData = [
        {
            title: "Evidencia 01 — Estructura del proyecto",
            desc: "Estructura real del árbol de directorios y paquetes del backend mostrando los controladores, servicios, repositorios, configuraciones y modelos del paquete com.clinicaapp.",
            file: "src/main/java/com/clinicaapp",
            category: "Arquitectura",
            imagePath: "assets/evidencias/01-estructura-proyecto.jpg",
            fallbackTitle: "IDE Project Tree",
            fallbackText: "Mapea el árbol lateral de directorios de tu IDE que muestre las carpetas principales (controller, service, repository, config, model/dto)."
        },
        {
            title: "Evidencia 02 — Bypass de Service",
            desc: "Declaraciones de inyección directa de interfaces Repository mediante la anotación @Autowired en UsuarioController.java y ClinicaController.java, saltándose la capa intermedia Service.",
            file: "UsuarioController.java (Líneas 80-88) / ClinicaController.java (Líneas 66-98)",
            category: "Arquitectura",
            imagePath: "assets/evidencias/02-bypass-service.jpg",
            fallbackTitle: "UsuarioController.java",
            fallbackText: "Captura el fragmento de código de UsuarioController.java o ClinicaController.java donde se inyectan campos de Repository sin usar Service."
        },
        {
            title: "Evidencia 03 — Credencial estática detectada",
            desc: "Validación condicional del PIN de red hardcodeado en la lógica de ApiSystemController.java, accesible de manera pública sin autenticación.",
            file: "ApiSystemController.java (Línea 121) / SecurityConfig.java",
            category: "Seguridad",
            imagePath: "assets/evidencias/03-credencial-hardcodeada.jpg",
            fallbackTitle: "ApiSystemController.java",
            fallbackText: "Captura el bloque 'if' donde se compara el PIN estático. Recuerda ocultar o censurar visualmente el PIN real en la captura antes de guardarla."
        },
        {
            title: "Evidencia 04 — Configuración de CORS",
            desc: "Declaración del comodín de origen CORS (*) permitido en WebConfig.java, exponiendo endpoints del backend de manera pública a cualquier origen.",
            file: "WebConfig.java (Línea 22) / @CrossOrigin",
            category: "Seguridad",
            imagePath: "assets/evidencias/04-cors-configuracion.jpg",
            fallbackTitle: "WebConfig.java",
            fallbackText: "Captura la declaración CORS universal allowedOrigins('*') en WebConfig."
        },
        {
            title: "Evidencia 05 — Configuración de CSRF",
            desc: "Desactivación explícita del filtro CSRF mediante csrf.disable() en SecurityConfig.java, comprometiendo las sesiones web basadas en cookies de Thymeleaf.",
            file: "SecurityConfig.java (Línea 53)",
            category: "Seguridad",
            imagePath: "assets/evidencias/05-csrf-security.jpg",
            fallbackTitle: "SecurityConfig.java",
            fallbackText: "Captura el filterChain desactivando CSRF mediante csrf.disable()."
        },
        {
            title: "Evidencia 06 — Fallo de pruebas",
            desc: "Salida de error de la consola Maven mvnw test arrojando MongoTimeoutException debido al arranque del DataSeeder que intenta conectarse a un servidor de MongoDB local inactivo en el puerto 27017.",
            file: "ClinicaappApplicationTests.java / DataSeeder.java",
            category: "Testing",
            imagePath: "assets/evidencias/06-maven-test-failure.jpg",
            fallbackTitle: "Terminal Console (mvnw test)",
            fallbackText: "Ejecuta mvnw test en la raíz y captura el log de error final mostrando el MongoTimeoutException y el mensaje final de BUILD FAILURE."
        },
        {
            title: "Evidencia 07 — OpenAPI no implementado",
            desc: "Revisión del archivo de dependencias pom.xml demostrando la total ausencia de librerías y consolas auto-generadas Swagger UI en el backend.",
            file: "pom.xml",
            category: "Documentación",
            imagePath: "assets/evidencias/07-swagger-no-implementado.jpg",
            fallbackTitle: "pom.xml dependencies",
            fallbackText: "Captura de las dependencias en pom.xml corroborando la ausencia de springdoc-openapi."
        }
    ];

    // Lightbox Controls
    let currentLightboxIndex = 0;
    const lightboxOverlay = document.getElementById('lightboxOverlay');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    
    const lightboxImageWrapper = document.getElementById('lightboxImageWrapper');
    const lightboxCategory = document.getElementById('lightboxCategory');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDesc = document.getElementById('lightboxDesc');
    const lightboxFile = document.getElementById('lightboxFile');

    window.openLightbox = (index) => {
        currentLightboxIndex = index;
        renderLightboxItem();
        lightboxOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    const renderLightboxItem = () => {
        const item = evidenceGalleryData[currentLightboxIndex];
        if (!item) return;

        lightboxCategory.textContent = item.category;
        lightboxTitle.textContent = item.title;
        lightboxDesc.textContent = item.desc;
        lightboxFile.textContent = item.file;

        const originalCards = document.querySelectorAll('.evidence-card');
        const originalImg = originalCards[currentLightboxIndex].querySelector('.evidence-img');
        
        if (originalImg && originalImg.classList.contains('loaded')) {
            lightboxImageWrapper.innerHTML = `<img src="${item.imagePath}" alt="${item.title}">`;
        } else {
            lightboxImageWrapper.innerHTML = `
                <div class="evidence-fallback-placeholder" style="width: 100%; height: 100%;">
                    <div class="placeholder-editor-header">
                        <span class="editor-dot red"></span>
                        <span class="editor-dot yellow"></span>
                        <span class="editor-dot green"></span>
                        <span class="editor-title">${item.fallbackTitle}</span>
                    </div>
                    <div class="placeholder-instruction-body" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2.5rem; text-align: center;">
                        <p class="pending-badge">⚠️ Captura Pendiente</p>
                        <p class="inst-text" style="font-size: 1rem; max-width: 520px; margin: 1.25rem 0; line-height: 1.5; color: var(--text-secondary);">${item.fallbackText}</p>
                        <span class="path-badge" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">Guardar captura como: assets/evidencias/${item.imagePath.split('/').pop()}</span>
                    </div>
                </div>
            `;
        }
    };

    window.closeLightbox = () => {
        lightboxOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    window.navigateLightbox = (direction) => {
        currentLightboxIndex += direction;
        if (currentLightboxIndex < 0) {
            currentLightboxIndex = evidenceGalleryData.length - 1;
        } else if (currentLightboxIndex >= evidenceGalleryData.length) {
            currentLightboxIndex = 0;
        }
        renderLightboxItem();
    };

    if (lightboxClose) lightboxClose.addEventListener('click', window.closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => window.navigateLightbox(-1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => window.navigateLightbox(1));

    if (lightboxOverlay) {
        lightboxOverlay.addEventListener('click', (e) => {
            if (e.target === lightboxOverlay) window.closeLightbox();
        });
    }

    // Modal, Lightbox and navigation key listeners
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            window.closeLightbox();
        }
        if (lightboxOverlay && lightboxOverlay.style.display === 'flex') {
            if (e.key === 'ArrowLeft') {
                window.navigateLightbox(-1);
            }
            if (e.key === 'ArrowRight') {
                window.navigateLightbox(1);
            }
        }
    });
});
