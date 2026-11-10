import React, { useState } from 'react';
import { Switch } from 'react-native';
import {
  Screen,
  Gate,
  T,
  Row,
  Card,
  Field,
  Button,
  Notice,
  QueryState,
  Empty,
} from '../../components/ui';
import { useResource } from '../../hooks/data';
import { post, put, remove, errorText } from '../../services/api';
import { PageIntro } from '../../components/commerce';
import { colors } from '../../theme/tokens';
const blank = { label: '', receiverName: '', phone: '', addressLine: '', isDefault: false };
function AddressesContent() {
  const addresses = useResource('/addresses');
  const [form, setForm] = useState(null),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (form._id) await put(`/addresses/${form._id}`, form);
      else await post('/addresses', form);
      setForm(null);
      await addresses.refetch();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <PageIntro eyebrow="ACCOUNT DETAILS" title="Your address book." icon="location-outline" />
      <Notice>Saved for your account. QUICK orders are collected in store.</Notice>
      <QueryState query={addresses}>
        {addresses.data?.length ? (
          addresses.data.map((a) => (
            <Card key={a._id}>
              <T heading>
                {a.label || a.receiverName}
                {a.isDefault ? ' · Default' : ''}
              </T>
              <T>
                {a.receiverName} · {a.phone}
              </T>
              <T muted>{a.addressLine}</T>
              <Row>
                <Button
                  title="Edit"
                  secondary
                  disabled={busy}
                  onPress={() => {
                    setForm(a);
                    setError('');
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Delete"
                  secondary
                  danger
                  disabled={busy}
                  onPress={() => setDeleting(a._id)}
                  style={{ flex: 1 }}
                />
              </Row>
              {deleting === a._id ? (
                <>
                  <T>Delete this saved address?</T>
                  <Row>
                    <Button
                      title="Confirm delete"
                      danger
                      busy={busy}
                      onPress={async () => {
                        setBusy(true);
                        try {
                          await remove(`/addresses/${a._id}`);
                          setDeleting(null);
                          if (form?._id === a._id) setForm(null);
                          addresses.refetch();
                        } catch (e) {
                          setError(errorText(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                    <Button title="Keep" secondary onPress={() => setDeleting(null)} />
                  </Row>
                </>
              ) : null}
            </Card>
          ))
        ) : (
          <Empty title="No saved addresses" />
        )}
      </QueryState>
      {!form ? (
        <Button
          title="Add address"
          disabled={(addresses.data?.length || 0) >= 10}
          onPress={() => {
            setForm({ ...blank });
            setError('');
          }}
        />
      ) : (
        <Card>
          <T heading>{form._id ? 'Edit address' : 'New address'}</T>
          {[
            ['label', 'Label (optional)', 50],
            ['receiverName', 'Receiver name', 100],
            ['phone', 'Phone', 20],
            ['addressLine', 'Address', 255],
          ].map(([key, title, max]) => (
            <Field
              key={key}
              label={title}
              value={form[key]}
              maxLength={max}
              keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
              onChangeText={(value) => setForm((f) => ({ ...f, [key]: value }))}
            />
          ))}
          <Row between>
            <T>Use as default</T>
            <Switch
              trackColor={{ false: colors.line, true: colors.blue }}
              accessibilityLabel="Use as default address"
              value={form.isDefault}
              onValueChange={(value) => setForm((f) => ({ ...f, isDefault: value }))}
            />
          </Row>
          <Button title="Save address" busy={busy} onPress={save} />
          <Button title="Cancel editing" secondary disabled={busy} onPress={() => setForm(null)} />
        </Card>
      )}
      <Notice error>{error}</Notice>
    </Screen>
  );
}
export default function AddressesScreen() {
  return (
    <Gate>
      <AddressesContent />
    </Gate>
  );
}
