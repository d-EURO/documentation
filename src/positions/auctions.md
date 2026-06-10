# Challenges and Auctions

**Challenges and the resulting auctions are a mechanism to ensure positions are backed by sound collateral.**

## Overview

The Decentralized Euro system uses challenges instead of oracles to determine fair market prices. Anyone can challenge a position they believe is undercollateralized, triggering an auction that discovers the true market price.

## Auction Design

Challenging a position triggers an auction of the collateral. The auction serves two purposes: determining the market price and liquidating the collateral at that market price. The auction frees the system from the need for an external oracle. The difficulty lies in designing the auction such that it cannot be profitably manipulated.

Traditional auctions are prone to price manipulation by the owner of the auctioned assets. For example, if Alice minted 1,000 dEURO against a collateral whose value has dropped to 950 dEURO, she might be tempted to bid 1,001 dEURO for that collateral, planting the false belief that the position is still well-collateralized. The dEURO system prevents this by cleverly switching the collateral the bidders are bidding for at the critical price point. For bids below 1,000 dEURO, the bidders get Alice's collateral. For bids above 1,000 dEURO, the bidders get the collateral asset the challenger had put up. Price manipulation thus becomes very expensive for Alice: a 1,001 dEURO bid would not go to her own pocket but to the challenger. To prevent her position from being liquidated, she would have to pay 1,001 dEURO for an asset worth 950 dEURO every time the challenger chooses to repeat the challenge.

This reveals an underlying assumption of the system: an acceptable collateral must be available widely enough that challengers can actually source it. Once Alice ends up owning 100% of the collateral asset in circulation, she cannot be challenged any more and could start minting arbitrary amounts of dEURO. That is also why the dEURO auction system does not work with non-fungible tokens. No position should ever be accepted that is based on collateral with too limited availability.

One pleasant property of this design is that as long as someone is willing to bid the market price for a collateral asset, maintaining the position does not require any attention from the owner. Only when the market price is about to fall below the liquidation price should the owner think about repaying the position or making it sounder by adding more collateral and adjusting the liquidation price downwards.

In case the highest bid is below the liquidation price, the challenge is considered successful. After a successful challenge, the minter reserve associated with the position is dissolved and added to the proceeds from the auction. The total proceeds are then used to repay the position and to reward the challenger. If there are not enough funds to do that, equity holders have to step in and suffer a loss. If there is something left, the remaining amount is sent to the equity holders as a profit. For example, if the minter reserve was 20% and the highest bid for Alice's collateral was 950 dEURO, the equity holders make a profit of 150 dEURO minus the challenger reward. However, if the highest bid was below 800 dEURO, they make a loss.

## Challenge Phases

A challenge proceeds through two distinct phases:

### Phase 1: Aversion Period

During this phase, the position owner can **avert** the challenge by buying the challenger's collateral at the liquidation price.

| Aspect | Description |
|---|---|
| **Duration** | Equal to the challenge period (set at position creation) |
| **Price** | Fixed at the position's liquidation price |
| **Who benefits** | Position owner can prevent liquidation |
| **What happens** | Owner pays challenger, challenge is cancelled, 1-day mint cooldown is applied |

**Example:** If the liquidation price is 3,000 dEURO/WETH and 0.5 WETH was challenged, the owner can pay 1,500 dEURO to avert the challenge.

### Phase 2: Dutch Auction

If Phase 1 passes without aversion, a Dutch auction begins where the price decreases linearly over time.

| Aspect | Description |
|---|---|
| **Starting price** | The virtual price (higher of liquidation price and the price implied by debt and collateral) |
| **Ending price** | Zero |
| **Duration** | Equal to the challenge period |
| **Price decrease** | Linear from start to zero |

```
Price
  │
  │\
  │ \
  │  \
  │   \
  │    \
  │     \
  └──────────► Time
  Start    End
```

The first valid bid at the current price wins that portion of the collateral.

## Starting a Challenge

To challenge a position you need:

1. **Collateral:** enough of the same collateral asset to put up.
2. **Minimum size:** at least the position's minimum collateral amount.
3. **Active position:** the position must not be expired (expired positions use a different forced-sale path described below).

```solidity
function challenge(
    address _positionAddr,      // position to challenge
    uint256 _collateralAmount,  // amount of collateral to put up
    uint256 minimumPrice        // front-running protection
) external payable returns (uint256 challengeNumber)
```

For native ETH positions in V3, the collateral is sent as `msg.value`. For ERC-20 positions, approve the minting hub first and then call `challenge()`.

