// Fictional everything: the carrier, the aggregators, the partners and their restrictions are invented
// for this demo. The states are the real fifty plus DC, because a restriction is drawn on a real map.

export const CARRIER = "Lakeshore";

export const STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"],
  ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"],
  ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"],
  ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"],
  ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];
export const STATE_NAME = Object.fromEntries(STATES);

const AGGREGATORS = [
  { id: "pinebrook", name: "Pinebrook Network", prefix: "PB", size: 14 },
  { id: "harbor", name: "Harbor Exchange", prefix: "HX", size: 13 },
  { id: "crestview", name: "Crestview Alliance", prefix: "CV", size: 13 },
];

export const GROUPS = AGGREGATORS.map((a) => ({
  id: a.id, name: a.name,
  partners: Array.from({ length: a.size }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return { id: `${a.prefix}-${n}`, name: `Agency ${n}`, code: `${a.prefix}-${n}` };
  }),
}));

// The saved restrictions the demo opens with: a handful of partners barred in a handful of states,
// clustered on the coasts the way a carrier's appetite would be. Fixed, so every visit starts the same.
export const SAVED = {
  "PB-02": ["FL", "LA"], "PB-05": ["FL"], "PB-07": ["CA", "FL", "TX"], "PB-11": ["NY"], "PB-13": ["FL", "SC"],
  "HX-01": ["FL", "TX"], "HX-04": ["LA"], "HX-06": ["CA"], "HX-09": ["FL", "GA", "SC"], "HX-12": ["TX"],
  "CV-03": ["FL"], "CV-04": ["CA", "OR", "WA"], "CV-08": ["NJ", "NY"], "CV-10": ["FL", "LA", "MS"],
};

export const START_STATE = "FL";
