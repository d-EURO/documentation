# Forensische Analyse: Forced-Sale-Angriffsversuch auf MintingHubV3 vom 25. April 2026

**Status:** Interne Sicherheitsanalyse
**Erstellt:** 26. April 2026
**Netzwerk:** Ethereum Mainnet
**Betroffenes Protokoll:** dEURO V3 — `MintingHubV3` / `Position` / `Equity`
**Realisierter Schaden:** ~4 621 dEURO, sozialisiert über die Equity-Reserve
**Gestoppter Schaden:** Zweite Stufe revertete (`"WFPS not received"`)

## 1. Executive Summary

Am 25. April 2026 um 20:08:47 UTC (Block 24 959 311) wurde auf einer abgelaufenen dEURO-V3-Position mit illiquidem Collateral (WFPS) ein zweistufiger Angriff ausgeführt. Stufe 1 — eine `buyExpiredCollateral`-Operation kombiniert mit sofortigem `clone()` desselben Collaterals in eine neue Position — verlief erfolgreich und sozialisierte einen Verlust von **4 623,86 dEURO** auf die dEURO-Equity-Reserve. Stufe 2 — eine 14 Minuten später aufgerufene `attack(uint256)`-Funktion auf einem von Etherscan als "Attack" markierten Smart Contract — revertete mit der Fehlermeldung `"WFPS not received"`.

Die zweite, vermutlich größere Schadensstufe ist damit verhindert worden. Die in Stufe 1 neu erzeugte Position `0x7EC6F1948ACF8E1cA486cA77B1919345e19B3392` befindet sich aktuell im Besitz des Angreifer-Contracts und stellt ein offenes Folge-Risiko dar.

## 2. Eckdaten der ersten Transaktion (Setup-Stufe)

| Feld | Wert |
| --- | --- |
| TX-Hash | `0x1accee7db2b18f5d6ae12992807590e2fddfd7a3b4ccb2abc365c46a44b9a158` |
| Block | 24 959 311 |
| Zeitpunkt | 25. Apr 2026, 20:08:47 UTC |
| Status | Success |
| TX-Typ | 4 (EIP-7702 SetCode) |
| From / To | `0x5Bb3BFCf4c3091d40e57FD3e3C91Bc56f6df35B5` (Self-Call via Delegation) |
| Delegated Code | `0x4884d28F048E66A537762334937e01A044CbDFAc` (unverifizierte Bytecode-Implementierung) |
| ETH-Value | 0 |
| Gas Used | 1 059 372 |
| Fee | 0,002280 ETH (~$5,31) bei 2,15 Gwei |

## 3. Eckdaten der zweiten Transaktion (Angriffsstufe — gescheitert)

| Feld | Wert |
| --- | --- |
| TX-Hash | `0x6c768cb15ee23f1583e92acc634699fd75571826111bb4eb24b1a41e9a345254` |
| Block | 24 959 382 (~14 min nach TX 1) |
| Zeitpunkt | 25. Apr 2026, 20:22:59 UTC |
| Status | **Reverted — `"WFPS not received"`** |
| From | `0x3fe637cf3a0f8cFEc27Ab6adad97Bf56843A4823` |
| To | `0xf7FeF172D44DF28e430bAC013B8780762A0834E8` (Etherscan-Label: "Attack") |
| Method | `attack(uint256 _heroId)` — Selector `0x64dd891a` |
| Parameter | `_heroId = 0x11a4c464` |
| Gas Used | 218 383 |
| Fee | 0,000083 ETH |

## 4. Akteure und Wallet-Cluster

### 4.1 Cluster A — Owner der ursprünglichen Position

