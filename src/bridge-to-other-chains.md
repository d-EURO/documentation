# Bridge to other Chains

**Move dEURO and DEPS between Ethereum mainnet and supported Layer 2 networks.**

dEURO is canonically minted, redeemed and governed on **Ethereum mainnet**. To make the token usable for payments and DeFi integrations on cheaper chains, dEURO is also deployed as a bridged token on the OP Stack networks **Optimism** and **Base**. The bridged contracts mirror the mainnet supply 1:1 — they hold no independent issuance authority.

## How L2 dEURO Works

The bridged token is an instance of `BridgedToken.sol`, an `IOptimismMintableERC20`. The official OP Stack standard bridge (`0x4200000000000000000000000000000000000010`) is the only address authorised to mint or burn the L2 token. Whenever the bridge receives mainnet dEURO into its escrow contract, it mints the same amount of L2 dEURO; when the L2 dEURO is sent back, the bridge burns it and releases mainnet dEURO.

This means:

- L2 dEURO is **always backed 1:1** by mainnet dEURO sitting in the OP Stack bridge contract.
- No mint operations are possible on L2 directly — minting hubs, savings, governance, and bridges live exclusively on mainnet.
- The dEURO token contract on Optimism and Base shares the same address: `0x1B5F7fA46ED0F487F049C42f374cA4827d65A264`.

DEPS is bridged on the same principle for Base only:

| Chain | Token | Address |
|---|---|---|
| **Ethereum Mainnet** | dEURO | [`0xbA3f535bbCcCcA2A154b573Ca6c5A49BAAE0a3ea`](https://etherscan.io/address/0xbA3f535bbCcCcA2A154b573Ca6c5A49BAAE0a3ea) |
| **Optimism** | dEURO | [`0x1B5F7fA46ED0F487F049C42f374cA4827d65A264`](https://optimistic.etherscan.io/address/0x1B5F7fA46ED0F487F049C42f374cA4827d65A264) |
| **Base** | dEURO | [`0x1B5F7fA46ED0F487F049C42f374cA4827d65A264`](https://basescan.org/address/0x1B5F7fA46ED0F487F049C42f374cA4827d65A264) |
| **Base** | DEPS | [`0x5F674bF6d559229bDd29D642d2e0978f1E282722`](https://basescan.org/address/0x5F674bF6d559229bDd29D642d2e0978f1E282722) |

The mainnet dEURO contract is unchanged — it does not need to know about the L2 deployments. Only the L2 contracts are bridge-aware.

## Moving dEURO between Mainnet and L2

The recommended path is the standard OP Stack bridge UI for each network:

- Optimism: [app.optimism.io/bridge](https://app.optimism.io/bridge)
- Base: [bridge.base.org](https://bridge.base.org)

Both UIs accept dEURO as a custom ERC-20: paste the mainnet contract address and the bridge picks up the bridged token automatically because `BridgedToken` exposes the `IOptimismMintableERC20.l1Token()` view.

**Direction matters for finality.**

- **Mainnet → L2:** typically confirms within minutes.
- **L2 → Mainnet:** subject to the OP Stack challenge window (currently 7 days on both Optimism and Base) before the withdrawal is finalised on L1.

Always read the warnings in the official bridge UI before initiating a withdrawal — once started, an L2 → L1 withdrawal cannot be cancelled.

## What You Can and Cannot Do on L2

The L2 deployments are intentionally narrow: they exist to make dEURO usable for payments and as a DeFi building block on cheaper chains. Everything that involves protocol-level rights stays on mainnet.

| Operation | Available on Mainnet | Available on Optimism | Available on Base |
|---|---|---|---|
| Hold and transfer dEURO | ✅ | ✅ | ✅ |
| Use dEURO in AMMs, lending markets, payments | ✅ | ✅ | ✅ |
| Mint dEURO against collateral | ✅ | ❌ | ❌ |
| Open or adjust positions | ✅ | ❌ | ❌ |
| Earn savings interest | ✅ | ❌ | ❌ |
| Swap via stablecoin bridges | ✅ | ❌ | ❌ |
| Invest in / redeem nDEPS | ✅ | ❌ | ❌ |
| Govern the protocol | ✅ | ❌ | ❌ |
| Hold and transfer DEPS | ✅ | ❌ | ✅ |
| Wrap nDEPS into DEPS / unwrap | ✅ | ❌ | ❌ |

If you want to earn interest or borrow, bridge your dEURO to mainnet first.

## Security Properties

- **No L2 minting authority.** The L2 token only mints in response to the official OP Stack bridge depositing mainnet dEURO into escrow. There are no admin keys or upgrade hooks on the L2 contract.
- **Burn on withdraw.** Bridging back burns the L2 supply before mainnet dEURO is released, preventing double-counting.
- **Address parity.** The same address on Optimism and Base reduces the risk of phishing — any other address claiming to be dEURO on those chains is fake.
- **Audit lineage.** `BridgedToken.sol` is part of the [d-EURO/smartContracts](https://github.com/d-EURO/smartContracts) repository and inherits the audit coverage of the V3 migration scope.

## Adding dEURO to Your Wallet (L2)

For MetaMask and most wallets, add a custom token:

- Network: Optimism or Base
- Token contract address: `0x1B5F7fA46ED0F487F049C42f374cA4827d65A264`
- Symbol: dEURO
- Decimals: 18

For DEPS on Base:

- Token contract address: `0x5F674bF6d559229bDd29D642d2e0978f1E282722`
- Symbol: DEPS
- Decimals: 18
