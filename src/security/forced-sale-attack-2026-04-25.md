# Forensische Analyse: Forced-Sale-Angriff auf MintingHubV3 vom 25. April 2026

## TL;DR — Der Bug

**`MintingHub.clone()` erzwingt keine Mindest-Lebensdauer für Klon-Positionen.** Der Aufrufer darf jede `expiration ≤ parent.expiration` setzen — auch eine, die den Klon nach Sekunden ablaufen lässt. Damit lässt sich der Forced-Sale-Pfad zweckentfremden:

1. Klone eine bestehende Eltern-Position auf einem illiquiden, mispricten Collateral
2. Setze die Klon-Expiration auf wenige Sekunden nach Creation
3. Hebe den vollen Principal als dEURO ab (`_initialMint`)
4. Warte, bis der `expiredPurchasePrice` linear gegen 0 dekayt
5. Kaufe deine eigene Collateral via `MintingHubGateway.buyExpiredCollateral` für einen Bruchteil des Origin-Preises zurück
6. Den nicht aus den Erlösen gedeckten Rest-Principal absorbiert die Equity-Reserve über `coverLoss` — die nDEPS-Halter zahlen

**Konkret in dieser TX:** Klon-Lifetime 36 Sekunden, 46 Stunden Wartezeit, Decay auf 6,8 % des Origin-Preises (85,29 dEURO/WFPS statt 1 250), Loss von **4 623,86 dEURO** (netto 4 621,21 dEURO) an die Equity-Reserve. Geplante Stage 2 mit zusätzlichem Drain revertete (`"WFPS not received"`).

**Strukturell** sind 16 offene WFPS-Positionen mit zusammen **884 873,66 dEURO Principal** demselben Vektor ausgesetzt, weil jede von ihnen als Eltern für einen kurzlebigen Klon dienen kann. Aktuell läuft kein zweiter Angriff — das Wallet-Cluster ist seit 25. April 2026 20:43 UTC inaktiv —, aber der Vektor steht offen, bis `clone()` gehärtet wird.

**Fix-Skizze:**

```solidity
// MintingHub.clone(): Mindest-Lifetime erzwingen
require(
    expiration >= block.timestamp + challengePeriod + cooldown + MIN_ECONOMIC_WINDOW,
    "ExpirationTooEarly"
);
```

Zusätzlich sinnvoll: Floor in `expiredPurchasePrice` (z. B. 30 % des Origin-Preises) und Re-Mint-Cooldown nach `buyExpiredCollateral`.

---

**Status:** Interne Sicherheitsanalyse
**Erstellt:** 26. April 2026 · überarbeitet 26. April 2026
**Netzwerk:** Ethereum Mainnet
**Betroffenes Protokoll:** dEURO V3 — `MintingHubV3` / `Position` / `Equity`

| Metrik | Wert |
| --- | --- |
| Realisierter Schaden | **4 621,21 dEURO** (sozialisiert über die Equity-Reserve) |
| Verhinderter Schaden | Stage 2 revertete (`"WFPS not received"`) |
| Aktive Folgeangriffe | **keine** — nur 1 Forced-Sale-Event in der gesamten V3-Historie |
| Offenes Folge-Risiko | Position `0x7EC6F1948...3392` mit 5 000 dEURO Principal, im Besitz des Angreifer-Contracts |
| Strukturelle WFPS-Exposition | 884 873,66 dEURO über 16 offene Positionen, alle bei Preis 1 250 dEURO/WFPS |
| Stand der Datenbasis | dEURO-Indexer `https://ponder.deuro.com/`, Etherscan, lokales `MintingHubV3`-Source |

## 1. Executive Summary

