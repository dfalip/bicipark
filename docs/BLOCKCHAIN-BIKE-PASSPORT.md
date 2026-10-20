# BiciPark Bike Passport — blockchain-ready architecture

## Product goal

Use cryptographic proofs to make bicycle identity, maintenance and ownership history easier to verify without putting personal data on a public blockchain.

Blockchain is an optional anchoring layer, not the BiciPark database and not a requirement for using Bike Passport.

## What stays off-chain

- user identity and contact data
- invoices and purchase documents
- full frame / serial number
- photographs
- exact location
- maintenance notes containing personal data
- marketplace conversations and payment data

These records belong in BiciPark's private backend once accounts are implemented.

## What can be anchored on-chain

Only hashes / proof references for important events:

1. bicycle registration
2. verified workshop maintenance
3. ownership transfer accepted by both parties
4. theft-status event where legally and operationally appropriate
5. important Bike Passport snapshots

A blockchain anchor should contain no information that directly identifies the owner.

## Current MVP

`modules/bike-passport/proof-model.js` already provides:

- canonical Bike Passport snapshots
- SHA-256 proof generation
- proof verification
- chained `previousDigest` references
- verification levels (`none`, `passport`, `verified`)
- transfer packages that exclude full serial numbers

The current proofs are local and are **not yet written to a blockchain**.

## Verification semantics

- `none`: no cryptographic passport proof exists.
- `passport`: the owner has created a valid local Bike Passport proof.
- `verified`: an external-style attestation exists (for example workshop, registry or accepted ownership transfer).

A self-created owner proof alone must never be presented as `BiciPark Verified`.

## Future anchoring interface

A future provider should expose roughly:

```js
await anchorProvider.anchor({
  bikeId,
  digest,
  eventType,
  timestamp
});
```

and return a network-independent receipt:

```js
{
  network: "...",
  transactionId: "...",
  anchoredAt: "...",
  digest: "..."
}
```

The rest of BiciPark should depend on this generic receipt, not on one blockchain SDK.

## Marketplace integration

A bicycle listing may show:

- `Bike Passport` when a valid owner proof exists.
- `✓ BiciPark Verified` only when external verification exists.
- `Transfer ready` when a transfer-intent proof has been prepared.

This lets the marketplace become a trust layer for second-hand bicycles rather than a generic classified-ads feature.

## Proposed next phases

1. Accounts + private backend sync.
2. Workshop accounts and signed maintenance attestations.
3. Two-party ownership-transfer acceptance.
4. Public QR view with privacy-safe Bike Passport summary.
5. Blockchain anchor provider pilot.
6. Theft / recovery workflow and trusted registry integrations where legally feasible.

## Non-goals

- no BiciPark token
- no NFT requirement
- no cryptocurrency payment requirement
- no personal data or full documents on a public chain
