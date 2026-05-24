// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GameRegistry
 * @dev Manages user registration, usernames, high scores, and player XP.
 */
contract GameRegistry {
    struct Player {
        address wallet;
        string username;
        uint256 highestScore;
        uint256 totalXP;
        uint256 registrationTimestamp;
        bool registered;
    }

    // Mappings for player records
    mapping(address => Player) public players;
    mapping(string => address) public usernameToAddress;
    address[] public playerAddresses;

    // Events
    event PlayerRegistered(address indexed wallet, string username, uint256 timestamp);
    event ScoreSubmitted(address indexed wallet, uint256 score, uint256 xpGained, uint256 newHighScore);
    event XPAwarded(address indexed wallet, uint256 amount, string reason);

    // Register a username
    function registerPlayer(string calldata _username) external {
        require(bytes(_username).length >= 3, "Username must be at least 3 characters");
        require(bytes(_username).length <= 20, "Username must be at most 20 characters");
        require(!players[msg.sender].registered, "Address is already registered");
        require(usernameToAddress[_username] == address(0), "Username is already taken");

        players[msg.sender] = Player({
            wallet: msg.sender,
            username: _username,
            highestScore: 0,
            totalXP: 100, // starting bonus XP
            registrationTimestamp: block.timestamp,
            registered: true
        });

        usernameToAddress[_username] = msg.sender;
        playerAddresses.push(msg.sender);

        emit PlayerRegistered(msg.sender, _username, block.timestamp);
    }

    // Submit a gameplay score
    function submitScore(uint256 _score) external {
        require(players[msg.sender].registered, "Player must be registered first");
        
        Player storage player = players[msg.sender];
        
        // Calculate XP gained: 1 XP per 100 points
        uint256 xpGained = _score / 100;
        if (xpGained == 0) xpGained = 1; // minimum 1 XP for playing
        
        player.totalXP += xpGained;
        
        uint256 newHighScore = player.highestScore;
        if (_score > player.highestScore) {
            player.highestScore = _score;
            newHighScore = _score;
        }

        emit ScoreSubmitted(msg.sender, _score, xpGained, newHighScore);
    }

    // Award XP (called by GM/GN streaks contract or other authorized extensions)
    function awardXP(address _player, uint256 _amount, string calldata _reason) external {
        require(players[_player].registered, "Player must be registered first");
        players[_player].totalXP += _amount;
        emit XPAwarded(_player, _amount, _reason);
    }

    // Check if username is taken
    function isUsernameTaken(string calldata _username) external view returns (bool) {
        return usernameToAddress[_username] != address(0);
    }

    // Get Player data
    function getPlayer(address _wallet) external view returns (Player memory) {
        return players[_wallet];
    }

    // Get total players
    function getPlayerCount() external view returns (uint256) {
        return playerAddresses.length;
    }

    // Get all players for leaderboard sorting
    function getAllPlayers() external view returns (Player[] memory) {
        uint256 count = playerAddresses.length;
        Player[] memory list = new Player[](count);
        for (uint256 i = 0; i < count; i++) {
            list[i] = players[playerAddresses[i]];
        }
        return list;
    }
}
