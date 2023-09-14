import { parseEther, parseUnits } from 'ethers/lib/utils';
import { ethers, network } from 'hardhat';
import { ROUTER_ADDRESS, ARSW_ADDRESS, WRSTR_ADDRESS } from './addresses';
import {
  IArthRouter__factory,
} from '../../types';

async function main(): Promise<void> {
  const DEADLINE = '111111111111111111';
  const [signer] = await ethers.getSigners();
  const arthRouter = IArthRouter__factory.connect(ROUTER_ADDRESS, signer);

  if (network.name != 'rocstar') {
    throw new Error('network is not rocstar');
  }

  const tx = await arthRouter.swapExactETHForTokens(
    0,
    [WRSTR_ADDRESS, ARSW_ADDRESS],
    signer.address,
    DEADLINE,
    { value: parseEther('0.1') }
  );
  await tx.wait();
  console.log(`tx for swap complete as ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
