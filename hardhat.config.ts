import '@nomicfoundation/hardhat-toolbox';
import { HardhatUserConfig } from 'hardhat/config';
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
  networks: {
    hardhat: {
      gasPrice: 0,
      initialBaseFeePerGas: 0,
    },
    rocstar: {
      chainId: 692,
      url: 'https://rocstar.astar.network',
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
  },
};

export default config;
