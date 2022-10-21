import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import forEach from 'mocha-each';
import {
  MasterChefMock,
  MasterChef,
  ArthSwapTokenMock,
  ERC20Mock,
  RewarderMock,
  RewarderBrokenMock,
  RewarderBrokenMock__factory,
  ArthSwapTokenMock__factory,
  ERC20Mock__factory,
  MasterChefMock__factory,
  MasterChef__factory,
  RewarderMock__factory,
} from '../types';
import {
  ACC_ARSW_PRECISION,
  ADDRESS_ZERO,
  advanceBlock,
  FIRST_PERIOD_REWERD_SUPPLY,
  ARTHSWAP_ORIGIN_BLOCK,
  BLOCK_PER_PERIOD,
  advanceBlockTo,
  MAX_PERIOD,
  END_OF_MANUAL_DIST_BLOCK,
  NECESSARY_ARSW,
} from './utilities';

describe('MasterChef', () => {
  // @ts-expect-error
  let brokenRewarder: RewarderBrokenMock;
  let arsw: ArthSwapTokenMock;
  let lp: ERC20Mock;
  let dummy: ERC20Mock;
  let chef: MasterChefMock;
  let chefMain: MasterChef;
  let rlp: ERC20Mock;
  let r: ERC20Mock;
  let rewarder: RewarderMock;

  let [alice, bob]: SignerWithAddress[] = [];

  before(async () => {
    [alice, bob] = await ethers.getSigners();
    brokenRewarder = await new RewarderBrokenMock__factory(alice).deploy();
  });

  beforeEach(async () => {
    arsw = await new ArthSwapTokenMock__factory(alice).deploy();
    lp = await new ERC20Mock__factory(alice).deploy(
      'LP Token',
      'LPT',
      parseEther('10'),
    );
    dummy = await new ERC20Mock__factory(alice).deploy(
      'Dummy',
      'DummyT',
      parseEther('10'),
    );
    chef = await new MasterChefMock__factory(alice).deploy(
      arsw.address,
      ARTHSWAP_ORIGIN_BLOCK,
      BLOCK_PER_PERIOD,
    );
    chefMain = await new MasterChef__factory(alice).deploy(arsw.address);
    rlp = await new ERC20Mock__factory(alice).deploy(
      'LP',
      'rLPT',
      parseEther('10'),
    );
    r = await new ERC20Mock__factory(alice).deploy(
      'Reward',
      'RewardT',
      parseEther('100000'),
    );
    rewarder = await new RewarderMock__factory(alice).deploy(
      parseEther('1'),
      r.address,
      chef.address,
    );
    await dummy.approve(chef.address, parseEther('10'));
    await rlp.transfer(bob.address, parseEther('1'));
  });

  describe('getPeriod', () => {
    it('successfully get 1st block of Period-1', async () => {
      const firstBlockOfPeriodOne = 457181;
      const period = await chefMain.getPeriod(firstBlockOfPeriodOne);
      expect(period).to.be.equal(1);
    });

    it('successfully get medium block of Period-1', async () => {
      const blockOfPeriodOne = 500000;
      const period = await chefMain.getPeriod(blockOfPeriodOne);
      expect(period).to.be.equal(1);
    });

    it('successfully get end block of Period-0', async () => {
      const endBlockOfPeriodZero = 457180;
      const period = await chefMain.getPeriod(endBlockOfPeriodZero);
      expect(period).to.be.equal(0);
    });

    it('revert if the blockNumber is lower than the ARTHSWAP_ORIGIN_BLOCK', async () => {
      const blockBeforePeriodZero = 242180;
      await expect(
        chefMain.getPeriod(blockBeforePeriodZero),
      ).to.be.revertedWith(
        'MasterChef: blockNumber should be greater than ARTHSWAP_ORIGIN_BLOCK',
      );
    });
  });

  describe('periodMax', () => {
    it('successfully get max block of Period-0', async () => {
      const expectedBlock = 457180;
      const maxBlock = await chefMain.periodMax(0);
      expect(maxBlock).to.be.equal(expectedBlock);
    });

    it('successfully get max block of Period-1', async () => {
      const expectedBlock = 672180;
      const maxBlock = await chefMain.periodMax(1);
      expect(maxBlock).to.be.equal(expectedBlock);
    });
  });

  describe('PoolLength', () => {
    it('PoolLength should execute', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      expect(await chef.poolLength()).to.be.equal(1);
    });
  });

  describe('Set', () => {
    it('Should emit event LogSetPool', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await expect(chef.set(0, 10, dummy.address, false))
        .to.emit(chef, 'LogSetPool')
        .withArgs(0, 10, rewarder.address, false);
      await expect(chef.set(0, 10, dummy.address, true))
        .to.emit(chef, 'LogSetPool')
        .withArgs(0, 10, dummy.address, true);
    });

    it('Should revert if invalid pool', async () => {
      await expect(chef.set(0, 10, rewarder.address, false)).to.be.revertedWith(
        'MasterChef: invalid pool id',
      );
    });

    it('Should call updateAllPools', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await advanceBlock();
      // added await in expect to make sure that chef.set is called before `poolInfos` query
      await expect(await chef.set(0, 10, dummy.address, false))
        .to.emit(chef, 'LogUpdatePool')
        .withArgs(
          0,
          (
            await chef.poolInfos(0)
          ).lastRewardBlock,
          await rlp.balanceOf(chef.address),
          (
            await chef.poolInfos(0)
          ).accARSWPerShare,
        );
    });
  });

  describe('MassUpdatePools', () => {
    it('Should call updatePool', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await advanceBlock();
      await expect(await chef.massUpdatePools([0]))
        .to.emit(chef, 'LogUpdatePool')
        .withArgs(
          0,
          (
            await chef.poolInfos(0)
          ).lastRewardBlock,
          await rlp.balanceOf(chef.address),
          (
            await chef.poolInfos(0)
          ).accARSWPerShare,
        );
    });

    it('Updating invalid pools should fail', async () => {
      await expect(chef.massUpdatePools([0, 10000, 100000])).to.be.revertedWith(
        'MasterChef: invalid pool id',
      );
    });
  });

  describe('updateAllPools', () => {
    it('Should call updatePool', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await advanceBlock();
      await expect(await chef.updateAllPools())
        .to.emit(chef, 'LogUpdatePool')
        .withArgs(
          0,
          (
            await chef.poolInfos(0)
          ).lastRewardBlock,
          await rlp.balanceOf(chef.address),
          (
            await chef.poolInfos(0)
          ).accARSWPerShare,
        );
    });
  });

  describe('Add', () => {
    it('Should add pool with reward token multiplier', async () => {
      await expect(chef.add(10, rlp.address, rewarder.address))
        .to.emit(chef, 'LogPoolAddition')
        .withArgs(0, 10, rlp.address, rewarder.address);
    });

    it('Should call updateAllPools', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await advanceBlock();
      await expect(await chef.add(10, lp.address, rewarder.address))
        .to.emit(chef, 'LogUpdatePool')
        .withArgs(
          0,
          (
            await chef.poolInfos(0)
          ).lastRewardBlock,
          await rlp.balanceOf(chef.address),
          (
            await chef.poolInfos(0)
          ).accARSWPerShare,
        );
    });

    it('Should reject duplicated LP token', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await expect(
        chef.add(10, rlp.address, rewarder.address),
      ).to.be.revertedWith('MasterChef: duplicate LP token');
    });
    describe('checkPoolDuplicate', () => {
      it('Should be able to detect duplicate LP token', async () => {
        await chef.add(10, rlp.address, rewarder.address);
        // Should be passed without error
        await chef.exposedCheckPoolDuplicate(rewarder.address);
        await expect(
          chef.exposedCheckPoolDuplicate(rlp.address),
        ).to.be.revertedWith('MasterChef: duplicate LP token');
      });
    });
  });

  describe('UpdatePool', () => {
    it('Should revert if invalid pool', async () => {
      await expect(chef.updatePool(0)).to.be.revertedWith(
        'MasterChef: invalid pool id',
      );
    });
    it('Should emit event LogUpdatePool', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await advanceBlock();
      await expect(await chef.updatePool(0))
        .to.emit(chef, 'LogUpdatePool')
        .withArgs(
          0,
          (
            await chef.poolInfos(0)
          ).lastRewardBlock,
          await rlp.balanceOf(chef.address),
          (
            await chef.poolInfos(0)
          ).accARSWPerShare,
        );
    });

    it('Should take else path', async () => {
      const rlp2: ERC20Mock = await new ERC20Mock__factory(alice).deploy(
        'LP2',
        'rLP2T',
        parseEther('10'),
      );
      await chef.add(10, rlp.address, rewarder.address);
      await chef.add(10, rlp2.address, rewarder.address);
      await advanceBlock();
      await expect(
        await chef.batch(
          [
            chef.interface.encodeFunctionData('updatePool', [0]),
            chef.interface.encodeFunctionData('updatePool', [1]),
          ],
          true,
        ),
      )
        .to.emit(chef, 'LogUpdatePool')
        .withArgs(
          0,
          (
            await chef.poolInfos(0)
          ).lastRewardBlock,
          await rlp.balanceOf(chef.address),
          (
            await chef.poolInfos(0)
          ).accARSWPerShare,
        )
        .to.emit(chef, 'LogUpdatePool')
        .withArgs(
          1,
          (
            await chef.poolInfos(1)
          ).lastRewardBlock,
          await rlp2.balanceOf(chef.address),
          (
            await chef.poolInfos(1)
          ).accARSWPerShare,
        );
    });
  });

  describe('ARSWPerBlock', () => {
    it('Return correct amount of period-0', async () => {
      expect(await chef.ARSWPerBlock(0)).to.be.equal('151629858171523000000');
    });
    it('Return correct amount of period-1', async () => {
      expect(await chef.ARSWPerBlock(1)).to.be.equal('136466872354370700000');
    });

    it('Return correct amount of period-23', async () => {
      expect(await chef.ARSWPerBlock(23)).to.be.equal('13438860500658934856');
    });

    it('Return amount 0 of period-24', async () => {
      expect(await chef.ARSWPerBlock(24)).to.be.equal('0');
    });
  });

  describe('CalculateAdditionalAccARSWPerShare', () => {
    it('revert if lpSupply is 0', async () => {
      await expect(
        chef.calculateAdditionalAccARSWPerShareTest(
          0,
          ARTHSWAP_ORIGIN_BLOCK,
          1,
          ARTHSWAP_ORIGIN_BLOCK + 1,
          0,
        ),
      ).to.be.revertedWith('MasterChef: lpSupply should be greater than 0');
    });

    const getFirstBlock = (period: number): number => {
      return ARTHSWAP_ORIGIN_BLOCK + BLOCK_PER_PERIOD * period;
    };
    const baseExpected = FIRST_PERIOD_REWERD_SUPPLY.mul(ACC_ARSW_PRECISION);
    const expectedPeriod1 = baseExpected.mul(9).div(10);
    forEach([
      [0, getFirstBlock(0), getFirstBlock(0) + 1, 1, 1, 1, baseExpected], // base
      [1, getFirstBlock(0), getFirstBlock(0) + 1, 1, 1, 1, baseExpected], // should be independent to accARSWPerShare

      // pattern by lastRewardBlock and currentBlock
      [0, getFirstBlock(0) + 1, getFirstBlock(0) + 2, 1, 1, 1, baseExpected], // should be same to base
      [0, getFirstBlock(0), getFirstBlock(0) + 2, 1, 1, 1, baseExpected.mul(2)], // should be 2x greater than the base
      [0, getFirstBlock(1), getFirstBlock(1) + 1, 1, 1, 1, expectedPeriod1], // should be lower than base by 9/10
      [
        0,
        getFirstBlock(0),
        getFirstBlock(1),
        1,
        1,
        1,
        baseExpected.mul(BLOCK_PER_PERIOD - 1).add(expectedPeriod1),
      ], // should be blockReward(period-0) * (BLOCK_PER_PERIOD - 1) + blockReward(period-1) greater than the base
      [0, getFirstBlock(24), getFirstBlock(24) + 1, 1, 1, 1, 0], // after MAX_PERIOD => should be 0

      // pattern by ratio of allocPoint:totalAllocPoint
      [0, getFirstBlock(0), getFirstBlock(0) + 1, 2, 2, 1, baseExpected], // same ratio => should be same to base
      [0, getFirstBlock(0), getFirstBlock(0) + 1, 1, 2, 1, baseExpected.div(2)], // 1/2 ratio  => should be half to base

      [0, getFirstBlock(0), getFirstBlock(0) + 1, 1, 1, 2, baseExpected.div(2)], // 2x lpSupply => should be half to base
    ]).it(
      'accARSWPerShare: %f, lastRewardBlock: %f, currentBlock: %f, allocPoint: %f, totalAllocPoint: %f, lpSupply: %f,',
      async (
        accArswPerShare: number,
        lastRewardBlock: number,
        currentBlock: number,
        allocPoint: number,
        totalAllocPoint: number,
        lpSupply: number,
        expectedAdditionalAccArswPerShare: number,
      ) => {
        const tx = await chef.setTotalAllocPoint(totalAllocPoint);
        await tx.wait();

        expect(
          await chef.calculateAdditionalAccARSWPerShareTest(
            accArswPerShare,
            lastRewardBlock,
            allocPoint,
            currentBlock,
            lpSupply,
          ),
        ).to.be.equal(BigNumber.from(expectedAdditionalAccArswPerShare));
      },
    );
  });

  describe('PendingARSW', () => {
    it('Should revert if invalid pool', async () => {
      await expect(chef.pendingARSW(0, alice.address)).to.be.revertedWith(
        'MasterChef: invalid pool id',
      );
    });
    it('PendingARSW should equal ExpectedARSW', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await rlp.approve(chef.address, parseEther('10'));
      const lpAmount = 12340143;
      const log = await (await chef.deposit(0, lpAmount, alice.address)).wait();

      // Set the origin block to the block time when deposit processed
      await chef.setOriginBlock(log.blockNumber);

      await advanceBlock();
      const log2 = await (await chef.updatePool(0)).wait();

      const expectedArsw = (
        await chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      const pendingArsw = await chef.pendingARSW(0, alice.address);
      expect(pendingArsw).to.be.equal(expectedArsw);
    });
    it('When block is lastRewardBlock', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await rlp.approve(chef.address, parseEther('10'));
      const lpAmount = parseEther('1');
      const log = await (await chef.deposit(0, lpAmount, alice.address)).wait();
      const expectedArsw = 0;

      const pendingArsw = await chef.pendingARSW(0, alice.address);
      expect(log.blockNumber).to.be.equal(
        (await chef.poolInfos(0)).lastRewardBlock,
      );
      expect(pendingArsw).to.be.equal(expectedArsw);
    });
    it('When a period is passed from the lastRewardBlock', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await rlp.approve(chef.address, parseEther('10'));
      const lpAmount = 12340143;
      const log = await (await chef.deposit(0, lpAmount, alice.address)).wait();

      // Set the origin block to the block time when deposit processed
      await chef.setOriginBlock(log.blockNumber);

      await advanceBlockTo(log.blockNumber + BLOCK_PER_PERIOD);

      const expectedArsw = (
        await chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log.blockNumber + BLOCK_PER_PERIOD,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      const pendingArsw = await chef.pendingARSW(0, alice.address);
      expect(pendingArsw).to.be.equal(expectedArsw);
    });
    it('When the period exceeded MAX_PERIOD', async () => {
      const log = await (
        await chef.add(10, rlp.address, rewarder.address)
      ).wait();
      await rlp.approve(chef.address, parseEther('10'));
      const lpAmount = 12340143;

      // Set the origin block to the block time when add processed
      await chef.setOriginBlock(log.blockNumber);

      await advanceBlockTo(
        (MAX_PERIOD + 1) * BLOCK_PER_PERIOD + log.blockNumber,
      );

      await chef.deposit(0, lpAmount, alice.address);

      await advanceBlock();
      const expectedArsw = 0;
      const pendingArsw = await chef.pendingARSW(0, alice.address);
      expect(pendingArsw).to.be.equal(expectedArsw);
    });
    it('When the user has not depoited any', async () => {
      const log = await (
        await chef.add(10, rlp.address, rewarder.address)
      ).wait();
      await rlp.approve(chef.address, parseEther('10'));

      // Set the origin block to the block time when add processed
      await chef.setOriginBlock(log.blockNumber);

      await advanceBlock();

      const expectedArsw = 0;
      const pendingArsw = await chef.pendingARSW(0, alice.address);
      expect(pendingArsw).to.be.equal(expectedArsw);
    });
  });
  describe('Deposit', () => {
    it('Depositing 0 amount', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await rlp.approve(chef.address, parseEther('10'));
      await expect(chef.deposit(0, parseEther('0'), alice.address))
        .to.emit(chef, 'Deposit')
        .withArgs(alice.address, 0, parseEther('0'), alice.address);
    });

    it('successfully deposit 10 amount', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await rlp.approve(chef.address, parseEther('10'));
      const tx = chef.connect(alice).deposit(0, 10, alice.address);
      await expect(() => tx).to.changeTokenBalances(
        rlp,
        [alice, chef],
        [-10, 10],
      );
      await expect(tx)
        .to.emit(chef, 'Deposit')
        .withArgs(alice.address, 0, 10, alice.address);
    });

    it('Depositing into non-existent pool should fail', async () => {
      await expect(
        chef.deposit(0, parseEther('0'), alice.address),
      ).to.be.revertedWith('MasterChef: invalid pool id');
    });
  });

  describe('Withdraw', () => {
    it('Should revert if invalid pool', async () => {
      await expect(
        chef.withdraw(0, parseEther('0'), alice.address),
      ).to.be.revertedWith('MasterChef: invalid pool id');
    });
    it('reverts if withdraw 0 amount', async () => {
      await chef.add(10, rlp.address, rewarder.address);
      await expect(
        chef.withdraw(0, parseEther('0'), alice.address),
      ).to.be.revertedWith('amount should not be 0');
    });
    it('successfuly withdraw 10 amount', async () => {
      await advanceBlockTo(ARTHSWAP_ORIGIN_BLOCK);
      await chef.add(10, rlp.address, rewarder.address);
      await rlp.approve(chef.address, parseEther('10'));
      await chef.deposit(0, 10, alice.address);
      const tx = chef.connect(alice).withdraw(0, 10, alice.address);
      await expect(() => tx).to.changeTokenBalances(
        rlp,
        [alice, chef],
        [10, -10],
      );
      await expect(tx)
        .to.emit(chef, 'Withdraw')
        .withArgs(alice.address, 0, 10, alice.address);
    });
  });

  describe('Harvest', () => {
    it('Should revert if invalid pool', async () => {
      await expect(chef.harvest(0, alice.address)).to.be.revertedWith(
        'MasterChef: invalid pool id',
      );
    });
    it('Should give back the correct amount of ARSW and reward', async () => {
      await r.transfer(rewarder.address, parseEther('100000'));
      await chef.add(10, rlp.address, rewarder.address);
      await rlp.approve(chef.address, parseEther('10'));
      expect(await chef.lpTokens(0)).to.be.equal(rlp.address);
      const lpAmount = parseEther('1');
      const log = await (await chef.deposit(0, lpAmount, alice.address)).wait();
      await chef.setOriginBlock(log.blockNumber);
      await advanceBlockTo(log.blockNumber + 5);
      await arsw.mint(chef.address, parseEther('100000'));
      const log2 = await (
        await chef.withdraw(0, lpAmount, alice.address)
      ).wait();
      const expectedArsw = (
        await chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      expect((await chef.userInfos(0, alice.address)).rewardDebt).to.be.equal(
        '-' + expectedArsw,
      );
      const tx = await chef.harvest(0, alice.address);
      await tx.wait();
      await expect(tx)
        .to.emit(chef, 'Harvest')
        .withArgs(alice.address, 0, expectedArsw);
      expect(await arsw.balanceOf(alice.address))
        .to.be.equal(await r.balanceOf(alice.address))
        .to.be.equal(expectedArsw);
    });

    it('Harvest with empty user balance', async () => {
      const previousArswBalance = await arsw.balanceOf(alice.address);
      await chef.add(10, rlp.address, rewarder.address);
      await chef.harvest(0, alice.address);
      expect(await arsw.balanceOf(alice.address)).to.be.equal(
        previousArswBalance,
      );
    });

    it('Harvest for ARSW-only pool', async () => {
      await chef.add(10, rlp.address, ADDRESS_ZERO);
      await rlp.approve(chef.address, parseEther('10'));
      expect(await chef.lpTokens(0)).to.be.equal(rlp.address);
      const lpAmount = parseEther('1');
      const log = await (await chef.deposit(0, lpAmount, alice.address)).wait();
      await advanceBlock();
      await arsw.mint(chef.address, parseEther('100000'));
      const log2 = await (
        await chef.withdraw(0, lpAmount, alice.address)
      ).wait();
      const expectedArsw = (
        await chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      expect((await chef.userInfos(0, alice.address)).rewardDebt).to.be.equal(
        '-' + expectedArsw,
      );
      await chef.harvest(0, alice.address);
      expect(await arsw.balanceOf(alice.address)).to.be.equal(expectedArsw);
    });
  });

  describe('WithdrawAndHarvest', () => {
    it('Should revert if invalid pool', async () => {
      await expect(
        chef.withdrawAndHarvest(0, parseEther('1'), alice.address),
      ).to.be.revertedWith('MasterChef: invalid pool id');
    });
    it('should withdraw and harvest at the same time', async () => {
      await r.transfer(rewarder.address, parseEther('100000'));
      await chef.add(10, rlp.address, rewarder.address);
      await rlp.approve(chef.address, parseEther('10'));
      expect(await chef.lpTokens(0)).to.be.equal(rlp.address);
      const lpAmount = parseEther('1');
      const log = await (await chef.deposit(0, lpAmount, alice.address)).wait();
      await chef.setOriginBlock(log.blockNumber);
      await arsw.mint(chef.address, parseEther('100000'));
      await advanceBlockTo(log.blockNumber + 5);
      const tx = chef
        .connect(alice)
        .withdrawAndHarvest(0, lpAmount, alice.address);
      await expect(() => tx).to.changeTokenBalances(
        rlp,
        [alice, chef],
        [lpAmount, '-' + lpAmount],
      );
      const log2 = await (await tx).wait();
      const expectedArsw = (
        await chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      await expect(tx)
        .to.emit(chef, 'Withdraw')
        .withArgs(alice.address, 0, lpAmount, alice.address)
        .to.emit(chef, 'Harvest')
        .withArgs(alice.address, 0, expectedArsw);
      expect((await chef.userInfos(0, alice.address)).rewardDebt).to.be.equal(
        0,
      );
      expect(await arsw.balanceOf(alice.address))
        .to.be.equal(await r.balanceOf(alice.address))
        .to.be.equal(expectedArsw);
    });
    it('should work as harvest if withdrawal amount is 0', async () => {
      await r.transfer(rewarder.address, parseEther('100000'));
      await chef.add(10, rlp.address, rewarder.address);
      await rlp.approve(chef.address, parseEther('10'));
      expect(await chef.lpTokens(0)).to.be.equal(rlp.address);
      const lpAmount = parseEther('1');
      const log = await (await chef.deposit(0, lpAmount, alice.address)).wait();
      await chef.setOriginBlock(log.blockNumber);
      await advanceBlockTo(log.blockNumber + 5);
      await arsw.mint(chef.address, parseEther('100000'));
      const tx = await chef.withdrawAndHarvest(
        0,
        parseEther('0'),
        alice.address,
      );
      const log2 = await tx.wait();
      const expectedArsw = (
        await chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      expect((await chef.userInfos(0, alice.address)).rewardDebt).to.be.equal(
        expectedArsw,
      );
      await expect(tx)
        .to.emit(chef, 'Withdraw')
        .withArgs(alice.address, 0, parseEther('0'), alice.address)
        .to.emit(chef, 'Harvest')
        .withArgs(alice.address, 0, expectedArsw);
      expect(await arsw.balanceOf(alice.address))
        .to.be.equal(await r.balanceOf(alice.address))
        .to.be.equal(expectedArsw);
    });
    it('should work also when no rewarder', async () => {
      await chef.add(10, rlp.address, ADDRESS_ZERO);
      await rlp.approve(chef.address, parseEther('10'));
      expect(await chef.lpTokens(0)).to.be.equal(rlp.address);
      const lpAmount = parseEther('1');
      const log = await (await chef.deposit(0, lpAmount, alice.address)).wait();
      await chef.setOriginBlock(log.blockNumber);
      await advanceBlockTo(log.blockNumber + 5);
      await arsw.mint(chef.address, parseEther('100000'));
      const tx = chef.withdrawAndHarvest(0, lpAmount, alice.address);
      const log2 = await (await tx).wait();
      const expectedArsw = (
        await chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      expect((await chef.userInfos(0, alice.address)).rewardDebt).to.be.equal(
        0,
      );
      await expect(tx)
        .to.emit(chef, 'Withdraw')
        .withArgs(alice.address, 0, lpAmount, alice.address)
        .to.emit(chef, 'Harvest')
        .withArgs(alice.address, 0, expectedArsw);
      expect(await arsw.balanceOf(alice.address)).to.be.equal(expectedArsw);
    });
  });

  describe('EmergencyWithdraw', () => {
    it('Should revert if invalid pool', async () => {
      await expect(chef.emergencyWithdraw(0, alice.address)).to.be.revertedWith(
        'MasterChef: invalid pool id',
      );
    });
    it('Should emit event EmergencyWithdraw', async () => {
      const lpAmount = parseEther('1');
      await r.transfer(rewarder.address, parseEther('100000'));
      await chef.add(10, rlp.address, rewarder.address);
      await rlp.approve(chef.address, parseEther('10'));
      await chef.deposit(0, lpAmount, bob.address);
      await expect(chef.connect(bob).emergencyWithdraw(0, bob.address))
        .to.emit(chef, 'EmergencyWithdraw')
        .withArgs(bob.address, 0, lpAmount, bob.address);
    });
    it('Should work even if no rewarder', async () => {
      const lpAmount = parseEther('1');
      await chef.add(10, rlp.address, ADDRESS_ZERO);
      await rlp.approve(chef.address, parseEther('10'));
      await chef.deposit(0, lpAmount, bob.address);
      const tx = chef.connect(bob).emergencyWithdraw(0, bob.address);
      await expect(() => tx).to.changeTokenBalances(
        rlp,
        [bob, chef],
        [lpAmount, '-' + lpAmount],
      );
      await expect(tx)
        .to.emit(chef, 'EmergencyWithdraw')
        .withArgs(bob.address, 0, lpAmount, bob.address);
    });
  });

  describe('depositARSW', () => {
    it('reverts if msg.sender is not owner', async () => {
      await arsw.mint(bob.address, parseEther('100000'));
      await arsw.connect(bob).approve(chef.address, 10);
      await expect(chef.connect(bob).depositARSW(10)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('reverts if deposit 0 amount', async () => {
      await expect(chef.depositARSW(0)).to.be.revertedWith(
        'MasterChef: amount should be greater than 0',
      );
    });
    it('successfully deposit 10 amount', async () => {
      const depositAmount = parseEther('10');
      await arsw.mint(alice.address, parseEther('100000'));
      await arsw.approve(chef.address, depositAmount);
      const tx = chef.connect(alice).depositARSW(depositAmount);
      await expect(() => tx).to.changeTokenBalances(
        arsw,
        [alice, chef],
        ['-' + depositAmount, depositAmount],
      );
      const txResponse = await (await tx).wait();
      await expect(tx)
        .to.emit(chef, 'DepositARSW')
        .withArgs(txResponse.blockNumber, depositAmount);
    });
  });

  describe('calculateNecessaryARSW', () => {
    const ORIGIN_BLOCK = 242181;
    const BLOCK_PERIOD = 215000;
    beforeEach(async () => {
      await chef.setOriginBlock(ORIGIN_BLOCK);
      await chef.setBlockPeriod(BLOCK_PERIOD);
      await chef.setTotalAllocPoint(1);
    });
    it('should calculate to approximately 300,000,000 for whole emission', async () => {
      expect(
        (await chef.calculateNecessaryARSW(ORIGIN_BLOCK))
          .add(
            await chef.ARSWPerBlock(0), // since the initial block's emission isn't counted
          )
          .sub('300000000000000000000000000'),
      ).lte(parseEther('0.1')); // the difference should be less than 0.1 ARSW
    });
    it('should calculate the same emission from that of MasterChef', async () => {
      expect(
        (
          await chef.calculateAdditionalAccARSWPerShareTest(
            0,
            ORIGIN_BLOCK,
            1,
            ORIGIN_BLOCK + 30 * BLOCK_PERIOD,
            1,
          )
        ).div(ACC_ARSW_PRECISION),
      ).to.equal(await chef.calculateNecessaryARSW(ORIGIN_BLOCK));
    });
    it('should calculate the emission for arbitrary period correctly', async () => {
      // Final period
      const beginningOfFinal = 5187181;
      const lastBlock = beginningOfFinal - 1;
      expect(
        (
          await chef.calculateAdditionalAccARSWPerShareTest(
            0,
            lastBlock,
            1,
            beginningOfFinal + BLOCK_PERIOD,
            1,
          )
        ).div(ACC_ARSW_PRECISION),
      ).to.equal(await chef.calculateNecessaryARSW(lastBlock));
    });
    it('should calculate necessary ARSW amount for MasterChef', async () => {
      expect(
        await chef.calculateNecessaryARSW(END_OF_MANUAL_DIST_BLOCK),
      ).to.equal(NECESSARY_ARSW);
    });
  });
});
