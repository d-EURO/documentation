# Frontend Rewards

**Earn rewards by building frontends and referring users to the dEURO ecosystem.**

The dEURO system includes a built-in reward mechanism for frontend operators and referrers. Anyone can register a frontend code and earn a share of the activity generated through their interface.

::: warning V2 ONLY
Frontend rewards are emitted exclusively by the **V2 module** (`MintingHubGateway`, `SavingsGateway`, `FrontendGateway`, `CoinLendingGateway`). The V3 module bypasses the Gateway layer and does **not** distribute frontend rewards. To earn rewards, route your users through V2 contracts.
:::

## How It Works

The `FrontendGateway` tracks user activity and attributes rewards to registered frontend codes:

```
User action → frontend code → reward accrued → withdraw anytime
```

Frontend operators earn rewards from three types of user activity:

| Activity | Reward rate | Source |
|---|---|---|
| **nDEPS investment / redemption** | 1% of volume | `FrontendGateway.invest()` / `redeem()` |
| **Savings interest** | 5% of interest earned | `SavingsGateway` callbacks |
| **Position interest** | 5% of interest paid | `MintingHubGateway.notifyInterestPaid()` |

**Example earnings.** Your frontend facilitates:

- 100,000 dEURO invested in nDEPS → 1,000 dEURO reward
- Users earn 5,000 dEURO in savings interest → 250 dEURO reward
- Borrowers pay 10,000 dEURO in position interest → 500 dEURO reward

Total: 1,750 dEURO in rewards.

## Registering a Frontend Code

### Step 1 — Choose Your Code

A frontend code is a `bytes32` identifier. You can create one from any string:

```javascript
const frontendCode = ethers.utils.formatBytes32String("myapp");
// 0x6d79617070000000000000000000000000000000000000000000000000000000
```

Requirements:

- Must be unique (not already registered).
- Cannot be the zero bytes32.
- First come, first served.

### Step 2 — Register On-Chain

```solidity
function registerFrontendCode(bytes32 frontendCode) external returns (bool)
```

