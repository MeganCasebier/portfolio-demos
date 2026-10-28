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
