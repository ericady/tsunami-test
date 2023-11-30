// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title Vault
 * @author ericady
 * @notice This vault is static vault which is just holding tokens on it.
 */
contract Vault1 is OwnableUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    mapping(address => bool) public whitelistedTokens;
    /// @notice Store user's balance, user => token => balance
    mapping(address => mapping(address => uint)) public balanceOf;

    /// Keep same storage layout
    string public version;

    /// Events
    event UpdatedTokenWhitelist(address indexed token, bool whitelist);
    event Deposited(address indexed user, address token, uint amount);
    event Withdrew(address indexed user, address token, uint amount);

    /// Errors
    error InsufficientBalance(address user, address token);
    error NotWhitelisted(address token);

    /// Modifiers
    modifier onlyWhitelisted(address token) {
        if (!whitelistedTokens[token]) revert NotWhitelisted(token);
        _;
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
    }

    /////////////////////////////
    ///       Owner Func      ///
    /////////////////////////////

    function whitelistToken(address token, bool whitelist) external onlyOwner {
        whitelistedTokens[token] = whitelist;
        emit UpdatedTokenWhitelist(token, whitelist);
    }

    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        _unpause();
    }

    /////////////////////////////
    ///       User Func       ///
    /////////////////////////////

    function deposit(address token, uint amount) external onlyWhitelisted(token) whenNotPaused {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        balanceOf[msg.sender][token] += amount;

        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint amount) external onlyWhitelisted(token) whenNotPaused {
        if (amount > balanceOf[msg.sender][token]) revert InsufficientBalance(msg.sender, token);

        // Update states first to prevent possible reentrancy attack
        balanceOf[msg.sender][token] -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrew(msg.sender, token, amount);
    }
}
