import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Pencil,
  Plus,
  Shield,
  TriangleAlert,
  User,
  Users,
  X,
} from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { initials } from "../utils/inventoryMetrics";

const emptyAssistant = {
  name: "",
  username: "",
  password: "",
  role: "assistant",
};

function splitName(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function joinName(firstName, lastName) {
  return [firstName, lastName].map((s) => String(s || "").trim()).filter(Boolean).join(" ");
}

export default function OwnerSettings() {
  const { user, updateProfile, changePassword } = useAuth();
  const isOwner = user?.role === "owner";

  const tabs = useMemo(() => {
    const list = [
      { id: "profile", label: "My Profile", icon: User },
      { id: "security", label: "Security", icon: Shield },
    ];
    if (isOwner) list.push({ id: "team", label: "Team Members", icon: Users });
    return list;
  }, [isOwner]);

  const [tab, setTab] = useState("profile");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    username: "",
    role: user?.role || "assistant",
  });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [staff, setStaff] = useState([]);
  const [staffError, setStaffError] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [assistant, setAssistant] = useState(emptyAssistant);
  const [assistantMsg, setAssistantMsg] = useState("");
  const [assistantError, setAssistantError] = useState("");
  const [savingAssistant, setSavingAssistant] = useState(false);

  useEffect(() => {
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (!data) return;
        const { firstName, lastName } = splitName(data.name || "");
        setProfile({
          firstName,
          lastName,
          username: data.username || "",
          role: data.role || "assistant",
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    api
      .get("/auth/users")
      .then(({ data }) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaffError("Couldn't load staff list."));
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner && tab === "team") setTab("profile");
  }, [isOwner, tab]);

  const displayName =
    joinName(profile.firstName, profile.lastName) || user?.name || "Account";
  const roleLabel = profile.role === "owner" ? "Owner" : "Assistant";

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");
    setSavingProfile(true);
    try {
      await updateProfile({
        name: joinName(profile.firstName, profile.lastName),
        username: profile.username.trim(),
      });
      setProfileMsg("Profile updated.");
      setEditingProfile(false);
      setEditingAccount(false);
    } catch (err) {
      setProfileError(err.response?.data?.message || "Couldn't update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordError("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMsg("Password changed. Use it next time you sign in.");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Couldn't change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleAssistant(e) {
    e.preventDefault();
    setAssistantMsg("");
    setAssistantError("");
    setSavingAssistant(true);
    try {
      const { data } = await api.post("/auth/users", {
        name: assistant.name.trim(),
        username: assistant.username.trim(),
        password: assistant.password,
        role: assistant.role,
      });
      setStaff((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setAssistant(emptyAssistant);
      setShowAddUser(false);
      setAssistantMsg(`Created ${data.role}: ${data.username}`);
    } catch (err) {
      setAssistantError(err.response?.data?.message || "Couldn't create user.");
    } finally {
      setSavingAssistant(false);
    }
  }

  return (
    <AppShell breadcrumb="Settings / Account">
      <section className="acct-page">
        <header className="acct-page__title">
          <h1>Account Settings</h1>
        </header>

        <div className="acct-layout">
          <nav className="acct-nav" aria-label="Settings sections">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`acct-nav__item ${tab === item.id ? "is-active" : ""}`}
                  onClick={() => setTab(item.id)}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="acct-main">
            {tab === "profile" && (
              <>
                <article className="acct-card acct-card--hero">
                  <div className="acct-hero">
                    <div className="acct-avatar" aria-hidden="true">
                      {initials(displayName)}
                    </div>
                    <div>
                      <h2>{displayName}</h2>
                      <p className="muted">
                        {roleLabel} · Outstretched Arm Enterprise
                      </p>
                      <p className="muted">@{profile.username || "—"}</p>
                    </div>
                  </div>
                </article>

                <article className="acct-card">
                  <header className="acct-card__head">
                    <h3>Personal Information</h3>
                    <button
                      type="button"
                      className="acct-edit"
                      onClick={() => setEditingProfile((v) => !v)}
                    >
                      {editingProfile ? <X size={14} /> : <Pencil size={14} />}
                      {editingProfile ? "Cancel" : "Edit"}
                    </button>
                  </header>

                  {profileError && (
                    <div className="alert alert--error" role="alert">
                      <TriangleAlert size={18} strokeWidth={1.75} />
                      <span>{profileError}</span>
                    </div>
                  )}
                  {profileMsg && <p className="acct-success">{profileMsg}</p>}

                  {editingProfile ? (
                    <form className="acct-form" onSubmit={handleProfileSave}>
                      <div className="acct-fields">
                        <div className="field">
                          <label className="label" htmlFor="first-name">
                            First Name
                          </label>
                          <div className="input">
                            <input
                              id="first-name"
                              value={profile.firstName}
                              onChange={(e) =>
                                setProfile({ ...profile, firstName: e.target.value })
                              }
                              required
                            />
                          </div>
                        </div>
                        <div className="field">
                          <label className="label" htmlFor="last-name">
                            Last Name
                          </label>
                          <div className="input">
                            <input
                              id="last-name"
                              value={profile.lastName}
                              onChange={(e) =>
                                setProfile({ ...profile, lastName: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="btn btn--primary btn--inline"
                        disabled={savingProfile}
                      >
                        {savingProfile ? "Saving..." : "Save"}
                      </button>
                    </form>
                  ) : (
                    <div className="acct-fields">
                      <div className="acct-field">
                        <span className="acct-field__label">First Name</span>
                        <span className="acct-field__value">
                          {profile.firstName || "—"}
                        </span>
                      </div>
                      <div className="acct-field">
                        <span className="acct-field__label">Last Name</span>
                        <span className="acct-field__value">
                          {profile.lastName || "—"}
                        </span>
                      </div>
                      <div className="acct-field">
                        <span className="acct-field__label">Role</span>
                        <span className="acct-field__value">{roleLabel}</span>
                      </div>
                      <div className="acct-field">
                        <span className="acct-field__label">Business</span>
                        <span className="acct-field__value">
                          Outstretched Arm Enterprise
                        </span>
                      </div>
                    </div>
                  )}
                </article>

                <article className="acct-card">
                  <header className="acct-card__head">
                    <h3>Account</h3>
                    <button
                      type="button"
                      className="acct-edit"
                      onClick={() => setEditingAccount((v) => !v)}
                    >
                      {editingAccount ? <X size={14} /> : <Pencil size={14} />}
                      {editingAccount ? "Cancel" : "Edit"}
                    </button>
                  </header>

                  {editingAccount ? (
                    <form className="acct-form" onSubmit={handleProfileSave}>
                      <div className="acct-fields">
                        <div className="field">
                          <label className="label" htmlFor="account-username">
                            Username
                          </label>
                          <div className="input">
                            <input
                              id="account-username"
                              value={profile.username}
                              onChange={(e) =>
                                setProfile({ ...profile, username: e.target.value })
                              }
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="btn btn--primary btn--inline"
                        disabled={savingProfile}
                      >
                        {savingProfile ? "Saving..." : "Save"}
                      </button>
                    </form>
                  ) : (
                    <div className="acct-fields">
                      <div className="acct-field">
                        <span className="acct-field__label">Username</span>
                        <span className="acct-field__value">
                          {profile.username || "—"}
                        </span>
                      </div>
                      <div className="acct-field">
                        <span className="acct-field__label">Login role</span>
                        <span className="acct-field__value">{roleLabel}</span>
                      </div>
                      <div className="acct-field">
                        <span className="acct-field__label">App</span>
                        <span className="acct-field__value">Regimens</span>
                      </div>
                      <div className="acct-field">
                        <span className="acct-field__label">Access</span>
                        <span className="acct-field__value">
                          {isOwner ? "Full owner access" : "Assistant access"}
                        </span>
                      </div>
                    </div>
                  )}
                </article>
              </>
            )}

            {tab === "security" && (
              <article className="acct-card">
                <header className="acct-card__head">
                  <h3>Security</h3>
                  <KeyRound size={16} strokeWidth={1.75} />
                </header>
                <p className="muted" style={{ marginBottom: 16 }}>
                  Change your password regularly. New passwords must be at least 8 characters.
                </p>

                {passwordError && (
                  <div className="alert alert--error" role="alert">
                    <TriangleAlert size={18} strokeWidth={1.75} />
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordMsg && <p className="acct-success">{passwordMsg}</p>}

                <form className="acct-form" onSubmit={handlePassword}>
                  <div className="acct-fields acct-fields--security">
                    <div className="field">
                      <label className="label" htmlFor="current-password">
                        Current password
                      </label>
                      <div className="input">
                        <input
                          id="current-password"
                          type="password"
                          autoComplete="current-password"
                          value={passwords.currentPassword}
                          onChange={(e) =>
                            setPasswords({ ...passwords, currentPassword: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="new-password">
                        New password
                      </label>
                      <div className="input">
                        <input
                          id="new-password"
                          type="password"
                          autoComplete="new-password"
                          value={passwords.newPassword}
                          onChange={(e) =>
                            setPasswords({ ...passwords, newPassword: e.target.value })
                          }
                          minLength={8}
                          required
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="confirm-password">
                        Confirm new password
                      </label>
                      <div className="input">
                        <input
                          id="confirm-password"
                          type="password"
                          autoComplete="new-password"
                          value={passwords.confirmPassword}
                          onChange={(e) =>
                            setPasswords({ ...passwords, confirmPassword: e.target.value })
                          }
                          minLength={8}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn--primary btn--inline"
                    disabled={savingPassword}
                  >
                    {savingPassword ? "Updating..." : "Update password"}
                  </button>
                </form>
              </article>
            )}

            {tab === "team" && isOwner && (
              <>
                <article className="acct-card">
                  <header className="acct-card__head">
                    <h3>Team Members</h3>
                    <button
                      type="button"
                      className="acct-edit"
                      onClick={() => setShowAddUser((v) => !v)}
                    >
                      {showAddUser ? <X size={14} /> : <Plus size={14} />}
                      {showAddUser ? "Cancel" : "Add"}
                    </button>
                  </header>

                  {staffError && (
                    <div className="alert alert--error" role="alert">
                      <TriangleAlert size={18} strokeWidth={1.75} />
                      <span>{staffError}</span>
                    </div>
                  )}
                  {assistantMsg && <p className="acct-success">{assistantMsg}</p>}

                  <ul className="acct-team-list">
                    {staff.map((member) => (
                      <li key={member.id}>
                        <div className="acct-team-avatar" aria-hidden="true">
                          {initials(member.name)}
                        </div>
                        <div>
                          <strong>{member.name}</strong>
                          <p className="muted">
                            @{member.username} · {member.role}
                          </p>
                        </div>
                      </li>
                    ))}
                    {staff.length === 0 && !staffError && (
                      <li className="muted">No team members yet.</li>
                    )}
                  </ul>
                </article>

                {showAddUser && (
                  <article className="acct-card">
                    <header className="acct-card__head">
                      <h3>Add team member</h3>
                    </header>
                    {assistantError && (
                      <div className="alert alert--error" role="alert">
                        <TriangleAlert size={18} strokeWidth={1.75} />
                        <span>{assistantError}</span>
                      </div>
                    )}
                    <form className="acct-form" onSubmit={handleAssistant}>
                      <div className="acct-fields">
                        <div className="field">
                          <label className="label" htmlFor="assistant-name">
                            Full name
                          </label>
                          <div className="input">
                            <input
                              id="assistant-name"
                              value={assistant.name}
                              onChange={(e) =>
                                setAssistant({ ...assistant, name: e.target.value })
                              }
                              required
                            />
                          </div>
                        </div>
                        <div className="field">
                          <label className="label" htmlFor="assistant-username">
                            Username
                          </label>
                          <div className="input">
                            <input
                              id="assistant-username"
                              value={assistant.username}
                              onChange={(e) =>
                                setAssistant({ ...assistant, username: e.target.value })
                              }
                              required
                            />
                          </div>
                        </div>
                        <div className="field">
                          <label className="label" htmlFor="assistant-password">
                            Temporary password
                          </label>
                          <div className="input">
                            <input
                              id="assistant-password"
                              type="password"
                              value={assistant.password}
                              onChange={(e) =>
                                setAssistant({ ...assistant, password: e.target.value })
                              }
                              minLength={8}
                              required
                            />
                          </div>
                        </div>
                        <div className="field">
                          <label className="label" htmlFor="assistant-role">
                            Role
                          </label>
                          <div className="input">
                            <select
                              id="assistant-role"
                              value={assistant.role}
                              onChange={(e) =>
                                setAssistant({ ...assistant, role: e.target.value })
                              }
                              style={{
                                width: "100%",
                                border: 0,
                                outline: 0,
                                background: "transparent",
                                font: "inherit",
                                color: "inherit",
                              }}
                            >
                              <option value="assistant">Assistant</option>
                              <option value="owner">Owner</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="btn btn--primary btn--inline"
                        disabled={savingAssistant}
                      >
                        <Plus size={16} strokeWidth={1.75} />
                        {savingAssistant ? "Creating..." : "Create user"}
                      </button>
                    </form>
                  </article>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
