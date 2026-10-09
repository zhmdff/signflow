# SignFlow: the business case

**SignFlow reads your contracts against your own terms and the law, so you find out about conflicts before a vendor or a fine does.**

This document covers the business side: the problem, the customer, how SignFlow would make money, what it costs to run, and what has to be proven next. For what the product does, see [README.md](README.md).

Numbers marked **measured** come from running the prototype. Numbers marked **assumption** are our estimates and still need to be checked with real customers.

## The problem

A company without a legal team handles contracts in three bad ways.

- **It signs without a full read.** A supplier's contract runs to 20 pages. The manager signing it checks the price and the dates. A clause that renews the deal for two years, or removes any cap on what the company can be made to pay, goes unnoticed until it is used against them.
- **It never looks back.** When a law changes, somebody would have to reread every signed contract to see which ones now break it. Nobody does, so the company learns about the conflict from an inspector or a fine.
- **It misses dates.** The deadline that matters is the last day to give notice, which can be months before the contract ends. Miss it, and an unwanted contract renews automatically.

The usual fixes are to pay an outside lawyer per contract, which is too slow and expensive to do for every one, or to do nothing.

## The customer

**First target:** companies of roughly 20 to 500 people that sign supplier and employment contracts regularly and have no in-house lawyer, or one lawyer who cannot keep up. Retail, logistics, agencies and services are typical.

**Who uses it:**

| Person | What they need |
|---|---|
| Operations or procurement manager | To know what is wrong with a supplier's contract before signing it |
| HR manager | Fast, correct answers about what an employee's contract says |
| Founder or finance lead | To see what is about to renew and what a new law exposes them to |
| Outside or in-house lawyer | A first pass that points to the clauses worth their time |

**Who pays:** the operations or finance lead, because the savings and the avoided losses land in their budget.

## What the customer gets

| Benefit | How SignFlow delivers it | How we would measure it |
|---|---|---|
| Bad terms caught before signing | Each partner contract is compared with the company's own rules | Mismatches found per contract; how many were changed before signing |
| Legal conflicts found before a fine | Every stored contract is checked against a new law | Affected contracts found; days between the law and the fix |
| Less time spent reading | Findings come with the clause and suggested wording | Hours of review per contract, before and after |
| No surprise renewals | Notice deadlines are tracked, not just end dates | Renewals that were decided on purpose |
| Faster HR answers | Questions answered with the clause shown | Time to answer; questions escalated to a lawyer |

**Assumption to validate:** a manual review of a supplier contract against company policy takes one to three hours. SignFlow's first pass takes under a minute, leaving the reviewer to check the flagged clauses. We have not yet timed this with real users.

## Why it is different

Most AI contract tools summarise a document. A summary tells you what a contract says. It does not tell you whether that is a problem for you.

SignFlow checks each contract against two things that are specific to the customer: **their own rules** and **the law that applies to them**. And it holds itself to a standard a summary does not:

- **Every finding names the clause and quotes it.** The reader can check it in seconds.
- **Every quote is verified.** The software, not the AI, confirms each quoted sentence appears in the contract word for word, and marks any that do not.
- **It says when the answer is not in the contract**, instead of guessing.

That combination is what makes the output usable by someone who is not a lawyer, and reviewable by someone who is.

## How it would make money

**Assumption:** a monthly subscription per company, tiered by the number of contracts kept in the system. For example a starter tier for a small library, a business tier for a few hundred contracts, and a custom tier for larger companies. Prices are not set. They should be anchored to the cost of the outside legal review SignFlow replaces, and tested in the pilot.

A subscription fits because the value keeps arriving after the first upload: every new contract, every law change and every approaching deadline is a reason to come back.

## What it costs to run

The main running cost is the AI model, charged by the amount of text it reads and writes ("tokens"). We measured this on the prototype.

| Task | Tokens per run (measured) |
|---|---|
| Add a contract of about 1,500 words | about 3,000 |
| Compare a contract with our terms | about 4,700 |
| Answer a question about one contract | about 1,100 |
| Answer a question across all contracts | about 2,300 |
| Check a law against 8 contracts | about 8,000 |
| Repeat any of the above on unchanged documents | 0 |

So bringing in one new supplier contract and comparing it costs under 8,000 tokens. At the prices AI providers publish for this class of model, that is a fraction of a cent to a few cents per contract. The exact figure depends on the provider's current price list, which we have not locked in. The prototype itself ran entirely on free tiers.

Three design choices keep this low, and they matter more as a customer's library grows:

- **Results are saved.** Nothing is paid for twice. A repeated check on unchanged documents is free.
- **Only the relevant clauses are read.** A question reads the handful of clauses that matter, not every contract. In testing that was 10 to 17 clauses out of 119.
- **A law check only pays for what is new.** Adding one contract later does not mean rechecking all the others.

Other costs are ordinary: hosting, storage and support. No special hardware is needed.

## What is needed to start

- The customer's contracts, as PDFs or text
- A short list of the customer's own rules, which can be typed in on one page
- Nothing else: no integration with other systems is required for a pilot

## Risks and how we handle them

| Risk | Response |
|---|---|
| The AI invents a quote | Every quote is checked against the contract by the software, and unconfirmed ones are marked |
| It is taken as legal advice | Every result is labelled AI-assisted and needing human review. SignFlow supports a reviewer; it does not replace one |
| It misses a problem | Possible, and the reason a human stays in the loop. We need accuracy figures before making any claim here (see below) |
| Contracts are confidential | The pilot can run on the customer's own machine. A hosted version needs access controls and a data agreement with the AI provider |
| The AI provider is down or rate-limited | The prototype already switches between providers and between several keys automatically |
| Unusual wording is missed in search | Seen in testing: "rolls over" in place of "renews". We widened the search and now take the best matches from every contract, but this needs wider testing |

## What is proven, and what is not

**Working in the prototype today:**

- All five functions run end to end: contract library, comparison, law check, questions, and reminders
- On a test contract of about 1,500 words with one hidden problem, the comparison reported exactly that problem and nothing else
- The law check on the sample "no work after 9pm" law flagged the three contracts it should
- A question the contract does not cover was answered "not addressed" and not guessed

**Not proven yet:**

- **Accuracy at scale.** Those are single test cases. We still need a scored test set: many contracts with known problems, measuring how many are found and how many false alarms are raised.
- **Real contracts.** Everything so far is sample data in English. Scanned documents, other languages and messy formatting are untested.
- **Time saved.** Not yet measured with real users.
- **Willingness to pay.** No customer conversations yet.

## Next steps

1. **Build the scored test set** and publish the accuracy numbers, including a comparison with a plain keyword search.
2. **Pilot with one department** of one company on its real contracts, with a lawyer approving every flagged item. Measure hours saved and problems caught.
3. **Add what a pilot will ask for first:** user accounts, email reminders before notice deadlines, and support for the local language.
4. **Later:** follow new laws automatically as they are published, and electronic signing so the fix and the signature happen in one place.
