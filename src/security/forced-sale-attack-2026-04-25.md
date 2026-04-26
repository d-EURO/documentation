# Forensische Analyse: Forced-Sale-Angriff auf MintingHubV3 vom 25. April 2026

## TL;DR — Der Bug

**`MintingHub.clone()` erzwingt keine Mindest-Lebensdauer für Klon-Positionen.** Der Aufrufer darf jede `expiration ≤ parent.expiration` setzen — auch eine, die den Klon nach Sekunden ablaufen lässt. Damit lässt sich der Forced-Sale-Pfad als Drain-Mechanismus auf **jede** dEURO-V3-Position zweckentfremden:

1. Kaufe das Collateral am Markt für `C × M` dEURO-Equivalent
2. Klone eine beliebige bestehende Eltern-Position mit kurzer Klon-Expiration
3. Hebe den Principal als dEURO ab (`_initialMint`); Auszahlung an Caller: `0,9 × C × P`
4. Warte, bis der `expiredPurchasePrice` linear gegen 0 dekayt
5. Kaufe das eigene Collateral via `MintingHubGateway.buyExpiredCollateral` zum minimalen Decay-Preis (~6,8 % von P) zurück
6. Verkaufe das Collateral wieder am Markt für `C × M`
7. Den nicht aus den Force-Sale-Erlösen gedeckten Rest-Principal absorbiert die Equity-Reserve über `coverLoss` — die nDEPS-Halter zahlen

**Cash-Bilanz pro Klon-Cycle (single-clone):**

```
−C·M  +  0,9·C·P  −  0,068·C·P  +  C·M  =  0,832 · C · P    Profit  (Markt M kürzt sich)
                                                            
System-Loss-Event ≈ 0,924 · C · P
```

Der Marktpreis `M` hebt sich exakt auf — der Profit kommt **nicht** aus einem Mispricing zwischen Position-Preis und Markt, sondern allein aus der Decay-Mechanik. **Jeder Position-Preis `P > 0` ist ausreichend.** Liquide oder illiquide Collaterals sind **gleich verwundbar**.

**Konkret in der analysierten TX:** Klon-Lifetime 36 Sekunden, 46 Stunden Wartezeit, Decay auf 6,8 % des Origin-Preises (85,29 dEURO/WFPS bei einem Position-Preis von 1 250 und einem WFPS-Marktpreis > 1 500), Loss von **4 623,86 dEURO** (netto 4 621,21 dEURO) an die Equity-Reserve. Der Angreifer hat den Vektor zudem als Doppel-Klon (`buyExpiredCollateral` + sofortiges `clone()` derselben Collateral) ausgeführt, was den Profit auf ~8 320 dEURO verdoppelt. Geplante Stage 2 mit zusätzlichem Drain revertete (`"WFPS not received"`).

**Was den Angriff *eigentlich* hätte stoppen müssen** und nicht funktioniert hat: konkurrierende Searcher, die den Force-Sale früher (bei höherem Decay-Preis) abgegriffen hätten. Der Indexer zeigt aber **null Searcher-Aktivität** auf dEURO-V3-Force-Sales — kein einziger Force-Sale in 10 Monaten Protokoll-Historie vor dieser TX, keine Challenges, keine Bots. Die Decay-Kurve durfte deshalb voll durchlaufen.

**Strukturell** sind **alle aktiven dEURO-V3-Positionen** demselben Vektor ausgesetzt, nicht nur WFPS:

| Sym | Offene Positionen | Total Principal | Theoretischer Max-Loss |
| --- | ---: | ---: | ---: |
| WFPS | 16 | 884 874 dEURO | ~817 624 dEURO |
| WBTC | 6 | 425 521 dEURO | ~393 281 dEURO |
| cbBTC | 1 | 4 000 dEURO | ~3 696 dEURO |
| kBTC | 1 | 4 000 dEURO | ~3 696 dEURO |
| WETH | 1 | 1 500 dEURO | ~1 386 dEURO |
| **Summe** | **25** | **1 319 895 dEURO** | **~1 219 683 dEURO** |

Die zusätzlichen Family-Caps (`availableForClones`) lassen den Angreifer-Hebel pro Familie **deutlich höher** ansetzen — z. B. 800 000 dEURO Headroom in der WFPS-Familie 0xB26Dc066, wovon der Angreifer in dieser TX nur 5 000 dEURO genutzt hat. Skaliert eine Wiederholung auf vollen Headroom, drohen sechs-stellige Single-Position-Verluste pro Cycle.

**Fix-Skizze:**

```solidity
// MintingHub.clone(): Mindest-Lifetime erzwingen
require(
    expiration >= block.timestamp + challengePeriod + cooldown + MIN_ECONOMIC_WINDOW,
    "ExpirationTooEarly"
);
```

Zusätzlich sinnvoll: **Floor in `expiredPurchasePrice`** (z. B. 30 % des Origin-Preises), damit der Decay nicht ins Bodenlose läuft, sowie **Re-Mint-Cooldown nach `buyExpiredCollateral`** und **Bootstrapping einer Searcher-Infrastruktur** (Forta-Bot oder protokoll-eigener Liquidator).

---

**Status:** Interne Sicherheitsanalyse
**Erstellt:** 26. April 2026 · zuletzt überarbeitet 26. April 2026
**Netzwerk:** Ethereum Mainnet
**Betroffenes Protokoll:** dEURO V3 — `MintingHubV3` / `Position` / `Equity`