```
Tornado.Cash
   │ 1 ETH + mehrere 0,1 ETH-Tranchen (vor ~2 Tagen)
   ▼
0x6BD9e85ea5635e07822490914931afbd9f530d56  (EOA, 17 TXs in 2 Tagen)
   │ Holdings: 0,85 ZCHF, 0,015 FPS, 2,35 ETH
   │ Aktivität: clone() der späteren Opfer-Position
   ▼
Position 0x15a91C214e7885C4c38A5A6500EAC68b9b4f8500  (Minimal Proxy auf Position-Impl 0xb26dc066…1897d)
```

**Auffälligkeiten:**
- Wallet erst 2 Tage alt zur Tatzeit
- Funding direkt aus Tornado.Cash
- Frankencoin-/FPS-Bezug deutet auf Erfahrung mit dem Vorläufer-Protokoll hin
- Position wurde mit kurzer Expiration angelegt und nicht aktiv verwaltet

### 4.2 Cluster B — Searcher / Angreifer

```
0xFd89cD1b...697244f61  (Funding-Source)
   │ 0,1 + 0,2 ETH
   ▼
0x3fe637cf3a0f8cFEc27Ab6adad97Bf56843A4823  (Operator-EOA, 11 TXs)
   ├─ deployt Smart Contract 0xf7FeF172...0834E8  (von Etherscan als "Attack" gelabelt)
   ├─ Uniswap-V3-Swaps (ETH ↔ EURC)
   ├─ Approvals auf Circle EURC
   └─ ruft attack() auf 0xf7FeF172... → REVERTED

0x5Bb3BFCf4c3091d40e57FD3e3C91Bc56f6df35B5  (Burner-EOA, 17 h alt, 3 TXs)
   │ EIP-7702 → 0x4884d28F048E66A537762334937e01A044CbDFAc
   │ Setup-TX (analysiert) → SUCCESS
   │ 8,73 ETH IN, 10,79 ETH OUT (Sweep-Pattern)
```

**Auffälligkeiten:**
- Operator-EOA und Burner-EOA wurden beide kurz vor dem Angriff frisch finanziert
- EIP-7702-Delegate ist 275 Tage alt — wurde also vor langer Zeit als Smart-Account-Implementierung deployt und für diesen Vorgang reaktiviert
- Kein Etherscan-Label am EIP-7702-Delegate, kein Source-Code verifiziert
- "Attack"-Contract enthält genau zwei Function-Selector: `0x64dd891a` (`attack`) und `0xd87d6d7c`

### 4.3 Verbindung zwischen den Clustern

Eine **direkte On-Chain-Verbindung** zwischen Cluster A (Position-Owner) und Cluster B (Angreifer) ließ sich nicht herstellen — beide laufen über Tornado.Cash bzw. nicht-zurückverfolgbare Funding-Quellen. Operatives Pattern (Wallet-Alter, Timing, kurze Position-Expiration, sofortiger Re-Mint) ist allerdings konsistent mit einer koordinierten Akteurs-Gruppe.

## 5. Detailanalyse Stufe 1 — Setup-Transaktion

### 5.1 Beteiligte Verträge

| Adresse | Rolle |
| --- | --- |
| `0x000000000004444c5dc75cB358380D2e3dE08A90` | Uniswap V4 PoolManager |
| `0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640` | Uniswap V3 USDC/WETH 0,05 % Pool |
| `0xBA12222222228d8Ba445958a75a0704d566BF2C8` | Balancer Vault |
| `0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2` | WETH |
| `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` | USDC |
| `0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33C` | EURC |
| `0xBA3f535bbCcCcA2A154b573Ca6c5A49BAAE0a3EA` | dEURO Token |
| `0x5052D3Cc819f53116641e89b96Ff4cD1EE80B182` | WFPS (Wrapped FPS) |
| `0x8b3c41c649b9c7085c171cbb82337889b3604618` | MintingHubGateway (V3) |
| `0x15a91C214e7885C4c38A5A6500EAC68b9b4f8500` | **Opfer-Position (alt)** |
| `0x7EC6F1948ACF8E1cA486cA77B1919345e19B3392` | **Neue Position (Folge-Risiko)** |

