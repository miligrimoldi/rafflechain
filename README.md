# RaffleChain

**RaffleChain** es una aplicación descentralizada (dApp) para crear y participar en rifas transparentes sobre la blockchain de Ethereum. Los sorteos se ejecutan mediante Chainlink VRF, lo que garantiza que el resultado sea verificablemente aleatorio y que ningún participante — ni siquiera el organizador — pueda manipularlo.

Desarrollado por **Milagros Grimoldi** y **Pilar Silveyra**.

🔗 **App en producción:** https://rafflechain-ashen.vercel.app

---

## El problema que resuelve

Las rifas tradicionales requieren confiar en el organizador para que el sorteo sea honesto. RaffleChain elimina esa necesidad: las reglas viven en un contrato inteligente público, el sorteo lo ejecuta Chainlink VRF (una fuente de aleatoriedad on-chain auditable), y cualquier persona puede verificar el resultado en Etherscan.

---

## Arquitectura general

El proyecto combina dos capas:

```
┌─────────────────────────────────────────────────────┐
│                    ON-CHAIN (Sepolia)                │
│                                                     │
│  Contrato RaffleChain.sol                           │
│  • Crea y gestiona rifas                            │
│  • Vende tickets como NFTs (ERC-721)                │
│  • Solicita aleatoriedad a Chainlink VRF            │
│  • Distribuye fondos al ganador y al organizador    │
└─────────────────┬───────────────────────────────────┘
                  │ Lee / escribe vía Ethers.js
┌─────────────────▼───────────────────────────────────┐
│                   OFF-CHAIN (Vercel)                 │
│                                                     │
│  Next.js (frontend + API Routes)                    │
│  • Muestra las rifas con su metadata                │
│  • Permite conectar MetaMask y operar               │
│                                                     │
│  PostgreSQL (Neon) vía Prisma                       │
│  • Almacena metadata visible: título, descripción,  │
│    imagen, organizador (no afecta la lógica)        │
└─────────────────────────────────────────────────────┘
```

**Separación de responsabilidades:** toda la lógica de negocio (quién ganó, cuánto se pagó, si la rifa es válida) vive en el contrato. La base de datos solo guarda información de presentación.

---

## Tecnologías

| Capa | Tecnologías |
|---|---|
| Smart contracts | Solidity, Hardhat 3, OpenZeppelin, Chainlink VRF |
| Pagos | USDC (ERC-20) vía Circle en Sepolia |
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| Interacción blockchain | Ethers.js v6, MetaMask |
| Backend / API | Next.js API Routes, Prisma ORM v7 |
| Base de datos | PostgreSQL 16 (Neon en producción) |
| Red | Sepolia testnet |
| Deploy | Vercel (web) + Hardhat Ignition (contrato) |

---

## Estructura del repositorio

```
rafflechain/
├── contracts/          # Smart contracts
│   ├── contracts/
│   │   └── RaffleChain.sol
│   ├── test/
│   ├── ignition/modules/
│   └── hardhat.config.ts
└── web/                # Aplicación Next.js
    ├── app/            # Páginas y API Routes
    ├── components/     # Componentes React
    ├── context/        # WalletContext
    ├── lib/            # Cliente Prisma, helpers de contrato
    └── prisma/
        └── schema.prisma
```

---

## Requisitos previos

- Node.js 20+
- Docker (para la base de datos local)
- MetaMask instalado en el navegador
- ETH de prueba en Sepolia para pagar gas (conseguilo en un faucet)
- USDC de testnet en Sepolia para comprar tickets (conseguilo en el faucet de Circle)

---

## Contratos (`/contracts`)

### Instalar dependencias

```bash
cd contracts
npm install
```

### Compilar

```bash
npm run compile
```

### Correr los tests

```bash
npm test
```

### Deployar en Sepolia

Creá un archivo `.env` en `/contracts`:

```env
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY"
PRIVATE_KEY="tu_clave_privada_sin_0x"
```

Luego:

```bash
npx hardhat ignition deploy ignition/modules/RaffleChain.ts --network sepolia
```

El contrato ya está deployado en Sepolia en:
```
0xd5B23CEa399E6EdC32C69EE4A1cC9619985b4f80
```

---

## Web (`/web`)

### 1. Levantar la base de datos local

Desde la raíz del repositorio:

```bash
docker compose up -d
```

Esto levanta PostgreSQL 16 en el puerto `5433`.

### 2. Instalar dependencias

```bash
cd web
npm install
```

### 3. Configurar variables de entorno

Copiá el archivo de ejemplo:

```bash
cp .env.example .env
```

Editá `.env` con los valores correspondientes:

```env
# Cadena de conexión a PostgreSQL
DATABASE_URL="postgresql://rafflechain:rafflechain@localhost:5433/rafflechain?schema=public"

# Red: 11155111 = Sepolia, 31337 = Hardhat local
NEXT_PUBLIC_CHAIN_ID=11155111

# URL del nodo RPC (Alchemy, Infura, o nodo local)
NEXT_PUBLIC_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY"

# Dirección del contrato desplegado
NEXT_PUBLIC_RAFFLE_CHAIN_ADDRESS="0xd5B23CEa399E6EdC32C69EE4A1cC9619985b4f80"
```

### 4. Aplicar migraciones de Prisma

```bash
npx prisma migrate dev
```

### 5. Correr el servidor de desarrollo

```bash
npm run dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

---

## Deploy en producción

### Vercel (web)

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Establecer el **Root Directory** en `web`
3. Configurar las variables de entorno en el panel de Vercel (las mismas que `.env` pero con los valores de producción)
4. Vercel redeploya automáticamente con cada `git push` a `main`

### Base de datos (Neon)

En producción se usa [Neon](https://neon.tech) como proveedor de PostgreSQL serverless. La `DATABASE_URL` de producción la provee Neon desde su panel.

---

## Flujo de una rifa

1. El organizador conecta MetaMask y crea una rifa (precio de ticket, máximo de tickets, fecha de cierre)
2. El contrato asigna un ID y emite el evento `RaffleCreated`
3. El organizador registra la metadata visible (título, descripción, imagen) en la base de datos
4. Los participantes aprueban el gasto de USDC y compran tickets; cada ticket es un NFT ERC-721
5. Al cerrar la rifa (por tiempo o tickets agotados), el organizador solicita el sorteo
6. Chainlink VRF entrega un número aleatorio verificable al contrato
7. El contrato selecciona al ganador y emite el evento `WinnerSelected`
8. El ganador reclama su premio y el organizador retira los fondos en USDC

