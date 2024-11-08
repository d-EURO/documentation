# Opening New Positions

**How to propose completely new positions with any collateral.**

For now, it is not possible to open new positions through the frontend. But bold degens can do so on Etherscan or through their other tool of choice. This page explains the meaning of all the parameters and provides some guidance on what kind of position should be rejected by the pool share holders. For criteria that collateral tokens should fulfill, have a look at the [acceptable collateral](https://github.com/Frankencoin-ZCHF/FrankenCoin/discussions/11) page. Most of the time, the preferred way of creating a position is not to open a new one, but to clone an existing one, which is described on the next page.

To open a new position with the default minting hub (there might be other minting hubs in the future, but for now there is only one), one needs to call its [openPosition method](https://github.com/Frankencoin-ZCHF/FrankenCoin/blob/main/contracts/MintingHub.sol). It has the following signature:

```solidity
openPosition(
        address _collateralAddress, uint256 _minCollateral, uint256 _initialCollateral,
        uint256 _mintingMaximum, uint256 _expirationSeconds, uint256 _challengeSeconds,
        uint32 _mintingFeePPM, uint256 _liqPriceE18, uint32 _reservePPM)
```

When opening a position, it is already provided with some collateral, but nothing is minted yet. Minting is not possible until the initialization period of at least three days has passed. This gives other system participants enough time to veto or to challenge the new position. A veto can only be cast by qualified pool share holders by calling the "deny" method on the position. If a position is denied, it cannot ever be used to mint Frankencoins, but it can still be challenged. New positions can be challenged immediately using the normal challenge mechanism.&#x20;

Before being able to open a position, one needs to allow the minting hub to spend Frankencoin and the collateral of choice. **Without these two allowances, opening the position will fail.** When opening a new position, one needs to carefully decide on a number of defining variables:

* _collateralAddress_: this must be the address of the ERC-20 token contract that serves as collateral. The chosen collateral should be freely traded on the market and have a somewhat stable value.
* _minCollateral_: this is the minimum acceptable amount of collateral to put into the smart contract or to start a challenge with. It should be set to about 5000 ZCHF worth of collateral. It is not possible to decrease the collateral in a position below the minimum without closing it entirely. Do not forget to scale this number according to the token's decimals, typically 10^18.
* _initialCollateral_: the initial amount of collateral. It will be automatically transferred to the newly created position during the call. As the minting hub is executing the transfer, an according allowance must be present. The initial collateral must be at least as large as the minimum collateral. Do not forget to scale this number according to the token's decimals, typically 10^18.
* _mintingMaximum_: the maximum amount of Frankencoins that can be minted against this position and its clones. When the position is cloned, the remaining amount is split between the original and the clone. The purpose is to limit the exposure of the Frankencoin system to a single collateral. The Frankencoin should be able to withstand the total failure of one or more related collaterals, even if all their positions are maximally minted.
* _expirationSeconds_: the number of seconds until the position expires. Finance people would call this the term to maturity. Together with the minting fee, the maturity implies a yearly interest rate. In the long run, the interest rate of the average position should be in line with the interest on Swiss Franc debt of similar risk. A typical value could be three years.
* _challengeSeconds_: this parameter specifies the duration of the auction phase of a challenge in seconds. For highly liquid collaterals such as Wrapped ETH, this can be rather low, maybe in the range of hours or even minutes once there are automated bidders in the market. For less liquid collateral that is harder to evaluate, challenges could last up to two weeks on order to allow the bidders to organize themselves. The longer the challenge duration, the higher is the required reserve for the position to be economically sound.
* _mintingFeePPM_: this is a one time minting fee in parts per million. If, for example, Swiss Franc interests for credit of comparable risk is at 2.5% and the expiration is in two years, this should be set to about 5%, minus some deduction for the reserve, so maybe 4% on the entire mint amount if only 80% is available to the minter and 20% is going into the reserve.
* _liqPriceE18_: the liquidation price with 18 digits of accuracy. If an auction ends at a price below the liquidation price, the position is liquidated. For example, if there is a WETH position with a liquidation price of 500 ZCHF / WETH, this parameter would be 500 \* 10^18. For tokens with a different number of decimals, the price needs to be scaled accordingly in the reverse direction. For a token with zero decimals, the price should be scaled by 10^36 instead of 10^18.
* _reservePPM_: this parameter indicates the reserve that is put aside when minting in parts per million, for example 250,000 for a reserve requirement of 25%. It should be set such that there is a very high confidence that challenges do not end more than that below the liquidation price under the assumption that the market price has just fallen slightly below the liquidation price at the start of the challenge. The more volatile the collateral and the longer the challenge period, the higher must be the reserve requirement.

Note that calling the _openPosition_ method, an opening fee of 1000 ZCHF is automatically deducted. That is why the Frankencoin allowance is necessary. This fee is not returned if the position is denied and goes to the equity holders.

Here is a screenshot of the parameters used to open the first position with Wrapped Ether as collateral in transaction [0x380b...8d](https://etherscan.io/tx/0x380b574e4b9489c8ffe66ae169156d4aaeba44ec29bb173dc208740086bf128d):
![Opening new Positions](https://github.com/DFXswiss/frankencoin-docu/assets/169650174/e473d152-62ce-4880-ac35-c7a672e585fd)
