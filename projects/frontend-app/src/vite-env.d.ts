/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_ENVIRONMENT: string
  
    readonly VITE_ALGOD_TOKEN: string
    readonly VITE_ALGOD_SERVER: string
    readonly VITE_ALGOD_PORT: string
    readonly VITE_ALGOD_NETWORK: string
  
    readonly VITE_INDEXER_TOKEN: string
    readonly VITE_INDEXER_SERVER: string
    readonly VITE_INDEXER_PORT: string
  
    readonly VITE_KMD_TOKEN: string
    readonly VITE_KMD_SERVER: string
    readonly VITE_KMD_PORT: string
    readonly VITE_KMD_PASSWORD: string
    readonly VITE_KMD_WALLET: string

    readonly VITE_DISPENSER: number
    readonly VITE_USDCA: number
    readonly VITE_GEOMAP_API_KEY: string
    readonly VITE_WALLET_CONNECT_ID: string
    readonly VITE_PINATA_JWT:string
    readonly VITE_EVENT_FACTORY_CONTRACT: number
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
