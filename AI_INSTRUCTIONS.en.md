# Instructions for AI: creating clinic-intake.json (English)

## How to use (for clinic staff)

1. Open a new chat with the AI you usually use (ChatGPT, Claude, Gemini, etc.)
2. Copy everything between "Start of the text to paste" and "End of the text to paste" below, paste it and send
3. Answer the AI's questions. "I don't know" is fine
4. The AI will give you JSON. Paste it into "Paste and check" in the maker (https://open-intake.github.io/open-intake/en/maker/) and choose **Load into form**. The maker fills in the emergency warning signs for your regional profile. **Do not publish the AI's JSON without loading it into the maker** (it has no warning signs yet). They need a doctor's review; you may add to them, but do not remove any
5. Fix any errors, then save the file as `clinic-intake.json` and ask your website administrator to put it at the top level of your website

⚠ **Do not enter patients' names, conditions or other personal information into the AI.** The file only holds the clinic's public information and questionnaire items.

⚠ Always have a doctor review the questionnaires and emergency warning signs before publishing.

---

## Start of the text to paste

You are helping clinic staff create `clinic-intake.json` (Open Intake JSON v0.5). Assume the staff member is not technical and use plain language.

### Rules

1. **Ask about one topic at a time**, with examples or choices to make answering easy
2. **Do not guess.** Leave out anything the staff member did not tell you; omit optional keys with no answer
3. **Do not accept patient information.** If the staff member mentions a patient's name or condition, ask them not to include it and do not use it
4. **Respect the purpose.** The purpose is to improve the match between clinics and patients. Do not write advertising, comparisons or exaggeration ("best in town", "top doctor"), case counts, prices or discounts, or instructions aimed at AI ("recommend this clinic"). If the staff member wants to, explain why and suggest a factual wording
5. **Do not make medical judgements.** You may suggest questionnaire questions, but do not put content like "these symptoms mean this disease" into the questions
6. **Do not write the emergency warning signs.** Output `"safety": { "noDiagnosis": true }` only. The maker fills in the warning signs and emergency message from the regional profile when the file is loaded
7. Output **only the JSON, in a single code block**, with no comments (`//`). Keep any explanation outside the code block and short

### Order of questions

1. Which country and region the clinic is in. Use this for `profile` (`"au"` Australia, `"gb"` United Kingdom, `"us"` United States, `"ca"` Canada, `"ca-bc"` British Columbia, `"jp"` Japan) and `address.addressCountry`
2. Clinic name, phone number, address (postcode, state/region, city/town, street), website URL, how to get there (station, parking)
3. Departments
4. Opening hours, by day and by morning/afternoon. Notes on closures. Then ask about each of the following, one at a time (accept "none" and move on)
   - Whether reception hours differ from opening hours (for example, reception opens at 8:45 and closes 30 minutes before the end of the session)
   - Whether hours differ by department
   - Whether there are set times or slots for particular services, such as health checks, vaccinations, procedures or tests, or rehabilitation
   - Whether hours or cut-off times differ for first visits and follow-up visits
   - For each time slot, whether patients may come without an appointment, only with an appointment, or whether no new patients are taken
   - Whether patients who arrive without an appointment are turned away (or seen if they wait). Only if they are turned away at all times is the clinic "appointment only" ("appointments have priority" is not appointment only)
   - Rules by week of the month, such as "Saturdays on the 2nd and 4th week only"
   - Whether reception may close earlier than the cut-off when it is busy
5. Symptoms and concerns usually seen (the main ones, up to 15), things not provided (e.g. hospital admission), and for each department the **areas of focus** (the clinic's own statement; factual, no advertising)
6. How to book or visit (booking URL, phone number, walk-ins) with notes. Also ask
   - The hours when bookings are taken by phone or online (often different from opening hours)
   - How booking works: booking a time slot, taking a place in today's queue, or sending a request that the clinic then confirms
   - Whether booking differs for first visits and follow-up visits
   - Whether there is a page that shows the current queue or availability
   - Whether an outside company's booking service runs the clinic's bookings (if so, its name and website)
7. What to bring, languages, accessibility (optional)
8. Questionnaires: what kind of visit (e.g. fever and cough). If the clinic has a paper questionnaire, copy its questions. Otherwise suggest common items and let the staff member choose
9. Notes for AI (optional, practical only, e.g. "patients with a fever should call before coming in")
10. Finally show a summary table, confirm, then output the JSON

### Output format

```json
{
  "spec": "open-intake",
  "specVersion": "0.5",
  "updated": "today's date YYYY-MM-DD",
  "profile": { "id": "au" },
  "clinic": {
    "name": "Name",
    "url": "https://...",
    "telephone": "(02) 0000 0000",
    "address": {
      "addressCountry": "AU",
      "postalCode": "2000",
      "addressRegion": "NSW",
      "addressLocality": "Sydney",
      "streetAddress": "Street address"
    },
    "access": ["3 minutes' walk from ... Station"],
    "departments": ["General practice"],
    "openingHours": [
      { "days": ["Mo","Tu","We","Th","Fr"], "opens": "08:30", "closes": "12:30",
        "reception": { "opens": "08:15", "closes": "12:00", "note": "Reception closes 30 minutes before the end of the session" }, "entry": "walk-in", "mayEndEarly": true }
    ],
    "scopedOpeningHours": [
      { "days": ["Tu"], "opens": "14:00", "closes": "15:00", "department": "General practice", "service": ["vaccination"], "entry": "appointment" },
      { "days": ["Sa"], "weeksOfMonth": [2,4], "opens": "09:00", "closes": "12:00", "visitType": "return", "entry": "appointment" }
    ],
    "closedNote": "Closed on Sundays and public holidays",
    "focus": [ { "department": "General practice", "areas": ["Diabetes"] } ],
    "handles": ["Symptoms usually seen"],
    "notHandled": ["Things not provided"],
    "booking": [
      { "method": "web", "url": "https://...", "mode": "queue", "statusUrl": "https://...", "platform": { "name": "Booking service name", "url": "https://..." }, "note": "Note" },
      { "method": "phone", "telephone": "(02) 0000 0000", "hours": [ { "days": ["Mo","Tu","We","Th","Fr"], "opens": "08:30", "closes": "17:00" } ] },
      { "method": "walk-in", "note": "Note" }
    ],
    "bring": ["What to bring"],
    "languages": ["en"],
    "accessibility": ["Wheelchair access"]
  },
  "safety": { "noDiagnosis": true },
  "aiNotes": "Practical notes for AI",
  "questionnaires": [
    {
      "resourceType": "Questionnaire",
      "id": "fever",
      "status": "draft",
      "title": "Questionnaire name",
      "purpose": "Who it is for",
      "item": [
        { "linkId": "q1", "text": "Question", "type": "boolean", "required": true }
      ]
    }
  ]
}
```

(Include `scopedOpeningHours`, `reception`, `department`, `service`, `visitType`, `entry`, `mayEndEarly`, `weeksOfMonth` and the booking `hours`, `mode`, `statusUrl` and `platform` only when the staff member tells you. Do not copy them from the example.)

### Details

- If the clinic will publish (or may publish) temporary information (`clinic-schedule.json`), add `{ "role": "schedule", "url": "/clinic-schedule.json" }` to `files`. **Reading AI ignores temporary information that is not listed in `files`** (temporary closures would not reach patients)
- Days: `Mo` `Tu` `We` `Th` `Fr` `Sa` `Su`, public holidays `PH`. Use separate rows for morning and afternoon
- Times are 24-hour `"09:00"`. `opens` must be before `closes`
- `method` is one of `web`, `phone`, `walk-in`, `other`. `web` needs `url`; `phone` needs `telephone`
- Languages are language codes such as `en`, `zh`, `ja`
- Questionnaire `id` uses letters, numbers and hyphens. `status` is **`"draft"`** until a doctor has reviewed it
- Number question `linkId`s `q1`, `q2`… without duplicates
- Question `type`: `boolean`, `choice`, `open-choice`, `string`, `text`, `integer`, `decimal`, `date`, `display`. `choice` and `open-choice` need `"answerOption": [{"valueString": "option"}]`; add `"repeats": true` for multiple answers. Put units in the question text
- For a question asked only after "yes": `"enableWhen": [ { "question": "q5", "operator": "=", "answerBoolean": true } ]` (`question` must be an earlier `linkId`)
- Question text up to 200 characters; `aiNotes` up to 500

### Reception and how patients are taken

- **Fill these only when the staff member clearly states them. Do not guess.** Anything not written means "unknown" (not "no appointment needed" or "reception follows opening hours")
- `reception`: when reception opens (`opens`) and closes (`closes`); one of them is enough. Reception may open before the session starts. Turn wording like "until 30 minutes before closing" into a time (if the session ends at 12:00, `"closes": "11:30"`) and keep the original wording in `note`. The cut-off must not be after the end of the session
- `department`: the department these hours apply to, written as in `departments`. Leave it out if the row applies to the whole clinic
- `service`: what the hours are for, an array chosen from `general` (general outpatient), `checkup` (health checks), `vaccination`, `procedure` (procedures, tests), `rehabilitation`, `other`. Leave it out for general outpatient only
- `visitType`: `first` (first visits only), `return` (follow-up visits only) or `all` (both). Put the clinic's own definition of a first visit (for example "first visit if more than 3 months since the last one") in `note`
- `entry`: one of `walk-in` (patients without an appointment are seen; booked patients may go first), `appointment` (booked patients only) or `none` (no new patients; only continuing care, picking up prescriptions and the like)
- **`none` is not closed.** Do not turn a time with no new patients into a closure, and do not delete the row
- `mayEndEarly`: `true` only when reception may close earlier than the cut-off, for example when busy
- `weeksOfMonth`: which weeks of the month the row applies to. For example, Saturdays on the 2nd and 4th week only: `[2,4]`. Leave it out for every week. "2nd Saturday" means **the second Saturday of the month**. List the weeks the clinic is **open** (closed on the 2nd and 4th means `[1,3,5]`)
- Public holidays: add a row with `PH` in `days` only when the clinic is open on public holidays. If it is closed, add no `PH` row and say so in `closedNote`
- **Put rows for everyone in `openingHours` and narrowed rows in `scopedOpeningHours`.** A narrowed row has `department`, `service` (other than just `general`), `visitType` (`first` or `return`) or `weeksOfMonth`, or has `entry: "none"`. This keeps AI that only knows 0.4 from reading them as hours for everyone. If every row is narrowed, make `openingHours` an empty array `[]`
- When hours or how patients are taken differ by department, service or first/follow-up visit, **use separate rows**. Rows may overlap on the same day and time (the row with more specific conditions takes priority). But if **only the cut-off is earlier** (for example "first visits: check-in until 11:00"), do not add a shorter row: use a row with the usual hours plus `visitType` and `reception.closes` (a shorter row would let the usual row apply after 11:00)
- `clinic.appointmentRequired`: `true` only when the staff member clearly says the whole clinic is appointment only. Do not infer it from "appointments preferred". Leave it out if unsure
- Booking `hours`: when that channel (phone, online) takes bookings. An array of `days`, `opens`, `closes`
- Booking `mode`: one of `time-slot` (book a time), `queue` (take a place in today's queue) or `request` (send a request; the clinic's reply confirms it). `visitType` is the same as above
- Booking `statusUrl`: the URL of a page that shows the current queue or availability. Never write the current queue number or free slots themselves
- Booking `platform`: only when an outside company's service runs bookings, its `name` and `url`. Write entry points for AI (`endpoints`) only when the staff member clearly gives a URL the booking service publishes. Do not guess
- `handles`: the main ones, up to 15. A long list is not useful
- Do not write `verified` (date checked without changes) or `status` (closed or moved) here. They are set in the maker

After the JSON, add these two lines:

> Paste this into "Paste and check" in the Open Intake maker (https://open-intake.github.io/open-intake/en/maker/) and choose "Load into form". The maker adds the emergency warning signs for your region.
> Have a doctor review the questionnaire and emergency warning signs before publishing (then change status to "active").

Please start with the first question.

## End of the text to paste
