# Governance

**A guide for reserve pool share holders on how to use their veto power.**

## Governance Rules

The governance system is subject to the following rules:

1. Anyone can make proposals. Making a proposal costs a fee of at least 1,000 dEURO. There might also be a higher soft limit by convention, which is not enforced in the smart contracts but socially by vetoing proposals that paid a fee below what is generally considered appropriate.
2. Proposals for new minting modules pass after a minimum of 14 days unless someone vetoes them. When proposing new types of collateral in either V2 or V3 minting hubs, the position initialization period must be at least 3 days. These are minimum durations. When making a proposal, it is recommended to give the system participants significantly more time to assess the proposal in order to avoid being vetoed simply because there was not enough time for discussion.
3. Anyone with more than q = 2% of the total votes V has veto power, i.e. a user with v votes can veto if v > qV holds.
4. The number of votes of a user is calculated by multiplying their Native Decentralized Euro Protocol Shares with the time they have held them. If shares are moved to a new address, their associated votes are reset to zero. nDEPS can only be redeemed after a minimum holding period of 90 days.
5. Users can delegate their votes to other users, who in turn can delegate them further. This allows minority shareholders to team up for a veto. For example, if Alice has 1% of the votes and delegates them to Bob, Bob himself has 1.5% and delegates them to Charles, then both Bob and Charles have the power to execute vetoes.
6. Users can cancel each other's votes. For example, Alice can sacrifice 100 votes in order to also reduce Bob's number of votes by 100. This is done using the `kamikaze` function, which is not yet exposed in the frontend.

