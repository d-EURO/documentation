# Smart Contracts

**A technical overview of all smart contracts powering the Decentralized Euro protocol.**

The Decentralized Euro protocol consists of multiple smart contracts that work together to create a trustless, oracle-free stablecoin system. All contracts are deployed on Ethereum mainnet and are fully immutable - no admin keys, no upgrades, no central control.

## Contract Architecture

The contracts are organized into the following categories:

| Category | Purpose |
|----------|---------|
| **Core** | Token contracts and reserve management |
| **MintingHub** | Position management and collateralized minting |
| **Savings** | Interest-bearing dEURO deposits |
| **Bridges** | 1:1 conversion with trusted external EUR stablecoins |
| **Gateways** | Frontend rewards and enhanced functionality (V2 only) |

---

## Protocol Modules: V2 and V3

The dEURO contracts are immutable and cannot be replaced. Instead of upgrading via proxies, the protocol evolves by adding **new modules** through the standard `suggestMinter()` governance flow. The protocol currently runs **two coexisting MintingHub and Savings module sets** on Ethereum mainnet:

| Module | Status | Frontend Rewards | Notes |
|--------|--------|------------------|-------|
| **V2** | Active, permanent | Yes (via Gateways) | Original launch modules; positions and savings opened here remain fully usable. Cannot be deactivated. Includes the CoinLendingGateway for native ETH lending. |
| **V3** | Active, permanent | No | Additional module set approved by nDEPS governance. Adds an updated savings/vault design and a price reference system. Routes do not pass through `FrontendGateway`. |

Both module sets share the same `dEURO` token, the same nDEPS / DEPSwrapper governance pair, and the same Bridge contracts. New positions and savings deposits can be opened in either module; existing V2 positions are not migrated and continue to live under V2.

::: tip
V3 is **not a replacement** for V2. It is an additional, parallel set of minter contracts that nDEPS holders approved through the standard governance application period. V2 remains the only home for positions and savings that were opened before V3 went live.
:::

---

## Core Contracts

### Decentralized Euro (dEURO)

The main stablecoin token contract - an ERC-20 token designed to track the value of the Euro.

**Key Features:**
- Implements ERC-20 and ERC-2612 (Permit)
- Open to arbitrary minting plugins with veto-based governance
- Creates the Equity contract during deployment
- Manages the minter registry and position registry
- Handles reserve accounting and loss coverage

**Key Functions:**
- `suggestMinter()` - Propose a new minting contract (requires fee and application period)
- `denyMinter()` - Qualified shareholders can veto minting proposals
- `mintWithReserve()` - Mint dEURO with reserve contribution (minters only)
- `burnFromWithReserve()` - Burn dEURO and reclaim proportional reserve

