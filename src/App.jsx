import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Calculator, 
  PieChart, 
  Home, 
  History, 
  Download, 
  X, 
  Calendar, 
  User, 
  Tag, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  ChevronRight
} from 'lucide-react';

// Configuration Firebase Catat Yuk
const firebaseConfig = {
  apiKey: "AIzaSyAm4VVv6z-6QAJ_1QvulfRW77HcGLaTLV4",
  authDomain: "catat-yuk-36773.firebaseapp.com",
  projectId: "catat-yuk-36773",
  storageBucket: "catat-yuk-36773.firebasestorage.app",
  messagingSenderId: "197465258236",
  appId: "1:197465258236:web:0493506e651d60243b3f79",
  measurementId: "G-EQY664TH7T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_CATEGORIES = [
  'Makanan & Minuman',
  'Belanja Bulanan',
  'Transportasi & Bensin',
  'Tagihan & Listrik',
  'Hiburan & Piknik',
  'Kesehatan',
  'Pendidikan',
  'Lain-lain'
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  
  // Date Filters
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [recordedBy, setRecordedBy] = useState('Papa');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCatInput, setShowCustomCatInput] = useState(false);

  // Calculator State
  const [showCalc, setShowCalc] = useState(false);
  const [calcExpression, setCalcExpression] = useState('');

  // Individual Summary Modal State
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  // Real-time Firestore Sync
  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(data);
    }, (error) => {
      console.warn("Firestore error, falling back to local memory:", error);
    });

    return () => unsubscribe();
  }, []);

  // Helper Functions
  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Hari Ini';
    if (dateStr === yesterdayStr) return 'Kemarin';

    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Filter Transactions
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date || t.createdAt);
    const matchYear = tDate.getFullYear() === Number(selectedYear);
    const matchMonth = selectedMonth === 'ALL' || tDate.getMonth() === Number(selectedMonth);
    return matchYear && matchMonth;
  });

  // Today's Stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => (t.date || '').startsWith(todayStr));
  const todayIncome = todayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const todayExpense = todayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

  // Overall Financial Totals
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Breakdown Papa vs Mama
  const papaExpense = filteredTransactions.filter(t => t.type === 'expense' && t.recordedBy === 'Papa').reduce((acc, t) => acc + Number(t.amount), 0);
  const mamaExpense = filteredTransactions.filter(t => t.type === 'expense' && t.recordedBy === 'Mama').reduce((acc, t) => acc + Number(t.amount), 0);

  // Category Breakdown
  const categoryTotals = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});

  // Handle Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    let finalCategory = category;
    if (showCustomCatInput && customCategory.trim()) {
      finalCategory = customCategory.trim();
      if (!categories.includes(finalCategory)) {
        setCategories([...categories, finalCategory]);
      }
    }

    const payload = {
      type,
      amount: Number(amount),
      description: description || (type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
      category: type === 'income' ? 'Pemasukan' : finalCategory,
      recordedBy,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "transactions", editId), payload);
      } else {
        await addDoc(collection(db, "transactions"), payload);
      }
    } catch (err) {
      console.warn("Using local update fallback:", err);
      if (editId) {
        setTransactions(transactions.map(t => t.id === editId ? { ...t, ...payload } : t));
      } else {
        setTransactions([{ id: Date.now().toString(), ...payload }, ...transactions]);
      }
    }

    resetForm();
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setType(item.type);
    setAmount(item.amount);
    setDescription(item.description);
    setCategory(item.category);
    setRecordedBy(item.recordedBy || 'Papa');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus catatan ini?")) return;
    try {
      await deleteDoc(doc(db, "transactions", id));
    } catch (err) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const resetForm = () => {
    setEditId(null);
    setAmount('');
    setDescription('');
    setCategory(categories[0]);
    setShowCustomCatInput(false);
    setCustomCategory('');
  };

  // Calculator Handler
  const handleCalcBtn = (val) => {
    if (val === 'C') {
      setCalcExpression('');
    } else if (val === '=') {
      try {
        const sanitized = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
        const res = Function(`'use strict'; return (${sanitized})`)();
        setAmount(Math.max(0, Math.round(res)).toString());
        setShowCalc(false);
      } catch (e) {
        setCalcExpression('Error');
      }
    } else {
      setCalcExpression(prev => prev + val);
    }
  };

  // Export CSV
  const exportToCSV = () => {
    const headers = ["Tanggal", "Jenis", "Nominal", "Kategori", "Keterangan", "Pencatat"];
    const rows = filteredTransactions.map(t => [
      t.date || t.createdAt.split('T')[0],
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      t.amount,
      `"${t.category}"`,
      `"${t.description}"`,
      t.recordedBy || 'Papa'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Catat_Bareng_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Grouping Transactions by Date
  const groupedTransactions = filteredTransactions.reduce((acc, t) => {
    const d = t.date || t.createdAt.split('T')[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans border-x border-slate-200 shadow-xl relative">
      
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Catat Bareng</h1>
            <p className="text-xs text-indigo-100">Keuangan Papa & Mama</p>
          </div>
          <div className="flex gap-2">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white/20 text-white text-xs px-2 py-1.5 rounded-lg border border-white/30 backdrop-blur-md focus:outline-none"
            >
              <option value="ALL" className="text-slate-800">Semua Bulan</option>
              {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'].map((m, idx) => (
                <option key={idx} value={idx} className="text-slate-800">{m}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white/20 text-white text-xs px-2 py-1.5 rounded-lg border border-white/30 backdrop-blur-md focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="text-slate-800">{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
          <p className="text-xs text-indigo-100 mb-1">Total Saldo Bersih</p>
          <h2 className="text-2xl font-extrabold tracking-tight">{formatRupiah(balance)}</h2>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <p className="text-[10px] text-indigo-100">Pemasukan</p>
                <p className="text-xs font-semibold text-emerald-300">{formatRupiah(totalIncome)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-500/20 rounded-lg">
                <TrendingDown className="w-4 h-4 text-rose-300" />
              </div>
              <div>
                <p className="text-[10px] text-indigo-100">Pengeluaran</p>
                <p className="text-xs font-semibold text-rose-300">{formatRupiah(totalExpense)}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Areas */}
      <main className="p-4 space-y-4">
        
        {/* TAB 1: BERANDA */}
        {activeTab === 'home' && (
          <>
            {/* Card Keuangan Hari Ini */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Keuangan Hari Ini
                </span>
                <span className="text-[10px] text-indigo-500 font-medium">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mt-2">
                <div className="bg-white p-2 rounded-xl shadow-2xs border border-indigo-50">
                  <p className="text-[10px] text-slate-500">Masuk</p>
                  <p className="text-xs font-bold text-emerald-600">{formatRupiah(todayIncome)}</p>
                </div>
                <div className="bg-white p-2 rounded-xl shadow-2xs border border-indigo-50">
                  <p className="text-[10px] text-slate-500">Keluar</p>
                  <p className="text-xs font-bold text-rose-600">{formatRupiah(todayExpense)}</p>
                </div>
                <div className="bg-white p-2 rounded-xl shadow-2xs border border-indigo-50">
                  <p className="text-[10px] text-slate-500">Sisa</p>
                  <p className={`text-xs font-bold ${todayIncome - todayExpense >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                    {formatRupiah(todayIncome - todayExpense)}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Recent Transactions Grouped by Date */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Transaksi Terkini</h3>
                <button onClick={() => setActiveTab('history')} className="text-xs text-indigo-600 font-medium flex items-center">
                  Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {Object.keys(groupedTransactions).length === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-slate-100 text-slate-400">
                  <Wallet className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Belum ada catatan transaksi</p>
                </div>
              ) : (
                Object.keys(groupedTransactions).slice(0, 3).map(dateKey => (
                  <div key={dateKey} className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 mb-2 border-b border-slate-50 pb-1">
                      {formatDateLabel(dateKey)}
                    </p>
                    <div className="space-y-2">
                      {groupedTransactions[dateKey].map(t => (
                        <div key={t.id} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <div>
                              <p className="font-semibold text-slate-700">{t.description}</p>
                              <p className="text-[10px] text-slate-400">{t.category} • oleh <span className="font-medium text-indigo-600">{t.recordedBy}</span></p>
                            </div>
                          </div>
                          <p className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* TAB 2: STATISTIK & PERBANDINGAN */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            
            {/* Papa vs Mama Expenses */}
            <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" /> Perbandingan Pengeluaran Papa & Mama
              </h3>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button 
                  onClick={() => setSelectedUserDetail('Papa')}
                  className="bg-indigo-50/50 hover:bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-left transition"
                >
                  <p className="text-[10px] font-semibold text-indigo-600">Papa</p>
                  <p className="text-sm font-bold text-indigo-950 mt-0.5">{formatRupiah(papaExpense)}</p>
                  <p className="text-[9px] text-indigo-400 mt-1 flex items-center gap-0.5">
                    Klik untuk rincian <ChevronRight className="w-2.5 h-2.5" />
                  </p>
                </button>

                <button 
                  onClick={() => setSelectedUserDetail('Mama')}
                  className="bg-pink-50/50 hover:bg-pink-50 p-3 rounded-xl border border-pink-100 text-left transition"
                >
                  <p className="text-[10px] font-semibold text-pink-600">Mama</p>
                  <p className="text-sm font-bold text-pink-950 mt-0.5">{formatRupiah(mamaExpense)}</p>
                  <p className="text-[9px] text-pink-400 mt-1 flex items-center gap-0.5">
                    Klik untuk rincian <ChevronRight className="w-2.5 h-2.5" />
                  </p>
                </button>
              </div>

              {/* Progress Bar Comparison */}
              {papaExpense + mamaExpense > 0 && (
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  <div 
                    style={{ width: `${(papaExpense / (papaExpense + mamaExpense)) * 100}%` }} 
                    className="bg-indigo-600 h-full"
                  />
                  <div 
                    style={{ width: `${(mamaExpense / (papaExpense + mamaExpense)) * 100}%` }} 
                    className="bg-pink-500 h-full"
                  />
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-purple-600" /> Pengeluaran Per Kategori
              </h3>

              {Object.keys(categoryTotals).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada pengeluaran di periode ini</p>
              ) : (
                Object.entries(categoryTotals).map(([catName, val]) => {
                  const pct = totalExpense > 0 ? (val / totalExpense) * 100 : 0;
                  return (
                    <div key={catName} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-700">{catName}</span>
                        <span className="text-slate-900 font-bold">{formatRupiah(val)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-600 h-full rounded-full" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RIWAYAT & EKSPOR */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Semua Transaksi</h3>
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-emerald-200"
              >
                <Download className="w-3.5 h-3.5" /> Ekspor Excel
              </button>
            </div>

            {Object.keys(groupedTransactions).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Tidak ada data transaksi</p>
            ) : (
              Object.keys(groupedTransactions).map(dateKey => (
                <div key={dateKey} className="bg-white rounded-2xl p-3 shadow-2xs border border-slate-100 space-y-2">
                  <p className="text-[11px] font-bold text-indigo-600 border-b border-slate-50 pb-1">
                    {formatDateLabel(dateKey)}
                  </p>
                  {groupedTransactions[dateKey].map(t => (
                    <div key={t.id} className="flex justify-between items-center p-2 rounded-xl hover:bg-slate-50">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{t.description}</p>
                        <p className="text-[10px] text-slate-400">{t.category} • <span className="text-slate-600 font-medium">{t.recordedBy}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                        </p>
                        <button onClick={() => handleEdit(t)} className="text-slate-300 hover:text-indigo-600 p-1">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-rose-600 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* MODAL DETIL PAPA / MAMA */}
      {selectedUserDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-end justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Rincian Pengeluaran: {selectedUserDetail}</h3>
              <button onClick={() => setSelectedUserDetail(null)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-2">
              {filteredTransactions
                .filter(t => t.type === 'expense' && t.recordedBy === selectedUserDetail)
                .map(t => (
                  <div key={t.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <p className="font-semibold text-slate-700">{t.description}</p>
                      <p className="text-[10px] text-slate-400">{t.category} • {t.date}</p>
                    </div>
                    <p className="font-bold text-rose-600">{formatRupiah(t.amount)}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM TAMBAH / EDIT */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">{editId ? 'Edit Catatan' : 'Tambah Catatan Baru'}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button 
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 rounded-lg font-bold transition ${type === 'expense' ? 'bg-rose-500 text-white shadow-2xs' : 'text-slate-600'}`}
                >
                  Pengeluaran
                </button>
                <button 
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 rounded-lg font-bold transition ${type === 'income' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-slate-600'}`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount input with Calculator Trigger */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nominal (Rp)</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    required
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCalc(!showCalc)}
                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calculator Popover */}
              {showCalc && (
                <div className="bg-slate-800 text-white p-3 rounded-2xl space-y-2">
                  <div className="text-right text-base font-mono bg-slate-900 p-2 rounded-xl min-h-[36px]">
                    {calcExpression || '0'}
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-xs font-bold text-center">
                    {['7','8','9','÷','4','5','6','×','1','2','3','-','C','0','=','+'].map(btn => (
                      <button 
                        key={btn}
                        type="button"
                        onClick={() => handleCalcBtn(btn)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recorded By */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dicatat Oleh</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Papa', 'Mama'].map(person => (
                    <button 
                      key={person}
                      type="button"
                      onClick={() => setRecordedBy(person)}
                      className={`p-2 rounded-xl border font-semibold ${recordedBy === person ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Keterangan</label>
                <input 
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Misal: Beli Sayur, Bensin"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Category Selection */}
              {type === 'expense' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kategori</label>
                  {!showCustomCatInput ? (
                    <select 
                      value={category}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setShowCustomCatInput(true);
                        } else {
                          setCategory(e.target.value);
                        }
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    >
                      {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                      <option value="CUSTOM">+ Tambah Kategori Baru</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Nama Kategori Baru"
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowCustomCatInput(false)}
                        className="p-2 text-slate-400"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit" 
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition"
              >
                {editId ? 'Update Catatan' : 'Simpan Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button (+ Add) */}
      <button 
        onClick={() => { resetForm(); setShowForm(true); }}
        className="fixed bottom-20 right-1/2 translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-xl hover:scale-105 transition border-2 border-white z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-200 py-2.5 px-6 flex justify-between items-center z-30">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center text-[10px] font-semibold ${activeTab === 'home' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Home className="w-5 h-5 mb-0.5" /> Beranda
        </button>

        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center text-[10px] font-semibold ${activeTab === 'stats' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <PieChart className="w-5 h-5 mb-0.5" /> Statistik
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center text-[10px] font-semibold ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <History className="w-5 h-5 mb-0.5" /> Riwayat
        </button>
      </nav>

    </div>
  );
}
