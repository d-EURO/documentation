# Pool Shares

**Directly contribute risk capital to the Decentralized Euro system to get Decentralized Euro
  Pool Shares (nDEPS) in return.**

### Reserve Pool Shares

Native Decentralized Euro Protocol Shares (nDEPS) are shares in the equity reserve pool of the Decentralized Euro system. Being an nDEPS holder is similar to being a shareholder of a bank. As the Decentralized Euro system makes profits through fees or liquidations, the price of the pool shares is automatically adjusted upwards. Likewise, when risks materialize and the reserve pool incurs a loss, the value declines. They can be minted at any time and redeemed after a minimum holding period of 90 days. Over time, reserve pool shares that are not moved accumulate votes. Shareholders with at least 2% of the votes gain veto power.

For trading on DEXes and integrations that do not respect the 90-day holding period, nDEPS can be wrapped 1:1 into [DEPS](https://etherscan.io/address/0x103747924E74708139a9400e4Ab4BEA79FFFA380) via the `wrap()` / `unwrap()` functions of the [DEPSwrapper](../smart-contracts.md#depswrapper-deps) contract. The wrapped DEPS token strips the time-weighted voting state, which keeps liquidity-pool holdings out of the voting calculation and allows DEPS to move freely without resetting the holding clock of the underlying nDEPS.

### Economics

Anyone can create additional pool shares by depositing reserve capital at any time, or redeem them again after a minimum holding period of 90 days. Therefore, an important design consideration is the pricing mechanism for pool shares. As having a price implies having a valuation, this boils down to evaluating the Decentralized Euro system.

### Proportional Capital Valuation

In an approach inspired by the research paper "[The Continuous Capital Corporation](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4189472)", the Decentralized Euro system evaluates itself at a constant multiple of its capital. This multiple is set to **five** (`VALUATION_FACTOR = 5`). So if there is 1 million Decentralized Euro in equity capital K, anyone can subscribe to new pool shares at a valuation of 5 million Decentralized Euro, or also redeem old shares at that valuation.

### Equilibrium

Consider an example with 30 million Decentralized Euro in outstanding mints and an interest of 5%, leading to a reserve inflow of 1.5 million per year. Under these circumstances, rational market participants will value the entire pool at 30 million Decentralized Euro and therefore buy additional pool shares until the valuation hits 30 million Decentralized Euro. With `VALUATION_FACTOR = 5`, this valuation is reached at a reserve pool size of 6 million Decentralized Euro, leaving 24 million Decentralized Euro in circulation that can be used for other purposes.

This is essentially fractional reserve banking with a target reserve ratio of about 20%. In contrast, the tier 1 equity capital of modern banks is usually much less than that, so the Decentralized Euro system has considerably higher reserves. However, unlike in the traditional banking system, this reserve requirement is not strictly enforced by a regulator, but more like a carrot that attracts the equilibrium towards the reserve target.

If the effective interest at which new positions can be opened is 5% and the reserve is below the target of one fifth of the outstanding balance, then it is possible to do interest arbitrage by minting additional Decentralized Euro at an interest of 5% per year and using those to buy pool shares that yield maybe 6% per year. The opposite is the case if the reserve is higher than one fifth. In that case, minters should think about selling pool shares to repay their debt (if they are able to).

This leads to the following rule of thumb: if the nDEPS market cap is higher than the market cap of Decentralized Euro, then market participants are betting on the system to grow. If the nDEPS market cap is lower than the Decentralized Euro market cap, then the market is signaling that it expects the Decentralized Euro system to shrink.

### Limits to Capital Efficiency

What if someone creates a clone of the Decentralized Euro system with a higher valuation factor (e.g., 8x, targeting 12.5% reserve)? Would they be able to offer a better deal thanks to better capital efficiency? Here, one needs to be aware that there is a trade-off. It is certainly more attractive for those who mint some Decentralized Euro to buy pool shares and dump the rest of the coins onto the market. However, one needs to be aware that this implies that there is a buyer for the other portion of the Decentralized Euro to keep the system in equilibrium. These buyers are typically users that hold Decentralized Euro for transactional purposes. And to them, stability is key. But stability suffers if one aims for an overly ambitious level of capital efficiency, making the clone less attractive for transactional purposes. It is hard to tell where exactly the right equilibrium is, but this is not a race to the bottom where the system with the lowest capital requirements automatically wins. The Decentralized Euro's choice of `VALUATION_FACTOR = 5` (targeting ~20% reserve) represents a robust middle ground that still allows for plenty of seignorage gains.
