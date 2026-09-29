# User filtering and independent windows

`users.recent_chatters(window, filter)` first selects **candidate users who authored recorded chat messages in this channel during `window`**. `chat.recent_chatters` is an alias. Only then are `UserFilter` criteria applied, with AND between different criteria.

**The candidate window does not become a nested filter's window.** `ActivityFilter`, `MessageFilter` and `RewardFilter` each have their own optional `.during(...)`. Without it, that filter checks **all retained history for this channel up to query time**, not the recent-chatters window. This is recorded history, not a guarantee of lifetime data: messages never received or records removed by retention are unavailable.

## Four independent windows

```rhai
let filter = UserFilter::create()
    .activity(
        ActivityFilter::create()
            .min_messages(3)
            .during(Duration::from_mins(30))
    )
    .messages(
        MessageFilter::any()
            .contains("динозавр")
            .during(Duration::from_mins(5))
    )
    .reward_redemptions(
        RewardFilter::create()
            .reward("secret_case")
            .statuses(["COMPLETED"])
            .min_count(2)
            .during(Duration::from_days(7))
    );

let viewers = users.recent_chatters(Duration::from_mins(1), filter);
```

Every returned viewer must meet **all four** conditions:

- Authored at least one recorded channel message in the **last minute**: candidate selection.
- Authored at least three recorded channel messages in the **last 30 minutes**: activity eligibility.
- Authored a message containing `динозавр` in the **last five minutes**: content eligibility, case-insensitive by default.
- Has at least two `COMPLETED` redemptions of `secret_case` in this channel in the **last seven days**: reward eligibility, including SCRIPT origin.

A viewer with qualifying old history but no message in the last minute is **not a candidate**. A candidate with missing evidence for any filter is excluded. No username/display-name or unrelated metadata participates in content matching. Future-dated records and other channels are excluded.

## Activity thresholds

```rhai
let filter = UserFilter::create().activity(
    ActivityFilter::create()
        .min_messages(5)
        .min_characters(500)
        .during(Duration::from_mins(30))
);
let viewers = users.recent_chatters(Duration::from_mins(5), filter);
```

Candidates chatted within five minutes, but both thresholds count **all messages over 30 minutes**, not only messages passing a separate `MessageFilter`. Characters use recorded Unicode character counts, not UTF-8 byte lengths. Both counts default to zero, must be nonnegative, and are ANDed. A zero threshold does not require a message in the nested window.

`.activity(...)` replaces the previously attached ActivityFilter. Builders return updated values: chain them or assign the result. See the [ActivityFilter reference](./reference/ActivityFilter).

## No explicit window means all retained history

```rhai
let filter = UserFilter::create()
    .activity(ActivityFilter::create().min_messages(100))
    .messages(MessageFilter::any().equals("динозавр"))
    .reward_redemptions(RewardFilter::create().reward("entry_reward").min_count(2));
let viewers = users.recent_chatters(Duration::from_mins(2), filter);
```

These candidates chatted in the last two minutes. The three nested filters check their **entire retained channel history**, independently: at least 100 messages, one message equal to `динозавр`, and two entry-reward redemptions. Any one filter may instead specify `.during(...)` without changing the others. Repeated `.during(...)` replaces only that filter's window.

## Returned activity statistics

Each user appears once. `id` is their Twitch user ID; `login` is an observed login. `messages`, `characters`, `first_activity` and `last_activity` always describe **all recorded activity in the candidate window**. They do not switch to a nested filter's window and do not count only matching content.

For example, a returned viewer may have `messages == 1` for the last minute while satisfying `ActivityFilter.min_messages(3)` over the last 30 minutes. Use [users.user_stats](./reference/users#user_stats) with a separate explicit window when you need that period's statistics.

## Legacy convenience methods

Released `UserFilter.min_messages(...)` and `.min_characters(...)` remain supported with their **original candidate-window semantics**. They do not acquire all-history semantics and do not inherit an ActivityFilter's window. This compatibility exception prevents existing scripts from silently changing eligibility.

To preserve an old five-minute rule while migrating:

```rhai
// Old: both thresholds use recent_chatters' five-minute candidate window.
let legacy = UserFilter::create().min_messages(5).min_characters(500);

// Equivalent activity threshold; its window is now explicit and independent.
let migrated = UserFilter::create().activity(
    ActivityFilter::create().min_messages(5).min_characters(500)
        .during(Duration::from_mins(5))
);
let viewers = users.recent_chatters(Duration::from_mins(5), migrated);
```

Change only `ActivityFilter.during(...)` to 30 minutes when the intended requirement is a longer activity history. Combining legacy thresholds with `.activity(...)` applies **both**, not an override. Prefer ActivityFilter in new scripts. RewardFilter's existing no-window/all-history behavior is preserved; the new MessageFilter follows the same rule rather than implicitly inheriting the candidate window.

## Bounds and query behavior

The candidate and `user_stats` windows must be 60 seconds to 365 days. Explicit ActivityFilter and MessageFilter windows accept 1 second to 365 days; RewardFilter retains its 60-second minimum. Zero, negative and excessive Duration values fail. Omitting `.during(...)` is valid; no missing-window error is raised.

MessageFilter accepts 1-16 literal clauses, each 1-256 Unicode scalar values, with no NUL or regex. [Message filtering](./message-filtering) explains same-message AND, case sensitivity and Unicode comparison.

Filtering is database-backed in one query. Rhai receives at most **1,000 eligible users**, ordered by newest candidate-window activity, then ID. The limit applies **after all criteria**, not to an arbitrary subset of initial candidates. Raw histories never enter script memory. All-history scans still obey host deadlines; an explicit window is preferable when older evidence is irrelevant. Dry run uses the same real recorded data without chat/reward side effects.

Continue with [UserFilter](./reference/UserFilter), [MessageFilter](./reference/MessageFilter), [RewardFilter](./reference/RewardFilter) or the [independent-window recipe](./cookbook/independent-filter-windows).
