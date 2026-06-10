# Position Roller

**Migrate your debt from one position to another using flash loans.**

The Position Roller is a helper contract that atomically moves your debt from a source position to a target position. This is useful when you want to take advantage of better terms, extend your position's expiration, or consolidate.

Each MintingHub module ships with its own roller. A roller can only operate between two positions registered with the same MintingHub:

| Module | PositionRoller |
|---|---|
| V2 | [`0x4CE0AB2FC21Bd27a47A64F594Fdf7654Ea57Dc79`](https://etherscan.io/address/0x4CE0AB2FC21Bd27a47A64F594Fdf7654Ea57Dc79) |
| V3 | [`0x5C22d5b752b2121faE7F6f0069252B03B2F7c5CD`](https://etherscan.io/address/0x5C22d5b752b2121faE7F6f0069252B03B2F7c5CD) |

## Why Roll a Position?

| Scenario | Benefit |
|---|---|
| **Better interest rate** | New positions may have a lower risk premium or follow a lower Leadrate |
| **Extend expiration** | Avoid forced liquidation of expiring positions |
| **Higher price tolerance** | Clone a position with a better liquidation price |
| **Different collateral type** | Move to a more liquid or stable collateral (manual swap required) |
| **Consolidation** | Merge multiple small positions into a single one |

## How Rolling Works

The roller uses a **flash loan** to move debt and collateral in a single transaction:

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE TRANSACTION                        │
├─────────────────────────────────────────────────────────────┤
│  1. Flash-loan dEURO         ──► temporary dEURO            │
│  2. Repay source position     ──► debt cleared              │
│  3. Withdraw collateral       ──► collateral released       │
│  4. Deposit into target       ──► collateral locked         │
│  5. Mint from target          ──► new debt created          │
│  6. Repay flash loan          ──► transaction complete      │
└─────────────────────────────────────────────────────────────┘
```

All steps happen in the same transaction — either everything succeeds or nothing changes.

## Rolling Methods

### Automatic Rolling

```solidity
function rollFully(IPosition source, IPosition target) external

function rollFullyWithExpiration(
    IPosition source,
    IPosition target,
    uint40 expiration
) external
```

What happens:

- All collateral is moved.
- The maximum possible amount is minted in the target.
- If the target has less minting capacity than the source's debt, the remaining debt must be covered from your wallet.

### Manual Rolling

For precise control over the roll parameters:

```solidity
function roll(
    IPosition source,        // your current position
    uint256 repay,           // amount to repay (principal + interest in V3)
    uint256 collWithdraw,    // collateral to withdraw from source
    IPosition target,        // position to roll into
    uint256 mint,            // amount to mint in target
    uint256 collDeposit,     // collateral to deposit in target
    uint40 expiration        // desired expiration for target
) external
```

### Native ETH Rolling (V3)

V3 positions can hold native ETH (wrapped to WETH internally). The roller exposes payable variants that handle the wrapping/unwrapping for you:

```solidity
function rollNative(...) external payable

function rollFullyNative(IPosition source, IPosition target) external payable

function rollFullyNativeWithExpiration(
    IPosition source,
    IPosition target,
    uint40 expiration
) external payable
```

Benefits of the native variants:

- No need to interact with WETH directly.
- Collateral flows through the roller in native form.
- Excess is returned as native ETH.
- You can top up the position with extra collateral via `msg.value`.

V2 does not have native-ETH-aware roller functions. For V2 native-ETH positions, use the [CoinLendingGateway](smart-contracts.md#coinlendinggateway) to open the position; the roller then operates on the wrapped collateral.

## Prerequisites

**For ERC-20 collateral.** Approve the roller to move your collateral before rolling:

```javascript
await collateralToken.approve(ROLLER_ADDRESS, collateralBalance);
```

**For native ETH (V3).** No approval needed — just send ETH with the transaction if you want to add collateral.

**Position ownership.** You must own the **source** position. The **target** can be any valid position in the same minting hub. If you don't own the target, a clone of it is created for you.

## What Happens During a Roll

**Scenario 1 — rolling into your own position.** If you already own the target and the expiration matches:

1. Collateral is transferred directly to the target.
2. `mint()` is called on the existing target.
3. No cloning occurs.

**Scenario 2 — rolling into someone else's position.** If you do not own the target or want a different expiration:

1. The target position is **cloned** for you.
2. You become the owner of the new clone.
3. The clone inherits the target's parameters.
4. Your collateral goes into the clone.

**Scenario 3 — partial roll.** If the target does not have enough minting capacity:

1. As much as possible is minted in the target.
2. Remaining debt is covered from your wallet.
3. Excess dEURO from the flash loan is returned to you.

## Frontend Code Preservation (V2)

When rolling through the V2 `MintingHubGateway`, your frontend code is preserved on the new position. The roller checks whether the source MintingHub supports the gateway interface, reads the frontend code attached to the source position, and re-applies it to the cloned target.

V3 has no FrontendGateway layer, so frontend codes are not tracked on V3 rolls.

## Example: Rolling to Better Terms

**Current position:**

- 10,000 dEURO debt
- 0.5 ETH collateral (V3, native ETH)
- 6% effective rate
- Expires in 30 days

**Target position (cheaper terms):**

- Same collateral (native ETH)
- 4% effective rate
- 12-month duration

**Roll:**

```javascript
const roller = new ethers.Contract(ROLLER_V3, abi, signer);

// Native ETH variant — no approve, no WETH dance
await roller.rollFully(SOURCE_POSITION, TARGET_POSITION);
```

**Result:**

- Old position closed (debt = 0).
- New position created with your collateral.
- Lower interest rate locked in.
- Extended expiration.

## Error Handling

Common errors when rolling:

| Error | Cause | Solution |
|---|---|---|
| `NotOwner` | You don't own the source position | Use your own position |
| `NotPosition` | Invalid position address | Verify position addresses are registered in the same MintingHub |
| `NativeTransferFailed` | ETH transfer failed | Check receiving address (V3 native rolls only) |
| Insufficient allowance | Collateral not approved | Approve the roller first |

## Events

```solidity
event Roll(
    address source,        // source position address
    uint256 collWithdraw,  // collateral withdrawn
    uint256 repay,         // debt repaid
    address target,        // target position address
    uint256 collDeposit,   // collateral deposited
    uint256 mint           // amount minted
);
```

## Security Considerations

1. **Flash loan repayment.** The flash loan must be repaid in the same transaction. If minting in the target fails, the entire transaction reverts and your source position is untouched.
2. **Slippage.** If market conditions change between submission and execution, the roll may fail. Set parameters with this in mind.
3. **Position validation.** The roller validates that both positions are registered with the dEURO system before proceeding.
4. **Collateral matching.** `rollFully()` requires that the source and target have the same collateral type. Cross-collateral rolls require closing manually and reopening.

## Advanced: Custom Roll Strategies

### Partial Debt Migration

Move only part of your debt:

```javascript
await roller.roll(
    source,
    5000e18,        // repay only 5000 dEURO
    0.25e18,        // withdraw only 0.25 ETH
    target,
    5000e18,        // mint 5000 in target
    0.25e18,        // deposit 0.25 ETH
    newExpiration
);
```

### Adding Collateral During a Roll

For native ETH (V3), send extra ETH with the call:

```javascript
await roller.rollFullyNative(source, target, {
    value: ethers.utils.parseEther("0.1") // add 0.1 ETH
});
```

### Changing Collateral Type

Rolling between different collaterals requires manual handling:

1. Close the source position normally.
2. Swap the collateral on a DEX.
3. Open a new position with the new collateral.

The roller only handles same-collateral rolls within the same MintingHub.
