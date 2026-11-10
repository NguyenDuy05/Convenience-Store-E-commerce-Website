import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, T, Row, Chip, Field, Button, Notice, Card } from '../../components/ui';
import { Brand } from '../../components/commerce';
import { BrandScene } from '../onboarding/WelcomeFlow';
import { useSession } from '../../context/Session';
import { post, errorText } from '../../services/api';
import { internalDestination } from '../../utils/domain';

export default function AuthScreen() {
  const { next, mode: initialMode } = useLocalSearchParams();
  const { signIn } = useSession();
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [fullName, setName] = useState(''),
    [phone, setPhone] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const submit = async () => {
    if (busy) return;
    setError('');
    setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError('Enter a valid email address.');
    if (mode !== 'forgot' && (password.length < 8 || password.length > 72))
      return setError('Use a password with 8–72 characters.');
    if (mode === 'register' && !fullName.trim()) return setError('Enter your full name.');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const out = await post('/auth/forgot-password', { email: email.trim() });
        setNotice(out.message);
      } else {
        await signIn(`/auth/${mode}`, {
          email: email.trim(),
          password,
          ...(mode === 'register' ? { fullName: fullName.trim(), phone: phone.trim() } : {}),
        });
        router.dismissTo(internalDestination(next));
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Brand />
      <BrandScene compact step={mode === 'forgot' ? 1 : 0} />
      <T title>
        {mode === 'register'
          ? 'A little more QUICK.'
          : mode === 'forgot'
            ? 'Let’s get you back in.'
            : 'Welcome back.'}
      </T>
      <T muted>
        {mode === 'register'
          ? 'Your favorites, rewards and happy pickups start here.'
          : mode === 'forgot'
            ? 'We’ll email you a link to reset your password.'
            : 'Log in for your bag, rewards and next pickup.'}
      </T>
      <Card>
        <Row>
          {[
            ['login', 'Log in'],
            ['register', 'Sign up'],
          ].map(([key, text]) => (
            <Chip
              key={key}
              title={text}
              selected={key === mode}
              onPress={() => {
                setMode(key);
                setError('');
                setNotice('');
              }}
            />
          ))}
        </Row>
        {mode === 'register' ? (
          <>
            <Field
              label="Full name"
              value={fullName}
              onChangeText={setName}
              autoCapitalize="words"
              maxLength={100}
              autoComplete="name"
            />
            <Field
              label="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </>
        ) : null}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        {mode !== 'forgot' ? (
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            maxLength={72}
            onSubmitEditing={submit}
          />
        ) : null}
        <Notice error>{error}</Notice>
        <Notice success>{notice}</Notice>
        <Button
          title={
            mode === 'register'
              ? 'Create account'
              : mode === 'forgot'
                ? 'Send reset link'
                : 'Log in'
          }
          busy={busy}
          onPress={submit}
        />
        {mode === 'login' ? (
          <Button title="Forgot password?" secondary onPress={() => setMode('forgot')} />
        ) : null}
        {mode === 'forgot' ? (
          <View style={{ gap: 12 }}>
            <T muted>
              Open the reset email to change your password on the website, then return here to log
              in. You can also paste the reset link in the app.
            </T>
            <Button
              title="I have a reset link"
              secondary
              onPress={() => router.push('/reset-password')}
            />
          </View>
        ) : null}
      </Card>
      <Button title="Continue exploring" secondary onPress={() => router.dismissTo('/explore')} />
    </Screen>
  );
}
export function ResetScreen() {
  const params = useLocalSearchParams();
  const [token, setToken] = useState(String(params.token || '')),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false);
  const submit = async () => {
    if (password.length < 8 || password.length > 72 || password !== confirm)
      return setError('Use 8–72 characters and make sure both passwords match.');
    let value = token.trim();
    try {
      if (value.includes('://')) value = new URL(value).searchParams.get('token') || '';
    } catch {
      return setError('Enter a valid reset link or token.');
    }
    if (!value) return setError('Enter the reset token from your email.');
    setBusy(true);
    setError('');
    try {
      await post('/auth/reset-password', { token: value, password });
      setToken('');
      setPassword('');
      setConfirm('');
      setDone(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Brand />
      <T title>Make a fresh start.</T>
      <T muted>Choose a strong password to keep your QUICK account safe.</T>
      <Card>
        {done ? (
          <>
            <Notice success>Your password is updated.</Notice>
            <Button title="Back to login" onPress={() => router.replace('/login')} />
          </>
        ) : (
          <>
            <Field
              label="Reset link or token"
              value={token}
              onChangeText={setToken}
              secureTextEntry
            />
            <Field
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              maxLength={72}
            />
            <Field
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              maxLength={72}
            />
            <Notice error>{error}</Notice>
            <Button title="Reset password" busy={busy} onPress={submit} />
          </>
        )}
      </Card>
    </Screen>
  );
}
