import { BigNumber } from 'ethers';

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
export const ARTHSWAP_ORIGIN_BLOCK = 3; // Original is 242181
export const BLOCK_PER_PERIOD = 3; // Original is 215000
export const FIRST_PERIOD_REWERD_SUPPLY = BigNumber.from(
  '151629858171523000000',
);
export const MAX_PERIOD = 23;
export const ACC_ARSW_PRECISION = BigNumber.from(1e12);
export const END_OF_MANUAL_DIST_BLOCK = 1090674;
export const NECESSARY_ARSW = '189159009460828483008592000';

export * from './time';