| Metrik | Wert |
| --- | --- |
| Realisierter Schaden | **4 621,21 dEURO** (sozialisiert über die Equity-Reserve) |
| Beute Angreifer (real) | ~8 320 dEURO via Doppel-Klon (siehe §5.3) |
| Verhinderter Schaden | Stage 2 revertete (`"WFPS not received"`) |
| Aktive Folgeangriffe | **keine** — nur 1 Forced-Sale-Event in der gesamten V3-Historie |
| Offenes Folge-Risiko | Position `0x7EC6F1948...3392` mit 5 000 dEURO Principal, im Besitz des Angreifer-Contracts |
| Strukturelles Risiko | **alle Collaterals** — gesamte aktive Borrow-Exposition ~1,32 M dEURO Principal |
| Stand der Datenbasis | dEURO-Indexer `https://ponder.deuro.com/`, Etherscan, lokales `MintingHubV3`-Source |

## 1. Executive Summary

Am 25. April 2026 um 20:08:47 UTC (Block 24 959 311) wurde gegen eine künstlich kurzfristig abgelaufene dEURO-V3-Position ein zweistufiger Angriff geführt. **Stage 1** (eine `buyExpiredCollateral`-Operation kombiniert mit unmittelbarem `clone()` desselben Collaterals in eine neue Position) verlief erfolgreich und sozialisierte einen Verlust von **4 623,86 dEURO** (netto 4 621,21 dEURO) auf die Equity-Reserve. **Stage 2** — eine 14 Minuten später aufgerufene `attack(uint256)`-Funktion auf einem von Etherscan als "Attack" markierten Smart Contract — revertete mit der Fehlermeldung `"WFPS not received"`.

Die zentrale Designschwäche: **`MintingHub.clone()` validiert die `expiration` des Klons gegen die Eltern-Position, erzwingt aber keine Mindest-Lifetime.** Der Angreifer hat seine Klon-Position mit einer Lebensdauer von **36 Sekunden** angelegt, sie 46 Stunden lang verfallen lassen, und beim maximalen Decay den Forced-Sale-Pfad ausgelöst. Die Mechanik ist **kollateral-agnostisch** — sie funktioniert auf jeder Position mit beliebigem Origin-Preis, sofern niemand den Force-Sale früher abgreift.

Eine Bestandsaufnahme über den dEURO-Ponder-Indexer zeigt: **kein zweiter laufender Angriff**, keine neuen Klone seit der analysierten TX, alle Wallet-Cluster des Angreifers seit 25. April 2026 20:43 UTC inaktiv. Das **strukturelle Risiko** bleibt allerdings für **alle 25 aktiven dEURO-V3-Positionen** über alle Collaterals hinweg bestehen, bis `clone()` und die Force-Sale-Decay-Kurve gehärtet werden.

## 2. Eckdaten der beiden Transaktionen

### Stage 1 — Setup (Success)

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
| Gas Used | 1 059 372 / 1 513 388 |
| Fee | 0,002280 ETH (~$5,31) bei 2,15 Gwei |

### Stage 2 — Eigentlicher Angriff (Reverted)

| Feld | Wert |
| --- | --- |
| TX-Hash | `0x6c768cb15ee23f1583e92acc634699fd75571826111bb4eb24b1a41e9a345254` |
| Block | 24 959 382 (~14 min nach Stage 1) |
| Zeitpunkt | 25. Apr 2026, 20:22:59 UTC |
| Status | **Reverted — `"WFPS not received"`** |
| From | `0x3fe637cf3a0f8cFEc27Ab6adad97Bf56843A4823` |
| To | `0xf7FeF172D44DF28e430bAC013B8780762A0834E8` (Etherscan-Label: "Attack") |
| Method | `attack(uint256 _heroId)` — Selector `0x64dd891a` |
| Parameter | `_heroId = 0x11a4c464` |
| Gas Used | 218 383 |
| Fee | 0,000083 ETH |

## 3. Die eigentliche Schwachstelle: kurzlebige Klone und ungebremster Decay

### 3.1 Künstlich verkürzte Lebensdauer

Aus dem Indexer (`positionV2s`):

```
Old Position 0x15a91C214e7885C4c38A5A6500EAC68b9b4f8500
   created    = 1776980783  (2026-04-23 21:46:23 UTC)
   expiration = 1776980819  (2026-04-23 21:47:00 UTC)
   ──────────────────────────────────────────────────
   lifetime   = 36 Sekunden
```

`MintingHub.clone()` lässt einen neuen Klon mit beliebiger `expiration ≤ parent.expiration` zu. Der Angreifer hat:

1. eine bestehende Eltern-Position als Klon-Eltern gewählt (Family-Root `0xB26Dc066…1897D`, Eltern `0xFECFe3CE…0AF3`, deren Expiration 2027-08-07 ist)
2. den Klon mit Expiration **36 Sekunden** nach Creation eröffnet
3. die 5 000 dEURO Principal abgehoben (4 500 an den Owner, 500 als Reserve-Beitrag in die Equity)
4. die Position 46 Stunden lang verfallen lassen, sodass `expiredPurchasePrice` linear gegen 0 dekayte
5. beim Decay-Stand von ~6,8 % des Origin-Preises (= 85,29 dEURO/WFPS) den Forced Sale ausgelöst und die 4 WFPS für 341,17 dEURO zurückgekauft

