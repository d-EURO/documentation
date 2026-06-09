# Smart Contract Functions Reference

**Complete reference of public and external functions in the dEURO protocol.**

This page lists every callable function across the dEURO smart contracts, organised by contract. Signatures match the latest V3 deployment on Ethereum mainnet (see [d-EURO/smartContracts](https://github.com/d-EURO/smartContracts)). Where V2 differs materially, the V2 form is noted explicitly.

---

## DecentralizedEURO (dEURO Token)

The main stablecoin token with minter management.

### Constants & Immutables

| Name | Type | Value | Description |
|---|---|---|---|
| `MIN_FEE` | uint256 | 1,000 dEURO | Minimum fee for minter applications |
| `MIN_APPLICATION_PERIOD` | uint256 (immutable) | 14 days at deploy | Minimum veto period for new minters |

### View Functions

```solidity
function reserve() external view returns (IReserve)
function minterReserve() public view returns (uint256)
function equity() public view returns (uint256)

function minters(address minter) external view returns (uint256 validityStart)
function isMinter(address minter) public view returns (bool)

function positions(address position) external view returns (address registeringMinter)
function getPositionParent(address position) public view returns (address)

function calculateAssignedReserve(uint256 mintedAmount, uint32 reservePPM) public view returns (uint256)
function calculateFreedAmount(uint256 amountExcludingReserve, uint32 reservePPM) public view returns (uint256)

function supportsInterface(bytes4 interfaceId) public view returns (bool)

// ERC-20 (inherited)
function balanceOf(address account) external view returns (uint256)
function totalSupply() external view returns (uint256)
function allowance(address owner, address spender) public view returns (uint256)
```

### State-Changing Functions

#### Minter Management

```solidity
function initialize(address _minter, string calldata _message) external

function suggestMinter(
    address _minter,
    uint256 _applicationPeriod,
    uint256 _applicationFee,
    string calldata _message
) external

function denyMinter(
    address minter,
    address[] calldata helpers,
    string calldata message
) external

function registerPosition(address position) external  // minters only
```

#### Minting & Burning (minters only)

```solidity
function mint(address target, uint256 amount) external

function mintWithReserve(
    address target,
    uint256 amount,
    uint32 reservePPM
) external

function burn(uint256 amount) external                  // burn from caller
function burnFrom(address target, uint256 amount) external  // minters only
function burnWithoutReserve(uint256 amount, uint32 reservePPM) public

function burnFromWithReserve(
    address payer,
    uint256 targetTotalBurnAmount,
    uint32 reservePPM
) external returns (uint256 assignedReserve)

function burnFromWithReserveNet(
    address payer,
    uint256 payerAmount,
    uint32 reservePPM
) external returns (uint256 freedAmount)
```

#### Reserve Operations (minters only)

```solidity
function coverLoss(address source, uint256 amount) external
function distributeProfits(address recipient, uint256 amount) external
function collectProfits(address source, uint256 amount) external
```

#### ERC-20, ERC-2612 (Permit), ERC-3009 (Transfer with Authorization)

Standard `transfer`, `approve`, `transferFrom`, `permit`, `transferWithAuthorization`, `receiveWithAuthorization`, `cancelAuthorization` are all supported.

### Events

```solidity
event MinterApplied(address indexed minter, uint256 applicationPeriod, uint256 applicationFee, string message);
event MinterDenied(address indexed minter, string message);
event Loss(address indexed reportingMinter, uint256 amount);
event Profit(address indexed reportingMinter, uint256 amount);
event ProfitDistributed(address indexed recipient, uint256 amount);
```

---

## Equity (nDEPS Token)

Reserve pool shares with time-weighted voting power.

### Constants

| Name | Type | Value | Description |
|---|---|---|---|
| `VALUATION_FACTOR` | uint32 | 5 | Market cap = 5 × equity |
| `QUORUM` | uint32 | 200 | 2% (in basis points) |
| `MINIMUM_EQUITY` | uint256 | 1,000 dEURO | Minimum equity for operations |
| `MIN_HOLDING_DURATION` | uint256 | 90 days | Minimum hold before redeem is allowed |

### View Functions

```solidity
function dEURO() external view returns (IDecentralizedEURO)
function price() public view returns (uint256)
function canRedeem(address owner) public view returns (bool)

// Voting power
function votes(address holder) public view returns (uint256)
function relativeVotes(address holder) external view returns (uint256)
function totalVotes() public view returns (uint256)
function holdingDuration(address holder) public view returns (uint256)
function votesDelegated(address sender, address[] calldata helpers) public view returns (uint256)

// Delegation
function delegates(address owner) external view returns (address)

// Flash loan protection
function lastInboundBlock(address owner) external view returns (uint256)

// Investment calculations
function calculateShares(uint256 investment) external view returns (uint256)
function calculateProceeds(uint256 shares) public view returns (uint256)

function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

### State-Changing Functions

#### Investment & Redemption

```solidity
function invest(uint256 amount, uint256 expectedShares) external returns (uint256 shares)

function investFor(address investor, uint256 amount, uint256 expectedShares) external returns (uint256 shares)

function redeem(address target, uint256 shares) external returns (uint256 proceeds)

function redeemExpected(address target, uint256 shares, uint256 expectedProceeds) external returns (uint256 proceeds)

function redeemFrom(address owner, address target, uint256 shares, uint256 expectedProceeds) external returns (uint256 proceeds)
```

#### Governance

```solidity
function delegateVoteTo(address delegate) external

function checkQualified(address sender, address[] calldata helpers) public view

function kamikaze(address[] calldata targets, uint256 votesToDestroy) external

function restructureCapTable(address[] calldata helpers, address[] calldata addressesToWipe) external
```

### Events

```solidity
event Delegation(address indexed from, address indexed to);
event Trade(address who, int256 amount, uint256 totPrice, uint256 newprice);
```

---

## Leadrate

Abstract base contract for the system-wide interest rate. Inherited by V3 `MintingHub` directly and by V2 via `Savings → SavingsGateway`.

### View Functions

```solidity
function currentRatePPM() external view returns (uint24)
function nextRatePPM() external view returns (uint24)
function nextChange() external view returns (uint40)
function currentTicks() public view returns (uint64)
function ticks(uint256 timestamp) public view returns (uint64)
```

### State-Changing Functions

```solidity
function proposeChange(
    uint24 newRatePPM_,
    address[] calldata helpers
) external

function applyChange() external  // after 7 days
```

### Events

```solidity
event RateProposed(address who, uint24 nextRate, uint40 nextChange);
event RateChanged(uint24 newRate);
```

---

## MintingHub (V3)

Central hub for position management and liquidations. V2 wraps the same surface in `MintingHubGateway` with frontend-code overloads.

### Constants

| Name | Type | Value | Description |
|---|---|---|---|
| `OPENING_FEE` | uint256 | 1,000 dEURO | Fee to create new position |
| `CHALLENGER_REWARD` | uint256 | 20,000 (2%) | Reward for successful challenges |
| `EXPIRED_PRICE_FACTOR` | uint256 | 10 | Starting price multiplier for expired positions |

### View Functions

```solidity
function DEURO() external view returns (IDecentralizedEURO)
function RATE() public view returns (ILeadrate)
function ROLLER() external view returns (PositionRoller)
function WETH() external view returns (address)  // V3 only

function challenges(uint256 index) external view returns (
    address challenger,
    uint40 start,
    IPosition position,
    uint256 size
)
function price(uint256 challengeNumber) public view returns (uint256)

function expiredPurchasePrice(IPosition pos) public view returns (uint256)
function pendingReturns(address collateral, address owner) external view returns (uint256)
```

### State-Changing Functions

#### Position Creation

```solidity
function openPosition(
    address _collateralAddress,
    uint256 _minCollateral,
    uint256 _initialCollateral,
    uint256 _mintingMaximum,
    uint40 _initPeriodSeconds,    // >= 3 days (V3), >= 14 days (V2)
    uint40 _expirationSeconds,
    uint40 _challengeSeconds,
    uint24 _riskPremium,
    uint256 _liqPrice,
    uint24 _reservePPM
) external payable returns (address position)

// V2 MintingHubGateway adds: bytes32 _frontendCode at the end

function clone(
    address owner,
    address parent,
    uint256 _initialCollateral,
    uint256 _initialMint,
    uint40 expiration,
    uint256 _liqPrice
) external payable returns (address position)
```

#### Challenge System

```solidity
function challenge(
    address _positionAddr,
    uint256 _collateralAmount,
    uint256 minimumPrice
) external payable returns (uint256 challengeNumber)

function bid(
    uint256 _challengeNumber,
    uint256 size,
    bool postponeCollateralReturn
) external

// V3 native-coin return variant
function bid(
    uint256 _challengeNumber,
    uint256 size,
    bool postponeCollateralReturn,
    bool returnCollateralAsNative
) external

function returnPostponedCollateral(address collateral, address target) external
function returnPostponedCollateral(address collateral, address target, bool asNative) external
```

#### Expired Positions

```solidity
function buyExpiredCollateral(IPosition pos, uint256 upToAmount) external returns (uint256 actualAmount)

function buyExpiredCollateral(
    IPosition pos,
    uint256 upToAmount,
    bool receiveAsNative
) external returns (uint256 actualAmount)
```

#### Position Event Forwarding (positions only)

```solidity
function emitPositionUpdate(uint256 collateral, uint256 price, uint256 principal) external
function emitPositionDenied(address denier, string calldata message) external
function notifyInterestPaid(uint256 amount) external  // V2 MintingHubGateway only
```

### Events

```solidity
event PositionOpened(address indexed owner, address indexed position, address original, address collateral);
event ChallengeStarted(address indexed challenger, address indexed position, uint256 size, uint256 number);
event ChallengeAverted(address indexed position, uint256 number, uint256 size);
event ChallengeSucceeded(address indexed position, uint256 number, uint256 bid, uint256 acquiredCollateral, uint256 challengeSize);
event PostponedReturn(address collateral, address indexed beneficiary, uint256 amount);
event ForcedSale(address pos, uint256 amount, uint256 priceE36MinusDecimals);
event PositionUpdate(address indexed position, uint256 collateral, uint256 price, uint256 principal);
event PositionDeniedByGovernance(address indexed position, address indexed denier, string message);
```

---

## Position (V3)

Individual collateralized debt position contract.

### Immutable Properties

```solidity
function original() external view returns (address)
function hub() external view returns (address)
function dEURO() external view returns (IDecentralizedEURO)
function collateral() external view returns (IERC20)
function minimumCollateral() external view returns (uint256)
function riskPremiumPPM() external view returns (uint24)
function reserveContribution() external view returns (uint24)
function challengePeriod() external view returns (uint40)
function start() external view returns (uint40)
function limit() external view returns (uint256)
```

### State View Functions

```solidity
function price() external view returns (uint256)
function virtualPrice() public view returns (uint256)
function challengedAmount() external view returns (uint256)
function cooldown() external view returns (uint40)
function expiration() external view returns (uint40)
function isClosed() public view returns (bool)

// Debt
function principal() external view returns (uint256)
function interest() external view returns (uint256)
function lastAccrual() external view returns (uint40)
function fixedAnnualRatePPM() external view returns (uint24)
function getDebt() public view returns (uint256)
function getInterest() public view returns (uint256)
function getCollateralRequirement() public view returns (uint256)

// Minting capacity
function availableForMinting() public view returns (uint256)
function availableForClones() external view returns (uint256)
function getUsableMint(uint256 totalMint) public view returns (uint256)
function getMintAmount(uint256 usableMint) external view returns (uint256)

function challengeData() external view returns (uint256 liqPrice, uint40 phase)
function isValidPriceReference(address referencePosition, uint256 newPrice) external view returns (bool)
```

### Owner Functions

```solidity
function mint(address target, uint256 amount) public

function repay(uint256 amount) public returns (uint256 used)
function repayFull() external returns (uint256 used)

// V3 unified adjustment (replaces V2 `adjust(newDebt, ...)`)
function adjust(
    uint256 newPrincipal,
    uint256 newCollateral,
    uint256 newPrice,
    bool withdrawAsNative
) external payable

function adjustWithReference(
    uint256 newPrincipal,
    uint256 newCollateral,
    uint256 newPrice,
    address referencePosition,
    bool withdrawAsNative
) external payable

function adjustPrice(uint256 newPrice) public
function adjustPriceWithReference(uint256 newPrice, address referencePosition) external

function withdrawCollateral(address target, uint256 amount) public
function withdrawCollateralAsNative(address target, uint256 amount) public

function rescueToken(address token, address target, uint256 amount) external
```

### Governance Functions

```solidity
function deny(address[] calldata helpers, string calldata message) external
```

### Hub-Only Functions

```solidity
function initialize(address parent, uint40 _expiration) external
function forceSale(address buyer, uint256 colAmount, uint256 proceeds) external
function transferChallengedCollateral(address target, uint256 amount) external
function notifyChallengeStarted(uint256 size, uint256 _price) external
function notifyChallengeAverted(uint256 size) external
function notifyChallengeSucceeded(uint256 _size) external returns (
    address owner,
    uint256 effectiveSize,
    uint256 principalRepaid,
    uint256 interestPaid,
    uint32 reservePPM
)
```

### Sibling-Position Notifications

```solidity
function notifyMint(uint256 mint_) external
function notifyRepaid(uint256 repaid_) external
function assertCloneable() external view
```

### Events

```solidity
event MintingUpdate(uint256 collateral, uint256 price, uint256 principal);
event PositionDenied(address indexed sender, string message);
```

---

## PositionFactory

Factory for deploying Position contracts via ERC-1167 minimal proxy clones.

```solidity
function createNewPosition(
    address _owner,
    address _dEURO,
    address _collateral,
    uint256 _minCollateral,
    uint256 _initialLimit,
    uint40 _initPeriod,
    uint40 _duration,
    uint40 _challengePeriod,
    uint24 _riskPremiumPPM,
    uint256 _liqPrice,
    uint24 _reserve
) external returns (address)

function clonePosition(address _parent) external returns (address)
```

---

## PositionRoller

Flash-loan-based helper for migrating debt between positions in the same MintingHub.

```solidity
function roll(
    IPosition source,
    uint256 repay,
    uint256 collWithdraw,
    IPosition target,
    uint256 mint,
    uint256 collDeposit,
    uint40 expiration
) external

function rollFully(IPosition source, IPosition target) external

function rollFullyWithExpiration(
    IPosition source,
    IPosition target,
    uint40 expiration
) public

// V3 native ETH variants
function rollNative(...) external payable
function rollFullyNative(IPosition source, IPosition target) external payable
function rollFullyNativeWithExpiration(
    IPosition source,
    IPosition target,
    uint40 expiration
) public payable
```

### Events

```solidity
event Roll(address source, uint256 collWithdraw, uint256 repay, address target, uint256 collDeposit, uint256 mint);
```

---

## Savings / SavingsGateway

Interest-bearing dEURO savings. V3 (`Savings`) routes directly; V2 (`SavingsGateway`) adds frontend-code overloads.

### View Functions

```solidity
function dEURO() external view returns (IERC20)
function GATEWAY() external view returns (IFrontendGateway)  // V2 only

function savings(address account) external view returns (
    uint192 saved,
    uint64 ticks
)

function accruedInterest(address accountOwner) public view returns (uint192)
function accruedInterest(address accountOwner, uint256 timestamp) public view returns (uint192)
function calculateInterest(Account memory account, uint64 ticks) public view returns (uint192)

// Inherited from Leadrate
function currentTicks() public view returns (uint64)
function currentRatePPM() external view returns (uint24)
```

### State-Changing Functions

```solidity
function save(uint192 amount) public
function save(uint192 amount, bool compound) public                // V3 compounding variant
function save(address owner, uint192 amount) public

// V2 SavingsGateway frontend-code overloads
function save(uint192 amount, bytes32 frontendCode) external
function save(address owner, uint192 amount, bytes32 frontendCode) external

function withdraw(address target, uint192 amount) public returns (uint256)
function withdraw(address target, uint192 amount, bytes32 frontendCode) external returns (uint256)

function adjust(uint192 targetAmount) public
function adjust(uint192 targetAmount, bytes32 frontendCode) external

function refreshMyBalance() public returns (uint192)
function refreshBalance(address owner) public returns (uint192)
function claimInterest(address target) public returns (uint192)
```

### Events

```solidity
event Saved(address indexed account, uint192 amount);
event InterestCollected(address indexed account, uint256 interest);
event Withdrawn(address indexed account, uint192 amount);
```

---

## SavingsVaultDEURO (svDEURO)

ERC-4626 vault adapter for the Savings module.

### View Functions

```solidity
function SAVINGS() external view returns (ISavingsDEURO)
function totalClaimed() external view returns (uint256)
function info() public view returns (ISavingsDEURO.Account memory)
function price() public view returns (uint256)

// ERC-4626 standard
function asset() external view returns (address)
function totalAssets() public view returns (uint256)
function convertToShares(uint256 assets) external view returns (uint256)
function convertToAssets(uint256 shares) external view returns (uint256)
function maxDeposit(address) external view returns (uint256)
function maxMint(address) external view returns (uint256)
function maxWithdraw(address owner) external view returns (uint256)
function maxRedeem(address owner) external view returns (uint256)
function previewDeposit(uint256 assets) external view returns (uint256)
function previewMint(uint256 shares) external view returns (uint256)
function previewWithdraw(uint256 assets) external view returns (uint256)
function previewRedeem(uint256 shares) external view returns (uint256)
```

### State-Changing Functions (ERC-4626)

```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares)
function mint(uint256 shares, address receiver) external returns (uint256 assets)
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)
function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)
```

### Events

```solidity
event InterestClaimed(uint256 interest, uint256 totalClaimed);
event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
```

---

## DEPSwrapper (DEPS)

ERC-20 wrapper around nDEPS. Wrapping strips the time-weighted voting state.

```solidity
function wrap(uint256 amount) public
function unwrap(uint256 amount) public
function unwrapAndSell(uint256 amount) public returns (uint256)
function halveHoldingDuration(address[] calldata helpers) public
function decimals() public view returns (uint8)  // 18
```

---

## StablecoinBridge

1:1 conversion bridge between an external EUR stablecoin and dEURO.

### Constants

| Name | Type | Value | Description |
|---|---|---|---|
| `EMERGENCY_QUORUM` | uint32 | 1,000 (10%) | Required votes for emergency stop |

### View Functions

```solidity
function eur() external view returns (IERC20)
function dEURO() external view returns (IDecentralizedEURO)
function horizon() external view returns (uint256)
function limit() external view returns (uint256)
function minted() external view returns (uint256)
function stopped() external view returns (bool)
```

### State-Changing Functions

```solidity
function mint(uint256 amount) external
function mintTo(address target, uint256 amount) public

