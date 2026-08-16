# SMS provider interface

Phase 7 keeps `SMS_PROVIDER=mock` and `ENABLE_SMS=false`. The interface accepts a normalized destination, purpose, versioned body, consent decision, idempotency key, and audit context, and returns provider/message status without exposing credentials.

Carrier delivery is intentionally absent. SMS previews display segment count and STOP/HELP language. Phone-number presence is never consent. Mike and Brandon phone activation remains deferred; this release neither texts nor registers a carrier sender.

