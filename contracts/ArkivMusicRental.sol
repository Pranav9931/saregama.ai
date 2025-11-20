// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ArkivMusicRental
 * @dev Decentralized music rental platform with artist royalties
 * @notice This contract handles rental payments, royalty distribution, and catalog management
 */
contract ArkivMusicRental {
    
    // ============ State Variables ============
    
    address public owner;
    uint256 public platformFeePercentage; // Basis points (e.g., 500 = 5%)
    address public platformFeeRecipient;
    
    // ============ Structs ============
    
    struct CatalogItem {
        string catalogItemId; // Off-chain catalog ID
        address artistAddress;
        uint256 priceWei;
        uint256 rentalDurationDays;
        bool isActive;
        uint256 totalRentals;
        uint256 totalEarnings;
    }
    
    struct Rental {
        string catalogItemId;
        address renter;
        uint256 paidAmount;
        uint256 rentalStartTime;
        uint256 rentalEndTime;
        bool isActive;
    }
    
    // ============ Storage ============
    
    mapping(string => CatalogItem) public catalogItems;
    mapping(bytes32 => Rental) public rentals; // rentalId => Rental
    mapping(address => bytes32[]) public userRentals; // user address => rental IDs
    
    // ============ Events ============
    
    event CatalogItemAdded(
        string indexed catalogItemId,
        address indexed artistAddress,
        uint256 priceWei,
        uint256 rentalDurationDays
    );
    
    event CatalogItemUpdated(
        string indexed catalogItemId,
        uint256 newPriceWei,
        uint256 newRentalDurationDays,
        bool isActive
    );
    
    event RentalPurchased(
        bytes32 indexed rentalId,
        string indexed catalogItemId,
        address indexed renter,
        uint256 paidAmount,
        uint256 rentalEndTime
    );
    
    event RoyaltyPaid(
        string indexed catalogItemId,
        address indexed artist,
        uint256 amount
    );
    
    event PlatformFeePaid(
        address indexed recipient,
        uint256 amount
    );
    
    event PlatformFeeUpdated(
        uint256 newFeePercentage
    );
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier catalogItemExists(string memory catalogItemId) {
        require(
            bytes(catalogItems[catalogItemId].catalogItemId).length > 0,
            "Catalog item does not exist"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor(uint256 _platformFeePercentage, address _platformFeeRecipient) {
        require(_platformFeePercentage <= 10000, "Fee cannot exceed 100%");
        require(_platformFeeRecipient != address(0), "Invalid fee recipient");
        
        owner = msg.sender;
        platformFeePercentage = _platformFeePercentage;
        platformFeeRecipient = _platformFeeRecipient;
    }
    
    // ============ Owner Functions ============
    
    /**
     * @dev Add a new catalog item to the platform
     * @param catalogItemId Unique identifier from off-chain database
     * @param artistAddress Ethereum address of the artist
     * @param priceWei Rental price in wei
     * @param rentalDurationDays Rental duration in days
     */
    function addCatalogItem(
        string memory catalogItemId,
        address artistAddress,
        uint256 priceWei,
        uint256 rentalDurationDays
    ) external onlyOwner {
        require(bytes(catalogItemId).length > 0, "Invalid catalog ID");
        require(artistAddress != address(0), "Invalid artist address");
        require(priceWei > 0, "Price must be greater than 0");
        require(rentalDurationDays > 0, "Duration must be greater than 0");
        require(
            bytes(catalogItems[catalogItemId].catalogItemId).length == 0,
            "Catalog item already exists"
        );
        
        catalogItems[catalogItemId] = CatalogItem({
            catalogItemId: catalogItemId,
            artistAddress: artistAddress,
            priceWei: priceWei,
            rentalDurationDays: rentalDurationDays,
            isActive: true,
            totalRentals: 0,
            totalEarnings: 0
        });
        
        emit CatalogItemAdded(catalogItemId, artistAddress, priceWei, rentalDurationDays);
    }
    
    /**
     * @dev Update an existing catalog item
     */
    function updateCatalogItem(
        string memory catalogItemId,
        uint256 newPriceWei,
        uint256 newRentalDurationDays,
        bool isActive
    ) external onlyOwner catalogItemExists(catalogItemId) {
        require(newPriceWei > 0, "Price must be greater than 0");
        require(newRentalDurationDays > 0, "Duration must be greater than 0");
        
        CatalogItem storage item = catalogItems[catalogItemId];
        item.priceWei = newPriceWei;
        item.rentalDurationDays = newRentalDurationDays;
        item.isActive = isActive;
        
        emit CatalogItemUpdated(catalogItemId, newPriceWei, newRentalDurationDays, isActive);
    }
    
    /**
     * @dev Update platform fee percentage
     */
    function updatePlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 10000, "Fee cannot exceed 100%");
        platformFeePercentage = newFeePercentage;
        emit PlatformFeeUpdated(newFeePercentage);
    }
    
    /**
     * @dev Update platform fee recipient address
     */
    function updatePlatformFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient address");
        platformFeeRecipient = newRecipient;
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }
    
    // ============ Public Functions ============
    
    /**
     * @dev Purchase a rental for a catalog item
     * @param catalogItemId The ID of the catalog item to rent
     * @return rentalId Unique identifier for this rental
     */
    function purchaseRental(string memory catalogItemId) 
        external 
        payable 
        catalogItemExists(catalogItemId) 
        returns (bytes32 rentalId) 
    {
        CatalogItem storage item = catalogItems[catalogItemId];
        require(item.isActive, "Catalog item is not active");
        require(msg.value >= item.priceWei, "Insufficient payment");
        
        // Calculate fees
        uint256 platformFee = (msg.value * platformFeePercentage) / 10000;
        uint256 artistPayment = msg.value - platformFee;
        
        // Generate unique rental ID
        rentalId = keccak256(
            abi.encodePacked(
                catalogItemId,
                msg.sender,
                block.timestamp,
                block.number
            )
        );
        
        // Calculate rental end time
        uint256 rentalEndTime = block.timestamp + (item.rentalDurationDays * 1 days);
        
        // Store rental
        rentals[rentalId] = Rental({
            catalogItemId: catalogItemId,
            renter: msg.sender,
            paidAmount: msg.value,
            rentalStartTime: block.timestamp,
            rentalEndTime: rentalEndTime,
            isActive: true
        });
        
        // Track user rentals
        userRentals[msg.sender].push(rentalId);
        
        // Update catalog item stats
        item.totalRentals++;
        item.totalEarnings += msg.value;
        
        // Transfer payments
        (bool artistSuccess, ) = item.artistAddress.call{value: artistPayment}("");
        require(artistSuccess, "Artist payment failed");
        
        (bool platformSuccess, ) = platformFeeRecipient.call{value: platformFee}("");
        require(platformSuccess, "Platform fee payment failed");
        
        // Emit events
        emit RentalPurchased(rentalId, catalogItemId, msg.sender, msg.value, rentalEndTime);
        emit RoyaltyPaid(catalogItemId, item.artistAddress, artistPayment);
        emit PlatformFeePaid(platformFeeRecipient, platformFee);
        
        // Refund excess payment
        if (msg.value > item.priceWei) {
            uint256 refund = msg.value - item.priceWei;
            (bool refundSuccess, ) = msg.sender.call{value: refund}("");
            require(refundSuccess, "Refund failed");
        }
        
        return rentalId;
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get catalog item details
     */
    function getCatalogItem(string memory catalogItemId) 
        external 
        view 
        returns (CatalogItem memory) 
    {
        return catalogItems[catalogItemId];
    }
    
    /**
     * @dev Get rental details
     */
    function getRental(bytes32 rentalId) external view returns (Rental memory) {
        return rentals[rentalId];
    }
    
    /**
     * @dev Get all rental IDs for a user
     */
    function getUserRentals(address user) external view returns (bytes32[] memory) {
        return userRentals[user];
    }
    
    /**
     * @dev Check if a rental is currently active
     */
    function isRentalActive(bytes32 rentalId) external view returns (bool) {
        Rental memory rental = rentals[rentalId];
        return rental.isActive && block.timestamp <= rental.rentalEndTime;
    }
    
    /**
     * @dev Get rental status with detailed information
     */
    function getRentalStatus(bytes32 rentalId) 
        external 
        view 
        returns (
            bool exists,
            bool isActive,
            bool isExpired,
            uint256 timeRemaining
        ) 
    {
        Rental memory rental = rentals[rentalId];
        exists = rental.renter != address(0);
        
        if (!exists) {
            return (false, false, false, 0);
        }
        
        isExpired = block.timestamp > rental.rentalEndTime;
        isActive = rental.isActive && !isExpired;
        timeRemaining = isExpired ? 0 : rental.rentalEndTime - block.timestamp;
        
        return (exists, isActive, isExpired, timeRemaining);
    }
}
