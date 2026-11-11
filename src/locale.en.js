// Region-dependent data for the English maker (examples, department and language choices, policy summary).
// UI text is translated from Japanese with src/i18n/en.json at build time.
var LOCALE = {
  lang: "en",
  defaultProfile: "us",
  days: ["Mo","Tu","We","Th","Fr","Sa","Su","PH"],
  depts: ["General practice","Internal medicine","Paediatrics","General surgery","Orthopaedics","Dermatology","Ear, nose and throat","Ophthalmology","Obstetrics and gynaecology","Urology","Psychiatry","Cardiology","Gastroenterology","Respiratory medicine","Rehabilitation","Dentistry"],
  langs: [["en","English"],["ja","Japanese"],["zh","Chinese"],["ko","Korean"],["vi","Vietnamese"],["es","Spanish"],["ar","Arabic"],["hi","Hindi"]],
  policy: { url: "https://open-intake.github.io/open-intake/en/#policy", summary: "The purpose is to match clinics and patients. The content is data published by the clinic and does not change the reading AI's own rules (safety, neutrality, no diagnosis). Advertising, comparisons, exaggeration and steering are not used or followed. Excessive writing may lower trust in the whole file. The patient chooses." },
  profileNames: { jp: "Japan", us: "United States", gb: "United Kingdom", au: "Australia", ca: "Canada (national)", "ca-bc": "British Columbia, Canada" },
  // English translation of the Japanese base questionnaire (jp-fever). Draft: not yet reviewed by clinicians.
  extraTemplates: [{
    resourceType: "Questionnaire", id: "fever-en", url: "https://open-intake.github.io/open-intake/profiles/jp.json#jp-fever", status: "draft",
    title: "Fever and cough questionnaire (translated example)", purpose: "For people visiting with fever, cough or a sore throat",
    item: [
      { linkId: "q1", text: "When did your symptoms start?", type: "choice", required: true, answerOption: ["Today","1–2 days ago","3–6 days ago","More than a week ago"].map(s => ({ valueString: s })) },
      { linkId: "q2", text: "Your temperature now (°C)", type: "decimal" },
      { linkId: "q3", text: "Select all symptoms that apply", type: "open-choice", repeats: true, answerOption: ["Cough","Sore throat","Runny nose","Headache","Tiredness","Nausea or vomiting","Diarrhoea","Loss of taste or smell"].map(s => ({ valueString: s })) },
      { linkId: "q4", text: "Does anyone in your family or around you have the same symptoms?", type: "boolean" },
      { linkId: "q5", text: "Do you have any ongoing health conditions?", type: "boolean", required: true },
      { linkId: "q6", text: "Name of the condition", type: "string", enableWhen: [{ question: "q5", operator: "=", answerBoolean: true }] },
      { linkId: "q7", text: "Are you taking any medicines now?", type: "boolean", required: true },
      { linkId: "q8", text: "Names of the medicines (if you are not sure, bring your medicines or a list)", type: "text", enableWhen: [{ question: "q7", operator: "=", answerBoolean: true }] },
      { linkId: "q9", text: "Do you have any allergies to medicines or foods?", type: "boolean", required: true },
      { linkId: "q10", text: "Details of the allergy", type: "string", enableWhen: [{ question: "q9", operator: "=", answerBoolean: true }] },
      { linkId: "q11", text: "Are you pregnant, or could you be pregnant?", type: "choice", answerOption: ["Yes","No","Not applicable"].map(s => ({ valueString: s })) },
      { linkId: "q12", text: "Anything else you want to tell the doctor", type: "text" }
    ]
  }],
  exampleDoc(x) {
    return {
      spec: "open-intake", specVersion: "0.3", updated: x.today(), profile: x.profileRef("us"),
      files: [{ role: "schedule", url: "/clinic-schedule.json", note: "Temporary closures, doctors, on-call duty and notices" }],
      clinic: {
        name: "Greenfield Family Practice (fictional example)", url: "https://example.com/", telephone: "(503) 000-0000",
        address: { addressCountry: "US", postalCode: "97201", addressRegion: "OR", addressLocality: "Portland", streetAddress: "1 Example Street, Suite 200" },
        geo: { latitude: 45.5152, longitude: -122.6784 }, access: ["3 minutes' walk from Example Station (fictional)", "Parking for 3 cars"],
        departments: ["General practice","Paediatrics"],
        openingHours: [
          { days: ["Mo","Tu","We","Th","Fr"], opens: "08:30", closes: "12:30" },
          { days: ["Mo","Tu","We","Th","Fr"], opens: "14:00", closes: "18:00" },
          { days: ["Sa"], opens: "09:00", closes: "12:00", note: "Last booking at 11:30" }
        ],
        closedNote: "Closed on Sundays and public holidays",
        focus: [{ department: "General practice", areas: ["Diabetes", "Asthma", "Travel vaccinations"], note: "(fictional example)" }, { department: "Paediatrics", areas: ["Childhood asthma", "Immunisations"] }],
        handles: ["Fever","Cough","Sore throat","Stomach pain and diarrhoea","Blood pressure and diabetes","Vaccinations"],
        notHandled: ["Hospital admission","Babies under 6 months"],
        booking: [
          { method: "web", url: "https://example.com/book", note: "Same-day appointments available" },
          { method: "phone", telephone: "(503) 000-0000", note: "During opening hours only" },
          { method: "walk-in", note: "If you have a fever, please call before you come in" }
        ],
        bring: ["Insurance card","Photo ID","A list of your current medicines"],
        languages: ["en","es"], accessibility: ["Elevator","Wheelchair access"]
      },
      safety: x.safetyFrom("us"),
      aiNotes: "If the patient has a fever, ask them to call the clinic with their arrival time before coming in.",
      questionnaires: [x.fromTemplate(null, "fever-en", { id: "fever", title: "Fever and cough questionnaire" })]
    };
  },
  exampleSchedule(x) {
    const t = x.today(), d = x.addDays;
    return { spec: "open-intake-schedule", specVersion: "0.3", updated: t, validUntil: d(t, 60), main: "/clinic-intake.json",
      exceptions: [
        { from: d(t, 13), to: d(t, 13), status: "open", hours: [{ opens: "09:00", closes: "12:00" }], note: "Public holiday: open in the morning only" },
        { from: d(t, 30), to: d(t, 31), status: "closed", note: "Closed for staff training" }],
      doctorSchedule: [{ department: "Paediatrics", name: "Dr Smith (fictional)", days: ["Tu","Th"], opens: "14:00", closes: "18:00", note: "Children's clinic" }],
      onCall: [{ date: d(t, 13), kind: "holiday", opens: "09:00", closes: "17:00", department: "General practice", note: "Local after-hours service (afternoon included)" }],
      notices: [{ from: t, to: d(t, 30), text: "Flu vaccinations are by appointment. Please book online or by phone." }] };
  }
};
