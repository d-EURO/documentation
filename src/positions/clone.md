# Cloning Existing Positions

**Immediately mint Decentralized Euros by cloning an established position that is not maxed out.**

This is the standard way to obtain Decentralized Euros against a collateral. Unlike creating an entirely new position, which takes at least the initialization period plus assessment time from the community, cloning an established position can be done immediately. To do so, find an existing position that is based on your collateral of choice and that is not maxed out yet — i.e. where the borrowed total is below the position's minting limit.

<figure style="text-align: center"><img src="/assets/clone-list.png" alt=""><figcaption><p>Existing positions on the Monitoring page</p></figcaption></figure>

When selecting a position on [Monitoring](https://app.dEURO.com/monitoring), you get to see its detail view with all the relevant parameters. If you want to mint against that position type and you are not the owner, click Clone — that opens the Lending page with that parent position pre-selected. If you are the owner, use Manage to open your position's adjustment hub instead of cloning.

<figure style="text-align: center"><img src="/assets/clone-position.png" alt=""><figcaption><p>Position details</p></figcaption></figure>

The Lending page lets you specify how much you want to borrow and shows you how much of the collateral asset you need for that. When confirming the inputs, a transaction is created that will at the same time deduct the required amount of collateral and mint the indicated amount of dEURO into your wallet.

Note that a fraction of what you borrow does not go to your wallet but is sent to the borrowers reserve in your name. Unless the dEURO system suffers from large losses in the meantime, you will get that reserve back as you repay the outstanding amount.

Interest accrues continuously on the position and is settled when you repay, modify, or close it. The annual rate of the clone is synced with the current Leadrate plus the parent's risk premium at the time of cloning. The difference between V2 and V3 is the base on which the rate is charged: V3 charges interest only on the usable mint (principal minus the reserve contribution), V2 charges it on the full minted amount.

A small fee is also taken on the minted amount and added to the system's equity reserve.
