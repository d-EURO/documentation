# Reserve

**The three types of reserves that help with stabilizing the system.**

There are three types of reserves in the Decentralized Euro system. The first one consists of other Euro stablecoins that reside in a bridge, the second one consists of funds provided by the borrowers when they mint new Decentralized Euros, and the third one is provided by the holders of reserve pool shares. The collateral used to mint Decentralized Euro is not considered reserve as it conceptually stays outside the "balance sheet" of the Decentralized Euro system.

<figure style="text-align: center"><img src="/assets/reserve.png" alt=""><figcaption><p>Reserve distribution</p></figcaption></figure>

If the Decentralized Euro system was a company, its balance sheet would roughly look as shown above. On the asset side, the system has all the stablecoins that reside in bridges (**x**), it has given loans to minters that they need to repay (**m**), and it has a number of Decentralized Euro in its reserves (**r**). On the liabilities side, there are all the Decentralized Euros in circulation (**z**), the reserve (**b**) it owes to the minters, and the equity (**e**) owned by the pool share holders.

To provide you with an intuitive understanding of the balance sheet, let us look at what happens in three example scenarios:

1. If a user sends 100 Decentralized Euro to the stablecoin bridge to swap them into xEURO, the balance sheet items **x** and **z** are both reduced by 100 units of that currency. The other balance positions are unaffected.
2. If a user mints 500 Decentralized Euro against a collateral with a reserve ratio of 20% and a fee of 5%, the following will happen on the active side: **m** will increase by 500 (because that is how much they need to repay) and **r** will increase by 125 (because that is how much they put into the borrowers reserves and paid in fees). On the passive side, **z** will increase by 500 (because that is how is being minted), **b** will increase by 100 (because that is how much the system needs to return to the user when the position is repaid), and equity **e** will increase by 25, as the fee is never returned and now belongs to the Decentralized Euro system. So in this case, minting 500 Decentralized Euros counter-intuitively expands the balance sheet by more than that, namely 625 Decentralized Euro. The collateral provided by the user is outside the balance sheet and does not appear here. Even though it is locked, it still belongs to the user.
3. A position that was used to mint 5000 Decentralized Euro is successfully challenged, with the highest bid being 4500 Decentralized Euro. To be able to repay everything, the system will take 600 Decentralized Euro out of the reserve, decreasing **r** by 600. Out of the 5100 Decentralized Euro we get as a result, 5000 Decentralized Euro are used to repay the loan, reducing both **m** and **z** by 5000 each. The remaining 100 Decentralized Euro are sent to the challenger as a reward. Assuming that the borrower's reserve attributable to that position was 1000 Decentralized Euro, there are 400 Decentralized Euro remaining that can be reassigned from **b** to equity **e** on the passive side. These 400 Decentralized Euro are the liquidation profits the system made in this example.

When a position is liquidated, there are three layers of protection that kick in to protect the system from a loss: First, the borrower's reserve directly attributable to the liquidated position is used to cover the loss. If that does not suffice, the loss is taken out of equity, making the pool shares less valuable. Third, if not even that is enough, then the general borrower's reserve is tapped into. This last escalation step is a means of last resort. It implies that other users will have to pay back more than anticipated when closing their position. This gives not only the pool share holders an incentive to guard the system against losses, but also everyone who has an open position as they will suffer when a severe loss happens due to having accepted unsound collateral.

Lastly, it is worth mentioning that the system is designed such that given efficient markets, the, equity will in equilibrium be about one third of the Decentralized Euros not created through a bridge, i.e. **3e = z - x**.



