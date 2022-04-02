// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title DVotte
/// @author Matt
/// @dev This contract allows donate ether that gets splitted among members.
contract DVotte is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    event Devoted(address indexed devoter, uint256 value);

    EnumerableSet.AddressSet private members;
    mapping(address => uint256) public membersBalances;

    uint256 public balance;
    uint256 public total;

    uint256 public releaseThreshold;
    uint256 public releaseThresholdUpdatedAt;

    bool public isDisabled;

    constructor(uint256 _releaseThreshold, address[] memory _members) {
        require(_members.length > 0);

        for (uint256 i; i < _members.length; i++) {
            members.add(_members[i]);
        }
        releaseThreshold = _releaseThreshold;
        releaseThresholdUpdatedAt = block.timestamp;
    }

    modifier onlyMember() {
        require(members.contains(msg.sender));
        _;
    }

    modifier onlyActive() {
        require(!isDisabled);
        _;
    }

    receive() external payable onlyActive {
        balance += msg.value;
        total += msg.value;

        emit Devoted(msg.sender, msg.value);
    }

    function getMembers() external view returns (address[] memory) {
        return members.values();
    }

    function addMember(address member) external onlyOwner {
        require(members.add(member));
    }

    function removeMember(address member) external onlyOwner {
        require(members.remove(member));
    }

    function leave() external onlyMember {
        require(members.remove(msg.sender));
    }

    function setReleaseThreshold(uint256 _releaseThreshold) external onlyOwner {
        require(block.timestamp - releaseThresholdUpdatedAt > 1 days);

        releaseThreshold = _releaseThreshold;
        releaseThresholdUpdatedAt = block.timestamp;
    }

    function share() external onlyMember {
        _share();
    }

    function shareAndReleaseAll() external onlyMember {
        _share();
        _releaseAll();
    }

    function _share() private {
        require(balance > 0);
        require(members.length() <= balance);

        uint256 sharePart = balance / members.length();

        for (uint256 i; i < members.length(); i++) {
            /// @dev Prevent from division rounding error
            address member = members.at(i);
            if (balance < sharePart) {
                balance = 0;
                membersBalances[member] += balance;
                break;
            }

            balance -= sharePart;
            membersBalances[member] += sharePart;
        }
    }

    function release() external {
        require(membersBalances[msg.sender] >= releaseThreshold);
        _release(msg.sender);
    }

    function _release(address member) private {
        uint256 memberBalance = membersBalances[member];
        membersBalances[member] = 0;
        (bool sent, ) = payable(member).call{value: memberBalance}("");
        require(sent);
    }

    function releaseAll() external onlyMember {
        _releaseAll();
    }

    function _releaseAll() private {
        for (uint256 i; i < members.length(); i++) {
            address member = members.at(i);
            if (membersBalances[member] >= releaseThreshold) {
                _release(member);
            }
        }
    }

    function setDisabled(bool _isDisabled) external onlyOwner {
        isDisabled = _isDisabled;
    }
}
