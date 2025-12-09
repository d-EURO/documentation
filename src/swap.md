# Stablecoin Bridges

**Simple contracts that allow swapping other Euro stablecoins into
  Decentralized Euro and back.**

The swap page allows you to swap other recognized Euro stablecoins against Decentralized Euros and back. Moving back into other stablecoins is only possible as long as there it some of the other stablecoin left in the bridge contract. Essentially, this pegs the Decentralized Euro 1:1 to other stablecoins and helps stabilizing its value. In order to protect the Decentralized Euro from a crash of the connected stablecoins, the bridge contract is limited in time and volume. After a year the latest, it needs to be replaced with a new contract.

System participants should closely watch the amount of other stablecoins flowing in and out. Having a lot of outflow could be an indication that it is too cheap to mint Decentralized Euros, i.e. implied interest rates being too low. Having large inflows could be an indication that going into Decentralized Euros is too attractive and interest rates too high.

The bridges can be viewed on the blockchain under the following links:

* EURC: https://etherscan.io/address/0xb4ff7412f08c22d7381885e8bda9ee9825092fd1#code
* EURS: https://etherscan.io/address/0x73f38ca06b27eaefb1612d062d885f58924f5897#code
* VEUR: https://etherscan.io/address/0x76d8f514554a4a8e5d6103875f2dd7a67543692b#code
* EUROP: https://etherscan.io/address/0x3EF3d03EFCc1338d6210946f8cF5Fb1a8b630341#code
* EURR: https://etherscan.io/address/0x20B0a153fF16c7B1e962FD3D3352A00cf019f1a7#code
