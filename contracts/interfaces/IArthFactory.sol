pragma solidity 0.6.12;

interface IArthFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}
