// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./GameToken.sol";

/**
 * @title ERC20Factory
 * @dev Deploys custom GameTokens and tracks them for wallet analytics and dashboards.
 */
contract ERC20Factory {
    struct DeployedToken {
        address tokenAddress;
        string name;
        string symbol;
        uint256 supply;
        address creator;
        uint256 timestamp;
    }

    DeployedToken[] public allTokens;
    mapping(address => DeployedToken[]) public creatorTokens;

    event TokenDeployed(
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 supply,
        address indexed creator,
        uint256 timestamp
    );

    function deployToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _supply
    ) external returns (address) {
        require(bytes(_name).length > 0, "Token name cannot be empty");
        require(bytes(_symbol).length > 0, "Token symbol cannot be empty");
        require(_supply > 0, "Supply must be greater than zero");

        // Deploy new GameToken instance
        GameToken token = new GameToken(_name, _symbol, _supply, msg.sender);
        address tokenAddr = address(token);

        DeployedToken memory newToken = DeployedToken({
            tokenAddress: tokenAddr,
            name: _name,
            symbol: _symbol,
            supply: _supply,
            creator: msg.sender,
            timestamp: block.timestamp
        });

        allTokens.push(newToken);
        creatorTokens[msg.sender].push(newToken);

        emit TokenDeployed(tokenAddr, _name, _symbol, _supply, msg.sender, block.timestamp);

        return tokenAddr;
    }

    function getAllTokens() external view returns (DeployedToken[] memory) {
        return allTokens;
    }

    function getCreatorTokens(address _creator) external view returns (DeployedToken[] memory) {
        return creatorTokens[_creator];
    }

    function getDeployedTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
}