function burn(uint256 amount) external
function burnAndSend(address target, uint256 amount) external

function emergencyStop(
    address[] calldata _helpers,
    string calldata _message
) external
```

### Events

```solidity
event EmergencyStopped(address indexed caller, string message);
```

---

## FrontendGateway (V2 only)

Frontend referral reward system. See [Frontend Rewards](../frontend-rewards.md) for the user-facing description.

### View Functions

```solidity
function DEURO() external view returns (IERC20)
function EQUITY() external view returns (Equity)
function DEPS() external view returns (DEPSWrapper)
function MINTING_HUB() external view returns (IMintingHubGateway)
function SAVINGS() external view returns (SavingsGateway)

// Fee rates (PPM)
function feeRate() external view returns (uint24)
function savingsFeeRate() external view returns (uint24)
function mintingFeeRate() external view returns (uint24)
function nextFeeRate() external view returns (uint24)
function nextSavingsFeeRate() external view returns (uint24)
function nextMintingFeeRate() external view returns (uint24)
function changeTimeLock() external view returns (uint256)

// Frontend code data
function frontendCodes(bytes32 code) external view returns (uint256 balance, address owner)
function referredPositions(address position) external view returns (bytes32)
function lastUsedFrontendCode(address user) external view returns (bytes32)
function getPositionFrontendCode(address position) external view returns (bytes32)
```

### State-Changing Functions

```solidity
// User
function invest(uint256 amount, uint256 expectedShares, bytes32 frontendCode) external returns (uint256 shares)
function redeem(address target, uint256 shares, uint256 expectedProceeds, bytes32 frontendCode) external returns (uint256 proceeds)

