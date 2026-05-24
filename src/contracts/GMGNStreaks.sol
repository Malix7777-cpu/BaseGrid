// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGameRegistry {
    function awardXP(address _player, uint256 _amount, string calldata _reason) external;
    function getPlayer(address _wallet) external view returns (address wallet, string memory username, uint256 highestScore, uint256 totalXP, uint256 registrationTimestamp, bool registered);
}

/**
 * @title GMGNStreaks
 * @dev Manages GM/GN check-ins, tracking daily streaks and rewarding XP.
 */
contract GMGNStreaks {
    address public registryAddress;
    
    struct StreakState {
        uint256 lastGMTime;
        uint256 lastGNTime;
        uint256 streakCount;
        uint256 lastCheckInTime;
    }

    mapping(address => StreakState) public streaks;

    // Events
    event GMCheckedIn(address indexed player, uint256 streak, uint256 xpAwarded);
    event GNCheckedIn(address indexed player, uint256 streak, uint256 xpAwarded);
    event StreakReset(address indexed player);
    event StreakBonusAwarded(address indexed player, uint256 bonusXP);

    constructor(address _registryAddress) {
        registryAddress = _registryAddress;
    }

    // Perform GM Check-in
    function gm() external {
        IGameRegistry registry = IGameRegistry(registryAddress);
        (,,,,, bool registered) = registry.getPlayer(msg.sender);
        require(registered, "You must register a username first in the GameRegistry");

        StreakState storage state = streaks[msg.sender];
        require(block.timestamp - state.lastGMTime >= 18 hours, "GM already claimed for today (18 hours cooldown)");

        // Check if streak was broken (over 48 hours since last action)
        if (state.lastCheckInTime > 0 && block.timestamp - state.lastCheckInTime > 48 hours) {
            state.streakCount = 0;
            emit StreakReset(msg.sender);
        }

        // Increment streak if it's a new daily check-in (more than 18 hours since last check-in)
        if (state.lastCheckInTime == 0 || block.timestamp - state.lastCheckInTime >= 18 hours) {
            state.streakCount += 1;
        }

        state.lastGMTime = block.timestamp;
        state.lastCheckInTime = block.timestamp;

        // Base XP: +10 XP
        uint256 xpAwarded = 10;
        registry.awardXP(msg.sender, xpAwarded, "Daily GM");

        emit GMCheckedIn(msg.sender, state.streakCount, xpAwarded);

        // 7-day streak bonus: +50 XP
        if (state.streakCount % 7 == 0) {
            uint256 bonus = 50;
            registry.awardXP(msg.sender, bonus, "7-Day Streak Bonus");
            emit StreakBonusAwarded(msg.sender, bonus);
        }
    }

    // Perform GN Check-in
    function gn() external {
        IGameRegistry registry = IGameRegistry(registryAddress);
        (,,,,, bool registered) = registry.getPlayer(msg.sender);
        require(registered, "You must register a username first in the GameRegistry");

        StreakState storage state = streaks[msg.sender];
        require(block.timestamp - state.lastGNTime >= 18 hours, "GN already claimed for today (18 hours cooldown)");

        // Check if streak was broken
        if (state.lastCheckInTime > 0 && block.timestamp - state.lastCheckInTime > 48 hours) {
            state.streakCount = 0;
            emit StreakReset(msg.sender);
        }

        // Increment streak if it's a new daily check-in
        if (state.lastCheckInTime == 0 || block.timestamp - state.lastCheckInTime >= 18 hours) {
            state.streakCount += 1;
        }

        state.lastGNTime = block.timestamp;
        state.lastCheckInTime = block.timestamp;

        // Base XP: +10 XP
        uint256 xpAwarded = 10;
        registry.awardXP(msg.sender, xpAwarded, "Daily GN");

        emit GNCheckedIn(msg.sender, state.streakCount, xpAwarded);

        // 7-day streak bonus: +50 XP
        if (state.streakCount % 7 == 0) {
            uint256 bonus = 50;
            registry.awardXP(msg.sender, bonus, "7-Day Streak Bonus");
            emit StreakBonusAwarded(msg.sender, bonus);
        }
    }

    // Helper to get streak status
    function getStreak(address _player) external view returns (
        uint256 lastGMTime,
        uint256 lastGNTime,
        uint256 streakCount,
        uint256 lastCheckInTime,
        bool gmAvailable,
        bool gnAvailable
    ) {
        StreakState memory state = streaks[_player];
        
        // Calculate availability
        bool isGMAvail = (block.timestamp - state.lastGMTime >= 18 hours) || (state.lastGMTime == 0);
        bool isGNAvail = (block.timestamp - state.lastGNTime >= 18 hours) || (state.lastGNTime == 0);
        
        // Check if streak is already broken and would reset on next action
        uint256 activeStreak = state.streakCount;
        if (state.lastCheckInTime > 0 && block.timestamp - state.lastCheckInTime > 48 hours) {
            activeStreak = 0;
        }

        return (
            state.lastGMTime,
            state.lastGNTime,
            activeStreak,
            state.lastCheckInTime,
            isGMAvail,
            isGNAvail
        );
    }
}
