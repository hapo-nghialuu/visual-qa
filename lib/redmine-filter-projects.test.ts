import { describe, expect, it } from "vitest";
import { filterProjectsByQuery, type RedmineProjectRow } from "@/lib/redmine-filter-projects";

const sample: RedmineProjectRow[] = [
  { id: 1, name: "Alpha Visual", identifier: "alpha-visual" },
  { id: 2, name: "Beta", identifier: "beta_qa" },
  { id: 3, name: "Gamma", identifier: "visual-qa" },
];

describe("filterProjectsByQuery", () => {
  it("matches name substring", () => {
    expect(filterProjectsByQuery(sample, "visual")).toEqual([
      sample[0],
      sample[2],
    ]);
  });

  it("matches identifier", () => {
    expect(filterProjectsByQuery(sample, "beta")).toEqual([sample[1]]);
  });

  it("empty query returns first slice", () => {
    expect(filterProjectsByQuery(sample, "", 2)).toEqual([sample[0], sample[1]]);
  });
});
