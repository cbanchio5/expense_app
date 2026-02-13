import { FormEvent } from "react";

interface JoinHouseholdFormProps {
  householdName: string;
  name: string;
  passcode: string;
  authLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onHouseholdNameChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onPasscodeChange: (value: string) => void;
}

export function JoinHouseholdForm({
  householdName,
  name,
  passcode,
  authLoading,
  onSubmit,
  onHouseholdNameChange,
  onNameChange,
  onPasscodeChange,
}: JoinHouseholdFormProps) {
  return (
    <form className="auth-panel auth-panel-join" onSubmit={onSubmit}>
      <h2>Join Existing Household</h2>
      <label htmlFor="join-household-name">Household name</label>
      <input
        id="join-household-name"
        type="text"
        placeholder="e.g. Home Base"
        value={householdName}
        onChange={(event) => onHouseholdNameChange(event.target.value)}
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