Am 25. April 2026 um 20:08:47 UTC (Block 24 959 311) wurde gegen eine künstlich kurzfristig abgelaufene dEURO-V3-Position auf dem illiquiden Collateral-Token WFPS ein zweistufiger Angriff geführt. **Stage 1** (eine `buyExpiredCollateral`-Operation kombiniert mit unmittelbarem `clone()` desselben Collaterals in eine neue Position) verlief erfolgreich und sozialisierte einen Verlust von **4 623,86 dEURO** (abzgl. 2,65 dEURO Profit-Event = netto 4 621,21 dEURO) auf die Equity-Reserve. **Stage 2** — eine 14 Minuten später aufgerufene `attack(uint256)`-Funktion auf einem von Etherscan als "Attack" markierten Smart Contract — revertete mit der Fehlermeldung `"WFPS not received"`.

Die zentrale, bisher nicht öffentlich kommunizierte Designschwäche: **`MintingHub.clone()` validiert die `expiration` des Klons gegen die Eltern-Position, erzwingt aber keine Mindest-Lifetime.** Der Angreifer hat seine Klon-Position mit einer Lebensdauer von **36 Sekunden** angelegt, sie 46 Stunden lang verfallen lassen, und beim maximalen Decay den Forced-Sale-Pfad ausgelöst.

Eine Bestandsaufnahme über den dEURO-Ponder-Indexer zeigt: **kein zweiter laufender Angriff**, keine neuen Klone seit der analysierten TX, alle Wallet-Cluster des Angreifers seit 25. April 2026 20:43 UTC inaktiv. Das **strukturelle Risiko** bleibt allerdings bestehen: 16 offene WFPS-Positionen mit zusammen 884 873,66 dEURO Principal sind alle gegen denselben Vektor exponiert, sobald jemand sie als Eltern für einen kurzlebigen Klon nutzt.

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

## 3. Die eigentliche Schwachstelle: kurzlebige Klone

Aus dem Indexer (`positionV2s`):

```
Old Position 0x15a91C214e7885C4c38A5A6500EAC68b9b4f8500
   created    = 1776980783  (2026-04-23 21:46:23 UTC)
   expiration = 1776980819  (2026-04-23 21:47:00 UTC)
   ──────────────────────────────────────────────────
   lifetime   = 36 Sekunden
```

`MintingHub.clone()` lässt einen neuen Klon mit beliebiger `expiration ≤ parent.expiration` zu. Der Angreifer hat:

1. eine bestehende WFPS-Eltern-Position (Family-Root `0xB26Dc06660…1897D`, Eltern `0xFECFe3CE…0AF3`, deren Expiration 2027-08-07 ist) als Klon-Eltern gewählt
2. den Klon mit Expiration **36 Sekunden** nach Creation eröffnet
3. die 5 000 dEURO Principal abgehoben (4 500 an den Owner, 500 Opening-Fee an Treasury)
4. die Position 46 Stunden lang verfallen lassen, sodass `expiredPurchasePrice` linear gegen 0 dekayte
5. beim Decay-Stand von ~6,8 % des Origin-Preises (= 85,29 dEURO/WFPS) den Forced Sale ausgelöst und die 4 WFPS für 341,17 dEURO zurückgekauft

Damit sind in einem einzigen Atomic-Block zwei Effekte erreicht:

- der ursprüngliche Borrow von 4 500 dEURO ist quasi geschenkt (nur 341 dEURO repay, Rest = Loss an Equity)
- die zurückgekaufte Collateral lässt sich sofort in eine neue Position re-collateralisieren

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
| `0x5052D3Cc819f53116641e89b96Ff4cD1EE80B182` | WFPS (Wrapped FPS) |
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
3. **Sofortiges Re-Mint** mit denselben 4 WFPS
   - Aufruf `MintingHub.clone(parent=0x15a91…, _initialCollateral=4e18, _initialMint=5 000e18, expiration=…)`
   - Neue Position `0x7EC6F1948…3392` erstellt (Minimal Proxy auf Position-Impl `0xb630d29e…79e4`)
   - Owner gesetzt auf `0xf7FeF172…0834E8` (Attack-Contract) — **nicht** der TX-Sender
   - `MintingUpdate(collateral=4e18, price=1 250e18, principal=5 000e18)` auf neuer Position
   - Opening-Fee 500 dEURO → Treasury `0xc71104001A3CCDA1BEf1177d765831Bd1bfE8eE6`
   - Expiration der neuen Position: `2028-02-21` (~22 Monate Laufzeit, normal-langer Klon)