### 3.2 Decay-Mechanik macht den Vektor kollateral-agnostisch

Der zweite, oft unterschätzte Pfeiler des Angriffs ist die **Decay-Kurve**: `expiredPurchasePrice(pos)` fällt nach Ablauf einer Position linear gegen 0. Ohne konkurrierende Searcher, die früher kaufen, durchläuft der Decay-Wert vollständig — der Angreifer kann den niedrigsten Punkt selbst wählen.

Die Profit-Formel zerlegt sich für ein einzelnes Klon-Cycle so:

```
Cash-Flow:
  − C · M               (Collateral am Markt kaufen)
  + (1 − r) · C · P     (Mint-Auszahlung an Caller, r = reservePPM ≈ 10 %)
  −  k · C · P          (Force-Sale-Buyback bei Decay-Faktor k ≈ 0,068)
  + C · M               (Collateral am Markt verkaufen)
  ─────────────────────────────
  = ((1 − r) − k) · C · P
  ≈ 0,832 · C · P       für r=0,1, k=0,068
```

`M` kürzt sich heraus. Der Profit hängt **nicht** vom Marktpreis des Collaterals ab — er ist eine reine Funktion von:

- `P` (Position-Preis, aus dem Eltern-Original geerbt)
- `r` (Reserve-PPM des Protokolls)
- `k` (Decay-Faktor zum Zeitpunkt des Buybacks; je länger gewartet, desto kleiner)

**Jede Position mit `P > 0` ist drainbar**, sofern der Decay durchlaufen darf.

### 3.3 Doppel-Klon verdoppelt die Beute pro Capital-Einheit

Der Angreifer hat den Vektor in der gleichen TX **zweifach** ausgeführt: nach dem Force-Sale-Buyback wurde die rückgewonnene Collateral sofort in eine neue Klon-Position (`0x7EC6F1948…`) gepledgt und ein zweiter Mint ausgelöst. Daraus ergibt sich:

- Cycle 1 (alte Position 0x15a91): +0,832 · C · P ≈ +4 160 dEURO
- Cycle 2 (neue Position 0x7EC6F1): +0,832 · C · P ≈ +4 160 dEURO
- ───────────────────────────────────
- **Summe: ~8 320 dEURO Profit**

Die 4 WFPS sind in der zweiten Position bis 2028-02-21 gefangen, können aber durch Repay (~4 500 dEURO) jederzeit ausgelöst werden, wobei die Collateral-Markt-Wert (~6 000 dEURO bei aktuellem WFPS-Markt) den Repay übersteigt — der Angreifer hat damit nichts verloren, sondern nur einen Teil seines Profits verzögert.

## 4. Akteure und Wallet-Cluster

### Cluster A — Owner der ursprünglichen Position

```
Tornado.Cash (1 ETH + mehrere 0,1 ETH-Tranchen vor ~2 Tagen)
   │
   ▼
0x6BD9e85ea5635e07822490914931afbd9f530d56  (EOA, 17 TXs in 2 Tagen)
   │ Holdings nach Tat: 0,85 ZCHF, 0,015 FPS, 2,35 ETH
   │ clone() der späteren Opfer-Position mit 36-Sekunden-Lifetime
   ▼
Position 0x15a91C214e7885C4c38A5A6500EAC68b9b4f8500
```

**Auffälligkeiten:**

- Wallet erst 2 Tage alt zur Tatzeit
- Funding direkt aus Tornado.Cash
- Frankencoin-/FPS-Bezug deutet auf Erfahrung mit dem Vorläufer-Protokoll hin
- Letzter Swap (Metamask Swap Router) 25. Apr 2026 23:19 UTC — danach silent

### Cluster B — Searcher / Stage-2-Operator

```
0xFd89cD1b...697244f61  (Funding-Source, eingehend 0,1 + 0,2 ETH)
   │
   ▼
0x3fe637cf3a0f8cFEc27Ab6adad97Bf56843A4823  (Operator-EOA, 11 TXs)
   ├─ deployt Smart Contract 0xf7FeF172...0834E8  (Etherscan-Label "Attack")
   ├─ Uniswap-V3-Swaps (ETH ↔ EURC)
   ├─ Approvals auf Circle EURC
   └─ ruft attack() auf 0xf7FeF172... → REVERTED

0x5Bb3BFCf4c3091d40e57FD3e3C91Bc56f6df35B5  (Burner-EOA, 17 h alt, 3 TXs)
   │ EIP-7702 → 0x4884d28F048E66A537762334937e01A044CbDFAc
   │ Stage-1-TX (analysiert) → SUCCESS
   │ 8,73 ETH IN, 10,79 ETH OUT (Sweep-Pattern)
```

**Auffälligkeiten:**

- Operator-EOA und Burner-EOA wurden beide kurz vor dem Angriff frisch finanziert
- EIP-7702-Delegate ist 275 Tage alt — wurde vor langer Zeit als Smart-Account-Implementierung deployt und für diesen Vorgang reaktiviert
- Kein Etherscan-Label am EIP-7702-Delegate, kein Source-Code verifiziert
- "Attack"-Contract enthält genau zwei Function-Selector: `0x64dd891a` (`attack`) und `0xd87d6d7c` (unbekannt)

### Verbindung zwischen den Clustern

