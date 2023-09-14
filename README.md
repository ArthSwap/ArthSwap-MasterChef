# ArthSwap-MasterChef

Farming contract in ArthSwap, see the [contract docs](./docs/) in detail.

## Audit

Audit Report by PeckShield: [https://github.com/peckshield/publications/tree/master/audit_reports/PeckShield-Audit-Report-ArthSwap-MasterChef-v1.0.pdf](https://github.com/peckshield/publications/tree/master/audit_reports/PeckShield-Audit-Report-ArthSwap-MasterChef-v1.0.pdf)

## Contract Address

### Astar-EVM Mainnet

- MasterChef: [0xc5b016c5597D298Fe9eD22922CE290A048aA5B75](https://blockscout.com/astar/address/0xc5b016c5597D298Fe9eD22922CE290A048aA5B75)

## Rocstar Swap Demo

### Set private key using `.env` file

Please refer `.env.example` for example.

### Install Dependencies

``` sh
yarn && yarn compile
```

### Run Script

**Note**: You should have at least 0.2 RSTR in your account to execute following script.

`yarn hardhat run scripts/rocstar/swap-demo.ts --network rocstar`
