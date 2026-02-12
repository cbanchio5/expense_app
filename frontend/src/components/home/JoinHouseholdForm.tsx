import { FormEvent } from "react";

interface JoinHouseholdFormProps {
  householdCode: string;
  name: string;
  passcode: string;
  authLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onHouseholdCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onPasscodeChange: (value: string) => void;
}

export function JoinHouseholdForm({
  householdCode,
  name,
  passcode,
  authLoading,
  onSubmit,
  onHouseholdCodeChange,
  onNameChange,
  onPasscodeChange,
}: JoinHouseholdFormProps) {
  return (
    <form className="card auth-panel" onSubmit={onSubmit}>
      <h2>Join Existing Session</h2>
      <label htmlFor="join-household-code">Household code</label>
      <input
        id="join-household-code"
        type="text"
        placeholder="e.g. A1B2C3"
        value={householdCode}
        onChange={(event) => onHouseholdCodeChange(event.target.value)}
      />

      <label htmlFor="join-member-name">Your member name</label>
      <input
        id="join-member-name"
        type="text"
        placeholder="e.g. Jamie"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
      />

      <label htmlFor="join-passcode">Passcode</label>
      <input
        id="join-passcode"
        type="password"
        placeholder="Enter shared passcode"
        value={passcode}
        onChange={(event) => onPasscodeChange(event.target.value)}
      />

      <button type="submit" disabled={authLoading}>
        {authLoading ? "Joining..." : "Join session"}
      </button>
    </form>
  );
}
