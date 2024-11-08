# 🌁 Stablecoin Bridges

**Simple contracts that allow swapping other Swiss franc stablecoins into
  Frankencoin and back.**

The swap page allows you to other recognizes Swiss franc stablecoins against Frankencoins and back. Moving back into other stablecoins is only possible as long as there it some of the other stablecoin left in the bridge contract. Essentially, this pegs the Frankencoin 1:1 to other stablecoins and helps stabilizing its value. In order to protect the Frankencoin from a crash of the connected stablecoins, the bridge contract is limited in time and volume. After a year the latest, it needs to be replaced with a new contract.

System participants should closely watch the amount of other stablecoins flowing in and out. Having a lot of outflow could be an indication that it is too cheap to mint Frankencoins, i.e. implied interest rates being too low. Having large inflows could be an indication that going into Frankencoins is too attractive and interest rates too high.
