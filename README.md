# SignFlow

**SignFlow reads your contracts against your own terms and the law, so you find out about conflicts before a vendor or a fine does.**

Most companies sign contracts they have not fully read. A supplier's 20-page agreement can hide one sentence that locks you in for two more years, and a new law can quietly make clauses in contracts you signed last year illegal. Finding these by hand takes a lawyer hours per contract, so in practice nobody does it until something goes wrong.

SignFlow does that reading for you. It keeps all your contracts in one place, checks them, and shows its evidence for everything it tells you.

## Who it is for

Small and mid-sized companies without a full legal team: the operations manager who signs supplier contracts, the HR person who answers questions about employment terms, and the founder who needs to know what is about to renew.

## What it does

### 1. Compares a partner's contract with your own terms

You keep a short list of your company's rules, for example "we pay invoices within 30 days" or "liability is capped at 12 months of fees". When a partner sends you their contract, SignFlow reads it against those rules and reports:

- every place where their contract disagrees with your terms
- how serious each one is: critical, major or minor
- the exact sentence from their contract, next to the exact rule of yours it breaks
- replacement wording you can send back to them
- anything your terms require that their contract leaves out entirely

**Example:** a packaging supplier's contract says in clause 12 that it renews automatically "in accordance with clause 16". Clause 16 is a long paragraph about how emails are delivered, and in the middle it says you must give 180 days' notice to stop the renewal. Your rule allows 60 days at most. SignFlow finds that one sentence.

### 2. Checks your contracts when the law changes

Paste the text of a new law. SignFlow works out the rules it creates, then checks every contract you have against them. It tells you:

- which contracts are affected
- the clause in each that now breaks the law
- the date you have to fix it by
- the amended wording to use

**Example:** a new law bans work between 9pm and 6am. SignFlow flags the warehouse supervisor's contract that includes a night shift, and also the logistics contract that obliges your staff to be available 24 hours a day.

### 3. Answers questions about your contracts

Ask a question in plain language, the way you would ask a colleague. SignFlow answers from the contract and shows the clause it used.

**Example:** "Aysel missed 3 days with the flu. What does her contract say?" The answer: she is paid in full, but because she was off for more than two days she must bring a medical certificate within three working days of returning. Both clauses are shown.

If the contract does not cover the question, SignFlow says so. Ask whether an employee may work from home when her contract never mentions it, and the answer is "the contract does not address this", not a guess.

### 4. Reminds you before contracts expire or renew

SignFlow lists every contract by how soon you need to act, with red, amber and green status. It works from the date that actually matters, which is the last day you can give notice, not the day the contract ends. Contracts that renew by themselves are marked.

**Example:** a contract ends on 31 December and needs 120 days' notice. The real deadline was 2 September. SignFlow shows it in red as already missed, with the renewal date.

### 5. Keeps your contracts and your terms in one place

- **Contracts:** upload a PDF or paste the text. SignFlow splits it into its numbered clauses and picks out the parties, dates, renewal terms and notice period. You can read any contract, search the list, and jump straight to asking about it or comparing it.
- **Your terms:** edit your company's rules on a simple page. Add a rule, change the wording, reorder or remove them. Every comparison uses the current version.
- **History:** past law checks and your conversation are saved, so you can come back to them.

## Why you can trust what it says

AI tools sometimes make things up, and in a contract a made-up quote is dangerous. SignFlow is built around that problem.

- **Every finding points to a clause.** Nothing is reported without the clause number and the sentence it came from. Click any reference to open the contract at that clause.
- **Every quote is checked.** After the AI answers, SignFlow itself checks that each quoted sentence really appears in the contract, word for word. A quote it cannot find is marked with a warning.
- **It shows how sure it is.** Each finding carries a confidence level and a count of how many quotes were confirmed.
- **It admits when the answer is not there.** "The contract is silent on this" is a valid answer.
- **A person makes the final call.** Every result is labelled as AI-assisted and needing human review. SignFlow finds and explains problems; it does not replace a lawyer.

## What it does not do yet

- Signing contracts electronically
- User accounts and permissions
- Sending reminders by email
- Following new laws automatically as they are published

## More

- [BUSINESS.md](BUSINESS.md): the business case, running costs and next steps
- [DEVELOPMENT.md](DEVELOPMENT.md): setup instructions and how the project is built
