# Rollback Plan

## Application

Current production is `dpl_4yacS3NeepmZNp4AnamDF6oPA5GW`. The immediately prior
known-good deployment is `dpl_SDMv6Nz69aKZJFfmGB54h6MpY5yt`. If smoke checks fail,
stop traffic activation and use Vercel promotion/rollback to the recorded prior
deployment. Do not delete a deployment or force-push.

## Database

The same-day migration is additive. Do not run destructive cleanup or alter existing
lead rows. If the migration must be reversed before the new code is promoted, use
the migration's reviewed down notes against the same database only after approval;
retain `leads`, `consents`, `audit_logs`, and delivery records.

## WordPress

Remove only the named reversible Custom HTML/shortcode/widget block or deactivate
the isolated bridge after backing up. Do not edit parent theme, `functions.php`,
FlexMLS/IDX, or unrelated forms. Restore prior page cache only if the owner approves.

## Email

Set `EMAIL_ENABLED=false` / notification mode `disabled` to stop provider sends while
preserving outbox rows. Do not delete failed delivery records; investigate and retry
with the same idempotency key after correction.
