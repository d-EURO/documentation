# Stablecoin Bridges

**Simple contracts that allow swapping other Euro stablecoins into Decentralized Euro and back.**

## Overview

The Swap page allows you to convert between recognised Euro stablecoins and Decentralized Euros. Moving back into another stablecoin is only possible while there is some of that stablecoin left in the bridge contract. Essentially, this pegs the Decentralized Euro 1:1 to a basket of existing EUR stablecoins and helps stabilising its value. In order to protect dEURO from the failure of any single connected stablecoin, each bridge contract is limited in time and volume — once its horizon expires, it has to be replaced by a new bridge through the governance process.

System participants should closely watch the amounts flowing in and out. Large outflows from a bridge can indicate that it is too cheap to mint dEURO (implied interest rates too low). Large inflows can indicate that going into dEURO is too attractive (implied interest rates too high).

## How Bridges Work

```
Source Stablecoin (e.g., EURC) ←→ Decentralized Euro (dEURO)
              1:1 exchange rate
```

### Minting dEURO

When you deposit a source stablecoin:

1. Your stablecoin is transferred to the bridge contract.
2. An equal amount of dEURO is minted to your address.
3. The bridge's `minted` counter increases.

```solidity
function mint(uint256 amount) external
function mintTo(address target, uint256 amount) external
```

### Burning dEURO

When you want your stablecoin back:

1. Your dEURO is burned.
2. An equal amount of source stablecoin is sent to you.
3. The bridge's `minted` counter decreases.

```solidity
function burn(uint256 amount) external
function burnAndSend(address target, uint256 amount) external
```

### Decimal Handling

Bridges automatically scale between tokens with different decimals. For example, EURC has 6 decimals and dEURO has 18. Depositing 1,000,000 EURC (1 EURC) mints 1,000,000,000,000,000,000 dEURO (1 dEURO).

## Bridge Limitations

Each bridge has two built-in safety limits:

### Volume Limit

```solidity
uint256 public immutable limit;
uint256 public minted;
```

`limit` caps the maximum amount of dEURO that can be minted through this bridge. This prevents over-reliance on any single external stablecoin. Limits vary per bridge and are chosen by governance when the bridge is proposed — the initial bridges at launch were configured with a 1,000,000 dEURO limit, later bridges have been deployed with smaller limits (e.g. 100,000 dEURO) that governance can raise via a replacement bridge if demand grows.

### Time Horizon

```solidity
uint256 public immutable horizon;
```

Every bridge has an expiration date. After this time:

- No new minting is allowed.
- Users can still burn dEURO to retrieve their stablecoins.
- A new bridge must be deployed by governance to continue operations.

Forcing periodic review of every connected stablecoin gives nDEPS holders the chance to phase out compromised issuers without the contract carrying long-term risk on its own.

## Bridge Monitoring

```solidity
function eur()      external view returns (IERC20)      // source stablecoin
function dEURO()    external view returns (IDecentralizedEURO)
function horizon()  external view returns (uint256)     // expiration timestamp
function limit()    external view returns (uint256)     // max mintable
function minted()   external view returns (uint256)     // currently minted
```

| Metric | Healthy | Warning |
|---|---|---|
| `minted / limit` | < 80% | > 90% |
| Time to `horizon` | > 30 days | < 7 days (or already expired) |

| Flow direction | Interpretation |
|---|---|
| **Inflow** (minting) | dEURO is attractive, possibly interest rates too high |
| **Outflow** (burning) | dEURO is less attractive, possibly interest rates too low |
| **Balanced** | Market in equilibrium |

## EUR Stablecoin Bridges

Nine bridges have been approved as minters so far. A bridge only allows minting until its `horizon` passes; after that it is **expired** — minting reverts, while burning dEURO to retrieve the underlying stablecoin keeps working. Expired bridges remain listed because users may still hold claims against them; an expired bridge has to be replaced by a new deployment (and a new minter proposal) to resume minting.

Status and horizon dates below reflect the on-chain `horizon()` values:

