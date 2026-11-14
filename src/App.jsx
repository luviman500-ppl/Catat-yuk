import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';

// Inisialisasi Firebase langsung di dalam App.jsx agar tidak perlu file terpisah
const firebaseConfig = {
  apiKey: 'AIzaSyCatatYukF7daa',
  authDomain: 'catat-yuk-f7daa.firebaseapp.com',
  projectId: 'catat-yuk-f7daa'
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const BASE_CATEGORIES = [
  'Tagihan',
  'Makanan',
  'Belanja',
  'Transportasi',
  'Kesehatan',
  'Pendidikan',
  'Lainnya'
];

const INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Freelance', 'Hadiah', 'Lainnya'];

const DEFAULT_TEMPLATES = [
  { title: 'Tagihan Wi-Fi', amount: 300000, category: 'Tagihan', user: 'Papa' },
  { title: 'Listrik & Air', amount: 250000, category: 'Tagihan', user: 'Papa' },
  { title: 'Bensin & Tol', amount: 100000, category: 'Transportasi', user: 'Papa' },
  { title: 'Belanja Bulanan', amount: 500000, category: 'Belanja', user: 'Mama' }
];

export default function App() {
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD waktu lokal
  const [selectedMonth, setSelectedMonth] = useState(todayStr.slice(0, 7)); // YYYY-MM
  const [activeTab, setActiveTab] = useState('beranda');
  const [toastMsg, setToastMsg] = useState('');

  // Data Firestore
  const [transactions, setTransactions] = useState([]);
  const [quickTemplates, setQuickTemplates] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [initialBalances, setInitialBalances] = useState({});
  const [debts, setDebts] = useState([]);

  // Modal Edit & Tambah Template Tagihan Cepat
  const [isTmplModalOpen, setIsTmplModalOpen] = useState(false);
  const [editingTmplId, setEditingTmplId] = useState(null);
  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplAmount, setTmplAmount] = useState('');
  const [tmplCategory, setTmplCategory] = useState('Tagihan');
  const [isNewTmplCat, setIsNewTmplCat] = useState(false);
  const [customTmplCat, setCustomTmplCat] = useState('');
  const [tmplUser, setTmplUser] = useState('Papa');
  const tmplModalRef = useRef(null);

  // Modal Tambah Transaksi Manual (+)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState('expense');
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Makanan');
  const [isNewTxCat, setIsNewTxCat] = useState(false);
  const [customTxCat, setCustomTxCat] = useState('');
  const [txUser, setTxUser] = useState('Papa');
  const [txDate, setTxDate] = useState(todayStr);

  // Modal Saldo Awal & Utang Piutang
  const [isSaldoModalOpen, setIsSaldoModalOpen] = useState(false);
  const [saldoInput, setSaldoInput] = useState('');
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState('utang'); // utang | piutang

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Sinkronisasi Real-Time Firestore
  useEffect(() => {
    // 1. Transaksi (tanpa orderBy Firestore agar data lama tanpa createdAt tetap terbaca)
    const unsubTx = onSnapshot(collection(db, 'transactions'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        if (a.date !== b.date) return (b.date || '').localeCompare(a.date || '');
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setTransactions(list);
    });

    // 2. Template Tagihan Cepat + Seed Awal jika kosong
    const tmplRef = collection(db, 'quick_templates');
    getDocs(tmplRef).then(async (snap) => {
      if (snap.empty && !localStorage.getItem('catat_tmpl_seeded_v1')) {
        for (const item of DEFAULT_TEMPLATES) {
          await addDoc(tmplRef, item);
        }
        localStorage.setItem('catat_tmpl_seeded_v1', 'true');
      }
    });

    const unsubTmpl = onSnapshot(tmplRef, (snap) => {
      setQuickTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 3. Anggaran & Saldo Awal
    const unsubBudgets = onSnapshot(collection(db, 'budgets'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = Number(d.data().limit || 0);
      });
      setBudgets(map);
    });

    const unsubSettings = onSnapshot(collection(db, 'settings'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = Number(d.data().amount || 0);
      });
      setInitialBalances(map);
    });

    // 4. Utang & Piutang
    const unsubDebts = onSnapshot(collection(db, 'debts'), (snap) => {
      setDebts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubTx();
      unsubTmpl();
      unsubBudgets();
      unsubSettings();
      unsubDebts();
    };
  }, []);

  // Daftar semua kategori pengeluaran (bawaan + kategori kustom dari template/transaksi)
  const allExpenseCategories = Array.from(
    new Set([
      ...BASE_CATEGORIES,
      ...quickTemplates.map((t) => t.category).filter(Boolean),
      ...transactions.filter((t) => t.type === 'expense').map((t) => t.category).filter(Boolean)
    ])
  );

  // Filter Transaksi Bulan Terpilih & Hari Ini
  const monthTransactions = transactions.filter((t) => (t.date || '').startsWith(selectedMonth));
  const todayTransactions = transactions.filter((t) => t.date === todayStr);

  const todayIncome = todayTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const todayExpense = todayTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const saldoAwal = initialBalances[selectedMonth] || 0;
  const totalMasuk = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalKeluar = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalSaldo = saldoAwal + totalMasuk - totalKeluar;

  // Perbandingan Papa vs Mama
  const papaExpense = monthTransactions
    .filter((t) => t.type === 'expense' && (t.user === 'Papa' || !t.user))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const mamaExpense = monthTransactions
    .filter((t) => t.type === 'expense' && t.user === 'Mama')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalCoupleExpense = papaExpense + mamaExpense;
  const papaPct = totalCoupleExpense > 0 ? Math.round((papaExpense / totalCoupleExpense) * 100) : 0;
  const mamaPct = totalCoupleExpense > 0 ? 100 - papaPct : 0;

  // Perhitungan Anggaran
  const totalBudgetLimit = Object.values(budgets).reduce((s, v) => s + Number(v || 0), 0);
  const sisaTotalAnggaran = totalBudgetLimit - totalKeluar;

  // Navigasi Bulan
  const changeMonth = (delta) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextMonth);
  };

  // === HANDLER TEMPLATE TAGIHAN CEPAT ===
  const handleQuickCatat = async (tmpl) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        title: tmpl.title,
        amount: Number(tmpl.amount),
        type: 'expense',
        category: tmpl.category || 'Tagihan',
        user: tmpl.user || 'Papa',
        paymentMethod: 'Tunai',
        date: todayStr,
        createdAt: serverTimestamp()
      });
      showToast(`✅ Dicatat: ${tmpl.title} (Rp ${Number(tmpl.amount).toLocaleString('id-ID')})`);
    } catch (err) {
      console.error(err);
      showToast('❌ Gagal mencatat transaksi');
    }
  };

  const openEditTemplate = (tmpl) => {
    setEditingTmplId(tmpl.id);
    setTmplTitle(tmpl.title);
    setTmplAmount(tmpl.amount);
    setTmplCategory(tmpl.category || 'Tagihan');
    setTmplUser(tmpl.user || 'Papa');
    setIsNewTmplCat(false);
    setCustomTmplCat('');
    setIsTmplModalOpen(true);

    setTimeout(() => {
      if (tmplModalRef.current) {
        tmplModalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 80);
  };

  const resetTemplateForm = () => {
    setEditingTmplId(null);
    setTmplTitle('');
    setTmplAmount('');
    setTmplCategory('Tagihan');
    setIsNewTmplCat(false);
    setCustomTmplCat('');
    setTmplUser('Papa');
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    const finalCat = isNewTmplCat && customTmplCat.trim() ? customTmplCat.trim() : tmplCategory;
    if (!tmplTitle.trim() || !tmplAmount) return;

    const payload = {
      title: tmplTitle.trim(),
      amount: Number(tmplAmount),
      category: finalCat,
      user: tmplUser
    };

    try {
      if (editingTmplId) {
        await updateDoc(doc(db, 'quick_templates', editingTmplId), payload);
        showToast('✅ Template berhasil diperbarui');
      } else {
        await addDoc(collection(db, 'quick_templates'), payload);
        showToast('✅ Template baru ditambahkan');
      }
      resetTemplateForm();
    } catch (err) {
      console.error(err);
      showToast('❌ Gagal menyimpan template');
    }
  };

  const handleDeleteTemplate = async (id, title) => {
    if (window.confirm(`Hapus template "${title}"?`)) {
      await deleteDoc(doc(db, 'quick_templates', id));
      if (editingTmplId === id) resetTemplateForm();
      showToast('🗑️ Template dihapus');
    }
  };

  // === HANDLER TRANSAKSI MANUAL (+) ===
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!txTitle.trim() || !txAmount) return;

    const finalCat =
      txType === 'expense' && isNewTxCat && customTxCat.trim()
        ? customTxCat.trim()
        : txCategory;

    try {
      await addDoc(collection(db, 'transactions'), {
        title: txTitle.trim(),
        amount: Number(txAmount),
        type: txType,
        category: finalCat,
        user: txUser,
        paymentMethod: 'Tunai',
        date: txDate || todayStr,
        createdAt: serverTimestamp()
      });
      setTxTitle('');
      setTxAmount('');
      setIsNewTxCat(false);
      setCustomTxCat('');
      setIsTxModalOpen(false);
      showToast('✅ Transaksi berhasil disimpan');
    } catch (err) {
      console.error(err);
      showToast('❌ Gagal menyimpan transaksi');
    }
  };

  const handleDeleteTransaction = async (id, title) => {
    if (window.confirm(`Hapus catatan "${title}"?`)) {
      await deleteDoc(doc(db, 'transactions', id));
      showToast('🗑️ Catatan dihapus');
    }
  };

  // === HANDLER SALDO AWAL, ANGGARAN, UTANG & WA REKAP ===
  const handleSaveSaldoAwal = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'settings', selectedMonth), { amount: Number(saldoInput || 0) });
    setIsSaldoModalOpen(false);
    showToast('✅ Saldo awal diperbarui');
  };

  const handleUpdateCategoryBudget = async (cat, val) => {
    await setDoc(doc(db, 'budgets', cat), { limit: Number(val || 0) });
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!debtName.trim() || !debtAmount) return;
    await addDoc(collection(db, 'debts'), {
      name: debtName.trim(),
      amount: Number(debtAmount),
      type: debtType,
      paid: false
    });
    setDebtName('');
    setDebtAmount('');
    showToast('✅ Catatan utang/piutang disimpan');
  };

  const handleShareWARekap = () => {
    const text =
      `*REKAP CATAT BARENG (${selectedMonth})*\n` +
      `💰 Saldo Akhir: Rp ${totalSaldo.toLocaleString('id-ID')}\n` +
      `📥 Total Masuk: Rp ${totalMasuk.toLocaleString('id-ID')}\n` +
      `📤 Total Keluar: Rp ${totalKeluar.toLocaleString('id-ID')}\n` +
      `👨 Papa: Rp ${papaExpense.toLocaleString('id-ID')} (${papaPct}%)\n` +
      `👩 Mama: Rp ${mamaExpense.toLocaleString('id-ID')} (${mamaPct}%)`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Kelompokkan transaksi per tanggal
  const groupedTransactions = monthTransactions.reduce((groups, tx) => {
    const d = tx.date || 'Tanpa Tanggal';
    if (!groups[d]) groups[d] = [];
    groups[d].push(tx);
    return groups;
  }, {});

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 text-slate-800 font-sans relative">
      {/* TOAST NOTIFIKASI */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* HEADER */}
      <div className="p-5 bg-white flex justify-between items-center shadow-sm sticky top-0 z-30">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Catat Bareng</h1>
          <p className="text-[10px] font-bold text-slate-400 tracking-wider">KEUANGAN PAPA & MAMA</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-full px-2 py-1 text-xs font-bold text-slate-700">
            <button type="button" onClick={() => changeMonth(-1)} className="px-1.5">‹</button>
            <span className="px-1">{selectedMonth}</span>
            <button type="button" onClick={() => changeMonth(1)} className="px-1.5">›</button>
          </div>
          <button
            type="button"
            onClick={handleShareWARekap}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm"
          >
            WA Rekap
          </button>
        </div>
      </div>

      {/* ================= TAB: BERANDA ================= */}
      {activeTab === 'beranda' && (
        <div className="p-4 space-y-3.5">
          {/* CARD 1: KEUANGAN HARI INI */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-4 text-white shadow-md">
            <div className="flex justify-between items-center text-xs opacity-95 mb-3">
              <span className="font-semibold">📅 Keuangan Hari Ini</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px]">
                {todayTransactions.length} Transaksi
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 bg-white/10 rounded-xl p-3">
              <div>
                <p className="text-[11px] opacity-85">Pemasukan Hari Ini</p>
                <p className="text-base font-bold">Rp {todayIncome.toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="text-[11px] opacity-85">Pengeluaran Hari Ini</p>
                <p className="text-base font-bold">Rp {todayExpense.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>

          {/* CARD 2: TOTAL SALDO PERIODE */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-md">
            <div className="flex justify-between items-center text-xs opacity-95 mb-1">
              <span>💳 Total Saldo Periode ({selectedMonth})</span>
              <button
                type="button"
                onClick={() => {
                  setSaldoInput(saldoAwal);
                  setIsSaldoModalOpen(true);
                }}
                className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              >
                Saldo Awal: Rp {saldoAwal.toLocaleString('id-ID')}
              </button>
            </div>
            <h2 className="text-3xl font-extrabold my-2 tracking-tight">
              Rp {totalSaldo.toLocaleString('id-ID')}
            </h2>
            <div className="flex justify-between text-xs opacity-95 border-t border-white/20 pt-2.5 mt-2">
              <div>
                Total Masuk: <span className="font-bold">Rp {totalMasuk.toLocaleString('id-ID')}</span>
              </div>
              <div>
                Total Keluar: <span className="font-bold">Rp {totalKeluar.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* CARD 3: TEMPLATE TAGIHAN CEPAT (EDITABLE & CUSTOM CATEGORY) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 font-bold">⚡</span>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Template Tagihan Cepat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetTemplateForm();
                  setIsTmplModalOpen(true);
                }}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-full transition"
              >
                ✏️ Edit / +Tambah
              </button>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {quickTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleQuickCatat(tmpl)}
                  className="min-w-[140px] flex-shrink-0 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl p-3 cursor-pointer transition relative active:scale-95"
                >
                  {/* Tombol Edit Cepat per Kartu */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditTemplate(tmpl);
                    }}
                    title="Edit template ini"
                    className="absolute top-2 right-2 text-[11px] bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-600 hover:text-blue-600 shadow-xs"
                  >
                    ✏️
                  </button>

                  <p className="text-xs font-bold text-slate-800 truncate pr-6 mb-1">{tmpl.title}</p>
                  <p className="text-xs font-extrabold text-emerald-600">
                    Rp {Number(tmpl.amount).toLocaleString('id-ID')}
                  </p>
                  <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400">
                    <span className="truncate max-w-[75px]">{tmpl.category}</span>
                    <span className="font-semibold text-slate-500">{tmpl.user || 'Papa'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CARD 4: SISA TOTAL ANGGARAN */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">
                ◎
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Sisa Total Anggaran
                </p>
                <p className="text-base font-extrabold text-slate-800">
                  Rp {sisaTotalAnggaran.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('anggaran')}
              className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-full"
            >
              Detail
            </button>
          </div>

          {/* CARD 5: PENGELUARAN PAPA VS MAMA */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-bold text-slate-600">🕒 PENGELUARAN PAPA VS MAMA</span>
              <span className="text-slate-400 text-[11px]">{selectedMonth}</span>
            </div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-indigo-600">
                Papa: Rp {papaExpense.toLocaleString('id-ID')} ({papaPct}%)
              </span>
              <span className="text-pink-600">
                Mama: Rp {mamaExpense.toLocaleString('id-ID')} ({mamaPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
              <div className="bg-indigo-600 h-full" style={{ width: `${papaPct}%` }} />
              <div className="bg-pink-500 h-full" style={{ width: `${mamaPct}%` }} />
            </div>
          </div>

          {/* CARD 6: RIWAYAT TRANSAKSI BULAN INI */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              Riwayat Transaksi ({monthTransactions.length})
            </h3>
            {Object.keys(groupedTransactions).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Belum ada transaksi di periode {selectedMonth}.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedTransactions).map(([dateKey, items]) => (
                  <div key={dateKey}>
                    <p className="text-[11px] font-bold text-slate-400 mb-1.5">{dateKey}</p>
                    <div className="space-y-2">
                      {items.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">{tx.title}</p>
                            <p className="text-[10px] text-slate-500">
                              {tx.category} •{' '}
                              <span className={tx.user === 'Mama' ? 'text-pink-600 font-bold' : 'text-indigo-600 font-bold'}>
                                {tx.user || 'Papa'}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-extrabold ${
                                tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {tx.type === 'income' ? '+' : '-'}Rp {Number(tx.amount).toLocaleString('id-ID')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx.id, tx.title)}
                              className="text-slate-300 hover:text-rose-500 text-xs px-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB: ANGGARAN ================= */}
      {activeTab === 'anggaran' && (
        <div className="p-4 space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-1">Anggaran per Kategori</h2>
            <p className="text-xs text-slate-400 mb-4">
              Atur batas pengeluaran bulanan untuk setiap kategori.
            </p>
            <div className="space-y-3.5">
              {allExpenseCategories.map((cat) => {
                const limit = budgets[cat] || 0;
                const spent = monthTransactions
                  .filter((t) => t.type === 'expense' && t.category === cat)
                  .reduce((s, t) => s + Number(t.amount || 0), 0);
                const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

                return (
                  <div key={cat} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-800">{cat}</span>
                      <input
                        type="number"
                        defaultValue={limit || ''}
                        placeholder="Set batas Rp..."
                        onBlur={(e) => handleUpdateCategoryBudget(cat, e.target.value)}
                        className="w-32 text-right text-xs font-bold border rounded-lg px-2 py-1 bg-white"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Terpakai: Rp {spent.toLocaleString('id-ID')}</span>
                      <span>Sisa: Rp {(limit - spent).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${pct >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: FITUR LAIN ================= */}
      {activeTab === 'fitur' && (
        <div className="p-4 space-y-3">
          {/* Atur Saldo Awal */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Saldo Awal Periode ({selectedMonth})</h3>
              <p className="text-sm font-extrabold text-indigo-600 mt-0.5">
                Rp {saldoAwal.toLocaleString('id-ID')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSaldoInput(saldoAwal);
                setIsSaldoModalOpen(true);
              }}
              className="bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-2 rounded-xl"
            >
              Ubah Saldo
            </button>
          </div>

          {/* Catatan Utang & Piutang */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Catatan Utang & Piutang
            </h3>
            <form onSubmit={handleAddDebt} className="space-y-2 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDebtType('utang')}
                  className={`py-1.5 rounded-lg text-xs font-bold ${
                    debtType === 'utang' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Utang Kita
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType('piutang')}
                  className={`py-1.5 rounded-lg text-xs font-bold ${
                    debtType === 'piutang' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Piutang (Orang Pinjam)
                </button>
              </div>
              <input
                type="text"
                placeholder="Nama / Keterangan..."
                value={debtName}
                onChange={(e) => setDebtName(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Nominal Rp..."
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  className="flex-1 border rounded-xl px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="bg-slate-800 text-white text-xs font-bold px-4 rounded-xl"
                >
                  Simpan
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {debts.map((d) => (
                <div key={d.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span className={`font-bold ${d.type === 'utang' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      [{d.type.toUpperCase()}]
                    </span>{' '}
                    <span className="font-bold text-slate-800">{d.name}</span>
                    <p className="text-slate-600 font-semibold">Rp {Number(d.amount).toLocaleString('id-ID')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteDoc(doc(db, 'debts', d.id))}
                    className="text-xs font-bold text-slate-400 hover:text-rose-600"
                  >
                    Lunas / Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: STATISTIK SEDERHANA ================= */}
      {activeTab === 'statistik' && (
        <div className="p-4 space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Ringkasan Pengeluaran ({selectedMonth})
            </h3>
            {allExpenseCategories.map((cat) => {
              const catTotal = monthTransactions
                .filter((t) => t.type === 'expense' && t.category === cat)
                .reduce((s, t) => s + Number(t.amount || 0), 0);
              if (catTotal === 0) return null;
              const pct = totalKeluar > 0 ? Math.round((catTotal / totalKeluar) * 100) : 0;
              return (
                <div key={cat} className="mb-3">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{cat}</span>
                    <span>
                      Rp {catTotal.toLocaleString('id-ID')} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {totalKeluar === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada pengeluaran bulan ini.</p>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT & TAMBAH TEMPLATE TAGIHAN ================= */}
      {isTmplModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            ref={tmplModalRef}
            className="bg-white w-full max-w-sm max-h-[88vh] overflow-y-auto rounded-2xl p-5 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800 text-base">
                {editingTmplId ? '✏️ Edit Template Tagihan' : '➕ Tambah & Kelola Template'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  resetTemplateForm();
                  setIsTmplModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {editingTmplId && (
              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center text-xs text-amber-800">
                <span>
                  Sedang mengedit: <b>{tmplTitle}</b>
                </span>
                <button type="button" onClick={resetTemplateForm} className="underline font-bold">
                  Batal
                </button>
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nama Tagihan</label>
                <input
                  type="text"
                  placeholder="Contoh: Tagihan Wi-Fi"
                  value={tmplTitle}
                  onChange={(e) => setTmplTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 300000"
                  value={tmplAmount}
                  onChange={(e) => setTmplAmount(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-600">Kategori</label>
                  <button
                    type="button"
                    onClick={() => setIsNewTmplCat(!isNewTmplCat)}
                    className="text-[11px] font-bold text-emerald-600 hover:underline"
                  >
                    {isNewTmplCat ? 'Pilih dari daftar' : '+ Kategori Baru'}
                  </button>
                </div>

                {isNewTmplCat ? (
                  <input
                    type="text"
                    placeholder="Ketik nama kategori baru..."
                    value={customTmplCat}
                    onChange={(e) => setCustomTmplCat(e.target.value)}
                    className="w-full border border-emerald-400 bg-emerald-50/40 rounded-xl px-3 py-2 text-sm outline-none"
                    required
                  />
                ) : (
                  <select
                    value={tmplCategory}
                    onChange={(e) => setTmplCategory(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none"
                  >
                    {allExpenseCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Pencatat Otomatis</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Papa', 'Mama'].map((person) => (
                    <button
                      key={person}
                      type="button"
                      onClick={() => setTmplUser(person)}
                      className={`py-2 rounded-xl text-xs font-bold border ${
                        tmplUser === person
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className={`w-full text-white font-bold text-sm py-2.5 rounded-xl transition ${
                  editingTmplId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {editingTmplId ? 'Simpan Perubahan' : '+ Simpan Template Baru'}
              </button>
            </form>

            {/* Daftar Template Tersimpan */}
            <div className="mt-5 border-t pt-3">
              <p className="text-xs font-bold text-slate-600 mb-2">Daftar Template Tersimpan:</p>
              <div className="space-y-2">
                {quickTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={`flex justify-between items-center text-xs p-2.5 rounded-xl border ${
                      editingTmplId === tmpl.id
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-800">{tmpl.title}</p>
                      <p className="text-emerald-600 font-semibold">
                        Rp {Number(tmpl.amount).toLocaleString('id-ID')} •{' '}
                        <span className="text-slate-500">
                          {tmpl.category} ({tmpl.user || 'Papa'})
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditTemplate(tmpl)}
                        className="text-blue-600 font-bold px-2 py-1 bg-blue-50 rounded-md"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tmpl.id, tmpl.title)}
                        className="text-red-600 font-bold px-2 py-1 bg-red-50 rounded-md"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH TRANSAKSI MANUAL (+) ================= */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800 text-base">Catat Transaksi Baru</h4>
              <button
                type="button"
                onClick={() => setIsTxModalOpen(false)}
                className="text-slate-400 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTxType('expense');
                    setTxCategory('Makanan');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold ${
                    txType === 'expense' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType('income');
                    setTxCategory('Gaji');
                    setIsNewTxCat(false);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold ${
                    txType === 'income' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Beli lauk, Gaji bulanan"
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 50000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-600">Kategori</label>
                  {txType === 'expense' && (
                    <button
                      type="button"
                      onClick={() => setIsNewTxCat(!isNewTxCat)}
                      className="text-[11px] font-bold text-emerald-600"
                    >
                      {isNewTxCat ? 'Pilih daftar' : '+ Kategori Baru'}
                    </button>
                  )}
                </div>
                {txType === 'expense' && isNewTxCat ? (
                  <input
                    type="text"
                    placeholder="Ketik kategori baru..."
                    value={customTxCat}
                    onChange={(e) => setCustomTxCat(e.target.value)}
                    className="w-full border border-emerald-400 rounded-xl px-3 py-2 text-sm"
                    required
                  />
                ) : (
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  >
                    {(txType === 'expense' ? allExpenseCategories : INCOME_CATEGORIES).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Pencatat</label>
                  <select
                    value={txUser}
                    onChange={(e) => setTxUser(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="Papa">Papa</option>
                    <option value="Mama">Mama</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl mt-2"
              >
                Simpan Transaksi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL SALDO AWAL ================= */}
      {isSaldoModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl">
            <h4 className="font-bold text-slate-800 text-sm mb-3">
              Saldo Awal ({selectedMonth})
            </h4>
            <form onSubmit={handleSaveSaldoAwal} className="space-y-3">
              <input
                type="number"
                value={saldoInput}
                onChange={(e) => setSaldoInput(e.target.value)}
                placeholder="Masukkan saldo awal Rp..."
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-xl"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsSaldoModalOpen(false)}
                  className="px-3 bg-slate-100 text-slate-600 text-xs font-bold py-2 rounded-xl"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= NAVBAR BAWAH ================= */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 flex justify-around items-center py-2 px-3 z-40">
        <button
          type="button"
          onClick={() => setActiveTab('beranda')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'beranda' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">🏠</span>
          Beranda
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('anggaran')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'anggaran' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">🎯</span>
          Anggaran
        </button>
        <button
          type="button"
          onClick={() => setIsTxModalOpen(true)}
          className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 rounded-full text-white text-2xl font-bold flex items-center justify-center -mt-6 shadow-lg shadow-emerald-200 border-4 border-white"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fitur')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'fitur' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">🛠️</span>
          Fitur Lain
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('statistik')}
          className={`flex flex-col items-center text-[10px] font-bold ${
            activeTab === 'statistik' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">📊</span>
          Statistik
        </button>
      </div>
    </div>
  );
}
