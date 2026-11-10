import React, { useState } from 'react';
import { Screen, Gate, T, Field, Button, Notice, QueryState, Card } from '../../components/ui';
import { PageIntro } from '../../components/commerce';
import { useResource } from '../../hooks/data';
import { useSession } from '../../context/Session';
import { put, errorText } from '../../services/api';
function ProfileContent() {
  const profile = useResource('/profile');
  const { setUser } = useSession();
  const [edits, setEdits] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const form = profile.data
    ? { ...profile.data, dateOfBirth: profile.data.dateOfBirth?.slice(0, 10) || '', ...edits }
    : null;
  const field = (key) => (value) => {
    setEdits((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };
  const save = async () => {
    if (!form.fullName.trim()) return setError('Full name is required.');
    setBusy(true);
    setError('');
    try {
      const result = await put('/profile', {
        fullName: form.fullName,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || null,
        avatarUrl: form.avatarUrl || '',
      });
      setUser((u) => ({ ...u, fullName: result.fullName }));
      setSaved(true);
      profile.refetch();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <PageIntro
        eyebrow="PROFILE"
        title="Your details."
        description="Keep your pickup contact information up to date."
        icon="person-outline"
      />
      <QueryState query={profile}>
        {form ? (
          <Card>
            <T muted>{profile.data.email}</T>
            <Field
              label="Full name"
              value={form.fullName}
              onChangeText={field('fullName')}
              maxLength={100}
              autoCapitalize="words"
            />
            <Field
              label="Phone"
              value={form.phone}
              onChangeText={field('phone')}
              keyboardType="phone-pad"
            />
            <Field
              label="Date of birth (YYYY-MM-DD, optional)"
              value={form.dateOfBirth}
              onChangeText={field('dateOfBirth')}
              maxLength={10}
            />
            <Notice error>{error}</Notice>
            {saved ? (
              <Notice success>Profile saved. Your website profile is updated too.</Notice>
            ) : null}
            <Button title="Save profile" busy={busy} onPress={save} />
          </Card>
        ) : null}
      </QueryState>
    </Screen>
  );
}
export default function ProfileScreen() {
  return (
    <Gate>
      <ProfileContent />
    </Gate>
  );
}
export function PasswordScreen() {
  const [currentPassword, setCurrent] = useState(''),
    [newPassword, setNew] = useState(''),
    [confirmPassword, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false);
  const submit = async () => {
    setError('');
    setDone(false);
    if (newPassword.length < 8 || newPassword.length > 72 || newPassword !== confirmPassword)
      return setError('Use 8–72 characters and matching passwords.');
    setBusy(true);
    try {
      await put('/profile/password', { currentPassword, newPassword, confirmPassword });
      setCurrent('');
      setNew('');
      setConfirm('');
      setDone(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Gate>
      <Screen>
        <PageIntro
          eyebrow="ACCOUNT SECURITY"
          title="Keep it yours."
          description="Use a unique password with 8–72 characters."
          icon="lock-closed-outline"
        />
        <Card>
          <Field
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrent}
            secureTextEntry
          />
          <Field
            label="New password"
            value={newPassword}
            onChangeText={setNew}
            secureTextEntry
            maxLength={72}
          />
          <Field
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirm}
            secureTextEntry
            maxLength={72}
          />
          <Notice error>{error}</Notice>
          {done ? <Notice success>Password changed.</Notice> : null}
          <Button title="Change password" busy={busy} onPress={submit} />
        </Card>
      </Screen>
    </Gate>
  );
}
