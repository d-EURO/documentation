# Savings & Interest

**Earn interest on your Decentralized Euros through the built-in savings module.**

The dEURO system includes a native savings feature that allows dEURO holders to earn interest simply by depositing their tokens. The interest rate is governed by nDEPS holders through the Leadrate mechanism, and the same Leadrate also drives the interest charged on borrowing positions — so saving and borrowing rates always move together.

## How Savings Work

When you deposit dEURO into the savings module, your tokens start earning interest immediately. The interest accrues continuously based on the current Leadrate.

| Feature | Description |
|---|---|
| **No lock-up period** | Withdraw anytime |
| **Continuous interest** | Interest accrues every second |
| **Compound on refresh** | Claim interest to start earning interest on interest |
| **Governance-controlled rate** | nDEPS holders vote on the interest rate |
| **Fully segregated** | Your saved dEURO stays attributable to you and is not used to back loans |

The 3-day lock-up before deposits could be withdrawn, present in Frankencoin's savings design, was removed in dEURO without replacement. Deposits can be withdrawn at any time.

## The Leadrate System

The Leadrate (from German *Leitzins*, "base rate") is the system-wide interest rate that affects both savings yields and borrowing costs.

### How Rates Are Set

1. A qualified nDEPS holder (with ≥2% voting power) proposes a new rate.
2. The proposal enters a **7-day timelock**.
3. After 7 days, anyone can execute the change.
4. The new rate takes effect immediately.

```
Current Rate → Proposal → 7-Day Wait → New Rate Active
```

### Rate Mechanics

The Leadrate uses a "ticks" system for precise interest calculation:

- 1 tick = 1 PPM-second (parts per million per second).
- Interest accumulates as ticks over time.
- When you refresh your balance, ticks are converted to dEURO.

**Example:** at a 5% annual rate (50,000 PPM):

- 1 day = 50,000 × 86,400 = 4,320,000,000 ticks.
- On 10,000 dEURO that is roughly 1.37 dEURO interest per day.

### Initial Rates at Deployment

| Module | Initial Leadrate at deploy |
|---|---|
| V2 (`SavingsGateway`) | 10% (100,000 PPM) |
| V3 (`Savings`) | 8% (80,000 PPM) |

The current rate is whatever nDEPS holders have voted in since launch — check `currentRatePPM()` on the active savings contract.

## Using the Savings Module

### Depositing dEURO