Eine **direkte On-Chain-Verbindung** zwischen Cluster A (Position-Owner) und Cluster B (Stage-2-Operator) ließ sich nicht herstellen — beide laufen über Tornado.Cash bzw. nicht-zurückverfolgbare Funding-Quellen. Operatives Pattern (Wallet-Alter, Timing, kurze Position-Expiration, sofortiger Re-Mint) ist allerdings konsistent mit einer koordinierten Akteurs-Gruppe.

## 5. Detailanalyse Stage 1

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
| `0x5052D3Cc819f53116641e89b96Ff4cD1EE80B182` | WFPS (Wrapped FPS, liquider Markt > 1 500 dEURO/WFPS) |
| `0x8b3c41c649b9c7085c171cbb82337889b3604618` | MintingHubGateway (V3) |
| `0x15a91C214e7885C4c38A5A6500EAC68b9b4f8500` | **Opfer-Position (alt, 36-Sekunden-Lifetime)** |
| `0x7EC6F1948ACF8E1cA486cA77B1919345e19B3392` | **Neue Position (Folge-Risiko, im Besitz des Attack-Contracts)** |

### 5.2 Aktionssequenz innerhalb der Stage-1-TX

1. **Liquiditäts-Setup** über DEXes
   - Uniswap V3 (USDC/WETH 0,05 %): `0,0846 WETH → 195,43 USDC`
   - Uniswap V4 PoolManager: Multi-Hop-Swaps via Unlock-Callback
   - Balancer Vault: `0,1756 WETH` Eingang (Swap-/Flash-Leg)
   - EURC-Routing: 4 500 EURC über mehrere Pfade als EUR-Stable-Leg
2. **Forced Sale** auf der abgelaufenen Position `0x15a91...8500`
   - Aufruf `MintingHubGateway.buyExpiredCollateral(pos, 4 · 1e18)` → intern `pos.forceSale(buyer, 4e18, costs)` (`MintingHub.sol:533`)
   - Forced-Sale-Preis (`expiredPurchasePrice`): **85,2932 dEURO/WFPS** (~6,8 % des Origin-Preises von 1 250 dEURO/WFPS)
   - Käufer zahlt **~341,17 dEURO**, erhält 4 WFPS
   - Event `Loss(reportingMinter=0x15a91..., amount=4 623,86 dEURO)` → Equity-Reserve absorbiert die Differenz zwischen Restschuld und Erlös
   - Event `Profit(reportingMinter=0x15a91..., amount=2,65 dEURO)` → realisierte Zinsen
   - Event `MintingUpdate(collateral=0, price=1 250, principal=0)` auf alter Position
3. **Sofortiges Re-Mint** mit denselben 4 WFPS (Cycle 2)
   - Aufruf `MintingHub.clone(parent=0x15a91…, _initialCollateral=4e18, _initialMint=5 000e18, expiration=…)`
   - Neue Position `0x7EC6F1948…3392` erstellt (Minimal Proxy auf Position-Impl `0xb630d29e…79e4`)
   - Owner gesetzt auf `0xf7FeF172…0834E8` (Attack-Contract) — **nicht** der TX-Sender
   - `MintingUpdate(collateral=4e18, price=1 250e18, principal=5 000e18)` auf neuer Position
   - Reserve-Beitrag 500 dEURO → Equity (`0xc71104001A…E8eE6`)
   - Expiration der neuen Position: `2028-02-21` (~22 Monate Laufzeit, normal-langer Klon — geplant für Stage-2-Hebel)

### 5.3 Ökonomische Bilanz Stage 1

```
Cycle 1 — alte Position 0x15a91 (Apr 23 → Apr 25):
   Apr 23  −6 000 dEURO   (4 WFPS am Markt zu ~1 500 gekauft)
   Apr 23  +4 500 dEURO   (Mint-Auszahlung aus erstem Klon)
   Apr 25  −  341 dEURO   (Force-Sale-Buyback bei 6,8 % Decay)
   Apr 25  +6 000 dEURO   (4 WFPS am Markt verkauft, würde der Single-Klon hier enden)
   ────────────────────────
   Cycle-1-Profit:  +4 159 dEURO   (= 0,832 · 4 · 1 250)

Cycle 2 — neue Position 0x7EC6F1 (Apr 25, in derselben TX):
   Apr 25  −6 000 dEURO   (4 WFPS am Markt — entspricht "nicht verkaufen aus Cycle 1")
   Apr 25  +4 500 dEURO   (Mint-Auszahlung aus zweitem Klon)
   später  +1 500 dEURO   (Erlös beim Repay: 4 WFPS Marktwert 6 000 minus 4 500 Repay)
   ────────────────────────
   Cycle-2-Profit (theoretisch):  ~0 wenn Repay nie erfolgt; +1 500 wenn Repay
                                  Ohne Repay: 4 500 sofort, 4 WFPS Marktwert 6 000 gefangen

Kombiniert (was in der TX passiert ist):
   Cash sofort:  −6 000 + 4 500 − 341 + 4 500 = +2 659 dEURO
   Cash plus 4 WFPS (Markt 6 000) gefangen in 0x7EC6F1 → realisierbar bei Repay 4 500 = +1 500
   Summe:  ~+8 320 dEURO  (nahe an 2 · 0,832 · 4 · 1 250)

Schaden für dEURO-System:
   Loss-Event auf 0x15a91:        4 623,86 dEURO
   Profit-Event (Zinsen):       −     2,65 dEURO
   ─────────────────────────────────────────
   Netto-Reserve-Hit:             ~ 4 621,21 dEURO

   Plus: 0x7EC6F1 trägt latent ein gleich großes Loss-Risiko bei späterer Expiration ohne Challenge.
```

