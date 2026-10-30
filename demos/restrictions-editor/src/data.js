// Fictional everything: the carrier, the aggregators, the partners and their restrictions are invented
// for this demo. Aggregators and partners carry codes and generic labels, never proper nouns, so none
// can collide with a real partner's name. The states are the real fifty plus DC, because a restriction is drawn on a real map.

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
  { id: "north", name: "Aggregator North", prefix: "AN", size: 14 },
  { id: "central", name: "Aggregator Central", prefix: "AC", size: 13 },
  { id: "south", name: "Aggregator South", prefix: "AS", size: 13 },
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
  "AN-02": ["FL", "LA"], "AN-05": ["FL"], "AN-07": ["CA", "FL", "TX"], "AN-11": ["NY"], "AN-13": ["FL", "SC"],
  "AC-01": ["FL", "TX"], "AC-04": ["LA"], "AC-06": ["CA"], "AC-09": ["FL", "GA", "SC"], "AC-12": ["TX"],
  "AS-03": ["FL"], "AS-04": ["CA", "OR", "WA"], "AS-08": ["NJ", "NY"], "AS-10": ["FL", "LA", "MS"],
};

export const START_STATE = "FL";
