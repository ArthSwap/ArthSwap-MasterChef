// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from 'hardhat';

async function main(): Promise<void> {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const masterChef = await ethers.getContractFactory('MasterChef');
  const testToken = await ethers.getContractFactory('TestToken');
  //const TestLp = await hre.ethers.getContractFactory("TestLp");
  const testtoken = await testToken.deploy();
  await testtoken.deployed();

  const masterchef = await masterChef.deploy(testtoken.address);
  await masterchef.deployed();

  console.log('TestToken deployed to:', testtoken.address);
  console.log('MasterChef deployed to:', masterchef.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
