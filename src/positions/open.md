# Opening New Positions

## Start on Lending

To open a new position as a borrower, start on [Lending](https://app.dEURO.com/mint) in the app.

There you mint dEURO by cloning an existing cloneable position type. On Lending the app pre-selects the best cloneable parent.

<figure style="text-align: center"><img src="/assets/clone-position.png" alt=""><figcaption><p>Lending: cloneable positions and pre-selected clone parent</p></figcaption></figure>

If you open a position from [Monitoring](https://app.dEURO.com/monitoring) with Clone, that parent overrides the pre-selection. That lets you start without a custom proposal when a suitable cloneable type already exists. You select how much collateral to post, set the liquidation price and expiration, and confirm when the amounts look right — one transaction creates your position and moves the collateral.

For choosing a different listed parent from the ecosystem, open [Monitoring](https://app.dEURO.com/monitoring) and Clone, as described in [Cloning Existing Positions](clone.md).

<figure style="text-align: center"><img src="/assets/clone-list.png" alt=""><figcaption><p>Open positions available for cloning</p></figcaption></figure>

## Proposing a new position type

If no existing cloneable type matches your collateral, propose a new one. Use the Propose Position button at the bottom of the Lending page.

<figure style="text-align: center"><img src="/assets/new-position-button.png" alt="" width="350"><figcaption><p>Propose position page</p></figcaption></figure>

On that page the form is grouped into four areas. Let's take a look at the box in the top left.

<figure style="text-align: center"><img src="/assets/proposal-process.png" alt=""><figcaption><p>Proposal process</p></figcaption></figure>

The proposal fee is fixed at 1,000 dEURO. This fee is not returned if the position is denied and goes to the equity holders. The price tag of 1,000 dEURO ensures that each proposal is well thought-out. Having a low fee would likely encourage the proposal of illiquid and/or otherwise unfit tokens. The initialization period must be at least **3 days** (V3) or **14 days** (V2). This gives other system participants enough time to veto or to challenge the new position. A veto can only be cast by qualified pool share holders by calling the `deny` method on the position. If a position is denied, it cannot ever be used to mint dEURO, but it can still be challenged. New positions can be challenged immediately using the normal challenge mechanism.

It is recommended to give the system participants significantly more than the minimum time to assess the proposal — minimum durations exist to bound the worst case, not to be defaults.

Next, we can inspect the box on the bottom left.

<figure style="text-align: center"><img src="/assets/financial-terms.png" alt=""><figcaption><p>Financial terms</p></figcaption></figure>

The annual interest rate is set by the position creator and is composed of the system's current **Leadrate** plus a **risk premium** specific to this position. In V3, interest is no longer charged up front: it accrues continuously as the position is held and must be paid when the position is closed, modified, or repaid. In V2, the entire upfront interest for the full term is deducted at minting time.

The minting limit describes the maximum amount of dEURO that can be minted against this position and its clones. When the position is cloned, the remaining capacity is split between the original and the clone. The purpose is to limit the exposure of the dEURO system to a single collateral. The dEURO system should be able to withstand the total failure of one or more related collaterals, even if all their positions are maximally minted.

Next, the box on the top right comes into play.

<figure style="text-align: center"><img src="/assets/collateral.png" alt=""><figcaption><p>Collateral</p></figcaption></figure>

First, the collateral token needs to be selected by pasting its contract address into the first field and approving handling of the token (for example through MetaMask). The chosen collateral should be freely traded on the market and have a reasonably stable value. For criteria that collateral tokens should fulfil, have a look at the [Acceptable Collateral](https://github.com/orgs/d-EURO/discussions/categories/acceptable-collaterals) discussion. The minimum collateral section is the smallest acceptable amount of collateral and should be set to about 5,000 dEURO worth of collateral (in the example, 2 WETH). It is not possible to decrease the collateral in a position below the minimum without closing it entirely.

The last section is the initial amount of collateral. This will be automatically transferred to the newly created position during the proposal. The initial collateral must be equal to or larger than the minimum collateral.

The last remaining box is located on the bottom right. Here, the (potential) liquidation process is configured.

<figure style="text-align: center"><img src="/assets/liquidation.png" alt=""><figcaption><p>Liquidation</p></figcaption></figure>

The liquidation price can be set freely but must result in a position liquidation value of at least 5,000 dEURO. With a minimum collateral of 2 WETH, the per-WETH liquidation price must be at least 2,500 dEURO (since 2 × 2,500 = 5,000). With a minimum collateral of 20 WETH, the minimum per-WETH liquidation price drops to 250 dEURO.

If an auction ends at a price below the liquidation price, the position is liquidated.

The "Retained Reserve" should be set to ensure a very high confidence that challenges do not end significantly below the liquidation price, assuming the market price has just fallen slightly below it at the start of the challenge. The more volatile the collateral and the longer the challenge period, the higher the reserve requirement needs to be to mitigate risks.

The last field, the "Auction Duration", describes how long an auction should run. For highly liquid collaterals such as Wrapped ETH, the challenge duration can be quite short — hours or even minutes, especially with automated bidders in the market. For less liquid collaterals that are harder to evaluate, challenges might last up to two weeks to allow bidders to organise. The longer the challenge duration, the higher the required reserve should be to ensure the position remains economically sound.

Once all parameters are set, confirm with Propose Position at the bottom of the page.

If there is no veto within the initialization period, you have successfully opened a new position. After that, head over to [My Positions](https://app.dEURO.com/mypositions) to mint your new dEURO.

## V3 Reference Position Mechanism

V3 positions introduce a reference position mechanism that allows cooldown-free price adjustments. The `adjustWithReference()` and `adjustPriceWithReference()` functions accept a reference position address. If the reference is a valid sibling position (same collateral, out of cooldown, with a long enough remaining lifetime), increasing the liquidation price does **not** trigger the standard 3-day cooldown. This makes it cheap to keep a position's price in line with the price discovered by similar positions in the system. The mechanism is rejected (and the cooldown applied normally) if the reference position cannot vouch for the new price.