// Frontend operator
function registerFrontendCode(bytes32 frontendCode) external returns (bool)
function transferFrontendCode(bytes32 frontendCode, address to) external returns (bool)
function withdrawRewards(bytes32 frontendCode) external returns (uint256)
function withdrawRewardsTo(bytes32 frontendCode, address to) external returns (uint256)

// Governance
function proposeChanges(
    uint24 newFeeRatePPM_,
    uint24 newSavingsFeeRatePPM_,
    uint24 newMintingFeeRatePPM_,
    address[] calldata helpers
) external
function executeChanges() external

// Service-only (called by other gateway modules)
function updateSavingCode(address savingsOwner, bytes32 frontendCode) external
function updateSavingRewards(address saver, uint256 interest) external
function registerPosition(address position, bytes32 frontendCode) external
function updatePositionRewards(address position, uint256 amount) external
function init(address savings, address mintingHub) external
```

### Events

```solidity
event FrontendCodeRegistered(address owner, bytes32 frontendCode);
event FrontendCodeTransferred(address from, address to, bytes32 frontendCode);
event FrontendCodeRewardsWithdrawn(address to, uint256 amount, bytes32 frontendCode);
event NewPositionRegistered(address position, bytes32 frontendCode);
event RateChangesProposed(address who, uint24 nextFeeRate, uint24 nextSavingsFeeRate, uint24 nextMintingFeeRate, uint256 nextChange);
event RateChangesExecuted(address who, uint24 nextFeeRate, uint24 nextSavingsFeeRate, uint24 nextMintingFeeRate);
event InvestRewardAdded(bytes32 frontendCode, address user, uint256 amount, uint256 reward);
event RedeemRewardAdded(bytes32 frontendCode, address user, uint256 amount, uint256 reward);
event SavingsRewardAdded(bytes32 frontendCode, address saver, uint256 interest, uint256 reward);
event PositionRewardAdded(bytes32 frontendCode, address position, uint256 amount, uint256 reward);
```

---

## CoinLendingGateway (V2 only)

Native ETH lending against dEURO without manual WETH wrapping. Routes through `MintingHubGateway`.

```solidity
function lendWithCoin(
    address parent,
    uint256 initialMint,
    uint40 expiration,
    bytes32 frontendCode,
    uint256 liquidationPrice
) external payable returns (address position)

function rescueCoin(address to) external           // owner-only emergency rescue
function rescueToken(address token, address to) external

// Pausable / Ownable / ReentrancyGuard standard surface
function pause() external
function unpause() external
function paused() external view returns (bool)
function owner() external view returns (address)
function transferOwnership(address newOwner) external
function renounceOwnership() external
```

### Events

```solidity
event CoinRescued(address indexed to, uint256 amount);
event TokenRescued(address indexed token, address indexed to, uint256 amount);
```

---

## BridgedToken (L2 only)

`IOptimismMintableERC20` implementation deployed on Optimism and Base. Only the OP Stack standard bridge (`0x4200000000000000000000000000000000000010`) can mint or burn.

```solidity
function REMOTE_TOKEN() external view returns (address)  // mainnet dEURO
function BRIDGE() external view returns (address)        // 0x4200…0010
function l1Token() external view returns (address)
function l2Bridge() external view returns (address)

function mint(address _to, uint256 _amount) external   // bridge only
function burn(address _from, uint256 _amount) external // bridge only

// ERC-20 standard
```

### Events

```solidity
event Mint(address indexed account, uint256 amount);
event Burn(address indexed account, uint256 amount);
```
