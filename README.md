# RaffleChain

**RaffleChain** es una aplicación descentralizada (dApp) para crear y participar en rifas transparentes sobre la blockchain de Ethereum. Los sorteos se ejecutan mediante Chainlink VRF, lo que garantiza que el resultado sea verificablemente aleatorio y que ningún participante —ni siquiera el organizador— pueda manipularlo.

Desarrollado por **Milagros Grimoldi** y **Pilar Silveyra**.

🔗 **App en producción:** https://rafflechain-ashen.vercel.app

---

## El problema que resuelve

Las rifas tradicionales requieren confiar en el organizador para que el sorteo sea honesto. RaffleChain elimina esa necesidad: las reglas viven en un contrato inteligente público, el sorteo lo ejecuta Chainlink VRF (una fuente de aleatoriedad on-chain auditable), y cualquier persona puede verificar el resultado en Etherscan.

---

## Características

* Rifas transparentes y verificables en blockchain.
* Pagos en USDC (ERC-20).
* Sorteos mediante Chainlink VRF.
* Integración con MetaMask.
* Separación entre lógica on-chain y metadata off-chain.
* Frontend responsive desarrollado con Next.js.
* Contrato desplegado en Sepolia para pruebas públicas.

---

## Arquitectura general

El proyecto combina dos capas:

```text
┌─────────────────────────────────────────────────────┐
│                    ON-CHAIN (Sepolia)               │
│                                                     │
│  Contrato RaffleChain.sol                           │
│  • Crea y gestiona rifas                            │
│  • Procesa pagos en USDC (ERC-20)                   │
│  • Registra la propiedad de los tickets             │
│  • Solicita aleatoriedad a Chainlink VRF            │
│  • Gestiona premios, retiros y reembolsos           │
└─────────────────┬───────────────────────────────────┘
                  │ Lee / escribe vía Ethers.js
┌─────────────────▼───────────────────────────────────┐
│                   OFF-CHAIN (Vercel)                │
│                                                     │
│  Next.js (frontend + API Routes)                    │
│  • Muestra las rifas con su metadata                │
│  • Permite conectar MetaMask y operar               │
│                                                     │
│  PostgreSQL (Neon) vía Prisma                       │
│  • Almacena metadata visible: título, descripción,  │
│    imagen, organizador y condiciones                │
└─────────────────────────────────────────────────────┘
```

**Separación de responsabilidades:** toda la lógica de negocio (quién ganó, cuánto se pagó, quién puede retirar fondos, quién puede reclamar un reembolso, etc.) vive en el contrato inteligente. La base de datos únicamente almacena información de presentación y experiencia de usuario.

---

## Tecnologías

| Capa                   | Tecnologías                                      |
| ---------------------- | ------------------------------------------------ |
| Smart contracts        | Solidity, Hardhat 3, OpenZeppelin, Chainlink VRF |
| Pagos                  | USDC (ERC-20) en Sepolia                         |
| Frontend               | Next.js 16, TypeScript, Tailwind CSS v4          |
| Interacción blockchain | Ethers.js v6, MetaMask                           |
| Backend / API          | Next.js API Routes, Prisma ORM                   |
| Base de datos          | PostgreSQL 16 (Neon en producción)               |
| Red                    | Ethereum Sepolia                                 |
| Deploy                 | Vercel (web) + Hardhat Ignition (contrato)       |

---

## Estructura del repositorio

```text
rafflechain/
├── contracts/
│   ├── contracts/
│   │   └── RaffleChain.sol
│   ├── test/
│   ├── ignition/modules/
│   └── hardhat.config.ts
│
└── web/
    ├── app/
    ├── components/
    ├── context/
    ├── lib/
    └── prisma/
        └── schema.prisma
```

---

## Requisitos previos

* Node.js 20+
* Docker
* MetaMask instalado en el navegador
* ETH de prueba en Sepolia para pagar gas
* USDC de prueba en Sepolia para comprar tickets

---

# Contratos (`/contracts`)

## Instalar dependencias

```bash
cd contracts
npm install
```

## Compilar

```bash
npm run compile
```

## Ejecutar tests

```bash
npm test
```

## Configurar variables de entorno

Copiá el archivo de ejemplo:

```bash
cp .env.example .env
```

Completar:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
SEPOLIA_PRIVATE_KEY=TU_PRIVATE_KEY
```

## Deployar en Sepolia

```bash
npx hardhat ignition deploy ignition/modules/RaffleChain.ts --network sepolia
```

Contrato desplegado:

```text
0x4c4A83Aff8bf5F558dF3B6D666b733003fdFF93a
```

---

# Web (`/web`)

## 1. Levantar PostgreSQL

Desde la raíz:

```bash
docker compose up -d
```

Esto levanta PostgreSQL local en el puerto `5433`.

## 2. Instalar dependencias

```bash
cd web
npm install
```

## 3. Configurar variables de entorno

Copiá el archivo de ejemplo:

```bash
cp .env.example .env
```

Completar:

```env
DATABASE_URL=postgresql://rafflechain:rafflechain@localhost:5433/rafflechain?schema=public

NEXT_PUBLIC_CHAIN_ID=11155111

NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY

NEXT_PUBLIC_RAFFLE_CHAIN_ADDRESS=0x4c4A83Aff8bf5F558dF3B6D666b733003fdFF93a

NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

## 4. Aplicar migraciones

```bash
npx prisma migrate dev
```

## 5. Ejecutar la aplicación

```bash
npm run dev
```

La aplicación quedará disponible en:

```text
http://localhost:3000
```

---

## Deploy en producción

### Frontend (Vercel)

1. Conectar el repositorio a Vercel.
2. Configurar el directorio raíz como `web`.
3. Configurar las variables de entorno.
4. Cada push a `main` genera un nuevo despliegue automáticamente.

### Base de datos (Neon)

En producción se utiliza Neon como proveedor de PostgreSQL serverless. La conexión se configura mediante la variable `DATABASE_URL`.

---

## Flujo de una rifa

1. El organizador conecta MetaMask.
2. Crea una rifa indicando:

    * Precio del ticket en USDC.
    * Cantidad máxima de tickets.
    * Fecha de cierre.
3. El contrato crea la rifa y emite el evento `RaffleCreated`.
4. El organizador registra la metadata visible (título, descripción, imagen, condiciones, etc.).
5. Los participantes aprueban el gasto de USDC mediante `approve`.
6. Los participantes compran tickets utilizando USDC.
7. El contrato registra la propiedad de cada ticket y transfiere los USDC al contrato.
8. Al finalizar la rifa (por tiempo o tickets agotados), el organizador solicita el sorteo.
9. Chainlink VRF genera un número aleatorio verificable.
10. El contrato selecciona al ganador y emite el evento `WinnerSelected`.
11. El ganador reclama el premio.
12. El organizador retira los fondos recaudados.
13. Si corresponde, los participantes pueden reclamar reembolsos.

---

## Seguridad y transparencia

* La lógica crítica vive completamente on-chain.
* Los pagos se realizan en USDC (ERC-20).
* Los sorteos utilizan Chainlink VRF.
* La metadata off-chain no afecta el resultado de la rifa.
* Todas las transacciones son auditables en Etherscan.
* Las acciones sensibles requieren la firma de la wallet correspondiente.

---

## Autores

**Milagros Grimoldi**
**Pilar Silveyra**

Universidad Austral — Blockchain
