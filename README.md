# Sorprendiendo — Sistema de gestión de pedidos, compras e informes

Aplicación web interna para **Sorprendiendo** (Cali, Colombia). Centraliza detalles,
productos, proveedores, listas de compras, pedidos, domiciliarios e informes.
Funciona en computador y celular, sincronizando ambos sobre la misma base de datos
en **Firebase**. Se aloja gratis en **GitHub Pages**.

> No necesitas saber programación para seguir esta guía: solo sigue los pasos en orden.

---

## Índice

1. [Crear el proyecto de Firebase](#1-crear-el-proyecto-de-firebase)
2. [Configurar Firestore](#2-configurar-firestore)
3. [Configurar Authentication](#3-configurar-authentication)
4. [Configurar Storage](#4-configurar-storage)
5. [Obtener las credenciales de Firebase](#5-obtener-las-credenciales-de-firebase)
6. [Conectar Firebase con la aplicación](#6-conectar-firebase-con-la-aplicación)
7. [Configurar las reglas de seguridad](#7-configurar-las-reglas-de-seguridad)
8. [Crear el usuario administrador](#8-crear-el-usuario-administrador)
9. [Subir el proyecto a GitHub](#9-subir-el-proyecto-a-github)
10. [Activar GitHub Pages](#10-activar-github-pages)
11. [Primeros pasos dentro de la aplicación](#11-primeros-pasos-dentro-de-la-aplicación)
12. [Estructura del proyecto](#12-estructura-del-proyecto)
13. [Modelo de datos](#13-modelo-de-datos)
14. [Solución de problemas comunes](#14-solución-de-problemas-comunes)
15. [Mantenimiento y crecimiento futuro](#15-mantenimiento-y-crecimiento-futuro)

---

## 1. Crear el proyecto de Firebase

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com) e inicia sesión con una cuenta de Google (puede ser la del negocio).
2. Haz clic en **Crear un proyecto** (o "Add project").
3. Ponle un nombre, por ejemplo `sorprendiendo-app`.
4. Puedes desactivar Google Analytics (no es necesario para esta aplicación).
5. Espera a que se cree el proyecto y haz clic en **Continuar**.

No es necesario activar el plan de pago (Blaze) para comenzar: el **plan gratuito Spark**
es suficiente para el volumen descrito (~100 pedidos diarios). Storage requiere activar
brevemente la facturación en proyectos nuevos de Google Cloud, pero el uso normal del
negocio se mantendrá dentro de la capa gratuita.

---

## 2. Configurar Firestore

1. En el menú lateral de la consola de Firebase, ve a **Compilación (Build) → Firestore Database**.
2. Haz clic en **Crear base de datos**.
3. Selecciona **Iniciar en modo de producción** (las reglas de seguridad correctas se configuran en el paso 7).
4. Elige una ubicación cercana, por ejemplo `southamerica-east1` o `us-central`.
5. Haz clic en **Habilitar**.

No necesitas crear colecciones manualmente: la aplicación las crea automáticamente
la primera vez que guardas información (categorías, productos, proveedores, detalles,
listas de compras, pedidos, domiciliarios, domicilios y ocasiones).

---

## 3. Configurar Authentication

1. Ve a **Compilación → Authentication**.
2. Haz clic en **Comenzar (Get started)**.
3. En la pestaña **Sign-in method**, selecciona **Correo electrónico/contraseña** (Email/Password).
4. Actívalo (el interruptor de "Correo electrónico/contraseña") y guarda. Puedes dejar
   desactivado el enlace de acceso sin contraseña.

Más adelante, en el paso 8, crearás aquí mismo el usuario administrador inicial.

---

## 4. Configurar Storage

1. Ve a **Compilación → Storage**.
2. Haz clic en **Comenzar (Get started)**.
3. Selecciona **Iniciar en modo de producción**.
4. Elige la misma ubicación que usaste para Firestore.
5. Haz clic en **Listo/Done**.

Aquí se guardarán las imágenes de detalles, productos y proveedores (la aplicación
las comprime automáticamente antes de subirlas para ahorrar espacio).

---

## 5. Obtener las credenciales de Firebase

1. En la consola de Firebase, haz clic en el ícono de engranaje (⚙️) junto a "Project Overview" y selecciona **Configuración del proyecto**.
2. Baja hasta la sección **Tus apps**.
3. Haz clic en el ícono **`</>`** (Web) para registrar una nueva app web.
4. Ponle un apodo, por ejemplo `sorprendiendo-web`. **No** actives Firebase Hosting (usaremos GitHub Pages).
5. Haz clic en **Registrar app**.
6. Firebase te mostrará un bloque de código con un objeto `firebaseConfig` parecido a este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "sorprendiendo-app.firebaseapp.com",
  projectId: "sorprendiendo-app",
  storageBucket: "sorprendiendo-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

7. **Copia estos valores**, los necesitas en el siguiente paso.

---

## 6. Conectar Firebase con la aplicación

1. Abre el archivo [`js/firebase-config.js`](js/firebase-config.js) de este proyecto.
2. Reemplaza los valores de ejemplo por los tuyos:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};
```

3. Guarda el archivo.

Eso es todo: la aplicación ya sabe cómo conectarse a tu proyecto de Firebase.

---

## 7. Configurar las reglas de seguridad

Este proyecto incluye dos archivos con las reglas recomendadas:

- [`firestore.rules`](firestore.rules)
- [`storage.rules`](storage.rules)

Ambas exigen que el usuario haya iniciado sesión para poder leer o escribir cualquier
dato, y dejan la estructura lista para roles (administrador/empleado) en el futuro.

**Cómo aplicarlas (sin usar la línea de comandos):**

### Firestore
1. Ve a **Firestore Database → Reglas (Rules)** en la consola de Firebase.
2. Borra el contenido que aparece y pega el contenido completo de `firestore.rules`.
3. Haz clic en **Publicar**.

### Storage
1. Ve a **Storage → Reglas (Rules)** en la consola de Firebase.
2. Borra el contenido que aparece y pega el contenido completo de `storage.rules`.
3. Haz clic en **Publicar**.

---

## 8. Crear el usuario administrador

Firebase Authentication funciona con correo + contraseña, así que el "usuario" de la
aplicación se convierte internamente en un correo ficticio usando el dominio
`@sorprendiendo.local` (ya configurado en `js/auth.js`, no necesitas tocarlo).

1. Ve a **Authentication → Users** en la consola de Firebase.
2. Haz clic en **Agregar usuario (Add user)**.
3. En **Correo electrónico**, escribe exactamente:
   ```
   sorprendiendo@sorprendiendo.local
   ```
4. En **Contraseña**, escribe la contraseña inicial:
   ```
   007792
   ```
5. Haz clic en **Agregar usuario**.

Con esto, dentro de la aplicación podrás iniciar sesión con:

- **Usuario:** `sorprendiendo`
- **Contraseña:** `7792`

### Cambiar la contraseña más adelante

Ve a **Authentication → Users**, haz clic en el usuario `sorprendiendo@sorprendiendo.local`,
y usa la opción de restablecer/cambiar contraseña. También puedes crear usuarios
adicionales (por ejemplo `empleado1@sorprendiendo.local`) si en el futuro necesitas
que más personas inicien sesión.

---

## 9. Subir el proyecto a GitHub

1. Crea una cuenta en [github.com](https://github.com) si todavía no tienes una.
2. Crea un nuevo repositorio (botón **New**), por ejemplo llamado `sorprendiendo-app`.
   Puede ser público o privado (GitHub Pages funciona con ambos si tienes GitHub Pro
   para privados; si es un repositorio gratuito, debe ser público para usar Pages).
3. Sube todos los archivos de este proyecto al repositorio. Puedes hacerlo de dos formas:

**Opción A — Desde el navegador (sin instalar nada):**
   - En la página del repositorio, haz clic en **Add file → Upload files**.
   - Arrastra todos los archivos y carpetas del proyecto (`index.html`, `css/`, `js/`, `README.md`, etc.).
   - Haz clic en **Commit changes**.

**Opción B — Con Git instalado:**
   ```bash
   git init
   git add .
   git commit -m "Primera versión de Sorprendiendo"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/sorprendiendo-app.git
   git push -u origin main
   ```

---

## 10. Activar GitHub Pages

1. En tu repositorio de GitHub, ve a **Settings → Pages**.
2. En **Source**, selecciona **Deploy from a branch**.
3. En **Branch**, selecciona `main` y la carpeta `/ (root)`.
4. Haz clic en **Save**.
5. Espera uno o dos minutos. GitHub te mostrará la URL pública, algo como:
   ```
   https://TU_USUARIO.github.io/sorprendiendo-app/
   ```

Abre esa URL desde el computador y desde el celular: ambos usarán la misma base de
datos de Firebase.

### Autorizar el dominio en Firebase (paso importante)

1. Vuelve a la consola de Firebase → **Authentication → Settings → Authorized domains**.
2. Haz clic en **Add domain** y agrega:
   ```
   TU_USUARIO.github.io
   ```
3. Guarda. Sin este paso, el inicio de sesión fallará cuando accedas desde la URL de GitHub Pages.

---

## 11. Primeros pasos dentro de la aplicación

1. Abre la URL de GitHub Pages e inicia sesión con `sorprendiendo` / `7792`.
2. Ve a **Configuración** y carga las **ocasiones sugeridas** (o crea las tuyas).
3. Ve a **Proveedores** y crea tus proveedores habituales.
4. Ve a **Productos** y crea tus productos, asociando proveedores y marcando el proveedor preferido de cada uno.
5. Ve a **Detalles** y crea tus categorías (botón "Categorías") y luego tus detalles, agregando los productos y cantidades que los componen.
6. Ve a **Domiciliarios** y registra tu equipo de domicilios.
7. Ya puedes usar **Listas de compras**, **Registrar pedido** e **Informes**.

---

## 12. Estructura del proyecto

```text
/
├── index.html              → Punto de entrada de la aplicación (SPA)
├── README.md
├── firestore.rules         → Reglas de seguridad de Firestore
├── storage.rules           → Reglas de seguridad de Storage
├── css/
│   ├── styles.css          → Estilos, variables de marca y componentes
│   └── responsive.css      → Adaptación a tablet y celular
└── js/
    ├── firebase-config.js  → Configuración/credenciales de Firebase
    ├── auth.js             → Inicio y cierre de sesión
    ├── data.js              → Toda la capa de acceso a Firestore (CRUD)
    ├── utils.js             → Formato, toasts, modales, subida de imágenes, WhatsApp, CSV
    ├── app.js                → Enrutador principal, sidebar, layout
    ├── dashboard.js          → Página de inicio con indicadores
    ├── categorias.js         → Gestión de categorías (modal desde Detalles)
    ├── detalles.js            → CRUD de detalles
    ├── productos.js           → CRUD de productos
    ├── proveedores.js         → CRUD de proveedores
    ├── compras.js             → Listas de compras, agrupación por proveedor, WhatsApp
    ├── pedidos.js              → Registro de pedidos
    ├── domiciliarios.js        → CRUD de domiciliarios e informes de pago
    ├── informes.js             → Informes anuales/mensuales, gráficos, exportación
    └── configuracion.js        → Ocasiones y datos de cuenta
```

La aplicación es una **SPA (Single Page Application)** sin frameworks ni paso de
compilación: solo HTML, CSS y JavaScript con módulos ES nativos, cargados directamente
por el navegador. Esto la hace 100% compatible con GitHub Pages.

---

## 13. Modelo de datos (colecciones de Firestore)

| Colección       | Descripción                                                                 |
|------------------|------------------------------------------------------------------------------|
| `categorias`     | Categorías de detalles (Desayunos, Meriendas, etc.)                        |
| `productos`      | Productos/ingredientes, con sus proveedores asociados y el preferido        |
| `proveedores`    | Proveedores del negocio                                                     |
| `detalles`       | Detalles sorpresa, con su lista de productos y cantidades, precio actual    |
| `ocasiones`      | Lista estandarizada de ocasiones (Cumpleaños, Amor, etc.)                   |
| `domiciliarios`  | Domiciliarios del negocio (activos/inactivos)                               |
| `listasCompras`  | Listas de compras generadas, con sus productos agrupados por proveedor      |
| `pedidos`        | Registro histórico de ventas (nunca se debe depurar; alimenta los informes) |
| `domicilios`      | Ficha de pago de cada domicilio (permite depurar pagos sin afectar `pedidos`) |

Los pedidos **guardan el precio del detalle en el momento de la venta**, por lo que
cambiar el precio de un detalle más adelante no altera pedidos ya registrados.

---

## 14. Solución de problemas comunes

**"No puedo iniciar sesión" / "Usuario o contraseña incorrectos"**
Verifica que hayas creado el usuario `sorprendiendo@sorprendiendo.local` exactamente
como se indica en el paso 8, y que el método "Correo electrónico/contraseña" esté
activado en Authentication.

**La aplicación carga pero no guarda nada / errores de permisos**
Revisa que hayas publicado las reglas de `firestore.rules` y `storage.rules` (paso 7),
y que hayas agregado tu dominio de GitHub Pages en "Authorized domains" (paso 10).

**Las imágenes no se suben**
Confirma que Storage esté habilitado (paso 4) y que las reglas de `storage.rules`
estén publicadas.

**Los cambios no se ven reflejados en el otro dispositivo**
Verifica tu conexión a internet: Firebase es la fuente oficial de datos, así que
ambos dispositivos necesitan conexión para sincronizar.

---

## 15. Mantenimiento y crecimiento futuro

- **Roles de usuario:** las reglas de seguridad ya están preparadas para extenderse
  con una colección `usuarios` que indique el rol de cada persona (administrador,
  empleado) sin necesidad de rediseñar la aplicación.
- **Dominio propio:** cuando quieras usar un dominio propio en lugar de
  `github.io`, puedes configurarlo desde GitHub Pages → Settings → Pages → Custom domain,
  y agregar ese nuevo dominio también en Firebase → Authorized domains.
- **Respaldo de datos:** usa el botón "Exportar CSV" dentro de Informes para
  respaldar periódicamente tus pedidos.
- **Volumen de datos:** las listas de compras antiguas pueden eliminarse libremente;
  los pedidos históricos deben conservarse siempre para mantener informes confiables.
