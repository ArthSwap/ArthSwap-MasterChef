import '@nomiclabs/hardhat-waffle';
import 'dotenv/config';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  solidity: '0.6.12',
  networks: {
    mainnet: {
      chainId: 592,
      url: 'https://rpc.astar.network:8545',
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
};
