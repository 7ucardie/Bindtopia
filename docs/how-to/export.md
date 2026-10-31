# Export and import a collection

## Export

Open **Saved → Export saved cards**. The portal downloads a JSON backup with version, export time and the saved card records. It does not upload the collection.

## Import

Open **Saved → Import backup** and select a valid version-2 backup. Cards you added yourself are included and marked `"custom": true` (see [add a missing card](add-a-missing-card.md)). Import merges cards by language and card ID rather than deleting the existing collection. Files over the current 10 MB limit or invalid records are rejected.

## Delete

Use **Delete saved cards**, confirm, and close other tabs that might still hold an older collection in memory. The action removes only the portal's collection keys. It does not remove separate backups, photographs, host sessions or the native app's collection.
