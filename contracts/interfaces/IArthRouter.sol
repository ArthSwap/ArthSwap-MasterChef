pragma solidity 0.6.12;

interface IArthRouter {
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256[] memory amounts
        );
}
