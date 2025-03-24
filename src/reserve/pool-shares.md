# Pool Shares

**Directly contribute risk capital to the Decentralized Euro system to get Decentralized Euro
  Pool Shares (nDEPS) in return.**

### Reserve Pool Shares

Native Decentralized Euro Protocol Shares (nDEPS) are shares in the equity reserve pool of the Decentralized Euro system. Being an nDEPS holdes is similar to being a shareholder of a bank. As the Decentralized Euro system makes profits through fees or liquidations, the price of the pool shares is automatically adjusted upwards. Likewise, when risks materialize and the reserve pool incurs a loss, the value declines. They can be minted at any time and redeemed again after a mimimum holding period of three months. Over time, reserve pools shares that are not moved accumulate votes. Shareholders with at least 2% of the votes gain veto power.

### Economics

Anyone can create additional pool shares by depositing reserve capital at any time, or redeem them again after a minimum holding period of 90 days. Therefore, an important design consideration is the pricing mechanism for pool shares. As having a price implies having a valuation, this boils down to evaluating the Decentralized Euro system.

### Proportional Capital Valuation

In an approach inspired by the research paper "[The Continuous Capital Corporation](https://papers.ssrn.com/sol3/papers.cfm?abstract\_id=4189472)", the Decentralized Euro system evaluates itself at a constant multiple of its capital. This multiple is set to five. So if there is 1 million dEURO in equity capital K, anyone can subscribe to new pool shares at a valuation of 5 million dEURO, or also redeem old shares at that valuation. 

### Equilibrium

Consider again the example with 30 million dEURO in outstanding mints and an interest of 5%, leading to a reserve inflow of 1.5 million per year. Under these circumstances, rational market participants will value the entire pool at 30 million dEURO and therefore buy additional pool shares until the valuation hits 30 million dEURO. This valuation is reached at a reserve pool size of 10 million dEURO, leaving 20 million dEURO in circulation that can be used for other purposes.

This is essentially fractional reserve banking with a reserve of one third. In contrast, the tier 1 equity capital of modern banks is usually much less than that, so the Decentralized Euro system has a considerably higher reserves. However, unlike in the traditional banking system, this reserve requirement is not strictly enforced by a regulator, but more like a carrot that attracts the equilibrium towards the reserve target.

If the effective interest at which new positions can be opened is at 5% and the reserve is below the target of one third of the outstanding balance, then it is possible to do interest arbitrage by minting additional dEURO at an interest of 5% per year and using those to buy pool shares that yield maybe 6% per year. The opposite is the case if the reserve is higher than one third. In that case, minters should think about selling pool shares to repay their debt (if they are able to).

This leads to the following rule of thumb: if the nDEPS market cap is higher than the market cap of dEURO, then that means that the market participants are beeting on the system to grow. If the nDEPS market cap is lower than the dEURO market cap, then the market is signaling that it expects the Decentralized Euro system to shrink.

### Limits to Capital Efficiency

What if someone creates a clone of the Decentralized Euro system with a reserve target of 25%? Would they be able to offer a better deal thanks to a better capital efficiency? Here, one needs to be aware that there is a trade-off. It is certainly more attractive for those who mint some dEURO to buy pool shares and dump the rest of the coins onto the market. However, one needs to be aware that this implies that there is a buyer for the other 75% of the dEURO to keep the system in equilibrium. These buyers are typically users that hold dEURO for transactional purposes. And to them, stability is key. But stability suffers if one aims for an overly ambitious level of capital efficiency, making the clone less attractive for transactional purposes. It is hard to tell where exactly the right equilibrium is, but this is not a race to the bottom where the system with the lowest capital requirements automatically wins. We believe that aiming for a 33% reserve is a robust middle ground, that still allows for plenty of seignorage gains.