The FrontendGateway is deployed at [`0x5c49C00f897bD970d964BFB8c3065ae65a180994`](https://etherscan.io/address/0x5c49C00f897bD970d964BFB8c3065ae65a180994).

### Step 3 — Integrate Into Your Frontend

Pass your frontend code when users interact with the protocol:

```javascript
// nDEPS investment with frontend code
await frontendGateway.invest(amount, expectedShares, frontendCode);

// Savings with frontend code (V2 SavingsGateway)
await savingsGateway.save(amount, frontendCode);

// Open position with frontend code (V2 MintingHubGateway)
await mintingHubGateway.openPosition(...params, frontendCode);

// Lend native ETH with frontend code (V2 CoinLendingGateway)
await coinLendingGateway.lendWithCoin(parent, mint, expiry, frontendCode, liqPrice, { value: ethAmount });
```

## Collecting Rewards

### Check Your Balance

```solidity
function frontendCodes(bytes32 code) external view returns (uint256 balance, address owner)
```

### Withdraw Rewards

```solidity
function withdrawRewards(bytes32 frontendCode) external returns (uint256)
function withdrawRewardsTo(bytes32 frontendCode, address to) external returns (uint256)
```

Rewards are paid out of the equity pool. If equity is very low, withdrawals may be limited.

## Transferring Ownership

Frontend codes can be transferred to a new owner — useful for selling a frontend business, moving to a multisig, or rotating operational wallets:

```solidity
function transferFrontendCode(bytes32 frontendCode, address to) external returns (bool)
```

## Gateway Contracts

The reward system uses specialised "Gateway" contracts that extend the base functionality:

| Base contract | Gateway version | Added feature |
|---|---|---|
| `MintingHub` (V2) | `MintingHubGateway` | Tracks position interest for rewards |
| `Savings` (V2) | `SavingsGateway` | Tracks savings interest for rewards |
| `Equity` (always V2) | invoked via `FrontendGateway` | Tracks investment/redemption volume |
| V2 ETH-as-collateral | `CoinLendingGateway` | Native ETH positions, preserves frontend code |

V3's `MintingHub` and `Savings` route around the gateway layer, so the FrontendGateway does not see V3 activity at all. This is intentional — V3 prioritises gas efficiency and a smaller surface area over the optional referral mechanics.

## Fee Rate Governance

The reward rates can be adjusted by qualified nDEPS holders:

```solidity
function proposeChanges(
    uint24 newFeeRatePPM_,        // investment fee, max 2% (20,000 PPM)
    uint24 newSavingsFeeRatePPM_, // savings interest fee, max 100%
    uint24 newMintingFeeRatePPM_, // minting interest fee, max 100%
    address[] calldata helpers
) external

function executeChanges() external  // after 7 days
```

Current rates (initial values at deployment):

| Parameter | Rate | PPM |
|---|---|---|
| Investment / Redemption fee | 1% | 10,000 |
| Savings interest fee | 5% | 50,000 |
| Minting interest fee | 5% | 50,000 |

Requirements: caller must have ≥2% voting power, 7-day timelock before execution.

## Position Roll-overs

When rolling a position through the V2 `PositionRoller`, the source position's frontend code is automatically carried over to the rolled-into position. This ensures frontend operators continue receiving rewards after a roll. The mechanism only applies if the source MintingHub supports the `IMintingHubGateway` interface (which V2 does and V3 does not).

## Tracking User Activity

The `lastUsedFrontendCode` mapping tracks which frontend code a user last interacted with:

```solidity
function lastUsedFrontendCode(address user) external view returns (bytes32)
```

This enables persistent referral attribution and basic analytics.

## Contract Addresses

| Contract | Address |
|---|---|
| FrontendGateway | [`0x5c49C00f897bD970d964BFB8c3065ae65a180994`](https://etherscan.io/address/0x5c49C00f897bD970d964BFB8c3065ae65a180994) |
| MintingHubGateway (V2) | [`0x8B3c41c649B9c7085C171CbB82337889b3604618`](https://etherscan.io/address/0x8B3c41c649B9c7085C171CbB82337889b3604618) |
| SavingsGateway (V2) | [`0x073493d73258C4BEb6542e8dd3e1b2891C972303`](https://etherscan.io/address/0x073493d73258C4BEb6542e8dd3e1b2891C972303) |
| CoinLendingGateway (V2) | [`0x1DA37D613FB590eeD37520b72e9c6F0F6eee89D2`](https://etherscan.io/address/0x1DA37D613FB590eeD37520b72e9c6F0F6eee89D2) |

## Events

```solidity
event FrontendCodeRegistered(address owner, bytes32 frontendCode);
event FrontendCodeTransferred(address from, address to, bytes32 frontendCode);
event FrontendCodeRewardsWithdrawn(address to, uint256 amount, bytes32 frontendCode);
event NewPositionRegistered(address position, bytes32 frontendCode);
event InvestRewardAdded(bytes32 frontendCode, address user, uint256 amount, uint256 reward);
event RedeemRewardAdded(bytes32 frontendCode, address user, uint256 amount, uint256 reward);
event SavingsRewardAdded(bytes32 frontendCode, address saver, uint256 interest, uint256 reward);
event PositionRewardAdded(bytes32 frontendCode, address position, uint256 amount, uint256 reward);
event RateChangesProposed(address who, uint24 nextFeeRate, uint24 nextSavingsFeeRate, uint24 nextMintingFeeRate, uint256 nextChange);
event RateChangesExecuted(address who, uint24 nextFeeRate, uint24 nextSavingsFeeRate, uint24 nextMintingFeeRate);
```

## Best Practices

1. **Register early** — frontend codes are first-come-first-served.
2. **Use meaningful codes** — choose a code that represents your brand (e.g. your app name).
3. **Monitor rewards** — set up event listeners to track reward accumulation in real time.
4. **Secure your owner key** — the owner controls the frontend code. Use a hardware wallet or multisig.
5. **Disclose to users** — be transparent about the referral system.

## FAQ

### Can I use multiple frontend codes?

Yes. Useful for different products, A/B testing, or partner programs.

### What if a user doesn't use a frontend code?

They can interact with the base contracts directly. No rewards are tracked; the protocol works normally.

### Can frontend codes be revoked?

No. Once registered, a frontend code exists permanently. Ownership can only be transferred, not revoked.

### Will V3 ever pay frontend rewards?

Not in the current design. V3 deliberately omits the gateway layer for gas reasons. If you need rewards, use V2.
