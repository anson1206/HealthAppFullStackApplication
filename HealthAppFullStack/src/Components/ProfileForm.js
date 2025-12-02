import React, { useState } from 'react';
import { saveUser, getUser } from '../api/authService';
import { saveProfile } from '../api/authService';

export default function ProfileForm({ profile = {}, onSave }) {
  const [form, setForm] = useState({ ...profile });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSave = async () => {
    try {
      // persist locally
      saveUser(form);
      // if we have a backend user id, save to server
      const stored = getUser();
      if (stored && stored.uid) {
        await saveProfile({ userId: stored.uid, ...form });
      }
      if (onSave) onSave(form);
    } catch (err) {
      console.error('Failed to save profile to server', err);
      if (onSave) onSave(form);
    }
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-bold mb-4">Profile</h3>
      <div className="grid grid-cols-1 gap-3">
        <input name="name" value={form.name || ''} onChange={handleChange} placeholder="Name" className="px-3 py-2 border rounded" />
        <input name="email" value={form.email || ''} onChange={handleChange} placeholder="Email" className="px-3 py-2 border rounded" />
        <input name="age" value={form.age || ''} onChange={handleChange} placeholder="Age" type="number" className="px-3 py-2 border rounded" />
        <input name="weight" value={form.weight || ''} onChange={handleChange} placeholder="Weight (kg)" type="number" className="px-3 py-2 border rounded" />
        <div className="flex gap-2">
          <button onClick={handleSave} className="btn-brand px-4 py-2 rounded">Save Profile</button>
        </div>
      </div>
    </div>
  );
}