### 5.3 Ökonomische Bilanz Stage 1

```
Käufe / Ausgaben (Angreifer):
   Forced-Sale-Kaufpreis        ~  341 dEURO
   Opening-Fee neue Position    +  500 dEURO  (an Treasury)
   Gas + DEX-Slippage           ~ < 10 dEURO

Einnahmen (Angreifer):
   Frische dEURO-Mint           ~ 4 000-4 500 dEURO  (5 000 minus Reserve-Anteil)
   4 WFPS in neuer Position     = besichert mit 5 000 dEURO Oracle-Wert (für den Angreifer-Contract)

Bruttoarbitrage Stage 1:        ~ 3 600 dEURO  (vor weiteren Hedging-Kosten)

Schaden für dEURO-System:
   Loss-Event                   = 4 623,86 dEURO  (Equity-Reserve)
   Profit-Event                 =     2,65 dEURO  (Zinsen)
   ───────────────────────────────────────────
   Netto-Reserve-Hit            ≈ 4 621,21 dEURO
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

- **Re-Entrancy auf `Position`**: ein verschachtelter Aufruf während `forceSale` oder `clone()`, der ein zweites Mal Collateral ziehen sollte — durch einen `nonReentrant`-Modifier oder eine balance-basierte Prüfung blockiert
- **Doppelter Forced Sale auf neue Position**: Versuch, die soeben erzeugte Position selbst über `buyExpiredCollateral` zu drainen — schlägt fehl, weil die neue Position nicht expired ist
- **Callback-Manipulation auf Uniswap V4 Unlock**: Versuch, im Hook-Callback WFPS aus dem PoolManager zu extrahieren — schlägt fehl, weil PoolManager nur die ausgehandelten Token freigibt

Ohne Reverse-Engineering des Bytecodes lässt sich der intendierte Vektor nicht abschließend bestimmen. **Empfohlen:** Disassembly und statische Analyse des Bytecodes von `0xf7FeF172...0834E8` und `0x4884d28F048E66A537762334937e01A044CbDFAc`.

## 7. Code-Verifikation: Eltern-Position ist vollständig isoliert

Die `clone()`-Architektur in `MintingHubV3` ist explizit als Risiko-Isolation zwischen Eltern und Klon konzipiert. Die Code-Lese-Verifikation bestätigt:

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

## 9. Strukturelle Exposition — WFPS-Familie

Trotz aktueller Ruhe bleibt die strukturelle Schwachstelle bestehen. Aggregat aus dem Indexer:

```
WFPS-Familie  Eltern 0xB26Dc066… (owner 0xf285C13d, exp 2027-08-07)
              12 offene Klone → Gesamt-Principal:    685.234 dEURO
WFPS-Familie  Eltern 0xB630D29e… (owner 0xa360B346, exp 2028-02-21)
              3 offene Positionen → Gesamt-Principal: 90.620 dEURO
              davon: 0x7EC6F1948 = Angreifer-Folge-Position (5.000 dEURO)
WFPS-Familie  Eltern 0xD79c9989… (clone-of-clone-Linie)
              1 offene Position (100.000 dEURO Principal)
─────────────────────────────────────────────────────────────────
Gesamt:       16 offene WFPS-Positionen, 884.873,66 dEURO Principal
              707,90 WFPS Collateral total bei Preis 1.250 dEURO/WFPS
