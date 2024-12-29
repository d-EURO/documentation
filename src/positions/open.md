# Opening New Positions

You want to mint dEURO, but your preferred type of collateral is not available yet? In that case, you can propose a new collateral type.&#x20;

To do so, head over to the [Mint page](https://app.dEuro.com/mint) and scroll to the bottom until you find the "Propose New Position or Collateral" button.&#x20;

<figure style="text-align: center"><img src="/assets/new-position-button.png" alt="" width="350"><figcaption><p>Click this button to propose a new position type</p></figcaption></figure>

On the next page are four boxes. Let's take a look at the box in the top left.&#x20;

<figure style="text-align: center"><img src="/assets/proposal-process.png" alt=""><figcaption><p>Proposal process</p></figcaption></figure>

The proposal fee is fixed at 1 000 dEURO. This fee is not returned if the position is denied and goes to the equity holders. The price tag of 1 000 dEURO ensures that each proposal is well thought-out. Having a low fee would likely encourage the proposal of illiquid and/or otherwise unfit tokens. The initialization period has to be at least 3 days. This gives other system participants enough time to veto or to challenge the new position. A veto can only be cast by qualified pool share holders by calling the "deny" method on the position. If a position is denied, it cannot ever be used to mint dEUROs, but it can still be challenged. New positions can be challenged immediately using the normal challenge mechanism.&#x20;

Next, we can inspect the box on the bottom left.

<figure style="text-align: center"><img src="/assets/financial-terms.png" alt=""><figcaption><p>Financial terms</p></figcaption></figure>

The annual interest is charged upfront and can be set by the user. With a maturity of 12 months, this is the entire fee that is charged. Of course, if the maturity is set to 6 months for example, the final interest changes accordingly. The minting limit describes the maximum amount of dEUROs that can be minted against this position and its clones. When the position is cloned, the remaining amount is split between the original and the clone. The purpose is to limit the exposure of the dEURO system to a single collateral. The dEURO should be able to withstand the total failure of one or more related collaterals, even if all their positions are maximally minted.

Next, the box on the top right comes into play.&#x20;

<figure style="text-align: center"><img src="/assets/collateral.png" alt=""><figcaption><p>Collateral</p></figcaption></figure>

First of all, the collateral token needs to be selected by pasting its contract address into the first field, and approve handling of the token. This can be done for example through MetaMask. The chosen collateral should be freely traded on the market and have a somewhat stable value. For criteria that collateral tokens should fulfil, have a look at the [Acceptable Collateral](https://github.com/orgs/d-EURO/discussions/categories/acceptable-collaterals) page. The minimum collateral section is the minimum acceptable amount of collateral and should be set to about 5 000 dEURO worth of collateral (in this specific case 2 WETH were chosen). It is not possible to decrease the collateral in a position below the minimum without closing it entirely.&#x20;

The last section is the initial amount of collateral. This will be automatically transferred to the newly created position during the minting. The initial collateral must be equal to or larger than the minimum collateral.&#x20;

The last remaining box is located on the bottom right. Here, the (potential) liquidation process is discussed.&#x20;

The liquidation price can be set freely but must result in a position liquidation of at least 5 000 dEURO. In the previous box, we've set a minimum collateral of 2 WETH. With a minimum collateral liquidation value of 5 000 dEURO, the liquidation price for each WETH must thus be at least 2 500 dEURO, as 2 \* 2 500 = 5 000. Had a minimum collateral of 20 WETH been chosen, the minimum liquidation price would thus be (5 000 / 20) 250 dEURO.&#x20;

<figure style="text-align: center"><img src="/assets/liquidation.png" alt=""><figcaption><p>Liquidation</p></figcaption></figure>

If an auction ends at a price below the liquidation price, the position is liquidated.&#x20;

The "Retained Reserve" should be set to ensure a very high confidence that challenges do not end significantly below the liquidation price, assuming the market price has just fallen slightly below it at the start of the challenge. The more volatile the collateral and the longer the challenge period, the higher the reserve requirement needs to be to mitigate risks.

The last field, the "Auction Duration", describes how long an auction should be. For highly liquid collaterals such as Wrapped ETH, the challenge duration can be quite short, possibly ranging from hours to even minutes, especially with automated bidders in the market. For less liquid collaterals that are harder to evaluate, challenges might last up to two weeks to allow bidders to organize. The longer the challenge duration, the higher the required reserve should be to ensure the position remains economically sound.

Once all parameters are set, you can hit the "Propose Position" at the bottom of the page.&#x20;

If there's no veto within the initialization process, you will have successfully opened a new position! After that, you can head over to the [My Positions page](https://app.dEuro.com/mypositions) and mint your new dEURO.