### 5.2 Aktionssequenz innerhalb der Setup-TX

1. **Liquiditäts-Setup** über DEXes:
   - Uniswap V3 (USDC/WETH 0,05 %): `0,0846 WETH → 195,43 USDC`
   - Uniswap V4 PoolManager: Multi-Hop-Swaps via Unlock-Callback
   - Balancer Vault: `0,1756 WETH` Eingang (Swap-/Flash-Leg)
   - EURC-Routing: 4 500 EURC über mehrere Pfade als EUR-Stable-Leg
2. **Forced Sale** auf der abgelaufenen Position `0x15a91...8500`:
   - Aufruf `MintingHubGateway.buyExpiredCollateral(pos, 4 · 1e18)` → intern `pos.forceSale(buyer, 4e18, costs)` (`MintingHub.sol:533`)
   - Forced-Sale-Preis (`expiredPurchasePrice`): **85,2932 dEURO/WFPS** (~6,8 % des Origin-Preises von 1 250 dEURO/WFPS)
   - Käufer zahlt **~341,17 dEURO**, erhält 4 WFPS
   - Event `Loss(reportingMinter=0x15a91..., amount=4 623,86 dEURO)` → Equity-Reserve absorbiert die Differenz zwischen Restschuld und Erlös
   - Event `Profit(reportingMinter=0x15a91..., amount=2,65 dEURO)` → realisierte Zinsen
   - Event `MintingUpdate(collateral=0, price=1 250, principal=0)` auf alter Position
3. **Sofortiges Re-Mint** mit denselben 4 WFPS:
   - Aufruf `MintingHub.clone(parent=0x15a91…, _initialCollateral=4e18, _initialMint=5 000e18, expiration=…)`
   - Neue Position `0x7EC6F1948…3392` erstellt (Minimal Proxy auf Position-Impl `0xb630d29e…79e4`)
   - Owner gesetzt auf `0xf7FeF172…0834E8` (Attack-Contract) — **nicht** der TX-Sender
   - `MintingUpdate(collateral=4e18, price=1 250e18, principal=5 000e18)` auf neuer Position
   - Opening-Fee 500 dEURO → Treasury `0xc71104001A3CCDA1BEf1177d765831Bd1bfE8eE6`
   - Netto-Auszahlung an Cloner: `5 000 − 500 − reservePPM-Anteil`

### 5.3 Ökonomische Bilanz Stufe 1

```
Käufe / Ausgaben:
   Forced-Sale-Kaufpreis        ~  341 dEURO
   Opening-Fee neue Position    +  500 dEURO  (an Treasury)
   Gas + DEX-Slippage           ~ < 10 dEURO

Einnahmen:
   Frische dEURO-Mint           ~ 4 000-4 500 dEURO  (5 000 minus Reserve-Anteil)
   4 WFPS in neuer Position     = besichert mit 5 000 dEURO Oracle-Wert

Bruttoarbitrage Stufe 1:        ~ 3 600 dEURO  (vor weiteren Hedging-Kosten)

Schaden für dEURO-System:
   Loss-Event                   = 4 623,86 dEURO  (Equity-Reserve)
   Profit-Event                 =     2,65 dEURO  (Zinsen)
   ───────────────────────────────────────────
   Netto-Reserve-Hit            ≈ 4 621,21 dEURO
```

## 6. Detailanalyse Stufe 2 — gescheiterter `attack()`-Aufruf

14 Minuten nach dem Setup ruft der Operator `0x3fe637cf...A4823` die Funktion `attack(uint256 _heroId)` auf dem zuvor deployten "Attack"-Contract `0xf7FeF172...0834E8` auf. Der Aufruf revertet mit:

```
WFPS not received
```

Der Bytecode des Attack-Contracts ist nicht verifiziert. Die im Bytecode erkennbaren Function-Selector sind:

- `0x64dd891a` → `attack(uint256)` (verwendet)
- `0xd87d6d7c` → unbekannt (möglicherweise Recovery- oder Owner-Funktion)

