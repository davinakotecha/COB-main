---
name: meeting-summary
description: "Use whenever the user wants meeting notes turned into a short summary with decisions and actions. Trigger on: pasted meeting notes, phrases like 'summarise this meeting', 'write up the actions', 'what did we decide', or a request for minutes in the team's format. Works from the notes alone, never invents owners or dates, and marks anything the notes do not confirm as unconfirmed."
metadata:
  ks-workstream: "Example workstream"
  ks-tagline: "Turn meeting notes into a short summary with actions."
  ks-give: "Your notes from a meeting, pasted in."
  ks-get: "A short summary with decisions and actions, flagging anything the notes do not confirm."
  ks-needs: "Nothing beyond Claude."
---

# Meeting Summary

A tiny starter skill that ships with the template so the library, a skill page and the
generator have something to show on day one. Delete it and add your own.

Turn a set of meeting notes into a summary in a fixed shape, so every summary on the account
reads the same way. The shape is described in
[`references/format.md`](references/format.md).

## Inputs this skill accepts

- Notes from one meeting, pasted in as plain text.
- Optionally, the meeting's name and date, if the notes do not say.

Never invent an owner, a date or a decision that the notes do not contain.

## The recipe

1. Read the notes and pick out decisions, actions and open questions.
2. Write each as one line in the format in `references/format.md`.
3. For any action with no clear owner or due date, keep the line but mark it
   **Unconfirmed**, and say what is missing.
4. End with one sentence listing what you could not tell from the notes.

## Out of scope

- Judging whether a decision was right.
- Naming people who are not named in the notes.

## Confidentiality

Use only made-up names and figures in anything committed. See the repo `CLAUDE.md`.

## Before calling it done

- [ ] Every line comes from the notes.
- [ ] Anything uncertain is marked Unconfirmed.
- [ ] No real client content anywhere.
