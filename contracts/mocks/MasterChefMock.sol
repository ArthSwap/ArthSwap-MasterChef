// SPDX-License-Identifier: MIT

pragma solidity >=0.6.12;
pragma experimental ABIEncoderV2;

import "boring-solidity/contracts/libraries/BoringERC20.sol";
import {MasterChef} from "../MasterChef.sol";

contract MasterChefMock is MasterChef {
    /// @dev After MAX_PERIOD ARSW reward will end
    uint256 private constant MAX_PERIOD = 23;

    constructor(
        IERC20 _ARSW,
        uint64 originBlock,
        uint256 blockPeriod
    ) public MasterChef(_ARSW) {
        ARTHSWAP_ORIGIN_BLOCK = originBlock;
        BLOCK_PER_PERIOD = blockPeriod;
    }

    function calculateAdditionalAccARSWPerShareTest(
        uint128 accARSWPerShare,
        uint64 lastRewardBlock,
        uint64 allocPoint,
        uint256 currentBlock,
        uint256 lpSupply
    ) external view returns (uint256 additionalAccARSWPerShare) {
        PoolInfo memory pool = PoolInfo(
            accARSWPerShare,
            lastRewardBlock,
            allocPoint
        );
        return calculateAdditionalAccARSWPerShare(pool, currentBlock, lpSupply);
    }

    function setTotalAllocPoint(uint256 point) public {
        totalAllocPoint = point;
    }

    function setOriginBlock(uint64 originBlock) public {
        ARTHSWAP_ORIGIN_BLOCK = originBlock;
    }

    function setBlockPeriod(uint64 blockPeriod) public {
        BLOCK_PER_PERIOD = blockPeriod;
    }

    function exposedCheckPoolDuplicate(IERC20 lpToken) public view {
        checkPoolDuplicate(lpToken);
    }

    function calculateNecessaryARSW(uint256 fromBlock)
        external
        view
        returns (uint256 ARSWNecessary)
    {
        // ARSWNecessary, lastBlock are mutable variable
        uint256 lastBlock = fromBlock;
        for (
            uint256 period = getPeriod(fromBlock);
            period <= MAX_PERIOD;
            period++
        ) {
            ARSWNecessary = ARSWNecessary.add(
                periodMax(period).sub(lastBlock).mul(ARSWPerBlock(period))
            );
            lastBlock = periodMax(period);
        }
    }
}
