import { getDefaultConfig, Chain } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';

export const xLayerTestnet = {
  id: 1952, // <-- Updated to match Chain ID 1952
  name: 'X Layer Testnet',
  iconUrl: 'https://www.okx.com/favicon.ico',
  iconBackground: '#000',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech'] },
    public: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'XLayerScan', url: 'https://www.okx.com/web3/explorer/xlayer-test' },
  },
  testnet: true,
} as const satisfies Chain;

export const config = getDefaultConfig({
  appName: 'VaultX AI',
  projectId: '044601f6521232330edc42350f9d6d5d',
  chains: [xLayerTestnet],
  transports: {
    [xLayerTestnet.id]: http('https://testrpc.xlayer.tech'),
  },
  ssr: true,
});