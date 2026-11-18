# Account deletion (LAUNCH-AUDIT B7)

18 November 2026. Short design. The user approved the approach and the outline in conversation; this records it, plus the calls I made, which are marked as mine.

## Why

Google Play requires two things for any app with sign-up (Google sign-in counts):

- a way to delete the account inside the app;
- a public web link where the account can be deleted without the app.

Kria has neither. This blocks launch.

## Approaches

- **Anonymise in place (picked).** The account and its personal details go; match records stay under "Deleted player". Brackets, opponents' histories and payment records stay intact.
- **Hard delete everything.** Rejected: it breaks other players' brackets and results, and deletes payment records the law requires us to keep.
- **"Email us" and delete by hand.** Rejected: Play wants deletion in the app, and nobody has a tool to do it by hand.

## Decided with the user

- Deleting an account renames the player to "Deleted player". Email, phone, date of birth, photo, password and push tokens are removed, and the account can never sign in again.
- Match results and brackets stay. Payment records stay (tax law; Play allows retention for legal reasons).
- **In the app:** a "Delete account" row in Settings with a confirmation step.
- **On the web:** `kria.club/delete-account`. The user enters their email, gets a code, and confirms. This works for Google accounts, which have no password.

## My calls

**Server.** `DELETE /player/auth/account`, for a signed-in player. It does the following, in order:

- **The player document:**
  - The name becomes "Deleted" / "player".
  - The email becomes `deleted-<id>@deleted.invalid`. That frees the real address for a new sign-up, and the `.invalid` domain can never receive mail.
  - Phone, date of birth, gender, location, photo, password, code, push tokens, saved events, titles and honours are removed.
  - The status becomes `deleted`, `isActive` becomes false, and `deletedAt` is set.
  - The auth middleware already refuses inactive accounts, so the current token dies straight away. The JWT cache key is removed too.
- **Entries** (`TournamentRegistration.profile`): the name is replaced, and phone and photo are removed. Age and gender stay, because the category's rules rely on them, and once the name is gone they no longer identify anyone. Entry status is not changed: an entry in an upcoming event stays, and the organiser sees "Deleted player" and decides what to do.
- **Name copies** become "Deleted player":
  - match cards for both sports, base and per-sport collections, `player1`/`player2`, including a doubles pair's joined name;
  - cricket lineups (`startingXI`, `reserves`);
  - auction logs;
  - team-league lineups (`playerNames`, which runs parallel to `playerIds`);
  - quick-match slots and quick-cricket lineups;
  - quick-knockout players.
- **Deleted outright:** the player's notifications, support messages (contact leads from their email), and their photo in R2 (best effort; a failure is logged).
- **Kept:**
  - payments, including the entry profile they carry (legal retention);
  - career-stat rows (they hold no name, and the public profile already 404s for inactive players);
  - organiser-typed team owner contacts (not the player's data).
- **Confirming the delete:** the endpoint asks for no password. The app's confirmation sheet and the web's emailed code are the confirmation.
- **Organiser accounts are out of scope.** The Play app is for players only.

**App.** A "Delete account" row sits at the end of Settings' Account section. It opens a `BottomSheet` that explains what goes and what stays, with **Delete account** and **Keep my account** buttons. On success the app runs the existing `logout` and returns to Welcome.

```
Account
  Signed in as asha@example.com
  Change password                         >
  Delete account                          >   (text in the error colour)

[sheet] Delete your account?
  Your name, email, phone, photo and sign-in go for good.
  Your match results stay, shown as "Deleted player".
  [ Delete account ]  [ Keep my account ]
```

**Web.** `/delete-account` uses the Contact page's layout (Navbar, footer) and has three steps:

1. Email, then **Send code**. This calls `POST /player/auth/login/otp`.
2. Code, then **Delete my account**. This calls `POST /player/auth/login/otp/verify`, then `DELETE /player/auth/account` with the returned token. A plain `axios` call is used, because the shared client's interceptor would swap in a stored organiser token.
3. A "Your account has been deleted" confirmation.

The page is public, linked from the footer, and added to the sitemap.

## Left to the builder

The exact UI copy, the order of the update queries, and the test fixtures.
