# Reporte de Migración White-Label: IronTrack a José Vega

Este reporte detalla todas las instancias en el código base donde aún existen referencias al cliente anterior ("Joaquín Silva" o iniciales "JS") que necesitarán ser modificadas en la siguiente fase para completar la marca blanca para **José Vega**.

## 1. Referencias a "Joaquín Silva" (o variaciones)

Se han encontrado las siguientes menciones, principalmente en textos visibles para el usuario, configuración de SEO/PWA y términos legales:

- **`index.html`**
  - Línea 10: `content="Joaquin Silva - Tu entrenador personal y dietista. Organiza tus...`
  - Línea 12: `<title>Joaquin Silva Trainer</title>`

- **`vite.config.js`**
  - Línea 14: `name: 'Joaquin Silva App',`

- **`src/pages/Login.jsx`**
  - Línea 61: `alt="Joaquin Silva Trainer"`
  - Línea 66: `<h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Joaquin Silva Trainer</h2>`

- **`src/pages/LegalTerms.jsx`** (Términos legales y de privacidad)
  - Línea 39: `en la plataforma <span className="font-semibold text-amber-500">Joaquin Silva - Personal Trainer</span>.`
  - Línea 52: `<p><span className="font-semibold text-white">Identidad:</span> Joaquin Silva</p>`
  - Línea 81: `del contrato</span> de servicios de entrenamiento personal que mantienes con Joaquin Silva.`
  - Línea 158: `<li>Tu entrenador personal asignado (Joaquin Silva)</li>`
  - Línea 187: `Joaquin Silva - Personal Trainer`

- **`src/components/LegalModal.jsx`**
  - Línea 45: `Al utilizar <span className="font-semibold text-amber-500">Joaquin Silva - Personal Trainer</span>,`

- **`src/test/LegalModal.test.jsx`** (Pruebas unitarias)
  - Línea 53: `expect(screen.getByText(/Joaquin Silva - Personal Trainer/i)).toBeInTheDocument();`

- **`e2e/privacy-consent.spec.js`** (Pruebas end-to-end)
  - Línea 47: `await expect(page.getByText(/Joaquin Silva - Personal Trainer/i)).toBeVisible();`
  - Línea 166: `await expect(responsableSection.getByText('Joaquin Silva')).toBeVisible();`

## 2. Referencias a Iniciales "JS"

Tras revisar el código buscando iniciales "JS" (descartando métodos nativos como `JSON.stringify` o hashes en `package-lock.json`), hemos encontrado:

- **`vite.config.js`**
  - Línea 15: `short_name: 'JS Trainer',`

---

## 3. Generación y Reemplazo de Assets Visuales

Se han detectado los siguientes logos/iconos requeridos por la aplicación (definidos en HTML y `vite.config.js` para PWA):
- `pwa-64x64.png`
- `pwa-192x192.png`
- `pwa-512x512.png`
- `maskable-icon-512x512.png`
- `favicon.ico`
- `logo-joaquin-silva.jpg` (es necesario mantener el nombre por ahora o actualizar las referencias junto al texto)

**Estado:** ✅ Las imágenes se han autogenerado exitosamente en los formatos y dimensiones correctas a partir de `logo-jose-vega.png` usando un script propio con `sharp`, y ya se encuentran listos en el directorio `public/` sobreescribiendo los anteriores donde aplicaba.
