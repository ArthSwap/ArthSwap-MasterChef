import { ethers } from 'hardhat';
import { BigNumber, ContractFactory } from 'ethers';
import { Context } from 'mocha';

export const BASE_TEN = 10;
export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
export const ARTHSWAP_ORIGIN_BLOCK = 3; // Original is 242181
export const BLOCK_PER_PERIOD = 3; // Original is 215000
export const FIRST_PERIOD_REWERD_SUPPLY = BigNumber.from(
  '151629858171523000000',
);
export const MAX_PERIOD = 23;
export const ACC_ARSW_PRECISION = BigNumber.from(1e12);

export async function prepare(
  thisObject: Context,
  contracts: string[],
): Promise<void> {
  for (const i in contracts) {
    const contract = contracts[i];
    thisObject[contract] = await ethers.getContractFactory(contract);
  }
  thisObject.signers = await ethers.getSigners();
  thisObject.alice = thisObject.signers[0];
  thisObject.bob = thisObject.signers[1];
}

type DeployArgs = ContractFactory | string | BigNumber;

export async function deploy(
  thisObject: Context,
  contracts: DeployArgs[][],
): Promise<void> {
  for (const i in contracts) {
    const contract = contracts[i];
    thisObject[contract[0] as string] = await (
      contract[1] as ContractFactory
    ).deploy(...((contract[2] || []) as DeployArgs[]));
    await thisObject[contract[0] as string].deployed();
  }
}

// Defaults to e18 using amount * 10^18
export function getBigNumber(amount: number, decimals = 18): BigNumber {
  return BigNumber.from(amount).mul(BigNumber.from(BASE_TEN).pow(decimals));
}

export * from './time';
