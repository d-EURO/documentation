# Adjusting a Position

**How to adjust a position**

Once you are the proud owner of a position, you can adjust it. You can change the outstanding amount (`principal`), the deposited collateral, and the liquidation price. Where the app offers it, a Max button fills the field with the largest allowed value given the other two values. The liquidation price is tuned with a slider rather than a Max button.

The following rules apply:

* When increasing the minted amount, new dEURO will be minted and sent to your wallet. Some of them are also sent to the reserve on your behalf and some are paid as a fee into the equity pool. You will never get the fee back, but you will most likely get the reserve back when you return and burn the minted dEURO. The reserve may be used to cover the system's losses after all equity has been wiped out. This gives you an incentive to help look after the system.
* When decreasing the minted amount, you only need to return part of the dEURO from your wallet — the matching share of your borrowers reserve is dissolved against the remainder. For example, with a reserve ratio of 20%, returning 800 dEURO suffices to close a 1,000 dEURO position, because the other 200 dEURO are taken from the reserve.
* Interest is handled differently between V2 and V3. **V3 positions accrue interest continuously**: when you adjust or repay, outstanding interest is paid first, then the principal is reduced; lowering the principal therefore requires that any accrued interest is covered. **V2 positions** had their full-term interest deducted up front when minting and do not accrue further interest during the term.
* When withdrawing excess collateral, observe the dust limit. For example, if the minimum collateral is 1 WETH, the collateral cannot be reduced to 0.9 WETH.
* There is no limit on how much collateral you can add, but doing so requires the allowance to be set.
* Increasing the liquidation price will allow you to borrow more, but only after the 3-day cooldown period has passed again, allowing others to challenge your position at the new price before you can use the higher price to mint dEURO.

<figure style="text-align: center"><img src="/assets/adjust-position.png" alt=""><figcaption><p>Adjust position</p></figcaption></figure>

## V3: Cooldown-free Price Increase via Reference

V3 positions can skip the 3-day cooldown on a price increase by passing a valid reference position to `adjustPriceWithReference()` (or `adjustWithReference()` for combined adjustments). A reference position is accepted if:

- It uses the **same collateral** and exists in the same minting hub.
- It is currently **out of cooldown** with a remaining lifetime of at least its own challenge period.
- Its price plus a small margin is at least as high as the new price you want to set.

The mechanism is intended for positions tracking the price discovered by other live positions in the system — when the market has already validated a higher price elsewhere, your position does not need to repeat the wait. If the reference does not qualify, the call falls back to the regular cooldown logic.