1. Open the [Savings page](https://app.dEURO.com/savings) in the app.
2. Enter the amount of dEURO you want to deposit.
3. Approve and confirm the transaction.
4. Your dEURO immediately starts earning interest.

```solidity
function save(uint192 amount) external
function save(address owner, uint192 amount) external

// V2 SavingsGateway variants with frontend code:
function save(uint192 amount, bytes32 frontendCode) external
function save(address owner, uint192 amount, bytes32 frontendCode) external
```

### Checking Your Balance

Your savings balance consists of:

- **Principal:** the dEURO you have deposited.
- **Accrued interest:** interest earned since the last refresh.

```solidity
function savings(address account) external view returns (uint192 saved, uint64 ticks)
function accruedInterest(address accountOwner) external view returns (uint192)
function accruedInterest(address accountOwner, uint256 timestamp) external view returns (uint192)
```

### Withdrawing dEURO

You can withdraw your dEURO plus earned interest at any time:

```solidity
function withdraw(address target, uint192 amount) external returns (uint256)
function withdraw(address target, uint192 amount, bytes32 frontendCode) external returns (uint256)
```

### Refreshing Your Balance

To compound your interest (earn interest on interest):

```solidity
function refreshMyBalance() external returns (uint192)
function refreshBalance(address owner) external returns (uint192)
```

Refresh periodically to maximise compound interest. For very small balances, the gas cost can outweigh the compounding benefit.

## Interest Source

Interest paid to savers comes from the system's **equity pool** via `dEURO.distributeProfits()`. As a consequence:

- Interest is only paid as long as there is sufficient equity.
- The current `equity()` value caps available funds.
- If equity is depleted, interest payments are capped or paused.

This creates a natural balance: high savings rates attract deposits but reduce equity, while low rates preserve equity but may cause withdrawals.

## SavingsVault (svDEURO, ERC-4626)

For DeFi integration, dEURO provides an **ERC-4626 compatible vault** wrapping the savings module. ERC-4626 is the "tokenized vault standard" — a standard interface for yield-bearing tokens that makes the vault easy to plug into other DeFi protocols.

### Vault Mechanics

| Concept | Description |
|---|---|
| **Shares (svDEURO)** | Represent your proportional ownership of the vault |
| **Assets (dEURO)** | The underlying tokens in the vault |
| **Price per Share** | Increases over time as interest accrues |

**Example:**

1. You deposit 1,000 dEURO when price = 1.00 → receive 1,000 svDEURO.
2. Interest accrues, price rises to 1.05.
3. Your 1,000 svDEURO is now worth 1,050 dEURO.

### Vault Functions

```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares)
function mint(uint256 shares, address receiver) external returns (uint256 assets)
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)
function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)
function price() external view returns (uint256)
function totalAssets() external view returns (uint256)
```

### Inflation Attack Protection

The vault uses OpenZeppelin's virtual-shares pattern to prevent "inflation attacks" where a malicious first depositor could manipulate the share price. A small virtual offset is added to share-price calculations.

## V2 vs V3 — Which to Use?

Both savings modules are permanently deployed and accept new deposits. They share the same dEURO token and equity pool, but differ in plumbing:

| | V2 (`SavingsGateway`) | V3 (`Savings`) |
|---|---|---|
| Frontend rewards | Yes — 5% of earned interest goes to the frontend code, see [Frontend Rewards](frontend-rewards.md) | No — V3 bypasses the FrontendGateway entirely |
| Optional savings interest compounding | Yes | Yes |
| Vault address | [`0x1e9f008B1C538bE32F190516735bF1C634B4FA40`](https://etherscan.io/address/0x1e9f008B1C538bE32F190516735bF1C634B4FA40) | [`0x75Beb37A3C86eE4c38931E2a9319E078da612979`](https://etherscan.io/address/0x75Beb37A3C86eE4c38931E2a9319E078da612979) |
| Savings address | [`0x073493d73258C4BEb6542e8dd3e1b2891C972303`](https://etherscan.io/address/0x073493d73258C4BEb6542e8dd3e1b2891C972303) | [`0x760233b90e45d186A9A98E911B115F7F4B90d3D9`](https://etherscan.io/address/0x760233b90e45d186A9A98E911B115F7F4B90d3D9) |

If you are a frontend operator and want to earn referral rewards on your users' savings interest, route them through the **V2 SavingsGateway**. Otherwise the V3 module is the default for new integrations.

## Interest Calculation Example

**Scenario:** 10,000 dEURO deposited at a 4% annual Leadrate (40,000 PPM) for 30 days.

```
Daily interest      = 10,000 × (40,000 / 1,000,000) / 365 = 1.096 dEURO
30-day interest     = 1.096 × 30 = 32.88 dEURO
With daily compound ≈ 32.96 dEURO (slightly more)
```

## Savings vs. nDEPS

| Aspect | Savings (dEURO) | Pool Shares (nDEPS) |
|---|---|---|
| **Risk** | Low — principal preserved while equity is intact | Higher — value moves with system results |
| **Return** | Leadrate | Fees and liquidation profits, variable |
| **Governance** | None | Voting power that grows with holding time |
| **Lock-up** | None | 90 days before redemption is allowed |
| **Best for** | Stable yield seekers | Active participants in the system |

## Important Notes

1. **Module disabled when rate is zero** — savings module deposits are blocked while the Leadrate is 0% or is about to drop to 0% within 3 days.
2. **Interest cap** — interest payments are capped by available equity. In extreme scenarios, you may receive less than expected.
3. **No deposit insurance** — unlike traditional bank deposits, there is no insurance. The safety of your funds depends on the overall health of the dEURO system.
4. **Gas costs** — consider gas costs when deciding how often to compound. For small balances, frequent refreshing may not be economical.

## Events

```solidity
event Saved(address indexed account, uint192 amount);
event InterestCollected(address indexed account, uint256 interest);
event Withdrawn(address indexed account, uint192 amount);
event RateProposed(address who, uint24 nextRate, uint40 nextChange);
event RateChanged(uint24 newRate);
```