## 6. Detailanalyse Stage 2 — gescheiterter `attack()`-Aufruf

14 Minuten nach dem Setup ruft der Operator `0x3fe637cf...A4823` die Funktion `attack(uint256 _heroId)` auf dem zuvor deployten "Attack"-Contract `0xf7FeF172...0834E8` auf. Der Aufruf revertet mit:

```
WFPS not received
```

Der Bytecode des Attack-Contracts ist nicht verifiziert. Erkennbare Function-Selector:

- `0x64dd891a` → `attack(uint256)` (verwendet)
- `0xd87d6d7c` → unbekannt (möglicherweise Recovery- oder Owner-Funktion)

Die Fehlermeldung `"WFPS not received"` deutet auf einen **Pre-/Post-Balance-Check** im Attack-Contract: er erwartete, in dieser Transaktion 4 WFPS (oder mehr) zu erhalten, das geschah aber nicht. Mögliche Hypothesen für die intendierte Schadenseskalation:

- **Re-Entrancy auf `Position`**: ein verschachtelter Aufruf während `forceSale` oder `clone()`, der ein zweites Mal Collateral ziehen sollte — durch einen `nonReentrant`-Modifier oder eine Balance-Check-Prüfung blockiert
- **Doppelter Forced Sale auf neue Position**: Versuch, die soeben erzeugte Position selbst über `buyExpiredCollateral` zu drainen — schlägt fehl, weil die neue Position nicht expired ist
- **Callback-Manipulation auf Uniswap V4 Unlock**: Versuch, im Hook-Callback WFPS aus dem PoolManager zu extrahieren — schlägt fehl, weil PoolManager nur die ausgehandelten Token freigibt
- **Geplante Flash-Loan-Verstärkung**: der Contract könnte einen Balancer-Flash-Loan auf eine größere FPS/WFPS-Menge angefordert haben, um eine 10–100× größere Klon-Position zu öffnen — Flash-Loan-Callback funktionierte nicht wie erwartet

Ohne Reverse-Engineering des Bytecodes lässt sich der intendierte Vektor nicht abschließend bestimmen. **Empfohlen:** Disassembly und statische Analyse des Bytecodes von `0xf7FeF172...0834E8` und `0x4884d28F048E66A537762334937e01A044CbDFAc`.

## 7. Code-Verifikation: Eltern-Position ist vollständig isoliert

Die `clone()`-Architektur in `MintingHubV3` ist explizit als Risiko-Isolation zwischen Eltern und Klon konzipiert. Die Code-Lese-Verifikation bestätigt: der Eltern-Position-Inhaber, dessen Position geklont wurde, erleidet **keinen direkten Schaden** und auch keinen indirekten Schaden auf Position-Ebene.

### 7.1 Loss-Cover-Pfad in `forceSale`

`Position.sol:682-690`:

```solidity
if (remainingCollateral == 0 && principal + interest > 0) {
    assert(proceeds == 0);
    deuro.coverLoss(address(this), principal + interest);   // Equity-Reserve deckt Differenz
    if (interest > 0) {
        deuro.collectProfits(address(this), interest);
        _notifyInterestPaid(interest);
    }
    deuro.burnWithoutReserve(principal, reserveContribution);
    _notifyRepaid(principal);                                // VOLLER Principal an Eltern
}
```

`_notifyRepaid(principal)` wird mit dem **kompletten** Restprincipal aufgerufen, inklusive des Loss-gedeckten Teils — nicht nur mit dem aus den Forced-Sale-Erlösen tatsächlich repayten Anteil.

### 7.2 Wirkung beim Eltern-Vertrag

`Position.sol:248-251`:

```solidity
function notifyRepaid(uint256 repaid_) external {
    if (deuro.getPositionParent(msg.sender) != hub) revert NotHub();
    totalMinted -= repaid_;
}
```

Der `totalMinted`-Zähler des Eltern-Originals wird also um den vollen Klon-Principal **dekrementiert**. Damit ist auch `availableForMinting()` voll wiederhergestellt:

`Position.sol:273-279`:

```solidity
function availableForMinting() public view returns (uint256) {
    if (address(this) == original) {
        return limit - totalMinted;
    } else {
        return Position(original).availableForClones();
    }
}
```

→ Nach Abschluss des `coverLoss`-Pfads ist die Eltern-Mint-Kapazität numerisch **identisch** zu vor dem Klon. Kein Verlust an Borrowing-Headroom.

### 7.3 Bilanz für den Eltern-Position-Halter

| Aspekt | Effekt |
| --- | --- |
| Eigenes Collateral | unverändert |
| Eigener Principal/Debt | unverändert |
| Eigener Owner | unverändert |
| `totalMinted` / Mint-Kapazität | **vollständig restauriert** durch `_notifyRepaid(principal)` |
| Eigene `price` / Risiko-Parameter | unverändert |

**Direkter und indirekter monetärer Schaden auf Position-Ebene: null.** Einzige Träger des realisierten Verlustes sind die nDEPS-Halter über die Equity-Reserve.

## 8. Aktueller Status — keine weiteren Angriffe aktiv

