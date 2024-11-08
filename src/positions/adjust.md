# Adjusting a Position

**How to adjust a position**

Once you are the proud owner of a position whose cooldown period has passed, you can start to adjust it. You can adjust the outstanding amount, the amount of the deposited collateral, and the liquidation price. Every input field has a magic wand button that automatically sets the value to whatever makes most sense given the other two values.

The following rules apply:

* When increasing the amount, new Frankencoins will be minted and sent to your wallet. Some of them also are sent to the reserve on your behalf and some are paid as a fee into the equity pool. You will never get the fee back, but you will likely get the reserve back when you return and burn the minted Frankencoins. The reserve might be used to cover the system's losses after all equity has been wiped out. This creates an incentive for you to help looking after the system.
* When decreasing the amount, you need to have some Frankencoins in the wallet, but some are also taken out of the reserve. For example, if the reserve ratio is 20%, it suffices to return 800 ZCHF in order to close a 1000 ZCHF position as the other 200 ZCHF are taken from the reserve.
* When withdrawing excess collateral, it is important to observe the dust limit. For example, if the minimum collateral is 1 WETH, the collateral cannot be reduced to 0.9 WETH.
* There is no limit for how much collateral you can add, but doing so requires the allowance to be set.
* Increasing the liquidation price will allow you to borrow more, but only after the cooldown period has passed again, allowing others to challenge your position at the new price before you can use the higher price to mint Frankencoin.
![Adjust a position](https://github.com/DFXswiss/frankencoin-docu/assets/169650174/6dd5d9e7-85af-4e0e-8571-308ac722c993)

