## `MasterChef`

The MasterChef contract gives out ARSW tokens for yield farming.
The amount of ARSW token reward decreases per month (215000 blocks).
For the detail, see the token economics documents: https://docs.arthswap.org/arsw-token

### `validPool(uint256 pid)`

Modifier to check that the pool is valid

#### parameters

### `constructor(contract IERC20 arswToken)` (public)

#### parameters

- `arswToken`: The ARSW token contract address.

### `poolLength() → uint256 pools` (external)

Returns the number of MasterChef pools.

#### parameters

### `checkPoolDuplicate(contract IERC20 lpToken)` (internal)

Prevent duplicate LP token

#### parameters

### `add(uint256 allocPoint, contract IERC20 lpToken, contract IRewarder rewarder)` (external)

Add a new LP to the pool. Can only be called by the owner.
DO NOT add the same LP token more than once. Rewards will be messed up if you do.

#### parameters

- `allocPoint`: AP of the new pool.

- `lpToken`: Address of the LP ERC-20 token.

- `rewarder`: Address of the rewarder delegate.

### `set(uint256 pid, uint256 allocPoint, contract IRewarder rewarder, bool overwrite)` (external)

Update the given pool's ARSW allocation point and `IRewarder` contract. Can only be called by the owner.

#### parameters

- `pid`: The index of the pool. See `poolInfo`.

- `allocPoint`: New AP of the pool.

- `rewarder`: Address of the rewarder delegate.

- `overwrite`: True if rewarder should be `set`. Otherwise `rewarder` is ignored.

### `pendingARSW(uint256 pid, address user) → uint256 pending` (external)

View function to see pending ARSW on frontend.

#### parameters

- `pid`: The index of the pool. See `poolInfo`.

- `user`: Address of user.

### `massUpdatePools(uint256[] pids)` (external)

Update reward variables for selected pools. Be careful of gas spending!

#### parameters

- `pids`: Pool IDs of all to be updated. Make sure to update all active pools.

### `updateAllPools()` (public)

Update reward variables for all pools. Be careful of gas spending!

#### parameters

### `getPeriod(uint256 blockNumber) → uint256 period` (public)

get period of the given blockNumber.

#### parameters

- `blockNumber`: block number

### `periodMax(uint256 period) → uint256 periodMaxBlock` (public)

get max block number in the given period.

#### parameters

- `period`: period

### `ARSWPerBlock(uint256 period) → uint256 amount` (public)

Calculates and returns the `amount` of ARSW per block.

#### parameters

### `calculateAdditionalAccARSWPerShare(struct MasterChef.PoolInfo pool, uint256 currentBlock, uint256 lpSupply) → uint256 additionalAccARSWPerShare` (internal)

calculate additional accARSWPerShare of the given pool

#### parameters

- `pool`: pool

- `lpSupply`: sum deposit amount of the LP token by the pool

### `updatePool(uint256 pid) → struct MasterChef.PoolInfo pool` (public)

Update reward variables of the given pool.

#### parameters

- `pid`: The index of the pool. See `poolInfo`.

### `deposit(uint256 pid, uint256 amount, address to)` (external)

Deposit LP tokens to MasterChef for ARSW allocation.

#### parameters

- `pid`: The index of the pool. See `poolInfo`.

- `amount`: LP token amount to deposit.

- `to`: The receiver of `amount` deposit benefit.

### `withdraw(uint256 pid, uint256 amount, address to)` (external)

Withdraw LP tokens from MasterChef.

#### parameters

- `pid`: The index of the pool. See `poolInfo`.

- `amount`: LP token amount to withdraw.

- `to`: Receiver of the LP tokens.

### `harvest(uint256 pid, address to)` (external)

Harvest proceeds for transaction sender to `to`.

#### parameters

- `pid`: The index of the pool. See `poolInfo`.

- `to`: Receiver of ARSW rewards.

### `withdrawAndHarvest(uint256 pid, uint256 amount, address to)` (external)

Withdraw LP tokens from MasterChef and harvest proceeds for transaction sender to `to`.

#### parameters

- `pid`: The index of the pool. See `poolInfo`.

- `amount`: LP token amount to withdraw.

- `to`: Receiver of the LP tokens and ARSW rewards.

### `emergencyWithdraw(uint256 pid, address to)` (external)

Withdraw without caring about rewards. EMERGENCY ONLY.

#### parameters

- `pid`: The index of the pool. See `poolInfo`.

- `to`: Receiver of the LP tokens.

### `depositARSW(uint256 amount)` (external)

send ARSW to MasterChef contract for user's farming

#### parameters

- `amount`: amount of ARSW to deposit

### `Deposit(address user, uint256 pid, uint256 amount, address to)`

#### parameters

### `Withdraw(address user, uint256 pid, uint256 amount, address to)`

#### parameters

### `EmergencyWithdraw(address user, uint256 pid, uint256 amount, address to)`

#### parameters

### `Harvest(address user, uint256 pid, uint256 amount)`

#### parameters

### `LogPoolAddition(uint256 pid, uint256 allocPoint, contract IERC20 lpToken, contract IRewarder rewarder)`

#### parameters

### `LogSetPool(uint256 pid, uint256 allocPoint, contract IRewarder rewarder, bool overwrite)`

#### parameters

### `LogUpdatePool(uint256 pid, uint64 lastRewardBlock, uint256 lpSupply, uint256 accARSWPerShare)`

#### parameters

### `DepositARSW(uint256 blockNumber, uint256 amount)`

#### parameters
