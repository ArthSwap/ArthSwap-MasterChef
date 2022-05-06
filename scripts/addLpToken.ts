import { ethers } from 'hardhat';

async function main(): Promise<void> {
  const masterChef = await ethers.getContractFactory('MasterChef');
  const masterchef = masterChef.attach(
    '0x2b74f71B11fD3Beae58326e7D8cC30A788a5cF7c',
  );

  const tx = await masterchef.add(
    30,
    '0xD72A602C714ae36D990dc835eA5F96Ef87657D5e',
    '0x0000000000000000000000000000000000000000',
  );
  tx.wait();
  console.log('added lp-tookens');
  console.log('MasterChef address:', masterchef.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