```

**Jede dieser 16 Positionen** ist potenziell als Eltern für einen kurzlebigen Klon nutzbar. Ein Angreifer mit hinreichend WFPS am Markt kann den Stage-1-Vektor beliebig oft replizieren, bis das Protokoll den Klon-Expiration-Pfad härtet oder die WFPS-Familie geschlossen wird.

## 10. Strukturelle Schwachstellen, die der Angriff ausnutzte

### 10.1 Fehlende Mindest-Lifetime in `clone()`

`MintingHub.sol:clone()` validiert die Klon-Expiration nur als `≤ parent.expiration`. **Es gibt keine Mindest-Lifetime-Prüfung.** Damit ist ein Klon mit beliebig kurzer Lebensdauer (im Extremfall 0 Sekunden) erlaubt — exakt der Vektor, den dieser Angriff genutzt hat.

### 10.2 Aggressive Decay-Kurve in `expiredPurchasePrice`

`MintingHub.sol:472` lässt den Forced-Sale-Preis nach Ablauf einer Position linear gegen 0 verfallen. Im Angriff fiel der Preis innerhalb von ca. 46 Stunden von 1 250 dEURO/WFPS auf 85 dEURO/WFPS (≈ 6,8 % des Origin-Preises). Bei illiquiden Collaterals ist die unterstellte Searcher-Konkurrenz nicht gegeben — niemand bietet, weil der Origin-Preis als überhöht gilt — und der Decay läuft fast vollständig durch, bevor jemand die Arbitrage-Lücke nutzt. Folge: maximaler Loss für die Equity-Reserve.

### 10.3 Ungeprüfte Origin-Preise bei Position-Klonen

`MintingHub.sol:221` — `clone()` übernimmt den Preis der Eltern-Position ohne Re-Validierung. Wenn die Eltern-Position einen mispricten Origin-Preis hat (z. B. weil keine Challenge gegen sie eingereicht wurde), wird dieser Mispricing-Effekt vererbt. In der hier analysierten Sequenz wurde dieselbe 4-WFPS-Collateral mit demselben 1 250-dEURO-Preis re-collateralisiert.

### 10.4 Fehlender Challenge-Anreiz bei illiquiden Collaterals

`MintingHub.sol:38` — `CHALLENGER_REWARD = 20 000` (= 2 %). Bei illiquiden Tokens wie WFPS in geringem Volumen ist die absolute Reward-Summe zu klein, um den Aufwand einer Challenge zu rechtfertigen — Challenger müssen Collateral-Tokens aufbringen, Auktionsrisiko tragen und mit illiquidem Markt umgehen. Konsequenz: mispricte Positionen werden nicht herausgefordert und expiren regulär. Bestätigung im Indexer: **seit 10 Monaten keine einzige Challenge** mehr im V3-System.

### 10.5 Owner-Mismatch ohne Whitelist im Clone-Pfad

`clone()` erlaubt dem Aufrufer, einen beliebigen `owner` für die neue Position zu setzen. In dieser TX wurde der Owner auf den "Attack"-Contract gesetzt, während der Aufruf von einem EIP-7702-delegierten EOA ausgeht. Damit kann ein Operator mehrere Positionen über separate Owner-Contracts orchestrieren und Forensik / Sanktionsmaßnahmen erschweren.

## 11. Offenes Folge-Risiko: Position `0x7EC6F1948ACF8E1cA486cA77B1919345e19B3392`

Diese in Stage 1 erzeugte Position ist nach wie vor aktiv:

- **Owner:** `0xf7FeF172D44DF28e430bAC013B8780762A0834E8` (Attack-Contract, unverifiziert)
- **Collateral:** 4 WFPS
- **Price:** 1 250 dEURO/WFPS
- **Principal:** 5 000 dEURO
- **Expiration:** 2028-02-21

Da der Owner ein Smart Contract ohne bekannte Repay-/Withdraw-Schnittstelle ist, ist es plausibel, dass die Position bis zum Ablauf weder repaid noch verwaltet wird. Beim Ablauf in 2028 droht ein erneuter Loss von bis zu ~4 620 dEURO an die Equity-Reserve, sofern der Forced Sale wieder mit niedrigem Decay-Preis ausgeführt wird.

**Sofortige Maßnahme:** Challenge gegen die Position einreichen, solange sie nicht expired ist. Reward bei erfolgreicher Challenge: 2 % von 5 000 dEURO = 100 dEURO. Effekt: Forced-Sale-Pfad wird durch `noChallenge`-Modifier blockiert und der Origin-Preis wird durch Auktion korrigiert.

## 12. Empfehlungen — priorisiert

### 🔴 Sofort (heute / morgen)

1. **Position `0x7EC6F1948ACF8E1cA486cA77B1919345e19B3392` herausfordern** (`MintingHubGateway.challenge`). Schließt das einzige aktive Folge-Risiko. Reward 100 dEURO.
2. **WFPS-Marktpreis verifizieren** (DEX-TWAP, FPS-Wrap-Pool, NAV-Berechnung). Wenn der Marktpreis deutlich unter 1 250 dEURO liegt, sind alle 16 Familien-Positionen strukturell gefährdet und eine Notfall-Challenge-Welle sollte erwogen werden.
3. **Wallet-Watchlist aktivieren** für `0x6BD9e85e...d56`, `0x3fe637cf...4823`, `0xf7FeF172...4E8`, `0x5Bb3BFCf...5B5`, `0x4884d28F...DFAc`, `0xFd89cD1b...4f61` — Alarmierung bei jeder erneuten Aktivität.

### 🟡 Kurzfristig (Tage)

4. **Patch in `MintingHub.clone()`**: Mindest-Lifetime erzwingen, z. B. `expiration ≥ block.timestamp + challengePeriod + cooldown + min_economic_window`. Verhindert die Quasi-Sofort-Expiration-Trickserei.
5. **`expiredPurchasePrice`-Floor** einführen, z. B. 30 % des Origin-Preises. Bei illiquiden Collaterals begrenzt das den maximalen Equity-Hit je Position auf ~70 %.
6. **Re-Mint-Cooldown nach Forced Sale**: nach erfolgreichem `buyExpiredCollateral` für `clone()` mit derselben Collateral-Adresse einen Cooldown einführen (z. B. 24 h), während dem entweder kein Klonen erlaubt ist oder der Origin-Preis neu durch Challenge legitimiert werden muss.
7. **Bytecode-Reverse-Engineering** von `0xf7FeF172...0834E8` und `0x4884d28F048E66A537762334937e01A044CbDFAc` — verstehen, was Stage 2 erreichen wollte und ob ein bisher nicht erkannter Vektor im Spiel ist.

### 🟢 Mittelfristig

8. **Challenge-Reward proportional zum Mispricing-Risiko**: höherer Reward für Collaterals mit geringer DEX-Liquidität, dynamische Anpassung über Volumen-Oracle.
9. **Whitelist für Collateral-Tokens**: Mindestkriterien (DEX-Liquidität, Marktkapitalisierung, Oracle-Verfügbarkeit) für neue Collaterals, einsetzbar im `MintingHub`.
10. **Owner-Validierung im Clone-Pfad**: optionaler Modus, in dem `clone()` den Owner nicht frei wählen lässt, sondern auf `msg.sender` zwingt — reduziert Misuse durch wegwerfbare Smart-Contract-Owner.
11. **Monitoring/Alarm** auf neue Klon-Positionen mit `expiration − created < min_threshold`. Heute manuell leicht zu spotten, sollte automatisiert werden (z. B. als Forta-Bot oder Ponder-Hook).
12. **Maximalpreis-Cap je Collateral**: Governance-gesetzter Oracle-Cap pro Collateral-Token, der den vom Proposer setzbaren `price` begrenzt — verhindert offensichtlich überhöhte Origin-Preise.

### 🔵 Forensik / Disclosure

13. **CEX-/Aggregator-Counterparties** der Funding-Wallets prüfen, Tornado-Cash-Deposit-Tickets clustern, Sanktions-Listen abgleichen.
14. **Disclosure**: falls die Bytecode-Analyse einen weiteren, noch nicht gefixten Vektor enthüllt, koordinierte Disclosure und Hotfix.
15. **Post-Mortem für nDEPS-Holder**: transparente Kommunikation des realisierten Verlustes (4 621 dEURO) und der eingeleiteten Gegenmaßnahmen.

## 13. Zeitleiste

| Zeitpunkt | Ereignis |
| --- | --- |
| ~23. April 2026 | Cluster-A-EOA `0x6BD9e85e...d56` erhält Funds aus Tornado.Cash |
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