Die Fehlermeldung `"WFPS not received"` deutet auf einen **Pre-/Post-Balance-Check** im Attack-Contract: er erwartete, in dieser Transaktion 4 WFPS (oder mehr) zu erhalten, dies geschah aber nicht. Mögliche Hypothesen für die intendierte Schadensvektor:

- **Re-Entrancy auf `Position`**: Ein verschachtelter Aufruf während `forceSale` oder `clone()`, der ein zweites Mal Collateral ziehen sollte — durch einen `nonReentrant`-Modifier oder eine balance-basierte Prüfung blockiert
- **Doppelter Forced Sale auf neue Position**: Versuch, die soeben erzeugte Position selbst über `buyExpiredCollateral` zu drainen — schlägt fehl, weil die neue Position nicht expired ist
- **Callback-Manipulation auf Uniswap V4 Unlock**: Versuch, im Hook-Callback WFPS aus dem PoolManager zu extrahieren — schlägt fehl, weil PoolManager nur die ausgehandelten Token freigibt

Ohne Reverse-Engineering des Bytecodes lässt sich der intendierte Vektor nicht abschließend bestimmen. **Empfohlen: Disassembly und Statische Analyse** des Bytecodes von `0xf7FeF172...0834E8` und `0x4884d28F048E66A537762334937e01A044CbDFAc`.

## 7. Strukturelle Schwachstellen, die der Angriff ausnutzte

### 7.1 Aggressive Decay-Kurve in `expiredPurchasePrice`

`MintingHub.sol:472` — die Funktion `expiredPurchasePrice(IPosition pos)` lässt den Forced-Sale-Preis nach Ablauf einer Position linear gegen 0 verfallen. In diesem Fall fiel der Preis innerhalb von ca. 2 Tagen von 1 250 dEURO/WFPS auf 85 dEURO/WFPS (≈ 6,8 % des Origin-Preises), bevor ein Searcher zugriff. Bei illiquiden Collaterals ist die unterstellte Searcher-Konkurrenz nicht gegeben — niemand bietet, weil der ursprüngliche Origin-Preis als überhöht gilt — und der Decay läuft fast vollständig durch, bevor jemand die Arbitrage-Lücke nutzt. Die Folge: maximaler Loss für die Equity-Reserve.

### 7.2 Ungeprüfte Origin-Preise bei Position-Klonen

`MintingHub.sol:221` — `clone()` übernimmt den Preis der Eltern-Position ohne Re-Validierung. Wenn die Eltern-Position einen mispricten Origin-Preis hat (z. B. weil keine Challenge gegen sie eingereicht wurde), wird dieser Mispricing-Effekt vererbt. In der hier analysierten Sequenz wurde dieselbe 4-WFPS-Collateral mit demselben 1 250-dEURO-Preis re-collateralisiert und kann theoretisch in zwei Tagen erneut die gleiche Drain-Sequenz auslösen.

### 7.3 Fehlender Challenge-Anreiz bei illiquiden Collaterals

`MintingHub.sol:38` — `CHALLENGER_REWARD = 20 000` (= 2 %). Bei illiquiden Tokens wie WFPS in geringem Volumen ist die absolute Reward-Summe (~100 dEURO bei einer 5 000-dEURO-Position) zu klein, um den Aufwand einer Challenge zu rechtfertigen — Challenger müssen Collateral-Tokens aufbringen, Auktionsrisiko tragen und mit illiquidem Markt umgehen. Konsequenz: mispricte Positionen werden nicht herausgefordert und expiren regulär.

### 7.4 Owner-Mismatch ohne Whitelist im Clone-Pfad

`clone()` erlaubt dem Aufrufer, einen beliebigen `owner` für die neue Position zu setzen. In dieser TX wurde der Owner auf den "Attack"-Contract gesetzt, während der Aufruf von einem EIP-7702-delegierten EOA ausgeht. Damit kann ein Operator mehrere Positionen über separate Owner-Contracts orchestrieren und Forensik / Sanktionsmaßnahmen erschweren.