| Source | Bridge Address | Underlying Token | Horizon | Status |
|--------|----------------|------------------|---------|--------|
| **EURT** (Tether EUR) | [`0x2353D16869F717BFCD22DaBc0ADbf4Dca62C609f`](https://etherscan.io/address/0x2353D16869F717BFCD22DaBc0ADbf4Dca62C609f) | [`0xC581b735A1688071A1746c968e0798D642EDE491`](https://etherscan.io/address/0xC581b735A1688071A1746c968e0798D642EDE491) | 2025-04-03 | Expired |
| **EURS** (STASIS Euro) | [`0x73f38ca06b27eaefb1612d062d885f58924f5897`](https://etherscan.io/address/0x73f38ca06b27eaefb1612d062d885f58924f5897) | [`0xdb25f211ab05b1c97d595516f45794528a807ad8`](https://etherscan.io/address/0xdb25f211ab05b1c97d595516f45794528a807ad8) | 2026-11-05 | Active |
| **VEUR** (VNX Euro) | [`0x76d8f514554a4a8e5d6103875f2dd7a67543692b`](https://etherscan.io/address/0x76d8f514554a4a8e5d6103875f2dd7a67543692b) | [`0x6ba75d640bebfe5da1197bb5a2aff3327789b5d3`](https://etherscan.io/address/0x6ba75d640bebfe5da1197bb5a2aff3327789b5d3) | 2026-11-05 | Active |
| **EURC** (Circle Euro) | [`0xB4fF7412f08C22d7381885e8BdA9EE9825092fd1`](https://etherscan.io/address/0xB4fF7412f08C22d7381885e8BdA9EE9825092fd1) | [`0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c`](https://etherscan.io/address/0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c) | 2026-09-05 | Active |
| **EURR** (StablR Euro) | [`0x20B0a153fF16c7B1e962FD3D3352A00cf019f1a7`](https://etherscan.io/address/0x20B0a153fF16c7B1e962FD3D3352A00cf019f1a7) | [`0x50753CfAf86c094925Bf976f218D043f8791e408`](https://etherscan.io/address/0x50753CfAf86c094925Bf976f218D043f8791e408) | 2025-10-22 | Expired |
| **EUROP** (Schuman Financial) | [`0x3EF3d03EFCc1338d6210946f8cF5Fb1a8b630341`](https://etherscan.io/address/0x3EF3d03EFCc1338d6210946f8cF5Fb1a8b630341) | [`0x888883b5F5D21fb10Dfeb70e8f9722B9FB0E5E51`](https://etherscan.io/address/0x888883b5F5D21fb10Dfeb70e8f9722B9FB0E5E51) | 2025-10-22 | Expired |
| **EURI** (Banking Circle) | [`0xb66A40934a996373fA7602de9820C6bf3e8c9afE`](https://etherscan.io/address/0xb66A40934a996373fA7602de9820C6bf3e8c9afE) | [`0x9d1A7A3191102e9F900Faa10540837ba84dCBAE7`](https://etherscan.io/address/0x9d1A7A3191102e9F900Faa10540837ba84dCBAE7) | 2025-10-22 | Expired |
| **EURe** (Monerium) | [`0x4dfd460d54854087af195906a2f260aa483a13b1`](https://etherscan.io/address/0x4dfd460d54854087af195906a2f260aa483a13b1) | [`0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f`](https://etherscan.io/address/0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f) | 2026-11-05 | Active |
| **EURA** (Angle) | [`0x05620F4bB92246b4e067EBC0B6f5c7FF6B771702`](https://etherscan.io/address/0x05620F4bB92246b4e067EBC0B6f5c7FF6B771702) | [`0x1a7e4e63778b4f12a199c062f3efdd288afcbce8`](https://etherscan.io/address/0x1a7e4e63778b4f12a199c062f3efdd288afcbce8) | 2026-01-15 | Expired |

## Adding New Bridges

A new bridge enters the system through the standard minter application process:

1. Deploy a `StablecoinBridge` contract with the source stablecoin address, the dEURO address, a volume limit, and a duration in weeks.
2. Propose the bridge as a new minter via `dEURO.suggestMinter(bridge, applicationPeriod, applicationFee, message)` — minimum application period 14 days, minimum fee 1,000 dEURO.
3. If no qualified nDEPS holder vetoes during the application period, the bridge becomes an authorised minter and is usable.

Criteria nDEPS holders look at when accepting or vetoing a bridge include the credibility of the issuer, available on-chain liquidity, the regulatory exposure of the underlying stablecoin, and whether the new bridge would dangerously concentrate dEURO backing into a single issuer.