Bestandsaufnahme über den dEURO-Indexer (`https://ponder.deuro.com/`, abgerufen 26. April 2026):

| Indikator | Befund |
| --- | --- |
| `forcedSales` (gesamte V3-Historie) | **genau 1 Eintrag** — die analysierte TX |
| `positionV2s` (gesamte V3-Historie) | letzte Position erstellt 25. Apr 2026 20:08 (Angreifer-Position 0x7EC6F1) — **keine neuen seither** |
| `mintingUpdateV2s` (letzte 30 State-Änderungen) | **keine Änderung nach 25. Apr 2026 20:08:47 UTC** |
| `challengeV2s` (alle Challenges) | 12 Stück, alle aus Juni 2025 — **keine seit 10 Monaten** |
| Operator-EOA `0x3fe637cf...4823` | letzte TX 25. Apr 2026 20:43 UTC — **silent** |
| Burner-EOA `0x5Bb3...35B5` | letzte TX 25. Apr 2026 — **silent** |
| Attack-Contract `0xf7FeF...4E8` | nur 1 TX (gescheiterter Angriff) — **silent** |

→ Es läuft aktuell **kein zweiter Angriff**. Keine neuen verdächtigen Positionen, keine neuen Klone mit kurzer Expiration, kein neues Attack-Contract sichtbar.

## 9. Strukturelle Exposition — alle Collaterals

Das strukturelle Risiko ist **kollateral-agnostisch**. Aggregat aus dem Indexer:

```
WFPS    16 offene Positionen   884 874 dEURO Principal   (P=1 250)
WBTC     6 offene Positionen   425 521 dEURO Principal   (P≈48 600)
cbBTC    1 offene Position       4 000 dEURO Principal   (P≈400 000)
kBTC     1 offene Position       4 000 dEURO Principal   (P≈400 000)
WETH     1 offene Position       1 500 dEURO Principal   (P=1 000)
─────────────────────────────────────────────────────────────────
Gesamt: 25 offene Positionen   1 319 895 dEURO Principal
        Theoretischer max. Single-Cycle-Loss:  ~1 219 683 dEURO
```

Zusätzlich sind die **Family-Caps** (`availableForClones`) erheblich größer als die aktuell genutzten Principals. Auswahl der bekannten Caps aus dem Indexer:

| Family-Root | Sym | `availableForClones` | Theoretischer Max-Drain pro Cycle |
| --- | --- | ---: | ---: |
| `0xB26Dc066…1897D` | WFPS | 800 000 dEURO | ~739 200 dEURO |
| `0xB630D29e…79E4` | WFPS | 100 000 dEURO | ~92 400 dEURO |
| `0xD79c9989…1f11` | WFPS | 800 000 dEURO | ~739 200 dEURO |

Der Angreifer in dieser TX hat aus 800 000 dEURO Family-Headroom nur 5 000 dEURO genutzt — knapp 0,6 %. Bei einer Wiederholung mit ausreichend Capital ließen sich pro Cycle sechsstellige Single-Position-Verluste erzwingen.

**Jede dieser Familien** ist als Eltern für einen kurzlebigen Klon nutzbar — genauso die WBTC-, cbBTC-, kBTC-, WETH-Familien, sofern der Angreifer das Collateral aufbringt.

## 10. Strukturelle Schwachstellen

### 10.1 Fehlende Mindest-Lifetime in `clone()`

`MintingHub.sol:clone()` validiert die Klon-Expiration nur als `≤ parent.expiration`. **Es gibt keine Mindest-Lifetime-Prüfung.** Damit ist ein Klon mit beliebig kurzer Lebensdauer (im Extremfall 0 Sekunden) erlaubt — exakt der Vektor, den dieser Angriff genutzt hat. **Dies ist die eine zentrale Schwäche, deren Fix den Angriffsvektor vollständig schließt.**

### 10.2 Aggressiver `expiredPurchasePrice`-Decay ohne Floor

`MintingHub.sol:472` lässt den Forced-Sale-Preis nach Ablauf einer Position linear gegen 0 verfallen. In einem **funktionierenden** Searcher-Markt wäre der Decay self-limiting: sobald der Preis unter den Marktwert fällt, kauft ein arbitragierender Searcher sofort, der Decay hört auf. Da auf dEURO V3 aber keine Searcher aktiv sind (siehe §10.3), läuft der Decay vollständig durch. Ein **expliziter Floor** im Vertrag würde diese Annahme nicht mehr brauchen.

### 10.3 Fehlende Searcher-Infrastruktur

Empirisch dokumentiert über den Indexer: **null Force-Sales** im 10-Monats-Zeitraum vor diesem Vorfall, **null Challenges** seit Juni 2025, keine bekannten Forta-/MEV-Bots mit dEURO-V3-Subscription. Das Protokoll geht implizit davon aus, dass profitsuchende Searcher den Force-Sale-Pfad effizient bedienen — diese Annahme ist nicht getestet und de facto verletzt.

### 10.4 Owner-Mismatch ohne Whitelist im Clone-Pfad

`clone()` erlaubt dem Aufrufer, einen beliebigen `owner` für die neue Position zu setzen. In dieser TX wurde der Owner auf den "Attack"-Contract gesetzt, während der Aufruf von einem EIP-7702-delegierten EOA ausgeht. Damit kann ein Operator mehrere Positionen über separate Owner-Contracts orchestrieren und Forensik / Sanktionsmaßnahmen erschweren.