## 8. Offenes Folge-Risiko: Position `0x7EC6F1948ACF8E1cA486cA77B1919345e19B3392`

Diese in Stufe 1 erzeugte Position ist nach wie vor aktiv:

- **Owner:** `0xf7FeF172D44DF28e430bAC013B8780762A0834E8` (Attack-Contract)
- **Collateral:** 4 WFPS
- **Price:** 1 250 dEURO/WFPS
- **Principal:** 5 000 dEURO

Ohne Gegenmaßnahme wird sich das Pattern wiederholen, sobald die Position abläuft: erneuter Verfall des `expiredPurchasePrice`, erneuter Forced Sale durch Cluster B (oder Konkurrent-Searcher), erneuter Loss in Höhe des Mispricing-Differenzbetrags zur Equity-Reserve.

**Sofortige Maßnahme:** Challenge gegen die Position einreichen, solange sie nicht expired ist. Reward bei erfolgreicher Challenge: 2 % von 5 000 dEURO = 100 dEURO. Effekt: Forced-Sale-Pfad wird durch `noChallenge`-Modifier blockiert und der Origin-Preis wird durch Auktion korrigiert.

## 9. Empfehlungen

### 9.1 Sofort (operativ)

1. **Position `0x7EC6F1948...3392` challengen.** Verhindert die Wiederholung des Drain-Musters auf demselben Collateral. Reward 100 dEURO deckt den operationellen Aufwand.
2. **Alle aktiven WFPS-Positionen prüfen.** Forensische Inventur aller noch offenen WFPS-besicherten Positionen, Origin-Preise gegen WFPS-Marktpreis abgleichen.
3. **Beobachtungs-Liste pflegen.** Adressen `0x6BD9e85e...d56`, `0x3fe637cf...4823`, `0xf7FeF172...4E8`, `0x5Bb3BFCf...5B5`, `0x4884d28F...DFAc`, `0xFd89cD1b...4f61` und der Attack-Contract auf weitere Aktivität monitoren.

### 9.2 Kurzfristig (Protokoll-Parameter)

1. **Decay-Kurve anpassen.** `expiredPurchasePrice` flacher gestalten oder mit einem Floor-Preis ausstatten (z. B. 30 % des Origin-Preises), damit illiquide Collaterals nicht zum Quasi-Geschenk werden.
2. **Re-Mint-Cooldown nach Forced Sale.** Nach erfolgreichem `buyExpiredCollateral` für `clone()` mit derselben Collateral-Adresse einen Cooldown einführen (z. B. 24 h), während dem entweder kein Klonen erlaubt ist oder der Origin-Preis neu durch Challenge legitimiert werden muss.
3. **Maximalpreis-Cap je Collateral.** Governance-gesetzter Oracle-Cap pro Collateral-Token, der den vom Proposer setzbaren `price` begrenzt — verhindert offensichtlich überhöhte Origin-Preise.

### 9.3 Mittelfristig (Architektur)

1. **Challenge-Reward proportional zum Mispricing-Risiko.** Höherer Reward für Collaterals mit geringer DEX-Liquidität, Anpassung dynamisch über Volumen-Oracle.
2. **Whitelist für Collateral-Tokens.** Mindestkriterien (DEX-Liquidität, Marktkapitalisierung, Oracle-Verfügbarkeit) für neue Collaterals, einsetzbar im `MintingHub`.
3. **Owner-Validierung im Clone-Pfad.** Optionaler Modus, in dem `clone()` den Owner nicht frei wählen lässt, sondern auf `msg.sender` zwingt — reduziert Misuse durch wegwerfbare Smart-Contract-Owner.

### 9.4 Forensik

