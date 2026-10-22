# Perbaikan Fundamental Evaluasi: Ekspansi Matriks Sepakbola & Modul Mutasi Posisi Ber-Histori

Rombak mekanisme posisi atlet pada `src/components/EvaluationSection.jsx` dengan menambahkan peran Midfielder / Playmaker, mengunci ubah posisi sembarangan pada form evaluasi, dan menyediakan **Modal Mutasi Posisi** resmi dengan pencatatan `positionHistory` ke Firestore.

---

## User Review & Critical Decisions

> [!NOTE] All requirements are explicitly specified. Recommended technical choices are summarized below.

- **Midfielder Role Added**: `'Midfielder / Playmaker'` added to `field.roles` with specific KPIs: `['Passing Range & Ball Retention', 'Box-to-Box Stamina & Pressing']`.
- **Locked Position UI**: Evaluation form position select replaced with a locked badge. If position is unset, evaluation save button is disabled until a position is set via mutation modal.
- **Position Mutation Modal**: Pop-up modal allowing coaches to change an athlete's position with an explicit reason (`mutationReason`).
- **Firestore `arrayUnion` Audit Trail**: Updates `students/{studentId}` with `playerRole`, `position`, and appends an entry to `positionHistory` array via `arrayUnion`.

---

## 1. Overview & Core Concept

- **What It Does**: Prevents accidental position changes during routine evaluation scoring. Position changes now require an explicit "Mutasi Posisi" action that records why the athlete was repositioned, keeping an audit trail in `students.positionHistory`.
- **Target Audience**: Head coaches and academy managers evaluating athlete development.
- **Key Value**: Preserves position integrity across evaluations and tracks historical position transitions (e.g., Flank to Playmaker).

---

## 2. User Experience & Visual Design

### Key User Flows & Visual Elements
1. **Locked Position Badge**: Displays current player role in a stylish locked badge with a lock icon.
2. **"🔄 Ganti Posisi" Button**: Triggers the position mutation modal.
3. **Mutation Modal**:
   - Title: "Mutasi Posisi Atlet"
   - Dropdown: Select new role from category roles list.
   - Textarea: "Alasan Perubahan / Catatan Mutasi" (e.g., "Melihat visi bermain yang menonjol saat babak kedua").
   - Action Buttons: "Batal" & "Simpan Mutasi Posisi".
4. **Validation Guard**: Disables the "Simpan Evaluasi" button when `selectedStudent.playerRole` is missing, showing a warning banner directing the coach to set a position first.

---

## 3. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       EvaluationSection.jsx                             │
│                                                                         │
│  ┌─────────────────────────┐             ┌───────────────────────────┐  │
│  │ Locked Position Badge   │────────────>│ Modal Mutasi Posisi       │  │
│  │ (selectedStudent.role)  │  [Click]    │ Dropdown + Reason         │  │
│  └────────────┬────────────┘             └─────────────┬─────────────┘  │
│               │                                        │                │
│               │ (if empty)                             │ [Save]         │
│               ▼                                        ▼                │
│  ┌─────────────────────────┐             ┌───────────────────────────┐  │
│  │ Disable Save Evaluation │             │ Firestore updateDoc       │  │
│  │ Show Warning Banner     │             │ students/{studentId}      │  │
│  └─────────────────────────┘             │ - playerRole, position    │  │
│                                          │ - positionHistory:        │  │
│                                          │   arrayUnion({...})       │  │
│                                          └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Firestore Student Schema Update (`students` collection):
```javascript
{
  playerRole: 'Midfielder / Playmaker',
  position: 'Midfielder / Playmaker',
  positionHistory: arrayUnion({
    oldRole: 'Flank / Winger',
    newRole: 'Midfielder / Playmaker',
    date: '2026-10-20T20:00:00.000Z',
    reason: 'Uji coba taktis visi bermain di lini tengah'
  })
}
```