In the ideal case there is a broad consensus on what constitutes an acceptable proposal and no one ever makes a proposal that has to be vetoed. One place to help form this consensus is the [Decentralized Euro forum](https://github.com/orgs/d-EURO/discussions).

## Voting Power

### How Votes Are Calculated

Your voting power is based on two factors:

```
votes = nDEPS balance × holding duration
```

| Factor | Effect |
|---|---|
| **Balance** | More nDEPS = more votes |
| **Time** | Longer holding = more votes |

**Example:**

- Alice holds 1,000 nDEPS for 1 year → 1,000 × 365 days = 365,000 vote-days.
- Bob holds 10,000 nDEPS for 1 month → 10,000 × 30 days = 300,000 vote-days.
- Alice has more voting power despite holding fewer tokens.

### Checking Your Voting Power

```solidity
function votes(address holder) external view returns (uint256)
function relativeVotes(address holder) external view returns (uint256)  // in PPB
function totalVotes() external view returns (uint256)
function holdingDuration(address holder) external view returns (uint256)
```

### Vote Reset on Transfer

When nDEPS tokens are transferred, the recipient's holding duration is reset. This prevents:

- Vote-buying attacks
- Flash-loan voting manipulation
- Short-term speculators dominating governance

If you only intend to trade nDEPS or hold it inside an AMM pool, wrap it into `DEPS` using the [DEPSwrapper](smart-contracts.md#depswrapper-deps) contract. DEPS is freely transferable without resetting the underlying holding period — but it also does not carry voting power until it is unwrapped back into nDEPS.

## Vote Delegation

Delegation allows smaller holders to combine their voting power without transferring tokens.

```
Alice (1%) → delegates to → Bob (1.5%) → delegates to → Charles (2%)
```

In this scenario:

- Alice has 1% voting power.
- Bob has 2.5% (his 1.5% + Alice's 1%).
- Charles has 4.5% (his 2% + Bob's 2.5%).
- Both Bob and Charles can execute vetoes (≥2%).

```solidity
function delegateVoteTo(address delegate) external
```

Key points:

- You keep your own votes — delegation adds to the delegate's power.
- Delegation is transitive — it can chain through multiple addresses.
- Only one delegate at a time per address.
- Set delegate to `address(0)` to remove delegation.

### Using Delegated Votes (Helper Arrays)

When executing governance actions you must provide a **sorted array of helpers** (addresses that have delegated to you):

```solidity
function checkQualified(
    address sender,
    address[] calldata helpers  // sorted ascending, no duplicates
) external view
```

Requirements for the helpers array:

1. Sorted in ascending order by address.
2. No duplicate addresses.
3. All helpers must have delegated to `sender` (directly or through a chain).
4. `sender` must not be in the helpers list.

```javascript
const helpers = [aliceAddr, bobAddr, carolAddr].sort();
await equity.checkQualified(myAddress, helpers);
```

### Computing Total Delegated Votes

```solidity
function votesDelegated(
    address sender,
    address[] calldata helpers
) external view returns (uint256)
```

## The Kamikaze Mechanism

The kamikaze function is an emergency mechanism to counter malicious actors who accumulate too much voting power. Any nDEPS holder can sacrifice their own votes to reduce another user's votes by the same amount:

```solidity
function kamikaze(
    address[] calldata targets,  // addresses to reduce votes from
    uint256 votesToDestroy       // max votes caller will sacrifice
) external
```

Mechanism:

1. Your votes are reduced by `votesToDestroy`.
2. Each target's votes are reduced proportionally to their share of the targeted total.
3. Total destruction is capped by the smaller of your votes and the sum of target votes.

**Warning:** kamikaze is irreversible. Your votes are permanently destroyed.

## Emergency: Restructure Cap Table

If equity ever drops below the minimum (1,000 dEURO), a recovery function becomes available:

```solidity
function restructureCapTable(
    address[] calldata helpers,
    address[] calldata addressesToWipe
) external
```

This allows qualified voters to completely wipe nDEPS balances from specified addresses. It is designed as a last-resort measure to restart the system after catastrophic losses.

Requirements:

- Caller must have ≥2% voting power.
- Total equity must be below 1,000 dEURO.
- Should only be used in genuine emergencies.

## Flash Loan Protection

Flash-loan attacks on governance are made impossible by the 90-day minimum holding period: `redeem()` reverts with `BelowMinimumHoldingPeriod` whenever `canRedeem(owner)` returns false, and `canRedeem()` only returns true after the recipient has held the nDEPS for at least 90 days according to the contract's internal `voteAnchor`. Combined with the fact that voting power is `balance × holding duration` and a transfer resets the recipient's anchor, this means an attacker cannot flash-borrow nDEPS, vote (or veto), and redeem within the same transaction — they would have to hold the position for at least 90 days first.

## Investing in nDEPS

```solidity
function invest(uint256 amount, uint256 expectedShares) external returns (uint256 shares)

// Through the FrontendGateway (V2 — with referral rewards)
function invest(uint256 amount, uint256 expectedShares, bytes32 frontendCode) external returns (uint256 shares)
```

The price of nDEPS is determined by:

```
VALUATION_FACTOR = 5
Market Cap        = equity × VALUATION_FACTOR
Price per Share   = Market Cap / Total nDEPS Supply
```

A small fee on each investment goes to existing nDEPS holders and discourages short-term speculation.

## Redeeming nDEPS

```solidity
function redeem(address target, uint256 shares) external returns (uint256 proceeds)
function redeemExpected(address target, uint256 shares, uint256 expectedProceeds) external returns (uint256 proceeds)
function redeemFrom(address owner, address target, uint256 shares, uint256 expectedProceeds) external returns (uint256 proceeds)
```

Restrictions:

1. **90-day minimum holding period** — you can only redeem nDEPS once you have held them for at least 90 days. Transferring nDEPS resets this clock. This is the same mechanism that prevents flash-loan attacks on governance.
2. **Minimum equity** — the system must keep at least 1,000 dEURO of equity.

## Proposing System Changes

### New Minting Modules

Anyone can propose a new minting module (a contract that can mint/burn dEURO):

```solidity
function suggestMinter(
    address _minter,
    uint256 _applicationPeriod, // ≥ MIN_APPLICATION_PERIOD (14 days)
    uint256 _applicationFee,    // ≥ 1,000 dEURO
    string calldata _message
) external
```

### New Collateral Types

Via the MintingHub, propose new position types — see [Opening New Positions](positions/open.md).

### Interest Rate Changes

Qualified nDEPS holders can propose Leadrate changes:

```solidity
function proposeChange(uint24 newRatePPM_, address[] calldata helpers) external
function applyChange() external  // after 7 days
```

- 7-day timelock before execution.
- See [Savings & Interest](savings.md) for how the Leadrate flows into savings yields and borrowing costs.

## Vetoing Proposals

### Vetoing a Minter

```solidity
function denyMinter(address minter, address[] calldata helpers, string calldata message) external
```

### Vetoing a Position

```solidity
// On the Position contract, during initialization period
function deny(address[] calldata helpers, string calldata message) external
```

| Parameter | Value |
|---|---|
| Required voting power | 2% of total votes |
| Timing | Before initialization period ends |
| Effect | Permanent denial |

## Governance Events

```solidity
event Delegation(address indexed from, address indexed to);
event Trade(address who, int256 amount, uint256 totPrice, uint256 newprice);
event MinterApplied(address indexed minter, uint256 applicationPeriod, uint256 applicationFee, string message);
event MinterDenied(address indexed minter, string message);
event PositionDenied(address indexed sender, string message);
```

## Governance Constants

| Constant | Value | Description |
|---|---|---|
| `QUORUM` | 200 (2%) | Voting power needed for veto |
| `VALUATION_FACTOR` | 5 | Market cap = 5 × equity |
| `MIN_HOLDING_DURATION` | 90 days | Minimum nDEPS hold before redeem |
| `MIN_APPLICATION_PERIOD` | 14 days | Minimum for new minters |
| `MIN_FEE` | 1,000 dEURO | Minimum proposal fee |
| `MINIMUM_EQUITY` | 1,000 dEURO | Minimum for operations |

## Best Practices

### For nDEPS holders

1. **Hold long-term:** voting power grows with time.
2. **Stay informed:** monitor proposals on the forum.
3. **Delegate wisely:** choose delegates who share your values.
4. **Vote responsibly:** veto power exists to protect the system, not to push private agendas.

### For proposal makers

1. **Document thoroughly:** provide clear explanations.
2. **Allow time:** use longer-than-minimum periods for complex proposals.
3. **Engage the community:** discuss on the forum before proposing.
4. **Be patient:** good proposals will pass; rushed ones get vetoed.
