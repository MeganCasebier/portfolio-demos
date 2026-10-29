// Fictional everything: carriers, fields, thresholds and reason codes are invented for this demo.
export const CARRIERS = ["Lakeshore", "Pinebrook", "Harbor"];

export const TABLE = {
  group: "Loss history", carriers: ["Lakeshore", "Pinebrook"], line: "Homeowners", type: "Eligibility",
  inputs: [
    { key: "riskScore", label: "Risk score", kind: "grade" },
    { key: "lossCount", label: "Losses, 3 yrs", kind: "number" },
    { key: "lossAmount", label: "Largest loss", kind: "number" },
  ],
  rows: [
    { when: { riskScore: '== "C"', lossCount: ">= 2" }, then: { decision: "Refer", reason: "LOW_SCORE_WITH_LOSSES" } },
    { when: { riskScore: '== "D"' }, then: { decision: "Refer", reason: "LOW_SCORE" } },
    { when: { lossCount: ">= 4" }, then: { decision: "Decline", reason: "FREQUENT_LOSSES" } },
    { when: { lossAmount: "> 50000" }, then: { decision: "Refer", reason: "LARGE_LOSS" } },
    { when: { riskScore: '== "F"' }, then: { decision: "Decline", reason: "VERY_LOW_SCORE" } },
  ],
};

export const TESTS = [
  { name: "Score C, two losses", inputs: { riskScore: "C", lossCount: 2, lossAmount: 8000 }, expect: { decision: "Refer", reasons: ["LOW_SCORE_WITH_LOSSES"] } },
  { name: "Score A, no losses", inputs: { riskScore: "A", lossCount: 0, lossAmount: 0 }, expect: { decision: "Accept", reasons: [] } },
  { name: "Score B, four losses", inputs: { riskScore: "B", lossCount: 4, lossAmount: 12000 }, expect: { decision: "Decline", reasons: ["FREQUENT_LOSSES"] } },
  { name: "One large loss", inputs: { riskScore: "B", lossCount: 1, lossAmount: 72000 }, expect: { decision: "Refer", reasons: ["LARGE_LOSS"] } },
  { name: "Score D, one loss", inputs: { riskScore: "D", lossCount: 1, lossAmount: 3000 }, expect: { decision: "Refer", reasons: ["LOW_SCORE"] } },
  { name: "Score F", inputs: { riskScore: "F", lossCount: 0, lossAmount: 0 }, expect: { decision: "Decline", reasons: ["VERY_LOW_SCORE"] } },
];

// The group list. Only "Loss history" is built in full; the rest exist so the filters have
// something real to narrow.
export const GROUPS = [
  { id: "loss-history", name: "Loss history", type: "Eligibility", line: "Homeowners", carriers: ["Lakeshore", "Pinebrook"], rules: 5, version: "2.1", status: "Active", full: true },
  { id: "dwelling-use", name: "Dwelling use", type: "Eligibility", line: "Homeowners", carriers: ["Lakeshore", "Harbor"], rules: 4, version: "1.3", status: "Active" },
  { id: "replacement-cost", name: "Replacement cost", type: "Eligibility", line: "Homeowners", carriers: ["Pinebrook"], rules: 6, version: "3.0", status: "In QA" },
  { id: "roof-condition", name: "Roof condition", type: "Inspection", line: "Homeowners", carriers: ["Harbor"], rules: 3, version: "1.1", status: "Draft" },
  { id: "prior-losses", name: "Prior losses", type: "Loss review", line: "Landlord", carriers: ["Lakeshore"], rules: 4, version: "2.0", status: "Ready for approval" },
  { id: "vacancy", name: "Vacancy", type: "Inspection", line: "Landlord", carriers: ["Pinebrook", "Harbor"], rules: 2, version: "1.0", status: "Active" },
];

export const FILTERS = {
  carrier: ["All carriers", ...CARRIERS],
  line: ["All lines", "Homeowners", "Landlord"],
  type: ["All types", "Eligibility", "Inspection", "Loss review"],
};

// Version history for the built group. The newest Active version is the one on screen.
export const VERSIONS = [
  { version: "2.1", status: "Active", by: "Underwriting lead", date: "Sep 30", note: "Large-loss referral raised to over 50,000" },
  { version: "2.0", status: "Inactive", by: "Underwriting lead", date: "Jul 14", note: "Added the frequent-losses decline" },
  { version: "1.0", status: "Inactive", by: "Engineering", date: "Feb 2", note: "Initial release" },
];

// Fictional approvers, named because the record names a person.
export const APPROVERS = ["Jordan Hale", "Priya Nandakumar", "Theo Marchetti"];

export const STATUSES = ["Draft", "In QA", "Ready for approval", "Active", "Inactive"];
export const REASONS = TABLE.rows.map((r) => r.then.reason);
