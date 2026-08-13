import fixtureFile from "../fixtures/cases.json";
import type {
  ApplicationFields,
  CheckStatus,
  ExtractedLabel,
  FieldKey,
} from "./types";

export interface FixtureExpected {
  overall: CheckStatus;
  fields: Partial<Record<FieldKey, CheckStatus>>;
  warning: CheckStatus;
}

export interface FixtureCase {
  id: string;
  title: string;
  image: string;
  notes: string;
  application: ApplicationFields;
  extraction: ExtractedLabel;
  expected: FixtureExpected;
}

export const FIXTURES: FixtureCase[] = fixtureFile.cases as FixtureCase[];

export function getFixture(id: string): FixtureCase | undefined {
  return FIXTURES.find((fixture) => fixture.id === id);
}
