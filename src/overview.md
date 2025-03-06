# Overview

**Introducing the two tokens and the overall structure of the system**

## Structure and Purpose

The purpose of this page is to provide potential users of the Decentralized Euro system with everything they need to know to meaningfully interact with it. For actually interacting with the system, there is a standard [frontend](https://app.dEuro.com/). The name Decentralized Euro hints at its self-governing nature, but also the risks associated with releasing an artificial machinery into the wild. If you encounter errors or if things are not clear to you, you can [reach out to us in the Telegram group](https://t.me/dEURO_DecentralizedEuro) or [file a suggestion for improving this page on GitHub](https://github.com/d-EURO/smartContracts/issues).

## Decentralized Euro (dEURO) and Decentralized Euro Pool Shares (nDEPS)

The Decentralized Euro system comes with two ERC-20 tokens, a stablecoin called [Decentralized Euro (dEURO)](https://etherscan.io/address/0x37688530bEf38711d600Ee5773C21Cc27C49A2Aa) and a governance token called [Decentralized Euro Pool Shares (nDEPS)](https://etherscan.io/address/0x06ef81036432f64F622F635248903ADF59cc5497). Unlike other collateralized stablecoins, Decentralized Euro does not depend on external oracles, making it less susceptible to certain attacks and also more versatile with regards to the used collateral. The disadvantage of that approach is its speed, performing liquidations over the course of days whereas oracle-based systems might react within minutes.

The Decentralized Euro is a collateralized stablecoin that tracks the value of the Euro. There is no hard peg to the Euro, but a set of economic constraints that incentivizes the market to softly push it towards parity from two sides. Most importantly, the system is [over-collateralized](positions/): for each Decentralized Euro in circulation, there must other tokens worth at least one Decentralized Euro backing it. Furthermore, nDEPS holders have a number of ways to influence the long term price of the Decentralized Euro by making it more or less expensive to mint Decentralized Euros, similarly to how a central bank keeps the exchange rate of its own currency in balance. The underlying assumption here is that the nDEPS holders recognize that the system (and therefore also their tokens) is the most valuable when the Decentralized Euro tracks the Euro as reliably a possible, and that they use their power to govern the system accordingly.

Decentralized Euro Pool Shares are the [governance](governance.md) token of the system. Anyone can obtain newly minted nDEPS by providing equity capital to the system (or later return them again to get their share of capital back). The nDEPS holders benefit from the earned fees and liquidation profits, but they are also the ones that carry the residual risk of liquidations, similar to the shareholders of a bank. Therefore, nDEPS holders have an incentive to grow the system and ensure its stability. The governance process is veto-based: anyone can propose new types of collateral or even completely new methods to bring Decentralized Euro into circulation, but already 2% of the voting power suffices to veto such proposals.

## Use Cases

Like other stablecoins, the Decentralized Euro primarily serves three use-cases. The only use-case described extensively in this documentation is that of borrowing as it is embedded in the system. To fully leverage the other use-cases, further tools and services such as exchanges and wallets are necessary that are not described herein.

### Payments

The Decentralized Euro (dEURO) can be used to make payments in Euros. Please consult the [landing page](https://dEuro.com/) for a list of apps and services that help in using the Decentralized Euro as a means of payment, as well as a list of bridged Decentralized Euro token on other networks than Ethereum mainnet. Payments typically concern small amounts and therefore a layer two instance of the token might be preferred over the mainnet instance.

### Store of Wealth

The Euro has an excellent track record of stability relative to other fiat currencies and is often considered a safe haven when the world is in turmoil. So far, crypto investors could not get significant Euro exposure without going off-chain. For this use-case, it is important to be able to trade the dEURO in high volumes at narrow spreads.

### Borrowing / Seignorage

Anyone can mint new Decentralized Euros against a collateral using the built-in borrowing mechanism. All borrowing is based on what we refer to as _positions_. In Liquity, these are called _troves_ and in the Maker system _vaults_. They all refer to the account of a user within the system that holds a positive balance of a collateral asset and a negative balane of Decentralized Euros that must be repaid in order to get the collateral back. The Decentralized Euro system charges a non-refundable interest rate up front when minting new Decentralized Euros. Some of the minted Decentralized Euros are also held back as a reserve in case the position has to be liquidated.

## Technical Architecture

The Decentralized Euro system consists of a set of smart contracts on Ethereum mainnet. The two token contracts serves as a foundation for everything else. The dEURO can have an arbitrary number of contracts that have the power to mint and burn dEURO. Anyone can propose new such contracts and once they passed the governance process, they can start minting and buringn dEURO. Today, there are two such contracts. One is a simple bridge to bootstrap the Decentralized Euro based on the existing CryptoEuro (xEURO). The other is a contract named minting hub that serves as the central point to manage all debt positions. The nDEPS token has built-in governance features and holds the equity capital of the system.
<figure style="text-align: center"><img src="/assets/arch.jpeg" alt=""><figcaption><p>Technical Architecture</p></figcaption></figure>