| Property | Value |
|----------|-------|
| **Symbol** | dEURO |
| **Decimals** | 18 |
| **Min Application Period** | 14 days |
| **Min Application Fee** | 1,000 dEURO |
| **Address** | [`0xbA3f535bbCcCcA2A154b573Ca6c5A49BAAE0a3ea`](https://etherscan.io/address/0xbA3f535bbCcCcA2A154b573Ca6c5A49BAAE0a3ea) |

---

### Equity (nDEPS)

The native equity token representing shares in the dEURO reserve pool. Holding nDEPS is similar to being a shareholder of a bank.

**Key Features:**
- ERC-20 token with time-weighted voting power
- 2% quorum required for governance veto
- Price determined by proportional capital valuation (3x equity)
- 2% fee on minting and redemption
- Flash loan protection (same-block redemption blocked)

**Key Functions:**
- `invest()` - Mint nDEPS by depositing dEURO into the reserve
- `redeem()` - Burn nDEPS to withdraw dEURO from the reserve
- `checkQualified()` - Verify if an address has sufficient voting power (2%)
- `delegateVoteTo()` - Delegate voting power to another address
- `kamikaze()` - Sacrifice own votes to reduce malicious actor's votes

**Voting Mechanics:**
- Votes accumulate over time: `votes = balance * holdingDuration`
- Longer holding = more voting power
- Delegation adds to delegate's power without removing own votes

| Property | Value |
|----------|-------|
| **Symbol** | nDEPS |
| **Decimals** | 18 |
| **Quorum** | 2% |
| **Address** | [`0xc71104001A3CCDA1BEf1177d765831Bd1bfE8eE6`](https://etherscan.io/address/0xc71104001A3CCDA1BEf1177d765831Bd1bfE8eE6) |

---

### DEPSwrapper (DEPS)

ERC-20 wrapper around nDEPS. Wrapping strips the time-weighted voting state, which makes the wrapped DEPS suitable for AMM liquidity, custodial holdings, and other contexts where the voting mechanics of native nDEPS would be lost or distorted.

**Key Functions:**
- `wrap()` / `wrapFor()` - Convert nDEPS to DEPS
- `unwrap()` / `unwrapAndSell()` - Convert DEPS back to nDEPS

| Property | Value |
|----------|-------|
| **Symbol** | DEPS |
| **Decimals** | 18 |
| **Address** | [`0x103747924E74708139a9400e4Ab4BEA79FFFA380`](https://etherscan.io/address/0x103747924E74708139a9400e4Ab4BEA79FFFA380) |

---

## MintingHub Contracts

### MintingHub

The central hub for creating, cloning, and challenging collateralized dEURO positions.

**Key Features:**
- Creates new position contracts via PositionFactory
- Manages Dutch auctions for liquidations
- Handles forced sales of expired positions

**Key Functions:**
- `openPosition()` - Create a new collateralized position (1,000 dEURO fee)
- `clone()` - Clone an existing position with new parameters
- `challenge()` - Start a Dutch auction to challenge undercollateralized positions
- `bid()` - Place a bid in an ongoing challenge auction
- `buyExpiredCollateral()` - Purchase collateral from expired positions

**Challenge Process:**
1. **Phase 1 (Aversion):** Position owner can avert by buying challenger's collateral at liquidation price
2. **Phase 2 (Auction):** Dutch auction where price decreases linearly to zero

| Property | Value |
|----------|-------|
| **Opening Fee** | 1,000 dEURO |
| **Challenger Reward** | 2% |
| **Min Challenge Period** | 1 day |

The protocol exposes two MintingHub modules. V2 is wrapped by `MintingHubGateway` for frontend-code tracking; V3 routes directly through `MintingHub` and adds an updated savings/vault design.

| Module | Address |
|--------|---------|
| **V2** (`MintingHubGateway`) | [`0x8B3c41c649B9c7085C171CbB82337889b3604618`](https://etherscan.io/address/0x8B3c41c649B9c7085C171CbB82337889b3604618) |
| **V3** (`MintingHub`) | [`0x66AcC54a0C64255137b8993CB4972B0901684f7B`](https://etherscan.io/address/0x66AcC54a0C64255137b8993CB4972B0901684f7B) |

---

### Position

Individual collateralized debt position contract. Each position is a separate contract holding the user's collateral.

**Key Features:**
- Immutable parameters set at creation (collateral type, reserve ratio, etc.)
- Continuous interest accrual based on Leadrate + risk premium
- Cooldown periods on price increases (3 days) for security
- Can be denied by governance during initialization period

**Key Functions:**
- `mint()` - Mint dEURO against deposited collateral
- `repay()` - Repay debt (interest first, then principal)
- `adjust()` - All-in-one function to modify position parameters
- `adjustPrice()` - Change the liquidation price
- `withdrawCollateral()` - Withdraw excess collateral
- `deny()` - Governance can deny positions during init period

**Interest Model:**
- Interest charged on usable mint amount (principal minus reserve)
- Rate = Leadrate + Risk Premium (set at position creation)
- Interest must be overcollateralized by the same ratio as principal

| Property | Value |
|----------|-------|
| **Deployment** | Via PositionFactory (ERC-1167 clones) |
| **Cooldown on Price Increase** | 3 days |

---

### PositionFactory

Factory contract for deploying new Position contracts using the ERC-1167 minimal proxy pattern.

**Key Features:**
- Creates new positions with full parameter set
- Clones existing positions efficiently using minimal proxy
- Validates position parameters before cloning

**Key Functions:**
- `createNewPosition()` - Deploy a completely new position contract
- `clonePosition()` - Create a minimal proxy clone of an existing position

Each MintingHub module owns its own PositionFactory.

| Module | Address |
|--------|---------|
| **V2** | [`0x167144d66AC1D02EAAFCa3649ef3305ea31Ee5A8`](https://etherscan.io/address/0x167144d66AC1D02EAAFCa3649ef3305ea31Ee5A8) |
| **V3** | [`0x3a3985a96b1B51E6d914bc7C9e89fD6Ba6dEfE81`](https://etherscan.io/address/0x3a3985a96b1B51E6d914bc7C9e89fD6Ba6dEfE81) |

---

### PositionRoller

Helper contract for rolling over debt from one position to another using flash loans.

**Key Features:**
- Atomically moves debt and collateral between positions
- Uses flash loans to avoid needing upfront capital
- Preserves frontend codes when rolling through gateways

**Key Functions:**
- `roll()` - Roll debt from source to target position with custom parameters
- `rollFully()` - Roll entire position automatically

A PositionRoller can only roll between positions inside the same MintingHub module.

| Module | Address |
|--------|---------|
| **V2** | [`0x4CE0AB2FC21Bd27a47A64F594Fdf7654Ea57Dc79`](https://etherscan.io/address/0x4CE0AB2FC21Bd27a47A64F594Fdf7654Ea57Dc79) |
| **V3** | [`0x5C22d5b752b2121faE7F6f0069252B03B2F7c5CD`](https://etherscan.io/address/0x5C22d5b752b2121faE7F6f0069252B03B2F7c5CD) |

---

## Savings Contracts

### Savings

Base savings module that enables interest-bearing dEURO deposits based on the Leadrate.

**Key Features:**
- Interest accrues continuously based on Leadrate
- No lockup period - withdraw anytime
- Interest paid from system equity (profits)
- Disabled when interest rate is zero

**Key Functions:**
- `save()` - Deposit dEURO into savings
- `withdraw()` - Withdraw dEURO and accrued interest
- `refreshBalance()` - Collect accrued interest into balance
- `adjust()` - Adjust savings to target amount

The protocol exposes two Savings modules. V2 is wrapped by `SavingsGateway` for frontend-code tracking; V3 routes directly through `Savings` and skips the FrontendGateway layer.

| Module | Address |
|--------|---------|
| **V2** (`SavingsGateway`) | [`0x073493d73258C4BEb6542e8dd3e1b2891C972303`](https://etherscan.io/address/0x073493d73258C4BEb6542e8dd3e1b2891C972303) |
| **V3** (`Savings`) | [`0x760233b90e45d186A9A98E911B115F7F4B90d3D9`](https://etherscan.io/address/0x760233b90e45d186A9A98E911B115F7F4B90d3D9) |

---

### SavingsVault (svDEURO)

ERC-4626 compatible vault adapter for the Savings module.

**Key Features:**
- Standard vault interface for DeFi composability
- Automatic interest accrual on deposits/withdrawals
- Protected against inflation attacks via virtual shares
- Tracks total claimed interest

**Key Functions:**
- `deposit()` - Deposit dEURO and receive vault shares
- `withdraw()` - Burn shares and receive dEURO with interest
- `price()` - Current price per share
- `totalAssets()` - Total dEURO including accrued interest

| Property | Value |
|----------|-------|
| **Symbol** | svDEURO |
| **Standard** | ERC-4626 |

Each Savings module ships with its own SavingsVault adapter.

| Module | Address |
|--------|---------|
| **V2** | [`0x1e9f008B1C538bE32F190516735bF1C634B4FA40`](https://etherscan.io/address/0x1e9f008B1C538bE32F190516735bF1C634B4FA40) |
| **V3** | [`0x75Beb37A3C86eE4c38931E2a9319E078da612979`](https://etherscan.io/address/0x75Beb37A3C86eE4c38931E2a9319E078da612979) |

---

### Leadrate

A governance-controlled interest rate module that provides the base interest rate for the entire system. The Leadrate is implemented inside `Savings` (V3) and `SavingsGateway` (V2) - it is not a standalone deployable contract.

**Key Features:**
- Qualified nDEPS holders can propose rate changes
- 7-day timelock on all rate changes
- Tracks accumulated "ticks" for interest calculations
- Used by both Savings and Position contracts

**Key Functions:**
- `proposeChange()` - Propose a new interest rate (requires 2% voting power)
- `applyChange()` - Execute a pending rate change after 7 days
- `currentTicks()` - Get accumulated interest ticks since deployment

| Property | Value |
|----------|-------|
| **Rate Format** | PPM (parts per million) per year |
| **Timelock** | 7 days |

---

## Bridge Contracts

### StablecoinBridge

Enables 1:1 conversion between trusted external EUR stablecoins and dEURO.

**Key Features:**
- Mints dEURO by depositing source stablecoins
- Burns dEURO to retrieve source stablecoins
- Has maximum limit and expiration horizon
- Emergency stop available with 10% governance power

**Key Functions:**
- `mint()` - Convert source stablecoin to dEURO
- `burn()` - Convert dEURO back to source stablecoin
- `emergencyStop()` - Permanently stop bridge (requires 10% votes)

| Property | Value |
|----------|-------|
| **Emergency Quorum** | 10% |

#### Active EUR Stablecoin Bridges

| Source | Bridge Address | Underlying Token |
|--------|----------------|------------------|
| **EURT** | [`0x2353D16869F717BFCD22DaBc0ADbf4Dca62C609f`](https://etherscan.io/address/0x2353D16869F717BFCD22DaBc0ADbf4Dca62C609f) | [`0xC581b735A1688071A1746c968e0798D642EDE491`](https://etherscan.io/address/0xC581b735A1688071A1746c968e0798D642EDE491) |
| **EURS** | [`0x73f38ca06b27eaefb1612d062d885f58924f5897`](https://etherscan.io/address/0x73f38ca06b27eaefb1612d062d885f58924f5897) | [`0xdb25f211ab05b1c97d595516f45794528a807ad8`](https://etherscan.io/address/0xdb25f211ab05b1c97d595516f45794528a807ad8) |
| **VEUR** | [`0x76d8f514554a4a8e5d6103875f2dd7a67543692b`](https://etherscan.io/address/0x76d8f514554a4a8e5d6103875f2dd7a67543692b) | [`0x6ba75d640bebfe5da1197bb5a2aff3327789b5d3`](https://etherscan.io/address/0x6ba75d640bebfe5da1197bb5a2aff3327789b5d3) |
| **EURC** | [`0xB4fF7412f08C22d7381885e8BdA9EE9825092fd1`](https://etherscan.io/address/0xB4fF7412f08C22d7381885e8BdA9EE9825092fd1) | [`0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c`](https://etherscan.io/address/0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c) |
| **EURR** | [`0x20B0a153fF16c7B1e962FD3D3352A00cf019f1a7`](https://etherscan.io/address/0x20B0a153fF16c7B1e962FD3D3352A00cf019f1a7) | [`0x50753CfAf86c094925Bf976f218D043f8791e408`](https://etherscan.io/address/0x50753CfAf86c094925Bf976f218D043f8791e408) |
| **EUROP** | [`0x3EF3d03EFCc1338d6210946f8cF5Fb1a8b630341`](https://etherscan.io/address/0x3EF3d03EFCc1338d6210946f8cF5Fb1a8b630341) | [`0x888883b5F5D21fb10Dfeb70e8f9722B9FB0E5E51`](https://etherscan.io/address/0x888883b5F5D21fb10Dfeb70e8f9722B9FB0E5E51) |
| **EURI** | [`0xb66A40934a996373fA7602de9820C6bf3e8c9afE`](https://etherscan.io/address/0xb66A40934a996373fA7602de9820C6bf3e8c9afE) | [`0x9d1A7A3191102e9F900Faa10540837ba84dCBAE7`](https://etherscan.io/address/0x9d1A7A3191102e9F900Faa10540837ba84dCBAE7) |
| **EURE** | [`0x4dfd460d54854087af195906a2f260aa483a13b1`](https://etherscan.io/address/0x4dfd460d54854087af195906a2f260aa483a13b1) | [`0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f`](https://etherscan.io/address/0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f) |
| **EURA** | [`0x05620F4bB92246b4e067EBC0B6f5c7FF6B771702`](https://etherscan.io/address/0x05620F4bB92246b4e067EBC0B6f5c7FF6B771702) | [`0x1a7e4e63778b4f12a199c062f3efdd288afcbce8`](https://etherscan.io/address/0x1a7e4e63778b4f12a199c062f3efdd288afcbce8) |

---

## Gateway Contracts

::: warning V2 ONLY
The Gateway layer only exists in V2. V3 modules (`MintingHub`, `Savings`) bypass the Gateway pattern entirely and do not emit frontend rewards. Frontend operators only earn rewards on V2 activity.
:::

### FrontendGateway

Manages frontend referral codes and distributes rewards to frontend operators.

**Key Features:**
- Frontend operators register unique codes
- Rewards distributed based on user activity
- Covers investments, savings, and minting
- Governance-controlled fee rates with 7-day timelock

**Key Functions:**
- `registerFrontendCode()` - Register a new frontend code
- `invest()` - Invest in nDEPS with frontend reward
- `redeem()` - Redeem nDEPS with frontend reward
- `withdrawRewards()` - Claim accumulated frontend rewards
- `proposeChanges()` - Propose new fee rates (requires 2% votes)

| Activity | Rate |
|----------|------|
| Investment / Redemption | 1% of volume |
| Savings interest | 5% of interest earned |
| Minting interest | 5% of interest paid |

| Property | Address |
|----------|---------|
| **Mainnet** | [`0x5c49C00f897bD970d964BFB8c3065ae65a180994`](https://etherscan.io/address/0x5c49C00f897bD970d964BFB8c3065ae65a180994) |

---

### CoinLendingGateway

Lets users lend native ETH against dEURO without first wrapping to WETH. Routes through the V2 MintingHub and exposes the same position lifecycle as ERC-20 collateral, but accepts and returns native ETH.

| Property | Address |
|----------|---------|
| **Mainnet** | [`0x1DA37D613FB590eeD37520b72e9c6F0F6eee89D2`](https://etherscan.io/address/0x1DA37D613FB590eeD37520b72e9c6F0F6eee89D2) |

---

## Contract Summary

### Shared

| Contract | Address | Purpose |
|----------|---------|---------|
| dEURO | [`0xbA3f...3ea`](https://etherscan.io/address/0xbA3f535bbCcCcA2A154b573Ca6c5A49BAAE0a3ea) | Main stablecoin token |
| nDEPS (Equity) | [`0xc711...EE6`](https://etherscan.io/address/0xc71104001A3CCDA1BEf1177d765831Bd1bfE8eE6) | Reserve pool shares with voting |
| DEPS (Wrapper) | [`0x1037...380`](https://etherscan.io/address/0x103747924E74708139a9400e4Ab4BEA79FFFA380) | Transferable wrapper for nDEPS |

### V2 Module (active, with frontend rewards)

| Contract | Address | Purpose |
|----------|---------|---------|
| MintingHubGateway | [`0x8B3c...618`](https://etherscan.io/address/0x8B3c41c649B9c7085C171CbB82337889b3604618) | Position management hub (V2) |
| PositionFactory | [`0x1671...5A8`](https://etherscan.io/address/0x167144d66AC1D02EAAFCa3649ef3305ea31Ee5A8) | Position deployment factory (V2) |
| PositionRoller | [`0x4CE0...c79`](https://etherscan.io/address/0x4CE0AB2FC21Bd27a47A64F594Fdf7654Ea57Dc79) | Position rollover helper (V2) |
| SavingsGateway | [`0x0734...303`](https://etherscan.io/address/0x073493d73258C4BEb6542e8dd3e1b2891C972303) | Savings with frontend rewards |
| SavingsVault | [`0x1e9f...A40`](https://etherscan.io/address/0x1e9f008B1C538bE32F190516735bF1C634B4FA40) | ERC-4626 savings vault (V2) |
| FrontendGateway | [`0x5c49...994`](https://etherscan.io/address/0x5c49C00f897bD970d964BFB8c3065ae65a180994) | Frontend reward system (V2 only) |
| CoinLendingGateway | [`0x1DA3...9D2`](https://etherscan.io/address/0x1DA37D613FB590eeD37520b72e9c6F0F6eee89D2) | Native ETH lending gateway (V2 only) |

### V3 Module (active, no frontend rewards)

| Contract | Address | Purpose |
|----------|---------|---------|
| MintingHub | [`0x66Ac...4f7B`](https://etherscan.io/address/0x66AcC54a0C64255137b8993CB4972B0901684f7B) | Position management hub (V3) |
| PositionFactory | [`0x3a39...FE81`](https://etherscan.io/address/0x3a3985a96b1B51E6d914bc7C9e89fD6Ba6dEfE81) | Position deployment factory (V3) |
| PositionRoller | [`0x5C22...c5CD`](https://etherscan.io/address/0x5C22d5b752b2121faE7F6f0069252B03B2F7c5CD) | Position rollover helper (V3) |
| Savings | [`0x7602...d3D9`](https://etherscan.io/address/0x760233b90e45d186A9A98E911B115F7F4B90d3D9) | Savings module (V3) |
| SavingsVault | [`0x75Be...2979`](https://etherscan.io/address/0x75Beb37A3C86eE4c38931E2a9319E078da612979) | ERC-4626 savings vault (V3) |

---

## Security Properties

The dEURO smart contracts are designed with the following security properties:

| Property | Implementation |
|----------|---------------|
| **Immutability** | No admin keys, no proxy upgrades |
| **Oracle-free** | No reliance on external price feeds |
| **Flash loan protection** | Same-block redemption blocked |
| **Governance timelocks** | 7-14 day delays on critical changes |
| **Minority protection** | 2% veto threshold |
| **Emergency stops** | 10% quorum can halt bridges |
| **Inflation attack mitigation** | ERC-4626 virtual shares pattern |

---

## Source Code

All smart contract source code is available on GitHub:

**Repository:** [github.com/d-EURO/smartContracts](https://github.com/d-EURO/smartContracts)

| Network | Chain ID | Explorer |
|---------|----------|----------|
| **Ethereum Mainnet** | 1 | [etherscan.io](https://etherscan.io) |
