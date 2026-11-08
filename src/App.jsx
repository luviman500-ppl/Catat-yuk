import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Pastikan path file firebase.js Anda sesuai
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

export default function App() {
  // State Utama
  const [currentUser, setCurrentUser] = useState('Papa'); // Default pencatat
  const [transactions, setTransactions] = useState([]);
  const [templates, setTemplates] = useState([]);

  // State Modal Template Tagihan Cepat
  const [isTmplModalOpen, setIsTmplModalOpen] = useState(false);
  const [editingTmplId, setEditingTmplId] = useState(null);
  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplAmount, setTmplAmount] = useState('');
  const [tmplCategory, setTmplCategory] = useState('Tagihan');

  // -------------------------------------------------------------
  // 1. SYNC REALTIME FIRESTORE
  // -------------------------------------------------------------
  useEffect(() => {
    // Read Transactions
    const qTx = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(data);
    });

    // Read Quick Templates
    const unsubTmpl = onSnapshot(collection(db, 'quick_templates'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTemplates(data);
    });

    return () => {
      unsubTx();
      unsubTmpl();
    };
  }, []);

  // -------------------------------------------------------------
  // 2. HITUNG RINGKASAN KEUANGAN
  // -------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];
  
  const todayIncome = transactions
    .filter(t => t.date === todayStr && t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const todayExpense = transactions
    .filter(t => t.date === todayStr && t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalBalance = totalIncome - totalExpense;

  const papaExpense = transactions
    .filter(t => t.type === 'expense' && (t.user === 'Papa' || !t.user))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const mamaExpense = transactions
    .filter(t => t.type === 'expense' && t.user === 'Mama')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const grandExpense = papaExpense + mamaExpense || 1;
  const papaPct = Math.round((papaExpense / grandExpense) * 100);
  const mamaPct = Math.round((mamaExpense / grandExpense) * 100);

  // -------------------------------------------------------------
  // 3. HANDLER TEMPLATE TAGIHAN CEPAT
  // -------------------------------------------------------------
  // 1-Klik Catat dari Card Template
  const handleQuickAdd = async (tmpl) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        title: tmpl.title,
        amount: Number(tmpl.amount),
        type: 'expense',
        category: tmpl.category || 'Tagihan',
        user: currentUser,
        paymentMethod: 'Tunai',
        date: todayStr,
        createdAt: serverTimestamp()
      });
      alert(`✅ Berhasil dicatat: ${tmpl.title} (Rp ${Number(tmpl.amount).toLocaleString('id-ID')}) oleh ${currentUser}`);
    } catch (err) {
      console.error(err);
      alert('Gagal mencatat transaksi.');
    }
  };

  // Simpan / Edit Template
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!tmplTitle || !tmplAmount) return;

    if (editingTmplId) {
      await updateDoc(doc(db, 'quick_templates', editingTmplId), {
        title: tmplTitle,
        amount: Number(tmplAmount),
        category: tmplCategory
      });
    } else {
      await addDoc(collection(db, 'quick_templates'), {
        title: tmplTitle,
        amount: Number(tmplAmount),
        category: tmplCategory
      });
    }

    closeTmplModal();
  };

  const handleEditTmplClick = (tmpl) => {
    setEditingTmplId(tmpl.id);
    setTmplTitle(tmpl.title);
    setTmplAmount(tmpl.amount);
    setTmplCategory(tmpl.category || 'Tagihan');
  };

  const handleDeleteTmpl = async (id) => {
    if (window.confirm('Hapus template tagihan ini?')) {
      await deleteDoc(doc(db, 'quick_templates', id));
    }
  };

  const closeTmplModal = () => {
    setTmplTitle('');
    setTmplAmount('');
    setTmplCategory('Tagihan');
    setEditingTmplId(null);
    setIsTmplModalOpen(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24 text-slate-800 font-sans relative">
      
      {/* HEADER */}
      <div className="p-5 bg-white flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Catat Bareng</h1>
          <p className="text-[11px] font-bold text-slate-400 tracking-wider">KEUANGAN PAPA & MAMA</p>
        </div>
        <button className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
          <span>🔗</span> WA Rekap
        </button>
      </div>

      <div className="p-4 space-y-3">
        
        {/* CARD: KEUANGAN HARI INI */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-4 text-white shadow-md">
          <div className="flex justify-between items-center text-xs opacity-90 mb-3">
            <span>📅 Keuangan Hari Ini</span>
            <span>{transactions.filter(t => t.date === todayStr).length} Transaksi</span>
          </div>
          <div className="grid grid-cols-2 gap-2 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div>
              <p className="text-[10px] opacity-80">Pemasukan Hari Ini</p>
              <p className="text-sm font-bold">Rp {todayIncome.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <p className="text-[10px] opacity-80">Pengeluaran Hari Ini</p>
              <p className="text-sm font-bold">Rp {todayExpense.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* CARD: TOTAL SALDO PERIODE */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-md">
          <div className="flex justify-between items-center text-xs opacity-90 mb-1">
            <span>💳 Total Saldo Periode</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">Saldo Awal: Rp 0</span>
          </div>
          <h2 className="text-2xl font-extrabold my-2">Rp {totalBalance.toLocaleString('id-ID')}</h2>
          <div className="flex justify-between text-xs opacity-90 border-t border-white/20 pt-2 mt-2">
            <div>Total Masuk: <span className="font-semibold">Rp {totalIncome.toLocaleString('id-ID')}</span></div>
            <div>Total Keluar: <span className="font-semibold">Rp {totalExpense.toLocaleString('id-ID')}</span></div>
          </div>
        </div>

        {/* SECTION: TEMPLATE TAGIHAN CEPAT */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-500 font-bold">⚡</span>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Template Tagihan Cepat
              </h3>
            </div>
            <button
              onClick={() => setIsTmplModalOpen(true)}
              className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition"
            >
              ⚙️ Kelola / +Tambah
            </button>
          </div>

          {/* Horizontal Slider Card */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {templates.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-2">
                Belum ada template. Klik "Kelola" untuk menambah.
              </div>
            ) : (
              templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleQuickAdd(tmpl)}
                  className="min-w-[130px] flex-shrink-0 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl p-3 cursor-pointer transition"
                >
                  <p className="text-xs font-bold text-slate-800 truncate mb-1">{tmpl.title}</p>
                  <p className="text-xs font-bold text-emerald-600">
                    Rp {Number(tmpl.amount).toLocaleString('id-ID')}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-1">1-Klik Catat</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PENGELUARAN PAPA VS MAMA */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-bold text-slate-600">🕒 PENGELUARAN PAPA VS MAMA</span>
            <span className="text-slate-400 text-[10px]">Pencatatan Aktif: <b>{currentUser}</b></span>
          </div>
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-indigo-600">Papa: Rp {papaExpense.toLocaleString('id-ID')} ({papaPct}%)</span>
            <span className="text-pink-600">Mama: Rp {mamaExpense.toLocaleString('id-ID')} ({mamaPct}%)</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${papaPct}%` }}></div>
            <div className="bg-pink-500 h-full transition-all duration-300" style={{ width: `${mamaPct}%` }}></div>
          </div>
        </div>

      </div>

      {/* MODAL KELOLA & TAMBAH TEMPLATE */}
      {isTmplModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800 text-base">
                {editingTmplId ? '✏️ Edit Template' : '➕ Kelola Template Tagihan'}
              </h4>
              <button onClick={closeTmplModal} className="text-slate-400 text-lg font-bold">✕</button>
            </div>

            {/* Form Tambah / Edit */}
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
                <label className="text-xs font-bold text-slate-600 block mb-1">Kategori</label>
                <select
                  value={tmplCategory}
                  onChange={(e) => setTmplCategory(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Tagihan">Tagihan</option>
                  <option value="Belanja">Belanja</option>
                  <option value="Transportasi">Transportasi</option>
                  <option value="Makanan">Makanan</option>
                  <option value="Kesehatan">Kesehatan</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-emerald-700 transition"
                >
                  {editingTmplId ? 'Update Template' : '+ Simpan Template Baru'}
                </button>
              </div>
            </form>

            {/* Daftar Template Tersimpan (Untuk Edit / Hapus) */}
            <div className="mt-5 border-t pt-3">
              <p className="text-xs font-bold text-slate-600 mb-2">Daftar Template Tersimpan:</p>
              {templates.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada template tersimpan.</p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {templates.map((tmpl) => (
                    <div key={tmpl.id} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800">{tmpl.title}</p>
                        <p className="text-emerald-600 font-semibold">Rp {Number(tmpl.amount).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditTmplClick(tmpl)}
                          className="text-blue-600 font-bold px-2 py-1 bg-blue-50 rounded-md"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTmpl(tmpl.id)}
                          className="text-red-600 font-bold px-2 py-1 bg-red-50 rounded-md"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* NAVBAR BAWAH */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 flex justify-around items-center py-2 px-3 z-40">
        <button className="flex flex-col items-center text-emerald-600 text-[10px] font-bold">
          <span className="text-lg">🏠</span>
          Beranda
        </button>
        <button className="flex flex-col items-center text-slate-400 text-[10px]">
          <span className="text-lg">🎯</span>
          Anggaran
        </button>
        <button 
          onClick={() => setCurrentUser(currentUser === 'Papa' ? 'Mama' : 'Papa')}
          className="w-12 h-12 bg-emerald-500 rounded-full text-white text-xl font-bold flex items-center justify-center -mt-6 shadow-lg shadow-emerald-200 border-4 border-white"
          title="Klik untuk ubah pencatat Papa/Mama"
        >
          +
        </button>
        <button className="flex flex-col items-center text-slate-400 text-[10px]">
          <span className="text-lg">🛠️</span>
          Fitur Lain
        </button>
        <button className="flex flex-col items-center text-slate-400 text-[10px]">
          <span className="text-lg">📊</span>
          Statistik
        </button>
      </div>

    </div>
  );
}