1. **Bytecode-Reverse-Engineering** von `0xf7FeF172...0834E8` (Attack-Contract) und `0x4884d28F...DFAc` (EIP-7702-Delegate). Ziel: identifizieren des intendierten Stufe-2-Vektors.
2. **Cluster-Erweiterung.** CEX-/Aggregator-Counterparties der Funding-Wallets prüfen, Tornado-Cash-Deposit-Tickets clustern.
3. **Disclosure.** Falls die Bytecode-Analyse einen weiteren, noch nicht gefixten Vektor enthüllt, koordinierte Disclosure und Hotfix.

## 10. Zeitleiste

| Zeitpunkt | Ereignis |
| --- | --- |
| ~23. April 2026 | Cluster-A-EOA `0x6BD9e85e...d56` erhält Funds aus Tornado.Cash |
| ~23. April 2026 | Original-Position `0x15a91...8500` per `clone()` eröffnet, 5 000 dEURO Principal, 4 WFPS Collateral, kurze Expiration |
| 25. April 2026 ~03 Uhr UTC | Cluster-B-EOA `0x3fe637cf...4823` deployt Attack-Contract `0xf7FeF172...4E8` |
| 25. April 2026 ~19 Uhr UTC | Burner-EOA `0x5Bb3BFCf...5B5` mit 8,73 ETH gefundet |
| 25. April 2026, 20:08:47 UTC | **Setup-TX** `0x1accee7d...` — ForcedSale + clone() (SUCCESS), Loss 4 623,86 dEURO |
| 25. April 2026, 20:22:59 UTC | **Angriffs-TX** `0x6c768cb1...` — `attack()` (REVERTED, "WFPS not received") |
| 26. April 2026 | Forensische Analyse erstellt; neue Position weiterhin aktiv |

## 11. Referenzen

### Transaktionen

- Setup-TX: <https://etherscan.io/tx/0x1accee7db2b18f5d6ae12992807590e2fddfd7a3b4ccb2abc365c46a44b9a158>
- Angriffs-TX (reverted): <https://etherscan.io/tx/0x6c768cb15ee23f1583e92acc634699fd75571826111bb4eb24b1a41e9a345254>
- Original-Position-Erstellung: <https://etherscan.io/tx/0x2402369ee10ee3b1c4c780b663c84e3649ed131b98614434ea4f5d13283247e0>

### Adressen

- Attack-Contract: <https://etherscan.io/address/0xf7FeF172D44DF28e430bAC013B8780762A0834E8>
- EIP-7702-Delegate: <https://etherscan.io/address/0x4884d28F048E66A537762334937e01A044CbDFAc>
- Operator-EOA: <https://etherscan.io/address/0x3fe637cf3a0f8cFEc27Ab6adad97Bf56843A4823>
- Burner-EOA: <https://etherscan.io/address/0x5Bb3BFCf4c3091d40e57FD3e3C91Bc56f6df35B5>
- Original-Position-Owner (Tornado-funded): <https://etherscan.io/address/0x6BD9e85ea5635e07822490914931afbd9f530d56>
- Opfer-Position (alt): <https://etherscan.io/address/0x15a91C214e7885C4c38A5A6500EAC68b9b4f8500>
- Folge-Position (offen): <https://etherscan.io/address/0x7EC6F1948ACF8E1cA486cA77B1919345e19B3392>
- MintingHubGateway: <https://etherscan.io/address/0x8b3c41c649b9c7085c171cbb82337889b3604618>

### Quellcode

- `contracts/MintingHubV3/MintingHub.sol` — Funktionen `buyExpiredCollateral`, `expiredPurchasePrice`, `clone`, Konstanten `CHALLENGER_REWARD`, `OPENING_FEE`
- `contracts/MintingHubV3/Position.sol` — Funktionen `forceSale`, `_repayInterest`, `_repayPrincipalNet`, Modifier `expired`, `noChallenge`
- `contracts/Equity.sol` — Loss-/Profit-Verbuchung an Equity-Reserve
