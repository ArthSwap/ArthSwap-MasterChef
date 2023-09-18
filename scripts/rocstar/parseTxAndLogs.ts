import { ethers, network } from 'hardhat';
import { ROUTER_ADDRESS } from './addresses';
import { ERC20__factory, IArthRouter__factory } from '../../types';
import util from 'util';

async function main(): Promise<void> {
  const [signer] = await ethers.getSigners();
  const arthRouter = IArthRouter__factory.connect(ROUTER_ADDRESS, signer);
  const erc20Interface = ERC20__factory.createInterface();

  if (network.name != 'rocstar') {
    throw new Error('network is not rocstar');
  }

  const txReceipt = await ethers.provider.getTransactionReceipt(
    '0x211c360686611c01ee01ba75c1f29e6f9264f80ff3fd4c947fb659acea4804a3',
  );
  const tx = await ethers.provider.getTransaction(
    '0x211c360686611c01ee01ba75c1f29e6f9264f80ff3fd4c947fb659acea4804a3',
  );
  const transaction = arthRouter.interface.parseTransaction({
    data: tx.data,
    value: tx.value,
  });
  console.log(
    '--------\ntx: ',
    util.inspect(transaction, { showHidden: false, depth: null, colors: true }),
  );
  for (const log of txReceipt.logs) {
    let parsedLog;
    try {
      try {
        parsedLog = arthRouter.interface.parseLog(log);
      } catch {
        parsedLog = erc20Interface.parseLog(log);
      }
      console.log(
        '--------\nlog: ',
        util.inspect(parsedLog, {
          showHidden: false,
          depth: null,
          colors: true,
        }),
      );
      // eslint-disable-next-line no-empty
    } catch {}
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
