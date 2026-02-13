import { FormEvent } from "react";

interface CreateHouseholdFormProps {
  householdName: string;
  memberOne: string;
  memberTwo: string;
  passcode: string;
  authLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onHouseholdNameChange: (value: string) => void;
  onMemberOneChange: (value: string) => void;
  onMemberTwoChange: (value: string) => void;
  onPasscodeChange: (value: string) => void;
}

export function CreateHouseholdForm({
  householdName,
  memberOne,
  memberTwo,
  passcode,
  authLoading,
  onSubmit,
  onHouseholdNameChange,
  onMemberOneChange,
  onMemberTwoChange,
  onPasscodeChange,
}: CreateHouseholdFormProps) {
  return (
    <form className="auth-panel auth-panel-create" onSubmit={onSubmit}>
      <h2>Create Household Session</h2>
      <label htmlFor="household-name">Household name</label>
      <input
        id="household-name"
        type="text"
        placeholder="e.g. Home Base"
        value={householdName}
        onChange={(event) => onHouseholdNameChange(event.target.value)}
      />

      <label htmlFor="member-one-name">Member one name</label>
      <input
        id="member-one-name"
        type="text"
        placeholder="e.g. Alex"
        value={memberOne}
        onChange={(event) => onMemberOneChange(event.target.value)}
      />

      <label htmlFor="member-two-name">Member two name</label>
      <input
        id="member-two-name"
        type="text"
        placeholder="e.g. Jamie"
        value={memberTwo}
        onChange={(event) => onMemberTwoChange(event.target.value)}
      />

      <label htmlFor="create-passcode">Passcode</label>
      <input
        id="create-passcode"
        type="password"
        placeholder="Create shared passcode"
        value={passcode}
        onChange={(event) => onPasscodeChange(event.target.value)}
      />

      <button type="submit" disabled={authLoading}>
        {authLoading ? "Creating..." : "Create session"}
      </button>
    </form>
  );
}
