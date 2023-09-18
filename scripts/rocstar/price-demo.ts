import { ethers, network } from 'hardhat';
import { ARSW_ADDRESS, FACTORY_ADDRESS, WRSTR_ADDRESS } from './addresses';
import {
  ERC20__factory,
  IArthFactory__factory,
  IArthPair__factory,
} from '../../types';
import BigNumber from 'bignumber.js';

async function main(): Promise<void> {
  const [signer] = await ethers.getSigners();
  const arthFactory = IArthFactory__factory.connect(FACTORY_ADDRESS, signer);

  if (network.name != 'rocstar') {
    throw new Error('network is not rocstar');
  }

  const arsw = ERC20__factory.connect(ARSW_ADDRESS, signer);
  const wrstr = ERC20__factory.connect(WRSTR_ADDRESS, signer);

  const arswDecimals = await arsw.decimals();
  const wrstrDecimals = await wrstr.decimals();

  const pairAddress = await arthFactory.getPair(ARSW_ADDRESS, WRSTR_ADDRESS);
  const pair = IArthPair__factory.connect(pairAddress, signer);
  const [reserve0, reserve1] = await pair.getReserves();
  const [arswReserve, wrstrReserve] =
    ARSW_ADDRESS < WRSTR_ADDRESS ? [reserve0, reserve1] : [reserve1, reserve0];

  // Adjust decimal points for price
  const scalar = new BigNumber(10).pow(wrstrDecimals - arswDecimals);
  const arswPrice = new BigNumber(wrstrReserve.toString())
    .div(arswReserve.toString())
    .multipliedBy(scalar);
  console.log('ARSW price:', arswPrice.toPrecision(4), 'RSTR');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
