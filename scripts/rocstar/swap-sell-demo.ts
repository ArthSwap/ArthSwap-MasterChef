import { parseUnits } from 'ethers/lib/utils';
import { ethers, network } from 'hardhat';
import { ROUTER_ADDRESS, ARSW_ADDRESS, WRSTR_ADDRESS } from './addresses';
import { ERC20__factory, IArthRouter__factory } from '../../types';

async function main(): Promise<void> {
  const DEADLINE = '111111111111111111';
  const [signer] = await ethers.getSigners();
  const arsw = ERC20__factory.connect(ARSW_ADDRESS, signer);
  const arthRouter = IArthRouter__factory.connect(ROUTER_ADDRESS, signer);

  if (network.name != 'rocstar') {
    throw new Error('network is not rocstar');
  }

  const arswDecimals = await arsw.decimals();
  const toSell = parseUnits('0.1', arswDecimals);
  const txApprove = await (
    await arsw.approve(arthRouter.address, toSell)
  ).wait();
  console.log('tx for approval', txApprove.transactionHash);

  const tx = await arthRouter.swapExactTokensForETH(
    toSell,
    0,
    [ARSW_ADDRESS, WRSTR_ADDRESS],
    signer.address,
    DEADLINE,
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