Successful challengers receive a **2% reward** (`CHALLENGER_REWARD = 20000` PPM) on the challenged amount. This incentivises market participants to monitor positions and challenge undercollateralized ones.

## Bidding in Auctions

Once the Dutch auction begins in Phase 2, anyone can bid:

```solidity
function bid(
    uint256 _challengeNumber,
    uint256 size,                    // max collateral to bid for
    bool postponeCollateralReturn    // delay return (for blacklist scenarios)
) external

// V3 native coin return option
function bid(
    uint256 _challengeNumber,
    uint256 size,
    bool postponeCollateralReturn,
    bool returnCollateralAsNative
) external
```

| Scenario | Who gets collateral | Who gets dEURO |
|---|---|---|
| Bid > liquidation price | Bidder gets **challenger's** collateral | Challenger gets dEURO |
| Bid ≤ liquidation price | Bidder gets **position owner's** collateral | Goes to repay debt |

### Postponed Collateral Returns

If a bidder is blacklisted by the collateral token, returns can be postponed and claimed later:

```solidity
function pendingReturns(address collateral, address owner) external view returns (uint256)
function returnPostponedCollateral(address collateral, address target) external
function returnPostponedCollateral(address collateral, address target, bool asNative) external
```

## Challenge Outcomes

### Successful Challenge (bid < liquidation price)

1. Challenged collateral is transferred to the bidder.
2. The position's minter reserve is dissolved.
3. Proceeds are used to repay debt (interest first in V3, then principal).
4. Challenger receives the 2% reward.
5. Any remaining profit goes to equity; any shortfall is covered by equity (and ultimately by the general borrowers reserve).

### Averted Challenge (Phase 1)

1. Position owner pays the challenger at the liquidation price.
2. Challenger receives their collateral back plus profit.
3. The position continues normally.
4. A 1-day cooldown is applied before the owner can mint again.

### Challenge Timeout (no bids)

If nobody bids during Phase 2:

1. The challenge is considered successful at price zero.
2. Collateral is acquired by the last successful bidder, or by the challenger if none.
3. The system suffers the maximum loss.

## Expired Positions

When a position expires, a special purchase mechanism becomes available — the "forced sale". This replaces the regular challenge mechanism for expired positions and is what guarantees a graceful wind-down.

```solidity
function buyExpiredCollateral(
    IPosition pos,
    uint256 upToAmount
) external returns (uint256 actualAmount)

// V3 native coin option
function buyExpiredCollateral(
    IPosition pos,
    uint256 upToAmount,
    bool receiveAsNative
) external returns (uint256 actualAmount)
```

The price for expired positions uses its own Dutch auction starting at 10× the virtual price (`EXPIRED_PRICE_FACTOR = 10`) and decaying linearly down to zero over the challenge period. This ensures buyers cannot grab freshly expired collateral at a bargain, while the price still drops fast enough to clear unwanted positions.

While a forced sale is in progress, regular challenges are blocked. Proceeds first repay debt (interest before principal in V3), then the remainder goes to the position owner. If proceeds do not cover debt, equity absorbs the loss.

## Cooldown Periods

After certain challenge events, minting is temporarily restricted:

| Event | Cooldown | Reason |
|---|---|---|
| Challenge averted | 1 day | Allow repeat challenges |
| Challenge succeeded | 3 days | Time to stabilise position |
| Price increased | 3 days | Allow challenges at the new price |

The 3-day price cooldown can be bypassed in V3 using a valid reference position — see [Adjusting a Position](adjust.md#v3-cooldown-free-price-increase-via-reference).

## Events to Watch

```solidity
event ChallengeStarted(address indexed challenger, address indexed position, uint256 size, uint256 number);
event ChallengeAverted(address indexed position, uint256 number, uint256 size);
event ChallengeSucceeded(
    address indexed position,
    uint256 number,
    uint256 bid,
    uint256 acquiredCollateral,
    uint256 challengeSize
);
event PostponedReturn(address collateral, address indexed beneficiary, uint256 amount);
event ForcedSale(address pos, uint256 amount, uint256 priceE36MinusDecimals);
```

## Contract Constants

| Constant | Value | Description |
|---|---|---|
| `CHALLENGER_REWARD` | 20,000 (2%) | Reward for successful challenges |
| `EXPIRED_PRICE_FACTOR` | 10 | Starting price multiplier for expired positions |
| Minimum challenge period | 1 day | Set at position creation |
| Cooldown after challenge succeeded | 3 days | Minting suspended |
| Cooldown after challenge averted | 1 day | Minting suspended |