## 11. Offenes Folge-Risiko: Position `0x7EC6F1948ACF8E1cA486cA77B1919345e19B3392`

Diese in Stage 1 erzeugte Position ist nach wie vor aktiv:

- **Owner:** `0xf7FeF172D44DF28e430bAC013B8780762A0834E8` (Attack-Contract, unverifiziert)
- **Collateral:** 4 WFPS (Marktwert ~6 000 dEURO bei aktuellem WFPS-Markt > 1 500)
- **Price:** 1 250 dEURO/WFPS
- **Principal:** 5 000 dEURO
- **Expiration:** 2028-02-21

Bei Ablauf in 2028 droht ein erneuter Loss von bis zu ~4 620 dEURO an die Equity-Reserve, sofern wieder kein Searcher den Force-Sale früher abgreift. Da der Owner ein Smart Contract ohne bekannte Repay-/Withdraw-Schnittstelle ist, ist es plausibel, dass die Position bis zum Ablauf weder repaid noch verwaltet wird.

**Sofortige Maßnahme:** Challenge gegen die Position einreichen, solange sie nicht expired ist. Reward bei erfolgreicher Challenge: 2 % von 5 000 dEURO = 100 dEURO. Effekt: Forced-Sale-Pfad wird durch `noChallenge`-Modifier blockiert und der Origin-Preis wird durch Auktion korrigiert.

## 12. Empfehlungen — priorisiert

### 🔴 Sofort (heute / morgen)

1. **Position `0x7EC6F1948ACF8E1cA486cA77B1919345e19B3392` herausfordern** (`MintingHubGateway.challenge`). Schließt das einzige aktive Folge-Risiko. Reward 100 dEURO.
2. **Wallet-Watchlist aktivieren** für `0x6BD9e85e...d56`, `0x3fe637cf...4823`, `0xf7FeF172...4E8`, `0x5Bb3BFCf...5B5`, `0x4884d28F...DFAc`, `0xFd89cD1b...4f61` — Alarmierung bei jeder erneuten Aktivität.
3. **Monitoring auf neue Klon-Positionen** mit `expiration − created < threshold` aktivieren (Forta-Bot oder Ponder-Hook). Heute ist der Indikator manuell leicht zu spotten.

### 🟡 Kurzfristig (Tage)

4. **Patch in `MintingHub.clone()`**: Mindest-Lifetime erzwingen, z. B. `expiration ≥ block.timestamp + challengePeriod + cooldown + min_economic_window`. Verhindert die Quasi-Sofort-Expiration-Trickserei. **Dieser eine Patch schließt den Hauptvektor für alle Collaterals.**
5. **`expiredPurchasePrice`-Floor** einführen, z. B. 30 % des Origin-Preises. Bei fehlender Searcher-Konkurrenz begrenzt das den maximalen Equity-Hit pro Cycle auf ~70 % des Principals.
6. **Re-Mint-Cooldown nach Forced Sale**: nach erfolgreichem `buyExpiredCollateral` für `clone()` mit derselben Collateral-Adresse einen Cooldown einführen (z. B. 24 h). Verhindert den Doppel-Klon-Profit-Verstärker.
7. **Bytecode-Reverse-Engineering** von `0xf7FeF172...0834E8` und `0x4884d28F048E66A537762334937e01A044CbDFAc` — verstehen, was Stage 2 erreichen wollte und ob ein bisher nicht erkannter Vektor im Spiel ist.

### 🟢 Mittelfristig

8. **Searcher-Anreize aktivieren**: protokoll-betriebener Liquidator oder offizielles Bug-Bounty/Liquidator-Programm, das Force-Sales effizient abgreift. Solange kein Markt-Searcher existiert, muss das Protokoll selbst den Decay-Pfad verteidigen.
9. **Owner-Validierung im Clone-Pfad**: optionaler Modus, in dem `clone()` den Owner nicht frei wählen lässt, sondern auf `msg.sender` zwingt — reduziert Misuse durch wegwerfbare Smart-Contract-Owner und Forensik-Hindernisse.
10. **Challenge-Reward für illiquide Collaterals erhöhen**: Bestand-Schutz parallel zum Mindest-Lifetime-Patch. Bei erhöhtem Reward könnten Bestandspositionen, die aus historischen Klonen mit fragwürdigen Parametern stammen, leichter herausgefordert werden.

### 🔵 Forensik / Disclosure

11. **CEX-/Aggregator-Counterparties** der Funding-Wallets prüfen, Tornado-Cash-Deposit-Tickets clustern, Sanktions-Listen abgleichen.
12. **Disclosure**: falls die Bytecode-Analyse einen weiteren, noch nicht gefixten Vektor enthüllt, koordinierte Disclosure und Hotfix.
13. **Post-Mortem für nDEPS-Holder**: transparente Kommunikation des realisierten Verlustes (4 621 dEURO) und der eingeleiteten Gegenmaßnahmen.

## 13. Zeitleiste

