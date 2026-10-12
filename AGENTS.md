# Architecture rules

- Keep Bondi identifier and passenger-text mapping in a pure, tested helper so reservation O.S. and per-service SHT remain distinct across import paths.
- Identify Bondi imports by full SHT, not shared O.S., so sibling services cannot overwrite each other; recognize legacy records stored with full service code in O.S.
- Contract representative name uses the existing contratante_contato field; profession, identity document and phone have separate persisted fields to keep representative and company data distinct in forms and printing.