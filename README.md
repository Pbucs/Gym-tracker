# 🏋️‍♂️ IronTrack - Gym Progress Tracker (PWA)

Una aplicación web progresiva (PWA) móvil diseñada con la estética y experiencia de iOS (Dark Mode, OLED) para registrar rutinas, ejercicios, pesos y repeticiones en el gimnasio desde tu iPhone.

---

## 📱 Características principales

1. **Gestión de Rutinas & Ejercicios:**
   - Ejercicios precargados por grupos musculares: *Press de banca plano e inclinado, Press militar, Sentadillas, Dominadas, Remo con barra, Peso muerto, Curl de bíceps, etc.*
   - Posibilidad de crear **cualquier ejercicio personalizado**.
   - Rutinas preconfiguradas (*Torso, Pierna, Push, Pull*) y creador de rutinas a tu medida.

2. **Entrenamiento en Vivo & Progresión:**
   - Inicia un entrenamiento libre o basado en una rutina.
   - **Sobrecarga progresiva:** Te muestra automáticamente el peso y repeticiones que hiciste en tu sesión anterior como referencia.
   - Cronómetro de sesión en vivo.
   - Tabla de series (peso en kg o lbs y repeticiones).

3. **Temporizador de Descanso Inteligente:**
   - Al marcar una serie como completada (✓), se activa automáticamente el temporizador de descanso.
   - Sonido y vibración háptica al finalizar el descanso (usando la Web Audio API nativa sin requerir conexión a internet).
   - Botón rápido para sumar +30s o saltar.

4. **Calculadora de Discos (Plate Calculator):**
   - Toca cualquier peso o el botón "Discos" para ver exactamente qué discos cargar en cada lado de una barra olímpica de 20 kg con representación visual en color.

5. **Récords Personales (PRs) & Estimador de 1RM:**
   - Calcula tu récord de repetición máxima estimada (fórmula Brzycki/Epley).
   - Animación de confeti y aviso especial al batir un récord personal.

6. **100% Offline & Privacidad:**
   - Todos los datos se guardan en tu iPhone (LocalStorage / Service Worker).
   - Funciona sin internet ni cobertura en sótanos de gimnasios.
   - Botón de **Exportar / Restaurar copia de seguridad en JSON** para que jamás pierdas tus datos.

---

## 🚀 Cómo probarla y usarla en tu iPhone

### Opción A: Probarla localmente por Wi-Fi (desde tu PC)
1. Abre PowerShell en la carpeta del proyecto:
   ```powershell
   cd C:\Users\eduar\.gemini\antigravity\scratch\gym-tracker
   powershell -ExecutionPolicy Bypass -File .\serve.ps1
   ```
2. El script te mostrará una dirección IP (por ejemplo `http://192.168.1.45:8080`).
3. En tu iPhone (conectado a la misma red Wi-Fi), abre **Safari** y escribe esa dirección.
4. Toca el botón **Compartir** de Safari (el cuadrado con la flecha hacia arriba).
5. Desliza hacia abajo y pulsa **"Añadir a pantalla de inicio"**.
6. ¡Listo! Se abrirá como una aplicación nativa a pantalla completa con su propio icono.

### Opción B: Alojarla gratis en Internet (para usarla siempre)
Como es una aplicación 100% estática (HTML, CSS, JS), puedes subir la carpeta a cualquier servicio gratuito en 1 minuto:
* **GitHub Pages**: Sube los archivos a un repositorio y activa Pages en los ajustes.
* **Netlify Drop**: Entra a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastra la carpeta `gym-tracker`. Te dará una URL HTTPS al instante.
* **Vercel** o **Cloudflare Pages**.
* *Nota:* Al tener HTTPS, el Service Worker y el modo PWA se activan con todas sus funciones de instalación automática en iOS.