| Zeitpunkt | Ereignis |
| --- | --- |
| ~23. April 2026 | Cluster-A-EOA `0x6BD9e85e...d56` erhält Funds aus Tornado.Cash |
| 23. April 2026, 21:37 UTC | Cluster A `Invest`-Aufruf auf Frankencoin-Equity, anschließend FPS-Wrap → 4 WFPS |
| 23. April 2026, 21:46:23 UTC | Original-Position `0x15a91...8500` per `clone()` eröffnet, 5 000 dEURO Principal, 4 WFPS Collateral, **Expiration 21:47:00 UTC** (36 s Lifetime) |
| 23. April 2026, ab 21:47 UTC | Position expired, `expiredPurchasePrice`-Decay läuft |
| 25. April 2026, 19:58 + 20:05 UTC | Cluster-B-EOA `0x3fe637cf...4823` erhält 0,2 + 0,1 ETH von `0xFd89cD1b...4f61` |
| 25. April 2026, 20:08:35 UTC | Cluster-B deployt Attack-Contract `0xf7FeF172...4E8` |
| 25. April 2026, 20:08:47 UTC | **Stage-1-TX** `0x1accee7d...` — ForcedSale + clone() (SUCCESS), Loss 4 623,86 dEURO |
| 25. April 2026, 20:22:59 UTC | **Stage-2-TX** `0x6c768cb1...` — `attack()` (REVERTED, "WFPS not received") |
| 25. April 2026, 20:43 UTC | Letzte Aktivität in Cluster B (Sweep) — danach silent |
| 25. April 2026, 23:19 UTC | Letzte Aktivität in Cluster A (Metamask Swap) — danach silent |
| 26. April 2026 | Forensische Analyse erstellt; Indexer bestätigt keine weiteren Angriffe; neue Position weiterhin aktiv |

## 14. Referenzen

### Transaktionen

- Stage-1-TX: <https://etherscan.io/tx/0x1accee7db2b18f5d6ae12992807590e2fddfd7a3b4ccb2abc365c46a44b9a158>
- Stage-2-TX (reverted): <https://etherscan.io/tx/0x6c768cb15ee23f1583e92acc634699fd75571826111bb4eb24b1a41e9a345254>
- Original-Position-Erstellung: <https://etherscan.io/tx/0x2402369ee10ee3b1c4c780b663c84e3649ed131b98614434ea4f5d13283247e0>

### Adressen

- Attack-Contract: <https://etherscan.io/address/0xf7FeF172D44DF28e430bAC013B8780762A0834E8>
- EIP-7702-Delegate: <https://etherscan.io/address/0x4884d28F048E66A537762334937e01A044CbDFAc>
- Operator-EOA: <https://etherscan.io/address/0x3fe637cf3a0f8cFEc27Ab6adad97Bf56843A4823>
- Burner-EOA: <https://etherscan.io/address/0x5Bb3BFCf4c3091d40e57FD3e3C91Bc56f6df35B5>
- Original-Position-Owner (Tornado-funded): <https://etherscan.io/address/0x6BD9e85ea5635e07822490914931afbd9f530d56>
- Opfer-Position (alt, 36 s Lifetime): <https://etherscan.io/address/0x15a91C214e7885C4c38A5A6500EAC68b9b4f8500>
- Folge-Position (offen, Challenge empfohlen): <https://etherscan.io/address/0x7EC6F1948ACF8E1cA486cA77B1919345e19B3392>
- MintingHubGateway: <https://etherscan.io/address/0x8b3c41c649b9c7085c171cbb82337889b3604618>

### Datenquellen

- dEURO-Indexer: <https://ponder.deuro.com/>
- Indexer-Schemata genutzt: `forcedSales`, `positionV2s`, `mintingUpdateV2s`, `challengeV2s`

### Quellcode

- `contracts/MintingHubV3/MintingHub.sol` — Funktionen `buyExpiredCollateral`, `expiredPurchasePrice`, `clone`, Konstanten `CHALLENGER_REWARD`, `OPENING_FEE`
- `contracts/MintingHubV3/Position.sol` — Funktionen `forceSale` (Z. 664-697), `_notifyRepaid` (Z. 631-635), `notifyRepaid` (Z. 248-251), `availableForMinting` (Z. 273-279), Modifier `expired`, `noChallenge`
- `contracts/Equity.sol` — Loss-/Profit-Verbuchung an Equity-Reserve, `coverLoss` / `collectProfits`

## Anhang A — Korrigierte Annahmen gegenüber früheren Versionen

Frühere Versionen dieser Analyse argumentierten, der Angriff sei eine **Mispricing-Ausnutzung** auf einem **illiquiden** Collateral-Token. Faktenbasis:

- **WFPS ist liquide** mit einem Marktpreis > 1 500 dEURO/WFPS
- Der Position-Preis von 1 250 dEURO/WFPS liegt **unter** Markt (~83 % LTV) — eine **konservative**, nicht überhöhte Bewertung
- Damit kann der Profit nicht aus einem `P > M`-Spread stammen — die Cash-Bilanz zeigt: `M` kürzt sich heraus

Die korrigierte Erkenntnis: der Angriffsvektor ist **kollateral-agnostisch** und betrifft **alle** dEURO-V3-Positionen gleichermaßen. WBTC, WETH, cbBTC, kBTC und alle künftigen Collaterals sind im selben Maß verwundbar wie WFPS. Die einzigen Faktoren, die WFPS in dieser TX zum Ziel gemacht haben, sind operativer Natur (kleinere Capital-Anforderung, geringere Beobachtungsdichte, vermutete Stage-2-Spezifik). Der zentrale Patch (Mindest-Lifetime in `clone()`) schließt deshalb auch den Vektor für alle anderen Collaterals.
