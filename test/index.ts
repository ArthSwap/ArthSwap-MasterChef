import {
  ACC_ARSW_PRECISION,
  ADDRESS_ZERO,
  advanceBlock,
  advanceBlockTo,
  ARTHSWAP_ORIGIN_BLOCK,
  BLOCK_PER_PERIOD,
  deploy,
  FIRST_PERIOD_REWERD_SUPPLY,
  getBigNumber,
  MAX_PERIOD,
  prepare,
} from './utilities';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import forEach from 'mocha-each';

describe('MasterChef', function () {
  before(async function () {
    await prepare(this, [
      'MasterChefMock',
      'MasterChef',
      'ArthSwapTokenMock',
      'ERC20Mock',
      'RewarderMock',
      'RewarderBrokenMock',
    ]);
    await deploy(this, [['brokenRewarder', this.RewarderBrokenMock]]);
  });

  beforeEach(async function () {
    await deploy(this, [['arsw', this.ArthSwapTokenMock]]);

    await deploy(this, [
      ['lp', this.ERC20Mock, ['LP Token', 'LPT', getBigNumber(10)]],
      ['dummy', this.ERC20Mock, ['Dummy', 'DummyT', getBigNumber(10)]],
    ]);

    await deploy(this, [
      [
        'chef',
        this.MasterChefMock,
        [this.arsw.address, ARTHSWAP_ORIGIN_BLOCK, BLOCK_PER_PERIOD],
      ],
      ['chefMain', this.MasterChef, [this.arsw.address]],
      ['rlp', this.ERC20Mock, ['LP', 'rLPT', getBigNumber(10)]],
      ['r', this.ERC20Mock, ['Reward', 'RewardT', getBigNumber(100000)]],
    ]);
    await deploy(this, [
      [
        'rewarder',
        this.RewarderMock,
        [getBigNumber(1), this.r.address, this.chef.address],
      ],
    ]);
    await this.dummy.approve(this.chef.address, getBigNumber(10));
    await this.rlp.transfer(this.bob.address, getBigNumber(1));
  });

  describe('getPeriod', function () {
    it('successfully get 1st block of Period-1', async function () {
      const firstBlockOfPeriodOne = 457181;
      const period = await this.chefMain.getPeriod(firstBlockOfPeriodOne);
      expect(period).to.be.equal(1);
    });

    it('successfully get medium block of Period-1', async function () {
      const blockOfPeriodOne = 500000;
      const period = await this.chefMain.getPeriod(blockOfPeriodOne);
      expect(period).to.be.equal(1);
    });

    it('successfully get end block of Period-0', async function () {
      const endBlockOfPeriodZero = 457180;
      const period = await this.chefMain.getPeriod(endBlockOfPeriodZero);
      expect(period).to.be.equal(0);
    });

    it('revert if the blockNumber is lower than the ARTHSWAP_ORIGIN_BLOCK', async function () {
      const blockBeforePeriodZero = 242180;
      await expect(
        this.chefMain.getPeriod(blockBeforePeriodZero),
      ).to.be.revertedWith(
        'MasterChef: blockNumber should be greater than ARTHSWAP_ORIGIN_BLOCK',
      );
    });
  });

  describe('periodMax', function () {
    it('successfully get max block of Period-0', async function () {
      const expectedBlock = 457180;
      const maxBlock = await this.chefMain.periodMax(0);
      expect(maxBlock).to.be.equal(expectedBlock);
    });

    it('successfully get max block of Period-1', async function () {
      const expectedBlock = 672180;
      const maxBlock = await this.chefMain.periodMax(1);
      expect(maxBlock).to.be.equal(expectedBlock);
    });
  });

  describe('PoolLength', function () {
    it('PoolLength should execute', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      expect(await this.chef.poolLength()).to.be.equal(1);
    });
  });

  describe('Set', function () {
    it('Should emit event LogSetPool', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await expect(this.chef.set(0, 10, this.dummy.address, false))
        .to.emit(this.chef, 'LogSetPool')
        .withArgs(0, 10, this.rewarder.address, false);
      await expect(this.chef.set(0, 10, this.dummy.address, true))
        .to.emit(this.chef, 'LogSetPool')
        .withArgs(0, 10, this.dummy.address, true);
    });

    it('Should revert if invalid pool', async function () {
      expect(
        await this.chef
          .set(0, 10, this.rewarder.address, false)
          .catch((error: Error) => error.message),
      ).to.equal('VM Exception while processing transaction: invalid opcode');
    });
  });

  describe('ARSWPerBlock', function () {
    it('Return correct amount of period-0', async function () {
      expect(await this.chef.ARSWPerBlock(0)).to.be.equal(
        '151629858171523000000',
      );
    });
    it('Return correct amount of period-1', async function () {
      expect(await this.chef.ARSWPerBlock(1)).to.be.equal(
        '136466872354370700000',
      );
    });

    it('Return correct amount of period-23', async function () {
      expect(await this.chef.ARSWPerBlock(23)).to.be.equal(
        '13438860500658934856',
      );
    });

    it('Return amount 0 of period-24', async function () {
      expect(await this.chef.ARSWPerBlock(24)).to.be.equal('0');
    });
  });

  describe('CalculateAdditionalAccARSWPerShare', function () {
    it('revert if lpSupply is 0', async function () {
      await expect(
        this.chef.calculateAdditionalAccARSWPerShareTest(
          0,
          ARTHSWAP_ORIGIN_BLOCK,
          1,
          ARTHSWAP_ORIGIN_BLOCK + 1,
          0,
        ),
      ).to.be.revertedWith('MasterChef: lpSupply should be greater than 0');
    });

    function getFirstBlock(period: number): number {
      return ARTHSWAP_ORIGIN_BLOCK + BLOCK_PER_PERIOD * period;
    }
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
      async function (
        accArswPerShare: number,
        lastRewardBlock: number,
        currentBlock: number,
        allocPoint: number,
        totalAllocPoint: number,
        lpSupply: number,
        expectedAdditionalAccArswPerShare: number,
      ) {
        const tx = await this.chef.setTotalAllocPoint(totalAllocPoint);
        await tx.wait();

        expect(
          await this.chef.calculateAdditionalAccARSWPerShareTest(
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

  describe('PendingARSW', function () {
    it('PendingARSW should equal ExpectedARSW', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      const lpAmount = 12340143;
      const log = await this.chef.deposit(0, lpAmount, this.alice.address);

      // Set the origin block to the block time when deposit processed
      await this.chef.setOriginBlock(log.blockNumber);

      await advanceBlock();
      const log2 = await this.chef.updatePool(0);

      const expectedArsw = (
        await this.chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      const pendingArsw = await this.chef.pendingARSW(0, this.alice.address);
      expect(pendingArsw).to.be.equal(expectedArsw);
    });
    it('When block is lastRewardBlock', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      const lpAmount = getBigNumber(1);
      await this.chef.deposit(0, lpAmount, this.alice.address);
      const expectedArsw = 0;

      const pendingArsw = await this.chef.pendingARSW(0, this.alice.address);
      expect(pendingArsw).to.be.equal(expectedArsw);
    });
    it('When a period is passed from the lastRewardBlock', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      const lpAmount = 12340143;
      const log = await this.chef.deposit(0, lpAmount, this.alice.address);

      // Set the origin block to the block time when deposit processed
      await this.chef.setOriginBlock(log.blockNumber);

      await advanceBlockTo(log.blockNumber + BLOCK_PER_PERIOD);

      const expectedArsw = (
        await this.chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log.blockNumber + BLOCK_PER_PERIOD,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      const pendingArsw = await this.chef.pendingARSW(0, this.alice.address);
      expect(pendingArsw).to.be.equal(expectedArsw);
    });
    it('When the period exceeded MAX_PERIOD', async function () {
      const log = await this.chef.add(
        10,
        this.rlp.address,
        this.rewarder.address,
      );
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      const lpAmount = 12340143;

      // Set the origin block to the block time when deposit processed
      await this.chef.setOriginBlock(0);

      await advanceBlockTo(MAX_PERIOD * BLOCK_PER_PERIOD - log.blockNumber);

      await this.chef.deposit(0, lpAmount, this.alice.address);

      await advanceBlock();

      const expectedArsw = 0;
      const pendingArsw = await this.chef.pendingARSW(0, this.alice.address);
      expect(pendingArsw).to.be.equal(expectedArsw);
    });
    it('When the user has not depoited any', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));

      // Set the origin block to the block time when deposit processed
      await this.chef.setOriginBlock(0);

      await advanceBlock();

      const expectedArsw = 0;
      const pendingArsw = await this.chef.pendingARSW(0, this.alice.address);
      expect(pendingArsw).to.be.equal(expectedArsw);
    });
  });

  describe('MassUpdatePools', function () {
    it('Should call updatePool', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await advanceBlockTo(1);
      await expect(this.chef.massUpdatePools([0]))
        .to.emit(this.chef, 'LogUpdatePool')
        .withArgs(
          0,
          (
            await this.chef.poolInfos(0)
          ).lastRewardBlock,
          await this.rlp.balanceOf(this.chef.address),
          (
            await this.chef.poolInfos(0)
          ).accARSWPerShare,
        );
    });

    it('Updating invalid pools should fail', async function () {
      expect(
        await this.chef
          .massUpdatePools([0, 10000, 100000])
          .catch((error: Error) => error.message),
      ).to.equal('VM Exception while processing transaction: invalid opcode');
    });
  });

  describe('Add', function () {
    it('Should add pool with reward token multiplier', async function () {
      await expect(this.chef.add(10, this.rlp.address, this.rewarder.address))
        .to.emit(this.chef, 'LogPoolAddition')
        .withArgs(0, 10, this.rlp.address, this.rewarder.address);
    });
  });

  describe('UpdatePool', function () {
    it('Should emit event LogUpdatePool', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await advanceBlockTo(1);
      await expect(this.chef.updatePool(0))
        .to.emit(this.chef, 'LogUpdatePool')
        .withArgs(
          0,
          (
            await this.chef.poolInfos(0)
          ).lastRewardBlock,
          await this.rlp.balanceOf(this.chef.address),
          (
            await this.chef.poolInfos(0)
          ).accARSWPerShare,
        );
    });

    it('Should take else path', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await advanceBlockTo(1);
      await this.chef.batch(
        [
          this.chef.interface.encodeFunctionData('updatePool', [0]),
          this.chef.interface.encodeFunctionData('updatePool', [0]),
        ],
        true,
      );
    });
  });

  describe('Deposit', function () {
    it('Depositing 0 amount', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      await expect(this.chef.deposit(0, getBigNumber(0), this.alice.address))
        .to.emit(this.chef, 'Deposit')
        .withArgs(this.alice.address, 0, 0, this.alice.address);
    });

    it('successfuly deposit 10 amount', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      const tx = this.chef
        .connect(this.alice)
        .deposit(0, 10, this.alice.address);
      await expect(() => tx).to.changeTokenBalances(
        this.rlp,
        [this.alice, this.chef],
        [-10, 10],
      );
      await expect(tx)
        .to.emit(this.chef, 'Deposit')
        .withArgs(this.alice.address, 0, 10, this.alice.address);
    });

    it('Depositing into non-existent pool should fail', async function () {
      expect(
        await this.chef
          .deposit(1001, getBigNumber(0), this.alice.address)
          .catch((error: Error) => error.message),
      ).to.equal('VM Exception while processing transaction: invalid opcode');
    });
  });

  describe('Withdraw', function () {
    it('reverts if withdraw 0 amount', async function () {
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await expect(
        this.chef.withdraw(0, getBigNumber(0), this.alice.address),
      ).to.be.revertedWith('amount should not be 0');
    });
    it('successfuly withdraw 10 amount', async function () {
      await advanceBlockTo(ARTHSWAP_ORIGIN_BLOCK);
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      await this.chef.deposit(0, 10, this.alice.address);
      const tx = this.chef
        .connect(this.alice)
        .withdraw(0, 10, this.alice.address);
      await expect(() => tx).to.changeTokenBalances(
        this.rlp,
        [this.alice, this.chef],
        [10, -10],
      );
      await expect(tx)
        .to.emit(this.chef, 'Withdraw')
        .withArgs(this.alice.address, 0, 10, this.alice.address);
    });
  });

  describe('Harvest', function () {
    it('Should give back the correct amount of ARSW and reward', async function () {
      await this.r.transfer(this.rewarder.address, getBigNumber(100000));
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      expect(await this.chef.lpTokens(0)).to.be.equal(this.rlp.address);
      const lpAmount = getBigNumber(1);
      const log = await this.chef.deposit(0, lpAmount, this.alice.address);
      await this.chef.setOriginBlock(log.blockNumber);
      await advanceBlockTo(log.blockNumber + 5);
      await this.arsw.mint(this.chef.address, getBigNumber(100000));
      await this.arsw.approve(this.alice.address, getBigNumber(100000));
      const log2 = await this.chef.withdraw(0, lpAmount, this.alice.address);
      const expectedArsw = (
        await this.chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      expect(
        (await this.chef.userInfos(0, this.alice.address)).rewardDebt,
      ).to.be.equal('-' + expectedArsw);
      await this.chef.harvest(0, this.alice.address);
      expect(await this.arsw.balanceOf(this.alice.address))
        .to.be.equal(await this.r.balanceOf(this.alice.address))
        .to.be.equal(expectedArsw);
    });

    it('Harvest with empty user balance', async function () {
      const previousArswBalance = await this.arsw.balanceOf(this.alice.address);
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.chef.harvest(0, this.alice.address);
      expect(await this.arsw.balanceOf(this.alice.address)).to.be.equal(
        previousArswBalance,
      );
    });

    it('Harvest for ARSW-only pool', async function () {
      await this.chef.add(10, this.rlp.address, ADDRESS_ZERO);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      expect(await this.chef.lpTokens(0)).to.be.equal(this.rlp.address);
      const lpAmount = getBigNumber(1);
      const log = await this.chef.deposit(0, lpAmount, this.alice.address);
      await advanceBlock();
      await this.arsw.mint(this.chef.address, getBigNumber(100000));
      await this.arsw.approve(this.alice.address, getBigNumber(100000));
      const log2 = await this.chef.withdraw(0, lpAmount, this.alice.address);
      const expectedArsw = (
        await this.chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      expect(
        (await this.chef.userInfos(0, this.alice.address)).rewardDebt,
      ).to.be.equal('-' + expectedArsw);
      await this.chef.harvest(0, this.alice.address);
      expect(await this.arsw.balanceOf(this.alice.address)).to.be.equal(
        expectedArsw,
      );
    });
  });

  describe('WithdrawAndHarvest', function () {
    it('should withdraw and harvest at the same time', async function () {
      await this.r.transfer(this.rewarder.address, getBigNumber(100000));
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      expect(await this.chef.lpTokens(0)).to.be.equal(this.rlp.address);
      const lpAmount = getBigNumber(1);
      const log = await this.chef.deposit(0, lpAmount, this.alice.address);
      await this.chef.setOriginBlock(log.blockNumber);
      await this.arsw.mint(this.chef.address, getBigNumber(100000));
      await this.arsw.approve(this.alice.address, getBigNumber(100000));
      await advanceBlockTo(log.blockNumber + 5);
      const tx = this.chef
        .connect(this.alice)
        .withdrawAndHarvest(0, lpAmount, this.alice.address);
      await expect(() => tx).to.changeTokenBalances(
        this.rlp,
        [this.alice, this.chef],
        [lpAmount, '-' + lpAmount],
      );
      const log2 = await tx;
      const expectedArsw = (
        await this.chef.calculateAdditionalAccARSWPerShareTest(
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
        .to.emit(this.chef, 'Withdraw')
        .withArgs(this.alice.address, 0, lpAmount, this.alice.address)
        .to.emit(this.chef, 'Harvest')
        .withArgs(this.alice.address, 0, expectedArsw);
      expect(
        (await this.chef.userInfos(0, this.alice.address)).rewardDebt,
      ).to.be.equal(0);
      expect(await this.arsw.balanceOf(this.alice.address))
        .to.be.equal(await this.r.balanceOf(this.alice.address))
        .to.be.equal(expectedArsw);
    });
    it('should work as harvest if withdral amount is 0', async function () {
      await this.r.transfer(this.rewarder.address, getBigNumber(100000));
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      expect(await this.chef.lpTokens(0)).to.be.equal(this.rlp.address);
      const lpAmount = getBigNumber(1);
      const log = await this.chef.deposit(0, lpAmount, this.alice.address);
      await this.chef.setOriginBlock(log.blockNumber);
      await advanceBlockTo(log.blockNumber + 5);
      await this.arsw.mint(this.chef.address, getBigNumber(100000));
      await this.arsw.approve(this.alice.address, getBigNumber(100000));
      const log2 = await this.chef.withdraw(0, lpAmount, this.alice.address);
      const expectedArsw = (
        await this.chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      expect(
        (await this.chef.userInfos(0, this.alice.address)).rewardDebt,
      ).to.be.equal('-' + expectedArsw);
      await expect(this.chef.withdrawAndHarvest(0, 0, this.alice.address))
        .to.emit(this.chef, 'Withdraw')
        .withArgs(this.alice.address, 0, 0, this.alice.address)
        .to.emit(this.chef, 'Harvest')
        .withArgs(this.alice.address, 0, expectedArsw);
      expect(await this.arsw.balanceOf(this.alice.address))
        .to.be.equal(await this.r.balanceOf(this.alice.address))
        .to.be.equal(expectedArsw);
    });
    it('should work also when no rewarder', async function () {
      await this.chef.add(10, this.rlp.address, ADDRESS_ZERO);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      expect(await this.chef.lpTokens(0)).to.be.equal(this.rlp.address);
      const lpAmount = getBigNumber(1);
      const log = await this.chef.deposit(0, lpAmount, this.alice.address);
      await this.chef.setOriginBlock(log.blockNumber);
      await advanceBlockTo(log.blockNumber + 5);
      await this.arsw.mint(this.chef.address, getBigNumber(100000));
      await this.arsw.approve(this.alice.address, getBigNumber(100000));
      const tx = this.chef.withdrawAndHarvest(0, lpAmount, this.alice.address);
      const log2 = await tx;
      const expectedArsw = (
        await this.chef.calculateAdditionalAccARSWPerShareTest(
          0,
          log.blockNumber,
          10,
          log2.blockNumber,
          lpAmount,
        )
      )
        .mul(lpAmount)
        .div(ACC_ARSW_PRECISION);
      expect(
        (await this.chef.userInfos(0, this.alice.address)).rewardDebt,
      ).to.be.equal(0);
      await expect(tx)
        .to.emit(this.chef, 'Withdraw')
        .withArgs(this.alice.address, 0, lpAmount, this.alice.address)
        .to.emit(this.chef, 'Harvest')
        .withArgs(this.alice.address, 0, expectedArsw);
      expect(await this.arsw.balanceOf(this.alice.address)).to.be.equal(
        expectedArsw,
      );
    });
  });

  describe('EmergencyWithdraw', function () {
    it('Should emit event EmergencyWithdraw', async function () {
      await this.r.transfer(this.rewarder.address, getBigNumber(100000));
      await this.chef.add(10, this.rlp.address, this.rewarder.address);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      await this.chef.deposit(0, getBigNumber(1), this.bob.address);
      await expect(
        this.chef.connect(this.bob).emergencyWithdraw(0, this.bob.address),
      )
        .to.emit(this.chef, 'EmergencyWithdraw')
        .withArgs(this.bob.address, 0, getBigNumber(1), this.bob.address);
    });
    it('Should work even if no rewarder', async function () {
      const lpAmount = getBigNumber(1);
      await this.chef.add(10, this.rlp.address, ADDRESS_ZERO);
      await this.rlp.approve(this.chef.address, getBigNumber(10));
      await this.chef.deposit(0, lpAmount, this.bob.address);
      const tx = this.chef
        .connect(this.bob)
        .emergencyWithdraw(0, this.bob.address);
      await expect(() => tx).to.changeTokenBalances(
        this.rlp,
        [this.bob, this.chef],
        [lpAmount, '-' + lpAmount],
      );
      await expect(tx)
        .to.emit(this.chef, 'EmergencyWithdraw')
        .withArgs(this.bob.address, 0, getBigNumber(1), this.bob.address);
    });
  });

  describe('depositARSW', function () {
    it('reverts if msg.sender is not owner', async function () {
      await this.arsw.mint(this.bob.address, getBigNumber(100000));
      await this.arsw.connect(this.bob).approve(this.chef.address, 10, {
        from: this.bob.address,
      });
      await expect(
        this.chef.connect(this.bob).depositARSW(10, { from: this.bob.address }),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('reverts if deposit 0 amount', async function () {
      await expect(this.chef.depositARSW(0)).to.be.revertedWith(
        'MasterChef: amount should be greater than 0',
      );
    });
    it('successfuly deposit 10 amount', async function () {
      const depositAmount = getBigNumber(10);
      await this.arsw.mint(this.alice.address, getBigNumber(100000));
      await this.arsw.approve(this.chef.address, depositAmount);
      const tx = this.chef.connect(this.alice).depositARSW(depositAmount);
      await expect(() => tx).to.changeTokenBalances(
        this.arsw,
        [this.alice, this.chef],
        [depositAmount.mul(-1), depositAmount],
      );
      const txResponse = await tx;
      await expect(tx)
        .to.emit(this.chef, 'DepositARSW')
        .withArgs(txResponse.blockNumber, depositAmount);
    });
  });
});
