// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ArkivRental
 * @dev Smart contract for managing content rentals on Arkiv Music platform
 * Supports three rental tiers: 7 days, 30 days, and 1 year
 * Integrated with Mimic Protocol for automatic expiration handling
 */
contract ArkivRental {
    address public owner;
    uint256 public totalRentals;

    // Rental pricing tiers (in wei)
    uint256 public constant PRICE_7_DAYS = 0.0001 ether;
    uint256 public constant PRICE_30_DAYS = 0.0003 ether;
    uint256 public constant PRICE_1_YEAR = 0.0005 ether;

    // Rental duration tiers (in seconds)
    uint256 public constant DURATION_7_DAYS = 7 days;
    uint256 public constant DURATION_30_DAYS = 30 days;
    uint256 public constant DURATION_1_YEAR = 365 days;

    struct Rental {
        address renter;
        string catalogItemId;
        uint256 expiresAt;
        uint256 paidAmount;
        uint256 durationDays;
        bool isActive;
        string mimicTaskId; // Mimic protocol task ID for auto-expiration
    }

    // Mapping from rental ID to Rental struct
    mapping(string => Rental) public rentals;

    // Events
    event RentalCreated(
        string indexed rentalId,
        address indexed renter,
        string catalogItemId,
        uint256 expiresAt,
        uint256 paidAmount,
        uint256 durationDays
    );

    event RentalExpired(
        string indexed rentalId,
        address indexed renter,
        string catalogItemId
    );

    event MimicTaskUpdated(
        string indexed rentalId,
        string mimicTaskId
    );

    event FundsWithdrawn(
        address indexed owner,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier validRentalId(string memory rentalId) {
        require(bytes(rentalId).length > 0, "Invalid rental ID");
        _;
    }

    constructor() {
        owner = msg.sender;
        totalRentals = 0;
    }

    /**
     * @dev Create a new rental for a catalog item
     * @param rentalId Unique identifier for this rental
     * @param catalogItemId ID of the catalog item being rented
     * @param durationDays Duration of rental (7, 30, or 365 days)
     */
    function createRental(
        string memory rentalId,
        string memory catalogItemId,
        uint256 durationDays
    ) external payable validRentalId(rentalId) {
        require(bytes(catalogItemId).length > 0, "Invalid catalog item ID");
        require(!rentals[rentalId].isActive, "Rental ID already exists");

        uint256 requiredPrice;
        uint256 duration;

        if (durationDays == 7) {
            requiredPrice = PRICE_7_DAYS;
            duration = DURATION_7_DAYS;
        } else if (durationDays == 30) {
            requiredPrice = PRICE_30_DAYS;
            duration = DURATION_30_DAYS;
        } else if (durationDays == 365) {
            requiredPrice = PRICE_1_YEAR;
            duration = DURATION_1_YEAR;
        } else {
            revert("Invalid rental duration. Must be 7, 30, or 365 days");
        }

        require(msg.value >= requiredPrice, "Insufficient payment");

        uint256 expiresAt = block.timestamp + duration;

        rentals[rentalId] = Rental({
            renter: msg.sender,
            catalogItemId: catalogItemId,
            expiresAt: expiresAt,
            paidAmount: msg.value,
            durationDays: durationDays,
            isActive: true,
            mimicTaskId: "" // Will be set by backend after Mimic task creation
        });

        totalRentals++;

        emit RentalCreated(
            rentalId,
            msg.sender,
            catalogItemId,
            expiresAt,
            msg.value,
            durationDays
        );

        // Refund excess payment
        if (msg.value > requiredPrice) {
            payable(msg.sender).transfer(msg.value - requiredPrice);
        }
    }

    /**
     * @dev Update the Mimic task ID for a rental (called by backend after creating Mimic task)
     * @param rentalId The rental ID
     * @param mimicTaskId The Mimic protocol task ID
     */
    function updateMimicTaskId(
        string memory rentalId,
        string memory mimicTaskId
    ) external onlyOwner validRentalId(rentalId) {
        require(rentals[rentalId].isActive, "Rental does not exist or is inactive");
        rentals[rentalId].mimicTaskId = mimicTaskId;
        emit MimicTaskUpdated(rentalId, mimicTaskId);
    }

    /**
     * @dev Expire a rental (called automatically by Mimic protocol or manually)
     * @param rentalId The rental ID to expire
     */
    function expireRental(string memory rentalId) external validRentalId(rentalId) {
        Rental storage rental = rentals[rentalId];
        require(rental.isActive, "Rental is already inactive");
        
        // Only allow expiration if called by owner/Mimic or if rental period has ended
        require(
            msg.sender == owner || block.timestamp >= rental.expiresAt,
            "Rental has not expired yet"
        );

        rental.isActive = false;

        emit RentalExpired(rentalId, rental.renter, rental.catalogItemId);
    }

    /**
     * @dev Check if a rental is active and valid
     * @param rentalId The rental ID to check
     * @return bool indicating if rental is active and not expired
     */
    function isRentalValid(string memory rentalId) external view returns (bool) {
        Rental memory rental = rentals[rentalId];
        return rental.isActive && block.timestamp < rental.expiresAt;
    }

    /**
     * @dev Get rental details
     * @param rentalId The rental ID
     * @return Rental struct
     */
    function getRental(string memory rentalId) external view returns (Rental memory) {
        return rentals[rentalId];
    }

    /**
     * @dev Get pricing for a specific duration
     * @param durationDays Duration in days (7, 30, or 365)
     * @return price in wei
     */
    function getPriceForDuration(uint256 durationDays) external pure returns (uint256) {
        if (durationDays == 7) {
            return PRICE_7_DAYS;
        } else if (durationDays == 30) {
            return PRICE_30_DAYS;
        } else if (durationDays == 365) {
            return PRICE_1_YEAR;
        } else {
            revert("Invalid duration");
        }
    }

    /**
     * @dev Withdraw accumulated rental fees (only owner)
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner).transfer(balance);
        
        emit FundsWithdrawn(owner, balance);
    }

    /**
     * @dev Transfer ownership (only current owner)
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }

    /**
     * @dev Get contract balance
     * @return balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Fallback function to receive ETH
    receive() external payable {}
}
